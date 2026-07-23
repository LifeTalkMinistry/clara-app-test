const ACCESS_CACHE_PREFIX = "clara_access_snapshot_v2";
const ACCESS_CACHE_LAST_KEY = `${ACCESS_CACHE_PREFIX}:last`;

const isBrowser = () =>
  typeof window !== "undefined" &&
  typeof window.localStorage !== "undefined";

const safeText = (value) => String(value ?? "").trim();

export function maskGooglePlayPurchaseToken(token = "") {
  const clean = safeText(token);
  if (!clean) return "missing";
  if (clean.length <= 10) return `${clean.slice(0, 2)}…${clean.slice(-2)}`;
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

export function clearBillingAccessSnapshots({ userId = "", email = "" } = {}) {
  if (!isBrowser()) return;

  const keysToRemove = new Set([ACCESS_CACHE_LAST_KEY]);
  const normalizedUserId = safeText(userId).toLowerCase();
  const normalizedEmail = safeText(email).toLowerCase();

  if (normalizedUserId) {
    keysToRemove.add(`${ACCESS_CACHE_PREFIX}:${normalizedUserId}`);
  }
  if (normalizedEmail) {
    keysToRemove.add(`${ACCESS_CACHE_PREFIX}:${normalizedEmail}`);
  }

  const allKeys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key) allKeys.push(key);
  }

  allKeys
    .filter((key) => key.startsWith(`${ACCESS_CACHE_PREFIX}:`))
    .forEach((key) => keysToRemove.add(key));

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
}

export function clearBillingDeveloperPreview() {}

export function markGooglePlayEntitlementVerified({
  userId = "",
  email = "",
  purchaseToken = "",
  status = "active",
  plan = "committed_249",
} = {}) {
  clearBillingAccessSnapshots({ userId, email });

  const detail = {
    userId: safeText(userId) || null,
    status: safeText(status) || "active",
    plan: safeText(plan) || "committed_249",
    purchaseTokenMasked: maskGooglePlayPurchaseToken(purchaseToken),
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("clara-google-play-entitlement-verified", { detail })
    );
  }

  console.info(
    "[CLARA Billing] purchase verified; backend profile refresh required",
    detail
  );
  return detail;
}
