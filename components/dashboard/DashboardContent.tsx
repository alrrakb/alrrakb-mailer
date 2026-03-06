"use client";

import { useLanguage } from '@/components/providers/LanguageProvider';
import { Mail, CheckCircle, XCircle, Calendar, Clock } from 'lucide-react';

interface DashboardLog {
    id: string;
    recipient: string;
    subject: string | null;
    status: string;
    sent_at: string;
}

interface DashboardContentProps {
    sentCount: number;
    failedCount: number;
    recentLogs: DashboardLog[];
}

export default function DashboardContent({ sentCount, failedCount, recentLogs }: DashboardContentProps) {
    const { dict } = useLanguage();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-[#39285e] dark:text-white">{dict.dashboard.title}</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{dict.dashboard.welcome}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-[#39285e]/10 text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0] rounded-xl shrink-0">
                        <Mail className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{dict.dashboard.total_sent}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white truncate">{(sentCount || 0) + (failedCount || 0)}</h3>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-xl shrink-0">
                        <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{dict.dashboard.successful}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white truncate">{sentCount || 0}</h3>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl shrink-0">
                        <XCircle className="w-8 h-8" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{dict.dashboard.failed}</p>
                        <h3 className="text-3xl font-bold text-gray-900 dark:text-white truncate">{failedCount || 0}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">{dict.dashboard.recent_activity}</h3>
                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-[#39285e]/10 text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]">
                        {dict.dashboard.live_updates}
                    </span>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentLogs && recentLogs.length > 0 ? (
                        recentLogs.map((log: DashboardLog) => (
                            <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold uppercase shadow-sm">
                                            {log.recipient.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[#39285e] dark:text-[#79bbe0] text-sm line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {log.subject || '(No Subject)'}
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{log.recipient}</p>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm ${log.status === 'sent'
                                        ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                        : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                        }`}>
                                        {log.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {log.status === 'sent' ? 'Sent' : 'Failed'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-400 pl-[3.25rem]">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(log.sent_at).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                                <Mail className="w-6 h-6 text-gray-400" />
                            </div>
                            <p>{dict.dashboard.no_activity}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
