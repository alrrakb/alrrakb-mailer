import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';

export interface UserPermissions {
    pages: {
        inbox: boolean;
        compose: boolean;
        queue: boolean;
        history: boolean;
        hotels: boolean;
    };
    actions: {
        inbox_delete: boolean;
        compose_attach: boolean;
        compose_html: boolean;
        queue_delete: boolean;
        queue_send: boolean;
        history_delete: boolean;
        hotels_add: boolean;
        hotels_edit: boolean;
        hotels_delete: boolean;
    };
}

const DEFAULT_PERMISSIONS: UserPermissions = {
    pages: { inbox: true, compose: true, queue: true, history: true, hotels: true },
    actions: {
        inbox_delete: false,
        compose_attach: false,
        compose_html: false,
        queue_delete: false,
        queue_send: false,
        history_delete: false,
        hotels_add: false,
        hotels_edit: false,
        hotels_delete: false
    }
};

export function usePermissions() {
    const { user } = useAuth();
    const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
    const [role, setRole] = useState<string>('user');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchPermissions() {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('role, permissions')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                if (data) {
                    setRole(data.role || 'user');
                    if (data.permissions) {
                        // Merge in case of missing keys
                        setPermissions({
                            pages: { ...DEFAULT_PERMISSIONS.pages, ...(data.permissions.pages || {}) },
                            actions: { ...DEFAULT_PERMISSIONS.actions, ...(data.permissions.actions || {}) }
                        });
                    }
                }
            } catch (err: unknown) {
                console.error('Failed to fetch user permissions:', err instanceof Error ? err.message : String(err));
            } finally {
                setIsLoading(false);
            }
        }

        fetchPermissions();
    }, [user]);

    const hasAccess = (key: string): boolean => {
        // Admin override
        if (role === 'admin' || user?.email === 'admin@rrakb.com') {
            return true;
        }

        // Check pages
        if (key in permissions.pages) {
            return permissions.pages[key as keyof UserPermissions['pages']];
        }

        // Check actions
        if (key in permissions.actions) {
            return permissions.actions[key as keyof UserPermissions['actions']];
        }

        // Default to false if key not found
        return false;
    };

    return { hasAccess, role, permissions, isLoading };
}
