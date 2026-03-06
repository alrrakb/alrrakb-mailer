"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, CheckCircle, XCircle, Clock, Calendar, Search, ArrowLeft, RotateCw } from 'lucide-react';
import Link from 'next/link';

type SentLog = {
    id: number;
    created_at: string;
    sent_at: string;
    recipient: string;
    subject: string;
    status: 'sent' | 'failed';
    error_message?: string;
    content?: string;
    sender_email?: string;
};

import { useLanguage } from '@/components/providers/LanguageProvider';

export default function HistoryPage() {
    const { dict, dir } = useLanguage();
    const [logs, setLogs] = useState<SentLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLog, setSelectedLog] = useState<SentLog | null>(null);
    const PER_PAGE = 20;

    const fetchLogs = async (reset = false) => {
        try {
            setIsLoading(true);
            const currentPage = reset ? 0 : page;

            // Get User Session
            const { data: { session } } = await supabase.auth.getSession();
            const userEmail = session?.user?.email;
            const isAdmin = userEmail === 'admin@rrakb.com';

            let query = supabase
                .from('sent_logs')
                .select('*')
                .order('sent_at', { ascending: false })
                .range(currentPage * PER_PAGE, (currentPage + 1) * PER_PAGE - 1);

            // Filter by user if not admin
            if (!isAdmin && userEmail) {
                query = query.eq('sender_email', userEmail);
            }

            if (searchQuery) {
                query = query.or(`subject.ilike.%${searchQuery}%,recipient.ilike.%${searchQuery}%`);
            }

            const { data, error } = await query;

            if (error) throw error;

            if (reset) {
                setLogs(data || []);
                setPage(1);
            } else {
                setLogs(prev => [...prev, ...(data || [])]);
                setPage(prev => prev + 1);
            }

            if (data && data.length < PER_PAGE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchLogs(true);
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            <div className="md:flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/dashboard" className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 transition-colors md:hidden">
                            <ArrowLeft className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                        </Link>
                        <h1 className="text-3xl font-bold text-[#39285e] dark:text-white flex items-center gap-3">
                            <div className="bg-[#39285e]/10 p-2 rounded-lg text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]">
                                <HistoryIcon className="w-6 h-6" />
                            </div>
                            {dict.history.title}
                        </h1>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">{dict.history.subtitle}</p>
                </div>

                <div className="mt-4 md:mt-0 relative">
                    <Search className={`w-5 h-5 absolute top-1/2 -translate-y-1/2 text-gray-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                    <input
                        type="text"
                        placeholder={dict.history.search_placeholder}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`py-2 w-full md:w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-start">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm text-start">{dict.history.status}</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm text-start">{dict.history.recipient}</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm text-start">{dict.history.subject}</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 dark:text-gray-300 text-sm text-end">{dict.history.time}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {logs.map((log) => (
                                <tr
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {log.status === 'sent' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border border-green-100 dark:border-green-800">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    {dict.history.sent}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-800" title={log.error_message}>
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    {dict.history.failed}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-medium">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold uppercase transition-transform group-hover:scale-110">
                                                {log.recipient.charAt(0)}
                                            </div>
                                            {log.recipient}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                                        {log.subject}
                                    </td>
                                    <td className="px-6 py-4 text-end whitespace-nowrap text-gray-500 dark:text-gray-500 text-sm">
                                        <div className="flex flex-col items-end gap-0.5">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(log.sent_at).toLocaleDateString()}
                                            </span>
                                            <span className="flex items-center gap-1.5 text-xs text-gray-400">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.sent_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                <Mail className="w-6 h-6 text-gray-400" />
                                            </div>
                                            <p>{dict.history.no_history}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            onClick={() => setSelectedLog(log)}
                            className="p-4 active:bg-gray-50 dark:active:bg-gray-800/50 transition-colors cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="hidden w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 items-center justify-center text-xs font-bold uppercase">
                                        {log.recipient.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[#39285e] dark:text-[#79bbe0] text-sm line-clamp-1">{log.subject || '(No Subject)'}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{log.recipient}</p>
                                    </div>
                                </div>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${log.status === 'sent'
                                    ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                    : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                    }`}>
                                    {log.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {log.status === 'sent' ? dict.history.sent : dict.history.failed}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(log.sent_at).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && !isLoading && (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                                <Mail className="w-6 h-6 text-gray-400" />
                            </div>
                            <p>{dict.history.no_history}</p>
                        </div>
                    )}
                </div>

                {hasMore && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-center">
                        <button
                            onClick={() => fetchLogs()}
                            disabled={isLoading}
                            className="px-6 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm flex items-center gap-2 mx-auto disabled:opacity-50"
                        >
                            {isLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : null}
                            {dict.history.load_more}
                        </button>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedLog(null)}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${selectedLog.status === 'sent'
                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                                    : 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                    }`}>
                                    {selectedLog.status === 'sent' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                                        {selectedLog.subject}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {dict.history.sent_to} <span className="font-medium text-gray-700 dark:text-gray-300">{selectedLog.recipient}</span>
                                    </p>
                                    {selectedLog.sender_email && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                            {dict.inbox.sender}: <span className="font-mono">{selectedLog.sender_email}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors">
                                <ArrowLeft className={`w-5 h-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-0">
                            {selectedLog.status === 'failed' && (
                                <div className="m-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
                                    <h4 className="text-sm font-bold text-red-800 dark:text-red-300 mb-1 flex items-center gap-2">
                                        <XCircle className="w-4 h-4" />
                                        {dict.history.delivery_failed}
                                    </h4>
                                    <p className="text-sm text-red-600 dark:text-red-400 font-mono bg-white/50 dark:bg-black/20 p-2 rounded mt-2">
                                        {selectedLog.error_message || dict.history.unknown_error}
                                    </p>
                                </div>
                            )}

                            <div className="p-5">
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{dict.history.content_preview}</h4>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white">
                                    {/* Using iframe to isolate email styles */}
                                    {selectedLog.content ? (
                                        <iframe
                                            srcDoc={selectedLog.content}
                                            className="w-full h-[400px]"
                                            title="Email Content"
                                            sandbox="allow-same-origin"
                                        />
                                    ) : (
                                        <div className="h-40 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                                            <Mail className="w-8 h-8 mb-2 opacity-20" />
                                            <p className="text-sm">{dict.history.content_unavailable}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex justify-between items-center text-xs text-gray-500">
                            <span>ID: {selectedLog.id}</span>
                            <span>{new Date(selectedLog.sent_at).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function HistoryIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
            <path d="M3 3v9h9" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}
