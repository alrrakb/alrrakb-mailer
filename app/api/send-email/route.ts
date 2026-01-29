
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabase } from '@/lib/supabase'; // NOTE: This might be the ANON client. We need Service Role for safe logging or ensure RLS allows logic.
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getBaseEmailHtml } from '@/lib/email-templates';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { recipients, subject, content, attachments, senderEmail, showDate } = body;

        if (!subject || !content) {
            return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
        }

        // Use SERVICE ROLE key for logging to ensure we can write to sent_logs ignoring RLS if needed,
        // and to be sure we can write 'sender_email' which might be protected.
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Determine Sender
        // If senderEmail is provided (from authenticated frontend), use it.
        // Otherwise fallback to env var (legacy behavior)
        const actualSenderEmail = senderEmail || process.env.SMTP_FROM_EMAIL;

        console.log(`Sending email from: ${actualSenderEmail}`);

        // Fetch SMTP Password AND Profile Name from Settings/Profiles
        // 1. Get Password
        const { data: settingsData } = await supabaseAdmin
            .from('settings')
            .select('value')
            .eq('key', 'smtp_password')
            .single();

        const smtpPassword = settingsData?.value || process.env.SMTP_PASS;

        if (!smtpPassword) {
            console.error('Missing SMTP Password');
            return NextResponse.json({ error: 'SMTP Configuration Missing' }, { status: 500 });
        }


        console.log(`Authenticating SMTP as: ${actualSenderEmail}`);
        console.log(`Password length: ${smtpPassword.length}, First char: ${smtpPassword[0]}, Last char: ${smtpPassword[smtpPassword.length - 1]}`);

        // 2. Get User Name (Profile)
        let senderName = "TALAE ALRRAKB"; // Default

        if (actualSenderEmail !== process.env.SMTP_FROM_EMAIL) {
            // Find user by email to get their ID, then get profile
            // Since we don't have direct email->profile link without ID, we first find the user ID from auth.users (admin only)
            const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
            const user = users.find(u => (u.email as string).toLowerCase() === actualSenderEmail.toLowerCase());

            if (user) {
                const { data: profile } = await supabaseAdmin
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                if (profile?.full_name) {
                    senderName = profile.full_name;
                }
            }
        }

        // User Requirement: Auth as the Logged-in User (actualSenderEmail) + Unified Password
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.hostinger.com',
            port: 465, // Explicitly per user screenshot
            secure: true, // SSL
            pool: false, // DISABLE POOLING: Fresh connection for every mail to bypass "burst" limits
            auth: {
                user: actualSenderEmail, // Auth as the sender
                pass: smtpPassword, // Unified Password
            },
        } as any);

        const results = [];

        for (const recipient of recipients) {
            try {
                // Rate Limiting Strategy: Aggressive Delay (4-6 seconds)
                // Hostinger is very strict. We simulate a human pausing between emails.
                if (results.length > 0) {
                    const delay = 4000 + Math.random() * 2000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                // Pass showDate to template generator
                const htmlContent = getBaseEmailHtml(content, subject, showDate);
                // ... existing code ...

                const info = await transporter.sendMail({
                    from: `"${senderName}" <${actualSenderEmail}>`, // Match the authenticated user
                    replyTo: actualSenderEmail, // Allow reply to the selected persona
                    to: recipient,
                    bcc: 'archive@rrakb.com', // Auto-archive copy
                    subject: subject,
                    html: htmlContent,
                    attachments: attachments,
                });

                console.log(`SMTP Response for ${recipient}:`, info.response);

                // Log success
                await supabaseAdmin.from('sent_logs').insert({
                    recipient,
                    subject,
                    content: htmlContent,
                    status: 'sent',
                    sender_email: actualSenderEmail, // The Missing Link!
                    sent_at: new Date().toISOString()
                });

                // LOOPBACK: Simulate receiving this email in the Inbox (for testing/demo)
                // We purposefully make it look like it came FROM the recipient
                await supabaseAdmin.from('inbox').insert({
                    sender: recipient, // Simulate reply from recipient
                    subject: `[Simulated Reply] ${subject}`, // Clearly mark it
                    content: htmlContent, // Iterate the same content or could be a generic reply
                    tags: ['simulated-reply'],
                    is_read: false,
                    received_at: new Date().toISOString()
                });

                results.push({ recipient, status: 'sent' });

            } catch (error: any) {
                console.error(`Failed to send to ${recipient}:`, error);

                // Log failure
                await supabaseAdmin.from('sent_logs').insert({
                    recipient,
                    subject,
                    content: getBaseEmailHtml(content, subject),
                    status: 'failed',
                    error_message: error.message,
                    sender_email: actualSenderEmail,
                    sent_at: new Date().toISOString()
                });

                results.push({ recipient, status: 'failed', error: error.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error('Error in send-email API:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
