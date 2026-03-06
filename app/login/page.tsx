"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle, Globe } from 'lucide-react';
import QuickLoginList from '@/components/auth/QuickLoginList';
import { accountManager } from '@/lib/account-manager';
import { useLanguage } from '@/components/providers/LanguageProvider';
import Image from 'next/image';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'quick' | 'form'>('form');
    const [hasSavedAccounts, setHasSavedAccounts] = useState(false);
    const router = useRouter();
    const { dict, dir, language, toggleLanguage } = useLanguage();

    useEffect(() => {
        const saved = accountManager.getSavedAccounts();
        if (saved.length > 0) {
            setView('quick');
            setHasSavedAccounts(true);
        }
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            router.push('/dashboard');
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : dict.login?.error_generic || 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 relative">
            {/* Language Toggle */}
            <button
                onClick={toggleLanguage}
                className={`absolute top-6 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-colors bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm ${dir === 'rtl' ? 'left-6' : 'right-6'}`}
            >
                <Globe className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">{language}</span>
            </button>

            <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="text-center">
                    {/* Logo Placeholder - You can add your actual logo here */}
                    <div className="mx-auto h-20 w-auto flex items-center justify-center mb-4">
                        <Image src="/logo.png" alt="Logo" width={120} height={120} className="object-contain" unoptimized />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        {dict.login?.title || "Welcome Back"}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {dict.login?.subtitle || "Sign in to your account"}
                    </p>
                </div>

                {view === 'quick' ? (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <QuickLoginList />

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => setView('form')}
                                className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-all"
                            >
                                {dict.login?.use_another_account || "Use another account"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300" onSubmit={handleLogin}>
                        <div className="space-y-5">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {dict.login?.email_label || "Email Address"}
                                </label>
                                <div className="relative">
                                    <div className={`absolute inset-y-0 flex items-center pointer-events-none ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`block w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                                        placeholder={dict.login?.email_placeholder || "name@example.com"}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    {dict.login?.password_label || "Password"}
                                </label>
                                <div className="relative">
                                    <div className={`absolute inset-y-0 flex items-center pointer-events-none ${dir === 'rtl' ? 'right-0 pr-3' : 'left-0 pl-3'}`}>
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`block w-full py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                                        placeholder={dict.login?.password_placeholder || "••••••••"}
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-red-700 dark:text-red-300 font-medium">
                                    {error}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/30"
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                dict.login?.sign_in || "Sign In"
                            )}
                        </button>

                        {hasSavedAccounts && (
                            <div className="text-center mt-4">
                                <button
                                    type="button"
                                    onClick={() => setView('quick')}
                                    className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                                >
                                    {dict.login?.back_to_quick_login || "Back to saved accounts"}
                                </button>
                            </div>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
