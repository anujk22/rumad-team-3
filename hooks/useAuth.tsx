import { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    initialized: boolean;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    initialized: false,
});

export function useAuth() {
    return useContext(AuthContext);
}

// Set to TRUE to bypass Supabase Login & Email Confirmations for UI testing
const DEV_BYPASS = true;

const mockUser = {
    id: '00000000-0000-0000-0000-000000000000',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
} as User;

const mockSession = {
    access_token: 'mock-token',
    refresh_token: 'mock-token',
    expires_in: 3600,
    expires_at: 3600,
    token_type: 'bearer',
    user: mockUser,
} as Session;

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(DEV_BYPASS ? mockSession : null);
    const [user, setUser] = useState<User | null>(DEV_BYPASS ? mockUser : null);
    const [initialized, setInitialized] = useState<boolean>(DEV_BYPASS ? true : false);

    useEffect(() => {
        if (DEV_BYPASS) return;

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setInitialized(true);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ session, user, initialized }}>
            {children}
        </AuthContext.Provider>
    );
}
