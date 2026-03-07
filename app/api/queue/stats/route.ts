import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    // Verify Authentication
    const supabaseAuth = await createServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Use Admin Client to bypass RLS for SELECT
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
