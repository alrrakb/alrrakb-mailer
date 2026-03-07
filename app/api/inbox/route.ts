import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { checkServerActionPermission } from '@/lib/permissions.server';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profileData } = await supabase.from('profiles').select('permissions').eq('id', user.id).single();
        const role = profileData?.permissions?.role || 'user';
        const isAdmin = role === 'admin' || user.email === 'admin@rrakb.com';

        if (id) {
            // Always scope to the requesting user — no admin override here.
            // Admin supervision of other users' emails is done via /api/admin/emails.
            const { data, error } = await supabase
                .from('inbox')
                .select('*')
                .eq('id', id)
                .eq('user_id', user.id)
                .single();
            if (error) throw error;
            return NextResponse.json(data);
        }

        // Strict user-scoped query — every user (including admin) sees only their own emails.
        // Soft-deleted items (deleted_by_user=true) are hidden from users but visible to admins.
        const { data, error } = await supabase
            .from('inbox')
            .select('*')
            .eq('user_id', user.id)
            .eq('deleted_by_user', false)
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

            // Use Service Role for Admin settings access
            const supabaseAdmin = createSupabaseClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );

            // 2. Determine user role from profiles table
            const { data: profileData } = await supabaseAdmin
                .from('profiles')
                .select('role, permissions')
                .eq('id', user.id)
                .single();

            const role = profileData?.role || profileData?.permissions?.role || 'user';
            const isAdmin = role === 'admin' || user.email === 'admin@rrakb.com';

            // 3. Fetch the shared IMAP password from DB settings (falls back to env)
            const { data: settingsData } = await supabaseAdmin
                .from('settings')
                .select('value')
                .eq('key', 'smtp_password')
                .single();

            const sharedPassword = settingsData?.value || process.env.SMTP_PASS || '';
            const imapHost = process.env.SMTP_HOST?.replace('smtp.', 'imap.') || 'imap.hostinger.com';

            // 4. Build accounts list — STRICTLY scoped by role.
            //    Standard users: only their own mailbox (no access to admin account).
            //    Admins: sync the global SMTP_FROM_EMAIL which receives all campaign replies.
            type ImapAccount = { email: string; password: string; host: string };
            const imapAccounts: ImapAccount[] = [];

            if (isAdmin) {
                // Admin syncs the master outbox/reply account
                const adminEmail = process.env.SMTP_FROM_EMAIL;
                if (adminEmail && sharedPassword) {
                    imapAccounts.push({ email: adminEmail, password: sharedPassword, host: imapHost });
                }
            } else {
                // Standard user: ONLY sync their own mailbox — never the global admin account
                if (user.email && sharedPassword) {
                    imapAccounts.push({ email: user.email, password: sharedPassword, host: imapHost });
                }
            }

            console.log(`[IMAP SYNC] Starting sync for ${imapAccounts.length} account(s)...`);

            const imap = new ImapHelper();
            let totalNewCount = 0;
            const imapWarnings: string[] = [];

            for (const account of imapAccounts) {
                // Credentials are strictly scoped to this account object — no shared mutable state
                console.log(`[IMAP SYNC] Attempting connection for: ${account.email} via ${account.host}`);

                let emails: Awaited<ReturnType<typeof imap.fetchNewEmails>> = [];

                try {
                    emails = await imap.fetchNewEmails(account.email, account.password);
                } catch (err: unknown) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    const isAuthFailure = errMsg.toLowerCase().includes('authentication') || errMsg.toLowerCase().includes('auth');

                    if (isAuthFailure) {
                        console.warn(`[IMAP AUTH FAILED] Skipping sync for ${account.email}. Check credentials.`);
                    } else {
                        console.warn(`[IMAP ERROR] Skipping sync for ${account.email}: ${errMsg}`);
                    }
                    imapWarnings.push(`${account.email}: ${errMsg}`);
                    continue; // Move to next account — never fails the overall request
                }

                console.log(`[IMAP SYNC] Fetched ${emails.length} message(s) for ${account.email}`);

                for (const email of emails) {
                    const { data: existing } = await supabaseAdmin
                        .from('inbox')
                        .select('id')
                        .eq('message_id', email.message_id)
                        .maybeSingle();

                    if (!existing) {
                        await supabaseAdmin.from('inbox').insert({
                            sender: email.sender,
                            subject: email.subject,
                            content: email.content,
                            received_at: email.date.toISOString(),
                            is_read: false,
                            tags: ['IMAP'],
                            message_id: email.message_id,
                            folder: email.folder ?? 'inbox',   // ← new folder column
                            user_id: user.id
                        });
                        totalNewCount++;
                    }
                }
            }

            return NextResponse.json({
                success: true,
                count: totalNewCount,
                ...(imapWarnings.length > 0 ? { imapWarnings } : {})
            });
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
    const hasAccess = await checkServerActionPermission('inbox_delete');
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Support single ID (query param) or bulk IDs (request body)
    let idsToProcess: string[] = [];
    if (id) {
        idsToProcess = [id];
    } else {
        try {
            const body = await request.json();
            if (body.ids && Array.isArray(body.ids)) idsToProcess = body.ids;
        } catch { /* empty or non-JSON body is fine */ }
    }

    if (idsToProcess.length === 0) {
        return NextResponse.json({ error: 'ID or IDs required' }, { status: 400 });
    }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // ── Smart Deletion Router ──────────────────────────────────────────────────
        // Strategy depends on the current folder the email lives in.
        // We process each id individually to apply folder-specific logic.
        // For bulk deletes all ids are expected to be from the same folder;
        // we fetch folder for the first id as the reference.
        const { data: emailRows, error: fetchError } = await supabase
            .from('inbox')
            .select('id, folder')
            .in('id', idsToProcess)
            .eq('user_id', user.id);

        if (fetchError) throw fetchError;
        if (!emailRows || emailRows.length === 0) {
            return NextResponse.json({ error: 'No matching emails found' }, { status: 404 });
        }

        // Group by required action
        const toMoveTrash: string[] = [];
        const toHardDelete: string[] = [];
        const toSoftDelete: string[] = [];

        for (const row of emailRows) {
            const f: string = row.folder ?? 'inbox';
            if (f === 'inbox' || f === 'spam') {
                // Soft move → retain for audit, disappears from inbox/spam
                toMoveTrash.push(row.id);
            } else if (f === 'sent' || f === 'bounced') {
                // Hard delete → these are outgoing/system records, no trash needed
                toHardDelete.push(row.id);
            } else if (f === 'trash') {
                // User confirms permanent delete → set flag, admin can still audit
                toSoftDelete.push(row.id);
            } else {
                // Fallback: hard delete anything unknown
                toHardDelete.push(row.id);
            }
        }

        // Apply: move to trash
        if (toMoveTrash.length > 0) {
            const { error } = await supabase
                .from('inbox').update({ folder: 'trash' }).in('id', toMoveTrash).eq('user_id', user.id);
            if (error) throw error;
        }

        // Apply: hard delete
        if (toHardDelete.length > 0) {
            const { error } = await supabase
                .from('inbox').delete().in('id', toHardDelete).eq('user_id', user.id);
            if (error) throw error;
        }

        // Apply: soft delete (user thinks it's gone; admin can still see it)
        if (toSoftDelete.length > 0) {
            const { error } = await supabase
                .from('inbox').update({ deleted_by_user: true }).in('id', toSoftDelete).eq('user_id', user.id);
            if (error) throw error;
        }

        return NextResponse.json({
            success: true,
            summary: {
                moved_to_trash: toMoveTrash.length,
                hard_deleted: toHardDelete.length,
                soft_deleted: toSoftDelete.length,
            }
        });
    } catch (error: unknown) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
