const PRODUCT_IDS = {
  entry: "clara_entry_299",
  core: "clara_core_499",
  coaching: "clara_coaching_999",
};

const SUCCESS_STATUSES = new Set(["approved", "active"]);

const normalize = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalize(value).toLowerCase();

export function getGooglePlayProductId(planKey) {
  return PRODUCT_IDS[normalizeLower(planKey)] || "";
}

/**
 * Detect Android billing bridge safely
 */
function getBillingBridge() {
  if (typeof window === "undefined") return null;

  return (
    window.ClaraBilling ||
    window.AndroidBilling ||
    window.Capacitor?.Plugins?.Billing ||
    window.Capacitor?.Plugins?.InAppPurchase ||
    window.googlePlayBilling ||
    window.AndroidBridge ||
    null
  );
}

/**
 * Normalize any result coming from Android bridge
 */
function parseBridgeResult(result) {
  if (!result) return { ok: false };

  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return { ok: true, raw: result };
    }
  }

  return result;
}

/**
 * Launch purchase
 */
export async function launchGooglePlayPurchase({
  productId,
  planKey,
  userId,
  userEmail,
}) {
  if (!productId) {
    throw new Error("Invalid product ID.");
  }

  const bridge = getBillingBridge();

  if (!bridge) {
    throw new Error(
      "Google Play Billing is not available. Install the app from Play Store internal testing."
    );
  }

  const payload = {
    productId,
    planKey,
    userId: normalize(userId),
    userEmail: normalize(userEmail),
  };

  let result;

  try {
    if (typeof bridge.purchaseOneTimeProduct === "function") {
      result = await bridge.purchaseOneTimeProduct(payload);
    } else if (typeof bridge.launchPurchase === "function") {
      result = await bridge.launchPurchase(payload);
    } else if (typeof bridge.buyProduct === "function") {
      result = await bridge.buyProduct(payload);
    } else if (typeof bridge.purchaseProduct === "function") {
      result = await bridge.purchaseProduct(
        productId,
        JSON.stringify(payload)
      );
    } else {
      throw new Error("Billing bridge exists but no purchase method found.");
    }
  } catch (err) {
    throw new Error(err?.message || "Failed to open Google Play purchase.");
  }

  const parsed = parseBridgeResult(result);

  const cancelled =
    parsed?.cancelled === true ||
    parsed?.status === "cancelled" ||
    parsed?.responseCode === "USER_CANCELED";

  const ok =
    parsed?.ok === true ||
    parsed?.success === true ||
    parsed?.status === "purchased" ||
    parsed?.purchaseState === "PURCHASED";

  return {
    ok,
    cancelled,
    purchaseToken:
      parsed?.purchaseToken ||
      parsed?.token ||
      parsed?.purchase_token ||
      "",
    orderId: parsed?.orderId || parsed?.order_id || "",
    raw: parsed,
  };
}

/**
 * Save purchase to Supabase
 */
export async function persistGooglePlayPurchase({
  supabase,
  userId,
  planKey,
  productId,
  purchaseToken,
  orderId,
  bridgePayload,
}) {
  const payload = {
    user_id: userId,
    plan: planKey,
    plan_key: planKey,
    product_id: productId,
    purchase_token: purchaseToken || null,
    order_id: orderId || null,
    source: "google_play",
    status: "google_play_pending",
    purchase_payload: bridgePayload || null,
  };

  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    await supabase
      .from("enrollments")
      .update(payload)
      .eq("id", existing.id);

    return existing.id;
  }

  const { data } = await supabase
    .from("enrollments")
    .insert([payload])
    .select("id")
    .single();

  return data?.id || null;
}

/**
 * Wait until entitlement becomes active
 */
export async function waitForGooglePlayEntitlement({
  supabase,
  userId,
  expectedPlanKey,
  timeoutMs = 20000,
  pollMs = 1500,
}) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const [{ data: profile }, { data: enrollment }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("enrollments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const enrollmentStatus = normalizeLower(enrollment?.status);
    const enrollmentPlan = normalizeLower(
      enrollment?.plan_key || enrollment?.plan
    );
    const profilePlan = normalizeLower(profile?.plan);

    const unlocked =
      SUCCESS_STATUSES.has(enrollmentStatus) ||
      profile?.program_active === true ||
      profile?.is_enrolled === true ||
      profilePlan === normalizeLower(expectedPlanKey) ||
      (enrollmentPlan === normalizeLower(expectedPlanKey) &&
        SUCCESS_STATUSES.has(enrollmentStatus));

    if (unlocked) {
      return {
        status: "active",
        profile,
        enrollment,
      };
    }

    await new Promise((r) => setTimeout(r, pollMs));
  }

  return { status: "pending" };
}