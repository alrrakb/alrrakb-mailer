import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkServerActionPermission } from '@/lib/permissions.server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to create admin client inside handlers
async function getAdminClient() {
    const supabaseAuth = await createServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const supabaseAdmin = await getAdminClient();
        const { data, error } = await supabaseAdmin
            .from('email_queue')
            .select('id, recipient_email, status, last_error, updated_at') // Lightweight columns
            .eq('campaign_id', id)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const hasAccess = await checkServerActionPermission('queue_send');
        if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const supabaseAdmin = await getAdminClient();
        const { status } = await req.json();

        const { error } = await supabaseAdmin
            .from('campaigns')
            .update({ status })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
        const hasAccess = await checkServerActionPermission('queue_delete');
        if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const supabaseAdmin = await getAdminClient();

        // 1. Delete Queue Items (Frontend said "Stop then delete", so we effectively just delete all)
        await supabaseAdmin.from('email_queue').delete().eq('campaign_id', id);

        // 2. Delete Campaign
        const { error } = await supabaseAdmin.from('campaigns').delete().eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
