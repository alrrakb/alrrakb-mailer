"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { User, Trash2, History, Plus, AlertTriangle, X, Ban, CheckCircle, ArrowLeft } from 'lucide-react';

import { useLanguage } from '@/components/providers/LanguageProvider';

// Help helper to generate complex token
const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let token = '';
    const length = 12; // Increased length
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
};

type AdminUser = {
    id: string;
    email: string;
    last_sign_in_at: string;
    created_at: string;
    banned_until?: string;
    profile?: {
        full_name?: string;
        role?: string;
        phone?: string;
        avatar_url?: string;
    }
};

type UserLog = {
    id: number;
    sent_at: string;
    recipient: string;
    subject: string;
    status: 'sent' | 'failed';
    content?: string;
    error_message?: string;
};

export default function AdminUsersPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const { dict, dir } = useLanguage();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Create User State
    const [newEmail, setNewEmail] = useState('');
    const [newToken, setNewToken] = useState('');
    const [createdUser, setCreatedUser] = useState<{ email: string, token: string } | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    // Suspend User State
    const [userToSuspend, setUserToSuspend] = useState<{ id: string, action: 'suspend' | 'activate' } | null>(null);

    // Logs State
    const [viewingLogsFor, setViewingLogsFor] = useState<string | null>(null); // Email
    const [userLogs, setUserLogs] = useState<UserLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [selectedLog, setSelectedLog] = useState<UserLog | null>(null); // For detail preview

    // View Details State
    const [viewingDetailsFor, setViewingDetailsFor] = useState<AdminUser | null>(null);

    // Regenerate Token State
    const [regeneratingFor, setRegeneratingFor] = useState<AdminUser | null>(null);
    const [regeneratedToken, setRegeneratedToken] = useState<{ email: string, token: string } | null>(null);

    // Toast State
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Toast Timer helper
    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => {
        if (!isAuthLoading) {
            if (!user || user.email !== 'admin@rrakb.com') {
                router.push('/dashboard');
                return;
            }
            fetchUsers();
        }
    }, [user, isAuthLoading, router]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (Array.isArray(data)) {
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
            showToast('error', dict.admin.fetch_error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        const token = generateToken();

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, password: token })
            });

            if (!res.ok) throw new Error('Failed to create user');

            setCreatedUser({ email: newEmail, token });
            setNewEmail('');
            setNewToken('');
            showToast('success', dict.admin.user_created);
            fetchUsers(); // Refresh list
        } catch (error) {
            showToast('error', dict.admin.create_error);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            fetchUsers();
            setUserToDelete(null);
            showToast('success', dict.admin.delete_success);
        } catch (error) {
            showToast('error', dict.admin.delete_error);
        }
    };

    const toggleUserStatus = async (userId: string, action: 'suspend' | 'activate') => {
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, action })
            });

            const result = await res.json();

            if (!res.ok) throw new Error(result.error || 'Failed to update status');

            fetchUsers();
            setUserToSuspend(null);
            showToast('success', action === 'suspend' ? dict.admin.suspend_success : dict.admin.activate_success);
        } catch (error: any) {
            console.error(error);
            showToast('error', error.message || dict.admin.status_error);
        }
    };

    const handleRegenerateToken = async () => {
        if (!regeneratingFor) return;
        const newToken = generateToken();

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: regeneratingFor.id, action: 'reset_password', password: newToken })
            });

            if (!res.ok) throw new Error('Failed to regenerate token');

            setRegeneratedToken({ email: regeneratingFor.email, token: newToken });
            setRegeneratingFor(null);
            showToast('success', dict.admin.regen_success);
        } catch (error) {
            showToast('error', dict.admin.regen_error);
        }
    };

    const handleViewLogs = async (email: string) => {
        setViewingLogsFor(email);
        setIsLoadingLogs(true);
        try {
            const res = await fetch(`/api/admin/user-logs?email=${email}`);
            const data = await res.json();
            setUserLogs(data);
        } catch (error) {
            showToast('error', dict.admin.fetch_logs_error);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    if (isAuthLoading || (user?.email !== 'admin@rrakb.com')) {
        return <div className="p-8 text-center text-gray-500">{dict.admin.loading_panel}</div>;
    }

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-right fade-in duration-300 ${toast.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900 dark:text-green-100'
                    : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900 dark:text-red-100'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-medium">{toast.message}</span>
                </div>
            )}

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors mr-2">
                    <ArrowLeft className={`w-6 h-6 text-gray-500 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </button>
                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                    <User className="w-6 h-6" />
                </div>
                {dict.admin.title}
            </h1>

            {/* Create User Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{dict.admin.create_user}</h2>
                {createdUser ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-4 flex items-center justify-between animate-in fade-in">
                        <div>
                            <p className="text-sm font-medium text-green-800 dark:text-green-300">{dict.admin.user_created}</p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">{dict.admin.email_address}: {createdUser.email}</p>
                            <p className="text-lg font-mono font-bold text-green-700 dark:text-green-200 mt-1 tracking-widest">{createdUser.token}</p>
                        </div>
                        <button onClick={() => setCreatedUser(null)} className="text-green-600 hover:text-green-800">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4 md:items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{dict.admin.email_address}</label>
                            <input
                                type="email"
                                required
                                value={newEmail}
                                onChange={e => setNewEmail(e.target.value)}
                                placeholder="user@rrakb.com"
                                className={`w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
                            />
                        </div>
                        <button type="submit" disabled={isCreating} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" />
                            {dict.admin.generate_create}
                        </button>
                    </form>
                )}
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden md:overflow-x-auto">
                {/* Desktop Table */}
                <table className="w-full text-start hidden md:table">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">
                        <tr>
                            <th className="px-6 py-4 text-start">{dict.admin.users_table.user}</th>
                            <th className="px-6 py-4 text-start">{dict.admin.users_table.status}</th>
                            <th className="px-6 py-4 text-start">{dict.admin.users_table.created}</th>
                            <th className="px-6 py-4 text-start">{dict.admin.users_table.last_login}</th>
                            <th className="px-6 py-4 text-end">{dict.common.actions}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {users.map(u => {
                            const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                            return (
                                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 dark:text-white">{u.email}</div>
                                        <div className="text-xs text-gray-500 font-mono">{u.id}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {isBanned ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                                {dict.profile.suspended}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                                {dict.profile.active}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {new Date(u.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : dict.admin.never}
                                    </td>
                                    <td className="px-6 py-4 text-end flex items-center justify-end gap-2">
                                        {u.email !== 'admin@rrakb.com' && (
                                            <>
                                                <button onClick={() => setViewingDetailsFor(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors" title={dict.common.view}>
                                                    <User className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setUserToSuspend({ id: u.id, action: isBanned ? 'activate' : 'suspend' })}
                                                    className={`p-2 rounded-lg transition-colors ${isBanned
                                                        ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                        : 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'}`}
                                                    title={isBanned ? dict.admin.suspend_modal.activate : dict.admin.suspend_modal.suspend}
                                                >
                                                    {isBanned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => setRegeneratingFor(u)} className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors" title={dict.admin.regenerate_modal.title}>
                                                    <History className={`w-4 h-4 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => handleViewLogs(u.email)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title={dict.history.title}>
                                            <History className="w-4 h-4" />
                                        </button>
                                        {u.email !== 'admin@rrakb.com' && (
                                            <button onClick={() => setUserToDelete(u.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title={dict.common.delete}>
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                    {users.map(u => {
                        const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                        return (
                            <div key={u.id} className="p-4 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-gray-900 dark:text-white">{u.email}</div>
                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{u.id}</div>
                                    </div>
                                    {isBanned ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800">
                                            {dict.profile.suspended}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border border-green-200 dark:border-green-800">
                                            {dict.profile.active}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 p-2 rounded-lg">
                                    <div className="flex flex-col">
                                        <span className="uppercase text-[10px] text-gray-400">{dict.admin.users_table.created}</span>
                                        <span>{new Date(u.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="uppercase text-[10px] text-gray-400">{dict.admin.users_table.last_login}</span>
                                        <span>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : dict.admin.never}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <div className="flex gap-2">
                                        {u.email !== 'admin@rrakb.com' && (
                                            <>
                                                <button onClick={() => setViewingDetailsFor(u)} className="p-2 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 rounded-lg" title={dict.common.view}>
                                                    <User className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setUserToSuspend({ id: u.id, action: isBanned ? 'activate' : 'suspend' })}
                                                    className={`p-2 rounded-lg ${isBanned
                                                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                                        : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'}`}
                                                    title={isBanned ? dict.admin.suspend_modal.activate : dict.admin.suspend_modal.suspend}
                                                >
                                                    {isBanned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                                                </button>
                                                <button onClick={() => setRegeneratingFor(u)} className="p-2 bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 rounded-lg" title={dict.admin.regenerate_modal.title}>
                                                    <History className={`w-4 h-4 ${dir === 'rtl' ? '' : 'rotate-180'}`} />
                                                </button>
                                            </>
                                        )}
                                        <button onClick={() => handleViewLogs(u.email)} className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg" title={dict.history.title}>
                                            <History className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {u.email !== 'admin@rrakb.com' && (
                                        <button onClick={() => setUserToDelete(u.id)} className="p-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-lg" title={dict.common.delete}>
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Suspend Confirmation Modal */}
                {userToSuspend && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                            <div className={`flex items-center gap-3 mb-4 ${userToSuspend.action === 'suspend' ? 'text-orange-600' : 'text-green-600'}`}>
                                {userToSuspend.action === 'suspend' ? <Ban className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                                <h3 className="text-lg font-bold capitalize">{dict.admin.confirm_}{userToSuspend.action === 'suspend' ? dict.admin.suspend_modal.suspend : dict.admin.suspend_modal.activate}</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {userToSuspend.action === 'suspend'
                                    ? dict.admin.suspend_modal.desc_suspend
                                    : dict.admin.suspend_modal.desc_activate}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setUserToSuspend(null)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
                                    {dict.common.cancel}
                                </button>
                                <button
                                    onClick={() => toggleUserStatus(userToSuspend.id, userToSuspend.action)}
                                    className={`px-4 py-2 rounded-lg text-white transition-colors font-medium shadow-lg ${userToSuspend.action === 'suspend' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-green-600 hover:bg-green-700 shadow-green-500/20'}`}
                                >
                                    {dict.admin.suspend_modal.confirm}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {userToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3 text-red-600 mb-4">
                                <AlertTriangle className="w-6 h-6" />
                                <h3 className="text-lg font-bold">{dict.admin.delete_modal.title}</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {dict.admin.delete_modal.desc}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setUserToDelete(null)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
                                    {dict.common.cancel}
                                </button>
                                <button onClick={() => handleDeleteUser(userToDelete)} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium shadow-lg shadow-red-500/20">
                                    {dict.admin.delete_modal.delete_user}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Logs Modal */}
                {viewingLogsFor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setViewingLogsFor(null)}>
                        <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <h3 className="font-bold text-gray-900 dark:text-white">{dict.admin.activity_log} {viewingLogsFor}</h3>
                                <button onClick={() => setViewingLogsFor(null)}><X className="w-5 h-5 text-gray-500" /></button>
                            </div>
                            <div className="flex-1 overflow-auto p-0">
                                {isLoadingLogs ? (
                                    <div className="p-8 text-center">{dict.admin.loading_logs}</div>
                                ) : userLogs.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">{dict.admin.no_activity}</div>
                                ) : (
                                    <table className="w-full text-start text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/30 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-2 text-start">{dict.history.status}</th>
                                                <th className="px-4 py-2 text-start">{dict.history.subject}</th>
                                                <th className="px-4 py-2 text-start">{dict.history.recipient}</th>
                                                <th className="px-4 py-2 text-start">{dict.history.time}</th>
                                                <th className="px-4 py-2 text-end"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                            {userLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                                    <td className="px-4 py-2">
                                                        <span className={`px-2 py-0.5 rounded textxs font-medium ${log.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {log.status === 'sent' ? dict.history.sent : dict.history.failed}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 font-medium">{log.subject}</td>
                                                    <td className="px-4 py-2">{log.recipient}</td>
                                                    <td className="px-4 py-2 text-gray-500">{new Date(log.sent_at).toLocaleDateString()}</td>
                                                    <td className="px-4 py-2 text-end">
                                                        <button onClick={() => setSelectedLog(log)} className="text-blue-600 hover:underline">{dict.common.view}</button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Email Detail Modal (Reused) */}
                {selectedLog && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedLog(null)}>
                        <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[80vh] rounded-xl flex flex-col shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b flex justify-between">
                                <h4 className="font-bold">{selectedLog.subject}</h4>
                                <button onClick={() => setSelectedLog(null)}><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-950 p-4">
                                {selectedLog.content ? (
                                    <iframe srcDoc={selectedLog.content} className="w-full h-full min-h-[400px] bg-white rounded-lg" />
                                ) : (
                                    <p className="text-center text-gray-500 mt-10">{dict.admin.no_content}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {/* User Details Modal */}
                {viewingDetailsFor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setViewingDetailsFor(null)}>
                        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-bold text-[#39285e] dark:text-white flex items-center gap-2">
                                    <User className="w-6 h-6" /> {dict.admin.user_profile}
                                </h3>
                                <button onClick={() => setViewingDetailsFor(null)}><X className="w-5 h-5 text-gray-500" /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                    <div className="h-12 w-12 rounded-full bg-[#39285e] text-white flex items-center justify-center font-bold text-xl">
                                        {viewingDetailsFor.email[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg dark:text-white">{viewingDetailsFor.profile?.full_name || dict.admin.no_name}</p>
                                        <p className="text-sm text-gray-500">{viewingDetailsFor.email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">{dict.profile.role}</p>
                                        <p className="font-medium dark:text-gray-200">{viewingDetailsFor.profile?.role || '-'}</p>
                                    </div>
                                    <div className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">{dict.profile.phone}</p>
                                        <p className="font-medium dark:text-gray-200">{viewingDetailsFor.profile?.phone || '-'}</p>
                                    </div>
                                    <div className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">{dict.profile.status}</p>
                                        <p className="font-medium dark:text-gray-200">
                                            {viewingDetailsFor.banned_until && new Date(viewingDetailsFor.banned_until) > new Date() ? dict.profile.suspended : dict.profile.active}
                                        </p>
                                    </div>
                                    <div className="p-3 border border-gray-100 dark:border-gray-700 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase">{dict.profile.user_id}</p>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-mono text-xs dark:text-gray-200 truncate flex-1" title={viewingDetailsFor.id}>
                                                {viewingDetailsFor.id}
                                            </p>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(viewingDetailsFor.id);
                                                    showToast('success', dict.common.user_id_copied);
                                                }}
                                                className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                                title={dict.admin.copy_id}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Regenerate Token Confirmation */}
                {regeneratingFor && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-3 text-purple-600 mb-4">
                                <History className="w-6 h-6 rotate-180" />
                                <h3 className="text-lg font-bold">{dict.admin.regenerate_modal.title}</h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                {dict.admin.regenerate_modal.desc}
                            </p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setRegeneratingFor(null)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
                                    {dict.common.cancel}
                                </button>
                                <button onClick={handleRegenerateToken} className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors font-medium shadow-lg shadow-purple-500/20">
                                    {dict.admin.regenerate_modal.confirm}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Regenerated Token Success Modal */}
                {regeneratedToken && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl p-6 shadow-2xl border border-green-200 dark:border-green-900">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{dict.admin.regenerate_modal.success}</h3>
                                <p className="text-gray-500 mt-2">{dict.admin.please_copy}</p>
                            </div>

                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg font-mono text-lg font-bold text-center tracking-widest text-gray-800 dark:text-white mb-6 select-all border border-gray-200 dark:border-gray-700">
                                {regeneratedToken.token}
                            </div>

                            <button onClick={() => setRegeneratedToken(null)} className="w-full py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors">
                                {dict.admin.regenerate_modal.done}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
