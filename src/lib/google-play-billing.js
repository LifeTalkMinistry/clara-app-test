import { CLARA_PRODUCTS } from "@/lib/clara-entitlements";
import { COMMITTED_PLAN_KEY, normalizePlanKey } from "@/lib/membership";
import { COMMITTED_MONTHLY_PURCHASE_INTENT } from "@/lib/clara-commitment-framework";
import { isLocalBetaMode } from "@/lib/clara-runtime-mode";
import {
  COMMITTED_PRODUCT_ID,
  getLocalGooglePlayEntitlement,
  maskPurchaseIdentifier,
  saveLocalGooglePlayEntitlement,
  toLocalEnrollment,
} from "@/lib/local-google-play-entitlement";

const PRODUCT_IDS = {
  [COMMITTED_PLAN_KEY]: CLARA_PRODUCTS.committed.productId || COMMITTED_PRODUCT_ID,
  committed: CLARA_PRODUCTS.committed.productId || COMMITTED_PRODUCT_ID,
};

const PRODUCT_TYPES = {
  [PRODUCT_IDS[COMMITTED_PLAN_KEY]]: "subs",
};

const normalize = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalize(value).toLowerCase();

function billingDebug(label, payload = {}) {
  console.info(`[CLARA Billing] ${label}`, payload);
}

function makeError(message, extra = {}) {
  const error = new Error(message);
  Object.assign(error, extra);
  return error;
}

function parseBridgeResult(result) {
  if (!result) return {};
  if (typeof result !== "string") return result;

  try {
    return JSON.parse(result);
  } catch {
    return { rawValue: result };
  }
}

export function normalizeGooglePlayResponseCode(code) {
  if (typeof code === "string") {
    const value = code.trim().toUpperCase();
    return value || "UNKNOWN";
  }

  switch (Number(code)) {
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

export function normalizeGooglePlayPurchaseState(value) {
  if (typeof value === "string") {
    const state = value.trim().toUpperCase();
    if (state === "PURCHASED" || state === "1") return "PURCHASED";
    if (state === "PENDING" || state === "2") return "PENDING";
    return "UNSPECIFIED";
  }

  if (Number(value) === 1) return "PURCHASED";
  if (Number(value) === 2) return "PENDING";
  return "UNSPECIFIED";
}

function getBillingBridge() {
  if (typeof window === "undefined") return null;
  return window?.ClaraBilling || window?.Capacitor?.Plugins?.ClaraBilling || null;
}

async function callBillingBridge(methodName, payload) {
  const bridge = getBillingBridge();
  const method = bridge?.[methodName];

  if (typeof method !== "function") {
    throw makeError(`ClaraBilling.${methodName}() is not available in this app build.`, {
      responseCode: "BILLING_UNAVAILABLE",
      debugMessage: "The native Google Play Billing bridge is missing or not registered.",
    });
  }

  try {
    return parseBridgeResult(
      payload === undefined
        ? await method.call(bridge)
        : await method.call(bridge, payload)
    );
  } catch (error) {
    throw makeError(error?.message || `ClaraBilling.${methodName}() failed.`, {
      responseCode: normalizeGooglePlayResponseCode(
        error?.responseCode || error?.code
      ),
      debugMessage:
        error?.debugMessage || error?.details || error?.message || "",
      raw: error,
    });
  }
}

function getGooglePlayProductType(productId) {
  return PRODUCT_TYPES[normalize(productId)] || "subs";
}

export function getGooglePlayProductId(planKey) {
  return PRODUCT_IDS[normalizePlanKey(planKey)] || "";
}

export function getAllGooglePlayProductIds() {
  return [...new Set(Object.values(PRODUCT_IDS).filter(Boolean))];
}

export async function connectGooglePlayBilling() {
  try {
    const result = await callBillingBridge("connect");
    const responseCode = normalizeGooglePlayResponseCode(result?.responseCode);
    return {
      ok: result?.ok === true || responseCode === "OK",
      responseCode,
      debugMessage: result?.debugMessage || "Billing connection completed.",
      raw: result,
    };
  } catch (error) {
    return {
      ok: false,
      responseCode: error?.responseCode || "BILLING_UNAVAILABLE",
      debugMessage: error?.debugMessage || error?.message || "",
      raw: error?.raw || null,
    };
  }
}

async function requireBillingConnection(context) {
  const connection = await connectGooglePlayBilling();
  if (!connection.ok) {
    throw makeError("Google Play Billing is not ready yet.", {
      responseCode: connection.responseCode,
      debugMessage:
        connection.debugMessage || `Billing failed before ${context}.`,
      raw: connection.raw,
    });
  }
  return connection;
}

export async function queryGooglePlayProducts({ productIds = [] } = {}) {
  const ids = [...new Set(
    (productIds.length ? productIds : getAllGooglePlayProductIds())
      .map(normalize)
      .filter(Boolean)
  )];

  if (!ids.length) {
    return {
      ok: false,
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "No Google Play product IDs were provided.",
      foundProductIds: [],
      missingProductIds: [],
      unavailableProductIds: [],
      unavailableProducts: [],
      productDetails: [],
    };
  }

  try {
    const connection = await requireBillingConnection("product query");
    const result = await callBillingBridge("queryProducts", {
      productId: ids[0],
      productIds: ids,
      productType: getGooglePlayProductType(ids[0]),
      productTypes: Object.fromEntries(
        ids.map((id) => [id, getGooglePlayProductType(id)])
      ),
    });
    const responseCode = normalizeGooglePlayResponseCode(result?.responseCode);
    const foundProductIds = Array.isArray(result?.foundProductIds)
      ? result.foundProductIds.map(normalize).filter(Boolean)
      : [];
    const unavailableProducts = Array.isArray(result?.unavailableProducts)
      ? result.unavailableProducts
      : [];
    const unavailableProductIds = Array.isArray(result?.unavailableProductIds)
      ? result.unavailableProductIds.map(normalize).filter(Boolean)
      : unavailableProducts
          .map((item) => normalize(item?.productId))
          .filter(Boolean);
    const missingProductIds = Array.isArray(result?.missingProductIds)
      ? result.missingProductIds.map(normalize).filter(Boolean)
      : ids.filter((id) => !foundProductIds.includes(id));

    return {
      ok: result?.ok === true || responseCode === "OK",
      responseCode,
      debugMessage: result?.debugMessage || "Product query completed.",
      foundProductIds,
      missingProductIds: [...new Set([...missingProductIds, ...unavailableProductIds])],
      unavailableProductIds,
      unavailableProducts,
      productDetails: Array.isArray(result?.productDetails)
        ? result.productDetails
        : [],
      queriedProductIds: result?.queriedProductIds || ids,
      queriedProductTypes:
        result?.queriedProductTypes ||
        Object.fromEntries(ids.map((id) => [id, getGooglePlayProductType(id)])),
      billingConnection: connection,
      raw: result,
    };
  } catch (error) {
    return {
      ok: false,
      responseCode: error?.responseCode || "BILLING_UNAVAILABLE",
      debugMessage: error?.debugMessage || error?.message || "",
      foundProductIds: [],
      missingProductIds: ids,
      unavailableProductIds: [],
      unavailableProducts: [],
      productDetails: [],
      queriedProductIds: ids,
      queriedProductTypes: Object.fromEntries(
        ids.map((id) => [id, getGooglePlayProductType(id)])
      ),
      raw: error?.raw || null,
    };
  }
}

function normalizeOwnedPurchase(raw = {}) {
  const productIds = Array.isArray(raw?.productIds)
    ? raw.productIds.map(normalize).filter(Boolean)
    : [normalize(raw?.productId)].filter(Boolean);

  return {
    productIds,
    productId: productIds[0] || "",
    purchaseToken: normalize(
      raw?.purchaseToken || raw?.purchase_token || raw?.token
    ),
    orderId: normalize(raw?.orderId || raw?.order_id),
    purchaseState: normalizeGooglePlayPurchaseState(raw?.purchaseState),
    isAcknowledged:
      typeof raw?.isAcknowledged === "boolean"
        ? raw.isAcknowledged
        : typeof raw?.acknowledged === "boolean"
          ? raw.acknowledged
          : null,
    purchaseTime: Number(raw?.purchaseTime || 0) || null,
    quantity: Number(raw?.quantity || 1) || 1,
    raw,
  };
}

export async function queryOwnedGooglePlayPurchases({ productIds = [] } = {}) {
  const ids = (productIds.length ? productIds : getAllGooglePlayProductIds())
    .map(normalize)
    .filter(Boolean);

  try {
    await requireBillingConnection("owned purchase query");
    const result = await callBillingBridge("queryOwnedPurchases", {
      productIds: ids,
      productTypes: Object.fromEntries(
        ids.map((id) => [id, getGooglePlayProductType(id)])
      ),
    });
    const responseCode = normalizeGooglePlayResponseCode(result?.responseCode);
    const purchases = (Array.isArray(result?.purchases) ? result.purchases : [])
      .map(normalizeOwnedPurchase)
      .filter(
        (purchase) =>
          !ids.length ||
          purchase.productIds.some((productId) => ids.includes(productId))
      );

    return {
      ok: result?.ok === true || responseCode === "OK",
      responseCode,
      debugMessage: result?.debugMessage || "Owned purchase query completed.",
      purchases,
      raw: result,
    };
  } catch (error) {
    return {
      ok: false,
      responseCode: error?.responseCode || "BILLING_UNAVAILABLE",
      debugMessage: error?.debugMessage || error?.message || "",
      purchases: [],
      raw: error?.raw || null,
    };
  }
}

export function findCommittedOwnedPurchase(purchases = []) {
  const productId = getGooglePlayProductId(COMMITTED_PLAN_KEY);
  return (
    purchases.find((purchase) =>
      purchase?.productIds?.includes(productId)
    ) || null
  );
}

export async function acknowledgeGooglePlayPurchase(purchaseToken) {
  const token = normalize(purchaseToken);
  if (!token) {
    throw makeError("Missing Google Play purchase token.", {
      responseCode: "DEVELOPER_ERROR",
    });
  }

  const result = await callBillingBridge("acknowledgePurchase", {
    purchaseToken: token,
  });
  const responseCode = normalizeGooglePlayResponseCode(result?.responseCode);

  if (!(result?.ok === true || responseCode === "OK")) {
    throw makeError("Google Play purchase acknowledgment failed.", {
      responseCode,
      debugMessage: result?.debugMessage || "",
      raw: result,
    });
  }

  return {
    ok: true,
    responseCode,
    debugMessage: result?.debugMessage || "Purchase acknowledged.",
    raw: result,
  };
}

export async function diagnoseGooglePlayBilling({ productId } = {}) {
  const targetIds = productId ? [productId] : getAllGooglePlayProductIds();
  const connection = await connectGooglePlayBilling();

  if (!connection.ok) {
    return {
      ready: false,
      state: "diagnostic",
      connectCode: connection.responseCode,
      productCode: "UNKNOWN",
      message: "Google Play billing is not fully ready yet.",
      debugMessage: connection.debugMessage,
      diagnostics: {
        ...(connection.raw || {}),
        hasBridge: Boolean(getBillingBridge()),
        foundProductIds: [],
        missingProductIds: targetIds,
        rawConnection: connection.raw,
      },
    };
  }

  const products = await queryGooglePlayProducts({ productIds: targetIds });
  const ready = products.ok && products.missingProductIds.length === 0;
  return {
    ready,
    state: ready ? "ready" : "diagnostic",
    connectCode: connection.responseCode,
    productCode: products.responseCode,
    message: ready
      ? "Google Play purchases look ready on this device."
      : "Google Play billing connected, but product readiness still needs attention.",
    debugMessage: products.debugMessage || connection.debugMessage,
    possibleCauses: ready
      ? []
      : [
          "tester account not opted in",
          "wrong Google account on the device",
          "product or base plan is not active for this test track",
        ],
    diagnostics: {
      ...(connection.raw || {}),
      hasBridge: Boolean(getBillingBridge()),
      foundProductIds: products.foundProductIds,
      missingProductIds: products.missingProductIds,
      unavailableProductIds: products.unavailableProductIds,
      unavailableProducts: products.unavailableProducts,
      productDetails: products.productDetails,
      queriedProductIds: products.queriedProductIds,
      queriedProductTypes: products.queriedProductTypes,
      rawConnection: connection.raw,
      rawProductResult: products.raw,
    },
  };
}

export async function launchGooglePlayPurchase({
  productId,
  planKey,
  userId,
  userEmail,
  purchaseIntent = COMMITTED_MONTHLY_PURCHASE_INTENT,
} = {}) {
  const safeProductId = normalize(productId);
  if (!safeProductId) {
    throw makeError("Invalid product ID.", {
      responseCode: "DEVELOPER_ERROR",
    });
  }

  await requireBillingConnection("purchase");
  const productState = await queryGooglePlayProducts({
    productIds: [safeProductId],
  });

  if (!productState.ok || productState.missingProductIds.includes(safeProductId)) {
    throw makeError("Google Play product not found or unavailable.", {
      responseCode:
        productState.responseCode === "OK"
          ? "ITEM_UNAVAILABLE"
          : productState.responseCode,
      debugMessage: productState.debugMessage,
      raw: productState.raw,
    });
  }

  let result;
  try {
    result = await callBillingBridge("launchPurchase", {
      productId: safeProductId,
      planKey: normalizePlanKey(planKey) || COMMITTED_PLAN_KEY,
      productType: getGooglePlayProductType(safeProductId),
      userId: normalize(userId),
      userEmail: normalize(userEmail),
      purchaseIntent: COMMITTED_MONTHLY_PURCHASE_INTENT,
    });
  } catch (error) {
    if (error?.responseCode === "ITEM_ALREADY_OWNED") {
      const owned = await queryOwnedGooglePlayPurchases({
        productIds: [safeProductId],
      });
      const purchase = findCommittedOwnedPurchase(owned.purchases);
      if (purchase) {
        return {
          ok: purchase.purchaseState === "PURCHASED",
          pending: purchase.purchaseState === "PENDING",
          cancelled: false,
          restored: true,
          responseCode: "ITEM_ALREADY_OWNED",
          ...purchase,
          raw: purchase.raw,
        };
      }
    }
    throw error;
  }

  const responseCode = normalizeGooglePlayResponseCode(result?.responseCode);
  const purchaseState = normalizeGooglePlayPurchaseState(result?.purchaseState);
  const cancelled =
    result?.cancelled === true || responseCode === "USER_CANCELED";
  const pending = result?.pending === true || purchaseState === "PENDING";
  const purchased = purchaseState === "PURCHASED";

  if (!cancelled && !pending && !purchased) {
    throw makeError("Google Play did not confirm a completed purchase.", {
      responseCode,
      debugMessage: result?.debugMessage || "Purchase state was not PURCHASED.",
      raw: result,
    });
  }

  return {
    ok: purchased,
    pending,
    cancelled,
    restored: false,
    responseCode,
    purchaseState,
    purchaseToken: normalize(result?.purchaseToken),
    orderId: normalize(result?.orderId),
    isAcknowledged:
      typeof result?.isAcknowledged === "boolean"
        ? result.isAcknowledged
        : null,
    purchaseIntent,
    raw: result,
  };
}

function entitlementResult(entitlement, purchase = null) {
  return {
    state: entitlement.state,
    isActive: entitlement.state === "active",
    isPending: entitlement.state === "pending",
    isUnknown: entitlement.state === "unknown",
    acknowledged: entitlement.acknowledged,
    purchase,
    entitlement,
    error: null,
  };
}

async function savePurchasedEntitlement(localUserId, purchase) {
  let acknowledged = purchase?.isAcknowledged === true;

  if (!acknowledged) {
    await acknowledgeGooglePlayPurchase(purchase?.purchaseToken);
    acknowledged = true;
  }

  const timestamp = new Date().toISOString();
  const entitlement = saveLocalGooglePlayEntitlement(localUserId, {
    state: "active",
    previousConfirmedState: "active",
    purchaseState: "PURCHASED",
    acknowledged,
    lastVerifiedAt: timestamp,
    lastSuccessfulQueryAt: timestamp,
    purchaseTokenMasked: maskPurchaseIdentifier(purchase?.purchaseToken),
    orderIdMasked: maskPurchaseIdentifier(purchase?.orderId),
    errorCode: null,
  });

  return entitlementResult(entitlement, purchase);
}

export async function syncGooglePlayEntitlement({
  localUserId,
  reason = "manual_refresh",
} = {}) {
  const userId = normalize(localUserId);
  if (!userId) {
    throw makeError("A local user ID is required for entitlement sync.", {
      responseCode: "DEVELOPER_ERROR",
    });
  }

  billingDebug("entitlement sync started", { reason });
  const previous = getLocalGooglePlayEntitlement(userId);
  const owned = await queryOwnedGooglePlayPurchases({
    productIds: [getGooglePlayProductId(COMMITTED_PLAN_KEY)],
  });

  if (!owned.ok) {
    const entitlement = saveLocalGooglePlayEntitlement(userId, {
      state: "unknown",
      previousConfirmedState:
        previous?.state === "active" || previous?.previousConfirmedState === "active"
          ? "active"
          : "inactive",
      purchaseState: previous?.purchaseState || "UNSPECIFIED",
      acknowledged: previous?.acknowledged ?? null,
      lastVerifiedAt: previous?.lastVerifiedAt || null,
      errorCode: owned.responseCode || "BILLING_UNAVAILABLE",
    });

    return {
      ...entitlementResult(entitlement),
      error: makeError("Google Play ownership could not be verified.", {
        responseCode: owned.responseCode,
        debugMessage: owned.debugMessage,
      }),
    };
  }

  const purchase = findCommittedOwnedPurchase(owned.purchases);
  const timestamp = new Date().toISOString();

  if (!purchase) {
    const entitlement = saveLocalGooglePlayEntitlement(userId, {
      state: "inactive",
      previousConfirmedState: "inactive",
      purchaseState: "UNSPECIFIED",
      acknowledged: null,
      lastVerifiedAt: timestamp,
      lastSuccessfulQueryAt: timestamp,
      purchaseTokenMasked: null,
      orderIdMasked: null,
      errorCode: null,
    });
    return entitlementResult(entitlement);
  }

  if (purchase.purchaseState === "PENDING") {
    const entitlement = saveLocalGooglePlayEntitlement(userId, {
      state: "pending",
      previousConfirmedState:
        previous?.previousConfirmedState ||
        (previous?.state === "active" ? "active" : "inactive"),
      purchaseState: "PENDING",
      acknowledged: false,
      lastSuccessfulQueryAt: timestamp,
      purchaseTokenMasked: maskPurchaseIdentifier(purchase.purchaseToken),
      orderIdMasked: maskPurchaseIdentifier(purchase.orderId),
      errorCode: null,
    });
    return entitlementResult(entitlement, purchase);
  }

  if (purchase.purchaseState !== "PURCHASED") {
    const entitlement = saveLocalGooglePlayEntitlement(userId, {
      state: "inactive",
      previousConfirmedState: "inactive",
      purchaseState: "UNSPECIFIED",
      acknowledged: purchase.isAcknowledged,
      lastVerifiedAt: timestamp,
      lastSuccessfulQueryAt: timestamp,
      errorCode: null,
    });
    return entitlementResult(entitlement, purchase);
  }

  try {
    return await savePurchasedEntitlement(userId, purchase);
  } catch (error) {
    const entitlement = saveLocalGooglePlayEntitlement(userId, {
      state: "unknown",
      previousConfirmedState:
        previous?.state === "active" || previous?.previousConfirmedState === "active"
          ? "active"
          : "inactive",
      purchaseState: "PURCHASED",
      acknowledged: false,
      lastVerifiedAt: previous?.lastVerifiedAt || null,
      errorCode: error?.responseCode || "ACKNOWLEDGMENT_FAILED",
    });
    return {
      ...entitlementResult(entitlement, purchase),
      error,
    };
  }
}

export async function persistGooglePlayPurchase({
  supabase,
  userId,
  planKey,
  productId,
  purchaseToken,
  orderId,
  bridgePayload,
}) {
  const safeUserId = normalize(userId);
  const safePlanKey = normalizePlanKey(planKey);
  const safeProductId = normalize(productId);

  if (!safeUserId) {
    throw makeError("Missing local user during purchase finalization.", {
      responseCode: "DEVELOPER_ERROR",
    });
  }

  if (
    safePlanKey !== COMMITTED_PLAN_KEY ||
    safeProductId !== getGooglePlayProductId(COMMITTED_PLAN_KEY)
  ) {
    throw makeError("Unsupported CLARA membership product.", {
      responseCode: "DEVELOPER_ERROR",
    });
  }

  if (!isLocalBetaMode()) {
    const { data, error } = await supabase.functions.invoke(
      "verify-google-play-purchase",
      {
        body: {
          user_id: safeUserId,
          plan_key: safePlanKey,
          product_id: safeProductId,
          purchase_token: normalize(purchaseToken),
          order_id: normalize(orderId) || null,
          package_name: "com.clara.lifeos.app",
          purchase_payload: bridgePayload || null,
        },
      }
    );
    if (error || !data?.ok) {
      throw error || new Error(data?.error || "Purchase verification failed.");
    }
    return data?.enrollment_id || data?.purchase_id || null;
  }

  const raw = bridgePayload || {};
  const purchaseState = normalizeGooglePlayPurchaseState(
    raw?.purchaseState ?? (purchaseToken ? "PURCHASED" : "UNSPECIFIED")
  );
  const purchase = normalizeOwnedPurchase({
    ...raw,
    productIds: raw?.productIds || [safeProductId],
    purchaseToken: purchaseToken || raw?.purchaseToken,
    orderId: orderId || raw?.orderId,
    purchaseState,
  });

  if (purchaseState === "PENDING") {
    saveLocalGooglePlayEntitlement(safeUserId, {
      state: "pending",
      purchaseState: "PENDING",
      acknowledged: false,
      lastSuccessfulQueryAt: new Date().toISOString(),
      purchaseTokenMasked: maskPurchaseIdentifier(purchase.purchaseToken),
      orderIdMasked: maskPurchaseIdentifier(purchase.orderId),
      errorCode: null,
    });
    return null;
  }

  if (purchaseState !== "PURCHASED" || !purchase.purchaseToken) {
    throw makeError("Google Play did not return a completed purchase.", {
      responseCode: "PURCHASE_NOT_COMPLETED",
      debugMessage: "Committed access requires purchaseState PURCHASED and a purchase token.",
    });
  }

  const result = await savePurchasedEntitlement(safeUserId, purchase);
  return result?.entitlement?.localUserId || null;
}

export async function waitForGooglePlayEntitlement({
  supabase,
  userId,
  expectedPlanKey = COMMITTED_PLAN_KEY,
  timeoutMs = 20000,
  pollMs = 1500,
}) {
  const safeUserId = normalize(userId);

  if (isLocalBetaMode()) {
    const entitlement = getLocalGooglePlayEntitlement(safeUserId);
    const enrollment = toLocalEnrollment(entitlement);
    return {
      status:
        entitlement.state === "active"
          ? "active"
          : entitlement.state === "pending"
            ? "pending"
            : entitlement.state,
      profile: null,
      enrollment,
    };
  }

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", safeUserId)
      .maybeSingle();
    if (error) throw error;

    const plan = normalizePlanKey(
      profile?.plan || profile?.plan_key || profile?.subscription_plan
    );
    const active =
      plan === normalizePlanKey(expectedPlanKey) &&
      (profile?.is_activated === true ||
        profile?.program_active === true ||
        profile?.subscription_status === "active");

    if (active) return { status: "active", profile, enrollment: null };
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { status: "pending" };
}
