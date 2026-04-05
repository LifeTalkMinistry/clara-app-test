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

const withTimeout = (promise, ms = 8000) => {
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

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          8000
        );

        if (!mounted) return;

        if (error) {
          console.error("getSession error:", error);
        }

        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      } catch (error) {
        console.error("loadSession error:", error);
        if (!mounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async ({ email, password, fullName }) => {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || "",
          },
        },
      }),
      8000
    );

    if (error) throw error;
    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password,
      }),
      8000
    );

    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await withTimeout(supabase.auth.signOut(), 8000);
    if (error) throw error;
  };

  const refreshProfile = useCallback(
    async (targetUserId) => {
      const profileId = targetUserId || user?.id;

      if (!profileId) return null;

      try {
        const { data, error } = await withTimeout(
          supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
          8000
        );

        if (error) {
          console.error("Profile fetch error:", error);
          return null;
        }

        return data;
      } catch (error) {
        console.error("refreshProfile timeout/error:", error);
        return null;
      }
    },
    [user?.id]
  );

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