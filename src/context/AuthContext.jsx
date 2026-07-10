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
import { migrateLocalVaultOwnership } from "@/lib/local-vault-migration";
import { migrateLegacyLocalIdentityStorage } from "@/lib/local-identity-storage-migration";
import { saveAccessSnapshot } from "@/lib/offline-access-cache";

const AuthContext = createContext(null);

function buildLocalAuthState() {
  const localUserId = getOrCreateLocalVaultId();
  const account = getLocalAccountProfile(localUserId);
  const user = buildLocalAuthUser(localUserId, account);
  const entitlement = getLocalGooglePlayEntitlement(localUserId);
  const entitlementProfile = deriveLocalMembershipProfile(entitlement);
  const profile = buildLocalMembershipProfile(user, account, entitlementProfile);
  const enrollment = toLocalEnrollment(entitlement);
  const session = {
    access_token: null,
    refresh_token: null,
    token_type: "local",
    expires_at: null,
    user,
    is_local_session: true,
  };

  saveAccessSnapshot({
    user,
    profile,
    enrollment,
    accessState: { role: "user", plan: profile.plan || "free" },
    flow: "normal",
    currentPath: "/dashboard",
  });

  return { localUserId, user, profile, entitlement, enrollment, session };
}

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => buildLocalAuthState());
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(true);
  const refreshPromiseRef = useRef(null);
  const queuedRefreshRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    if (refreshPromiseRef.current) {
      queuedRefreshRef.current = true;
      return refreshPromiseRef.current;
    }

    const refreshPromise = (async () => {
      setLoading(true);
      try {
        const next = buildLocalAuthState();
        setState(next);
        setAuthReady(true);
        return next.profile;
      } finally {
        setLoading(false);
      }
    })();

    refreshPromiseRef.current = refreshPromise;
    try {
      return await refreshPromise;
    } finally {
      refreshPromiseRef.current = null;
      if (queuedRefreshRef.current) {
        queuedRefreshRef.current = false;
        queueMicrotask(() => {
          refreshProfile().catch((error) => {
            console.error("[CLARA Auth] queued local profile refresh failed", error);
          });
        });
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      await migrateLocalVaultOwnership(state.localUserId);
      await migrateLegacyLocalIdentityStorage(state.localUserId);
    })()
      .catch((error) => {
        console.warn("[CLARA Auth] local identity migration could not complete", error);
      })
      .finally(() => {
        if (mounted) refreshProfile();
      });

    return () => {
      mounted = false;
    };
  }, [refreshProfile, state.localUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let refreshQueued = false;
    const refresh = () => {
      if (refreshQueued) return;
      refreshQueued = true;
      queueMicrotask(() => {
        refreshQueued = false;
        refreshProfile().catch((error) => {
          console.error("[CLARA Auth] local profile refresh failed", error);
        });
      });
    };
    const handleStorage = (event) => {
      if (!event?.key || event.key.startsWith("clara_")) refresh();
    };

    window.addEventListener("clara-local-profile-updated", refresh);
    window.addEventListener("clara-local-setup-profile-updated", refresh);
    window.addEventListener(GOOGLE_PLAY_ENTITLEMENT_EVENT, refresh);
    window.addEventListener("clara-membership-preview-updated", refresh);
    window.addEventListener("clara:active-local-vault-updated", refresh);
    window.addEventListener("clara-local-journey-reset", refresh);
    window.addEventListener("clara-data-restored", refresh);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("clara-local-profile-updated", refresh);
      window.removeEventListener("clara-local-setup-profile-updated", refresh);
      window.removeEventListener(GOOGLE_PLAY_ENTITLEMENT_EVENT, refresh);
      window.removeEventListener("clara-membership-preview-updated", refresh);
      window.removeEventListener("clara:active-local-vault-updated", refresh);
      window.removeEventListener("clara-local-journey-reset", refresh);
      window.removeEventListener("clara-data-restored", refresh);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshProfile]);

  const accountlessError = useCallback(() => {
    throw new Error("CLARA is device-local and does not use user accounts.");
  }, []);

  const signOut = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      user: state.user,
      session: state.session,
      profile: state.profile,
      loading,
      authReady,
      isAuthenticated: true,
      isPro: Boolean(state.profile?.isPro),
      signUp: accountlessError,
      signIn: accountlessError,
      signInWithGoogle: accountlessError,
      signOut,
      refreshProfile,
    }),
    [accountlessError, authReady, loading, refreshProfile, signOut, state]
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
