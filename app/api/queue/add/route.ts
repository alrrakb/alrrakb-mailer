
import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { recipients, subject, content, userEmail, attachments, scheduledAt } = body;

        if (!recipients || !recipients.length || !subject || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = await createClient();

        // 1. Create Campaign
        const { data: campaign, error: campError } = await supabase
            .from('campaigns')
            .insert({
                subject,
                body_html: content,
                attachments: attachments || [],
                user_email: userEmail,
                status: 'active',
                total_recipients: recipients.length,
                scheduled_at: scheduledAt || null
            })
            .select()
            .single();

        if (campError) throw campError;

        // 2. Insert Queue Items (Batch)
        // Note: We don't verify if recipients is array here because we assume upstream validation or strict typing
        const rows = recipients.map((email: string) => ({
            campaign_id: campaign.id,
            recipient_email: email,
            status: 'pending',
            user_email: userEmail,
            created_at: new Date(),
            updated_at: new Date(),
            attempts: 0,
            scheduled_at: scheduledAt || null
        }));

        const CHUNK_SIZE = 100;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            const chunk = rows.slice(i, i + CHUNK_SIZE);
            const { error } = await supabase.from('email_queue').insert(chunk);
            if (error) throw error;
        }

        return NextResponse.json({ success: true, count: rows.length, campaignId: campaign.id });

    } catch (error: any) {
        console.error("QUEUE ADD ERROR:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

