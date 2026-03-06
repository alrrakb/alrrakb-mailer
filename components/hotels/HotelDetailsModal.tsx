"use client";

import { useState } from 'react';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { X, MapPin, Globe, Mail, Phone, Printer, Star, Send, CheckSquare, Square, Check } from 'lucide-react';
import ComposeWindow from '@/components/email/ComposeWindow';

interface Hotel {
    id: string;
    name_ar?: string;
    name_en?: string;
    stars?: number;
    classification?: string;
    city?: string;
    website?: string;
    address?: string;
    address_ar?: string;
    address_en?: string;
    google_maps?: string;
    email_info?: string;
    email_reservation?: string;
    emails_extra?: { label?: string; label_ar?: string; label_en?: string; email: string }[];
    phone_main?: string;
    phone_reservation?: string;
    fax?: string;
}

interface HotelDetailsModalProps {
    hotel: Hotel;
    onClose: () => void;
}

export default function HotelDetailsModal({ hotel, onClose }: HotelDetailsModalProps) {
    const { dict, language } = useLanguage();

    // Bulk Email Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
    const [showCompose, setShowCompose] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);


    const toggleEmailSelection = (email: string) => {
        const newSelected = new Set(selectedEmails);
        if (newSelected.has(email)) {
            newSelected.delete(email);
        } else {
            newSelected.add(email);
        }
        setSelectedEmails(newSelected);
    };

    const handleStartCompose = () => {
        if (selectedEmails.size > 0) {
            setShowCompose(true);
        }
    };

    // If Compose is open, show it instead of details (or as overlay)
    if (showCompose) {
        return (
            <ComposeWindow
                isModal={true}
                initialRecipients={Array.from(selectedEmails)}
                onClose={() => setShowCompose(false)}
            />
        );
    }

    // Map Modal
    if (showMapModal) {
        return (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800 relative">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-indigo-600" />
                            {hotel.city}
                        </h3>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowMapModal(false)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    <iframe
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        src={`https://maps.google.com/maps?q=${encodeURIComponent(hotel.name_en + ' ' + (hotel.city || ''))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        allowFullScreen
                        className="w-full h-full bg-gray-100"
                    ></iframe>
                </div>
            </div>
        );
    }


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="bg-[#39285e] text-white p-4 md:p-6 flex items-start justify-between shrink-0">
                    <div>
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                            <h2 className="text-xl md:text-2xl font-bold">
                                {language === 'ar' ? hotel.name_ar : hotel.name_en}
                            </h2>
                            <div className="self-start md:self-auto flex items-center bg-yellow-400/20 px-2 py-0.5 rounded text-yellow-300 text-sm font-bold border border-yellow-400/30">
                                <Star className="w-4 h-4 mr-1 fill-yellow-300" />
                                {hotel.stars}
                            </div>
                        </div>
                        <p className="text-white/80 text-xs md:text-sm flex flex-wrap items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {hotel.city} {hotel.classification ? `• ${hotel.classification}` : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-6 md:p-8 bg-gray-50 dark:bg-gray-950">
                    <div className="grid md:grid-cols-2 gap-8">

                        {/* Basic Info & Location */}
                        <div className="space-y-6">
                            {/* Names */}
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                                    {dict.hotels.fields.name_en} / {dict.hotels.fields.name_ar}
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">{dict.hotels.fields.name_en}</label>
                                        <p className="font-medium text-lg">{hotel.name_en}</p>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">{dict.hotels.fields.name_ar}</label>
                                        <p className="font-english font-medium text-lg text-right" dir="rtl">{hotel.name_ar}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Location */}
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
                                <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {dict.hotels.location}
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs text-gray-400 block mb-1">{dict.hotels.fields.address}</label>
                                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                                            {language === 'ar' ? (hotel.address_ar || hotel.address_en || hotel.address || '-') : (hotel.address_en || hotel.address_ar || hotel.address || '-')}
                                        </p>
                                    </div>
                                    {hotel.website && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Globe className="w-4 h-4 text-gray-400" />
                                            <a href={`https://${hotel.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-full">
                                                {hotel.website}
                                            </a>
                                        </div>
                                    )}
                                    {hotel.google_maps && (
                                        <div>
                                            <button
                                                onClick={() => setShowMapModal(true)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                                            >
                                                <MapPin className="w-4 h-4" />
                                                {dict.hotels.fields.google_maps}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 h-full">
                                <h3 className="font-semibold text-gray-500 text-sm uppercase tracking-wider mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    {dict.hotels.contact_info}
                                </h3>

                                <div className="space-y-6">
                                    {/* Emails */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-[#39285e] dark:text-[#79bbe0] flex items-center gap-2">
                                                <Mail className="w-3.5 h-3.5" /> Emails
                                            </h4>

                                            {/* Selection Controls */}
                                            <div className="flex items-center gap-2">
                                                {isSelectionMode ? (
                                                    // Confirm Button
                                                    <button
                                                        onClick={handleStartCompose}
                                                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${selectedEmails.size > 0 ? 'bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                                    >
                                                        <Check className="w-4 h-4" />
                                                        {selectedEmails.size > 0 && <span>({selectedEmails.size})</span>}
                                                    </button>
                                                ) : (
                                                    // Start Selection Button
                                                    <button
                                                        onClick={() => setIsSelectionMode(true)}
                                                        className="p-1.5 hover:bg-indigo-50 text-[#39285e] rounded-lg transition-colors"
                                                        title="Select emails to message"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                )}

                                                {isSelectionMode && (
                                                    <button
                                                        onClick={() => {
                                                            setIsSelectionMode(false);
                                                            setSelectedEmails(new Set());
                                                        }}
                                                        className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid gap-3">
                                            {hotel.email_info && (
                                                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center justify-between group">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-500 mb-1">{dict.hotels.fields.email_info}</span>
                                                        <span className="font-mono text-sm select-all">{hotel.email_info}</span>
                                                    </div>
                                                    {isSelectionMode && (
                                                        <button
                                                            onClick={() => toggleEmailSelection(hotel.email_info!)}
                                                            className={`p-1 rounded transition-colors ${selectedEmails.has(hotel.email_info!) ? 'text-[#39285e]' : 'text-gray-300 hover:text-gray-400'}`}
                                                        >
                                                            {selectedEmails.has(hotel.email_info!) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {hotel.email_reservation && (
                                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-900/30">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-indigo-600 dark:text-indigo-400 mb-1 font-semibold">{dict.hotels.fields.email_reservation}</span>
                                                        <span className="font-mono text-sm select-all text-indigo-900 dark:text-indigo-200">{hotel.email_reservation}</span>
                                                    </div>
                                                    {isSelectionMode && (
                                                        <button
                                                            onClick={() => toggleEmailSelection(hotel.email_reservation!)}
                                                            className={`p-1 rounded transition-colors ${selectedEmails.has(hotel.email_reservation!) ? 'text-indigo-600' : 'text-indigo-200 hover:text-indigo-300'}`}
                                                        >
                                                            {selectedEmails.has(hotel.email_reservation!) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {hotel.emails_extra && Array.isArray(hotel.emails_extra) && hotel.emails_extra.map((extra, i) => (
                                                <div key={i} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-gray-500 mb-1">
                                                            {language === 'ar' ? (extra.label_ar || extra.label) : (extra.label_en || extra.label)}
                                                        </span>
                                                        <span className="font-mono text-sm select-all">{extra.email}</span>
                                                    </div>
                                                    {isSelectionMode && (
                                                        <button
                                                            onClick={() => toggleEmailSelection(extra.email)}
                                                            className={`p-1 rounded transition-colors ${selectedEmails.has(extra.email) ? 'text-[#39285e]' : 'text-gray-300 hover:text-gray-400'}`}
                                                        >
                                                            {selectedEmails.has(extra.email) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Phones */}
                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-sm font-bold text-[#39285e] dark:text-[#79bbe0] flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5" /> Phones
                                        </h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            {hotel.phone_main && (
                                                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                                    <span className="text-sm text-gray-500">{dict.hotels.fields.phone_main}</span>
                                                    <a href={`tel:${hotel.phone_main}`} className="font-mono font-medium dir-ltr text-blue-600 hover:underline" dir="ltr">{hotel.phone_main}</a>
                                                </div>
                                            )}
                                            {hotel.phone_reservation && (
                                                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors">
                                                    <span className="text-sm text-green-700">{dict.hotels.fields.phone_reservation}</span>
                                                    <a href={`tel:${hotel.phone_reservation}`} className="font-mono font-medium text-green-800 dir-ltr hover:underline" dir="ltr">{hotel.phone_reservation}</a>
                                                </div>
                                            )}
                                            {hotel.fax && (
                                                <div className="flex items-center justify-between p-3 border border-gray-100 rounded-lg text-gray-400">
                                                    <span className="text-sm flex items-center gap-2"><Printer className="w-3 h-3" /> {dict.hotels.fields.fax}</span>
                                                    <span className="font-mono dir-ltr" dir="ltr">{hotel.fax}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
}
