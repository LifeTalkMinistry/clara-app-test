import { CLARA_PRODUCTS, getClaraProductByPlan } from "@/lib/clara-entitlements";

const PRODUCT_IDS = {
  entry: CLARA_PRODUCTS.pro.productId,
  core: CLARA_PRODUCTS.program.productId,
  coach: CLARA_PRODUCTS.coaching.productId,
  coaching: CLARA_PRODUCTS.coaching.productId,
};

const PRODUCT_TYPES = {
  [CLARA_PRODUCTS.pro.productId]: "subs",
  [CLARA_PRODUCTS.program.productId]: "inapp",
  [CLARA_PRODUCTS.coaching.productId]: "inapp",
};

const SUCCESS_STATUSES = new Set(["approved", "active"]);

const normalize = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalize(value).toLowerCase();

export function getGooglePlayProductId(planKey) {
  return PRODUCT_IDS[normalizeLower(planKey)] || "";
}

export function getAllGooglePlayProductIds() {
  return Array.from(new Set(Object.values(PRODUCT_IDS).filter(Boolean)));
}

function getGooglePlayProductType(productId) {
  return PRODUCT_TYPES[normalize(productId)] || "inapp";
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
      upper === "OK" ||
      upper === "USER_CANCELED" ||
      upper === "SERVICE_UNAVAILABLE" ||
      upper === "BILLING_UNAVAILABLE" ||
      upper === "ITEM_UNAVAILABLE" ||
      upper === "DEVELOPER_ERROR" ||
      upper === "ERROR" ||
      upper === "ITEM_ALREADY_OWNED" ||
      upper === "ITEM_NOT_OWNED" ||
      upper === "SERVICE_DISCONNECTED" ||
      upper === "FEATURE_NOT_SUPPORTED" ||
      upper === "SERVICE_TIMEOUT" ||
      upper === "NETWORK_ERROR" ||
      upper === "UNKNOWN" ||
      upper === "UNIMPLEMENTED"
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

function resolveEnrollmentStatus({ purchaseToken, orderId, bridgePayload }) {
  const bridgeStatus = normalizeLower(
    bridgePayload?.status ||
      bridgePayload?.enrollment_status ||
      bridgePayload?.purchase_status
  );

  if (SUCCESS_STATUSES.has(bridgeStatus)) {
    return bridgeStatus;
  }

  if (normalize(purchaseToken) || normalize(orderId)) {
    return "approved";
  }

  return "google_play_pending";
}

async function safeBridgeCall(methodName, payload) {
  const bridge = getBillingBridge();

  if (!bridge) {
    return getMissingBridgeResult("ClaraBilling bridge object was not created.");
  }

  const method = bridge[methodName];

  if (typeof method !== "function") {
    return getMissingBridgeResult(
      `ClaraBilling.${methodName}() is not available in this app build.`
    );
  }

  try {
    const result =
      payload === undefined
        ? await method.call(bridge)
        : await method.call(bridge, payload);

    return {
      ok: true,
      raw: parseBridgeResult(result),
    };
  } catch (error) {
    return {
      ok: false,
      responseCode: normalizeResponseCode(error?.responseCode || error?.code),
      debugMessage:
        error?.debugMessage ||
        error?.details ||
        error?.message ||
        `ClaraBilling.${methodName}() failed.`,
      raw: error,
    };
  }
}

export async function connectGooglePlayBilling() {
  const bridgeResult = await safeBridgeCall("connect");

  if (!bridgeResult.ok && !bridgeResult.raw) {
    return {
      ok: false,
      responseCode: bridgeResult.responseCode || "BILLING_UNAVAILABLE",
      debugMessage:
        bridgeResult.debugMessage ||
        "Google Play Billing bridge is not available in this build.",
      raw: bridgeResult.raw || null,
    };
  }

  const result = bridgeResult.raw || {};

  return {
    ok:
      result?.ok === true ||
      normalizeResponseCode(result?.responseCode) === "OK",
    responseCode: normalizeResponseCode(result?.responseCode),
    debugMessage:
      result?.debugMessage ||
      result?.message ||
      bridgeResult.debugMessage ||
      "Billing connect completed.",
    raw: result,
  };
}

export async function queryGooglePlayProducts({ productIds = [] } = {}) {
  const sourceIds =
    Array.isArray(productIds) && productIds.length
      ? productIds
      : getAllGooglePlayProductIds();

  const cleanedProductIds = Array.from(
    new Set(sourceIds.map((id) => normalize(id)).filter(Boolean))
  );

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

  if (!bridgeResult.ok && !bridgeResult.raw) {
    return {
      ok: false,
      responseCode: bridgeResult.responseCode || "BILLING_UNAVAILABLE",
      debugMessage:
        bridgeResult.debugMessage ||
        "Google Play Billing product query bridge is unavailable.",
      foundProductIds: [],
      missingProductIds: cleanedProductIds,
      raw: null,
    };
  }

  const result = bridgeResult.raw || {};

  const foundProductIds = Array.isArray(result?.foundProductIds)
    ? result.foundProductIds.map((id) => normalize(id)).filter(Boolean)
    : [];

  const missingProductIds = Array.isArray(result?.missingProductIds)
    ? result.missingProductIds.map((id) => normalize(id)).filter(Boolean)
    : cleanedProductIds.filter((id) => !foundProductIds.includes(id));

  return {
    ok:
      result?.ok === true ||
      normalizeResponseCode(result?.responseCode) === "OK",
    responseCode: normalizeResponseCode(result?.responseCode),
    debugMessage:
      result?.debugMessage ||
      result?.message ||
      bridgeResult.debugMessage ||
      "Product query completed.",
    foundProductIds,
    missingProductIds,
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
        missingProductIds: productId
          ? [productId]
          : getAllGooglePlayProductIds(),
        rawConnection: connection.raw || null,
        rawProductResult: null,
      },
    };
  }

  const targetProductIds = productId
    ? [productId]
    : getAllGooglePlayProductIds();

  const productState = await queryGooglePlayProducts({
    productIds: targetProductIds,
  });

  const ready =
    connection.ok &&
    productState.ok &&
    productState.missingProductIds.length === 0;

  return {
    ready,
    state: ready ? "ready" : "diagnostic",
    connectCode: connection.responseCode || "UNKNOWN",
    productCode: productState.responseCode || "UNKNOWN",
    message: ready
      ? "Google Play billing looks ready on this device."
      : "Google Play billing connected, but product readiness still needs attention.",
    debugMessage:
      productState.debugMessage || connection.debugMessage || "",
    diagnostics: {
      foundProductIds: productState.foundProductIds || [],
      missingProductIds: productState.missingProductIds || [],
      rawConnection: connection.raw || null,
      rawProductResult: productState.raw || null,
    },
  };
}

export async function launchGooglePlayPurchase({
  productId,
  planKey,
  userId,
  userEmail,
}) {
  if (!productId) {
    throw makeError("Invalid product ID.", {
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "Missing productId in launchGooglePlayPurchase.",
    });
  }

  const payload = {
    productId: normalize(productId),
    planKey: normalize(planKey),
    productType: getGooglePlayProductType(productId),
    userId: normalize(userId),
    userEmail: normalize(userEmail),
  };

  const bridge = getBillingBridge();

  if (!bridge || typeof bridge.purchaseOneTimeProduct !== "function") {
    throw makeError("Google Play Billing bridge was not found in this app build.", {
      responseCode: "BILLING_UNAVAILABLE",
      debugMessage:
        "ClaraBilling purchaseOneTimeProduct() is not available through registerPlugin().",
    });
  }

  let parsed;

  try {
    parsed = parseBridgeResult(await bridge.purchaseOneTimeProduct(payload));
  } catch (err) {
    throw makeError(err?.message || "Failed to open Google Play purchase.", {
      responseCode: normalizeResponseCode(err?.responseCode || err?.code),
      debugMessage:
        err?.debugMessage || err?.details || err?.message || "",
    });
  }

  const normalizedCode = normalizeResponseCode(
    parsed?.responseCode ??
      parsed?.code ??
      parsed?.statusCode ??
      (parsed?.ok === true || parsed?.success === true ? "OK" : "UNKNOWN")
  );

  const cancelled =
    parsed?.cancelled === true ||
    parsed?.status === "cancelled" ||
    parsed?.status === "canceled" ||
    normalizedCode === "USER_CANCELED";

  const ok =
    parsed?.ok === true ||
    parsed?.success === true ||
    parsed?.status === "purchased" ||
    parsed?.purchaseState === "PURCHASED" ||
    parsed?.purchaseState === 1 ||
    normalizedCode === "OK";

  if (!ok && !cancelled) {
    throw makeError(
      parsed?.message ||
        parsed?.debugMessage ||
        "Google Play did not confirm the purchase.",
      {
        responseCode: normalizedCode,
        debugMessage:
          parsed?.debugMessage ||
          parsed?.details ||
          parsed?.message ||
          "Purchase returned a non-success result.",
        raw: parsed,
      }
    );
  }

  return {
    ok,
    cancelled,
    responseCode: normalizedCode,
    purchaseToken:
      parsed?.purchaseToken ||
      parsed?.token ||
      parsed?.purchase_token ||
      "",
    orderId: parsed?.orderId || parsed?.order_id || "",
    raw: parsed,
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
  const safePlanKey = normalize(planKey);
  const safeProductId = normalize(productId);
  const safePurchaseToken = normalize(purchaseToken) || null;
  const safeOrderId = normalize(orderId) || null;
  const resolvedStatus = resolveEnrollmentStatus({
    purchaseToken: safePurchaseToken,
    orderId: safeOrderId,
    bridgePayload,
  });

  if (!safePlanKey) {
    throw makeError("Missing Google Play plan key.", {
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "persistGooglePlayPurchase() was called without planKey.",
    });
  }

  if (!safeProductId) {
    throw makeError("Missing Google Play product ID.", {
      responseCode: "DEVELOPER_ERROR",
      debugMessage: "persistGooglePlayPurchase() was called without productId.",
    });
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "verify-google-play-purchase",
      {
        body: {
          plan_key: safePlanKey,
          product_id: safeProductId,
          purchase_token: safePurchaseToken,
          order_id: safeOrderId,
          package_name: "com.clara.moneytracker",
          purchase_payload: bridgePayload || null,
        },
      }
    );

    if (!error && data?.ok) {
      return data.enrollment_id || data.purchase_id || null;
    }
  } catch (error) {
    console.warn("Server-side Google Play verification is pending:", error);
  }

  const payload = {
    user_id: safeUserId,
    plan: safePlanKey,
    plan_key: safePlanKey,
    tier_type: getClaraProductByPlan(safePlanKey)?.tierType || safePlanKey,
    product_id: safeProductId,
    play_product_id: safeProductId,
    purchase_token: safePurchaseToken,
    play_purchase_token: safePurchaseToken,
    order_id: safeOrderId,
    source: "google_play",
    purchase_source: "google_play",
    status: resolvedStatus,
    purchase_payload: bridgePayload || null,
  };

  let existing = null;

  if (safePurchaseToken) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("id")
      .eq("purchase_token", safePurchaseToken)
      .maybeSingle();

    if (error) throw error;
    existing = data || null;
  }

  if (!existing && safeOrderId) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("id")
      .eq("order_id", safeOrderId)
      .maybeSingle();

    if (error) throw error;
    existing = data || null;
  }

  if (!existing) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", safeUserId)
      .eq("product_id", safeProductId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    existing = data || null;
  }

  if (!existing) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", safeUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    existing = data || null;
  }

  let enrollmentId = null;

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("enrollments")
      .update(payload)
      .eq("id", existing.id);

    if (updateError) throw updateError;
    enrollmentId = existing.id;
  } else {
    const { data, error: insertError } = await supabase
      .from("enrollments")
      .insert([payload])
      .select("id")
      .single();

    if (insertError) throw insertError;
    enrollmentId = data?.id || null;
  }

  if (resolvedStatus === "approved" || resolvedStatus === "active") {
    const product = getClaraProductByPlan(safePlanKey);
    const isProOnly = safePlanKey === "entry";
    const profilePatch = isProOnly
      ? {
          plan: "entry",
          tier_type: product?.tierType || "pro_tools",
          purchase_source: "google_play",
          play_product_id: safeProductId,
          play_purchase_token: safePurchaseToken,
          pro_subscription_status: "active",
          entitlement_status: "pro_subscription",
          is_enrolled: false,
          program_active: false,
          enrollment_status: resolvedStatus,
        }
      : {
          plan: safePlanKey,
          tier_type: product?.tierType || safePlanKey,
          purchase_source: "google_play",
          play_product_id: safeProductId,
          play_purchase_token: safePurchaseToken,
          is_enrolled: true,
          program_active: false,
          enrollment_status: resolvedStatus,
          entitlement_status: "program_available",
          coaching_credits_total:
            safePlanKey === "coaching" ? product?.coachingCredits || 2 : 0,
        };

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", safeUserId);

    if (profileUpdateError) {
      throw profileUpdateError;
    }
  }

  return enrollmentId;
}

export async function waitForGooglePlayEntitlement({
  supabase,
  userId,
  expectedPlanKey,
  timeoutMs = 20000,
  pollMs = 1500,
}) {
  requireSupabaseClient(supabase);

  const safeUserId = requireAuthenticatedUserId(userId);
  const expected = normalizeLower(expectedPlanKey);
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const [
      { data: profile, error: profileError },
      { data: enrollment, error: enrollmentError },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", safeUserId).maybeSingle(),
      supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", safeUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (profileError) throw profileError;
    if (enrollmentError) throw enrollmentError;

    const enrollmentStatus = normalizeLower(enrollment?.status);
    const enrollmentPlan = normalizeLower(
      enrollment?.plan_key || enrollment?.plan
    );
    const profilePlan = normalizeLower(profile?.plan);
    const profileEnrollmentStatus = normalizeLower(profile?.enrollment_status);

    const unlocked =
      SUCCESS_STATUSES.has(enrollmentStatus) ||
      SUCCESS_STATUSES.has(profileEnrollmentStatus) ||
      profile?.program_active === true ||
      profile?.is_enrolled === true ||
      profilePlan === expected ||
      (enrollmentPlan === expected && SUCCESS_STATUSES.has(enrollmentStatus));

    if (unlocked) {
      return {
        status: "active",
        profile,
        enrollment,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { status: "pending" };
}
