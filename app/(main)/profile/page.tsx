"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { User, Save, Loader2, Phone, Briefcase, Mail, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/components/providers/LanguageProvider';

export default function ProfilePage() {
    const { user } = useAuth();
    const router = useRouter();
    const { dict, dir } = useLanguage();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState({
        full_name: '',
        role: '',
        phone: '',
        ai_system_prompt: ''
    });

    useEffect(() => {
        if (user) {
            fetchProfile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "Row not found"

            const { data: settingsData, error: settingsError } = await supabase
                .from('settings')
                .select('value')
                .eq('user_id', user?.id)
                .eq('key', 'ai_system_prompt')
                .maybeSingle();

            if (settingsError) console.error('Error fetching settings:', settingsError);

            setFormData({
                full_name: data?.full_name || '',
                role: data?.role || '',
                phone: data?.phone || '',
                ai_system_prompt: settingsData?.value || ''
            });

        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    full_name: formData.full_name,
                    role: formData.role,
                    phone: formData.phone,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // Upsert the AI settings
            const { error: settingsError } = await supabase
                .from('settings')
                .upsert({
                    user_id: user?.id,
                    key: 'ai_system_prompt',
                    value: formData.ai_system_prompt,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id,key' });

            if (settingsError) throw settingsError;

            setMessage({ type: 'success', text: dict.profile.profile_updated });
        } catch {
            setMessage({ type: 'error', text: dict.profile.error_update });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center">{dict.profile.loading}</div>;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold text-[#39285e] dark:text-white mb-8 flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors mr-2">
                    <ArrowLeft className={`w-6 h-6 text-gray-500 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                </button>
                <div className="bg-[#39285e]/10 p-2 rounded-lg text-[#39285e] dark:bg-[#79bbe0]/10 dark:text-[#79bbe0]">
                    <User className="w-6 h-6" />
                </div>
                {dict.common.my_profile}
            </h1>

            {message && (
                <div className={`p-4 mb-6 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${message.type === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'
                    : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
                    {message.text}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-8 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col md:flex-row gap-6 items-center text-center md:text-start">
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#39285e] to-[#4f3882] dark:from-[#79bbe0] dark:to-[#4e9bc7] flex items-center justify-center text-white dark:text-[#39285e] text-3xl font-bold shadow-xl shadow-[#39285e]/20 ring-4 ring-white dark:ring-gray-800 shrink-0">
                        {user?.email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div className="w-full">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                            {formData.full_name || user?.email?.split('@')[0]}
                        </h2>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-1 text-gray-500 dark:text-gray-400">
                            <Mail className="w-4 h-4" />
                            <span>{user?.email}</span>
                        </div>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 text-xs font-semibold rounded-md border border-blue-100 dark:border-blue-800 uppercase tracking-wider">
                                {user?.email === 'admin@rrakb.com' ? dict.common.admin : dict.common.team_member}
                            </span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{dict.profile.full_name}</label>
                            <div className="relative">
                                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    placeholder={dict.profile.placeholder_name}
                                    className={`w-full ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] dark:text-white outline-none transition-all`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{dict.profile.role}</label>
                            <div className="relative">
                                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                    <Briefcase className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    placeholder={dict.profile.placeholder_role}
                                    className={`w-full ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] dark:text-white outline-none transition-all`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{dict.profile.phone}</label>
                            <div className="relative">
                                <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                    <Phone className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder={dict.profile.placeholder_phone}
                                    className={`w-full ${dir === 'rtl' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] dark:text-white outline-none transition-all`}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                            <span className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
                                {/* @ts-ignore - Bot is from lucide, but relying on existing imports implicitly might fail. Using local Sparkles for simplicity or simply the existing SVG icons. */}
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2" /><path d="M20 14h2" /><path d="M15 13v2" /><path d="M9 13v2" /></svg>
                            </span>
                            {dict.ai_settings?.ai_settings_title || "AI Assistant Settings"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            {dict.ai_settings?.custom_instructions_label || "Custom Instructions (Persona & Tone)"}
                        </p>

                        <div className="space-y-2">
                            <textarea
                                value={formData.ai_system_prompt}
                                onChange={e => setFormData({ ...formData, ai_system_prompt: e.target.value })}
                                placeholder={dict.ai_settings?.custom_instructions_placeholder || "E.g., Act as a luxury hotel manager..."}
                                className={`w-full p-4 min-h-[120px] bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all resize-y`}
                                dir="auto"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-end">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-[#39285e] hover:bg-[#2d1f4b] text-white px-8 py-3 rounded-xl font-medium transition-all shadow-lg shadow-[#39285e]/20 flex items-center gap-2 justify-center disabled:opacity-70 disabled:cursor-not-allowed w-full md:w-auto"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {dict.profile.save_changes}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
