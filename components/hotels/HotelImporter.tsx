"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

import { Upload, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { getBilingualLabel } from '@/lib/hotel-helpers';

export default function HotelImporter({ onComplete }: { onComplete: () => void }) {
    const [loading, setLoading] = useState(false);
    const [isLocalhost, setIsLocalhost] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    }, []);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    if (!isLocalhost) return null;

    const parseAndImport = async () => {
        setLoading(true);
        setLogs([]);
        addLog('Starting Import Process...');

        try {
            // 1. Fetch Existing Hotels for Matching
            addLog('Fetching existing database...');
            const { data: existingHotels } = await supabase.from('hotels').select('*');
            addLog(`Found ${existingHotels?.length || 0} existing hotels.`);

            // 2. Fetch and Parse File
            addLog('Fetching hotels.txt...');
            const response = await fetch('/hotels.txt');
            const text = await response.text();

            addLog('Parsing file content...');
            // ... Parsing Logic (Keep existing logic mostly, just wrapping it) ...
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            const parsedHotels = [];
            let currentHotel: any = {};

            let isParsingEmails = false;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // 1. Detect Standard Keys (to break out of potential previous blocks)
                const isKey = (
                    /^\d+\./.test(line) ||
                    line.startsWith('التصنيف:') ||
                    line.startsWith('الموقع الإلكتروني:') ||
                    line.startsWith('العنوان:') ||
                    line.startsWith('خرائط جوجل:') ||
                    line.startsWith('رابط خرائط جوجل:') ||
                    line.startsWith('الإيميل الرسمي:') ||
                    line.startsWith('إيميل الحجوزات:') ||
                    line.startsWith('إيميلات إضافية:') ||
                    line.startsWith('الهاتف الرئيسي:') ||
                    line.startsWith('رقم الحجوزات:') ||
                    line.startsWith('الفاكس:')
                );

                if (isKey && !line.startsWith('إيميلات إضافية:')) {
                    isParsingEmails = false;
                }

                // 2. Start of Hotel
                if (/^\d+\./.test(line)) {
                    if (currentHotel.name_ar) parsedHotels.push(currentHotel);
                    currentHotel = { city: 'Riyadh', emails_extra: [] }; // Default city fallback, but parsed values will override
                    const namePart = line.replace(/^\d+\.\s*/, '');
                    const match = namePart.match(/(.*?)\s*\((.*?)\)$/);
                    if (match) {
                        currentHotel.name_ar = match[1].trim();
                        currentHotel.name_en = match[2].trim();
                    } else {
                        currentHotel.name_ar = namePart;
                        currentHotel.name_en = namePart;
                    }
                    continue;
                }

                // 3. Handle Extra Emails Block
                if (line.startsWith('إيميلات إضافية:')) {
                    isParsingEmails = true;
                    const content = line.split(':')[1]?.trim();
                    if (content) {
                        // Handle "Email | Email" or single email on the same line
                        const emails = content.split('|').map(e => e.trim()).filter(e => e);
                        emails.forEach(e => {
                            if (e.includes('@')) {
                                const labels = getBilingualLabel('Extra');
                                currentHotel.emails_extra.push({
                                    label: 'Extra',
                                    label_ar: labels.ar,
                                    label_en: labels.en,
                                    email: e
                                });
                            }
                        });
                    }
                    continue;
                }

                // 4. Parse Lines inside Email Block
                if (isParsingEmails) {
                    if (line.includes('@')) {
                        // Try to parse "Label: email"
                        const parts = line.split(':');
                        if (parts.length > 1) {
                            const rawLabel = parts[0].trim();
                            const email = parts.slice(1).join(':').trim();
                            const labels = getBilingualLabel(rawLabel);

                            currentHotel.emails_extra.push({
                                label: rawLabel,
                                label_ar: labels.ar,
                                label_en: labels.en,
                                email
                            });
                        } else {
                            // Just an email
                            const labels = getBilingualLabel('Extra');
                            currentHotel.emails_extra.push({
                                label: 'Extra',
                                label_ar: labels.ar,
                                label_en: labels.en,
                                email: line.trim()
                            });
                        }
                    }
                    continue;
                }

                // 5. Normal Fields
                if (line.startsWith('التصنيف:')) { const stars = line.match(/\d+/); if (stars) currentHotel.stars = parseInt(stars[0]); }
                else if (line.startsWith('المدينة بالعربي:')) currentHotel.city_ar = line.split(':')[1].trim();
                else if (line.startsWith('المدينة بالإنجليزي:')) currentHotel.city_en = line.split(':')[1].trim();
                else if (line.startsWith('الموقع الإلكتروني:')) {
                    // Fix: Handle https:// links by joining all parts after the first colon
                    const site = line.split(':').slice(1).join(':').trim();
                    if (site) currentHotel.website = site;
                }
                else if (line.startsWith('العنوان بالعربي:')) currentHotel.address_ar = line.split(':')[1].trim();
                else if (line.startsWith('العنوان بالإنجليزي:')) currentHotel.address_en = line.split(':')[1].trim();
                else if (line.startsWith('العنوان:')) {
                    // Fallback for old format
                    const addr = line.split(':')[1].trim();
                    currentHotel.address = addr;
                    if (!currentHotel.address_ar) currentHotel.address_ar = addr;
                    if (!currentHotel.address_en) currentHotel.address_en = addr;
                }
                else if (line.startsWith('خرائط جوجل:') || line.startsWith('رابط خرائط جوجل:')) {
                    // Support both labels
                    const label = line.startsWith('خرائط جوجل:') ? 'خرائط جوجل:' : 'رابط خرائط جوجل:';
                    currentHotel.google_maps = line.replace(label, '').trim();
                }
                else if (line.startsWith('الإيميل الرسمي:')) currentHotel.email_info = line.split(':')[1].trim();
                else if (line.startsWith('إيميل الحجوزات:')) currentHotel.email_reservation = line.split(':')[1].trim();
                else if (line.startsWith('الهاتف الرئيسي:')) currentHotel.phone_main = line.split(':')[1].trim();
                else if (line.startsWith('رقم الحجوزات:')) currentHotel.phone_reservation = line.split(':')[1].trim();
                else if (line.startsWith('الفاكس:')) {
                    const faxVal = line.split(':')[1]?.trim();
                    if (faxVal) currentHotel.fax = faxVal;
                }
            }
            if (currentHotel.name_ar) parsedHotels.push(currentHotel);

            addLog(`Parsed ${parsedHotels.length} hotels from file.`);

            // 3. Process Each Hotel (Match -> AI Merge -> Update/Insert)
            for (const newHotel of parsedHotels) {
                // Find Match (Normalize names for comparison)
                const match = existingHotels?.find(h =>
                    h.name_en?.toLowerCase().includes(newHotel.name_en?.toLowerCase()) ||
                    h.name_ar?.includes(newHotel.name_ar)
                );

                if (match) {
                    addLog(`Match found for "${newHotel.name_en}". Checking for updates...`);

                    // Small delay to be safe
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const res = await fetch('/api/ai/merge-hotel', {
                        method: 'POST',
                        body: JSON.stringify({ newHotel, existingHotel: match })
                    });

                    const aiData = await res.json();

                    if (aiData.mergedHotel) {
                        const { error } = await supabase
                            .from('hotels')
                            .update(aiData.mergedHotel)
                            .eq('id', match.id);

                        if (error) addLog(`❌ Error updating ${newHotel.name_en}: ${error.message}`);
                        else addLog(`✅ Updated ${newHotel.name_en}`);
                    } else {
                        addLog(`⚠️ AI failed for ${newHotel.name_en}: ${aiData.error}`);
                    }

                } else {
                    addLog(`New Hotel: "${newHotel.name_en}". Inserting...`);
                    const { error } = await supabase.from('hotels').insert(newHotel);
                    if (error) addLog(`❌ Error inserting ${newHotel.name_en}: ${error.message}`);
                    else addLog(`✅ Inserted ${newHotel.name_en}`);
                }
            }

            addLog('Done!');
            setTimeout(onComplete, 2000);

        } catch (e: any) {
            addLog('Critical Error: ' + e.message);
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-900 border border-indigo-100 rounded-xl p-6 mb-8 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Import Hotels Data
            </h3>
            <p className="text-sm text-gray-500 mb-4">
                Reads from <code>public/hotels.txt</code> and inserts into database.
            </p>

            <div className="flex items-center gap-4">
                <button
                    onClick={parseAndImport}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    {loading ? 'Processing...' : 'Run Smart Import'}
                </button>
            </div>
            {logs.length > 0 && (
                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs font-mono max-h-40 overflow-y-auto border border-gray-100 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                    {logs.map((log, i) => <div key={i}>{log}</div>)}
                </div>
            )}
        </div>
    );
}
