import { createClient } from '@/lib/supabase-server';
import DashboardContent from '@/components/dashboard/DashboardContent';

export const revalidate = 0; // Disable static caching for real-time stats

export default async function DashboardPage() {
    const supabase = await createClient();

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email;
    const isAdmin = userEmail === 'admin@rrakb.com';

    // Base queries
    let sentQuery = supabase
        .from('sent_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent');

    let failedQuery = supabase
        .from('sent_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

    let recentQuery = supabase
        .from('sent_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(5);

    // Apply user filter if not admin
    if (!isAdmin && userEmail) {
        sentQuery = sentQuery.eq('sender_email', userEmail);
        failedQuery = failedQuery.eq('sender_email', userEmail);
        recentQuery = recentQuery.eq('sender_email', userEmail);
    }

    const { count: sentCount } = await sentQuery;
    const { count: failedCount } = await failedQuery;
    const { data: recentLogs } = await recentQuery;

    return (
        <DashboardContent
            sentCount={sentCount || 0}
            failedCount={failedCount || 0}
            recentLogs={recentLogs || []}
        />
    );
}
