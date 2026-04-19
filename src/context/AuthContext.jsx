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

const normalizeProfileAccess = (rawProfile = {}, authUser = null) => {
  const enrollmentStatus = String(rawProfile?.enrollment_status || "none").toLowerCase();
  const enrollmentSource = String(rawProfile?.enrollment_source || "").toLowerCase();
  const profilePlan = String(rawProfile?.plan || "").toLowerCase();
  const profileStatus = String(rawProfile?.status || "").toLowerCase();
  const profileRole = String(rawProfile?.role || "user").toLowerCase();

  const isGooglePlay = enrollmentSource === "google_play";
  const isApproved = enrollmentStatus === "approved";
  const isPaidPlan =
    profilePlan === "entry" ||
    profilePlan === "core" ||
    profilePlan === "coach" ||
    profilePlan === "coaching" ||
    profilePlan === "pro" ||
    profilePlan === "premium" ||
    profilePlan === "paid";

  const isPaidStatus =
    profileStatus === "approved" ||
    profileStatus === "active" ||
    profileStatus === "pro" ||
    profileStatus === "premium";

  const isPro = Boolean(
    isApproved || isGooglePlay || isPaidPlan || isPaidStatus
  );

  return {
    id: rawProfile?.id || authUser?.id || null,
    email: rawProfile?.email || authUser?.email || null,
    full_name:
      rawProfile?.full_name ||
      authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      "",
    plan: rawProfile?.plan || (isPro ? "pro" : "free"),
    role: profileRole || "user",
    enrollment_source: rawProfile?.enrollment_source || null,
    enrollment_status: rawProfile?.enrollment_status || (isPro ? "approved" : "none"),
    status: rawProfile?.status || (isPro ? "active" : "free"),
    is_enrolled:
      typeof rawProfile?.is_enrolled === "boolean" ? rawProfile.is_enrolled : isPro,
    program_active:
      typeof rawProfile?.program_active === "boolean"
        ? rawProfile.program_active || isPro
        : isPro,
    onboarding_completed: Boolean(rawProfile?.onboarding_completed ?? false),
    onboarding_step: Number(rawProfile?.onboarding_step ?? 0),
    program_onboarding_completed: Boolean(
      rawProfile?.program_onboarding_completed ?? false
    ),
    has_completed_program_onboarding: Boolean(
      rawProfile?.has_completed_program_onboarding ??
        rawProfile?.program_onboarding_completed ??
        false
    ),
    has_completed_universal_onboarding: Boolean(
      rawProfile?.has_completed_universal_onboarding ??
        rawProfile?.onboarding_completed ??
        false
    ),
    has_seen_universal_onboarding: Boolean(
      rawProfile?.has_seen_universal_onboarding ??
        rawProfile?.onboarding_completed ??
        false
    ),
    isPro,
  };
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

  const fetchProfile = useCallback(
    async (authUser) => {
      if (!authUser?.id) return null;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const normalized = normalizeProfileAccess(data, authUser);
          setProfile(normalized);
          return normalized;
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

        const fallbackProfile = normalizeProfileAccess(
          ensuredProfile || {
            id: authUser.id,
            email: authUser.email || null,
            full_name:
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              "",
            plan: "free",
            role: "user",
            enrollment_source: null,
            enrollment_status: "none",
            status: "free",
            is_enrolled: false,
            program_active: false,
            onboarding_completed: false,
            onboarding_step: 0,
            program_onboarding_completed: false,
            has_completed_program_onboarding: false,
            has_completed_universal_onboarding: false,
            has_seen_universal_onboarding: false,
          },
          authUser
        );

        setProfile(fallbackProfile);
        return fallbackProfile;
      } catch (error) {
        console.error("fetchProfile error:", error);

        const fallbackProfile = normalizeProfileAccess(
          {
            id: authUser.id,
            email: authUser.email || null,
            full_name:
              authUser.user_metadata?.full_name ||
              authUser.user_metadata?.name ||
              "",
            plan: "free",
            role: "user",
            enrollment_source: null,
            enrollment_status: "none",
            status: "free",
            is_enrolled: false,
            program_active: false,
            onboarding_completed: false,
            onboarding_step: 0,
            program_onboarding_completed: false,
            has_completed_program_onboarding: false,
            has_completed_universal_onboarding: false,
            has_seen_universal_onboarding: false,
          },
          authUser
        );

        setProfile(fallbackProfile);
        return fallbackProfile;
      }
    },
    [ensureBasicProfile]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await withTimeout(supabase.auth.getSession());

        if (!mounted) return;

        const currentUser = currentSession?.user ?? null;

        setSession(currentSession);
        setUser(currentUser);
        setLoading(false);
        setAuthReady(true);

        if (currentUser?.id) {
          fetchProfile(currentUser);
        } else {
          setProfile(null);
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
  }, [fetchProfile]);

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
    setLoading(false);
    setAuthReady(true);
  };

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return null;
    return await fetchProfile(user);
  }, [user, fetchProfile]);

  const value = useMemo(() => {
    const computedIsPro = Boolean(profile?.isPro);

    return {
      user,
      session,
      profile,
      loading,
      authReady,
      isAuthenticated: !!user,
      isPro: computedIsPro,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    };
  }, [user, session, profile, loading, authReady, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}