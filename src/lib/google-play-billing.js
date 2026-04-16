const PRODUCT_IDS = {
  basic: "entry_unlock",
  entry: "entry_unlock",
  diy: "entry_unlock",
  transformation: "core_unlock",
  core: "core_unlock",
  diwm: "core_unlock",
  student: "core_unlock",
  elite: "coaching_unlock",
  coaching: "coaching_unlock",
  ldit: "coaching_unlock",
};

const SUCCESS_STATUSES = new Set(["approved", "active"]);

const normalize = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalize(value).toLowerCase();

export function getGooglePlayProductId(planKey) {
  return PRODUCT_IDS[normalizeLower(planKey)] || "";
}

function getBillingBridge() {
  if (typeof window === "undefined") return null;

  return (
    window.ClaraBilling ||
    window.AndroidBilling ||
    window.googlePlayBilling ||
    window.AndroidBridge ||
    null
  );
}

function parseBridgeResult(result) {
  if (!result) return { ok: false, reason: "empty_result" };
  if (typeof result === "string") {
    try {
      return JSON.parse(result);
    } catch {
      return { ok: true, raw: result };
    }
  }

  return result;
}

export async function launchGooglePlayPurchase({
  productId,
  planKey,
  userId,
  userEmail,
}) {
  const bridge = getBillingBridge();

  if (!bridge) {
    throw new Error("Google Play Billing is not available on this device.");
  }

  const payload = {
    productId,
    planKey,
    userId: normalize(userId),
    userEmail: normalize(userEmail),
  };

  let result = null;

  if (typeof bridge.purchaseOneTimeProduct === "function") {
    result = await bridge.purchaseOneTimeProduct(payload);
  } else if (typeof bridge.launchPurchase === "function") {
    result = await bridge.launchPurchase(payload);
  } else if (typeof bridge.buyProduct === "function") {
    result = await bridge.buyProduct(payload);
  } else if (typeof bridge.purchaseProduct === "function") {
    result = await bridge.purchaseProduct(productId, JSON.stringify(payload));
  } else {
    throw new Error("Google Play Billing bridge is connected but no purchase method was found.");
  }

  const parsed = parseBridgeResult(result);
  const cancelled = parsed?.cancelled === true || parsed?.status === "cancelled";
  const ok =
    parsed?.ok === true ||
    parsed?.success === true ||
    parsed?.status === "purchased" ||
    parsed?.purchaseState === "PURCHASED";

  return {
    ok,
    cancelled,
    purchaseToken:
      parsed?.purchaseToken || parsed?.token || parsed?.purchase_token || "",
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

  const { data: existing, error: existingError } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.id) {
    const { error } = await supabase
      .from("enrollments")
      .update(payload)
      .eq("id", existing.id);

    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("enrollments")
    .insert([payload])
    .select("id")
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function waitForGooglePlayEntitlement({
  supabase,
  userId,
  expectedPlanKey,
  timeoutMs = 15000,
  pollMs = 1500,
}) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
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

    const profilePlan = normalizeLower(profile?.plan);
    const enrollmentPlan = normalizeLower(enrollment?.plan_key || enrollment?.plan);
    const enrollmentStatus = normalizeLower(enrollment?.status);

    const unlocked =
      SUCCESS_STATUSES.has(enrollmentStatus) ||
      profile?.program_active === true ||
      profile?.is_enrolled === true ||
      (profilePlan && profilePlan === normalizeLower(expectedPlanKey)) ||
      (enrollmentPlan && enrollmentPlan === normalizeLower(expectedPlanKey) && SUCCESS_STATUSES.has(enrollmentStatus));

    if (unlocked) {
      return {
        status: "active",
        profile: profile || null,
        enrollment: enrollment || null,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  return { status: "pending" };
}
