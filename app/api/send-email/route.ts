import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { constructTemplateHtml } from '@/lib/email-templates';

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        // SECURITY FIX: Deliberately ignoring 'senderEmail' from payload to prevent spoofing
        const { recipients, subject, content, attachments, showDate, templateId } = body;

        if (!subject || !content) {
            return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let finalHtml = content;
        if (templateId) {
            const { data: template } = await supabaseAdmin.from('templates').select('html_content').eq('id', templateId).single();
            finalHtml = constructTemplateHtml(template?.html_content, content, subject, showDate ?? true);
        } else {
            finalHtml = constructTemplateHtml(null, content, subject, showDate ?? true);
        }

        // Security Fix: Hardcode sender to env variable to prevent spoofing
        const actualSenderEmail = process.env.SMTP_FROM_EMAIL || 'newsletter@rrakb.com';
        const senderName = "Tala'ea Al-Rakeb";

        console.log(`Sending batch via Resend from: ${actualSenderEmail}`);

        // Prepare the batch payload for Resend
        const emailsToSend = recipients.map((recipient: string) => ({
            from: `${senderName} <${actualSenderEmail}>`,
            to: recipient,
            subject: subject,
            html: finalHtml,
            reply_to: actualSenderEmail, // Dedicated reply-to for IMAP tracking
            // Note: If using attachments, format needs to be { filename, content: buffer } for Resend
            ...(attachments?.length ? { attachments } : {})
        }));

        // Send via Resend Batch API (No more setTimeout Thread Stalling!)
        const { data: resendData, error: resendError } = await resend.batch.send(emailsToSend);

        if (resendError) {
            throw new Error(resendError.message);
        }

        const results = [];
        const logsToInsert = [];

        // Log success to DB
        for (const recipient of recipients) {
            logsToInsert.push({
                recipient,
                subject,
                content: finalHtml,
                status: 'sent',
                sender_email: actualSenderEmail,
                sent_at: new Date().toISOString()
            });

            results.push({ recipient, status: 'sent' });

            await supabaseAdmin.from('inbox').insert({
                sender: recipient,
                subject: `[Simulated Reply] ${subject}`,
                content: finalHtml,
                tags: ['simulated-reply'],
                is_read: false,
                received_at: new Date().toISOString()
            });
        }

        if (logsToInsert.length > 0) {
            await supabaseAdmin.from('sent_logs').insert(logsToInsert);
        }

        return NextResponse.json({ success: true, results, resendData });

    } catch (error: unknown) {
        console.error('Error in send-email API:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}
