'use client';

/**
 * Who is signed in, and how strongly.
 *
 * The console's sign-in is two steps: a code sent to the operator's email
 * (Supabase Auth, the same email the app signs in with), then a code from an
 * authenticator app (Supabase MFA, TOTP). Supabase calls the strength the
 * "assurance level": aal1 after the email, aal2 after the authenticator.
 * Every operator screen needs aal2 — and the database itself (V037) refuses
 * operator powers to an aal1 session of anyone who has an authenticator, so a
 * stolen email code alone does nothing, here or anywhere.
 *
 * Signing out here signs out THIS browser only ('local'): Supabase's default
 * signs the account out everywhere, which once logged the operator's own
 * phone out of the app. "Sign out everywhere" is a separate, explicit action.
 * Either way the alerts stop first — here, or on every console.
 */

import type { Session, User } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { stopAlertsOnSignOut } from '@/lib/api/alerts';
import { getSupabase, supabaseConfigured } from '@/lib/supabase/client';

export type Aal = 'aal1' | 'aal2';

interface AuthValue {
  /** False until the stored session has been read. */
  ready: boolean;
  session: Session | null;
  user: User | null;
  /** What this session has proven. */
  aal: Aal | null;
  /** What this account could prove: aal2 once it has an authenticator. */
  nextAal: Aal | null;
  signOut(scope?: 'local' | 'global'): Promise<void>;
  /** Re-reads the assurance level, after an MFA step. */
  refresh(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Without a project to ask, there is nothing to wait for.
  const [ready, setReady] = useState(() => !supabaseConfigured());
  const [session, setSession] = useState<Session | null>(null);
  const [levels, setLevels] = useState<{ aal: Aal | null; nextAal: Aal | null }>({ aal: null, nextAal: null });

  const readLevels = useCallback(async () => {
    const { data } = await getSupabase().auth.mfa.getAuthenticatorAssuranceLevel();
    setLevels({ aal: (data?.currentLevel as Aal | null) ?? null, nextAal: (data?.nextLevel as Aal | null) ?? null });
  }, []);

  useEffect(() => {
    if (!supabaseConfigured()) return;
    const supabase = getSupabase();
    let cancelled = false;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) await readLevels();
      if (!cancelled) setReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (next) {
        void readLevels();
      } else {
        setLevels({ aal: null, nextAal: null });
        // Nothing from one person's session may show for the next.
        queryClient.clear();
      }
      if (event === 'SIGNED_OUT') queryClient.clear();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [queryClient, readLevels]);

  const signOut = useCallback(async (scope: 'local' | 'global' = 'local') => {
    // First, while the session can still say so: no more alerts here.
    await stopAlertsOnSignOut(scope === 'global');
    await getSupabase().auth.signOut({ scope });
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthValue>(() => ({
    ready,
    session,
    user: session?.user ?? null,
    aal: levels.aal,
    nextAal: levels.nextAal,
    signOut,
    refresh: readLevels,
  }), [ready, session, levels, signOut, readLevels]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** The authenticators on this account (verified ones only, unless `all`). */
export function useFactors(enabled = true) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'factors', user?.id ?? 'none'],
    enabled: enabled && Boolean(user),
    queryFn: async () => {
      const { data, error } = await getSupabase().auth.mfa.listFactors();
      if (error) throw error;
      return {
        verified: data.totp ?? [],
        all: data.all ?? [],
      };
    },
  });
}

/**
 * Whether the database counts this session as an operator. Asked again when
 * the assurance level changes: from V037 an aal1 session of an account with an
 * authenticator is not one, until the second step.
 */
export function useIsOperator() {
  const { user, aal } = useAuth();
  return useQuery({
    queryKey: ['me', 'operator', user?.id ?? 'none', aal ?? 'none'],
    enabled: Boolean(user),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await getSupabase().rpc('is_platform_admin');
      if (error) throw error;
      return data === true;
    },
  });
}

export interface MyProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  preferred_language: string | null;
}

export function useMyProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['me', 'profile', user?.id ?? 'none'],
    enabled: Boolean(user),
    queryFn: async (): Promise<MyProfile | null> => {
      const { data, error } = await getSupabase()
        .from('profiles').select('id, full_name, phone, preferred_language').eq('id', user!.id).maybeSingle();
      if (error) throw error;
      return (data as MyProfile | null) ?? null;
    },
  });
}
