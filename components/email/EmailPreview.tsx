import { X, Eye, FileText } from 'lucide-react';
import { getBaseEmailHtml } from '@/lib/email-templates';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface EmailPreviewProps {
    content: string;
    subject: string;
    isOpen: boolean;
    onClose: () => void;
    showDate: boolean;
}

export default function EmailPreview({ content, subject, isOpen, onClose, showDate }: EmailPreviewProps) {
    const { dict, dir } = useLanguage();
    if (!isOpen) return null;

    const html = getBaseEmailHtml(content, subject, showDate);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                                {subject || dict.compose.preview_title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {dict.compose.preview_mode}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-0">
                    <div className="p-5">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                            <FileText className="w-3 h-3" />
                            {dict.compose.content_preview}
                        </h4>
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white shadow-sm">
                            <iframe
                                srcDoc={html}
                                className="w-full min-h-[500px] border-none bg-white block"
                                title="Email Preview"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
