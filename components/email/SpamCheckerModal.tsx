import React from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface SpamCheckerModalProps {
    isOpen: boolean;
    onClose: () => void;
    score: number;
    status: 'Safe' | 'Warning' | 'Spam';
    issues: string[];
}

/**
 * Translate a single spam checker issue string to Arabic.
 * Extracts the point deduction dynamically so the Arabic text stays accurate
 * even if point values change in the checker logic.
 */
function translateSpamIssue(issue: string): string {
    // Helper: extract "(−N pts)" suffix from string, e.g. "(-15 pts)." → "(-15 نقطة)."
    const pts = (match: RegExpMatchArray | null) =>
        match ? `(${match[1]} نقطة).` : '.';

    type Rule = [RegExp, (m: RegExpMatchArray) => string];

    const rules: Rule[] = [
        // "Found N spam trigger word(s) (-X pts)."
        [
            /Found (\d+) spam trigger word\(s\) \(-(\d+) pts\)\./,
            (m) => `تم العثور على ${m[1]} كلمة/كلمات تصنّف كبريد مزعج (-${m[2]} نقطة).`,
        ],
        // "Subject contains words in ALL CAPS (-10 pts)."
        [
            /Subject contains words in ALL CAPS \(-(\d+) pts\)\./,
            (m) => `الموضوع يحتوي على كلمات بأحرف كبيرة ${pts(m)}`
        ],
        // "Excessive exclamation marks in subject (-10 pts)."
        [
            /Excessive exclamation marks in subject \(-(\d+) pts\)\./,
            (m) => `علامات تعجب مفرطة في سطر الموضوع ${pts(m)}`
        ],
        // "Excessive exclamation marks in body (-5 pts)."
        [
            /Excessive exclamation marks in body \(-(\d+) pts\)\./,
            (m) => `علامات تعجب مفرطة في نص الرسالة ${pts(m)}`
        ],
        // "Empty subject line (-20 pts)."
        [
            /Empty subject line \(-(\d+) pts\)\./,
            (m) => `سطر الموضوع فارغ ${pts(m)}`
        ],
        // "Subject is too short (less than 10 characters) (-10 pts)."
        [
            /Subject is too short \([^)]+\) \(-(\d+) pts\)\./,
            (m) => `الموضوع قصير جداً (أقل من 10 أحرف) ${pts(m)}`
        ],
        // "Email body text is too short (-15 pts)."
        [
            /Email body text is too short \(-(\d+) pts\)\./,
            (m) => `نص البريد الإلكتروني قصير جداً ${pts(m)}`
        ],
        // "Contains spam trigger words (-20 pts)."
        [
            /Contains spam trigger words \(-(\d+) pts\)\./,
            (m) => `يحتوي على كلمات تصنّف كبريد مزعج ${pts(m)}`
        ],
        // "Contains excessive character repetition (-15 pts)."
        [
            /Contains excessive character repetition \(-(\d+) pts\)\./,
            (m) => `يحتوي على تكرار مبالغ فيه للحروف ${pts(m)}`
        ],
        // "Contains gibberish or meaningless text (-25 pts)."
        [
            /Contains gibberish or meaningless text \(-(\d+) pts\)\./,
            (m) => `يحتوي على نص غير مفهوم أو حروف عشوائية ${pts(m)}`
        ],
        // "Subject contains excessive punctuation (-10 pts)."
        [
            /Subject contains excessive punctuation \(-(\d+) pts\)\./,
            (m) => `عنوان الرسالة يحتوي على علامات ترقيم مبالغ فيها ${pts(m)}`
        ],
        // "Subject is entirely uppercase (-10 pts)."
        [
            /Subject is entirely uppercase \(-(\d+) pts\)\./,
            (m) => `عنوان الرسالة مكتوب بأحرف كبيرة فقط ${pts(m)}`
        ],
        // "Subject contains fake Re/Fwd prefix (-15 pts)."
        [
            /Subject contains fake Re\/Fwd prefix \(-(\d+) pts\)\./,
            (m) => `عنوان الرسالة يحتوي على بادئة رد وهمية ${pts(m)}`
        ],
        // "Contains URL shorteners (-20 pts)."
        [
            /Contains URL shorteners \(-(\d+) pts\)\./,
            (m) => `يحتوي على روابط مختصرة مشبوهة ${pts(m)}`
        ],
        // "High link-to-text ratio (-15 pts)."
        [
            /High link-to-text ratio \(-(\d+) pts\)\./,
            (m) => `عدد الروابط مبالغ فيه مقارنة بحجم النص ${pts(m)}`
        ],
        // "Contains urgency or threat triggers (-20 pts)."
        [
            /Contains urgency or threat triggers \(-(\d+) pts\)\./,
            (m) => `يحتوي على كلمات تهديد أو استعجال نفسي ${pts(m)}`
        ],
        // "Looking good! No major spam triggers detected."
        [
            /Looking good!/,
            () => 'ممتاز! لا توجد مشكلات واضحة تؤثر على تصنيف الرسالة.',
        ],
    ];

    for (const [pattern, builder] of rules) {
        const m = issue.match(pattern);
        if (m) return builder(m);
    }

    // Fallback: return original string untranslated
    return issue;
}

export default function SpamCheckerModal({ isOpen, onClose, score, status, issues }: SpamCheckerModalProps) {
    const { dict, dir } = useLanguage();
    const s = dict.spam;

    if (!isOpen) return null;

    let statusColor = "text-green-600 dark:text-green-400";
    let bgColor = "bg-green-100 dark:bg-green-900/40";
    let Icon = CheckCircle;
    const statusLabel = status === 'Safe' ? s.status_safe : status === 'Warning' ? s.status_warning : s.status_spam;

    if (status === 'Warning') {
        statusColor = "text-yellow-600 dark:text-yellow-400";
        bgColor = "bg-yellow-100 dark:bg-yellow-900/40";
        Icon = Info;
    } else if (status === 'Spam') {
        statusColor = "text-red-600 dark:text-red-400";
        bgColor = "bg-red-100 dark:bg-red-900/40";
        Icon = AlertTriangle;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" dir={dir}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{s.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{s.subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Score Overview */}
                    <div className="text-center space-y-3">
                        <div className="inline-flex flex-col items-center justify-center relative">
                            <svg className="w-32 h-32" viewBox="0 0 36 36">
                                <path
                                    className="text-gray-200 dark:text-gray-700"
                                    strokeWidth="3"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                    className={statusColor.split(' ')[0]}
                                    strokeWidth="3"
                                    strokeDasharray={`${score}, 100`}
                                    strokeLinecap="round"
                                    stroke="currentColor"
                                    fill="none"
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className={`text-3xl font-bold ${statusColor}`}>{score}</span>
                                <span className="text-xs text-gray-400 font-medium">/ 100</span>
                            </div>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm ${bgColor} ${statusColor}`}>
                            <Icon className="w-4 h-4" />
                            {statusLabel}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${status === 'Safe' ? 'bg-green-500' : status === 'Warning' ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${score}%` }}></div>
                    </div>

                    {/* Issues List */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">{s.analysis_results}</h4>
                        <div className="space-y-2">
                            {issues.map((issue, idx) => (
                                <div key={idx} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                                    {status === 'Safe' ? (
                                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className={`w-5 h-5 ${issue.includes('-') ? 'text-red-500' : 'text-yellow-500'} shrink-0 mt-0.5`} />
                                    )}
                                    <p className="text-sm text-gray-700 dark:text-gray-300">{dir === 'rtl' ? translateSpamIssue(issue) : issue}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-600/20"
                    >
                        {s.got_it}
                    </button>
                </div>
            </div>
        </div>
    );
}
