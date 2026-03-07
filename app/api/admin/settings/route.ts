import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialized inside handler to avoid build-time errors

export async function POST(req: Request) {
    try {
        // Initialize inside handler to avoid build-time env var requirement issues
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        const body = await req.json();
        const { action, value } = body;

        if (!action) {
            return NextResponse.json({ error: 'Action is required' }, { status: 400 });
        }

        if (action === 'suspend_all') {
            const shouldSuspend = value; // true to suspend, false to activate
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
            if (error) throw error;

            for (const user of users) {
                if (user.email !== 'admin@rrakb.com') { // Never lock out admin
                    await supabaseAdmin.auth.admin.updateUserById(user.id, {
                        ban_duration: shouldSuspend ? '876000h' : 'none'
                    });
                }
            }
            return NextResponse.json({ message: `All users ${shouldSuspend ? 'suspended' : 'activated'} successfully` });
        }

        if (action === 'clear_cache' || action === 'clear_drafts') {
            const { error } = await supabaseAdmin
                .from('drafts')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

            if (error) throw error;
            return NextResponse.json({ message: 'All drafts cleared successfully' });
        }

        if (action === 'update_smtp') {
            if (!value) return NextResponse.json({ error: 'Password is required' }, { status: 400 });

            const { error } = await supabaseAdmin
                .from('settings')
                .upsert({ key: 'smtp_password', value: value, updated_at: new Date().toISOString() });

            if (error) throw error;
            return NextResponse.json({ message: 'SMTP Password updated successfully' });
        }

        if (action === 'update_ai_system_prompt') {
            const { error } = await supabaseAdmin
                .from('settings')
                .upsert({ key: 'ai_system_prompt', value: value ?? '', updated_at: new Date().toISOString() }, { onConflict: 'key' });

            if (error) throw error;
            return NextResponse.json({ message: 'AI system prompt updated successfully' });
        }

        // Fetch Settings
        if (action === 'get_settings') {
            const { data, error } = await supabaseAdmin.from('settings').select('*');
            if (error) throw error;

            // Convert array to object
            const settings: Record<string, string> = {};
            data.forEach((item: { key: string; value: string }) => settings[item.key] = item.value);

            return NextResponse.json(settings);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error: unknown) {
        console.error('Settings API Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
