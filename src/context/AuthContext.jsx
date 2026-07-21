import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildLocalAuthUser,
  getOrCreateLocalVaultId,
} from "@/lib/local-user-identity";
import {
  buildLocalMembershipProfile,
  getLocalAccountProfile,
} from "@/lib/local-profile-repository";
import {
  deriveLocalMembershipProfile,
  getLocalGooglePlayEntitlement,
  GOOGLE_PLAY_ENTITLEMENT_EVENT,
  toLocalEnrollment,
} from "@/lib/local-google-play-entitlement";
import { saveAccessSnapshot } from "@/lib/offline-access-cache";
import {
  runLocalAuthMaintenance,
  waitForLocalAccountLink,
} from "@/lib/auth-startup-resilience";
import {
  clearBackendSession,
  createClaraBackendAccount,
  fetchCurrentBackendUser,
  getStoredBackendToken,
  isBackendNetworkError,
  restoreClaraBackendSession,
  signInWithClaraBackend,
  signOutFromClaraBackend,
} from "@/lib/clara-backend-client";

const AuthContext = createContext(null);

function emptyState() {
  return {
    serverUser: null,
    user: null,
    session: null,
    profile: null,
    entitlement: null,
    enrollment: null,
    localUserId: null,
    offline: false,
  };
}

async function buildAuthenticatedState({ serverUser, token, offline = false }) {
  if (!serverUser?.id || !token) {
    throw new Error("CLARA returned an incomplete account session.");
  }

  const localUserId = getOrCreateLocalVaultId();
  await waitForLocalAccountLink({
    expectedVaultId: localUserId,
    accountUserId: String(serverUser.id),
    accountEmail: serverUser.email,
  });

  const localAccount = getLocalAccountProfile(localUserId);
  const localIdentity = buildLocalAuthUser(localUserId, localAccount);
  const displayName = String(serverUser.name || localIdentity.display_name || "CLARA User").trim();
  const role = String(serverUser.role || "user").trim().toLowerCase() || "user";
  const user = {
    ...localIdentity,
    id: localUserId,
    account_id: String(serverUser.id),
    server_user_id: String(serverUser.id),
    local_vault_id: localUserId,
    email: serverUser.email || null,
    display_name: displayName,
    full_name: displayName,
    role,
    is_local_user: false,
    created_at: serverUser.created_at || null,
    user_metadata: {
      ...localIdentity.user_metadata,
      full_name: displayName,
      name: displayName,
      display_name: displayName,
      role,
      account_id: String(serverUser.id),
    },
  };

  const entitlement = getLocalGooglePlayEntitlement(localUserId);
  const entitlementProfile = deriveLocalMembershipProfile(entitlement);
  const profile = {
    ...buildLocalMembershipProfile(user, localAccount, entitlementProfile),
    id: localUserId,
    account_id: String(serverUser.id),
    email: serverUser.email || null,
    display_name: displayName,
    full_name: displayName,
    role,
    is_local_user: false,
    offline_access: offline,
  };
  const enrollment = toLocalEnrollment(entitlement);
  const session = {
    access_token: token,
    refresh_token: null,
    token_type: "Bearer",
    user,
    offline,
  };

  saveAccessSnapshot({
    user,
    profile,
    enrollment,
    accessState: { role, plan: profile.plan || "free" },
    flow: "normal",
    currentPath: "/dashboard",
  });

  return {
    serverUser,
    user,
    session,
    profile,
    entitlement,
    enrollment,
    localUserId,
    offline,
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const stateRef = useRef(state);
  const refreshPromiseRef = useRef(null);

  const commitState = useCallback((next) => {
    stateRef.current = next;
    setState(next);
    return next;
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyBackendSession = useCallback(
    async ({ token, user, offline = false }) => {
      const next = await buildAuthenticatedState({ serverUser: user, token, offline });
      return commitState(next);
    },
    [commitState]
  );

  const refreshProfile = useCallback(async (options = {}) => {
    if (!stateRef.current.user) return null;

    const reason = String(options?.reason || "").trim();
    if (reason === "local_journey_reset") {
      // The reset already dispatches a local rebuild event. Navigation must not depend on the backend.
      return stateRef.current.profile;
    }

    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const refreshPromise = (async () => {
      const token = getStoredBackendToken();
      if (!token) {
        commitState(emptyState());
        return null;
      }

      try {
        const serverUser = await fetchCurrentBackendUser(token);
        const next = await applyBackendSession({ token, user: serverUser, offline: false });
        return next.profile;
      } catch (error) {
        if (isBackendNetworkError(error)) {
          const current = stateRef.current;
          if (!current.user) return null;

          const alreadyOffline = Boolean(
            current.offline &&
              (!current.session || current.session.offline) &&
              (!current.profile || current.profile.offline_access)
          );

          if (!alreadyOffline) {
            commitState({
              ...current,
              offline: true,
              session: current.session ? { ...current.session, offline: true } : null,
              profile: current.profile ? { ...current.profile, offline_access: true } : null,
            });
          }

          return current.profile;
        }

        if (error?.status === 401 || error?.status === 403) {
          clearBackendSession();
          commitState(emptyState());
          return null;
        }

        throw error;
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [applyBackendSession, commitState]);

  const signIn = useCallback(
    async ({ email, password }) => {
      setLoading(true);
      try {
        const session = await signInWithClaraBackend({ email, password });
        try {
          return await applyBackendSession(session);
        } catch (error) {
          signOutFromClaraBackend();
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [applyBackendSession]
  );

  const signUp = useCallback(
    async ({ email, password, fullName, name }) => {
      setLoading(true);
      try {
        const session = await createClaraBackendAccount({
          name: name || fullName,
          email,
          password,
        });
        try {
          return await applyBackendSession(session);
        } catch (error) {
          signOutFromClaraBackend();
          throw error;
        }
      } finally {
        setLoading(false);
      }
    },
    [applyBackendSession]
  );

  const signOut = useCallback(async () => {
    signOutFromClaraBackend();
    commitState(emptyState());
  }, [commitState]);

  useEffect(() => {
    let mounted = true;

    const rebuildAfterLocalMaintenance = async (localUserId) => {
      await runLocalAuthMaintenance(localUserId);
      if (!mounted) return;

      const current = stateRef.current;
      if (!current.serverUser || !current.session?.access_token) return;

      try {
        const rebuilt = await buildAuthenticatedState({
          serverUser: current.serverUser,
          token: current.session.access_token,
          offline: current.offline,
        });
        if (mounted) commitState(rebuilt);
      } catch (error) {
        console.warn("[CLARA Auth] post-startup local profile rebuild was skipped.", {
          errorName: error?.name || "Error",
          message: error?.message || String(error),
        });
      }
    };

    (async () => {
      const localUserId = getOrCreateLocalVaultId();
      const restored = await restoreClaraBackendSession();

      if (!mounted) return;
      if (!restored) {
        void runLocalAuthMaintenance(localUserId);
        return;
      }

      const next = await buildAuthenticatedState({
        serverUser: restored.user,
        token: restored.token,
        offline: restored.offline,
      });
      if (mounted) {
        commitState(next);
        void rebuildAfterLocalMaintenance(localUserId);
      }
    })()
      .catch((error) => {
        clearBackendSession();
        console.error("[CLARA Auth] backend session restoration failed", error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
          setAuthReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [commitState]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const refreshOnline = () => {
      if (!stateRef.current.user || navigator.onLine === false) return;
      refreshProfile().catch((error) => {
        console.error("[CLARA Auth] online account refresh failed", error);
      });
    };

    window.addEventListener("online", refreshOnline);
    return () => window.removeEventListener("online", refreshOnline);
  }, [refreshProfile]);

  useEffect(() => {
    if (typeof window === "undefined" || !state.serverUser || !state.session?.access_token) {
      return undefined;
    }

    let refreshQueued = false;
    const rebuildLocalProfile = () => {
      if (refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        buildAuthenticatedState({
          serverUser: state.serverUser,
          token: state.session.access_token,
          offline: state.offline,
        })
          .then(commitState)
          .catch((error) => {
            console.error("[CLARA Auth] local profile rebuild failed", error);
          });
      });
    };

    const events = [
      "clara-local-profile-updated",
      "clara-local-setup-profile-updated",
      GOOGLE_PLAY_ENTITLEMENT_EVENT,
      "clara-membership-preview-updated",
      "clara-local-journey-reset",
      "clara-data-restored",
    ];
    events.forEach((eventName) => window.addEventListener(eventName, rebuildLocalProfile));

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, rebuildLocalProfile));
    };
  }, [commitState, state.offline, state.serverUser, state.session?.access_token]);

  const unsupportedGoogleLogin = useCallback(() => {
    throw new Error("Google login is not available yet. Use your CLARA email and password.");
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      session: state.session,
      profile: state.profile,
      loading,
      authReady,
      isAuthenticated: Boolean(state.user),
      isPro: Boolean(state.profile?.isPro),
      offline: state.offline,
      signUp,
      signIn,
      signInWithGoogle: unsupportedGoogleLogin,
      signOut,
      refreshProfile,
    }),
    [
      authReady,
      loading,
      refreshProfile,
      signIn,
      signOut,
      signUp,
      state.offline,
      state.profile,
      state.session,
      state.user,
      unsupportedGoogleLogin,
    ]
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
