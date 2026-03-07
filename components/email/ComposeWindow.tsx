"use client";

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/components/auth/AuthProvider';
import Editor from '@/components/email/Editor';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Send, Loader2, Eye, FileText, Sparkles, Mail, X, Plus, List, Clock, LayoutTemplate, Settings, ShieldCheck } from 'lucide-react';
import EmailPreview from '@/components/email/EmailPreview';
import EmailSelectionModal from '@/components/email/EmailSelectionModal';
import TemplateManagerModal from '@/components/email/TemplateManagerModal';
import SpamCheckerModal from '@/components/email/SpamCheckerModal';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import ChatSidebar from '@/components/email/ChatSidebar';

type FormData = {
    recipients: string;
    subject: string;
};

interface ComposeWindowProps {
    initialRecipients?: string[];
    isModal?: boolean;
    onClose?: () => void;
    mode?: 'direct' | 'queue'; // New Prop
}

export default function ComposeWindow({ initialRecipients = [], isModal = false, onClose, mode = 'direct' }: ComposeWindowProps) {
    // ... existing hooks ...
    const { user } = useAuth();
    const { hasAccess } = usePermissions();
    const { dict } = useLanguage();
    const [content, setContent] = useState('');
    // ... rest of state ...
    const [editorKey, setEditorKey] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isDraftsOpen, setIsDraftsOpen] = useState(false);
    const [drafts, setDrafts] = useState<Array<{ id: string, subject: string, updated_at: string, content_html?: string, recipients_json?: string[] }>>([]);
    const [draftToLoad, setDraftToLoad] = useState<{ id: string, subject: string, updated_at: string, content_html?: string, recipients_json?: string[] } | null>(null);
    const [attachments, setAttachments] = useState<{ filename: string, content: string, encoding: 'base64' }[]>([]);
    const [showDate, setShowDate] = useState(true);
    const [scheduledAt, setScheduledAt] = useState(''); // New State for Scheduling
    const [templates, setTemplates] = useState<{ id: string, name: string, is_default: boolean }[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Deferred send refs (Gmail-style Undo)
    const sendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const sendingToastIdRef = useRef<string | number | null>(null);
    // Content ref: always holds the LATEST editor content, so the deferred send closure sends the right data
    const contentRef = useRef(content);

    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [aiMode, setAiMode] = useState<'generate' | 'refine'>('generate');
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAILoading, setIsAILoading] = useState(false);

    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);

    // Spam Checker State
    const [isSpamCheckOpen, setIsSpamCheckOpen] = useState(false);
    const [isSpamChecking, setIsSpamChecking] = useState(false);
    const [spamCheckResult, setSpamCheckResult] = useState<{ score: number, status: 'Safe' | 'Warning' | 'Spam', issues: string[] } | null>(null);

    // New state and ref for the chat sidebar at layout level
    const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
    const insertContentRef = useRef<((html: string) => void) | null>(null);

    const { register, handleSubmit, getValues, setValue, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            recipients: initialRecipients.join(', ')
        }
    });

    // Keep contentRef in sync with the editor state at all times
    useEffect(() => { contentRef.current = content; }, [content]);

    useEffect(() => {
        if (initialRecipients.length > 0) {
            setValue('recipients', initialRecipients.join(', '));
        }
    }, [initialRecipients, setValue]);

    const fetchTemplates = async () => {
        const { data } = await supabase.from('templates').select('id, name, is_default').order('created_at', { ascending: false });
        if (data) {
            setTemplates(data);
            const defaultTemplate = data.find(t => t.is_default);
            setSelectedTemplateId(prev => {
                if (data.find(t => t.id === prev)) return prev;
                return defaultTemplate ? defaultTemplate.id : '';
            });
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    // ... AI Handlers ...

    const handleAIRequest = async () => {
        // ... (Keep existing AI logic) ...
        if (!aiPrompt.trim()) return;
        setIsAILoading(true);
        try {
            if (aiMode === 'generate') {
                const res = await fetch('/api/ai/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: aiPrompt, senderName: user?.user_metadata?.full_name || 'Al-Rrakb Team' })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setValue('subject', data.subject);
                setContent(data.content);
                setEditorKey(k => k + 1);
                if (data.recipients && Array.isArray(data.recipients) && data.recipients.length > 0) {
                    setValue('recipients', data.recipients.join(', '));
                }
                toast.success(dict.ai.success_generated);
            } else {
                // Refine
                const strippedContent = content.replace(/<[^>]*>/g, '').trim();
                // ... check length ...
                if (!strippedContent && content.length < 50) {
                    toast.error(dict.ai.error_no_content);
                    return;
                }
                const res = await fetch('/api/ai/refine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content, instruction: aiPrompt })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);

                setContent(data.content);
                setEditorKey(k => k + 1);
                toast.success(dict.ai.success_refined);
            }
            setIsAIModalOpen(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : dict.ai.error_generic);
        } finally {
            setIsAILoading(false);
        }
    };

    // ... Spam Checker Handlers ...
    const handleSpamCheck = async () => {
        const currentSubject = getValues('subject');
        const currentContent = content; // capture current content
        if (!currentSubject && !currentContent) {
            toast.error(dict.compose_extra.spam_check_required);
            return;
        }

        // ── Clear previous result immediately so stale data is never shown ──
        setSpamCheckResult(null);
        setIsSpamCheckOpen(false);
        setIsSpamChecking(true);

        try {
            const res = await fetch('/api/spam-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject: currentSubject || '', body: currentContent || '' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setSpamCheckResult(data);
            setIsSpamCheckOpen(true);
        } catch (error: unknown) {
            toast.error('Failed to check spam score: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsSpamChecking(false);
        }
    };

    // ... File Handlers ...
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (Keep existing) ...
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            const newAttachments: { filename: string, content: string, encoding: 'base64' }[] = [];
            for (const file of files) {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                await new Promise<void>((resolve) => {
                    reader.onload = () => {
                        const base64Content = (reader.result as string).split(',')[1];
                        newAttachments.push({
                            filename: file.name,
                            content: base64Content,
                            encoding: 'base64'
                        });
                        resolve();
                    };
                });
            }
            setAttachments(prev => [...prev, ...newAttachments]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Batch Sending State — still used to cancel mid-loop if needed
    const isSendingCancelled = useRef(false);

    const cancelSend = () => {
        if (sendTimeoutRef.current) {
            clearTimeout(sendTimeoutRef.current);
            sendTimeoutRef.current = null;
        }
        if (sendingToastIdRef.current !== null) {
            toast.dismiss(sendingToastIdRef.current as string);
            sendingToastIdRef.current = null;
        }
        setIsLoading(false);
        toast.info(dict.compose_extra.undo_cancelled);
    };

    const executeSend = async (data: FormData, currentContent: string) => {
        isSendingCancelled.current = false;
        const recipientList = data.recipients.split(',').map(email => email.trim()).filter(email => email);
        const totalRecipients = recipientList.length;

        // Size validation
        const attachmentsSize = attachments.reduce((acc, curr) => acc + (curr.content.length * 0.75), 0);
        const contentSize = new Blob([currentContent]).size;
        const totalSize = attachmentsSize + contentSize;

        if (totalSize > 3.5 * 1024 * 1024) {
            toast.error(dict.compose_extra.size_limit_error);
            setIsLoading(false);
            return;
        }

        // QUEUE MODE
        if (mode === 'queue') {
            try {
                const res = await fetch('/api/queue/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipients: recipientList,
                        subject: data.subject,
                        content: currentContent,
                        userEmail: user?.email,
                        attachments: attachments,
                        templateId: selectedTemplateId || undefined,
                        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null
                    }),
                });

                if (!res.ok) {
                    const result = await res.json();
                    throw new Error(result.error || 'Failed to queue emails');
                }

                const result = await res.json();
                toast.success(dict.compose_extra.queue_success.replace('{count}', String(result.count)));
                setAttachments([]);
                if (isModal && onClose) setTimeout(() => onClose(), 1500);
            } catch (error: unknown) {
                toast.error(error instanceof Error ? error.message : String(error));
            } finally {
                setIsLoading(false);
            }
            return;
        }

        // DIRECT SENDING — one-by-one with random delays
        const progressToastId = toast.loading(
            dict.compose_extra.sending_to.replace('{n}', String(totalRecipients)),
            { duration: Infinity }
        );

        try {
            for (let i = 0; i < totalRecipients; i++) {
                if (isSendingCancelled.current) {
                    toast.dismiss(progressToastId as string);
                    toast.info(dict.compose.sending_cancelled || 'Sending cancelled');
                    return;
                }

                const recipient = recipientList[i];
                const isLast = i === totalRecipients - 1;
                const progressText = dict.compose_extra.sending_progress
                    .replace('{current}', String(i + 1))
                    .replace('{total}', String(totalRecipients));

                toast.loading(`${progressText}... (${recipient})`, { id: progressToastId as string });

                const res = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipients: [recipient],
                        subject: data.subject,
                        content: currentContent,
                        fromEmail: user?.email,       // user-selected sender account
                        attachments: attachments,
                        showDate: showDate,
                        templateId: selectedTemplateId || undefined,
                    }),
                });

                if (!res.ok) {
                    const result = await res.json();
                    throw new Error(result.error || result.details || `Failed to send to ${recipient}`);
                }

                if (!isLast) {
                    const possibleDelays = [30, 40, 50, 60];
                    const randomDelay = possibleDelays[Math.floor(Math.random() * possibleDelays.length)];
                    for (let j = 0; j < randomDelay; j++) {
                        if (isSendingCancelled.current) break;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            toast.success(dict.compose.email_sent, { id: progressToastId as string, duration: 5000 });
            setAttachments([]);
            if (isModal && onClose) setTimeout(() => onClose(), 1500);

        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : String(error), { id: progressToastId as string, duration: 6000 });
        } finally {
            setIsLoading(false);
            isSendingCancelled.current = false;
        }
    };

    const onSubmit = (data: FormData) => {
        // Snapshot the latest editor content NOW (fixes AI-State sync bug)
        const snapshotContent = contentRef.current;

        setIsLoading(true);

        const toastId = toast(dict.compose.message_sent_undo || 'Sending in 7 seconds...', {
            action: {
                label: dict.compose.undo_action || 'Undo',
                onClick: cancelSend,
            },
            duration: 7000,
            onDismiss: () => { sendingToastIdRef.current = null; },
            onAutoClose: () => { sendingToastIdRef.current = null; },
        });

        sendingToastIdRef.current = toastId as string | number;

        sendTimeoutRef.current = setTimeout(() => {
            sendingToastIdRef.current = null;
            executeSend(data, snapshotContent);
        }, 7000);
    };

    const saveDraft = async () => {
        const currentSubject = getValues('subject');

        if (!currentSubject && !content) {
            toast.error('Subject or content required to save draft');
            return;
        }

        setIsLoading(true);

        try {
            const recipientsStr = getValues('recipients') || '';
            const recipientList = recipientsStr.split(',').map(email => email.trim()).filter(email => email);

            const { error } = await supabase.from('drafts').insert({
                subject: currentSubject,
                content_html: content,
                recipients_json: recipientList,
                user_email: user?.email
            });

            if (error) throw error;

            toast.success(dict.compose.draft_saved);
        } catch (error: unknown) {
            toast.error('Failed to save draft: ' + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsLoading(false);
        }
    };

    const loadDrafts = async () => {
        setIsDraftsOpen(true);
        try {
            const { data, error } = await supabase
                .from('drafts')
                .select('*')
                .eq('user_email', user?.email)
                .order('updated_at', { ascending: false });
            if (error) throw error;
            setDrafts(data || []);
        } catch (error: unknown) {
            toast.error('Failed to load drafts: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const confirmLoadDraft = (draft: { id?: string, subject?: string, updated_at?: string, content_html?: string, recipients_json?: string[] }) => {
        setValue('subject', (draft.subject as string) || '');
        const recipients = Array.isArray(draft.recipients_json)
            ? draft.recipients_json.join(', ')
            : '';

        setValue('recipients', recipients);
        setContent((draft.content_html as string) || '');
        setIsDraftsOpen(false);
        setDraftToLoad(null);
    };

    // Render classes based on isModal
    const containerClasses = isModal
        ? "fixed inset-0 z-[60] bg-gray-100 dark:bg-gray-950 animate-in fade-in slide-in-from-bottom-4 flex flex-col"
        : "flex flex-col h-[calc(100vh-4rem)] -m-4 sm:-m-6 md:-m-8 bg-gray-50 dark:bg-gray-950";

    const innerClasses = isModal
        ? "max-w-7xl w-full mx-auto px-4 py-4 md:py-6 flex-1 flex flex-col min-h-0"
        : "w-full mx-auto flex-1 flex flex-col min-h-0";

    return (
        <div className={containerClasses}>
            <div className={innerClasses}>
                {/* Header / Toolbar (Static Top Container) */}
                <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 flex-none bg-white dark:bg-[#0f172a] p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 z-20 shrink-0 transition-colors`}>
                    <div className="flex items-center gap-4">
                        {isModal && onClose && (
                            <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <ArrowLeft className="w-5 h-5 text-gray-500" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#39285e] dark:text-white flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-[#79bbe0]" />
                                {dict.compose.title}
                            </h2>
                            {!isModal && <p className="text-gray-500 text-sm mt-1">{dict.compose.desc}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full md:flex md:flex-wrap md:w-auto md:gap-3">
                        <button
                            type="button"
                            onClick={() => setIsChatSidebarOpen(true)}
                            className="justify-center px-2 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white border-0 rounded-lg font-bold transition-all flex items-center gap-1.5 md:gap-2 shadow-md hover:shadow-lg text-[10px] md:text-sm"
                        >
                            <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-yellow-300" />
                            <span className="truncate">{dict.ai.btn_generate}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSpamCheck}
                            disabled={isSpamChecking}
                            className="justify-center px-2 py-1.5 md:px-4 md:py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center gap-1.5 md:gap-2 shadow-sm text-[10px] md:text-sm disabled:opacity-50"
                        >
                            {isSpamChecking ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 text-[#79bbe0] animate-spin" /> : <ShieldCheck className="w-3 h-3 md:w-4 md:h-4 text-[#79bbe0]" />}
                            <span className="truncate">{dict.spam.check_btn}</span>
                        </button>
                        <button
                            type="button"
                            onClick={loadDrafts}
                            className="justify-center px-2 py-1.5 md:px-4 md:py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center gap-1.5 md:gap-2 shadow-sm text-[10px] md:text-sm"
                        >
                            <FileText className="w-3 h-3 md:w-4 md:h-4 text-[#79bbe0]" />
                            <span className="truncate">{dict.compose.load_draft}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => window.open('/admin/queue', '_blank')}
                            className="justify-center px-2 py-1.5 md:px-4 md:py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center gap-1.5 md:gap-2 shadow-sm text-[10px] md:text-sm"
                            title="Queue Manager"
                        >
                            <List className="w-3 h-3 md:w-4 md:h-4 text-[#79bbe0]" />
                            <span className="truncate">{dict.common.queue || "Queue"}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            className="justify-center px-2 py-1.5 md:px-4 md:py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center gap-1.5 md:gap-2 shadow-sm text-[10px] md:text-sm"
                        >
                            <Eye className="w-3 h-3 md:w-4 md:h-4 text-[#79bbe0]" />
                            <span className="truncate">{dict.compose.preview}</span>
                        </button>
                        <button
                            type="button"
                            onClick={saveDraft}
                            className="justify-center px-2 py-1.5 md:px-4 md:py-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-200 font-medium transition-all flex items-center gap-1.5 md:gap-2 shadow-sm text-[10px] md:text-sm"
                        >
                            <Save className="w-3 h-3 md:w-4 md:h-4 text-[#79bbe0]" />
                            <span className="truncate">{dict.common.save}</span>
                        </button>
                        <button
                            form="compose-form"
                            type="submit"
                            disabled={isLoading}
                            className="col-span-2 md:col-span-auto justify-center px-6 py-2 bg-[#39285e] text-white rounded-lg font-bold hover:bg-[#2d1f4b] shadow-lg shadow-[#39285e]/20 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-xs md:text-sm whitespace-nowrap transform hover:scale-[1.02] active:scale-95 md:hover:scale-105"
                        >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" /> : <Send className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                            {mode === 'queue' ? (dict.compose.add_to_queue || "Add to Queue") : dict.compose.send_email}
                        </button>
                    </div>
                </div>



                {/* Scrolling Wrapper */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 bg-gray-50 dark:bg-gray-950/50">
                    <form id="compose-form" onSubmit={handleSubmit(onSubmit)} className="space-y-0 flex flex-col flex-1 min-h-0 max-w-[100rem] mx-auto w-full">
                        <div className="flex w-full gap-4 md:gap-6 flex-1 min-h-0">
                            {/* Main Editor Column */}
                            <div className="flex-1 flex flex-col space-y-4 md:space-y-6 overflow-y-auto min-h-0 pb-4 pr-1">
                                {/* Metadata Card */}
                                <div className="grid gap-4 md:gap-6 bg-white dark:bg-gray-900/50 p-4 md:p-8 rounded-2xl shadow-sm border-t-4 border-[#39285e] dark:border-[#79bbe0] shrink-0">
                                    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                                        <div className="space-y-1.5 md:space-y-2">
                                            <label className="block font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] md:text-xs">{dict.compose.recipients}</label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <div className="absolute inset-y-0 start-0 pl-3 flex items-center pointer-events-none">
                                                        <Mail className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        {...register('recipients', { required: dict.compose.error_required })}
                                                        type="text"
                                                        placeholder={dict.compose.recipients_placeholder}
                                                        className="w-full ps-9 md:ps-10 pe-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] focus:border-transparent dark:text-white outline-none transition-all placeholder:text-gray-400 text-sm"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEmailModalOpen(true)}
                                                    className="px-4 py-2 bg-[#79bbe0]/10 hover:bg-[#79bbe0]/20 text-[#79bbe0] border border-[#79bbe0]/30 rounded-xl transition-colors flex items-center justify-center shrink-0"
                                                    title={dict.sidebar?.hotels || "Add from Hotels Database"}
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                            {errors.recipients && <p className="text-red-500 text-xs md:text-sm">{errors.recipients.message}</p>}
                                        </div>

                                        <div className="space-y-1.5 md:space-y-2">
                                            <label className="block font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px] md:text-xs">{dict.compose.subject}</label>
                                            <input
                                                {...register('subject', { required: dict.compose.error_required })}
                                                type="text"
                                                placeholder={dict.compose.subject_placeholder}
                                                className="w-full px-4 py-2 md:py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] focus:border-transparent dark:text-white outline-none transition-all placeholder:text-gray-400 text-sm"
                                            />
                                            {errors.subject && <p className="text-red-500 text-xs md:text-sm">{errors.subject.message}</p>}
                                        </div>
                                    </div>

                                    {/* Template Selector */}
                                    <div className="space-y-1.5 md:space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <LayoutTemplate className="w-4 h-4 text-[#79bbe0]" />
                                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                {dict.templates.select_template}
                                            </label>
                                        </div>
                                        <div className="flex gap-2">
                                            <select
                                                value={selectedTemplateId}
                                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] outline-none text-sm dark:text-white"
                                            >
                                                <option value="">{dict.templates.system_default}</option>
                                                {templates.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name} {t.is_default ? `(${dict.templates.is_default})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setIsTemplateManagerOpen(true)}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-xl transition-colors flex items-center justify-center shrink-0"
                                                title={dict.templates.manage_templates}
                                            >
                                                <Settings className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Schedule Input (Queue Mode Only) */}
                                    {mode === 'queue' && (
                                        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Clock className="w-4 h-4 text-indigo-500" />
                                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                                    {dict.compose.schedule_label || 'Schedule Sending (Optional)'}
                                                </label>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="datetime-local"
                                                    value={scheduledAt}
                                                    onChange={(e) => setScheduledAt(e.target.value)}
                                                    className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] outline-none text-sm dark:text-white w-full md:w-auto"
                                                />
                                                {scheduledAt && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setScheduledAt('')}
                                                        className="text-gray-400 hover:text-red-500 transition-colors text-xs"
                                                    >
                                                        {dict.compose.schedule_clear || 'Clear'}
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <p className="text-[10px] text-gray-400">
                                                    {dict.compose.schedule_hint || 'Leave empty for immediate processing.'}
                                                </p>
                                                <p className="text-[10px] text-indigo-500 font-medium">
                                                    {dict.compose.timezone_label || 'Your Timezone:'} {Intl.DateTimeFormat().resolvedOptions().timeZone}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Date Toggle Switch (Existing) */}
                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-4">
                                        <div
                                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${showDate ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}`}
                                            onClick={() => setShowDate(!showDate)}
                                            title={showDate ? (dict.compose?.hide_date || "Hide Date Line") : (dict.compose?.show_date || "Show Date Line")}
                                            dir="ltr"
                                        >
                                            <div
                                                className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${showDate
                                                    ? 'translate-x-6'
                                                    : 'translate-x-0'
                                                    }`}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer" onClick={() => setShowDate(!showDate)}>
                                            {showDate ? (dict.compose?.show_date || "Show Date Line") : (dict.compose?.hide_date || "Hide Date Line")}
                                        </span>
                                    </div>
                                </div>

                                {/* Content Editor Card */}
                                <div className="bg-white dark:bg-gray-900/50 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex-1 flex flex-col min-h-[400px]">
                                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/30 shrink-0">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-[#39285e]/10 dark:bg-[#79bbe0]/10 rounded-lg">
                                                <FileText className="w-5 h-5 text-[#39285e] dark:text-[#79bbe0]" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-gray-900 dark:text-white">{dict.compose.content_title}</h3>
                                                <p className="text-xs text-gray-500">{dict.compose.content_desc}</p>
                                            </div>
                                        </div>
                                        {hasAccess('compose_attach') && (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="file"
                                                    id="file-upload"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleFileChange}
                                                />
                                                <label
                                                    htmlFor="file-upload"
                                                    className="cursor-pointer px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:text-[#79bbe0] hover:border-[#79bbe0] transition-colors flex items-center gap-2 text-sm font-medium shadow-sm group"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#79bbe0] transition-colors"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                                                    {dict.compose.attach_file}
                                                </label>
                                            </div>
                                        )}
                                    </div>

                                    {/* Attachments List */}
                                    {attachments.length > 0 && (
                                        <div className="px-4 pt-4 flex flex-wrap gap-2 shrink-0">
                                            {attachments.map((file, index) => (
                                                <div key={index} className="flex items-center gap-2 px-3 py-1.5 bg-[#79bbe0]/10 border border-[#79bbe0]/20 rounded-lg text-sm text-[#39285e] dark:text-[#79bbe0] shadow-sm animate-in fade-in zoom-in-95">
                                                    <span className="truncate max-w-[200px] font-medium">{file.filename}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeAttachment(index)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="p-4 flex-1 flex flex-col min-h-0">
                                        <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 flex-1 flex flex-col min-h-0">
                                            <Editor
                                                key={editorKey}
                                                value={content}
                                                onChange={setContent}
                                                onRefine={() => setIsChatSidebarOpen(true)}
                                                insertContentRef={insertContentRef}
                                                hideHtmlMode={!hasAccess('compose_html')}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* End Main Editor Column */}

                            <ChatSidebar
                                isOpen={isChatSidebarOpen}
                                onClose={() => setIsChatSidebarOpen(false)}
                                onInsertContent={(html) => insertContentRef.current?.(html)}
                            />
                        </div>
                    </form>
                </div>

                <EmailPreview
                    isOpen={isPreviewOpen}
                    onClose={() => setIsPreviewOpen(false)}
                    content={content}
                    subject={getValues('subject') || dict.compose.preview_title}
                    showDate={showDate}
                />

                {/* Drafts Modal */}
                {isDraftsOpen && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-[#39285e] text-white">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-[#79bbe0]" />
                                    {dict.compose.saved_drafts}
                                </h3>
                                <button onClick={() => setIsDraftsOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-4 space-y-2 bg-gray-50 dark:bg-gray-950">
                                {drafts.length === 0 ? (
                                    <div className="text-center py-12 px-4">
                                        <div className="bg-white dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-gray-700">
                                            <FileText className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <p className="text-gray-500 dark:text-gray-400">{dict.compose.no_drafts}</p>
                                    </div>
                                ) : (
                                    drafts.map(draft => (
                                        <button
                                            key={draft.id}
                                            onClick={() => setDraftToLoad(draft)}
                                            className="w-full text-start p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#79bbe0] dark:hover:border-[#79bbe0] transition-all group shadow-sm hover:shadow-md"
                                        >
                                            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-[#39285e] dark:group-hover:text-[#79bbe0] transition-colors">
                                                {draft.subject || '(No Subject)'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700">
                                                    {new Date(draft.updated_at).toLocaleDateString()}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(draft.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Confirm Draft Load Modal */}
                {draftToLoad && (
                    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3 text-[#39285e] dark:text-[#79bbe0] mb-4">
                                <FileText className="w-6 h-6" />
                                <h3 className="text-lg font-bold">{dict.compose.overwrite_warn_title}</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {dict.compose.overwrite_warn_desc}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setDraftToLoad(null)}
                                    className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                                >
                                    {dict.common.cancel}
                                </button>
                                <button
                                    onClick={() => confirmLoadDraft(draftToLoad)}
                                    className="px-4 py-2 rounded-lg bg-[#39285e] text-white hover:bg-[#2d1f4b] transition-colors font-medium shadow-lg shadow-[#39285e]/20"
                                >
                                    {dict.compose.limit_load}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Email Selection Modal */}
                <EmailSelectionModal
                    isOpen={isEmailModalOpen}
                    onClose={() => setIsEmailModalOpen(false)}
                    currentRecipients={getValues('recipients')?.split(',').map(e => e.trim()) || []}
                    onSelect={(emails) => {
                        const current = getValues('recipients') || '';
                        const currentList = current.split(',').map(e => e.trim()).filter(e => e);
                        const newSet = new Set([...currentList, ...emails]);
                        setValue('recipients', Array.from(newSet).join(', '));
                    }}
                />

                {/* Template Manager Modal */}
                {isTemplateManagerOpen && (
                    <TemplateManagerModal
                        onClose={() => setIsTemplateManagerOpen(false)}
                        onChanged={fetchTemplates}
                    />
                )}

                {/* Spam Checker Modal */}
                {spamCheckResult && (
                    <SpamCheckerModal
                        isOpen={isSpamCheckOpen}
                        onClose={() => setIsSpamCheckOpen(false)}
                        score={spamCheckResult.score}
                        status={spamCheckResult.status}
                        issues={spamCheckResult.issues}
                    />
                )}

                {/* AI Modal */}
                {isAIModalOpen && (
                    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col">
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                                        {aiMode === 'generate' ? dict.ai.modal_generate_title : dict.ai.modal_refine_title}
                                    </h3>
                                    <button onClick={() => setIsAIModalOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <p className="text-white/80 text-sm mt-2">
                                    {aiMode === 'generate'
                                        ? dict.ai.hint_generate
                                        : dict.ai.hint_refine}
                                </p>
                            </div>

                            <div className="p-6">
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder={aiMode === 'generate' ? dict.ai.placeholder_generate : dict.ai.placeholder_refine}
                                    className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-6 dark:text-white"
                                    autoFocus
                                />

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setIsAIModalOpen(false)}
                                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        {dict.ai.cancel}
                                    </button>
                                    <button
                                        onClick={handleAIRequest}
                                        disabled={isAILoading || !aiPrompt.trim()}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                                    >
                                        {isAILoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        {aiMode === 'generate'
                                            ? (isAILoading ? dict.ai.generating : dict.ai.generate)
                                            : (isAILoading ? dict.ai.refining : dict.ai.refine)
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
