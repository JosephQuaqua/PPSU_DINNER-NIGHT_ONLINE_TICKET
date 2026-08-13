import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { ProfileRow, StaffRole } from '@/types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  staffRoles: StaffRole[];
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  isGateStaff: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [staffRoles, setStaffRoles] = useState<StaffRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(data as ProfileRow | null);
  };

  const loadStaffRoles = async (userId: string) => {
    const { data } = await supabase.from('staff_roles').select('role').eq('user_id', userId);
    const roles = (data || []).map((r) => r.role as StaffRole);
    setStaffRoles(roles);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
      await loadStaffRoles(user.id);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        Promise.all([loadProfile(session.user.id), loadStaffRoles(session.user.id)]).finally(() =>
          setLoading(false),
        );
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          await loadProfile(session.user.id);
          await loadStaffRoles(session.user.id);
          setLoading(false);
        })();
      } else {
        setProfile(null);
        setStaffRoles([]);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setStaffRoles([]);
  };

  const isStaff = staffRoles.length > 0;
  const isAdmin = staffRoles.includes('super_admin') || staffRoles.includes('event_admin');
  const isGateStaff = isStaff || staffRoles.includes('gate_staff');

  return (
    <AuthContext.Provider
      value={{ session, user, profile, staffRoles, loading, isStaff, isAdmin, isGateStaff, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
