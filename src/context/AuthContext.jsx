import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { supabase } from "@/lib/supabaseClient";
import { normalizePlanKey, PLAN_LABELS } from "@/lib/plan-config";

const AuthContext = createContext(null);

const withTimeout = (promise, ms = 15000) => {
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
    profilePlan === "pro_99" ||
    profilePlan === "core_599" ||
    profilePlan === "coaching_1299" ||
    profilePlan === "pro" ||
    profilePlan === "core" ||
    profilePlan === "lifeos" ||
    profilePlan === "life_os" ||
    profilePlan === "premium" ||
    profilePlan === "paid";

  const isPaidStatus =
    profileStatus === "approved" ||
    profileStatus === "active" ||
    profileStatus === "pro" ||
    profileStatus === "premium";

  const isPro = Boolean(isApproved || isGooglePlay || isPaidPlan || isPaidStatus);

  const normalizedPlan = normalizePlanKey(rawProfile?.plan || (isPro ? "pro" : "free"));
  const subscriptionStatus =
    normalizedPlan === "free"
      ? "free"
      : normalizedPlan === "pro_99"
        ? "pro"
        : normalizedPlan === "core_599"
          ? "core"
          : "life_os";

  return {
    id: rawProfile?.id || authUser?.id || null,
    email: rawProfile?.email || authUser?.email || null,
    full_name:
      rawProfile?.full_name ||
      authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      "",
    plan: normalizedPlan,
    subscription_status: subscriptionStatus,
    activation_status: rawProfile?.activation_status || "not_required",
    is_activated: Boolean(
      rawProfile?.is_activated ||
        rawProfile?.activated_at ||
        ["active", "activated"].includes(
          String(rawProfile?.activation_status || "").toLowerCase()
        )
    ),
    activated_at: rawProfile?.activated_at || null,
    subscription_label: PLAN_LABELS[normalizedPlan] || "Free",
    subscription: {
      plan: normalizedPlan,
      status: subscriptionStatus,
      label: PLAN_LABELS[normalizedPlan] || "Free",
      isPaid: normalizedPlan !== "free" || isPro,
      isPro: isPro || normalizedPlan === "pro_99",
      isCore: normalizedPlan === "core_599",
      isLifeOS: normalizedPlan === "coaching_1299",
    },
    role: profileRole || "user",
    enrollment_source: rawProfile?.enrollment_source || null,
    enrollment_status: rawProfile?.enrollment_status || (isPro ? "approved" : "none"),
    status: rawProfile?.status || (isPro ? "active" : "free"),
    app_theme:
      rawProfile?.app_theme ||
      rawProfile?.theme_key ||
      rawProfile?.dashboard_theme ||
      null,
    is_enrolled:
      typeof rawProfile?.is_enrolled === "boolean" ? rawProfile.is_enrolled : isPro,
    program_active:
      typeof rawProfile?.program_active === "boolean"
        ? rawProfile.program_active || isPro
        : isPro,
    onboarding_completed: Boolean(rawProfile?.onboarding_completed ?? false),
    onboarding_step: Number(rawProfile?.onboarding_step ?? 0),
    program_onboarding_completed: Boolean(rawProfile?.program_onboarding_completed ?? false),
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

  const initializedRef = useRef(false);
  const authRunIdRef = useRef(0);

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

  const applySession = useCallback(
    async (nextSession, { markInitialized = false } = {}) => {
      const runId = authRunIdRef.current + 1;
      authRunIdRef.current = runId;

      const nextUser = nextSession?.user ?? null;

      setLoading(true);
      setSession(nextSession ?? null);
      setUser(nextUser);

      if (!nextUser?.id) {
        setProfile(null);
        if (authRunIdRef.current === runId) {
          if (markInitialized) initializedRef.current = true;
          setLoading(false);
          setAuthReady(true);
        }
        return null;
      }

      const nextProfile = await fetchProfile(nextUser);

      if (authRunIdRef.current === runId) {
        if (markInitialized) initializedRef.current = true;
        setLoading(false);
        setAuthReady(true);
      }

      return nextProfile;
    },
    [fetchProfile]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        setAuthReady(false);

        const {
          data: { session: currentSession },
        } = await withTimeout(supabase.auth.getSession());

        if (!mounted) return;
        await applySession(currentSession, { markInitialized: true });
      } catch (error) {
        console.error("init auth error:", error);

        if (!mounted) return;

        initializedRef.current = true;
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      if (event === "INITIAL_SESSION" && !initializedRef.current) {
        return;
      }

      window.setTimeout(() => {
        if (!mounted) return;
        applySession(nextSession).catch((error) => {
          console.error("auth state change error:", error);
          setLoading(false);
          setAuthReady(true);
        });
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channel = supabase
      .channel(`profile-live-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        () => {
          fetchProfile(user).catch((error) => {
            console.error("Profile realtime refresh error:", error);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfile, user]);

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

    await applySession(data?.session ?? null);

    return data;
  };

  const signInWithGoogle = async () => {
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) throw error;

    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    initializedRef.current = true;
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
      signInWithGoogle,
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
