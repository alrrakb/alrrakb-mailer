export interface SpamCheckResult {
    score: number;
    status: 'Safe' | 'Warning' | 'Spam';
    issues: string[];
}

// ─── Arabic Spam Trigger Words ───────────────────────────────────────────────
const ARABIC_SPAM_TRIGGER_WORDS = [
    "مجاني", "مجانًا", "مجانا",
    "خصم", "تخفيض",
    "مبروك", "تهانينا",
    "عاجل", "عاجلاً", "عاجلا",
    "اربح", "ربح",
    "عرض حصري", "عرض خاص",
    "فرصة ذهبية", "لا تفوّت",
    "جائزة", "فوز", "فائز",
    "استثمار", "ضاعف دخلك",
    "كسب المال", "دخل إضافي",
];

// ─── English Spam Trigger Words ──────────────────────────────────────────────
const SPAM_TRIGGER_WORDS = [
    // Financial/Money
    "$$$", "100%", "earn extra cash", "make money", "cash bonus", "double your income",
    "get paid", "earn $", "hidden assets", "investment decision", "no investment",
    "pennies a day", "pure profit", "save up to",
    // Urgency/Pressure
    "act now", "apply now", "call now", "click here", "do it today", "don't delete",
    "exclusive deal", "get it now", "immediately", "limited time", "order now",
    "take action", "urgent", "while supplies last",
    // Claims/Offers
    "free", "risk-free", "guarantee", "guaranteed", "no catch", "no hidden costs",
    "no strings attached", "promise you", "risk free", "satisfaction guaranteed",
    "trial", "unsolicited", "warranty", "you are a winner", "you have been selected",
    "winner", "winning", "discount",
    // General Marketing
    "amazing", "cancel at any time", "click below", "congratulations", "dear friend",
    "drastically reduced", "for only", "hidden", "increase sales", "lose weight",
    "luxury", "mass email", "miracle", "multi-level marketing", "obligation",
    "passwords", "pharmacy", "search engine", "stop snoring", "viagra",
    "profits",
];

/**
 * Strip basic HTML tags for length and basic metrics.
 */
function stripHtml(html: string): string {
    return html
        .replace(/<[^>]*>?/gm, ' ')           // remove tags
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Aggressive HTML, Entity, and Punctuation stripper strictly for Gibberish detection.
 */
function sanitizeForSpamCheck(htmlText: string): string {
    if (!htmlText) return '';
    // 1. Remove style/script tags AND their inner content entirely
    let text = htmlText.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, ' ');
    // 2. Replace all remaining HTML tags with a space
    text = text.replace(/<[^>]+>/g, ' ');
    // 3. Replace HTML entities (&nbsp;) and invisible zero-width unicode characters with a space
    text = text.replace(/&[a-z0-9#]+;|\u200B|\u200C|\u200D|\uFEFF/gi, ' ');
    // 4. Replace EVERYTHING that is not a letter (Arabic/English) or number with a space
    text = text.replace(/[^\p{L}\p{N}]/gu, ' ');
    // 5. Collapse multiple spaces into a single space
    return text.replace(/\s+/g, ' ').trim();
}

export function calculateSpamScore(subject: string, body: string): SpamCheckResult {
    let score = 100;
    const issues: string[] = [];

    const plainBody = stripHtml(body);
    const lowerSubject = subject.toLowerCase();
    const lowerBody = plainBody.toLowerCase();
    const combinedText = `${lowerSubject} ${lowerBody}`;

    // ── 1. English Spam Trigger Words (−5 per unique match, up to −30) ───────
    let enTriggered = 0;
    SPAM_TRIGGER_WORDS.forEach(word => {
        const regex = new RegExp(`\\b${word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'gi');
        if (regex.test(combinedText)) enTriggered++;
    });
    if (enTriggered > 0) {
        const deduct = Math.min(enTriggered * 5, 30);
        score -= deduct;
        issues.push(`Found ${enTriggered} spam trigger word(s) (-${deduct} pts).`);
    }

    // ── 2. Arabic Spam Trigger Words (−20 flat if any match) ─────────────────
    const arTriggered = ARABIC_SPAM_TRIGGER_WORDS.filter(w => combinedText.includes(w));
    if (arTriggered.length > 0) {
        score -= 20;
        issues.push(`Contains spam trigger words (-20 pts).`);
    }

    // ── 3. Excessive character repetition  e.g. "مجاااااني", "Freeeeee" ─────
    if (/(.)\1{4,}/u.test(combinedText)) {
        score -= 15;
        issues.push(`Contains excessive character repetition (-15 pts).`);
    }

    // ── 4. Subject Line Heuristics ────────────────────────────────────────────
    if (/[!?]{3,}/.test(subject) || /(\?\!|\!\?)/.test(subject)) {
        score -= 10;
        issues.push(`Subject contains excessive punctuation (-10 pts).`);
    }
    const englishWordChars = subject.replace(/[^a-zA-Z]/g, '');
    if (englishWordChars.length > 0 && englishWordChars === englishWordChars.toUpperCase()) {
        score -= 10;
        issues.push(`Subject is entirely uppercase (-10 pts).`);
    }
    if (/^(re|fwd|رد):\s*/i.test(subject.trim())) {
        score -= 15;
        issues.push(`Subject contains fake Re/Fwd prefix (-15 pts).`);
    }

    // ── 5. Link & Phishing Heuristics ─────────────────────────────────────────
    if (/bit\.ly|t\.co|tinyurl\.com|ow\.ly|is\.gd|buff\.ly|adf\.ly/i.test(body)) {
        score -= 20;
        issues.push(`Contains URL shorteners (-20 pts).`);
    }
    const linkMatch = body.match(/href=["'][^"']*["']|http[s]?:\/\/[^\s]+/gi);
    const linkCount = linkMatch ? linkMatch.length : 0;
    const wordCount = plainBody.split(/\s+/).length;
    if (linkCount > 3 && wordCount < 50) {
        score -= 15;
        issues.push(`High link-to-text ratio (-15 pts).`);
    }

    // ── 6. Psychological Urgency & Threat Detection ──────────────────────────
    const urgencyPatterns = [
        "سيتم إغلاق حسابك", "فرصة أخيرة", "خلال ٢٤ ساعة", "تحذير أمني",
        "urgent action required", "account suspended", "immediate action"
    ];
    let hasUrgency = false;
    urgencyPatterns.forEach(pattern => {
        if (new RegExp(pattern, 'i').test(combinedText)) {
            hasUrgency = true;
        }
    });
    if (hasUrgency) {
        score -= 20;
        issues.push(`Contains urgency or threat triggers (-20 pts).`);
    }

    // ── 6. Subject empty or too short ─────────────────────────────────────────
    if (!subject || subject.trim().length === 0) {
        score -= 20;
        issues.push(`Empty subject line (-20 pts).`);
    } else if (subject.trim().length < 10) {
        score -= 10;
        issues.push(`Subject is too short (less than 10 characters) (-10 pts).`);
    }

    // ── 7. Body too short (plain text) ────────────────────────────────────────
    if (plainBody.length < 20) {
        score -= 15;
        issues.push(`Email body text is too short (-15 pts).`);
    }

    // ── 8. Gibberish & Nonsense Detection ─────────────────────────────────────
    const cleanSubject = sanitizeForSpamCheck(subject);
    const cleanContent = sanitizeForSpamCheck(body);
    const fullyCleanedText = `${cleanSubject} ${cleanContent}`;

    let isGibberish = false;
    const extremeWords = fullyCleanedText.split(' ').filter(w => w.length > 40);
    if (extremeWords.length > 0) isGibberish = true;

    if (isGibberish) {
        score -= 25;
        issues.push(`Contains gibberish or meaningless text (-25 pts).`);
    }

    // ── Clamp score ────────────────────────────────────────────────────────────
    score = Math.max(0, Math.min(100, score));

    // ── Status ────────────────────────────────────────────────────────────────
    let status: 'Safe' | 'Warning' | 'Spam' = 'Safe';
    if (score < 50) {
        status = 'Spam';
    } else if (score <= 80) {
        status = 'Warning';
    }

    if (issues.length === 0) {
        issues.push(`Looking good! No major spam triggers detected.`);
    }

    return { score, status, issues };
}
