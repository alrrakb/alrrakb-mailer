"use client";

import { useLanguage } from '@/components/providers/LanguageProvider';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDestructive?: boolean;
}

export default function ConfirmModal({
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    isDestructive = false
}: ConfirmModalProps) {
    const { dict } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-xl p-6 shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95">
                <div className={`flex items-center gap-3 mb-4 ${isDestructive ? 'text-red-600 dark:text-red-500' : 'text-[#39285e] dark:text-[#79bbe0]'}`}>
                    <AlertTriangle className="w-6 h-6" />
                    <h3 className="text-lg font-bold">{title}</h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    {message}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel();
                        }}
                        className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors font-medium"
                    >
                        {cancelText || dict.common?.cancel || 'Cancel'}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirm();
                        }}
                        className={`px-4 py-2 rounded-lg text-white font-bold shadow-lg transition-colors ${isDestructive
                                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                : 'bg-[#39285e] hover:bg-[#2d1f4b] shadow-[#39285e]/20'
                            }`}
                    >
                        {confirmText || dict.common?.confirm || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
