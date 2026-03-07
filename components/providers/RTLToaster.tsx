"use client";

import { Toaster } from 'sonner';
import { useLanguage } from '@/components/providers/LanguageProvider';

/**
 * RTLToaster — drop-in replacement for <Toaster> that passes the active
 * language direction to Sonner so toasts render correctly in RTL mode.
 */
export default function RTLToaster() {
    const { dir } = useLanguage();
    return (
        <Toaster
            position="top-center"
            richColors
            dir={dir}
        />
    );
}
