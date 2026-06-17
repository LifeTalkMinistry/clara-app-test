const PATCH_MARK = "__claraGooglePlayAlreadyOwnedRestorePatch";
const COMMITTED_PRODUCT_ID = "clara_commitment_249";
const SUBSCRIPTION_TYPE = "subs";

const PURCHASE_METHODS = [
  "purchaseSubscription",
  "subscribe",
  "purchaseProduct",
  "launchPurchase",
  "purchase",
];

const RESTORE_ALIAS_METHODS = [
  "restorePurchases",
  "restorePurchase",
  "getPurchases",
  "queryPurchases",
  "getOwnedPurchases",
  "getPurchaseHistory",
];

const normalize = (value) => String(value ?? "").trim();

function billingLog(label, payload = {}) {
  if (typeof console === "undefined") return;
  console.info(`[CLARA Billing] ${label}`, payload);
}

function normalizeResponseCode(code) {
  const text = normalize(code);
  if (/^-?\d+$/.test(text)) {
    switch (Number(text)) {
      case 0:
        return "OK";
      case 1:
        return "USER_CANCELED";
      case 2:
        return "SERVICE_UNAVAILABLE";
      case 3:
        return "BILLING_UNAVAILABLE";
      case 4:
        return "ITEM_UNAVAILABLE";
      case 5:
        return "DEVELOPER_ERROR";
      case 6:
        return "ERROR";
      case 7:
        return "ITEM_ALREADY_OWNED";
      case 8:
        return "ITEM_NOT_OWNED";
      case 12:
        return "NETWORK_ERROR";
      case -1:
        return "SERVICE_DISCONNECTED";
      case -2:
        return "FEATURE_NOT_SUPPORTED";
      case -3:
        return "SERVICE_TIMEOUT";
      default:
        return "UNKNOWN";
    }
  }

  const upper = text.toUpperCase();
  return upper || "UNKNOWN";
}

function parseBridgeResult(result) {
  if (!result || typeof result !== "string") return result || {};
  try {
    return JSON.parse(result);
  } catch {
    return { rawValue: result };
  }
}

function sanitizeResult(result) {
  const parsed = parseBridgeResult(result);
  const responseCode = normalizeResponseCode(parsed?.responseCode ?? parsed?.code ?? parsed?.statusCode);

  if (!parsed || typeof parsed !== "object") return parsed;
  if (responseCode === "UNKNOWN") return parsed;

  return {
    ...parsed,
    responseCode,
  };
}

function isAlreadyOwnedSignal(value) {
  const responseCode = normalizeResponseCode(
    value?.responseCode ?? value?.code ?? value?.raw?.responseCode ?? value?.raw?.code
  );
  const message = normalize(value?.message || value?.debugMessage || value?.details || value).toLowerCase();

  return (
    responseCode === "ITEM_ALREADY_OWNED" ||
    message.includes("already subscribed") ||
    message.includes("already own") ||
    message.includes("already owned") ||
    message.includes("item already owned") ||
    message.includes("already purchased")
  );
}

function getProductIds(payload = {}) {
  const ids = Array.isArray(payload.productIds)
    ? payload.productIds.map(normalize).filter(Boolean)
    : [normalize(payload.productId)].filter(Boolean);

  return Array.from(new Set(ids.length ? ids : [COMMITTED_PRODUCT_ID]));
}

function buildOwnedPurchasePayload(payload = {}) {
  const productIds = getProductIds(payload);
  return {
    ...payload,
    productId: productIds[0],
    productIds,
    productType: payload.productType || SUBSCRIPTION_TYPE,
    productTypes: productIds.reduce((acc, productId) => {
      acc[productId] = SUBSCRIPTION_TYPE;
      return acc;
    }, { ...(payload.productTypes || {}) }),
  };
}

function getOwnedPurchaseDiagnostics(result, productIds = []) {
  const parsed = parseBridgeResult(result);
  const responseCode = normalizeResponseCode(parsed?.responseCode ?? parsed?.code ?? parsed?.statusCode);
  const purchases = Array.isArray(parsed?.purchases) ? parsed.purchases : [];
  const targets = productIds.map(normalize).filter(Boolean);
  const matchedPurchases = targets.length
    ? purchases.filter((purchase) => {
        const purchaseProductIds = Array.isArray(purchase?.productIds)
          ? purchase.productIds.map(normalize).filter(Boolean)
          : [normalize(purchase?.productId)].filter(Boolean);
        return purchaseProductIds.some((productId) => targets.includes(productId));
      })
    : purchases;

  return {
    responseCode,
    purchaseCount: purchases.length,
    matchedCount: matchedPurchases.length,
    productIds: targets,
    hasPurchaseToken: matchedPurchases.some((purchase) => Boolean(normalize(purchase?.purchaseToken || purchase?.purchase_token || purchase?.token))),
  };
}

async function ensureBillingConnected(bridge) {
  if (typeof bridge?.connect !== "function") return null;
  try {
    const result = await bridge.connect();
    return sanitizeResult(result);
  } catch (error) {
    return { ok: false, responseCode: normalizeResponseCode(error?.responseCode || error?.code), error };
  }
}

function patchPurchaseMethod(bridge, methodName) {
  const original = bridge?.[methodName];
  if (typeof original !== "function" || original.__claraAlreadyOwnedWrapped) return;

  const wrapped = async function patchedGooglePlayPurchase(payload) {
    try {
      const result = await original.call(this, payload);
      const sanitized = sanitizeResult(result);
      if (isAlreadyOwnedSignal(sanitized)) {
        billingLog("ITEM_ALREADY_OWNED detected", {
          methodName,
          responseCode: sanitized?.responseCode || "ITEM_ALREADY_OWNED",
        });
      }
      return sanitized;
    } catch (error) {
      if (isAlreadyOwnedSignal(error)) {
        error.responseCode = "ITEM_ALREADY_OWNED";
        error.code = "ITEM_ALREADY_OWNED";
        billingLog("ITEM_ALREADY_OWNED detected", {
          methodName,
          originalCode: normalize(error?.raw?.responseCode || error?.raw?.code || error?.code || error?.responseCode),
        });
      }
      throw error;
    }
  };

  wrapped.__claraAlreadyOwnedWrapped = true;
  bridge[methodName] = wrapped;
}

function patchOwnedPurchaseQuery(bridge) {
  const original = bridge?.queryOwnedPurchases;
  if (typeof original !== "function" || original.__claraAlreadyOwnedWrapped) return false;

  const wrapped = async function patchedQueryOwnedPurchases(payload = {}) {
    const ownedPayload = buildOwnedPurchasePayload(payload);
    billingLog("querying owned Google Play purchases", {
      productIds: ownedPayload.productIds,
    });

    await ensureBillingConnected(bridge);
    const result = await original.call(this, ownedPayload);
    const sanitized = sanitizeResult(result);

    billingLog("owned purchase query result", getOwnedPurchaseDiagnostics(sanitized, ownedPayload.productIds));
    return sanitized;
  };

  wrapped.__claraAlreadyOwnedWrapped = true;
  bridge.queryOwnedPurchases = wrapped;
  return true;
}

function installRestoreAliases(bridge) {
  if (typeof bridge?.queryOwnedPurchases !== "function") return;

  RESTORE_ALIAS_METHODS.forEach((methodName) => {
    if (typeof bridge[methodName] === "function") return;
    bridge[methodName] = async function queryOwnedPurchaseAlias(payload = {}) {
      return bridge.queryOwnedPurchases(buildOwnedPurchasePayload(payload));
    };
  });
}

function getBillingBridge() {
  if (typeof window === "undefined") return null;
  return window.ClaraBilling || window.Capacitor?.Plugins?.ClaraBilling || null;
}

function patchBridge() {
  const bridge = getBillingBridge();
  if (!bridge || bridge[PATCH_MARK]) return false;

  Object.defineProperty(bridge, PATCH_MARK, {
    value: true,
    enumerable: false,
    configurable: false,
  });

  patchOwnedPurchaseQuery(bridge);
  installRestoreAliases(bridge);
  PURCHASE_METHODS.forEach((methodName) => patchPurchaseMethod(bridge, methodName));

  billingLog("already-owned restore bridge patched", {
    hasQueryOwnedPurchases: typeof bridge.queryOwnedPurchases === "function",
    restoreAliases: RESTORE_ALIAS_METHODS.filter((methodName) => typeof bridge[methodName] === "function"),
  });

  return true;
}

function installPatchWatcher() {
  let attempts = 0;
  const maxAttempts = 80;

  const tryPatch = () => {
    attempts += 1;
    if (patchBridge() || attempts >= maxAttempts) {
      clearInterval(timer);
    }
  };

  const timer = setInterval(tryPatch, 250);
  tryPatch();

  window.addEventListener("clara:billing-bridge-ready", tryPatch, { passive: true });
  window.addEventListener("capacitorReady", tryPatch, { passive: true });
  document.addEventListener("visibilitychange", tryPatch, { passive: true });
}

if (typeof window !== "undefined") {
  installPatchWatcher();
}
