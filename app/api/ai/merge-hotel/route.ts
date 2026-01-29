import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { newHotel, existingHotel } = await req.json();

        // Deep Copy to avoid mutating original immediately
        const mergedHotel = { ...existingHotel };

        // 1. Update Scalar Fields
        // Fields to overwrite if new source has value
        const scalarFields = [
            'name_ar', 'name_en', 'stars', 'city', 'city_ar', 'city_en',
            'website', 'address', 'google_maps', 'phone_main', 'phone_reservation', 'fax'
        ];

        scalarFields.forEach(field => {
            // If new hotel has a value, update it
            // (Optional: Only update if existing is empty? User said "update if different", implying overwrite)
            // "if there is an update or change... update it"
            if (newHotel[field]) {
                mergedHotel[field] = newHotel[field];
            }
        });

        // 2. Smart Email Handling
        // "Keep existing main emails. If new one is different, add to extra."

        let extraEmails = Array.isArray(existingHotel.emails_extra) ? [...existingHotel.emails_extra] : [];

        // Helper to safely add to extra
        // Helper to safely add to extra
        const addToExtra = (item: { email: string; label?: string; label_ar?: string; label_en?: string }) => {
            if (!item.email) return;
            // Check if already in main fields (to avoid redundancy)
            if (item.email === mergedHotel.email_info || item.email === mergedHotel.email_reservation) return;

            // Check if already in extra
            const existingIndex = extraEmails.findIndex((e: any) => e.email === item.email);

            if (existingIndex > -1) {
                // Exists! Update labels if provided (and if existing is generic 'Extra')
                const existing = extraEmails[existingIndex];

                // If new item has specific labels, update the existing one
                if (item.label && item.label !== 'Extra') existing.label = item.label;
                if (item.label_ar) existing.label_ar = item.label_ar;
                if (item.label_en) existing.label_en = item.label_en;

                extraEmails[existingIndex] = existing;
            } else {
                // New! Add it
                extraEmails.push({
                    email: item.email,
                    label: item.label || 'Extra',
                    label_ar: item.label_ar,
                    label_en: item.label_en
                });
            }
        };

        // Check Info Email
        if (newHotel.email_info) {
            if (existingHotel.email_info && existingHotel.email_info !== newHotel.email_info) {
                // Different! Keep existing as main, move new to extra
                addToExtra({ email: newHotel.email_info, label: 'Imported Info', label_ar: 'معلومات مستوردة', label_en: 'Imported Info' });
            } else if (!existingHotel.email_info) {
                // Existing is empty, fair to take new as main
                mergedHotel.email_info = newHotel.email_info;
            }
        }

        // Check Reservation Email
        if (newHotel.email_reservation) {
            if (existingHotel.email_reservation && existingHotel.email_reservation !== newHotel.email_reservation) {
                // Different! Keep existing as main, move new to extra
                addToExtra({ email: newHotel.email_reservation, label: 'Imported Reservation', label_ar: 'حجوزات مستوردة', label_en: 'Imported Reservation' });
            } else if (!existingHotel.email_reservation) {
                // Existing is empty, fair to take new as main
                mergedHotel.email_reservation = newHotel.email_reservation;
            }
        }

        // 3. Merge Extra Emails from New Import
        if (Array.isArray(newHotel.emails_extra)) {
            newHotel.emails_extra.forEach((item: any) => {
                addToExtra(item);
            });
        }

        mergedHotel.emails_extra = extraEmails;

        return NextResponse.json({ mergedHotel });

    } catch (error: any) {
        console.error('Merge Logic Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
