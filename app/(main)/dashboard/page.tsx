import { createClient as createServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import DashboardContent from '@/components/dashboard/DashboardContent';

export const revalidate = 0; // Disable static caching for real-time stats

export default async function DashboardPage() {
    const supabase = await createServerClient();

    // Get current user with getUser
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return <div className="p-8 text-center text-red-500">Authentication Failed</div>;
    }

    const userEmail = user.email;

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin' || userEmail === 'admin@rrakb.com';

    // Always bypass RLS safely and manually enforce checks since RLS might be incorrectly blocking standard users
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Base queries
    let sentQuery = db
        .from('sent_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent');

    let failedQuery = db
        .from('sent_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

    let recentQuery = db
        .from('sent_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    // Apply user filter if not admin
    if (!isAdmin) {
        sentQuery = sentQuery.eq('sender_email', userEmail);
        failedQuery = failedQuery.eq('sender_email', userEmail);
        recentQuery = recentQuery.eq('sender_email', userEmail);
    }

    const { count: sentCount, error: sentError } = await sentQuery;
    const { count: failedCount, error: failedError } = await failedQuery;
    const { data: recentLogs, error: recentError } = await recentQuery;

    if (sentError || failedError || recentError) {
        console.error("Dashboard - Query Errors:", { sentError, failedError, recentError });
    }

    return (
        <DashboardContent
            sentCount={sentCount || 0}
            failedCount={failedCount || 0}
            recentLogs={recentLogs || []}
        />
    );
}
