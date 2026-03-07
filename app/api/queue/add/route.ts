import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { constructTemplateHtml } from '@/lib/email-templates';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { recipients, subject, content, userEmail, attachments, scheduledAt, templateId } = body;

        if (!recipients || !recipients.length || !subject || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify Authentication
        const supabaseAuth = await createServerClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Use Admin Client to bypass RLS for inserts
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        let finalHtml = content;
        if (templateId) {
            const { data: template } = await supabaseAdmin.from('templates').select('html_content').eq('id', templateId).single();
            finalHtml = constructTemplateHtml(template?.html_content, content, subject, true);
        } else {
            // Default system template fallback
            finalHtml = constructTemplateHtml(null, content, subject, true);
        }

        // 1. Create Campaign
        const { data: campaign, error: campError } = await supabaseAdmin
            .from('campaigns')
            .insert({
                subject,
                body_html: finalHtml,
                attachments: attachments || [],
                user_email: userEmail,
                status: 'active',
                total_recipients: recipients.length,
                scheduled_at: scheduledAt || null,
                user_id: user.id // Ensure campaign ownership UUID is strictly saved
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
            const { error } = await supabaseAdmin.from('email_queue').insert(chunk);
            if (error) throw error;
        }

        return NextResponse.json({ success: true, count: rows.length, campaignId: campaign.id });

    } catch (error: unknown) {
        console.error("QUEUE ADD ERROR:", error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

