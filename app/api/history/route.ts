import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabase = await createServerClient();
    const { searchParams } = new URL(request.url);

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            console.error("History API - Auth Error:", authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userEmail = user.email;
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        const isAdmin = profile?.role === 'admin' || userEmail === 'admin@rrakb.com';

        // Always use service role client to bypass flawed RLS for standard users reading their own logs
        const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // Extract pagination and filters
        const pageStr = searchParams.get('page') || '0';
        const perPageStr = searchParams.get('per_page') || '20';
        const page = parseInt(pageStr, 10);
        const perPage = parseInt(perPageStr, 10);
        const searchQuery = searchParams.get('search') || '';

        let query = db
            .from('sent_logs')
            .select('*', { count: 'exact' })
            .order('sent_at', { ascending: false })
            .range(page * perPage, (page + 1) * perPage - 1);

        if (!isAdmin && userEmail) {
            query = query.eq('sender_email', userEmail);
        }

        if (searchQuery) {
            query = query.or(`subject.ilike.%${searchQuery}%,recipient.ilike.%${searchQuery}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error("History API - Query Error:", error);
            throw error;
        }

        return NextResponse.json({ data, count });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
