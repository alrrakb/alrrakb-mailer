"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ar, en, Dictionary } from '@/lib/dictionaries';

type Language = 'en' | 'ar';

type LanguageContextType = {
    language: Language;
    dict: Dictionary;
    dir: 'ltr' | 'rtl';
    toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    dict: en,
    dir: 'ltr',
    toggleLanguage: () => { },
});

export const useLanguage = () => useContext(LanguageContext);

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        // Load from localStorage if available
        const savedLang = localStorage.getItem('app-language') as Language;
        if (savedLang) {
            setLanguage(savedLang);
        } else {
            // Default to Arabic if user prefers it strictly, otherwise English default ?
            // User requested Arabic support strong, but maybe default to AR? 
            // Let's stick to saved or default ('en') for now, and let them toggle. 
            // Wait, user said "Support multi-language... make everything Integrated and flowing". 
            // Let's check browser lang maybe? Safe bet is default EN unless toggled.
        }
    }, []);

    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'ar' : 'en';
        setLanguage(newLang);
        localStorage.setItem('app-language', newLang);
    };

    const value: LanguageContextType = {
        language,
        dict: language === 'en' ? en : ar,
        dir: language === 'en' ? 'ltr' : 'rtl',
        toggleLanguage,
    };

    return (
        <LanguageContext.Provider value={value}>
            <div dir={value.dir} className={language === 'ar' ? 'font-arabic' : 'font-sans'}>
                {children}
            </div>
        </LanguageContext.Provider>
    );
}
