import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Initialize Resend Client
const resend = new Resend(process.env.RESEND_API_KEY!);

export async function GET() {
    // UPDATED BATCH LIMIT: Resend allows up to 100 emails per batch request
    // This efficiently clears the queue without serverless timeouts.
    const PROCESS_LIMIT = 100;

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 1. Get Active Campaign IDs
        const { data: activeCampaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('status', 'active');

        const activeIds = activeCampaigns?.map(c => c.id) || [];

        if (activeIds.length === 0) {
            return NextResponse.json({ message: 'No active campaigns' });
        }

        // 2. Atomic Fetch & Lock using RPC
        const { data: emails, error: fetchError } = await supabase
            .rpc('fetch_next_queue_batch', {
                p_limit: PROCESS_LIMIT,
                p_active_campaign_ids: activeIds
            });

        if (fetchError) throw fetchError;

        if (!emails || emails.length === 0) {
            return NextResponse.json({ message: 'No pending emails' });
        }

        // 3. Prepare Batch Data
        const uniqueCampaignIds = [...new Set(emails.map((e: { campaign_id: string }) => e.campaign_id))];

        // Pre-fetch campaign data to minimize queries inside loop
        const { data: campaignsData } = await supabase
            .from('campaigns')
            .select('id, subject, body_html, attachments, user_email')
            .in('id', uniqueCampaignIds);

        const campaignMap = new Map(campaignsData?.map((c: { id: string; subject: string; body_html: string }) => [c.id, c]) || []);

        // Security Fix: Server-side determined sender to prevent spoofing
        const actualSenderEmail = process.env.SMTP_FROM_EMAIL || 'newsletter@rrakb.com';
        const senderName = "Tala'ea Al-Rakeb";

        const validEmails = [];
        for (const email of emails) {
            const campaign = campaignMap.get(email.campaign_id) || { subject: 'Update', body_html: '' };
            const subject = email.subject || campaign.subject;
            const body_html = email.body_html || campaign.body_html;

            validEmails.push({
                ...email,
                resolved_subject: subject,
                resolved_body: body_html
            });
        }

        // Map into Resend API format
        const resendPayload = validEmails.map(email => ({
            from: `${senderName} <${actualSenderEmail}>`, // Verified Sender
            to: email.recipient_email,
            subject: email.resolved_subject,
            html: email.resolved_body,
            reply_to: actualSenderEmail
        }));

        // 4. Send via Resend Batch API
        const { error: resendError } = await resend.batch.send(resendPayload);

        const results = [];
        const logsToInsert = [];

        if (resendError) {
            console.error("Resend Batch Error:", resendError);
            // Revert or fail all in batch depending on error type. 
            // We'll mark them as failed globally for simplicity if the whole batch returns an error.
            const failedIds = validEmails.map(e => e.id);
            await supabase.from('email_queue').update({
                status: 'failed',
                last_error: resendError.message,
                updated_at: new Date()
            }).in('id', failedIds);

            results.push({ batch: 'failed', error: resendError.message });

        } else {
            // 5. Bulk update Successes and Logs
            const completedIds = validEmails.map(e => e.id);
            await supabase.from('email_queue').update({ status: 'completed', updated_at: new Date() }).in('id', completedIds);

            for (let i = 0; i < validEmails.length; i++) {
                const email = validEmails[i];
                logsToInsert.push({
                    recipient: email.recipient_email,
                    subject: email.resolved_subject,
                    content: email.resolved_body,
                    status: 'sent',
                    sender_email: actualSenderEmail,
                    sent_at: new Date().toISOString()
                });
                results.push({ id: email.id, status: 'success', sender: actualSenderEmail });
            }

            if (logsToInsert.length > 0) {
                await supabase.from('sent_logs').insert(logsToInsert);
            }
        }

        // 6. Check for Campaign Completion
        for (const cId of uniqueCampaignIds) {
            const { count, error } = await supabase
                .from('email_queue')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', cId)
                .in('status', ['pending', 'queued']);

            if (!error && count === 0) {
                await supabase
                    .from('campaigns')
                    .update({ status: 'completed' })
                    .eq('id', cId);
                console.log(`Campaign ${cId} completed!`);
            }
        }

        return NextResponse.json({ processed: results.length, details: results });

    } catch (error: unknown) {
        console.error("QUEUE PROCESS ERROR:", error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 200 }); // Return 200 to see payload in browser/curl
    }
}
