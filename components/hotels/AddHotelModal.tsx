"use client";

import { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getBilingualLabel } from '@/lib/hotel-helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';

interface AddHotelModalProps {
    onClose: () => void;
    onSuccess: () => void;
    hotelToEdit?: any; // Start with 'any' since we haven't strictly typed the Supabase row here yet
}

type ExtraEmail = {
    label: string;
    email: string;
};

type FormData = {
    name_ar: string;
    name_en: string;
    stars: number;
    city_en: string;
    city_ar: string;
    city?: string;
    classification: string;
    website: string;
    address_ar: string;
    address_en: string; // New field
    address?: string; // Optional legacy
    google_maps: string;
    email_info: string;
    email_reservation: string;
    phone_main: string;
    phone_reservation: string;
    fax: string;
    emails_extra: ExtraEmail[];
};

export default function AddHotelModal({ onClose, onSuccess, hotelToEdit }: AddHotelModalProps) {
    const { dict, language, dir } = useLanguage();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { control, register, handleSubmit, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            name_ar: hotelToEdit?.name_ar || '',
            name_en: hotelToEdit?.name_en || '',
            stars: hotelToEdit?.stars || 5,
            city_en: hotelToEdit?.city_en || '',
            city_ar: hotelToEdit?.city_ar || '',
            classification: hotelToEdit?.classification || '',
            website: hotelToEdit?.website || '',
            address_ar: hotelToEdit?.address_ar || hotelToEdit?.address || '',
            address_en: hotelToEdit?.address_en || hotelToEdit?.address || '',
            google_maps: hotelToEdit?.google_maps || '',
            email_info: hotelToEdit?.email_info || '',
            email_reservation: hotelToEdit?.email_reservation || '',
            phone_main: hotelToEdit?.phone_main || '',
            phone_reservation: hotelToEdit?.phone_reservation || '',
            fax: hotelToEdit?.fax || '',
            emails_extra: hotelToEdit?.emails_extra || []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "emails_extra"
    });


    // ...

    const onSubmit = async (data: FormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            // Process Extra Emails for Bilingual Labels
            const processedExtraEmails = data.emails_extra.map(email => {
                const labels = getBilingualLabel(email.label);
                return {
                    ...email,
                    label_ar: labels.ar,
                    label_en: labels.en
                };
            });

            const payload = { ...data, emails_extra: processedExtraEmails };

            if (hotelToEdit) {
                // Update Logic
                const { error: updateError } = await supabase
                    .from('hotels')
                    .update(payload)
                    .eq('id', hotelToEdit.id);


                if (updateError) throw updateError;
            } else {
                // Create Logic
                const { error: insertError } = await supabase
                    .from('hotels')
                    .insert([payload]);

                if (insertError) throw insertError;
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save hotel');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-800">

                {/* Header */}
                <div className="bg-[#39285e] text-white p-6 flex items-center justify-between shrink-0 rounded-t-2xl">
                    <h2 className="text-xl font-bold">
                        {hotelToEdit ? dict.hotels.edit_hotel : dict.hotels.add_hotel}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-4 md:p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Section: Basic Info */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 mb-4">{dict.hotels.basic_info}</h3>

                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.name_en}</label>
                                <input {...register('name_en', { required: true })} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="e.g. Mandarin Oriental" dir="ltr" />
                                {errors.name_en && <span className="text-red-500 text-xs">Required</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.name_ar}</label>
                                <input {...register('name_ar', { required: true })} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="مثال: ماندارين أورينتال" dir="rtl" />
                                {errors.name_ar && <span className="text-red-500 text-xs">Required</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.city_en}</label>
                                <input {...register('city_en', { required: true })} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="Riyadh" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.city_ar}</label>
                                <input {...register('city_ar', { required: true })} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="الرياض" dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.stars}</label>
                                <input type="number" {...register('stars', { valueAsNumber: true })} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" min="1" max="7" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.classification}</label>
                                <input {...register('classification')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" placeholder="e.g. Luxury, Business" />
                            </div>
                        </div>

                        {/* Section: Contact & Location */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 border-b pb-2 mb-4">{dict.hotels.contact_info}</h3>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{dict.hotels.fields.phone_main}</label>
                                    <input {...register('phone_main')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" dir="ltr" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{dict.hotels.fields.phone_reservation}</label>
                                    <input {...register('phone_reservation')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" dir="ltr" />
                                </div>
                            </div>

                            {/* Fax Field Added */}
                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.fax}</label>
                                <input {...register('fax')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" dir="ltr" placeholder="+966..." />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.email_info}</label>
                                <input type="email" {...register('email_info')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" dir="ltr" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.email_reservation}</label>
                                <input type="email" {...register('email_reservation')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" dir="ltr" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">{dict.hotels.fields.website}</label>
                                <input {...register('website')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" dir="ltr" />
                            </div>
                        </div>

                        {/* Full Width: Location Detail */}
                        <div className="md:col-span-2 space-y-4 border-t pt-4">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-1">{dict.hotels.fields.address} (EN)</label>
                                    <textarea {...register('address_en')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" rows={2} dir="ltr" placeholder="Address in English" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{dict.hotels.fields.address} (AR)</label>
                                    <textarea {...register('address_ar')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" rows={2} dir="rtl" placeholder="العنوان بالعربي" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">{dict.hotels.fields.google_maps}</label>
                                    <input {...register('google_maps')} className="input-field w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700" dir="ltr" placeholder="https://maps.google.com/..." />
                                </div>
                            </div>
                        </div>

                        {/* Extra Emails (Dynamic) */}
                        <div className="md:col-span-2 space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{dict.hotels.emails_extra}</h3>
                                <button
                                    type="button"
                                    onClick={() => append({ label: '', email: '' })}
                                    className="text-sm text-[#39285e] dark:text-[#79bbe0] flex items-center gap-1 hover:underline font-medium"
                                >
                                    <Plus className="w-4 h-4" /> {dict.hotels.add_email_btn}
                                </button>
                            </div>

                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-4 items-start">
                                    <div className="flex-1">
                                        <input
                                            {...register(`emails_extra.${index}.label` as const, { required: true })}
                                            placeholder="Label (e.g. Spa)"
                                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                                        />
                                    </div>
                                    <div className="flex-[2]">
                                        <input
                                            {...register(`emails_extra.${index}.email` as const, { required: true })}
                                            placeholder="Email Address"
                                            className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm"
                                            dir="ltr"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => remove(index)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            {dict.common.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl bg-[#39285e] text-white font-medium hover:bg-[#2d1f4b] transition-colors shadow-lg shadow-[#39285e]/20 flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {dict.common.loading}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {hotelToEdit ? dict.common.save : dict.common.save}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
