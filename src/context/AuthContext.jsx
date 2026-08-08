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
import { resolveAccountLocalVault } from "@/lib/accountLinking/resolveAccountLocalVault";
import { getVaultMappingForAccount } from "@/lib/account-vault-directory";
import {
  getActiveLocalVaultId,
  setActiveLocalVaultId,
} from "@/lib/localVaultIdentity";
import {
  buildLocalMembershipProfile,
  getLocalAccountProfile,
} from "@/lib/local-profile-repository";
import { getLocalGooglePlayEntitlement } from "@/lib/local-google-play-entitlement";
import {
  buildBackendEnrollment,
  buildBackendMembershipProfile,
} from "@/lib/backend-membership-authority";
import { runBackendMembershipAuthorityMigration } from "@/lib/backend-membership-migration";
import { saveAccessSnapshot } from "@/lib/offline-access-cache";
import { runLocalAuthMaintenance } from "@/lib/auth-startup-resilience";
import { queryClientInstance } from "@/lib/query-client";
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
const LOCAL_VAULT_STARTUP_TIMEOUT_MS = 5_000;

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

function createLocalVaultStartupTimeoutError() {
  const error = new Error(
    `CLARA local vault recovery did not finish within ${LOCAL_VAULT_STARTUP_TIMEOUT_MS}ms.`
  );
  error.code = "LOCAL_VAULT_STARTUP_TIMEOUT";
  return error;
}

async function resolveAccountLocalVaultForStartup({ accountUserId, accountEmail }) {
  const accountId = String(accountUserId || "").trim();
  let timeoutId = null;

  try {
    return await Promise.race([
      resolveAccountLocalVault({
        accountUserId: accountId,
        accountEmail,
      }),
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(createLocalVaultStartupTimeoutError()),
          LOCAL_VAULT_STARTUP_TIMEOUT_MS
        );
      }),
    ]);
  } catch (error) {
    if (error?.code !== "LOCAL_VAULT_STARTUP_TIMEOUT") throw error;

    // Startup must never remain blocked indefinitely by IndexedDB recovery.
    // Only fall back to a vault already mapped to this exact backend account;
    // never reuse the currently active vault if it belongs to another account.
    const mapping = getVaultMappingForAccount(accountId);
    const mappedVaultId = String(mapping?.vaultId || "").trim();
    if (!mappedVaultId) throw error;

    const previousVaultId = String(getActiveLocalVaultId() || "").trim();
    const vaultId = setActiveLocalVaultId(mappedVaultId);

    console.warn("[CLARA Auth] local vault resolver timed out; using verified account mapping.", {
      accountUserId: accountId,
      vaultId,
    });

    return {
      vaultId,
      accountUserId: accountId,
      accountEmail: String(accountEmail || "").trim().toLowerCase() || null,
      reused: true,
      created: false,
      adoptedUnlinkedVault: false,
      startupFallback: true,
      switched: previousVaultId !== vaultId,
    };
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

async function buildAuthenticatedState({ serverUser, token, offline = false }) {
  if (!serverUser?.id || !token) {
    throw new Error("CLARA returned an incomplete account session.");
  }

  const resolvedVault = await resolveAccountLocalVaultForStartup({
    accountUserId: String(serverUser.id),
    accountEmail: serverUser.email,
  });
  const localUserId = resolvedVault.vaultId;

  if (resolvedVault.switched) queryClientInstance.clear();

  const localAccount = getLocalAccountProfile(localUserId);
  const localIdentity = buildLocalAuthUser(localUserId, localAccount);
  const displayName = String(
    serverUser.name || localIdentity.display_name || "CLARA User"
  ).trim();
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
    plan: serverUser.plan,
    status: serverUser.status,
    is_local_user: false,
    created_at: serverUser.created_at || null,
    updated_at: serverUser.updated_at || null,
    user_metadata: {
      ...localIdentity.user_metadata,
      full_name: displayName,
      name: displayName,
      display_name: displayName,
      role,
      account_id: String(serverUser.id),
    },
  };

  const localBaseProfile = buildLocalMembershipProfile(user, localAccount, {});
  const profile = {
    ...buildBackendMembershipProfile(serverUser, localBaseProfile),
    id: localUserId,
    account_id: String(serverUser.id),
    email: serverUser.email || null,
    display_name: displayName,
    full_name: displayName,
    role,
    is_local_user: false,
    offline_access: offline,
  };
  const entitlement = getLocalGooglePlayEntitlement(localUserId);
  const enrollment = buildBackendEnrollment(serverUser);
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
    accessState: {
      role,
      plan: profile.plan,
      accountStatus: profile.account_status,
      membershipSource: "backend",
    },
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
      const next = await buildAuthenticatedState({
        serverUser: user,
        token,
        offline,
      });
      return commitState(next);
    },
    [commitState]
  );

  const refreshProfile = useCallback(
    async (options = {}) => {
      if (!stateRef.current.user) return null;

      const reason = String(options?.reason || "").trim();
      if (reason === "local_journey_reset") {
        return stateRef.current.profile;
      }

      if (refreshPromiseRef.current) return refreshPromiseRef.current;

      const refreshPromise = (async () => {
        const token = getStoredBackendToken();
        if (!token) {
          queryClientInstance.clear();
          commitState(emptyState());
          return null;
        }

        try {
          const serverUser = await fetchCurrentBackendUser(token);
          const next = await applyBackendSession({
            token,
            user: serverUser,
            offline: false,
          });
          return next.profile;
        } catch (error) {
          if (isBackendNetworkError(error)) {
            const current = stateRef.current;
            if (!current.user) return null;
            if (!current.offline) {
              commitState({
                ...current,
                offline: true,
                session: current.session
                  ? { ...current.session, offline: true }
                  : null,
                profile: current.profile
                  ? { ...current.profile, offline_access: true }
                  : null,
              });
            }
            return current.profile;
          }

          if (error?.status === 401 || error?.status === 403) {
            clearBackendSession();
            queryClientInstance.clear();
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
    },
    [applyBackendSession, commitState]
  );

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
          const activationError = new Error(
            "Your CLARA account was created, but this device could not open its local vault. Log in again to continue."
          );
          activationError.code = "ACCOUNT_CREATED_LOCAL_ACTIVATION_FAILED";
          activationError.accountCreated = true;
          activationError.cause = error;
          throw activationError;
        }
      } finally {
        setLoading(false);
      }
    },
    [applyBackendSession]
  );

  const signOut = useCallback(async () => {
    signOutFromClaraBackend();
    queryClientInstance.clear();
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
      runBackendMembershipAuthorityMigration();
      const fallbackLocalUserId = getOrCreateLocalVaultId();
      const restored = await restoreClaraBackendSession();
      if (!mounted) return;
      if (!restored) {
        void runLocalAuthMaintenance(fallbackLocalUserId);
        return;
      }

      const next = await buildAuthenticatedState({
        serverUser: restored.user,
        token: restored.token,
        offline: restored.offline,
      });
      if (mounted) {
        commitState(next);
        void rebuildAfterLocalMaintenance(next.localUserId);
      }
    })()
      .catch((error) => {
        clearBackendSession();
        queryClientInstance.clear();
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
      refreshProfile({ reason: "connectivity_restored" }).catch((error) => {
        console.error("[CLARA Auth] online account refresh failed", error);
      });
    };
    window.addEventListener("online", refreshOnline);
    return () => window.removeEventListener("online", refreshOnline);
  }, [refreshProfile]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !state.serverUser ||
      !state.session?.access_token
    ) {
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
      "clara-local-journey-reset",
      "clara-data-restored",
    ];
    events.forEach((eventName) =>
      window.addEventListener(eventName, rebuildLocalProfile)
    );
    return () => {
      events.forEach((eventName) =>
        window.removeEventListener(eventName, rebuildLocalProfile)
      );
    };
  }, [
    commitState,
    state.offline,
    state.serverUser,
    state.session?.access_token,
  ]);

  const unsupportedGoogleLogin = useCallback(() => {
    throw new Error(
      "Google login is not available yet. Use your CLARA email and password."
    );
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
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
