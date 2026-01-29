// Translation Dictionary for Common Hotel Email Labels
export const TRANSLATION_MAP: Record<string, { ar: string, en: string }> = {
    'sales': { ar: 'المبيعات', en: 'Sales' },
    'sale': { ar: 'المبيعات', en: 'Sales' },
    'leads': { ar: 'المتابعة', en: 'Leads' },
    'lead': { ar: 'المتابعة', en: 'Leads' },
    'reservation': { ar: 'الحجوزات', en: 'Reservations' },
    'reservations': { ar: 'الحجوزات', en: 'Reservations' },
    'booking': { ar: 'الحجوزات', en: 'Booking' },
    'bookings': { ar: 'الحجوزات', en: 'Booking' },
    'info': { ar: 'معلومات', en: 'Info' },
    'information': { ar: 'معلومات', en: 'Information' },
    'general': { ar: 'عام', en: 'General' },
    'management': { ar: 'الإدارة', en: 'Management' },
    'manager': { ar: 'المدير', en: 'Manager' },
    'gm': { ar: 'المدير العام', en: 'General Manager' },
    'hr': { ar: 'الموارد البشرية', en: 'HR' },
    'human resources': { ar: 'الموارد البشرية', en: 'Human Resources' },
    'accounting': { ar: 'المحاسبة', en: 'Accounting' },
    'finance': { ar: 'المالية', en: 'Finance' },
    'events': { ar: 'الفعاليات', en: 'Events' },
    'banquet': { ar: 'الحفلات', en: 'Banquet' },
    'groups': { ar: 'المجموعات', en: 'Groups' },
    'privacy': { ar: 'خصوصية البيانات', en: 'Data Privacy' },
    'gift cards': { ar: 'بطاقات الهدايا', en: 'Gift Cards' },
    'spa': { ar: 'المنتجع الصحي', en: 'Spa' },
    'pr': { ar: 'العلاقات العامة', en: 'Public Relations' },
    'public relations': { ar: 'العلاقات العامة', en: 'Public Relations' },

    // Arabic Keys
    'مبيعات': { ar: 'المبيعات', en: 'Sales' },
    'المبيعات': { ar: 'المبيعات', en: 'Sales' },
    'متابعة': { ar: 'المتابعة', en: 'Leads' },
    'المتابعة': { ar: 'المتابعة', en: 'Leads' },
    'حجوزات': { ar: 'الحجوزات', en: 'Reservations' },
    'الحجوزات': { ar: 'الحجوزات', en: 'Reservations' },
    'عام': { ar: 'عام', en: 'General' },
    'ادارة': { ar: 'الإدارة', en: 'Management' },
    'إدارة': { ar: 'الإدارة', en: 'Management' },
    'فعاليات': { ar: 'الفعاليات', en: 'Events' },
    'الفعاليات': { ar: 'الفعاليات', en: 'Events' },
    'مجموعات': { ar: 'المجموعات', en: 'Groups' },
    'المجموعات': { ar: 'المجموعات', en: 'Groups' },
    'خصوصية': { ar: 'خصوصية البيانات', en: 'Data Privacy' },
    'خصوصية البيانات': { ar: 'خصوصية البيانات', en: 'Data Privacy' },
    'هدايا': { ar: 'بطاقات الهدايا', en: 'Gift Cards' },
    'بطاقات الهدايا': { ar: 'بطاقات الهدايا', en: 'Gift Cards' },
    'سبا': { ar: 'المنتجع الصحي', en: 'Spa' },
    'المنتجع الصحي': { ar: 'المنتجع الصحي', en: 'Spa' },
    'علاقات عامة': { ar: 'العلاقات العامة', en: 'Public Relations' },
    'العلاقات العامة': { ar: 'العلاقات العامة', en: 'Public Relations' },
    'إضافي': { ar: 'إضافي', en: 'Additional' },
    'اضافي': { ar: 'إضافي', en: 'Additional' },
    'additional': { ar: 'إضافي', en: 'Additional' },
    'extra': { ar: 'إضافي', en: 'Additional' },
    'ايميل المجموعة': { ar: 'المجموعات', en: 'Groups' },
    'المجموعة': { ar: 'المجموعات', en: 'Groups' },
};

export const getBilingualLabel = (rawLabel: string) => {
    if (!rawLabel) return { ar: '', en: '' };

    const cleanLabel = rawLabel.toLowerCase().replace(/email|:/gi, '').trim();

    // Check Dictionary
    for (const key in TRANSLATION_MAP) {
        if (cleanLabel.includes(key) || cleanLabel === key) {
            return TRANSLATION_MAP[key];
        }
    }

    // Fallback: Detect Language
    const isArabic = /[\u0600-\u06FF]/.test(rawLabel);
    return {
        ar: isArabic ? rawLabel : rawLabel, // Best effort: keep original if no translation
        en: isArabic ? rawLabel : rawLabel  // Best effort: keep original if no translation
    };
};
