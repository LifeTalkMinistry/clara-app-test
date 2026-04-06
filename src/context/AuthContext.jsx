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
      setTimeout(() => reject(new Error("Auth request timed out."))
    )),
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
      const { error } = await withTimeout(
        supabase.from("profiles").upsert(payload, { onConflict: "id" }),
        8000
      );

      if (error) {
        console.error("ensureBasicProfile error:", error);
      }
    } catch (error) {
      console.error("ensureBasicProfile timeout/error:", error);
    }
  }, []);

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

        const currentSession = data?.session ?? null;
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

      const nextUser = nextSession?.user ?? null;

      setSession(nextSession ?? null);
      setUser(nextUser);

      if (nextUser?.id) {
        ensureBasicProfile(nextUser);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureBasicProfile]);

  const signUp = async ({ email, password, fullName }) => {
    const cleanedEmail = email?.trim();
    const cleanedName = fullName?.trim();

    if (!cleanedEmail) throw new Error("Email is required.");
    if (!password) throw new Error("Password is required.");
    if (!cleanedName) throw new Error("Full name is required.");

    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email: cleanedEmail,
        password,
        options: {
          data: {
            full_name: cleanedName,
          },
        },
      }),
      8000
    );

    if (error) throw error;

    if (data?.user?.id) {
      ensureBasicProfile(data.user, cleanedName);
    }

    return data;
  };

  const signIn = async ({ email, password }) => {
    const cleanedEmail = email?.trim();

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password,
      }),
      8000
    );

    if (error) throw error;

    if (data?.user?.id) {
      ensureBasicProfile(data.user);
    }

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

        return data || null;
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
      ensureBasicProfile,
    }),
    [user, session, loading, refreshProfile, ensureBasicProfile]
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