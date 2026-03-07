'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Play, Pause, Trash2, AlertCircle, CheckCircle, Clock, Plus, X, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { UnauthorizedState } from '@/components/shared/UnauthorizedState';
import ComposeWindow from '@/components/email/ComposeWindow';

interface CampaignRecord {
    id: string;
    subject: string;
    status: string;
    scheduled_at: string | null;
    created_at: string;
    stats: {
        total: number;
        completed: number;
        pending: number;
        failed: number;
        processing: number;
    };
    sender_name?: string;
}
interface QueueDetailRecord {
    id: string;
    recipient_email: string;
    status: string;
    last_error?: string;
}

interface GlobalStats {
    stats: {
        total: number;
        completed: number;
        pending: number;
        failed: number;
        processing: number;
    };
    recent: Record<string, unknown>[];
}

export default function QueueDashboard() {
    const { dict } = useLanguage();
    const { user, isLoading: isAuthLoading } = useAuth();
    const { hasAccess, role } = usePermissions();
    const router = useRouter();
    const [stats, setStats] = useState<GlobalStats | null>(null); // Global stats
    const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]); // Campaign List
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [refreshing, setRefreshing] = useState(false);

    // New Campaign Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchCampaigns();
        setTimeout(() => setRefreshing(false), 500); // Minimum 500ms spin for feedback
    };

    // Confirmation Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'play' | 'pause' | 'delete';
        campaign: CampaignRecord | null;
    }>({ isOpen: false, type: 'play', campaign: null });

    // Details Modal State
    const [selectedCampaign, setSelectedCampaign] = useState<CampaignRecord | null>(null);
    const [details, setDetails] = useState<QueueDetailRecord[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Helper to trigger the background processor
    const triggerProcessor = useCallback(async () => {
        try {
            fetch('/api/queue/process', { method: 'GET' }); // Fire and forget
        } catch (e) { console.error(e); }
    }, []);

    // Standalone fetch logic that can be reused by refresh/action
    const fetchCampaigns = useCallback(async (query = '', pageToLoad = 1, showSpinner = false) => {
        try {
            if (showSpinner) setLoading(true);
            setError(null);

            const [campaignsRes, statsRes] = await Promise.all([
                fetch(`/api/queue/campaigns?query=${query}&page=${pageToLoad}`),
                fetch('/api/queue/stats')
            ]);

            if (!campaignsRes.ok) throw new Error(`Campaigns API failed: ${campaignsRes.statusText}`);
            if (!statsRes.ok) throw new Error(`Stats API failed: ${statsRes.statusText}`);

            const campaignsData = await campaignsRes.json();
            const statsData = await statsRes.json();

            const parsedCampaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData.campaigns || []);
            setCampaigns(parsedCampaigns);
            setStats(statsData || null);

            // Auto-process triggers
            const hasActiveWork = parsedCampaigns.some((c: CampaignRecord) => c.status === 'active' && c.stats.pending > 0);
            if (hasActiveWork) {
                triggerProcessor();
            }

        } catch (err: unknown) {
            console.error("Queue Fetch Error:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
        } finally {
            if (showSpinner) setLoading(false);
        }
    }, [triggerProcessor]);

    const confirmAction = async () => {
        if (!confirmModal.campaign) return;

        const { type, campaign } = confirmModal;
        const id = campaign.id;

        setLoading(true);
        setConfirmModal({ ...confirmModal, isOpen: false });

        try {
            if (type === 'delete') {
                await fetch(`/api/queue/campaigns/${id}`, { method: 'DELETE' });
                toast.success(dict.queue?.notifications?.deleted || 'Campaign deleted');
            } else if (type === 'play') {
                await fetch(`/api/queue/campaigns/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'active' })
                });
                toast.success(dict.queue?.notifications?.resumed || 'Campaign started');
                triggerProcessor();
            } else if (type === 'pause') {
                await fetch(`/api/queue/campaigns/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: 'paused' })
                });
                toast.success(dict.queue?.notifications?.paused || 'Campaign paused');
            }
            fetchCampaigns();
        } catch (error) {
            console.error(error);
            toast.error(dict.queue?.notifications?.error || 'Action failed');
        } finally {
            setLoading(false);
        }
    };

    const openDetails = async (campaign: CampaignRecord) => {
        setSelectedCampaign(campaign);
        setLoadingDetails(true);
        try {
            const res = await fetch(`/api/queue/campaigns/${campaign.id}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                setDetails(data);
            } else {
                setDetails([]);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to load details");
            setDetails([]);
        } finally {
            setLoadingDetails(false);
        }
    };

    useEffect(() => {
        console.log("[QUEUE_DEBUG] 1. Component Mounted");
        let isMounted = true;

        const loadData = async () => {
            console.log("[QUEUE_DEBUG] 2. Fetch Started");
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            try {
                setLoading(true);
                setError(null);

                // Fetch campaigns and stats concurrently using Promise.all
                const [campaignsRes, statsRes] = await Promise.all([
                    fetch('/api/queue/campaigns?page=1', { signal: controller.signal }),
                    fetch('/api/queue/stats', { signal: controller.signal })
                ]);

                clearTimeout(timeoutId);

                if (!campaignsRes.ok) throw new Error(`Campaigns API failed: ${campaignsRes.statusText} (${campaignsRes.status})`);
                if (!statsRes.ok) throw new Error(`Stats API failed: ${statsRes.statusText} (${statsRes.status})`);

                const campaignsData = await campaignsRes.json();
                const statsData = await statsRes.json();

                console.log("[QUEUE_DEBUG] 3. Data Received", { campaignsData, statsData });

                if (isMounted) {
                    const parsedCampaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData?.campaigns || []);
                    setCampaigns(parsedCampaigns);
                    setStats(statsData || null);

                    const hasActiveWork = parsedCampaigns.some((c: CampaignRecord) => c?.status === 'active' && c?.stats?.pending > 0);
                    if (hasActiveWork) {
                        triggerProcessor();
                    }
                }
            } catch (err: unknown) {
                console.error("[QUEUE_DEBUG] Queue Fetch Error:", err);
                if (isMounted) {
                    setError(err instanceof Error ? err.message : 'An unknown error occurred');
                }
            } finally {
                clearTimeout(timeoutId);
                if (isMounted) {
                    setLoading(false); // GUARANTEED TO RUN
                    console.log("[QUEUE_DEBUG] 4. Render Step - Loading set to false");
                }
            }
        };

        loadData();

        const dataInterval = setInterval(() => {
            if (isMounted) {
                console.log("[QUEUE_DEBUG] Background polling started");
                fetchCampaigns(); // Poll silently without loading spinner
            }
        }, 10000); // Poll data every 10s for live updates

        return () => {
            console.log("[QUEUE_DEBUG] Component Unmounted");
            isMounted = false; // Cleanup to prevent state updates on unmounted component
            clearInterval(dataInterval);
        };
    }, [fetchCampaigns, triggerProcessor]);

    if (loading || isAuthLoading) return <div className="p-8 text-center">{dict.common.loading || "Loading..."}</div>;

    const getStatusLabel = (status: string) => {
        const key = status as keyof typeof dict.queue.status;
        return dict.queue?.status?.[key] || status;
    };

    const getStatsLabel = (key: string) => {
        return dict.queue?.stats?.[key as keyof typeof dict.queue.stats] || key;
    };

    // Role checks are now fully deferred to `hasAccess`.
    // The previous hardcoded `isAdmin` check was falsely denying access 
    // to authorized non-admin users.


    if (!hasAccess('queue')) {
        return <UnauthorizedState />;
    }

    const isViewOnly = !hasAccess('queue_send') && !hasAccess('queue_delete');

    if (error) {
        return (
            <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 relative">
                <div className="border border-red-200 bg-red-50 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4 dark:bg-red-900/20 dark:border-red-800">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-400">Error Loading Data</h3>
                        <p className="text-red-600 dark:text-red-300">{error}</p>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchCampaigns(); }}
                        className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 sm:space-y-8 relative">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{dict.queue?.title}</h1>
                        {isViewOnly && (
                            <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-medium rounded-md border border-gray-200 dark:border-gray-700">
                                View Only Mode
                            </span>
                        )}
                    </div>
                    <p className="text-gray-500">{dict.queue?.subtitle}</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    {hasAccess('queue_send') && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            {dict.queue?.new_campaign}
                        </button>
                    )}
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={dict.queue?.refresh}
                    >
                        <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={dict.queue?.stats?.pending} value={stats?.stats?.pending || 0} icon={<Clock className="w-6 h-6 text-yellow-500" />} bg="bg-yellow-50 dark:bg-yellow-900/20" />
                <StatCard title={dict.queue?.stats?.processing} value={stats?.stats?.processing || 0} icon={<RefreshCw className="w-6 h-6 text-blue-500" />} bg="bg-blue-50 dark:bg-blue-900/20" />
                <StatCard title={dict.queue?.stats?.completed} value={stats?.stats?.completed || 0} icon={<CheckCircle className="w-6 h-6 text-green-500" />} bg="bg-green-50 dark:bg-green-900/20" />
                <StatCard title={dict.queue?.stats?.failed} value={stats?.stats?.failed || 0} icon={<AlertCircle className="w-6 h-6 text-red-500" />} bg="bg-red-50 dark:bg-red-900/20" />
            </div>

            {/* Campaign List */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{dict.queue?.table?.active_campaigns}</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {(!campaigns || campaigns.length === 0) ? (
                        <div className="p-8 text-center text-gray-500">{dict.queue?.table?.no_campaigns}</div>
                    ) : (
                        campaigns.map((camp) => (
                            <div key={camp.id} className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-4 items-center hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                <div className="min-w-0 pr-0 sm:pr-2 cursor-pointer" onClick={() => openDetails(camp)}>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                        <Badge status={camp.status || 'paused'} label={getStatusLabel(camp.status || 'paused')} />

                                        {/* Scheduled Badge */}
                                        {camp.scheduled_at && new Date(camp.scheduled_at) > new Date() && (
                                            <span
                                                className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-2 py-0.5 rounded flex items-center gap-1 font-medium border border-purple-200 dark:border-purple-800 cursor-help"
                                                title={`${dict.queue?.scheduled_tooltip} (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}
                                            >
                                                <Clock className="w-3 h-3" />
                                                <span>
                                                    {new Date(camp.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {new Date(camp.scheduled_at).getDate() !== new Date().getDate() &&
                                                        ` (${new Date(camp.scheduled_at).getDate()}/${new Date(camp.scheduled_at).getMonth() + 1})`
                                                    }
                                                </span>
                                            </span>
                                        )}

                                        <span className="font-medium text-gray-900 dark:text-gray-100 truncate w-full sm:w-auto block sm:inline">{camp.subject || dict.queue?.table?.no_subject}</span>
                                        <span className="text-xs text-gray-400 hidden sm:inline">{new Date(camp.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                                        <div
                                            className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                                            style={{ width: `${camp?.stats?.total > 0 ? (camp?.stats?.completed / camp.stats.total) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                                        <span>{dict.queue?.table?.total}: {camp?.stats?.total}</span>
                                        <span className="text-green-600">{dict.queue?.table?.sent}: {camp?.stats?.completed}</span>
                                        <span className="text-yellow-600">{dict.queue?.table?.pending}: {camp?.stats?.pending}</span>
                                        {camp?.stats?.failed > 0 && <span className="text-red-500">{dict.queue?.table?.failed}: {camp?.stats?.failed}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center justify-end sm:justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    {/* Play/Pause Toggle - Hidden if Completed */}
                                    {camp.status !== 'completed' && hasAccess('queue_send') && (
                                        camp.status === 'active' ? (
                                            <button
                                                onClick={() => setConfirmModal({ isOpen: true, type: 'pause', campaign: camp })}
                                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors bg-yellow-50/50 sm:bg-transparent"
                                                title={dict.queue?.actions?.pause_title}
                                            >
                                                <Pause className="w-5 h-5 fill-current" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setConfirmModal({ isOpen: true, type: 'play', campaign: camp })}
                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors bg-green-50/50 sm:bg-transparent"
                                                title={dict.queue?.actions?.start_title}
                                            >
                                                <Play className="w-5 h-5 fill-current" />
                                            </button>
                                        )
                                    )}

                                    {/* View Details */}
                                    <button
                                        onClick={() => openDetails(camp)}
                                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors bg-indigo-50/50 sm:bg-transparent"
                                        title={dict.queue?.actions?.view_details}
                                    >
                                        <Eye className="w-5 h-5" />
                                    </button>

                                    {/* Delete - Hidden if Completed */}
                                    {camp.status !== 'completed' && hasAccess('queue_delete') && (
                                        <button
                                            onClick={() => setConfirmModal({ isOpen: true, type: 'delete', campaign: camp })}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors bg-red-50/50 sm:bg-transparent"
                                            title={dict.queue?.actions?.delete_title}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className={`p-3 rounded-full ${confirmModal.type === 'delete' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {confirmModal.type === 'delete' ? <AlertCircle className="w-8 h-8" /> : (confirmModal.type === 'play' ? <Play className="w-8 h-8" /> : <Pause className="w-8 h-8" />)}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {confirmModal.type === 'delete' ? dict.queue?.delete_modal?.title :
                                        (confirmModal.type === 'play' ? dict.queue?.play_modal?.title : dict.queue?.pause_modal?.title)}
                                </h3>
                                <p className="text-gray-500 mt-1">
                                    {confirmModal.type === 'delete'
                                        ? dict.queue?.delete_modal?.desc
                                        : (confirmModal.type === 'play' ? dict.queue?.play_modal?.desc : dict.queue?.pause_modal?.desc)}
                                </p>
                            </div>
                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                                    className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                >
                                    {dict.common.cancel}
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition-colors ${confirmModal.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                                        }`}
                                >
                                    {confirmModal.type === 'delete' ? dict.queue?.delete_modal?.confirm :
                                        (confirmModal.type === 'play' ? dict.queue?.play_modal?.confirm : dict.queue?.pause_modal?.confirm)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Campaign Details Modal */}
            {
                selectedCampaign && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedCampaign(null)}>
                        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-md">{selectedCampaign.subject}</h2>
                                    <p className="text-sm text-gray-500">{dict.queue?.details_modal?.title}</p>
                                </div>
                                <button onClick={() => setSelectedCampaign(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-0">
                                {loadingDetails ? (
                                    <div className="p-12 text-center text-gray-500">{dict.common.loading}</div>
                                ) : (
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 sticky top-0 z-10">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 font-medium">{dict.queue?.details_modal?.recipients || "Email"}</th>
                                                <th className="px-4 sm:px-6 py-3 font-medium">{dict.queue?.details_modal?.status || "Status"}</th>
                                                <th className="px-4 sm:px-6 py-3 font-medium hidden sm:table-cell">{dict.common.error || "Error"}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {details.map((row) => (
                                                <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                                    <td className="px-4 sm:px-6 py-3 text-gray-900 dark:text-gray-200 truncate max-w-[120px] sm:max-w-none">{row.recipient_email}</td>
                                                    <td className="px-4 sm:px-6 py-3"><Badge status={row.status} label={getStatsLabel(row.status)} /></td>
                                                    <td className="px-4 sm:px-6 py-3 text-red-500 truncate max-w-xs hidden sm:table-cell">{row.last_error}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* New Campaign Modal */}
            {
                isModalOpen && (
                    <ComposeWindow
                        isModal={true}
                        onClose={() => { setIsModalOpen(false); fetchCampaigns(); }}
                        mode="queue"
                    />
                )
            }
        </div >
    );
}

function StatCard({ title, value, icon, bg }: { title: string, value: string | number, icon: React.ReactNode, bg: string }) {
    return (
        <div className={`p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm ${bg}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-600 dark:text-gray-300 text-sm">{title}</h3>
                {icon}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '-'}</p>
        </div>
    );
}

function Badge({ status, label }: { status: string, label?: string }) {
    const styles: Record<string, string> = {
        active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        pending: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300',
        processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        completed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
        failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
            {status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
            {label || status}
        </span>
    );
}
