import { CLARA_PRODUCTS } from "@/lib/clara-entitlements";
import { COMMITTED_PLAN_KEY, normalizePlanKey } from "@/lib/membership";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabaseClient";

const PRODUCT_IDS = {
  [COMMITTED_PLAN_KEY]: CLARA_PRODUCTS.committed.productId,
  committed: CLARA_PRODUCTS.committed.productId,
};

const PRODUCT_TYPES = {
  [CLARA_PRODUCTS.committed.productId]: "subs",
};

const TRIAL_PURCHASE_INTENT = "trial_7d";
const SEVEN_DAY_TRIAL_UNAVAILABLE_MESSAGE =
  "The 7-day trial offer is not available for this Google Play account yet.";
const SUCCESS_STATUSES = new Set(["approved", "active", "trialing"]);
const ACTIVE_ENTITLEMENT_STATUSES = new Set(["active", "approved", "trialing"]);

const normalize = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalize(value).toLowerCase();

function billingDebug(label, payload = {}) {
  if (typeof console === "undefined") return;
  console.info(`[CLARA Billing] ${label}`, payload);
}

async function getSupabaseAccessToken(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.access_token || "";
}

export function getGooglePlayProductId(planKey) {
  return PRODUCT_IDS[normalizePlanKey(planKey)] || "";
}

export function getAllGooglePlayProductIds() {
  return Array.from(new Set(Object.values(PRODUCT_IDS).filter(Boolean)));
}

function getGooglePlayProductType(productId) {
  return PRODUCT_TYPES[normalize(productId)] || "subs";
}

function isSubscriptionProduct(productId) {
  return getGooglePlayProductType(productId) === "subs";
}

function parseBridgeResult(result) {
  if (!result) return {};
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return { rawValue: result };
    }
  }
  return result;
}

function normalizeResponseCode(code) {
  if (typeof code === "string") {
    const upper = code.toUpperCase().trim();
    if (
      [
        "OK",
        "USER_CANCELED",
        "SERVICE_UNAVAILABLE",
        "BILLING_UNAVAILABLE",
        "ITEM_UNAVAILABLE",
        "DEVELOPER_ERROR",
        "ERROR",
        "ITEM_ALREADY_OWNED",
        "ITEM_NOT_OWNED",
        "SERVICE_DISCONNECTED",
        "FEATURE_NOT_SUPPORTED",
        "SERVICE_TIMEOUT",
        "NETWORK_ERROR",
        "UNKNOWN",
        "UNIMPLEMENTED",
      ].includes(upper)
    ) {
      return upper;
    }
    return "UNKNOWN";
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

function makeError(message, extra = {}) {
  const err = new Error(message);
  Object.assign(err, extra);
  return err;
}

function getBillingBridge() {
  if (typeof window === "undefined") return null;
  return window?.ClaraBilling || window?.Capacitor?.Plugins?.ClaraBilling || null;
}

function getMissingBridgeResult(message) {
  return {
    ok: false,
    responseCode: "BILLING_UNAVAILABLE",
    debugMessage: message,
    raw: null,
  };
}

function requireSupabaseClient(supabase) {
  if (!supabase) {
    throw makeError("Supabase client is required.", {
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "persistGooglePlayPurchase() was called without supabase.",
    });
  }
}

function requireAuthenticatedUserId(userId) {
  const normalizedUserId = normalize(userId);
  if (!normalizedUserId) {
    throw makeError("User not authenticated during Google Play purchase.", {
      responseCode: "DEVELOPER_ERROR",
      debugMessage:
        "Missing userId while persisting Google Play purchase. Refusing to create unknown-user enrollment.",
    });
  }
  return normalizedUserId;
}

function resolveEnrollmentStatus({ purchaseToken, orderId, bridgePayload, productId }) {
  const bridgeStatus = normalizeLower(
    bridgePayload?.status || bridgePayload?.enrollment_status || bridgePayload?.purchase_status
  );
  if (SUCCESS_STATUSES.has(bridgeStatus)) return bridgeStatus;

  const purchaseState = normalizeLower(
    bridgePayload?.purchaseState || bridgePayload?.purchase_state || bridgePayload?.state
  );
  if (purchaseState === "purchased" || purchaseState === "1") {
    return isSubscriptionProduct(productId) ? "active" : "approved";
  }
  if (normalize(purchaseToken) || normalize(orderId)) {
    return isSubscriptionProduct(productId) ? "active" : "approved";
  }
  return "google_play_pending";
}

function extractPurchases(parsed) {
  return [
    ...(Array.isArray(parsed?.purchases) ? parsed.purchases : []),
    ...(Array.isArray(parsed?.items) ? parsed.items : []),
    ...(Array.isArray(parsed?.purchaseList) ? parsed.purchaseList : []),
    ...(Array.isArray(parsed?.purchaseDataList) ? parsed.purchaseDataList : []),
    ...(Array.isArray(parsed?.subscriptions) ? parsed.subscriptions : []),
    ...(parsed?.purchase ? [parsed.purchase] : []),
    ...(parsed?.item ? [parsed.item] : []),
    ...(parsed?.subscription ? [parsed.subscription] : []),
  ]
    .map((item) => parseBridgeResult(item))
    .filter(Boolean);
}

function extractPurchaseToken(parsed, matchedPurchase = null) {
  const source = matchedPurchase || parsed || {};
  return (
    source?.purchaseToken ||
    source?.token ||
    source?.purchase_token ||
    parsed?.purchaseToken ||
    parsed?.token ||
    parsed?.purchase_token ||
    ""
  );
}

function extractOrderId(parsed, matchedPurchase = null) {
  const source = matchedPurchase || parsed || {};
  return source?.orderId || source?.order_id || parsed?.orderId || parsed?.order_id || "";
}

function extractSubscriptionFields(parsed, matchedPurchase = null) {
  const source = matchedPurchase || parsed || {};
  return {
    subscriptionId:
      source?.subscriptionId || source?.subscription_id || source?.productId || source?.product_id || "",
    basePlanId: source?.basePlanId || source?.base_plan_id || source?.basePlan || source?.offerBasePlanId || "",
    offerId: source?.offerId || source?.offer_id || "",
    offerToken:
      source?.offerToken ||
      source?.offer_token ||
      source?.subscriptionOfferToken ||
      source?.subscription_offer_token ||
      "",
    trialOffer: source?.trialOffer === true || source?.trial_offer === true,
  };
}

async function safeBridgeCall(methodName, payload) {
  const bridge = getBillingBridge();
  if (!bridge) return getMissingBridgeResult("ClaraBilling bridge object was not created.");

  const method = bridge[methodName];
  if (typeof method !== "function") {
    return getMissingBridgeResult(`ClaraBilling.${methodName}() is not available in this app build.`);
  }

  try {
    const result = payload === undefined ? await method.call(bridge) : await method.call(bridge, payload);
    return { ok: true, raw: parseBridgeResult(result) };
  } catch (error) {
    return {
      ok: false,
      responseCode: normalizeResponseCode(error?.responseCode || error?.code),
      debugMessage:
        error?.debugMessage || error?.details || error?.message || `ClaraBilling.${methodName}() failed.`,
      raw: error,
    };
  }
}

function normalizeOwnedPurchase(raw = {}) {
  const productIds = Array.isArray(raw.productIds)
    ? raw.productIds.map((id) => normalize(id)).filter(Boolean)
    : [normalize(raw.productId)].filter(Boolean);

  return {
    productIds,
    productId: productIds[0] || "",
    purchaseToken: normalize(raw.purchaseToken || raw.purchase_token || raw.token) || "",
    orderId: normalize(raw.orderId || raw.order_id) || "",
    purchaseState: raw.purchaseState,
    raw,
  };
}

async function restoreOwnedGooglePlayPurchase({
  productId,
  planKey,
  userId,
  userEmail,
  purchaseContext = "owned_restore",
}) {
  const payload = {
    productId: normalize(productId),
    planKey: normalize(planKey),
    productType: getGooglePlayProductType(productId),
    userId: normalize(userId),
    userEmail: normalize(userEmail),
    purchaseContext: normalize(purchaseContext) || "owned_restore",
  };

  const restoreMethods = [
    "restorePurchases",
    "restorePurchase",
    "getPurchases",
    "queryPurchases",
    "getOwnedPurchases",
    "getPurchaseHistory",
  ];

  for (const methodName of restoreMethods) {
    const result = await safeBridgeCall(methodName, payload);
    if (!result.ok && !result.raw) continue;

    const parsed = result.raw || {};
    const responseCode = normalizeResponseCode(parsed?.responseCode ?? parsed?.code ?? parsed?.statusCode ?? "UNKNOWN");
    const purchases = extractPurchases(parsed);
    const matchedPurchase =
      purchases.find((purchase) => {
        const purchaseProductId = normalize(
          purchase?.productId ||
            purchase?.product_id ||
            purchase?.sku ||
            purchase?.product ||
            purchase?.subscriptionId ||
            purchase?.subscription_id
        );
        return !payload.productId || purchaseProductId === payload.productId;
      }) ||
      (normalize(
        parsed?.productId ||
          parsed?.product_id ||
          parsed?.sku ||
          parsed?.product ||
          parsed?.subscriptionId ||
          parsed?.subscription_id
      ) === payload.productId
        ? parsed
        : null);

    if (matchedPurchase) {
      const subscriptionFields = extractSubscriptionFields(parsed, matchedPurchase);
      return {
        ok: true,
        restored: true,
        cancelled: false,
        responseCode: responseCode === "UNKNOWN" ? "ITEM_ALREADY_OWNED" : responseCode,
        purchaseToken: extractPurchaseToken(parsed, matchedPurchase),
        orderId: extractOrderId(parsed, matchedPurchase),
        ...subscriptionFields,
        raw: { ...parsed, restored: true, restoredVia: methodName, matchedPurchase },
      };
    }

    if (responseCode === "OK" && purchases.length === 0) {
      const subscriptionFields = extractSubscriptionFields(parsed);
      return {
        ok: true,
        restored: true,
        cancelled: false,
        responseCode: "ITEM_ALREADY_OWNED",
        purchaseToken: extractPurchaseToken(parsed),
        orderId: extractOrderId(parsed),
        ...subscriptionFields,
        raw: { ...parsed, restored: true, restoredVia: methodName },
      };
    }
  }

  throw makeError(
    "Google Play reports this item is already owned, but the restore details could not be loaded.",
    {
      responseCode: "ITEM_ALREADY_OWNED",
      debugMessage:
        "Tried restorePurchases/restorePurchase/getPurchases/queryPurchases/getOwnedPurchases/getPurchaseHistory but no matching purchase details were returned.",
    }
  );
}

export async function connectGooglePlayBilling() {
  const bridgeResult = await safeBridgeCall("connect");
  if (!bridgeResult.ok && !bridgeResult.raw) {
    return {
      ok: false,
      responseCode: bridgeResult.responseCode || "BILLING_UNAVAILABLE",
      debugMessage: bridgeResult.debugMessage || "Google Play Billing bridge is not available in this build.",
      raw: bridgeResult.raw || null,
    };
  }

  const result = bridgeResult.raw || {};
  return {
    ok: result?.ok === true || normalizeResponseCode(result?.responseCode) === "OK",
    responseCode: normalizeResponseCode(result?.responseCode),
    debugMessage: result?.debugMessage || result?.message || bridgeResult.debugMessage || "Billing connect completed.",
    raw: result,
  };
}

export async function queryGooglePlayProducts({ productIds = [] } = {}) {
  const sourceIds = Array.isArray(productIds) && productIds.length ? productIds : getAllGooglePlayProductIds();
  const cleanedProductIds = Array.from(new Set(sourceIds.map((id) => normalize(id)).filter(Boolean)));

  if (!cleanedProductIds.length) {
    return {
      ok: false,
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "No Google Play product IDs were provided.",
      foundProductIds: [],
      missingProductIds: [],
      raw: null,
    };
  }

  const payload =
    cleanedProductIds.length === 1
      ? {
          productId: cleanedProductIds[0],
          productIds: cleanedProductIds,
          productType: getGooglePlayProductType(cleanedProductIds[0]),
          productTypes: cleanedProductIds.reduce((acc, id) => {
            acc[id] = getGooglePlayProductType(id);
            return acc;
          }, {}),
        }
      : {
          productIds: cleanedProductIds,
          productTypes: cleanedProductIds.reduce((acc, id) => {
            acc[id] = getGooglePlayProductType(id);
            return acc;
          }, {}),
        };

  const bridgeResult = await safeBridgeCall("queryProducts", payload);
  billingDebug("queryProducts request", { productIds: cleanedProductIds, productTypes: payload.productTypes || {} });

  if (!bridgeResult.ok && !bridgeResult.raw) {
    return {
      ok: false,
      responseCode: bridgeResult.responseCode || "BILLING_UNAVAILABLE",
      debugMessage: bridgeResult.debugMessage || "Google Play Billing product query bridge is unavailable.",
      foundProductIds: [],
      missingProductIds: cleanedProductIds,
      raw: null,
    };
  }

  const result = bridgeResult.raw || {};
  const foundProductIds = Array.isArray(result?.foundProductIds)
    ? result.foundProductIds.map((id) => normalize(id)).filter(Boolean)
    : [];
  const productDetails = Array.isArray(result?.productDetails)
    ? result.productDetails
    : Array.isArray(result?.products)
      ? result.products
      : [];
  const unavailableProducts = Array.isArray(result?.unavailableProducts)
    ? result.unavailableProducts
    : Array.isArray(result?.unfetchedProducts)
      ? result.unfetchedProducts
      : [];
  const unavailableProductIds = unavailableProducts.map((item) => normalize(item?.productId || item?.id)).filter(Boolean);
  const bridgeMissingProductIds = Array.isArray(result?.missingProductIds)
    ? result.missingProductIds.map((id) => normalize(id)).filter(Boolean)
    : cleanedProductIds.filter((id) => !foundProductIds.includes(id));
  const missingProductIds = Array.from(new Set([...bridgeMissingProductIds, ...unavailableProductIds]));

  billingDebug("queryProducts response", {
    responseCode: normalizeResponseCode(result?.responseCode),
    debugMessage: result?.debugMessage || result?.message || "",
    foundProductIds,
    missingProductIds,
    unavailableProducts,
    productDetails,
    raw: result,
  });

  return {
    ok: result?.ok === true || normalizeResponseCode(result?.responseCode) === "OK",
    responseCode: normalizeResponseCode(result?.responseCode),
    debugMessage: result?.debugMessage || result?.message || bridgeResult.debugMessage || "Product query completed.",
    foundProductIds,
    missingProductIds,
    unavailableProductIds,
    unavailableProducts,
    productDetails,
    queriedProductIds: Array.isArray(result?.queriedProductIds) ? result.queriedProductIds : cleanedProductIds,
    queriedProductTypes: result?.queriedProductTypes || payload.productTypes || {},
    raw: result,
  };
}

export async function queryOwnedGooglePlayPurchases({ productIds = [] } = {}) {
  const targetIds = Array.isArray(productIds) && productIds.length
    ? productIds.map((id) => normalize(id)).filter(Boolean)
    : getAllGooglePlayProductIds();

  const bridgeResult = await safeBridgeCall("queryOwnedPurchases", {
    productIds: targetIds,
    productTypes: targetIds.reduce((acc, id) => {
      acc[id] = getGooglePlayProductType(id);
      return acc;
    }, {}),
  });

  if (!bridgeResult.ok && !bridgeResult.raw) {
    return {
      ok: false,
      responseCode: bridgeResult.responseCode || "BILLING_UNAVAILABLE",
      debugMessage: bridgeResult.debugMessage || "Owned purchase query is unavailable.",
      purchases: [],
      raw: null,
    };
  }

  const result = bridgeResult.raw || {};
  const purchases = Array.isArray(result.purchases) ? result.purchases.map(normalizeOwnedPurchase) : [];
  const filtered = targetIds.length
    ? purchases.filter((purchase) => purchase.productIds.some((productId) => targetIds.includes(productId)))
    : purchases;

  return {
    ok: result?.ok === true || normalizeResponseCode(result?.responseCode) === "OK",
    responseCode: normalizeResponseCode(result?.responseCode),
    debugMessage: result?.debugMessage || result?.message || bridgeResult.debugMessage || "Owned purchase query completed.",
    purchases: filtered,
    raw: result,
  };
}

export async function diagnoseGooglePlayBilling({ productId } = {}) {
  const connection = await connectGooglePlayBilling();
  if (!connection.ok) {
    return {
      ready: false,
      state: "diagnostic",
      connectCode: connection.responseCode || "BILLING_UNAVAILABLE",
      productCode: "UNKNOWN",
      message: "Google Play billing is not fully ready yet.",
      debugMessage: connection.debugMessage,
      diagnostics: {
        foundProductIds: [],
        missingProductIds: productId ? [productId] : getAllGooglePlayProductIds(),
        rawConnection: connection.raw || null,
        rawProductResult: null,
      },
    };
  }

  const targetProductIds = productId ? [productId] : getAllGooglePlayProductIds();
  const productState = await queryGooglePlayProducts({ productIds: targetProductIds });
  const ready = connection.ok && productState.ok && productState.missingProductIds.length === 0;

  return {
    ready,
    state: ready ? "ready" : "diagnostic",
    connectCode: connection.responseCode || "UNKNOWN",
    productCode: productState.responseCode || "UNKNOWN",
    message: ready
      ? "Google Play billing looks ready on this device."
      : "Google Play billing connected, but product readiness still needs attention.",
    debugMessage: productState.debugMessage || connection.debugMessage || "",
    diagnostics: {
      foundProductIds: productState.foundProductIds || [],
      missingProductIds: productState.missingProductIds || [],
      rawConnection: connection.raw || null,
      rawProductResult: productState.raw || null,
    },
  };
}

function getBridgePurchaseMethods(productType) {
  if (productType === "subs") return ["purchaseSubscription", "subscribe", "purchaseProduct", "launchPurchase", "purchase"];
  return ["purchaseOneTimeProduct", "purchaseProduct", "launchPurchase", "purchase"];
}

function getBridgeAvailabilityDebugMessage(productType, triedMethods) {
  const typeLabel = productType === "subs" ? "subscription" : "one-time product";
  return `No ClaraBilling purchase method is available for ${typeLabel}. Tried: ${triedMethods.join(", ")}.`;
}

function isSevenDayFreePhase(phase = {}) {
  const billingPeriod = normalize(phase.billingPeriod || phase.billing_period).toUpperCase();
  const priceAmountMicros = Number(phase.priceAmountMicros ?? phase.price_amount_micros ?? NaN);
  const formattedPrice = normalizeLower(phase.formattedPrice || phase.formatted_price || phase.price);
  const isFree = priceAmountMicros === 0 || formattedPrice === "free" || formattedPrice.includes("free");
  return isFree && billingPeriod === "P7D";
}

function getOfferList(productDetail = {}) {
  return [
    ...(Array.isArray(productDetail.subscriptionOfferDetails) ? productDetail.subscriptionOfferDetails : []),
    ...(Array.isArray(productDetail.offerDetails) ? productDetail.offerDetails : []),
    ...(Array.isArray(productDetail.offers) ? productDetail.offers : []),
  ];
}

function offerHasSevenDayTrial(offer = {}) {
  const phases = [
    ...(Array.isArray(offer.pricingPhases) ? offer.pricingPhases : []),
    ...(Array.isArray(offer.pricingPhaseList) ? offer.pricingPhaseList : []),
    ...(Array.isArray(offer.pricing_phases) ? offer.pricing_phases : []),
  ];
  return phases.some(isSevenDayFreePhase);
}

function productDetailsExplicitlyLackSevenDayTrial(productDetails = []) {
  const detailsWithOfferLists = productDetails.filter((detail) => getOfferList(detail).length > 0);
  if (!detailsWithOfferLists.length) return false;
  return !detailsWithOfferLists.some((detail) => getOfferList(detail).some(offerHasSevenDayTrial));
}

async function performBridgePurchase({ bridge, payload }) {
  const productType = payload?.productType || "subs";
  const methodNames = getBridgePurchaseMethods(productType);

  for (const methodName of methodNames) {
    const method = bridge?.[methodName];
    if (typeof method !== "function") continue;

    try {
      const result = await method.call(bridge, payload);
      return { methodName, parsed: parseBridgeResult(result) };
    } catch (error) {
      const normalizedCode = normalizeResponseCode(error?.responseCode || error?.code);
      const message = error?.message || "Failed to open Google Play purchase.";
      const debugMessage = error?.debugMessage || error?.details || error?.message || "";
      const requiresTrial = payload?.requireFreeTrialOffer === true || payload?.purchaseIntent === TRIAL_PURCHASE_INTENT;

      if (requiresTrial && (normalizedCode === "ITEM_UNAVAILABLE" || /trial/i.test(`${message} ${debugMessage}`))) {
        throw makeError(SEVEN_DAY_TRIAL_UNAVAILABLE_MESSAGE, {
          responseCode: "ITEM_UNAVAILABLE",
          debugMessage: debugMessage || SEVEN_DAY_TRIAL_UNAVAILABLE_MESSAGE,
        });
      }

      if (normalizedCode === "ITEM_ALREADY_OWNED") {
        throw makeError(error?.message || "Google Play item already owned.", {
          responseCode: normalizedCode,
          debugMessage,
        });
      }

      throw makeError(message, { responseCode: normalizedCode, debugMessage });
    }
  }

  throw makeError("Google Play Billing bridge was not found in this app build.", {
    responseCode: "BILLING_UNAVAILABLE",
    debugMessage: getBridgeAvailabilityDebugMessage(productType, methodNames),
  });
}

export async function launchGooglePlayPurchase({
  productId,
  planKey,
  userId,
  userEmail,
  purchaseIntent = "",
  trialDays,
} = {}) {
  if (!productId) {
    throw makeError("Invalid product ID.", {
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "Missing productId in launchGooglePlayPurchase.",
    });
  }

  const productType = getGooglePlayProductType(productId);
  const normalizedPurchaseIntent = normalize(purchaseIntent);
  const normalizedTrialDays = Number(trialDays || 0);
  const requireFreeTrialOffer = normalizedPurchaseIntent === TRIAL_PURCHASE_INTENT || normalizedTrialDays === 7;
  const payload = {
    productId: normalize(productId),
    planKey: normalize(planKey),
    productType,
    userId: normalize(userId),
    userEmail: normalize(userEmail),
    purchaseIntent: normalizedPurchaseIntent,
    trialDays: normalizedTrialDays || undefined,
    requireFreeTrialOffer,
  };

  const bridge = getBillingBridge();
  if (!bridge) {
    throw makeError("Google Play Billing bridge was not found in this app build.", {
      responseCode: "BILLING_UNAVAILABLE",
      debugMessage:
        "ClaraBilling was not found on window.ClaraBilling or window.Capacitor.Plugins.ClaraBilling.",
    });
  }

  const productState = await queryGooglePlayProducts({ productIds: [payload.productId] });
  if (!productState.ok || productState.missingProductIds.includes(payload.productId)) {
    const unavailable = (productState.unavailableProducts || []).find(
      (item) => normalize(item?.productId || item?.id) === payload.productId
    );
    throw makeError("Google Play product not found or unavailable.", {
      responseCode: productState.responseCode === "OK" ? "ITEM_UNAVAILABLE" : productState.responseCode || "ITEM_UNAVAILABLE",
      debugMessage:
        unavailable?.reason ||
        (unavailable?.statusCode
          ? `Google Play marked ${payload.productId} unavailable with status ${unavailable.statusCode}.`
          : "") ||
        productState.debugMessage ||
        `Missing product ID ${payload.productId}. Queried: ${(productState.queriedProductIds || [payload.productId]).join(", ")}. Found: ${(productState.foundProductIds || []).join(", ") || "none"}.`,
      raw: productState.raw,
    });
  }

  if (requireFreeTrialOffer && productDetailsExplicitlyLackSevenDayTrial(productState.productDetails || [])) {
    throw makeError(SEVEN_DAY_TRIAL_UNAVAILABLE_MESSAGE, {
      responseCode: "ITEM_UNAVAILABLE",
      debugMessage:
        "ProductDetails were returned, but none of the eligible subscription offers contained a free P7D pricing phase.",
      raw: productState.raw,
    });
  }

  let parsed;
  let purchaseMethodName = "";
  try {
    const purchaseResult = await performBridgePurchase({ bridge, payload });
    parsed = purchaseResult.parsed;
    purchaseMethodName = purchaseResult.methodName;
  } catch (err) {
    if (normalizeResponseCode(err?.responseCode || err?.code) === "ITEM_ALREADY_OWNED") {
      return restoreOwnedGooglePlayPurchase({ productId, planKey, userId, userEmail, purchaseContext: "already_owned" });
    }
    throw err;
  }

  const normalizedCode = normalizeResponseCode(
    parsed?.responseCode ?? parsed?.code ?? parsed?.statusCode ?? (parsed?.ok === true || parsed?.success === true ? "OK" : "UNKNOWN")
  );
  const cancelled =
    parsed?.cancelled === true ||
    parsed?.status === "cancelled" ||
    parsed?.status === "canceled" ||
    normalizedCode === "USER_CANCELED";

  if (normalizedCode === "ITEM_ALREADY_OWNED") {
    return restoreOwnedGooglePlayPurchase({ productId, planKey, userId, userEmail, purchaseContext: "already_owned" });
  }

  if (requireFreeTrialOffer && parsed?.trialOffer === false && !cancelled) {
    throw makeError(SEVEN_DAY_TRIAL_UNAVAILABLE_MESSAGE, {
      responseCode: "ITEM_UNAVAILABLE",
      debugMessage: "Native billing bridge did not confirm a selected 7-day trial offer.",
      raw: parsed,
    });
  }

  const ok =
    parsed?.ok === true ||
    parsed?.success === true ||
    parsed?.status === "purchased" ||
    parsed?.purchaseState === "PURCHASED" ||
    parsed?.purchaseState === 1 ||
    normalizeLower(parsed?.purchaseState) === "purchased" ||
    normalizedCode === "OK";

  if (!ok && !cancelled) {
    throw makeError(parsed?.message || parsed?.debugMessage || "Google Play did not confirm the purchase.", {
      responseCode: normalizedCode,
      debugMessage:
        parsed?.debugMessage ||
        parsed?.details ||
        parsed?.message ||
        `Purchase returned a non-success result from ${purchaseMethodName || "bridge method"}.`,
      raw: parsed,
    });
  }

  const subscriptionFields = extractSubscriptionFields(parsed);
  return {
    ok,
    cancelled,
    restored: false,
    responseCode: normalizedCode,
    purchaseToken: extractPurchaseToken(parsed),
    orderId: extractOrderId(parsed),
    purchaseIntent: normalizedPurchaseIntent,
    trialDays: normalizedTrialDays || undefined,
    ...subscriptionFields,
    raw: { ...parsed, purchaseMethodName, purchaseIntent: normalizedPurchaseIntent, trialDays: normalizedTrialDays || undefined },
  };
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
  requireSupabaseClient(supabase);
  const safeUserId = requireAuthenticatedUserId(userId);
  const safePlanKey = normalizePlanKey(planKey);
  const safeProductId = normalize(productId);
  const safePurchaseToken = normalize(purchaseToken);
  const safeOrderId = normalize(orderId) || null;

  if (safePlanKey !== COMMITTED_PLAN_KEY || safeProductId !== CLARA_PRODUCTS.committed.productId) {
    throw makeError("Unsupported CLARA membership product.", {
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "Only clara_commitment_249 may be purchased by the current app.",
    });
  }
  if (!safePurchaseToken) {
    throw makeError("Missing Google Play purchase token.", {
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "A purchase token is required before trusted backend verification.",
    });
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    throw makeError("Supabase is not configured for billing validation.", {
      responseCode: "VALIDATION_FAILED",
      debugMessage: "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.",
    });
  }

  const requestUrl = supabaseUrl.replace(/\/+$/, "") + "/functions/v1/verify-google-play-purchase";
  const accessToken = await getSupabaseAccessToken(supabase);
  const payload = {
    user_id: safeUserId,
    plan_key: COMMITTED_PLAN_KEY,
    product_id: safeProductId,
    purchase_token: safePurchaseToken,
    order_id: safeOrderId,
    package_name: "com.clara.lifeos.app",
    purchase_payload: bridgePayload || null,
  };

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: supabaseAnonKey,
      authorization: "Bearer " + (accessToken || supabaseAnonKey),
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = { ok: false, error: responseText || "Non-JSON validation response." };
  }

  if (!response.ok || !data?.ok) {
    throw makeError(data?.error || "Google Play purchase was not validated.", {
      responseCode: data?.code || "VALIDATION_FAILED",
      debugMessage: responseText || response.statusText,
      raw: data,
    });
  }

  return data.enrollment_id || data.purchase_id || null;
}

export async function waitForGooglePlayEntitlement({
  supabase,
  userId,
  expectedPlanKey = COMMITTED_PLAN_KEY,
  timeoutMs = 20000,
  pollMs = 1500,
}) {
  requireSupabaseClient(supabase);
  const safeUserId = requireAuthenticatedUserId(userId);
  const expected = normalizePlanKey(expectedPlanKey);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", safeUserId)
      .maybeSingle();
    if (error) throw error;

    const plan = normalizePlanKey(profile?.plan || profile?.plan_key || profile?.subscription_plan);
    const statuses = [
      profile?.activation_status,
      profile?.subscription_status,
      profile?.entitlement_status,
      profile?.enrollment_status,
      profile?.status,
    ].map(normalizeLower);
    const hasTrialingStatus = statuses.includes("trialing");
    const active = Boolean(
      plan === expected &&
        (profile?.is_activated === true ||
          profile?.program_active === true ||
          profile?.is_enrolled === true ||
          statuses.some((status) => ACTIVE_ENTITLEMENT_STATUSES.has(status)) ||
          profile?.activated_at)
    );

    if (active) return { status: hasTrialingStatus ? "trialing" : "active", profile, enrollment: null };
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { status: "pending" };
}
