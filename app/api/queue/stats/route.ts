import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const supabase = await createClient();

    try {
        // Get counts
        // Note: Supabase count is efficient if using count: 'exact'

        const { count: pending } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: completed } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        const { count: failed } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'failed');
        const { count: processing } = await supabase.from('email_queue').select('*', { count: 'exact', head: true }).eq('status', 'processing');

        // Get recent activity (Lightweight fetch)
        const { data: recent } = await supabase
            .from('email_queue')
            .select('id, status, recipient_email, subject, updated_at, last_error')
            .order('updated_at', { ascending: false })
            .limit(10);

        return NextResponse.json({
            stats: {
                pending: pending || 0,
                completed: completed || 0,
                failed: failed || 0,
                processing: processing || 0,
                total: (pending || 0) + (completed || 0) + (failed || 0) + (processing || 0)
            },
            recent: recent || []
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
