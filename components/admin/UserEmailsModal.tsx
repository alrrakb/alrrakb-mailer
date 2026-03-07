"use client";

import { useState, useEffect, useCallback } from 'react';
import {
    X, Mail, Inbox, Send, AlertOctagon, Archive,
    Search, Loader2, Eye, ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

type Folder = 'inbox' | 'sent' | 'spam' | 'trash' | 'bounced';

type EmailRecord = {
    id: string;
    sender: string;
    subject: string;
    content: string;
    received_at: string;
    is_read: boolean;
    folder: Folder;
    deleted_by_user?: boolean;
    tags?: string[];
};

// FOLDERS is generated inside the component to support translated labels.
// FolderBadge receives pre-resolved folders data as a prop.

function FolderBadge({ folder, folders }: { folder: Folder; folders: ReturnType<typeof buildFolders> }) {
    const meta = folders.find(f => f.key === folder) ?? folders[0];
    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${meta.color}`}>
            {meta.icon}{meta.label}
        </span>
    );
}

interface Props {
    userId: string;
    userEmail: string;
    onClose: () => void;
}

type FolderMeta = { key: Folder; label: string; icon: React.ReactNode; color: string };
function buildFolders(dict: ReturnType<typeof useLanguage>['dict']): FolderMeta[] {
    return [
        { key: 'inbox', label: dict.inbox.folder_inbox, icon: <Inbox className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
        { key: 'sent', label: dict.inbox.folder_sent, icon: <Send className="w-3.5 h-3.5" />, color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
        { key: 'spam', label: dict.inbox.folder_spam, icon: <AlertOctagon className="w-3.5 h-3.5" />, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
        { key: 'trash', label: dict.inbox.folder_trash, icon: <Archive className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
        { key: 'bounced', label: dict.inbox.folder_bounced, icon: <AlertOctagon className="w-3.5 h-3.5" />, color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' },
    ];
}

export default function UserEmailsModal({ userId, userEmail, onClose }: Props) {
    const { dict } = useLanguage();
    const FOLDERS = buildFolders(dict);
    const [emails, setEmails] = useState<EmailRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFolder, setActiveFolder] = useState<Folder | 'all'>('all');
    const [preview, setPreview] = useState<EmailRecord | null>(null);

    const fetchEmails = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/emails?userId=${userId}`);
            if (!res.ok) throw new Error('Failed to load user emails');
            const data = await res.json();
            setEmails(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => { fetchEmails(); }, [fetchEmails]);

    // Filter by search term AND active folder
    const filtered = emails.filter(e => {
        const matchFolder = activeFolder === 'all' || e.folder === activeFolder;
        if (!matchFolder) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            e.sender.toLowerCase().includes(term) ||
            e.subject.toLowerCase().includes(term) ||
            e.content.toLowerCase().includes(term)
        );
    });

    const countFor = (folder: Folder | 'all') =>
        folder === 'all' ? emails.length : emails.filter(e => e.folder === folder).length;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
            <div
                className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-[#39285e]/5 dark:bg-[#79bbe0]/5">
                    <div className="flex items-center gap-3">
                        <div className="bg-[#39285e]/10 p-2 rounded-lg text-[#39285e] dark:text-[#79bbe0]">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{dict.admin.user_emails_title}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{userEmail}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-red-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar: Search + Folder Tabs */}
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={dict.admin.user_emails_search}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39285e]/30 dark:focus:ring-[#79bbe0]/30 dark:text-white"
                        />
                    </div>

                    {/* Folder filter tabs */}
                    <div className="flex items-center gap-1 flex-wrap">
                        {([{ key: 'all' as const, label: dict.admin.user_emails_all }, ...FOLDERS]).map(f => (
                            <button
                                key={f.key}
                                onClick={() => setActiveFolder(f.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeFolder === f.key
                                    ? 'bg-[#39285e] text-white dark:bg-[#79bbe0] dark:text-gray-900'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                            >
                                {f.label}
                                <span className="ms-1 opacity-70">({countFor(f.key)})</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Email List */}
                <div className="flex-1 overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="w-8 h-8 animate-spin text-[#39285e]/40" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <Mail className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">{searchTerm ? dict.admin.user_emails_no_match : dict.admin.user_emails_empty}</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm border-separate border-spacing-0">
                            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 text-xs uppercase sticky top-0 z-10">
                                <tr>
                                    <th className="px-5 py-3 text-start">{dict.admin.col_folder}</th>
                                    <th className="px-5 py-3 text-start">{dict.admin.col_from}</th>
                                    <th className="px-5 py-3 text-start">{dict.admin.col_subject}</th>
                                    <th className="px-5 py-3 text-start">{dict.admin.col_date}</th>
                                    <th className="px-5 py-3 text-start">{dict.admin.col_preview}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {filtered.map(email => (
                                    <tr key={email.id}
                                        className={`transition-colors ${!email.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/40`}>
                                        <td className="px-5 py-3 whitespace-nowrap">
                                            <FolderBadge folder={email.folder} folders={FOLDERS} />
                                        </td>
                                        <td className="px-5 py-3 max-w-[160px] truncate">
                                            <span className={`${!email.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {email.sender.split('<')[0].trim()}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 max-w-[220px] truncate">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`${!email.is_read ? 'font-bold' : ''} text-gray-800 dark:text-gray-200 truncate`}>
                                                    {email.subject}
                                                </span>
                                                {email.deleted_by_user && (
                                                    <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-700">
                                                        {dict.admin.deleted_by_user_badge}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-3 whitespace-nowrap text-gray-500 dark:text-gray-400 text-xs">
                                            {new Date(email.received_at).toLocaleDateString()}
                                            <span className="block opacity-70">{new Date(email.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <button
                                                onClick={() => setPreview(email)}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <span>{dict.admin.user_emails_showing.replace('{count}', String(filtered.length)).replace('{total}', String(emails.length))}</span>
                    <button onClick={onClose} className="px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
                        {dict.admin.user_emails_close}
                    </button>
                </div>
            </div>

            {/* Email Preview Sub-Modal */}
            {preview && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 animate-in fade-in" onClick={() => setPreview(null)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[80vh] rounded-xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <FolderBadge folder={preview.folder} folders={FOLDERS} />
                                    <ChevronRight className="w-3 h-3 text-gray-400" />
                                    <span className="text-xs text-gray-400">{new Date(preview.received_at).toLocaleString()}</span>
                                </div>
                                <h3 className="text-base font-bold text-gray-900 dark:text-white">{preview.subject}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">{preview.sender}</p>
                            </div>
                            <button onClick={() => setPreview(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 hover:text-red-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto bg-white dark:bg-gray-950 p-5">
                            <iframe
                                srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:0;font-family:system-ui,sans-serif;background:#fff;color:#000}a{color:#2563eb}</style></head><body>${preview.content}</body></html>`}
                                className="w-full min-h-[350px] border-0"
                                sandbox="allow-same-origin"
                                title="Email Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
