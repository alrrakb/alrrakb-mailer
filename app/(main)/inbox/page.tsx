"use client";

import { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
    Mail, Plus, Trash2, CheckCircle, RefreshCw, X, Eye,
    Inbox as InboxIcon, Globe, Loader2, Send, AlertOctagon,
    Archive, ChevronRight, Search, MailWarning
} from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import { UnauthorizedState } from '@/components/shared/UnauthorizedState';

type Folder = 'inbox' | 'sent' | 'spam' | 'trash' | 'bounced';

type InboxMessage = {
    id: string;
    sender: string;
    recipient?: string;
    subject: string;
    content: string;
    received_at: string;
    is_read: boolean;
    tags?: string[];
    folder: Folder;
    deleted_by_user?: boolean;
};

// FOLDERS is now a function so labels can be translated at render time
function useFolders(dict: ReturnType<typeof import('@/components/providers/LanguageProvider').useLanguage>['dict']) {
    return [
        { key: 'inbox' as Folder, icon: <InboxIcon className="w-4 h-4" />, label: dict.inbox.folder_inbox, color: 'text-blue-600 dark:text-blue-400' },
        { key: 'sent' as Folder, icon: <Send className="w-4 h-4" />, label: dict.inbox.folder_sent, color: 'text-green-600 dark:text-green-400' },
        { key: 'spam' as Folder, icon: <AlertOctagon className="w-4 h-4" />, label: dict.inbox.folder_spam, color: 'text-orange-500 dark:text-orange-400' },
        { key: 'trash' as Folder, icon: <Archive className="w-4 h-4" />, label: dict.inbox.folder_trash, color: 'text-red-500 dark:text-red-400' },
        { key: 'bounced' as Folder, icon: <MailWarning className="w-4 h-4" />, label: dict.inbox.folder_bounced, color: 'text-rose-600 dark:text-rose-400' },
    ];
}

export default function InboxPage() {
    const { dict } = useLanguage();
    const FOLDERS = useFolders(dict);

    const [allMessages, setAllMessages] = useState<InboxMessage[]>([]);
    const [currentFolder, setCurrentFolder] = useState<Folder>('inbox');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [selectedMessage, setSelectedMessage] = useState<InboxMessage | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Translation
    const [isTranslated, setIsTranslated] = useState(false);
    const [translatedContent, setTranslatedContent] = useState('');
    useEffect(() => { setIsTranslated(false); setTranslatedContent(''); }, [selectedMessage]);

    // Toast
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    const { hasAccess } = usePermissions();

    // Derived: messages for current folder, filtered by search
    const messages = allMessages.filter(m => {
        if (m.folder !== currentFolder) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            m.sender.toLowerCase().includes(term) ||
            m.subject.toLowerCase().includes(term) ||
            m.content.toLowerCase().includes(term)
        );
    });

    // Unread counts per folder
    const unreadCount = (folder: Folder) =>
        allMessages.filter(m => m.folder === folder && !m.is_read).length;

    // Reset selection when folder, search, or messages change
    useEffect(() => { setSelectedIds(new Set()); }, [currentFolder, searchTerm, allMessages]);

    const fetchMessages = useCallback(async (sync = false, background = false) => {
        if (!background) setIsLoading(true);
        if (sync) setIsSyncing(true);
        try {
            if (sync) {
                const syncRes = await fetch('/api/inbox?action=sync', { method: 'POST' });
                if (!syncRes.ok) {
                    if (syncRes.status === 401) return;
                    const errData = await syncRes.json().catch(() => ({ error: syncRes.statusText }));
                    if (!background) throw new Error(errData.error || 'Sync failed');
                    else console.error('Background sync failed:', errData.error);
                }
            }
            const res = await fetch('/api/inbox');
            const data = await res.json();
            if (Array.isArray(data)) setAllMessages(data as InboxMessage[]);
        } catch (error: unknown) {
            if (!background) showToast('error', error instanceof Error ? error.message : 'Failed to update');
        } finally {
            if (!background) setIsLoading(false);
            setIsSyncing(false);
        }
    }, []);

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(() => fetchMessages(true, true), 30000);
        return () => clearInterval(interval);
    }, [fetchMessages]);

    if (!hasAccess('inbox')) return <UnauthorizedState />;

    const handleSimulate = async () => {
        setIsSimulating(true);
        try {
            const fakeEmail = {
                sender: `Client ${Math.floor(Math.random() * 1000)} <client${Math.floor(Math.random() * 100)}@example.com>`,
                subject: `Inquiry about services #${Math.floor(Math.random() * 1000)}`,
                content: `<p>Hello,</p><p>I would like to know more about your marketing packages.</p><p>Best regards,<br>Client</p>`,
                tags: ['Inquiry'],
                folder: 'inbox'
            };
            const res = await fetch('/api/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fakeEmail) });
            if (!res.ok) throw new Error('Failed to simulate');
            showToast('success', dict.inbox.simulated_success);
            fetchMessages();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSimulating(false);
        }
    };

    const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
        if (currentStatus) return;
        try {
            await fetch('/api/inbox', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, is_read: true }) });
            setAllMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
        } catch (error) { console.error(error); }
    };

    const openMessage = (msg: InboxMessage) => {
        setSelectedMessage(msg);
        handleMarkAsRead(msg.id, msg.is_read);
    };

    const handleTranslate = () => {
        if (!selectedMessage) return;
        if (isTranslated) { setIsTranslated(false); return; }
        const content = selectedMessage.content;
        const isArabic = /[\u0600-\u06FF]/.test(content);
        const translated = isArabic
            ? `<div style="padding:10px;border-left:3px solid #39285e;background:#f8f9fa"><strong>[Simulated Translation to English]</strong><br/><br/>This is a simulated English translation. Real translation requires a paid API.<br/><br/>Original length: ${content.length} chars.</div>`
            : `<div style="padding:10px;border-right:3px solid #39285e;background:#f8f9fa;direction:rtl;text-align:right"><strong>[محاكاة الترجمة للعربية]</strong><br/><br/>هذه ترجمة محاكاة. الترجمة الفورية تتطلب ربط مع خدمة مدفوعة.<br/><br/>النص: ${content}</div>`;
        setTranslatedContent(translated);
        setIsTranslated(true);
    };

    const handleDelete = (id: string) => setDeleteConfirmation(id);
    const cancelDelete = () => setDeleteConfirmation(null);

    const toggleSelectAll = () => {
        setSelectedIds(messages.length > 0 && selectedIds.size === messages.length
            ? new Set()
            : new Set(messages.map(m => m.id)));
    };
    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };
    const handleBulkDelete = () => setDeleteConfirmation('BULK');

    const confirmDelete = async () => {
        if (!deleteConfirmation) return;
        if (deleteConfirmation === 'BULK') {
            try {
                const ids = Array.from(selectedIds);
                const res = await fetch('/api/inbox', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
                if (!res.ok) throw new Error('Failed to delete selected');
                setAllMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
                setSelectedIds(new Set());
                showToast('success', dict.inbox.delete_success);
            } catch (error) {
                showToast('error', 'Failed to delete selected messages');
                console.error(error);
            } finally { setDeleteConfirmation(null); }
        } else {
            const id = deleteConfirmation;
            try {
                const res = await fetch(`/api/inbox?id=${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error('Failed');
                setAllMessages(prev => prev.filter(m => m.id !== id));
                showToast('success', dict.inbox.delete_success);
                if (selectedMessage?.id === id) setSelectedMessage(null);
            } catch (error) { console.error(error); }
            finally { setDeleteConfirmation(null); }
        }
    };

    const getStyledContent = (content: string) => {
        const styles = `<style>body{margin:0;padding:0;background-color:#ffffff!important;color:#000000!important;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}a{color:#2563eb!important;text-decoration:underline}::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}</style>`;
        if (content.includes('<!DOCTYPE html') || content.includes('<html')) return content.replace('</head>', `${styles}</head>`);
        return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body>${content}</body></html>`;
    };

    const activeFolderMeta = FOLDERS.find(f => f.key === currentFolder)!;

    return (
        <div className="max-w-7xl mx-auto py-6 px-4 relative h-full flex flex-col gap-4">

            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300 ${toast.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300'}`}>
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h1 className="text-3xl font-bold text-[#39285e] dark:text-white flex items-center gap-3">
                    <div className="bg-[#39285e]/10 p-2 rounded-lg text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]">
                        <Mail className="w-6 h-6" />
                    </div>
                    {dict.inbox.title}
                </h1>

                {/* Search bar */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search sender, subject or content..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[#39285e]/30 dark:focus:ring-[#79bbe0]/30 dark:text-white"
                    />
                </div>

                <div className="flex gap-2">
                    <button onClick={handleSimulate} disabled={isSimulating}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                        {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Simulate
                    </button>
                    {selectedIds.size > 0 && hasAccess('inbox_delete') && (
                        <button onClick={handleBulkDelete}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                            <Trash2 className="w-4 h-4" />
                            {dict.inbox.delete_selected} ({selectedIds.size})
                        </button>
                    )}
                    <button onClick={() => fetchMessages(true, false)} disabled={isSyncing}
                        className="p-2 text-gray-500 hover:text-[#39285e] dark:text-gray-400 dark:hover:text-[#79bbe0] transition-colors" title={dict.inbox.refresh}>
                        <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Main Layout: Sidebar + Email List ── */}
            <div className="flex gap-4 flex-1 min-h-0">

                {/* Folder Sidebar */}
                <aside className="w-44 flex-shrink-0">
                    <nav className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        {FOLDERS.map(folder => {
                            const count = unreadCount(folder.key);
                            const isActive = currentFolder === folder.key;
                            return (
                                <button
                                    key={folder.key}
                                    onClick={() => { setCurrentFolder(folder.key); setSelectedMessage(null); }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all group ${isActive
                                        ? 'bg-[#39285e] text-white'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <span className="flex items-center gap-2.5">
                                        <span className={isActive ? 'text-white' : folder.color}>{folder.icon}</span>
                                        {folder.label}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        {count > 0 && (
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-[#39285e]/10 text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]'}`}>
                                                {count}
                                            </span>
                                        )}
                                        {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                                    </span>
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Email List Panel */}
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">

                    {/* Panel Header */}
                    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <span className={activeFolderMeta.color}>{activeFolderMeta.icon}</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{activeFolderMeta.label}</span>
                        <span className="text-xs text-gray-400 ml-auto">{messages.length} message{messages.length !== 1 ? 's' : ''}</span>
                    </div>

                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#39285e]/40" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                            <span className="opacity-20">{activeFolderMeta.icon && <span className="w-12 h-12 block">{activeFolderMeta.icon}</span>}</span>
                            <p className="mt-3">{dict.inbox.no_messages}</p>
                        </div>
                    ) : (
                        <div className="overflow-auto flex-1">
                            {/* Desktop Table */}
                            <div className="hidden md:block">
                                <table className="w-full text-start border-separate border-spacing-0">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-medium sticky top-0 z-10 backdrop-blur-sm">
                                        <tr>
                                            <th className="px-5 py-3 w-[50px]">
                                                <input type="checkbox" className="rounded border-gray-300 text-[#39285e] focus:ring-[#39285e]"
                                                    checked={messages.length > 0 && selectedIds.size === messages.length}
                                                    onChange={toggleSelectAll} />
                                            </th>
                                            <th className="px-5 py-3 text-start w-1/4">{currentFolder === 'sent' ? dict.inbox.receiver : dict.inbox.sender}</th>
                                            <th className="px-5 py-3 text-start w-1/3">{dict.inbox.subject}</th>
                                            <th className="px-5 py-3 text-start">{dict.inbox.date}</th>
                                            <th className="px-5 py-3 text-start">{dict.inbox.actions}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {messages.map(msg => (
                                            <tr key={msg.id}
                                                className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${selectedIds.has(msg.id) ? 'bg-blue-50 dark:bg-blue-900/20' : (!msg.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : '')}`}
                                                onClick={() => openMessage(msg)}>
                                                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" className="rounded border-gray-300 text-[#39285e] focus:ring-[#39285e]"
                                                        checked={selectedIds.has(msg.id)} onChange={() => toggleSelect(msg.id)} />
                                                </td>
                                                <td className="px-5 py-3 max-w-xs truncate">
                                                    <div className={`font-medium truncate ${!msg.is_read ? 'text-[#39285e] dark:text-[#79bbe0] font-bold' : 'text-gray-900 dark:text-white'}`}>
                                                        {currentFolder === 'sent'
                                                            ? (msg.recipient || 'Unknown Receiver')
                                                            : msg.sender.split('<')[0].trim()}
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate">
                                                        {currentFolder === 'sent' ? msg.sender : msg.sender}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 max-w-sm">
                                                    <div className={`${!msg.is_read ? 'font-bold' : ''} text-gray-800 dark:text-gray-200 truncate`}>{msg.subject}</div>
                                                    {msg.tags && msg.tags.length > 0 && (
                                                        <div className="flex gap-1 mt-1">
                                                            {msg.tags.map(t => (
                                                                <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] uppercase tracking-wider">{t}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                    {new Date(msg.received_at).toLocaleDateString()}
                                                    <span className="text-xs ml-1 opacity-70 block">{new Date(msg.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </td>
                                                <td className="px-5 py-3 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                    <button onClick={() => openMessage(msg)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                                                    {hasAccess('inbox_delete') && (
                                                        <button onClick={() => handleDelete(msg.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                {messages.map(msg => (
                                    <div key={msg.id}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer active:scale-[0.99] ${selectedIds.has(msg.id) ? 'bg-blue-50 dark:bg-blue-900/20' : (!msg.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : '')}`}
                                        onClick={() => openMessage(msg)}>
                                        <div className="flex items-start gap-3">
                                            <div onClick={e => e.stopPropagation()}>
                                                <input type="checkbox" className="mt-1 rounded border-gray-300 text-[#39285e] focus:ring-[#39285e]"
                                                    checked={selectedIds.has(msg.id)} onChange={() => toggleSelect(msg.id)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <div className={`font-medium truncate ${!msg.is_read ? 'text-[#39285e] dark:text-[#79bbe0] font-bold' : 'text-gray-900 dark:text-white'}`}>
                                                        {msg.sender.split('<')[0].trim()}
                                                    </div>
                                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{new Date(msg.received_at).toLocaleDateString()}</span>
                                                </div>
                                                <div className={`text-sm my-1 ${!msg.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>{msg.subject}</div>
                                                <div className="flex justify-between items-center">
                                                    <div className="flex gap-1">
                                                        {msg.tags?.map(t => <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] uppercase tracking-wider whitespace-nowrap">{t}</span>)}
                                                    </div>
                                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => openMessage(msg)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => handleDelete(msg.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Message Detail Modal ── */}
            {selectedMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedMessage(null)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-3xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-gray-50/50 dark:bg-gray-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedMessage.subject}</h2>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{dict.inbox.sender}:</span>
                                    <span>{selectedMessage.sender}</span>
                                </div>
                                {/* Show To: field — especially useful in Sent folder */}
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    <span className="font-medium bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{dict.inbox.to_label}:</span>
                                    <span className={selectedMessage.recipient ? 'text-gray-700 dark:text-gray-300' : 'italic text-gray-400'}>
                                        {selectedMessage.recipient ?? (selectedMessage.folder === 'sent' ? '—' : 'Me')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <span className="font-medium bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{dict.inbox.date}:</span>
                                    <span>{new Date(selectedMessage.received_at).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleTranslate}
                                    className={`p-2 rounded-full transition-all flex items-center justify-center ${isTranslated ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-white hover:bg-gray-100 text-gray-500 hover:text-[#39285e] border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white'}`}
                                    title={isTranslated ? dict.inbox.show_original : dict.inbox.translate_btn}>
                                    <Globe className="w-5 h-5" />
                                </button>
                                <button onClick={() => setSelectedMessage(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 hover:text-red-500">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto bg-white dark:bg-gray-950 p-6 relative">
                            {isTranslated && (
                                <div className="sticky top-0 z-10 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 mb-4 text-sm font-medium rounded-lg flex items-center gap-2 border border-blue-100 dark:border-blue-900/50">
                                    <Globe className="w-4 h-4" />
                                    {dict.inbox.translated_label}
                                </div>
                            )}
                            <div className="prose dark:prose-invert max-w-none w-full h-full">
                                <iframe srcDoc={getStyledContent(isTranslated ? translatedContent : selectedMessage.content)}
                                    className="w-full min-h-[500px] border-0" sandbox="allow-same-origin" title="Email Content" />
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
                            {hasAccess('inbox_delete') && (
                                <button onClick={() => handleDelete(selectedMessage.id)}
                                    className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors flex items-center gap-2">
                                    <Trash2 className="w-4 h-4" />
                                    {dict.common.delete}
                                </button>
                            )}
                            <button onClick={() => setSelectedMessage(null)}
                                className="px-6 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">
                                {dict.inbox.close}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirmation Modal ── */}
            {deleteConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in" onClick={cancelDelete}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                                <Trash2 className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {deleteConfirmation === 'BULK' ? `${dict.inbox.delete_modal.title} (${selectedIds.size})` : dict.inbox.delete_modal.title}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{dict.inbox.delete_modal.desc}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={cancelDelete} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors">
                                {dict.inbox.delete_modal.cancel}
                            </button>
                            <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
                                {dict.inbox.delete_modal.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
