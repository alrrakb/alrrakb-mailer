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
            .select('id, subject, body_html, attachments, user_email, user_id')
            .in('id', uniqueCampaignIds);

        const campaignMap = new Map(campaignsData?.map((c: { id: string; subject: string; body_html: string; user_email: string; user_id: string }) => [c.id, c]) || []);

        // Fetch actual sender name dynamically from .env or fallback
        const senderName = process.env.SMTP_SENDER_NAME || "TALAE ALRRAKB";

        const validEmails = [];
        for (const email of emails) {
            const campaign = campaignMap.get(email.campaign_id) || { subject: 'Update', body_html: '', user_email: '' };
            const subject = email.subject || campaign.subject;
            const body_html = email.body_html || campaign.body_html;

            // Resolve dynamic sender email from campaign's author
            const dynamicSenderEmail = email.user_email || campaign.user_email || process.env.SMTP_FROM_EMAIL || 'newsletter@rrakb.com';

            validEmails.push({
                ...email,
                resolved_subject: subject,
                resolved_body: body_html,
                resolved_sender: dynamicSenderEmail
            });
        }

        // Map into Resend API format
        const resendPayload = validEmails.map(email => ({
            from: `${senderName} <${email.resolved_sender}>`, // Verified Dynamic Sender
            to: email.recipient_email,
            subject: email.resolved_subject,
            html: email.resolved_body,
            reply_to: email.resolved_sender
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
                const logUserId = campaignMap.get(email.campaign_id)?.user_id || null;
                logsToInsert.push({
                    recipient: email.recipient_email,
                    subject: email.resolved_subject,
                    content: email.resolved_body,
                    status: 'sent',
                    sender_email: email.resolved_sender,
                    sent_at: new Date().toISOString(),
                    // Include user_id so the Dashboard's per-user activity filter works
                    ...(logUserId ? { user_id: logUserId } : {})
                });
                results.push({ id: email.id, status: 'success', sender: email.resolved_sender });
            }

            if (logsToInsert.length > 0) {
                await supabase.from('sent_logs').insert(logsToInsert);
            }

            // --- INBOX INTEGRATION ---
            // Save a copy to the user's "Sent" folder so it appears in the main UI

            // Pre-fetch all users to gracefully recover UUIDs for older campaigns missing 'user_id'
            const { data: adminUsers } = await supabase.auth.admin.listUsers();
            const emailToIdMap = new Map();
            adminUsers?.users?.forEach(u => {
                if (u.email) emailToIdMap.set(u.email.toLowerCase(), u.id)
            });

            const inboxEmailsToInsert = [];

            for (const email of validEmails) {
                // Try campaign's ID first, fallback to resolving the sender's string email to a real UUID
                const campaignUserId = campaignMap.get(email.campaign_id)?.user_id ||
                    emailToIdMap.get(email.resolved_sender.toLowerCase());

                if (!campaignUserId) {
                    console.warn(`⚠️ CRITICAL: Missing user_id for campaign ${email.campaign_id}. Skipping Sent folder insertion for ${email.recipient_email} to prevent orphaned rows.`);
                    continue;
                }

                inboxEmailsToInsert.push({
                    user_id: campaignUserId, // Link to owner (MUST be UUID)
                    sender: email.resolved_sender, // Matches 'inbox' schema (Dynamic Sender)
                    recipient: email.recipient_email, // Displayed in "Sent" folder UI
                    subject: email.resolved_subject,
                    content: email.resolved_body,
                    folder: 'sent',
                    is_read: true, // Matches 'inbox' schema (not 'read')
                    message_id: `camp-${email.id}-${Date.now()}`, // Required by 'inbox' schema
                    received_at: new Date().toISOString() // 'inbox' schema uses received_at for sorting
                });
            }

            if (inboxEmailsToInsert.length > 0) {
                console.log('--- ATTEMPTING TO INSERT INTO SENT FOLDER ---');
                console.log('Payload Sample:', JSON.stringify(inboxEmailsToInsert[0], null, 2));

                const { error: inboxError } = await supabase.from('inbox').insert(inboxEmailsToInsert);

                if (inboxError) {
                    console.error('❌ CRITICAL DB INSERT ERROR (Sent Folder):', inboxError);
                } else {
                    console.log(`✅ Successfully added ${inboxEmailsToInsert.length} emails to Sent folder.`);
                }
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
