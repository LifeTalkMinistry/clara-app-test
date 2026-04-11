import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext(null);

const withTimeout = (promise, ms = 10000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Auth request timed out.")), ms)
    ),
  ]);
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureBasicProfile = useCallback(async (authUser, fallbackName = "") => {
    if (!authUser?.id) return null;

    const payload = {
      id: authUser.id,
      email: authUser.email || null,
      full_name:
        fallbackName?.trim() ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        null,
    };

    try {
      await supabase.from("profiles").upsert(payload, { onConflict: "id" });
    } catch (error) {
      console.error("ensureBasicProfile error:", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await withTimeout(supabase.auth.getSession(), 10000);

        if (!mounted) return;

        const currentUser = currentSession?.user ?? null;

        setSession(currentSession);
        setUser(currentUser);

        if (currentUser?.id) {
          ensureBasicProfile(currentUser);
        }
      } catch (error) {
        console.error("loadSession error:", error);

        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) setLoading(false); // ✅ CRITICAL
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      const nextUser = nextSession?.user ?? null;

      setSession(nextSession ?? null);
      setUser(nextUser);

      if (nextUser?.id) {
        ensureBasicProfile(nextUser);
      }

      setLoading(false); // ✅ always release loading
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureBasicProfile]);

  const signUp = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (error) throw error;

    if (data?.user?.id) {
      ensureBasicProfile(data.user, fullName);
    }

    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;

    if (data?.user?.id) {
      ensureBasicProfile(data.user);
    }

    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = useCallback(async (targetUserId) => {
    const id = targetUserId || user?.id;
    if (!id) return null;

    try {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      return data || null;
    } catch {
      return null;
    }
  }, [user?.id]);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      isAuthenticated: !!user,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, session, loading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}