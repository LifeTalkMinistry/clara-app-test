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
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const ensureBasicProfile = useCallback(async (authUser, fallbackName = "") => {
    if (!authUser?.id) return;

    try {
      await supabase.from("profiles").upsert(
        {
          id: authUser.id,
          email: authUser.email || null,
          full_name:
            fallbackName?.trim() ||
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            null,
        },
        { onConflict: "id" }
      );
    } catch (error) {
      console.error("ensureBasicProfile error:", error);
    }
  }, []);

  const fetchProfile = useCallback(async (authUser) => {
    if (!authUser?.id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        return;
      }

      await ensureBasicProfile(
        authUser,
        authUser.user_metadata?.full_name || authUser.user_metadata?.name || ""
      );

      const { data: ensuredProfile, error: retryError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (retryError) throw retryError;

      setProfile(
        ensuredProfile || {
          id: authUser.id,
          email: authUser.email || null,
          full_name:
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            "",
          plan: "free",
          role: "user",
          enrollment_status: "none",
          status: "free",
          is_enrolled: false,
          program_active: false,
          onboarding_completed: false,
          onboarding_step: 0,
        }
      );
    } catch (error) {
      console.error("fetchProfile error:", error);
      setProfile({
        id: authUser.id,
        email: authUser.email || null,
        full_name:
          authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          "",
        plan: "free",
        role: "user",
        enrollment_status: "none",
        status: "free",
        is_enrolled: false,
        program_active: false,
        onboarding_completed: false,
        onboarding_step: 0,
      });
    }
  }, [ensureBasicProfile]);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await withTimeout(supabase.auth.getSession());

        if (!mounted) return;

        const currentUser = session?.user ?? null;

        setSession(session);
        setUser(currentUser);

        // ✅ IMPORTANT: stop blocking UI here
        setLoading(false);
        setAuthReady(true);

        // ✅ Run profile in background (non-blocking)
        if (currentUser?.id) {
          fetchProfile(currentUser);
        }
      } catch (error) {
        console.error("init auth error:", error);

        if (!mounted) return;

        setSession(null);
        setUser(null);
        setProfile(null);

        setLoading(false);
        setAuthReady(true);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      const nextUser = nextSession?.user ?? null;

      setSession(nextSession ?? null);
      setUser(nextUser);

      // ✅ NEVER block here
      setLoading(false);
      setAuthReady(true);

      if (nextUser?.id) {
        fetchProfile(nextUser);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [ensureBasicProfile, fetchProfile]);

  const signUp = async ({ email, password, fullName }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    if (error) throw error;

    return data;
  };

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) throw error;

    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    await fetchProfile(user);
  }, [user?.id, fetchProfile]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      authReady,
      isAuthenticated: !!user,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, loading, authReady, refreshProfile]
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
