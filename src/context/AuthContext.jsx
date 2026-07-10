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
  changeAccountPassword,
  fetchCurrentAccount,
  isAccountApiConfigured,
  refreshAccountSession,
  signInAccount,
  signOutAccount,
  signOutAllAccounts,
  signUpAccount,
} from "@/lib/account-api-client";
import {
  clearActiveAccountMarker,
  getMappedLocalVaultId,
  resolveLocalVaultForAccount,
} from "@/lib/account-vault-mapping";
import { getOrCreateLocalVaultId } from "@/lib/local-user-identity";
import { setActiveLocalVaultId } from "@/lib/localVaultIdentity";
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
import { migrateLocalVaultOwnership } from "@/lib/local-vault-migration";
import { migrateLegacyLocalIdentityStorage } from "@/lib/local-identity-storage-migration";
import {
  clearAccessSnapshot,
  getAccessSnapshot,
  isAccessNetworkOffline,
  isAccessSnapshotUsable,
  saveAccessSnapshot,
} from "@/lib/offline-access-cache";

const AuthContext = createContext(null);

function emptyState() {
  return {
    user: null,
    session: null,
    profile: null,
    membership: null,
    enrollment: null,
    localVaultId: null,
    offline: false,
  };
}

function buildAuthenticatedUser(serverUser, localVaultId) {
  const displayName = serverUser?.displayName || "CLARA User";
  return {
    id: localVaultId,
    account_id: serverUser?.id || null,
    server_user_id: serverUser?.id || null,
    local_vault_id: localVaultId,
    email: serverUser?.email || null,
    display_name: displayName,
    full_name: displayName,
    role: "user",
    account_status: serverUser?.accountStatus || "active",
    signup_platform: serverUser?.signupPlatform || "web",
    must_change_password: Boolean(serverUser?.mustChangePassword),
    password_changed_at: serverUser?.passwordChangedAt || null,
    created_at: serverUser?.createdAt || null,
    updated_at: serverUser?.updatedAt || null,
    is_local_user: false,
    app_metadata: {},
    user_metadata: {
      full_name: displayName,
      name: displayName,
      display_name: displayName,
      role: "user",
      account_id: serverUser?.id || null,
    },
  };
}

function serverMembershipProfile(membership = {}) {
  return {
    plan: membership.effectivePlan || membership.plan || "free",
    membership_status:
      membership.effectiveSubscriptionStatus || membership.subscriptionStatus || "active",
    subscription_status: membership.subscriptionStatus || "active",
    subscription_source: membership.source || "free",
    current_period_end: membership.currentPeriodEnd || null,
    cancel_at_period_end: Boolean(membership.cancelAtPeriodEnd),
    cancelled_at: membership.cancelledAt || null,
    effective_plan: membership.effectivePlan || "free",
    has_paid_access: Boolean(membership.hasPaidAccess),
    account_blocked: Boolean(membership.blocked),
    account_block_reason: membership.blockReason || null,
    offline_valid_until: membership.offlineValidUntil || null,
  };
}

async function materializeAuthPayload(payload) {
  const serverUser = payload?.user;
  const membership = payload?.membership;
  if (!serverUser?.id || !membership) throw new Error("CLARA returned an incomplete account session.");
  if (membership.blocked || serverUser.accountStatus !== "active") {
    const error = new Error("This CLARA account is currently unavailable.");
    error.code = "account_blocked";
    throw error;
  }

  const localVaultId = await resolveLocalVaultForAccount({
    accountId: serverUser.id,
    email: serverUser.email,
  });
  const localAccount = getLocalAccountProfile(localVaultId);
  const user = buildAuthenticatedUser(serverUser, localVaultId);
  const googlePlayEntitlement = getLocalGooglePlayEntitlement(localVaultId);
  const localEntitlementProfile = deriveLocalMembershipProfile(googlePlayEntitlement);
  const serverProfile = serverMembershipProfile(membership);

  // Preserve an already-verified Google Play entitlement until the account backend is
  // connected to purchase verification. Server account status still blocks access.
  const preserveAndroidPaidAccess =
    localEntitlementProfile?.isPro && serverProfile.plan === "free";
  const profile = {
    ...buildLocalMembershipProfile(user, localAccount, localEntitlementProfile),
    ...serverProfile,
    id: localVaultId,
    account_id: serverUser.id,
    email: serverUser.email,
    display_name: serverUser.displayName,
    full_name: serverUser.displayName,
    role: "user",
    is_local_user: false,
    ...(preserveAndroidPaidAccess
      ? {
          plan: localEntitlementProfile.plan,
          membership_status: localEntitlementProfile.membership_status,
          isPro: true,
          subscription_source: "android",
          server_membership_pending_android_sync: true,
        }
      : { isPro: Boolean(membership.hasPaidAccess) }),
  };
  const enrollment = toLocalEnrollment(googlePlayEntitlement);
  const state = {
    user,
    profile,
    membership,
    enrollment,
    localVaultId,
    session: payload.session || null,
    offline: false,
  };

  saveAccessSnapshot({
    user,
    profile,
    enrollment,
    accessState: { role: "user", plan: profile.plan || "free" },
    flow: "normal",
    currentPath: "/dashboard",
  });

  return state;
}

function restoreOfflineState() {
  const snapshot = getAccessSnapshot();
  if (!isAccessSnapshotUsable(snapshot)) return null;
  const profile = snapshot?.profileBasic || {};
  const accountId = profile.account_id || profile.server_user_id;
  const vaultId = getMappedLocalVaultId(accountId);
  const offlineUntil = Date.parse(profile.offline_valid_until || "");
  if (!accountId || !vaultId || !Number.isFinite(offlineUntil) || offlineUntil <= Date.now()) return null;
  if (profile.account_status && profile.account_status !== "active") return null;

  setActiveLocalVaultId(vaultId);
  const user = {
    id: vaultId,
    account_id: accountId,
    server_user_id: accountId,
    local_vault_id: vaultId,
    email: profile.email || null,
    display_name: profile.display_name || profile.full_name || "CLARA User",
    full_name: profile.full_name || profile.display_name || "CLARA User",
    role: "user",
    account_status: "active",
    must_change_password: Boolean(profile.must_change_password),
    is_local_user: false,
    user_metadata: {
      display_name: profile.display_name || profile.full_name || "CLARA User",
      full_name: profile.full_name || profile.display_name || "CLARA User",
      account_id: accountId,
    },
  };

  return {
    user,
    profile: { ...profile, offline_access: true, offline_limited_access: false },
    membership: {
      plan: profile.plan || "free",
      effectivePlan: profile.effective_plan || profile.plan || "free",
      subscriptionStatus: profile.subscription_status || "active",
      offlineValidUntil: profile.offline_valid_until,
    },
    enrollment: snapshot.enrollment || null,
    localVaultId: vaultId,
    session: { offline: true, expiresAt: profile.offline_valid_until },
    offline: true,
  };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const refreshPromiseRef = useRef(null);

  const applyPayload = useCallback(async (payload) => {
    const next = await materializeAuthPayload(payload);
    setState(next);
    return next;
  }, []);

  const refreshSession = useCallback(async () => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;
    const promise = (async () => {
      const payload = await refreshAccountSession();
      return applyPayload(payload);
    })();
    refreshPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      refreshPromiseRef.current = null;
    }
  }, [applyPayload]);

  const refreshProfile = useCallback(async () => {
    if (!state.user || state.offline) {
      if (state.offline && navigator?.onLine !== false) return refreshSession();
      return state.profile;
    }
    const payload = await fetchCurrentAccount();
    const next = await applyPayload({ ...payload, session: state.session });
    return next.profile;
  }, [applyPayload, refreshSession, state.offline, state.profile, state.session, state.user]);

  const signUp = useCallback(
    async ({ displayName, email, password }) => {
      setLoading(true);
      try {
        return await applyPayload(await signUpAccount({ displayName, email, password }));
      } finally {
        setLoading(false);
      }
    },
    [applyPayload]
  );

  const signIn = useCallback(
    async ({ email, password }) => {
      setLoading(true);
      try {
        return await applyPayload(await signInAccount({ email, password }));
      } finally {
        setLoading(false);
      }
    },
    [applyPayload]
  );

  const changePassword = useCallback(
    async (newPassword) => {
      setLoading(true);
      try {
        return await applyPayload(await changeAccountPassword(newPassword));
      } finally {
        setLoading(false);
      }
    },
    [applyPayload]
  );

  const signOut = useCallback(async () => {
    const snapshotKey = state.user?.account_id || state.user?.email || null;
    try {
      await signOutAccount();
    } catch (error) {
      if (!isAccessNetworkOffline(error)) throw error;
    } finally {
      clearAccessSnapshot(snapshotKey);
      clearActiveAccountMarker();
      setState(emptyState());
    }
  }, [state.user]);

  const signOutAll = useCallback(async () => {
    try {
      await signOutAllAccounts();
    } finally {
      clearAccessSnapshot(state.user?.account_id || state.user?.email || null);
      clearActiveAccountMarker();
      setState(emptyState());
    }
  }, [state.user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const initialVaultId = getOrCreateLocalVaultId();
      await migrateLocalVaultOwnership(initialVaultId);
      await migrateLegacyLocalIdentityStorage(initialVaultId);

      if (!isAccountApiConfigured()) return;

      try {
        const next = await materializeAuthPayload(await refreshAccountSession());
        if (mounted) setState(next);
      } catch (error) {
        if (isAccessNetworkOffline(error)) {
          const offlineState = restoreOfflineState();
          if (mounted && offlineState) setState(offlineState);
        }
      }
    })()
      .catch((error) => {
        console.error("[CLARA Auth] account initialization failed", error);
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
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refresh = () => {
      if (!state.user || navigator.onLine === false) return;
      refreshProfile().catch((error) => {
        console.error("[CLARA Auth] account status refresh failed", error);
      });
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("online", refresh);
    window.addEventListener(GOOGLE_PLAY_ENTITLEMENT_EVENT, refresh);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", refresh);
      window.removeEventListener(GOOGLE_PLAY_ENTITLEMENT_EVENT, refresh);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshProfile, state.user]);

  const value = useMemo(
    () => ({
      user: state.user,
      session: state.session,
      profile: state.profile,
      membership: state.membership,
      enrollment: state.enrollment,
      localVaultId: state.localVaultId,
      loading,
      authReady,
      isAuthenticated: Boolean(state.user),
      isPro: Boolean(state.profile?.isPro),
      offline: state.offline,
      configurationRequired: !isAccountApiConfigured(),
      signUp,
      signIn,
      signOut,
      signOutAll,
      changePassword,
      refreshSession,
      refreshProfile,
    }),
    [
      authReady,
      changePassword,
      loading,
      refreshProfile,
      refreshSession,
      signIn,
      signOut,
      signOutAll,
      signUp,
      state,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
