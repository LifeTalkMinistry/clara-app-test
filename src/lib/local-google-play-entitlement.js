import { COMMITTED_PLAN_KEY } from "@/lib/membership";

export const ENTITLEMENT_OFFLINE_GRACE_MS = 72 * 60 * 60 * 1000;
export const GOOGLE_PLAY_ENTITLEMENT_EVENT =
  "clara-google-play-entitlement-updated";

const ENTITLEMENT_KEY_PREFIX = "clara_google_play_entitlement_v1:";
const COMMITTED_PRODUCT_ID = "clara_commitment_249";

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return window.localStorage;
}

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function entitlementKey(localUserId) {
  const id = String(localUserId || "").trim();
  if (!id) throw new Error("localUserId is required for Google Play entitlement storage.");
  return `${ENTITLEMENT_KEY_PREFIX}${id}`;
}

export function createDefaultGooglePlayEntitlement(localUserId) {
  return {
    version: 1,
    localUserId,
    productId: COMMITTED_PRODUCT_ID,
    planKey: COMMITTED_PLAN_KEY,
    state: "inactive",
    purchaseState: "UNSPECIFIED",
    acknowledged: null,
    lastVerifiedAt: null,
    lastSuccessfulQueryAt: null,
    source: "google_play",
    purchaseTokenMasked: null,
    orderIdMasked: null,
    errorCode: null,
  };
}

export function getLocalGooglePlayEntitlement(localUserId) {
  return (
    safeParse(getStorage()?.getItem(entitlementKey(localUserId))) ||
    createDefaultGooglePlayEntitlement(localUserId)
  );
}

export function saveLocalGooglePlayEntitlement(localUserId, record = {}) {
  const current = getLocalGooglePlayEntitlement(localUserId);
  const next = {
    ...current,
    ...record,
    version: 1,
    localUserId,
    productId: record?.productId || current?.productId || COMMITTED_PRODUCT_ID,
    planKey: COMMITTED_PLAN_KEY,
    source: "google_play",
  };

  getStorage()?.setItem(entitlementKey(localUserId), JSON.stringify(next));

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(GOOGLE_PLAY_ENTITLEMENT_EVENT, {
        detail: { localUserId, entitlement: next },
      })
    );
  }

  console.info("[CLARA Entitlement] local entitlement saved", {
    state: next.state,
    purchaseState: next.purchaseState,
    acknowledged: next.acknowledged,
  });
  return next;
}

export function clearLocalGooglePlayEntitlement(localUserId) {
  getStorage()?.removeItem(entitlementKey(localUserId));
}

function isWithinOfflineGrace(entitlement, now = Date.now()) {
  if (entitlement?.state !== "unknown") return false;
  const verifiedAt = Date.parse(entitlement?.lastVerifiedAt || "");
  return Number.isFinite(verifiedAt) && now - verifiedAt <= ENTITLEMENT_OFFLINE_GRACE_MS;
}

export function deriveLocalMembershipProfile(entitlement, now = Date.now()) {
  const saved = entitlement || {};
  const active =
    saved.state === "active" ||
    (saved.state === "unknown" &&
      saved.previousConfirmedState === "active" &&
      isWithinOfflineGrace(saved, now));

  if (active) {
    return {
      plan: COMMITTED_PLAN_KEY,
      plan_key: COMMITTED_PLAN_KEY,
      subscription_plan: COMMITTED_PLAN_KEY,
      access_level: "committed",
      subscription_status: "active",
      subscription_label: "Committed",
      entitlement_status: saved.state === "unknown" ? "unknown" : "active",
      enrollment_status: "approved",
      activation_status: "active",
      status: "active",
      is_activated: true,
      activated_at: saved.lastVerifiedAt || null,
      is_enrolled: true,
      program_active: true,
      isPro: true,
      entitlement_verification_state: saved.state,
      entitlement_verification_notice:
        saved.state === "unknown"
          ? "CLARA could not verify Google Play right now. Your last confirmed access has been preserved temporarily."
          : "",
    };
  }

  if (saved.state === "pending") {
    return {
      plan: "free",
      plan_key: "free",
      subscription_plan: "free",
      access_level: "free",
      subscription_status: "pending",
      subscription_label: "Free",
      entitlement_status: "pending",
      enrollment_status: "pending",
      activation_status: "pending",
      status: "pending",
      is_activated: false,
      activated_at: null,
      is_enrolled: false,
      program_active: false,
      isPro: false,
      entitlement_verification_state: "pending",
    };
  }

  return {
    plan: "free",
    plan_key: "free",
    subscription_plan: "free",
    access_level: "free",
    subscription_status: "free",
    subscription_label: "Free",
    entitlement_status: saved.state === "unknown" ? "unknown" : "free",
    enrollment_status: "none",
    activation_status: "not_required",
    status: "free",
    is_activated: false,
    activated_at: null,
    is_enrolled: false,
    program_active: false,
    isPro: false,
    entitlement_verification_state: saved.state || "inactive",
    entitlement_verification_notice:
      saved.state === "unknown"
        ? "CLARA could not verify Google Play right now. Connect to Google Play to confirm your access."
        : "",
  };
}

export function toLocalEnrollment(entitlement) {
  const profile = deriveLocalMembershipProfile(entitlement);
  const active = profile.isPro;
  const pending = entitlement?.state === "pending";

  if (!active && !pending) return null;

  return {
    id: `local_google_play_${entitlement?.localUserId || "user"}`,
    user_id: entitlement?.localUserId || null,
    plan: active ? COMMITTED_PLAN_KEY : "free",
    plan_key: active ? COMMITTED_PLAN_KEY : "free",
    selected_plan: active ? COMMITTED_PLAN_KEY : "free",
    tier: active ? COMMITTED_PLAN_KEY : "free",
    status: active ? "active" : "google_play_pending",
    source: "google_play_local_beta",
    created_at: entitlement?.lastVerifiedAt || new Date().toISOString(),
    updated_at: entitlement?.lastSuccessfulQueryAt || new Date().toISOString(),
  };
}

export function maskPurchaseIdentifier(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.length <= 8) return "••••";
  return `${text.slice(0, 4)}…${text.slice(-4)}`;
}

export { COMMITTED_PRODUCT_ID, ENTITLEMENT_KEY_PREFIX };
