import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE() {
    const supabase = await createServerClient();

    try {
        // ── Auth & Role Check ──────────────────────────────────────────────────────
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('permissions')
            .eq('id', user.id)
            .single();

        const role = profile?.permissions?.role || null;
        const isAdmin = role === 'admin' || user.email === 'admin@rrakb.com';

        if (!isAdmin) {
            return NextResponse.json(
                { error: 'Forbidden: Admin access required' },
                { status: 403 }
            );
        }

        // ── Perform Deletion ───────────────────────────────────────────────────────
        // Use service role key to bypass RLS — only safe because we already
        // confirmed the caller is an admin above.
        const db = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Get count before deletion for the success response
        const { count } = await db
            .from('sent_logs')
            .select('*', { count: 'exact', head: true });

        // Delete all rows — use .not('id', 'is', null) instead of .neq('id', 0)
        // because sent_logs.id is a UUID and PostgreSQL rejects integer comparisons against it.
        const { error: deleteError } = await db
            .from('sent_logs')
            .delete()
            .not('id', 'is', null);

        if (deleteError) {
            console.error('[admin/history/clear] Delete error:', deleteError);
            throw deleteError;
        }

        console.log(`[admin/history/clear] Cleared ${count ?? 'all'} sent_logs rows. Performed by: ${user.email}`);

        return NextResponse.json({
            success: true,
            deleted: count ?? 0,
            message: `Successfully cleared ${count ?? 'all'} history records.`
        });

    } catch (error: unknown) {
        console.error('[admin/history/clear] Unexpected error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
