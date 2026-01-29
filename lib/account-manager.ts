import { Session } from '@supabase/supabase-js';

const STORAGE_KEY = 'marketing_mailer_accounts';

export interface StoredAccount {
    email: string;
    avatar_url?: string;
    full_name?: string;
    session: Session;
    last_active: number;
    isSaved?: boolean;
}

export const accountManager = {
    getAccounts: (): StoredAccount[] => {
        if (typeof window === 'undefined') return [];
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to parse stored accounts', e);
            return [];
        }
    },

    addAccount: (session: Session) => {
        if (typeof window === 'undefined' || !session.user.email) return;

        const accounts = accountManager.getAccounts();
        const existingIndex = accounts.findIndex(a => a.email === session.user.email);

        const newAccount: StoredAccount = {
            email: session.user.email,
            avatar_url: session.user.user_metadata.avatar_url,
            full_name: session.user.user_metadata.full_name,
            session: session,
            last_active: Date.now(),
            isSaved: existingIndex >= 0 ? accounts[existingIndex].isSaved : false,
        };

        if (existingIndex >= 0) {
            accounts[existingIndex] = newAccount;
        } else {
            accounts.push(newAccount);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    },



    updateLastActive: (email: string) => {
        if (typeof window === 'undefined') return;
        const accounts = accountManager.getAccounts();
        const index = accounts.findIndex(a => a.email === email);
        if (index >= 0) {
            accounts[index].last_active = Date.now();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        }
    },

    markAsSaved: (email: string) => {
        if (typeof window === 'undefined') return;
        const accounts = accountManager.getAccounts();
        const index = accounts.findIndex(a => a.email === email);
        if (index >= 0) {
            accounts[index].isSaved = true;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
        }
    },

    getSavedAccounts: (): StoredAccount[] => {
        return accountManager.getAccounts().filter(a => a.isSaved);
    },

    removeAccount: (email: string) => {
        if (typeof window === 'undefined') return;
        // If removing completely (e.g. from the list), we delete it from storage
        const accounts = accountManager.getAccounts().filter(a => a.email !== email);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    }
};
