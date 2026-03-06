import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (id) {
            const { data, error } = await supabase
                .from('inbox')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id) // Enforce ownership
                .single();
            if (error) throw error;
            return NextResponse.json(data);
        }

        const { data, error } = await supabase
            .from('inbox')
            .select('*')
            .eq('user_id', user.id) // Filter by user
            .order('received_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

import { ImapHelper } from '@/lib/imap-helper';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    const supabase = await createClient(); // Current user context
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    try {
        if (action === 'sync') {
            // 1. Get current authenticated user
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user || !user.email) {
                return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
            }

            console.log(`Syncing inbox for: ${user.email}`);

            // Use Service Role for Admin settings access (like send-email)
            const supabaseAdmin = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // 3. Get Password from Settings
            const { data: settingsData } = await supabaseAdmin
                .from('settings')
                .select('value')
                .eq('key', 'smtp_password')
                .single();

            const smtpPassword = settingsData?.value || "T@laeAlR4kb#2026!P1";

            const imap = new ImapHelper();
            const emails = await imap.fetchNewEmails(user.email, smtpPassword);
            let newCount = 0;

            for (const email of emails) {
                // Check if exists
                const { data: existing } = await supabaseAdmin
                    .from('inbox')
                    .select('id')
                    .eq('message_id', email.message_id)
                    .single();

                if (!existing) {
                    await supabaseAdmin.from('inbox').insert({
                        sender: email.sender,
                        subject: email.subject,
                        content: email.content,
                        received_at: email.date.toISOString(),
                        is_read: false,
                        tags: ['IMAP'],
                        message_id: email.message_id,
                        user_id: user.id // Associate with current user
                    });
                    newCount++;
                }
            }

            return NextResponse.json({ success: true, count: newCount });
        }

        const body = await request.json();

        // Basic validation
        if (!body.sender || !body.subject) {
            return NextResponse.json({ error: 'Sender and Subject are required' }, { status: 400 });
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('inbox')
            .insert({
                sender: body.sender,
                subject: body.subject,
                content: body.content || '',
                tags: body.tags || [],
                is_read: false,
                message_id: `sim-${Date.now()}`, // Add simulated ID
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error('Inbox Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const supabase = await createClient();
    try {
        const body = await request.json();
        const { id, is_read } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const { error } = await supabase
            .from('inbox')
            .update({ is_read })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let idsToDelete: string[] = [];

    if (id) {
        idsToDelete = [id];
    } else {
        try {
            const body = await request.json();
            if (body.ids && Array.isArray(body.ids)) {
                idsToDelete = body.ids;
            }
        } catch {
            // Body might be empty or invalid JSON
        }
    }

    if (idsToDelete.length === 0) {
        return NextResponse.json({ error: 'ID or IDs required' }, { status: 400 });
    }

    try {
        const { error } = await supabase
            .from('inbox')
            .delete()
            .in('id', idsToDelete);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
