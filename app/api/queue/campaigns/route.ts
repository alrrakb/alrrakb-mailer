import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    try {
        // 1. Fetch Campaigns
        const { data: campaigns, error: camError } = await supabase
            .from('campaigns')
            .select('*')
            .order('created_at', { ascending: false });

        if (camError) throw camError;

        // 2. Fetch Stats via RPC (Efficient aggregation)
        const { data: stats, error: rpcError } = await supabase.rpc('get_campaign_stats');

        if (rpcError) {
            console.error("RPC Error", rpcError);
            // Fallback: If RPC fails (e.g. migration didn't run), return 0s
        }

        // 2a. Fetch Scheduled Times (Optimization: Get one scheduled_at per campaign)
        // We can't easily join in one query without complex SQL, so we'll do a parallel fetch or just map it if list is small.
        // Let's rely on checking the queue for any scheduled items.

        const { data: schedules } = await supabase
            .from('email_queue')
            .select('campaign_id, scheduled_at')
            .not('scheduled_at', 'is', null)
            .gt('scheduled_at', new Date().toISOString())
            .limit(100); // Just get some samples

        // 3. Merge Data
        const merged = campaigns.map(c => {
            const stat = stats ? stats.find((s: { campaign_id: string; total: number; pending: number; processing: number; completed: number; failed: number }) => s.campaign_id === c.id) : null;
            // Find if this campaign has a future schedule
            const schedule = schedules?.find(s => s.campaign_id === c.id);

            return {
                ...c,
                scheduled_at: schedule?.scheduled_at || null, // Pass to UI
                stats: {
                    total: stat?.total || 0,
                    pending: stat?.pending || 0,
                    processing: stat?.processing || 0,
                    completed: stat?.completed || 0,
                    failed: stat?.failed || 0
                }
            };
        });

        return NextResponse.json(merged);

    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
