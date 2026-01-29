import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    try {
        const { data, error } = await supabase
            .from('email_queue')
            .select('id, recipient_email, status, last_error, updated_at') // Lightweight columns
            .eq('campaign_id', id)
            .order('updated_at', { ascending: false });
        // .limit(500); // Optional limit to prevent massive payload

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    try {
        const { status } = await req.json();

        const { error } = await supabase
            .from('campaigns')
            .update({ status })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const supabase = await createClient();
    const { id } = await params;

    try {
        // 1. Delete Queue Items (Frontend said "Stop then delete", so we effectively just delete all)
        await supabase.from('email_queue').delete().eq('campaign_id', id);

        // 2. Delete Campaign
        const { error } = await supabase.from('campaigns').delete().eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
