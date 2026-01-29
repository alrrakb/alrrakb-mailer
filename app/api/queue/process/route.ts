
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function GET(req: Request) {
    // Default Batch: 1 email per run to ensure precise control and avoiding timeouts
    // Worker runs every 10s -> ~6 emails/min.
    const PROCESS_LIMIT = 1;

    // Use SERVICE ROLE key to access 'settings' (password) and all campaigns
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        // 0. Fetch Unified Password
        const { data: settingsData } = await supabase
            .from('settings')
            .select('value')
            .eq('key', 'smtp_password')
            .single();

        const smtpPassword = settingsData?.value || process.env.SMTP_PASS;

        if (!smtpPassword) {
            return NextResponse.json({ error: 'SMTP Configuration Missing (No Password found in settings or env)' }, { status: 200 });
        }

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
        // This picks up: Pending items AND Failed items (after 5m)
        const { data: emails, error: fetchError } = await supabase
            .rpc('fetch_next_queue_batch', {
                p_limit: PROCESS_LIMIT,
                p_active_campaign_ids: activeIds
            });

        if (fetchError) throw fetchError;

        if (!emails || emails.length === 0) {
            return NextResponse.json({ message: 'No pending emails' });
        }

        const results = [];

        // 3. Process Loop (Single Item)
        for (const email of emails) {
            try {
                // Resolve Content & Sender
                let { subject, body_html, attachments, campaign_id } = email;
                let senderEmail = process.env.SMTP_FROM_EMAIL; // Default

                // We MUST fetch campaign data to get the 'user_email' (sender)
                // RPC doesn't return user_email by default unless we updated it, but let's query it.
                // We also need it for subject/body fallback.

                const { data: campaign } = await supabase
                    .from('campaigns')
                    .select('subject, body_html, attachments, user_email')
                    .eq('id', campaign_id)
                    .single();

                if (campaign) {
                    subject = subject || campaign.subject;
                    body_html = body_html || campaign.body_html;
                    attachments = attachments || campaign.attachments;
                    senderEmail = campaign.user_email || senderEmail;
                }

                if (!senderEmail) {
                    throw new Error("No sender email determined");
                }

                // Dynamic Transporter (Same as /api/send-email)
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
                    port: 465,
                    secure: true,
                    pool: false,
                    auth: {
                        user: senderEmail, // Dynamic Sender
                        pass: smtpPassword, // Unified Password
                    },
                } as any);

                // Send
                await transporter.sendMail({
                    from: `"${senderEmail}" < ${senderEmail}> `, // Simplified Name for now
                    replyTo: senderEmail,
                    to: email.recipient_email,
                    subject: subject,
                    html: body_html,
                    attachments: attachments
                });

                // Mark success in Queue
                await supabase.from('email_queue').update({ status: 'completed', updated_at: new Date() }).eq('id', email.id);

                // LOGGING: Insert into global sent_logs (Mirroring /api/send-email behavior)
                await supabase.from('sent_logs').insert({
                    recipient: email.recipient_email,
                    subject: subject,
                    content: body_html,
                    status: 'sent',
                    sender_email: senderEmail,
                    sent_at: new Date().toISOString()
                });

                results.push({ id: email.id, status: 'success', sender: senderEmail });

                // Short safety delay (2s)
                await new Promise(r => setTimeout(r, 2000));

            } catch (err: any) {
                const errorMessage = err.message || "";
                const isRateLimit = errorMessage.toLowerCase().includes('ratelimit') || errorMessage.includes('421');

                if (isRateLimit) {
                    // RATE LIMIT STRATEGY:
                    // 1. Set status back to 'pending' (so it can be retried)
                    // 2. Set scheduled_at to +30 Minutes
                    const backoffTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

                    await supabase.from('email_queue').update({
                        status: 'pending', // Re-queue
                        scheduled_at: backoffTime, // Wait 30 mins
                        last_error: `Rate Limit Hit.Paused until ${backoffTime}.Error: ${errorMessage} `,
                        updated_at: new Date()
                    }).eq('id', email.id);

                    results.push({ id: email.id, status: 'rate_limited', backoff: '30m', error: errorMessage });

                    console.log(`Rate Limit hit for ${email.id}.Backing off 30 mins.`);

                } else {
                    // Regular Failure
                    // Mark failed in Queue
                    await supabase.from('email_queue').update({
                        status: 'failed',
                        last_error: errorMessage,
                        attempts: (email.attempts || 0) + 1,
                        updated_at: new Date()
                    }).eq('id', email.id);

                    // LOGGING: Insert into global sent_logs (Mirroring /api/send-email behavior)
                    // We resolve variables safely for the log even if send failed
                    const logSubject = email.subject || "Unknown";
                    const logContent = email.body_html || "";

                    await supabase.from('sent_logs').insert({
                        recipient: email.recipient_email,
                        subject: logSubject,
                        content: logContent,
                        status: 'failed',
                        error_message: errorMessage,
                        sender_email: process.env.SMTP_FROM_EMAIL || 'system', // Fallback if sender resolution failed
                        sent_at: new Date().toISOString()
                    });

                    results.push({ id: email.id, status: 'failed', error: errorMessage });
                }
            }
        }

        // 4. Check for Campaign Completion
        // Identify campaigns that might have finished
        const returnedIds = results.map(r => r.id);
        const touchedCampaignIds = [...new Set(emails.map((e: any) => e.campaign_id))];

        for (const cId of touchedCampaignIds) {
            // Check if any pending items remain for this campaign
            const { count, error } = await supabase
                .from('email_queue')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', cId)
                .in('status', ['pending', 'queued']); // Check pending or queued

            if (!error && count === 0) {
                // No pending items -> Mark Campaign as Completed
                await supabase
                    .from('campaigns')
                    .update({ status: 'completed' })
                    .eq('id', cId);
                console.log(`Campaign ${cId} completed!`);
            }
        }

        return NextResponse.json({ processed: results.length, details: results });

    } catch (error: any) {
        console.error("QUEUE PROCESS ERROR:", error);
        return NextResponse.json({
            error: error.message,
            stack: error.stack
        }, { status: 200 }); // Return 200 to see payload in browser/curl
    }
}
