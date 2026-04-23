import { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type Profile = {
  id: string;
  email: string | null;
  first_name: string | null;
  age: number | null;
  gender: string | null;
  gender_preference: string | null;
  pronouns: string | null;
  height_inches: number | null;
  ethnicity: string | null;
  bio: string | null;
  zodiac_sign: string | null;
  avatar_urls: string[];
  academic_year: string | null;
  major: string | null;
  is_commuter: boolean;
  is_international: boolean;
  dating_enabled: boolean;
  friends_enabled: boolean;
  role: 'user' | 'event_manager' | 'admin';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  initialized: boolean;
  isAdmin: boolean;
  isEventManager: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  initialized: false,
  isAdmin: false,
  isEventManager: false,
  refreshProfile: async () => { },
  signOut: async () => { },
  deleteAccount: async () => { },
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialized, setInitialized] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        setProfile(null);
        return;
      }
      setProfile(data as Profile);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    const { error } = await supabase.rpc('delete_user_account');
    if (error) throw error;
    await handleSignOut();
  }, [handleSignOut]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      }
      setInitialized(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const isAdmin = profile?.role === 'admin';
  const isEventManager = profile?.role === 'event_manager' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        initialized,
        isAdmin,
        isEventManager,
        refreshProfile,
        signOut: handleSignOut,
        deleteAccount: handleDeleteAccount,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
