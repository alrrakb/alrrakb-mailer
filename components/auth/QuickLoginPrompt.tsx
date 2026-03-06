"use client";

import { useLanguage } from '@/components/providers/LanguageProvider';
import { Save } from 'lucide-react';

interface QuickLoginPromptProps {
    isOpen: boolean;
    onSave: () => void;
    onDecline: () => void;
}

export default function QuickLoginPrompt({ isOpen, onSave, onDecline }: QuickLoginPromptProps) {
    const { dict, dir } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" dir={dir}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 relative animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Save className="w-6 h-6" />
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {dict.login?.save_account_prompt || "Save account for Quick Login?"}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {dict.login?.save_account_desc || "Enables password-less access from this device."}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full pt-2">
                        <button
                            onClick={onSave}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            {dict.login?.save_yes || "Yes, Save Account"}
                        </button>
                        <button
                            onClick={onDecline}
                            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            {dict.login?.save_no || "No, Don't Save"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
