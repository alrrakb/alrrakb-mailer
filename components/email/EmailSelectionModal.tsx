"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { X, Search, Check, Building2, Loader2, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

interface EmailSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (emails: string[]) => void;
    currentRecipients?: string[];
}

interface Hotel {
    id: string;
    name_en?: string;
    name_ar?: string;
    email_info?: string;
    email_reservation?: string;
    emails_extra?: { email: string }[] | null;
}

export default function EmailSelectionModal({ isOpen, onClose, onSelect }: EmailSelectionModalProps) {
    const { language } = useLanguage();
    const [hotels, setHotels] = useState<Hotel[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchHotels();
            // Parse current recipients to pre-select or exclude? 
            // User probably wants to ADD, so we can check pre-existing.
            // For now let's just keep track of what we want to ADD uniquely.
        }
    }, [isOpen]);

    const fetchHotels = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('hotels')
                .select('id, name_en, name_ar, email_info, email_reservation, emails_extra')
                .eq('bounced', false)
                .order('name_en');

            if (error) {
                console.error("Supabase Error Modal:", JSON.stringify(error, null, 2));
                throw error;
            }
            setHotels(data || []);
        } catch (error: unknown) {
            console.error('Error fetching hotels in modal:', error instanceof Error ? error.message : error);
            try { console.error('Full modal error:', JSON.stringify(error)); } catch (_e) { }
            toast.error("Failed to load hotels");
        } finally {
            setLoading(false);
        }
    };

    // Filter hotels based on search
    const filteredHotels = hotels.filter(h =>
        (h.name_en?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.name_ar?.includes(searchQuery)) ||
        (h.email_info?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.email_reservation?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Get all valid emails from a hotel object
    const getHotelEmails = (hotel: Hotel) => {
        const primaryEmails = [hotel.email_info, hotel.email_reservation].filter((e): e is string => !!e && e.trim() !== '');

        let extraEmails: string[] = [];
        if (Array.isArray(hotel.emails_extra)) {
            extraEmails = hotel.emails_extra.map((item) => item.email).filter((e) => !!e && e.trim() !== '');
        }

        return Array.from(new Set([...primaryEmails, ...extraEmails]));
    };

    const toggleEmail = (email: string) => {
        const newSet = new Set(selectedEmails);
        if (newSet.has(email)) newSet.delete(email);
        else newSet.add(email);
        setSelectedEmails(newSet);
    };

    const toggleAll = () => {
        const allVisibleEmails = filteredHotels.flatMap(h => getHotelEmails(h));
        const allSelected = allVisibleEmails.every(e => selectedEmails.has(e));

        const newSet = new Set(selectedEmails);
        if (allSelected) {
            allVisibleEmails.forEach(e => newSet.delete(e));
        } else {
            allVisibleEmails.forEach(e => newSet.add(e));
        }
        setSelectedEmails(newSet);
    };

    const handleConfirm = () => {
        onSelect(Array.from(selectedEmails));
        onClose();
        setSelectedEmails(new Set());
    };

    if (!isOpen || !mounted) return null;

    const isRtl = language === 'ar';

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[85vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-[#39285e] text-white rounded-t-2xl">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[#79bbe0]" />
                        {isRtl ? 'اختيار إيميلات الفنادق' : 'Select Hotel Emails'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Toolbar */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 rtl:right-3 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={isRtl ? 'بحث عن فندق...' : 'Search hotels...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 rtl:pr-9 rtl:pl-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-[#79bbe0] outline-none text-sm dark:text-white"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={toggleAll}
                            className="text-sm font-medium text-[#39285e] dark:text-[#79bbe0] flex items-center gap-2 hover:underline"
                        >
                            <CheckSquare className="w-4 h-4" />
                            {isRtl ? 'تحديد الكل' : 'Select All Filtered'}
                        </button>
                        <span className="text-xs text-gray-500">
                            {selectedEmails.size} {isRtl ? 'تم تحديده' : 'emails selected'}
                        </span>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#39285e] dark:text-[#79bbe0]" />
                        </div>
                    ) : filteredHotels.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            {isRtl ? 'لا توجد نتائج' : 'No hotels found'}
                        </div>
                    ) : (
                        filteredHotels.map(hotel => {
                            const emails = getHotelEmails(hotel);
                            if (emails.length === 0) return null;

                            return (
                                <div key={hotel.id} className="bg-white dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-lg p-3 hover:border-[#79bbe0] transition-colors">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                                                {language === 'ar' ? hotel.name_ar : hotel.name_en}
                                            </h4>
                                            <p className="text-xs text-gray-500">
                                                {language === 'ar' ? hotel.name_en : hotel.name_ar}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {emails.map(email => (
                                            <label key={email} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer group">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${selectedEmails.has(email) ? 'bg-[#39285e] border-[#39285e]' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'}`}>
                                                    {selectedEmails.has(email) && <Check className="w-3 h-3 text-white" />}
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    className="hidden"
                                                    checked={selectedEmails.has(email)}
                                                    onChange={() => toggleEmail(email)}
                                                />
                                                <span className="text-xs font-mono text-gray-600 dark:text-gray-300 group-hover:text-[#39285e] dark:group-hover:text-[#79bbe0] break-all" dir="ltr">
                                                    {email}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        {isRtl ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedEmails.size === 0}
                        className="px-6 py-2 bg-[#39285e] text-white font-bold rounded-lg hover:bg-[#2d1f4b] transition-colors shadow-lg shadow-[#39285e]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isRtl ? `إضافة (${selectedEmails.size})` : `Add Selected (${selectedEmails.size})`}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
