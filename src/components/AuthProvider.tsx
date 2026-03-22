import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabaseBrowser, isSupabaseAuthConfigured } from "@/src/lib/supabaseBrowser";
import { setApiAuthTokenGetter } from "@/src/lib/api";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  /** Compat: nome + avatar para a sidebar */
  displayName: string | null;
  photoURL: string | null;
  loading: boolean;
  authConfigured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const supabaseReady = isSupabaseAuthConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseReady);

  useEffect(() => {
    if (!supabaseReady) {
      setApiAuthTokenGetter(() => null);
      setSession(null);
      setLoading(false);
      return;
    }

    const sb = supabaseBrowser!;

    void sb.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setApiAuthTokenGetter(() => s?.access_token ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setApiAuthTokenGetter(() => s?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabaseReady]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabaseBrowser) {
        throw new Error("Supabase não configurado (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).");
      }
      const { error } = await supabaseBrowser.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (!supabaseBrowser) return;
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) throw error;
  }, []);

  const value = useMemo(() => {
    const u = session?.user ?? null;
    const meta = u?.user_metadata as Record<string, string> | undefined;
    return {
      session,
      user: u,
      displayName:
        meta?.full_name ||
        meta?.name ||
        u?.email?.split("@")[0] ||
        null,
      photoURL: meta?.avatar_url || meta?.picture || null,
      loading,
      authConfigured: supabaseReady,
      signInWithPassword,
      signOut,
      logout: signOut,
    };
  }, [session, loading, signInWithPassword, signOut, supabaseReady]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve estar dentro de AuthProvider");
  return ctx;
};
