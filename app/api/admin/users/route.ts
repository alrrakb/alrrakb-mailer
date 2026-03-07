import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Helper to get admin client at runtime
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    );
}

export async function GET(req: Request) {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        // Single-user permissions fetch (used by UserPermissionsModal)
        // Uses service role to bypass RLS (`auth.uid() = id` blocks admin reads of other users)
        if (userId) {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('permissions')
                .eq('id', userId)
                .maybeSingle(); // maybeSingle() returns null instead of 406 when row doesn't exist

            if (error) throw error;
            return NextResponse.json({ permissions: data?.permissions ?? null });
        }

        // Full user list fetch (existing behaviour)
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) throw error;

        // Fetch profiles separately (Supabase Auth doesn't join with public tables automatically)
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('*');

        if (profilesError) console.error('Error fetching profiles:', profilesError);

        // Merge data
        const enrichedUsers = users.map((user) => {
            const profile = profiles?.find((p) => p.id === user.id);
            return {
                ...user,
                profile: profile || {}
            };
        });

        return NextResponse.json(enrichedUsers);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true // Auto-confirm email
        });

        if (error) throw error;

        return NextResponse.json(data.user);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, action, password } = body;

        if (!id || !action) {
            return NextResponse.json({ error: 'ID and action are required' }, { status: 400 });
        }

        let updateAttributes: Partial<{ ban_duration: string; password?: string }> = {};

        if (action === 'suspend') {
            updateAttributes = { ban_duration: '876000h' }; // ~100 years
        } else if (action === 'activate') {
            updateAttributes = { ban_duration: 'none' };
        } else if (action === 'reset_password') {
            if (!password) return NextResponse.json({ error: 'New password is required' }, { status: 400 });
            updateAttributes = { password: password };
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updateAttributes);

        if (error) {
            console.error('Supabase Admin Error:', error);
            throw error;
        }

        return NextResponse.json({ message: `Action ${action} completed successfully`, user: data.user });
    } catch (error: unknown) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    // Update a user's permissions — must use service role to bypass RLS
    // (RLS policy `auth.uid() = id` blocks admins from writing to OTHER users' profiles)
    try {
        const body = await req.json();
        const { userId, permissions } = body;

        if (!userId || !permissions) {
            return NextResponse.json({ error: 'userId and permissions are required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Upsert: create the profile row if it doesn't exist yet
        const { error } = await supabaseAdmin
            .from('profiles')
            .upsert({ id: userId, permissions, updated_at: new Date().toISOString() }, { onConflict: 'id' });

        if (error) {
            console.error('[Permissions PUT] DB error:', error);
            throw error;
        }

        console.log(`[Permissions PUT] Updated permissions for user ${userId}`);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error('[Permissions PUT] API Error:', error);
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('id');

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (error) throw error;

        return NextResponse.json({ message: 'User deleted successfully' });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
