import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { UserPermissions } from '@/hooks/usePermissions';

export async function checkServerActionPermission(actionKey: keyof UserPermissions['actions']): Promise<boolean> {
    const cookieStore = await cookies();

    const supabaseAuth = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }); } catch { }
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options }); } catch { }
                },
            },
        }
    );

    // Get Auth verification from standard token
    const { data: { session } } = await supabaseAuth.auth.getSession();
    const user = session?.user;

    if (!user) return false;

    // Admin override (Hardcoded master email, role checking requires DB fetch below)
    if (user.email === 'admin@rrakb.com') return true;

    // Use Service Role to actually read the Profile permissions, bypassing RLS block
    const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            cookies: {
                get() { return ''; },
                set() { },
                remove() { }
            }
        }
    );

    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('permissions')
            .eq('id', user.id)
            .single();

        if (error || !data) {
            console.error('Failed to fetch user permissions on server:', error);
            return false; // Default to denying access if we can't fetch
        }

        const permissions = data.permissions as UserPermissions | null;

        if (!permissions || !permissions.actions) return false;

        return !!permissions.actions[actionKey];

    } catch (err) {
        console.error('Error checking server permissions:', err);
        return false;
    }
}
