import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

export function UnauthorizedState({ message }: { message?: string }) {
    const { dict } = useLanguage();

    return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] p-6 text-center animate-in fade-in zoom-in duration-300">
            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-full mb-6 relative">
                <div className="absolute inset-0 bg-red-100 dark:bg-red-900/20 rounded-full animate-ping opacity-20" />
                <ShieldAlert className="w-12 h-12 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {(dict.common as Record<string, unknown>)?.access_denied as string || 'Access Denied'}
            </h2>

            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">
                {message || (dict.common as Record<string, unknown>)?.unauthorized_desc as string || "You don't have the required permissions to view this page or perform this action. Please contact your administrator if you believe this is an error."}
            </p>

            <button
                onClick={() => window.history.back()}
                className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors font-medium shadow-sm"
            >
                <ArrowLeft className="w-4 h-4 ml-[-2px]" />
                {(dict.common as Record<string, unknown>)?.go_back as string || 'Go Back'}
            </button>
        </div>
    );
}
