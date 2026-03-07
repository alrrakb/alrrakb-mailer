import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Send, X, ArrowDownToLine, Bot, User, Copy, Check } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { toast } from 'sonner';
import { clsx } from 'clsx';
import { useLanguage } from '@/components/providers/LanguageProvider';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

interface ChatSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onInsertContent: (html: string) => void;
}

export default function ChatSidebar({ isOpen, onClose, onInsertContent }: ChatSidebarProps) {
    const { dict } = useLanguage();

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Reset welcome message every time the language/dict changes
        setMessages([{
            id: '1',
            role: 'assistant',
            content: dict.ai_chat.welcome_message
        }]);
    }, [dict.ai_chat.welcome_message]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const handleCopy = async (id: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast.success(dict.ai_chat.copy_success, {
                duration: 2000,
                position: 'top-center'
            });
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy text', err);
        }
    };

    const handleTouchStart = (id: string, text: string) => {
        longPressTimer.current = setTimeout(() => {
            handleCopy(id, text);
        }, 500); // 500ms for long press
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen, isLoading]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const apiMessages = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiMessages })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to get response');

            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.text
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch (err: unknown) {
            console.error(err);
            const errorMsg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
            const isRateLimit = errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('too many requests') || errorMsg.includes('limit');

            const systemErrorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: isRateLimit
                    ? dict.ai_chat.quota_error
                    : (isAr ? 'حدث خطأ أثناء معالجة طلبك.' : 'An error occurred while processing your request.')
            };
            setMessages(prev => [...prev, systemErrorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const isLikelyHtml = (str: string) => {
        return /<[a-z][\s\S]*>/i.test(str);
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div className={clsx(
                "fixed top-0 bottom-0 end-0 z-50 flex flex-col shrink-0 border-s border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out w-96 max-w-[90vw]",
                isOpen ? "translate-x-0" : "ltr:translate-x-full rtl:-translate-x-full"
            )}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 shrink-0">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 font-bold">
                        <Sparkles className="w-5 h-5 text-yellow-500" />
                        {dict.ai_chat.title}
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors text-gray-500">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-950/50 min-h-0">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={clsx(
                                "flex gap-3 relative w-full",
                                msg.role === 'user' ? "flex-row-reverse justify-start" : "flex-row justify-start"
                            )}
                            onTouchStart={() => handleTouchStart(msg.id, msg.content)}
                            onTouchEnd={handleTouchEnd}
                            onTouchCancel={handleTouchEnd}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                                msg.role === 'user' ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400" : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
                            )}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={clsx(
                                "max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-sm border",
                                msg.role === 'user'
                                    ? "bg-indigo-600 text-white border-indigo-500 rounded-tr-sm"
                                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700 rounded-tl-sm empty:hidden" // Add empty:hidden just in case
                            )}>
                                {msg.role === 'assistant' && isLikelyHtml(msg.content) ? (
                                    <div className="space-y-3">
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 p-2 rounded max-h-40 overflow-y-auto">
                                            &lt;HTML Code Generated&gt;
                                            <div dangerouslySetInnerHTML={{ __html: msg.content }} className="mt-2 opacity-80" />
                                        </div>
                                        <button
                                            onClick={() => onInsertContent(msg.content)}
                                            className="w-full py-1.5 flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 font-medium text-xs rounded transition-colors border border-indigo-200 dark:border-indigo-800/50"
                                        >
                                            <ArrowDownToLine className="w-3.5 h-3.5" />
                                            {dict.ai_chat.insert_btn}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                                )}
                            </div>

                            <div className="flex flex-col justify-end opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleCopy(msg.id, msg.content)}
                                    className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm text-gray-400 hover:text-indigo-600 transition-colors"
                                    title="Copy message"
                                >
                                    {copiedId === msg.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-sm">
                                <Bot className="w-4 h-4" />
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <div
                        className="flex items-end gap-2 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-shadow"
                    >
                        <TextareaAutosize
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={dict.ai_chat.placeholder}
                            className="flex-1 bg-transparent resize-none outline-none text-sm dark:text-white px-2 py-1 leading-relaxed"
                            maxRows={6}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={!input.trim() || isLoading}
                            className="p-2 mb-0.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shrink-0"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </button>
                    </div>
                    <div className="mt-2 text-center">
                        <p className="text-[10px] text-gray-400">
                            {dict.ai_chat.keyboard_hint}
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
