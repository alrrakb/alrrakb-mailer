"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Loader2, AlertCircle, X } from 'lucide-react';
import { accountManager } from '@/lib/account-manager';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface AddAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddAccountModal({ isOpen, onClose, onSuccess }: AddAccountModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { dict, dir } = useLanguage();

    if (!isOpen) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            if (data.session) {
                accountManager.addAccount(data.session);
                // We keep the current session active, or switch?
                // Usually "Add Account" implies adding it to the list but not necessarily switching immediately,
                // OR switching immediately. Let's switch immediately as typical behavior.
                sessionStorage.setItem('prompt_save_after_reload', 'true');
                window.location.reload(); // Hard reload to pick up new session if we force it? 
                // Actually, wait. signInWithPassword sets the Supabase client session.
                // So calling it here WILL switch the active session effectively.
                // And AuthProvider's onAuthStateChange will trigger.
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || dict.login?.error_generic || 'Failed to sign in');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className={`absolute top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${dir === 'rtl' ? 'left-4' : 'right-4'}`}
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">{dict.login?.sign_in || "Sign In"}</h2>
                <p className="text-sm text-gray-500 mb-6">{dict.login?.add_account_subtitle || "Add another account"}</p>

                <form className="space-y-5" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {dict.login?.email_label || "Email Address"}
                        </label>
                        <div className="relative">
                            <Mail className={`absolute top-2.5 h-5 w-5 text-gray-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${dir === 'rtl' ? 'pr-10' : 'pl-10'}`}
                                placeholder={dict.login?.email_placeholder || "name@example.com"}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            {dict.login?.password_label || "Password"}
                        </label>
                        <div className="relative">
                            <Lock className={`absolute top-2.5 h-5 w-5 text-gray-400 ${dir === 'rtl' ? 'right-3' : 'left-3'}`} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none ${dir === 'rtl' ? 'pr-10' : 'pl-10'}`}
                                placeholder={dict.login?.password_placeholder || "••••••••"}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-70 flex justify-center items-center"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (dict.login?.sign_in || "Sign In")}
                    </button>
                </form>
            </div>
        </div>
    );
}
