import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import { constructTemplateHtml } from '@/lib/email-templates';

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(req: Request) {
    // 1. Pre-flight: Fail fast if the API key is missing
    if (!process.env.RESEND_API_KEY) {
        console.error('[send-email] RESEND_API_KEY is not configured.');
        return NextResponse.json(
            { error: 'Email service is not configured. RESEND_API_KEY is missing.' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        // Extract fromEmail — user-selected sender account from the Compose UI.
        // Falls back to the env default if not provided.
        const { recipients, subject, content, attachments, showDate, templateId, fromEmail } = body;

        if (!subject || !content) {
            return NextResponse.json({ error: 'Subject and content are required' }, { status: 400 });
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Resolve the authenticated user via SSR cookie session.
        // The browser sends cookies automatically on every fetch — no Authorization
        // header needed. This is the reliable way to get user_id in Next.js API routes.
        let sendingUserId: string | null = null;
        try {
            const supabaseServer = await createServerClient();
            const { data: { user: sessionUser } } = await supabaseServer.auth.getUser();
            sendingUserId = sessionUser?.id ?? null;
            console.log(`[send-email] Resolved sender user_id: ${sendingUserId ?? 'anonymous'}`);
        } catch (authErr) {
            console.warn('[send-email] Could not resolve session user:', authErr);
        }

        let finalHtml = content;
        if (templateId) {
            const { data: template } = await supabaseAdmin.from('templates').select('html_content').eq('id', templateId).single();
            finalHtml = constructTemplateHtml(template?.html_content, content, subject, showDate ?? true);
        } else {
            finalHtml = constructTemplateHtml(null, content, subject, showDate ?? true);
        }

        // Resolve sender: use the user-selected account from the UI payload,
        // fall back to the env-configured default only if nothing was sent.
        const actualSenderEmail = (typeof fromEmail === 'string' && fromEmail.trim())
            ? fromEmail.trim()
            : (process.env.SMTP_FROM_EMAIL || 'newsletter@rrakb.com');
        const senderName = "TALAE ALRRAKB";

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

        // 2. Send via Resend — wrapped in its own try/catch for network/DNS errors
        let resendData;
        try {
            const { data, error: resendError } = await resend.batch.send(emailsToSend);

            if (resendError) {
                // 3. Deep logging — log the full error object for debuggability
                console.error('[Email Provider Error]:', resendError);
                // 4. Graceful response — 502 Bad Gateway so frontend can render a Toast
                return NextResponse.json(
                    {
                        error: 'Failed to connect to the email server. Please check your network or API keys.',
                        details: resendError.message
                    },
                    { status: 502 }
                );
            }

            resendData = data;
        } catch (networkError: unknown) {
            // Handles DNS/timeout errors that Resend SDK surfaces as thrown exceptions
            console.error('[Email Provider Error] Network/DNS failure:', networkError);
            return NextResponse.json(
                {
                    error: 'Failed to connect to the email server. The request could not be resolved.',
                    details: networkError instanceof Error ? networkError.message : String(networkError)
                },
                { status: 502 }
            );
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
                sent_at: new Date().toISOString(),
                // Populate user_id so RLS lets the owning user read their own logs
                ...(sendingUserId ? { user_id: sendingUserId } : {})
            });

            results.push({ recipient, status: 'sent' });

            // Persist a copy to the inbox table with folder='sent' so it appears
            // immediately in the Sent tab. Resend doesn't write to IMAP Sent folder,
            // so we bridge the gap ourselves.
            // IMPORTANT: wrapped in its own try/catch — a DB failure must never
            // block or fail the email send response.
            try {
                const sentAt = new Date().toISOString();
                const sentRecord = {
                    sender: actualSenderEmail,
                    subject: subject,
                    content: finalHtml,
                    tags: ['sent'],
                    is_read: true,
                    received_at: sentAt,
                    folder: 'sent',
                    recipient: recipient,  // ← who the email was addressed to
                    message_id: `sent-resend-${Date.now()}-${recipient.replace(/[^a-z0-9]/gi, '').slice(0, 30)}`,
                    ...(sendingUserId ? { user_id: sendingUserId } : {})
                };

                const { error: insertError } = await supabaseAdmin.from('inbox').insert(sentRecord);

                if (insertError) {
                    console.error(`[send-email] Failed to persist sent copy for ${recipient}:`, insertError.message, insertError.details);
                } else {
                    console.log(`[send-email] Sent copy persisted to DB for ${recipient} with folder='sent'`);
                }
            } catch (dbErr) {
                // Non-fatal — log and continue
                console.error(`[send-email] Unexpected error persisting sent copy for ${recipient}:`, dbErr);
            }
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
