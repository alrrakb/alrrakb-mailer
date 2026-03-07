import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

/**
 * GET /api/admin/emails?userId=xxx
 * Returns ALL emails for a specific user across all folders.
 * Admin-only. Uses service role to bypass RLS.
 */
export async function GET(req: Request) {
    try {
        // Verify the caller is an admin
        const supabase = await createServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profileData } = await supabase
            .from('profiles').select('permissions').eq('id', user.id).maybeSingle();
        const role = profileData?.permissions?.role || 'user';
        const isAdmin = role === 'admin' || user.email === 'admin@rrakb.com';

        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        const { data, error } = await supabaseAdmin
            .from('inbox')
            .select('id, sender, subject, content, received_at, is_read, folder, tags')
            .eq('user_id', userId)
            .order('received_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data ?? []);
    } catch (error: unknown) {
        console.error('[Admin Emails API]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
}
