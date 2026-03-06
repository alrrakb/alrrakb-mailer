"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter } from 'next/navigation';
import { Settings, Trash2, Power, Lock, Save, RotateCcw, Shield, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';

import { useLanguage } from '@/components/providers/LanguageProvider';

export default function AdminSettingsPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();
    const { dict, dir } = useLanguage();

    // States
    const [isLoading, setIsLoading] = useState(true);
    const [smtpPassword, setSmtpPassword] = useState('');
    const [isSavingSmtp, setIsSavingSmtp] = useState(false);

    // Modals
    const [confirmSuspend, setConfirmSuspend] = useState<boolean | null>(null); // true = suspend all, false = activate all
    const [confirmClearDrafts, setConfirmClearDrafts] = useState(false);

    // Toast
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
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
            fetchSettings();
        }
    }, [user, isAuthLoading, router]);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_settings', value: '' })
            });
            const data = await res.json();
            if (data.smtp_password) setSmtpPassword(data.smtp_password);
        } catch (error) {
            console.error('Failed to fetch settings', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSuspendAll = async (suspend: boolean) => {
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'suspend_all', value: suspend })
            });
            if (!res.ok) throw new Error('Failed');
            showToast('success', suspend ? dict.settings.suspend_success : dict.settings.activate_success);
            setConfirmSuspend(null);
        } catch (error) {
            console.error(error);
            showToast('error', dict.settings.operation_failed);
        }
    };

    const handleClearDrafts = async () => {
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear_drafts', value: '' })
            });
            if (!res.ok) throw new Error('Failed');
            showToast('success', dict.settings.drafts_cleared);
            setConfirmClearDrafts(false);
        } catch (error) {
            console.error(error);
            showToast('error', dict.settings.operation_failed);
        }
    };

    const handleUpdateSmtp = async () => {
        setIsSavingSmtp(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_smtp', value: smtpPassword })
            });
            if (!res.ok) throw new Error('Failed');
            showToast('success', dict.settings.smtp_updated);
        } catch (error) {
            console.error(error);
            showToast('error', dict.settings.smtp_failed);
        } finally {
            setIsSavingSmtp(false);
        }
    };

    if (isAuthLoading || (user?.email !== 'admin@rrakb.com') || isLoading) return <div className="p-8 text-center text-gray-500">{dict.settings.loading_settings}</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
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
                <div className="bg-[#39285e]/10 p-2 rounded-lg text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]">
                    <Settings className="w-6 h-6" />
                </div>
                {dict.settings.title}
            </h1>

            <div className="space-y-6">

                {/* Emergency Controls */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-red-50/50 dark:bg-red-900/10 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-red-600" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">{dict.settings.emergency}</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">{dict.settings.global_suspend}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{dict.settings.global_suspend_desc}</p>
                            </div>
                            <button
                                onClick={() => setConfirmSuspend(true)}
                                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-red-500/20"
                            >
                                <Power className="w-4 h-4" />
                                {dict.settings.suspend_all}
                            </button>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-white">{dict.settings.system_reactivation}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{dict.settings.system_reactivation_desc}</p>
                            </div>
                            <button
                                onClick={() => setConfirmSuspend(false)}
                                className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-500/20"
                            >
                                <RotateCcw className="w-4 h-4" />
                                {dict.settings.activate_all}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Maintenance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                        <Trash2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">{dict.settings.maintenance}</h2>
                    </div>
                    <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">{dict.settings.clear_cache}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{dict.settings.clear_cache_desc}</p>
                        </div>
                        <button
                            onClick={() => setConfirmClearDrafts(true)}
                            className="w-full md:w-auto border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            {dict.settings.clear_cache_btn}
                        </button>
                    </div>
                </div>

                {/* Integration Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50">
                        <Lock className="w-5 h-5 text-blue-600" />
                        <h2 className="font-semibold text-gray-900 dark:text-white">{dict.settings.integrations}</h2>
                    </div>
                    <div className="p-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{dict.settings.smtp_pass}</label>
                        <div className="flex flex-col md:flex-row gap-4">
                            <input
                                type="text"
                                value={smtpPassword}
                                onChange={(e) => setSmtpPassword(e.target.value)}
                                className="w-full md:flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#79bbe0] outline-none"
                                placeholder={dict.settings.smtp_placeholder}
                            />
                            <button
                                onClick={handleUpdateSmtp}
                                disabled={isSavingSmtp}
                                className="w-full md:w-auto bg-[#39285e] hover:bg-[#2d1f4b] text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#39285e]/20"
                            >
                                <Save className="w-4 h-4" />
                                {isSavingSmtp ? dict.settings.saving : dict.settings.update}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{dict.settings.smtp_desc}</p>
                    </div>
                </div>

            </div>

            {/* Confirmation Modal: Suspend */}
            {(confirmSuspend !== null) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold">{confirmSuspend ? dict.settings.confirm_suspend_title : dict.settings.confirm_activate_title}</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {confirmSuspend ? dict.settings.confirm_suspend_desc : dict.settings.confirm_activate_desc}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmSuspend(null)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
                                {dict.common.cancel}
                            </button>
                            <button
                                onClick={() => handleSuspendAll(confirmSuspend)}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium shadow-lg"
                            >
                                {dict.common.confirm}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal: Clear Drafts */}
            {confirmClearDrafts && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3 text-orange-600 mb-4">
                            <AlertTriangle className="w-6 h-6" />
                            <h3 className="text-lg font-bold">{dict.settings.confirm_clear_title}</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {dict.settings.confirm_clear_desc}
                        </p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setConfirmClearDrafts(false)} className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
                                {dict.common.cancel}
                            </button>
                            <button
                                onClick={handleClearDrafts}
                                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors font-medium shadow-lg"
                            >
                                {dict.settings.delete_everything}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
