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
import { resolveMembership } from "@/lib/membership";
import {
  clearAccessSnapshot,
  getAccessSnapshot,
  getOfflineFallbackFlow,
  isAccessNetworkOffline,
  isAccessSnapshotUsable,
  saveAccessSnapshot,
} from "@/lib/offline-access-cache";

const AuthContext = createContext(null);

const AUTH_TIMEOUT_MS = 6000;
const PROFILE_TIMEOUT_MS = 6500;

// TEMP AUTH BYPASS: Used while Supabase project is restricted. Remove or disable when Supabase Auth is restored.
const TEMP_AUTH_BYPASS_ENABLED = false;

const LOCAL_DEV_AUTH_USER = {
  id: "local-dev-user",
  email: "local@clara.app",
  display_name: "CLARA User",
  role: "user",
  subscription_status: "active",
  subscription_label: "Committed",
  plan_key: "committed_249",
};

const withTimeout = (promise, ms = AUTH_TIMEOUT_MS) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Auth request timed out.")), ms)
    ),
  ]);
};

const buildLocalFallbackUser = () => ({
  ...LOCAL_DEV_AUTH_USER,
  app_metadata: {},
  user_metadata: {
    full_name: LOCAL_DEV_AUTH_USER.display_name,
    name: LOCAL_DEV_AUTH_USER.display_name,
    display_name: LOCAL_DEV_AUTH_USER.display_name,
    role: LOCAL_DEV_AUTH_USER.role,
    plan_key: LOCAL_DEV_AUTH_USER.plan_key,
    subscription_label: LOCAL_DEV_AUTH_USER.subscription_label,
  },
});

const isLocalFallbackUser = (authUser) => authUser?.id === LOCAL_DEV_AUTH_USER.id;

const normalizeProfileAccess = (rawProfile = {}, authUser = null) => {
  const role = String(rawProfile?.role || "user").toLowerCase();
  const membership = resolveMembership({
    profile: rawProfile,
    isAdmin: role === "admin",
    isAdvertiser: role === "advertiser",
  });
  const fullName =
    rawProfile?.full_name ||
    rawProfile?.display_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    "";
  return {
    ...rawProfile,
    id: rawProfile?.id || authUser?.id || null,
    email: rawProfile?.email || authUser?.email || null,
    display_name: rawProfile?.display_name || fullName,
    full_name: fullName,
    plan: membership.planKey,
    plan_key: membership.planKey,
    subscription_plan: membership.planKey,
    access_level: membership.accessLevel,
    subscription_status:
      membership.membershipStatus === "active"
        ? "active"
        : membership.membershipStatus === "pending"
          ? "pending"
          : "free",
    subscription_label: membership.planLabel,
    subscription: {
      plan: membership.planKey,
      access_level: membership.accessLevel,
      status: membership.membershipStatus,
      label: membership.planLabel,
      isPaid: membership.isActiveCommitted,
      isCommitted: membership.isCommittedPlan,
      isActiveCommitted: membership.isActiveCommitted,
    },
    role,
    enrollment_source: rawProfile?.enrollment_source || null,
    enrollment_status:
      rawProfile?.enrollment_status ||
      (membership.isActiveCommitted
        ? "approved"
        : membership.isPendingActivation
          ? "pending"
          : "none"),
    status:
      rawProfile?.status ||
      (membership.isActiveCommitted
        ? "active"
        : membership.isPendingActivation
          ? "pending"
          : "free"),
    activation_status:
      rawProfile?.activation_status ||
      (membership.isActiveCommitted
        ? "active"
        : membership.isPendingActivation
          ? "pending"
          : "not_required"),
    is_activated: membership.isActiveCommitted,
    activated_at: rawProfile?.activated_at || null,
    is_enrolled:
      typeof rawProfile?.is_enrolled === "boolean"
        ? rawProfile.is_enrolled
        : membership.isActiveCommitted,
    program_active:
      typeof rawProfile?.program_active === "boolean"
        ? rawProfile.program_active
        : membership.isActiveCommitted,
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
    offline_access: Boolean(rawProfile?.offline_access),
    offline_limited_access: Boolean(rawProfile?.offline_limited_access),
    offline_access_notice: rawProfile?.offline_access_notice || "",
    offline_access_snapshot: rawProfile?.offline_access_snapshot || null,
    isPro: membership.isActiveCommitted,
  };
};

const buildLocalFallbackProfile = (authUser = buildLocalFallbackUser()) =>
  normalizeProfileAccess(
    {
      id: LOCAL_DEV_AUTH_USER.id,
      email: LOCAL_DEV_AUTH_USER.email,
      full_name: LOCAL_DEV_AUTH_USER.display_name,
      display_name: LOCAL_DEV_AUTH_USER.display_name,
      role: LOCAL_DEV_AUTH_USER.role,
      plan: "committed_249",
      plan_key: LOCAL_DEV_AUTH_USER.plan_key,
      access_level: "committed",
      subscription_status: LOCAL_DEV_AUTH_USER.subscription_status,
      subscription_label: LOCAL_DEV_AUTH_USER.subscription_label,
      activation_status: "active",
      is_activated: true,
      activated_at: new Date(0).toISOString(),
      enrollment_source: "local_auth_fallback",
      enrollment_status: "approved",
      status: "active",
      is_enrolled: true,
      program_active: true,
      onboarding_completed: true,
      onboarding_step: 0,
      program_onboarding_completed: true,
      has_completed_program_onboarding: true,
      has_completed_universal_onboarding: true,
      has_seen_universal_onboarding: true,
      offline_access: true,
      offline_limited_access: false,
      offline_access_notice:
        "CLARA is using temporary local access while Supabase Auth is unavailable.",
      offline_access_snapshot: null,
    },
    authUser
  );

const buildCachedUser = (cachedSnapshot = null, authUser = null) => {
  if (!cachedSnapshot || !isAccessSnapshotUsable(cachedSnapshot)) {
    return authUser || null;
  }

  return {
    ...(authUser || {}),
    id:
      authUser?.id ||
      cachedSnapshot.userId ||
      cachedSnapshot.profileBasic?.id ||
      null,
    email:
      authUser?.email ||
      cachedSnapshot.email ||
      cachedSnapshot.profileBasic?.email ||
      null,
    user_metadata: {
      ...(authUser?.user_metadata || {}),
      full_name:
        authUser?.user_metadata?.full_name ||
        cachedSnapshot.profileBasic?.full_name ||
        cachedSnapshot.profile?.full_name ||
        "",
      name:
        authUser?.user_metadata?.name ||
        cachedSnapshot.profileBasic?.full_name ||
        cachedSnapshot.profile?.full_name ||
        "",
    },
  };
};

const buildDefaultOfflineProfile = (authUser, cachedSnapshot = null) => {
  if (cachedSnapshot && isAccessSnapshotUsable(cachedSnapshot)) {
    const fallbackFlow = getOfflineFallbackFlow(cachedSnapshot);
    const cachedProfile = cachedSnapshot.profileBasic || cachedSnapshot.profile || {};

    return normalizeProfileAccess(
      {
        ...cachedProfile,
        id: cachedSnapshot.userId || cachedProfile.id || authUser?.id || null,
        email: cachedSnapshot.email || cachedProfile.email || authUser?.email || null,
        role: cachedSnapshot.role || cachedProfile.role || "user",
        plan: cachedSnapshot.plan || cachedProfile.plan || "free",
        subscription_status:
          cachedSnapshot.subscriptionStatus ||
          cachedProfile.subscription_status ||
          cachedProfile.status ||
          "free",
        subscription_label:
          cachedSnapshot.planLabel || cachedProfile.subscription_label || "Free",
        status: cachedSnapshot.accessStatus || cachedProfile.status || "free",
        onboarding_completed: true,
        has_completed_universal_onboarding: true,
        has_seen_universal_onboarding: true,
        program_onboarding_completed:
          cachedSnapshot.programOnboardingCompleted ??
          cachedProfile.program_onboarding_completed ??
          cachedProfile.has_completed_program_onboarding ??
          true,
        has_completed_program_onboarding:
          cachedSnapshot.programOnboardingCompleted ??
          cachedProfile.has_completed_program_onboarding ??
          cachedProfile.program_onboarding_completed ??
          true,
        offline_access: true,
        offline_limited_access: Boolean(fallbackFlow.limited),
        offline_access_notice: "You’re offline. CLARA is using your saved access state.",
        offline_access_snapshot: cachedSnapshot,
      },
      authUser
    );
  }

  return normalizeProfileAccess(
    {
      id: authUser?.id || null,
      email: authUser?.email || null,
      full_name:
        authUser?.user_metadata?.full_name ||
        authUser?.user_metadata?.name ||
        "",
      plan: "free",
      role: "user",
      enrollment_source: null,
      enrollment_status: "offline_limited",
      status: "free",
      subscription_status: "free",
      subscription_label: "Free",
      is_enrolled: false,
      program_active: false,
      onboarding_completed: true,
      onboarding_step: 0,
      program_onboarding_completed: true,
      has_completed_program_onboarding: true,
      has_completed_universal_onboarding: true,
      has_seen_universal_onboarding: true,
      offline_access: true,
      offline_limited_access: true,
      offline_access_notice: "Connect to the internet later to finish account setup.",
      offline_access_snapshot: null,
    },
    authUser
  );
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const initializedRef = useRef(false);
  const authRunIdRef = useRef(0);
  const profileRefreshRunIdRef = useRef(0);

  const finishReady = useCallback((runId, markInitialized = false) => {
    if (authRunIdRef.current !== runId) return;

    if (markInitialized) initializedRef.current = true;

    setLoading(false);
    setAuthReady(true);
  }, []);

  const ensureBasicProfile = useCallback(async (authUser, fallbackName = "") => {
    if (!authUser?.id || isLocalFallbackUser(authUser)) return;

    try {
      await withTimeout(
        supabase.from("profiles").upsert(
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
        ),
        PROFILE_TIMEOUT_MS
      );
    } catch (error) {
      console.error("ensureBasicProfile error:", error);
    }
  }, []);

  const saveProfileSnapshot = useCallback((authUser, normalizedProfile) => {
    if (!authUser?.id || !normalizedProfile || isLocalFallbackUser(authUser)) return;

    saveAccessSnapshot({
      user: authUser,
      profile: normalizedProfile,
      role: normalizedProfile.role,
      plan: normalizedProfile.plan,
      planLabel: normalizedProfile.subscription_label,
      subscriptionStatus: normalizedProfile.subscription_status,
      accessStatus: normalizedProfile.status,
      onboardingCompleted:
        normalizedProfile.onboarding_completed ||
        normalizedProfile.has_completed_universal_onboarding ||
        normalizedProfile.has_seen_universal_onboarding,
      programOnboardingCompleted:
        normalizedProfile.program_onboarding_completed ||
        normalizedProfile.has_completed_program_onboarding,
      lastResolvedAppFlow: "normal",
      lastValidRoute: "/dashboard",
    });
  }, []);

  const fetchProfile = useCallback(
    async (authUser, { silent = false, preferCache = true } = {}) => {
      if (!authUser?.id) return null;

      if (TEMP_AUTH_BYPASS_ENABLED && isLocalFallbackUser(authUser)) {
        const localProfile = buildLocalFallbackProfile(authUser);
        setProfile(localProfile);
        return localProfile;
      }

      const cachedSnapshot =
        preferCache &&
        (getAccessSnapshot(authUser.id) || getAccessSnapshot(authUser.email));

      if (preferCache && isAccessSnapshotUsable(cachedSnapshot)) {
        const cachedUser = buildCachedUser(cachedSnapshot, authUser);
        const offlineProfile = buildDefaultOfflineProfile(cachedUser, cachedSnapshot);

        setProfile(offlineProfile);

        if (!silent) {
          return offlineProfile;
        }
      }

      try {
        const { data, error } = await withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle(),
          PROFILE_TIMEOUT_MS
        );

        if (error) throw error;

        if (data) {
          const normalized = normalizeProfileAccess(data, authUser);
          setProfile(normalized);
          saveProfileSnapshot(authUser, normalized);
          return normalized;
        }

        await ensureBasicProfile(
          authUser,
          authUser.user_metadata?.full_name || authUser.user_metadata?.name || ""
        );

        const { data: ensuredProfile, error: retryError } = await withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle(),
          PROFILE_TIMEOUT_MS
        );

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
        saveProfileSnapshot(authUser, fallbackProfile);
        return fallbackProfile;
      } catch (error) {
        console.error("fetchProfile error:", error);

        if (TEMP_AUTH_BYPASS_ENABLED) {
          const localUser = buildLocalFallbackUser();
          const localProfile = buildLocalFallbackProfile(localUser);
          setSession(null);
          setUser(localUser);
          setProfile(localProfile);
          setLoading(false);
          setAuthReady(true);
          return localProfile;
        }

        const latestCachedSnapshot =
          getAccessSnapshot(authUser.id) || getAccessSnapshot(authUser.email);

        if (isAccessSnapshotUsable(latestCachedSnapshot) || isAccessNetworkOffline(error)) {
          const offlineProfile = buildDefaultOfflineProfile(authUser, latestCachedSnapshot);
          setProfile((currentProfile) => currentProfile || offlineProfile);
          return offlineProfile;
        }

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

        setProfile((currentProfile) => currentProfile || fallbackProfile);
        return fallbackProfile;
      }
    },
    [ensureBasicProfile, saveProfileSnapshot]
  );

  const refreshProfileSilently = useCallback(
    async (authUser) => {
      if (!authUser?.id) return null;

      const refreshRunId = profileRefreshRunIdRef.current + 1;
      profileRefreshRunIdRef.current = refreshRunId;

      try {
        const freshProfile = await fetchProfile(authUser, {
          silent: true,
          preferCache: false,
        });

        if (profileRefreshRunIdRef.current !== refreshRunId) return null;

        return freshProfile;
      } catch (error) {
        console.error("silent profile refresh error:", error);
        return null;
      }
    },
    [fetchProfile]
  );

  const applyCachedSnapshot = useCallback((nextUser, nextSession = null) => {
    if (!nextUser?.id && !nextUser?.email) return null;

    const cachedSnapshot =
      getAccessSnapshot(nextUser?.id) || getAccessSnapshot(nextUser?.email);

    if (!isAccessSnapshotUsable(cachedSnapshot)) return null;

    const cachedUser = buildCachedUser(cachedSnapshot, nextUser);
    const cachedProfile = buildDefaultOfflineProfile(cachedUser, cachedSnapshot);

    setSession(nextSession ?? null);
    setUser(cachedUser);
    setProfile(cachedProfile);
    setLoading(false);
    setAuthReady(true);

    return { user: cachedUser, profile: cachedProfile, snapshot: cachedSnapshot };
  }, []);

  const applyLocalAuthBypass = useCallback(() => {
    if (!TEMP_AUTH_BYPASS_ENABLED) return null;

    const localUser = buildLocalFallbackUser();
    const localProfile = buildLocalFallbackProfile(localUser);

    initializedRef.current = true;
    profileRefreshRunIdRef.current += 1;
    setSession(null);
    setUser(localUser);
    setProfile(localProfile);
    setLoading(false);
    setAuthReady(true);

    return { user: localUser, profile: localProfile };
  }, []);

  const applySession = useCallback(
    async (nextSession, { markInitialized = false, allowCached = true } = {}) => {
      const runId = authRunIdRef.current + 1;
      authRunIdRef.current = runId;

      const nextUser = nextSession?.user ?? null;

      if (!nextUser?.id && TEMP_AUTH_BYPASS_ENABLED) {
        const bypassResult = applyLocalAuthBypass();
        if (markInitialized) initializedRef.current = true;
        return bypassResult?.profile || null;
      }

      setSession(nextSession ?? null);
      setUser(nextUser);

      if (!nextUser?.id) {
        setProfile(null);
        finishReady(runId, markInitialized);
        return null;
      }

      const cachedApplied = allowCached ? applyCachedSnapshot(nextUser, nextSession) : null;

      if (cachedApplied) {
        if (markInitialized) initializedRef.current = true;

        refreshProfileSilently(cachedApplied.user).catch((error) => {
          console.error("background profile refresh error:", error);
        });

        return cachedApplied.profile;
      }

      if (!authReady) {
        setLoading(true);
      }

      const nextProfile = await fetchProfile(nextUser, {
        silent: false,
        preferCache: true,
      });

      finishReady(runId, markInitialized);

      if (nextProfile?.offline_access || nextProfile?.offline_limited_access) {
        refreshProfileSilently(nextUser).catch((error) => {
          console.error("background profile refresh error:", error);
        });
      }

      return nextProfile;
    },
    [
      applyCachedSnapshot,
      applyLocalAuthBypass,
      authReady,
      fetchProfile,
      finishReady,
      refreshProfileSilently,
    ]
  );

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const runId = authRunIdRef.current + 1;
      authRunIdRef.current = runId;

      try {
        setAuthReady(false);

        const cachedSnapshot = getAccessSnapshot();

        if (isAccessSnapshotUsable(cachedSnapshot)) {
          const cachedUser = buildCachedUser(cachedSnapshot);
          const cachedProfile = buildDefaultOfflineProfile(cachedUser, cachedSnapshot);

          initializedRef.current = true;
          setSession(null);
          setUser(cachedUser);
          setProfile(cachedProfile);
          setLoading(false);
          setAuthReady(true);
        } else if (TEMP_AUTH_BYPASS_ENABLED) {
          applyLocalAuthBypass();
        } else {
          setLoading(true);
        }

        const {
          data: { session: currentSession },
        } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS);

        if (!mounted) return;

        if (currentSession?.user?.id) {
          await applySession(currentSession, {
            markInitialized: true,
            allowCached: true,
          });
          return;
        }

        if (isAccessSnapshotUsable(cachedSnapshot)) {
          initializedRef.current = true;
          setLoading(false);
          setAuthReady(true);
          return;
        }

        if (TEMP_AUTH_BYPASS_ENABLED) {
          applyLocalAuthBypass();
          return;
        }

        if (authRunIdRef.current === runId) {
          initializedRef.current = true;
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          setAuthReady(true);
        }
      } catch (error) {
        console.error("init auth error:", error);

        if (!mounted) return;

        const cachedSnapshot = getAccessSnapshot();

        if (isAccessSnapshotUsable(cachedSnapshot)) {
          const offlineUser = buildCachedUser(cachedSnapshot);
          const offlineProfile = buildDefaultOfflineProfile(offlineUser, cachedSnapshot);

          initializedRef.current = true;
          setSession(null);
          setUser(offlineUser);
          setProfile(offlineProfile);
          setLoading(false);
          setAuthReady(true);
          return;
        }

        if (TEMP_AUTH_BYPASS_ENABLED) {
          applyLocalAuthBypass();
          return;
        }

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

      if (TEMP_AUTH_BYPASS_ENABLED && !nextSession?.user?.id) {
        applyLocalAuthBypass();
        return;
      }

      window.setTimeout(() => {
        if (!mounted) return;

        applySession(nextSession, {
          allowCached: true,
        }).catch((error) => {
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
  }, [applyLocalAuthBypass, applySession]);

  useEffect(() => {
    if (!user?.id) return undefined;
    if (profile?.offline_access || profile?.offline_limited_access) return undefined;

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
          refreshProfileSilently(user).catch((error) => {
            console.error("Profile realtime refresh error:", error);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    refreshProfileSilently,
    user,
    profile?.offline_access,
    profile?.offline_limited_access,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (!user?.id) return undefined;

    const handleOnline = () => {
      refreshProfileSilently(user).catch((error) => {
        console.error("Profile online refresh error:", error);
      });
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [refreshProfileSilently, user]);

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

    await applySession(data?.session ?? null, {
      allowCached: true,
    });

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
    const previousUserKey = user?.id || user?.email || null;

    await supabase.auth.signOut();

    try {
      clearAccessSnapshot(previousUserKey);
    } catch (error) {
      console.warn("Failed to clear CLARA offline access snapshot:", error);
    }

    if (TEMP_AUTH_BYPASS_ENABLED) {
      applyLocalAuthBypass();
      return;
    }

    initializedRef.current = true;
    profileRefreshRunIdRef.current += 1;
    setUser(null);
    setSession(null);
    setProfile(null);
    setLoading(false);
    setAuthReady(true);
  };

  const refreshProfile = useCallback(
    async ({ preferCache = true, silent = false, reason = "manual_refresh" } = {}) => {
      if (!user?.id) return null;

      if (preferCache === false) {
        console.info("[CLARA Auth] forcing fresh profile refresh", { reason });
      }

      return await fetchProfile(user, {
        silent,
        preferCache,
      });
    },
    [user, fetchProfile]
  );

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
