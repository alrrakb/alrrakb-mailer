"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { Globe, ChevronDown, Plus, User as UserIcon } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { accountManager, StoredAccount } from '@/lib/account-manager';
import AddAccountModal from '@/components/auth/AddAccountModal';
import { supabase } from '@/lib/supabase';
import { Menu } from 'lucide-react';

export function Header({ title, onMenuClick }: { title?: string; onMenuClick?: () => void }) {
    const { user } = useAuth();
    const { language, toggleLanguage, dict, dir } = useLanguage();
    const [accounts, setAccounts] = useState<StoredAccount[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Load accounts on mount
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAccounts(accountManager.getAccounts());
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSwitchAccount = async (account: StoredAccount) => {
        const { error } = await supabase.auth.setSession({
            access_token: account.session.access_token,
            refresh_token: account.session.refresh_token
        });
        if (error) {
            alert("Session expired. Please sign in again.");
            return;
        }
        accountManager.updateLastActive(account.email);
        window.location.reload();
    };

    const formatName = (email: string | undefined) => {
        if (!email) return 'User';
        const namePart = email.split('@')[0];
        // Capitalize first letter
        return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    };

    return (
        <header className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 md:px-6 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ms-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                >
                    <Menu className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold text-[#39285e] dark:text-white tracking-tight">{title || dict.sidebar.dashboard}</h1>
            </div>

            <div className="flex items-center gap-4">
                {/* Language Toggle */}
                <button
                    onClick={toggleLanguage}
                    className="flex items-center gap-1.5 md:gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                    <Globe className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500" />
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">{language}</span>
                </button>

                {/* Profile Section */}
                {/* Profile Section / Account Switcher */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-1 md:gap-3 pl-1 md:pl-2 group cursor-pointer border-none bg-transparent"
                    >
                        <div className="flex flex-col items-end hidden md:flex transition-all">
                            <span className="text-sm font-bold text-gray-800 dark:text-gray-100 group-hover:text-[#39285e] dark:group-hover:text-[#79bbe0] transition-colors">
                                {formatName(user?.email)}
                            </span>
                            <span className="text-[10px] font-medium tracking-wider text-gray-400 uppercase bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-md border border-gray-100 dark:border-gray-700 group-hover:border-[#79bbe0]/30 transition-colors">
                                {user?.email === 'admin@rrakb.com' ? dict.common.admin : dict.common.team_member}
                            </span>
                        </div>

                        <div className="relative">
                            <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-[#39285e] to-[#4f3882] dark:from-[#79bbe0] dark:to-[#4e9bc7] flex items-center justify-center text-white dark:text-[#39285e] font-bold shadow-lg shadow-[#39285e]/20 ring-2 ring-white dark:ring-gray-900 group-hover:scale-105 transition-transform duration-200 text-sm md:text-base">
                                {user?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
                        </div>
                        <ChevronDown className={`w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                        <div className={`absolute top-full mt-2 w-64 md:w-72 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 ${dir === 'rtl' ? 'left-0' : 'right-0'}`}>

                            {/* Current User Info */}
                            <div className="p-3 md:p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                                <p className="text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{dict.header?.current_account || 'Current Account'}</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm md:text-lg font-bold shadow-lg shadow-blue-500/30">
                                        {user?.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-sm md:text-base text-gray-900 dark:text-white truncate" title={user?.email}>
                                            {user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                                        </p>
                                        <p className="text-[10px] md:text-xs text-gray-500 truncate">{user?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Other Accounts */}
                            <div className="max-h-60 overflow-y-auto py-1 md:py-2">
                                {accounts.filter(a => a.email !== user?.email && a.isSaved).length > 0 && (
                                    <p className="px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-semibold text-gray-500 uppercase tracking-wider">{dict.header?.switch_to || 'Switch to'}</p>
                                )}

                                {accounts.filter(a => a.email !== user?.email && a.isSaved).map((acc) => (
                                    <button
                                        key={acc.email}
                                        onClick={() => handleSwitchAccount(acc)}
                                        className="w-full px-3 md:px-4 py-2 md:py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-start group"
                                    >
                                        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center text-xs md:text-sm font-bold border border-gray-200 dark:border-gray-700 group-hover:border-blue-200 dark:group-hover:border-blue-900 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-600 transition-all">
                                            {acc.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                                {acc.full_name || acc.email.split('@')[0]}
                                            </p>
                                            <p className="text-[10px] md:text-xs text-gray-500 truncate">{acc.email}</p>
                                        </div>
                                    </button>
                                ))}

                                {accounts.filter(a => a.email !== user?.email && a.isSaved).length === 0 && (
                                    <div className="px-4 py-3 text-center text-sm text-gray-400 italic">
                                        {dict.header?.no_other_accounts || 'No other accounts added'}
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 grid grid-cols-1 gap-1">
                                <button
                                    onClick={() => {
                                        setIsDropdownOpen(false);
                                        setIsAddAccountOpen(true);
                                    }}
                                    className="flex items-center justify-center gap-2 w-full p-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors border border-dashed border-blue-200 dark:border-blue-800/50 hover:border-blue-300"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>{dict.header?.add_account || 'Add Another Account'}</span>
                                </button>

                                <Link href="/profile" className="flex items-center gap-2 w-full p-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                    <UserIcon className="w-4 h-4" />
                                    {dict.common?.my_profile || 'My Profile'}
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <AddAccountModal
                    isOpen={isAddAccountOpen}
                    onClose={() => setIsAddAccountOpen(false)}
                    onSuccess={() => {
                        // Refresh accounts list
                        setAccounts(accountManager.getAccounts());
                    }}
                />
            </div>
        </header>
    );
}
