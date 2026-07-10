import { getOrCreateLocalVaultId } from "@/lib/local-user-identity";
import { saveLocalGooglePlayEntitlement } from "@/lib/local-google-play-entitlement";

export const COMMITTED_ACCESS_PLAN_KEY = "committed_249";

const IOS_ACCESS_SESSION_KEY = "clara_ios_access_session_v1";

function writeLocalSession(session) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(IOS_ACCESS_SESSION_KEY, JSON.stringify(session));
  } catch {
    // Private browsing can block storage. The active in-memory profile still refreshes.
  }
}

export function grantDeveloperCommittedAccess(userId) {
  const localUserId = String(userId || getOrCreateLocalVaultId() || "").trim();
  if (!localUserId) throw new Error("CLARA could not identify this device.");

  const now = new Date().toISOString();

  saveLocalGooglePlayEntitlement(localUserId, {
    state: "active",
    purchaseState: "DEVELOPER_ACCESS",
    acknowledged: true,
    lastVerifiedAt: now,
    lastSuccessfulQueryAt: now,
    previousConfirmedState: "active",
    grantSource: "access_code",
    accessCodeExpiresAt: null,
    purchaseTokenMasked: null,
    orderIdMasked: null,
    errorCode: null,
  });

  writeLocalSession({
    token: null,
    codeLabel: "Developer master access",
    planKey: COMMITTED_ACCESS_PLAN_KEY,
    userId: localUserId,
    activatedAt: now,
    expiresAt: null,
    verifiedAt: now,
    developerAccess: true,
  });

  return {
    ok: true,
    planKey: COMMITTED_ACCESS_PLAN_KEY,
    userId: localUserId,
    activatedAt: now,
  };
}
