"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { accountManager } from '@/lib/account-manager';
import QuickLoginPrompt from './QuickLoginPrompt';

type AuthContextType = {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showSavePrompt, setShowSavePrompt] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const setData = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                setSession(session);
                setUser(session?.user ?? null);

                if (session) {
                    accountManager.addAccount(session);

                    if (typeof window !== 'undefined' && sessionStorage.getItem('prompt_save_after_reload') === 'true') {
                        const accounts = accountManager.getAccounts();
                        const current = accounts.find(a => a.email === session.user.email);
                        if (current && !current.isSaved) {
                            setShowSavePrompt(true);
                        }
                        sessionStorage.removeItem('prompt_save_after_reload');
                    }
                }
            } catch (error) {
                console.error("Auth session error:", error);
                setSession(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };


        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);

            if (_event === 'SIGNED_IN' && session) {
                // Check if account is saved. If NOT, prompt.
                // But wait, addAccount updates the account. We need to check if it WAS saved before?
                // Actually addAccount preserves isSaved.
                accountManager.addAccount(session);

                // Get the updated account to check status
                const accounts = accountManager.getAccounts();
                const current = accounts.find(a => a.email === session.user.email);

                // If explicitly NOT saved (false) or undefined, we might prompt.
                // To avoid spamming, maybe we only prompt if it is NOT true?
                // But if they clicked "No" before, we shouldn't annoy them every time?
                // For now, let's keep it simple: if not isSaved, prompt.
                // NOTE: If we want to remember "Don't ask again", we'd need another flag.
                // Assuming "No" means "Not this time/Not saved".
                if (current && !current.isSaved) {
                    setShowSavePrompt(true);
                }
            }

            if (_event === 'SIGNED_OUT') {
                // Optional: Remove unsaved accounts from storage logic here?
                // If they sign out and it wasn't saved, we probably shouldn't keep the token in valid storage 
                // distinguishable from just a "session". 
                // But account-manager stores Sessions.
                // Let's rely on QuickLoginList filtering by isSaved. 
                // So "Unsaved" accounts are just history that we don't show in the quick list.
                router.push('/login');
            }
        });

        setData();

        return () => {
            listener.subscription.unsubscribe();
        };
    }, [router]);

    const signOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        window.location.href = '/login'; // Force full reload to clear any memory/cache
    };

    const value = {
        session,
        user,
        isLoading,
        signOut,
    };

    const handleSaveAccount = () => {
        if (user?.email) {
            accountManager.markAsSaved(user.email);
            setShowSavePrompt(false);
        }
    };

    const handleDeclineSave = () => {
        setShowSavePrompt(false);
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading ? children : null}
            <QuickLoginPrompt
                isOpen={showSavePrompt}
                onSave={handleSaveAccount}
                onDecline={handleDeclineSave}
            />
        </AuthContext.Provider>
    );
}
