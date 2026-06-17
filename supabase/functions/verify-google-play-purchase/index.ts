import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PACKAGE_NAME = "com.clara.lifeos.app";
const CURRENT_PRODUCT_ID = "clara_commitment_249";
const PROFILE_ENTITLEMENT_NOT_CONFIRMED_CODE = "PROFILE_ENTITLEMENT_NOT_CONFIRMED";
const PURCHASE_LINKED_TO_ANOTHER_ACCOUNT_CODE = "PURCHASE_LINKED_TO_ANOTHER_CLARA_ACCOUNT";
const LEGACY_RECEIPT_PRODUCT_IDS = new Set([
  "clara_pro_99",
  "clara_core_199",
  "clara_lifeos_499",
  "pro_99",
  "core_199",
  "lifeos_499",
  "core_599",
  "coaching_1299",
]);
const SUPPORTED_RECEIPT_PRODUCT_IDS = new Set([CURRENT_PRODUCT_ID, ...LEGACY_RECEIPT_PRODUCT_IDS]);
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}
function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}
function safeLog(label: string, payload: Record<string, unknown> = {}) {
  console.info("[CLARA Billing] " + label, payload);
}
function getLinkedAccountErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return message.toLowerCase().includes("already linked to another user")
    ? PURCHASE_LINKED_TO_ANOTHER_ACCOUNT_CODE
    : undefined;
}
function getBearerToken(authHeader: string) {
  const normalized = String(authHeader || "").trim();
  return normalized.replace(/^Bearer\s+/i, "").trim();
}
async function getAuthenticatedUser(admin: ReturnType<typeof createClient>, authHeader: string) {
  const accessToken = getBearerToken(authHeader);
  if (!accessToken) {
    return {
      user: null,
      errorMessage: "Missing authorization bearer token.",
      hasAuthorizationHeader: Boolean(authHeader),
    };
  }

  const { data, error } = await admin.auth.getUser(accessToken);
  return {
    user: data?.user || null,
    errorMessage: error?.message || (!data?.user ? "Missing user from service-role token lookup." : ""),
    hasAuthorizationHeader: true,
  };
}
async function getAccessToken() {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");
  const serviceAccount = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const header = base64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64Url(encoder.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    encoder.encode(header + "." + claims)
  );
  const assertion = header + "." + claims + "." + base64Url(new Uint8Array(signature));
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error("Google token exchange failed: " + await response.text());
  const data = await response.json();
  return data.access_token as string;
}
async function verifyWithGoogle(accessToken: string, productId: string, purchaseToken: string) {
  const url = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
    PACKAGE_NAME + "/purchases/subscriptions/" + productId + "/tokens/" + purchaseToken;
  const response = await fetch(url, { headers: { authorization: "Bearer " + accessToken } });
  if (!response.ok) throw new Error("Google purchase verification failed: " + await response.text());
  return response.json();
}
async function acknowledgeWithGoogle(accessToken: string, productId: string, purchaseToken: string) {
  const url = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
    PACKAGE_NAME + "/purchases/subscriptions/" + productId + "/tokens/" + purchaseToken + ":acknowledge";
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: "Bearer " + accessToken, "content-type": "application/json" },
    body: JSON.stringify({ developerPayload: "clara-commitment-entitlement-sync" }),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error("Google purchase acknowledgement failed: " + await response.text());
  }
}

function classifyGooglePurchase(googlePurchase: Record<string, unknown>) {
  const expiryTimeMillis = Number(googlePurchase.expiryTimeMillis || 0);
  const now = Date.now();
  const paymentState = Number(googlePurchase.paymentState ?? -1);
  const cancelReason = googlePurchase.cancelReason;
  const userCancellationTimeMillis = googlePurchase.userCancellationTimeMillis;
  const isExpired = !expiryTimeMillis || expiryTimeMillis <= now;
  const isPaymentPending = paymentState === 0;
  const isCancelledAtRenewal = cancelReason !== undefined || userCancellationTimeMillis !== undefined;
  const isActive = !isExpired && !isPaymentPending;

  return {
    expiryTimeMillis,
    paymentState,
    isExpired,
    isPaymentPending,
    isCancelledAtRenewal,
    isActive,
    subscriptionStatus: "active",
  };
}

function isCommittedProfileEntitlementConfirmed(profile: Record<string, unknown> | null | undefined) {
  return Boolean(
    profile &&
      profile.plan_key === "committed_249" &&
      profile.access_level === "committed" &&
      profile.subscription_status === "active" &&
      profile.entitlement_status === "active" &&
      profile.activation_status === "active" &&
      profile.is_activated === true
  );
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") {
    safeLog("verify-google-play-purchase rejected method", { method: request.method });
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      safeLog("verify-google-play-purchase missing Supabase service credentials", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasServiceRoleKey: Boolean(serviceRoleKey),
      });
      throw new Error("Supabase service credentials are not configured.");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = request.headers.get("authorization") || "";
    const authResult = await getAuthenticatedUser(admin, authHeader);
    const user = authResult.user;

    if (!user) {
      safeLog("verify-google-play-purchase unauthorized", {
        hasAuthorizationHeader: authResult.hasAuthorizationHeader,
        authError: authResult.errorMessage,
        authMode: "service_role_get_user",
      });
      return jsonResponse({ ok: false, error: "Unauthorized", code: "AUTH_SESSION_INVALID" }, 401);
    }

    safeLog("verify-google-play-purchase user authenticated", {
      authMode: "service_role_get_user",
      userIdExists: Boolean(user.id),
      emailExists: Boolean(user.email),
    });

    const body = await request.json();
    const productId = String(body.product_id || "").trim();
    const purchaseToken = String(body.purchase_token || "").trim();
    const orderId = String(body.order_id || "").trim() || null;
    const packageName = String(body.package_name || "").trim() || PACKAGE_NAME;

    safeLog("verify-google-play-purchase received", {
      userIdExists: Boolean(user.id),
      productId,
      packageName,
      hasPurchaseToken: Boolean(purchaseToken),
      hasOrderId: Boolean(orderId),
      supportedProduct: SUPPORTED_RECEIPT_PRODUCT_IDS.has(productId),
    });

    if (!productId || !purchaseToken || !SUPPORTED_RECEIPT_PRODUCT_IDS.has(productId)) {
      safeLog("verify-google-play-purchase rejected invalid payload", {
        hasProductId: Boolean(productId),
        hasPurchaseToken: Boolean(purchaseToken),
        productId,
        supportedProduct: SUPPORTED_RECEIPT_PRODUCT_IDS.has(productId),
      });
      return jsonResponse({ ok: false, error: "Invalid purchase payload", code: "INVALID_PURCHASE_PAYLOAD" }, 400);
    }
    if (packageName !== PACKAGE_NAME) {
      safeLog("verify-google-play-purchase rejected package name", {
        receivedPackageName: packageName,
        expectedPackageName: PACKAGE_NAME,
      });
      return jsonResponse({ ok: false, error: "Invalid package name " + packageName, code: "INVALID_PACKAGE_NAME" }, 400);
    }

    safeLog("verify-google-play-purchase requesting Google access token", { productId });
    const accessToken = await getAccessToken();
    safeLog("verify-google-play-purchase verifying with Google", { productId, packageName: PACKAGE_NAME });
    const googlePurchase = await verifyWithGoogle(accessToken, productId, purchaseToken);
    const purchaseState = classifyGooglePurchase(googlePurchase);

    safeLog("verify-google-play-purchase Google result classified", {
      productId,
      expiryTimeMillis: purchaseState.expiryTimeMillis,
      paymentState: purchaseState.paymentState,
      isExpired: purchaseState.isExpired,
      isPaymentPending: purchaseState.isPaymentPending,
      isCancelledAtRenewal: purchaseState.isCancelledAtRenewal,
      isActive: purchaseState.isActive,
      acknowledgementState: googlePurchase.acknowledgementState ?? null,
    });

    if (!purchaseState.isActive) {
      const code = purchaseState.isExpired
        ? "SUBSCRIPTION_EXPIRED"
        : purchaseState.isPaymentPending
          ? "PAYMENT_PENDING"
          : "SUBSCRIPTION_INACTIVE";
      safeLog("verify-google-play-purchase rejected inactive purchase", {
        productId,
        code,
        expiryTimeMillis: purchaseState.expiryTimeMillis,
        paymentState: purchaseState.paymentState,
      });
      return jsonResponse({
        ok: false,
        error: purchaseState.isExpired
          ? "Purchase is expired"
          : purchaseState.isPaymentPending
            ? "Purchase payment is still pending"
            : "Purchase is no longer active",
        code,
        google_purchase: googlePurchase,
      }, 409);
    }

    if (Number(googlePurchase.acknowledgementState ?? 1) === 0) {
      safeLog("verify-google-play-purchase acknowledging purchase", { productId });
      await acknowledgeWithGoogle(accessToken, productId, purchaseToken);
    }

    safeLog("verify-google-play-purchase ensuring profile row", { userIdExists: Boolean(user.id) });
    const { error: profileEnsureError } = await admin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email || null,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        },
        { onConflict: "id" }
      );
    if (profileEnsureError) throw profileEnsureError;

    const trustedPayload = {
      ...googlePurchase,
      claraSubscriptionStatus: purchaseState.subscriptionStatus,
      claraCancelledAtRenewal: purchaseState.isCancelledAtRenewal,
      claraVerifiedProductId: productId,
      claraVerifiedPackageName: PACKAGE_NAME,
      claraVerifiedAt: new Date().toISOString(),
    };
    safeLog("verify-google-play-purchase calling process_google_play_purchase", {
      productId,
      userIdExists: Boolean(user.id),
      hasPurchaseToken: Boolean(purchaseToken),
    });
    const { data, error } = await admin.rpc("process_google_play_purchase", {
      p_user_id: user.id,
      p_plan_key: "committed_249",
      p_product_id: productId,
      p_purchase_token: purchaseToken,
      p_order_id: orderId,
      p_payload: trustedPayload,
    });
    if (error) throw error;

    safeLog("verify-google-play-purchase RPC completed", {
      hasPurchaseId: Boolean(data?.[0]?.purchase_id),
      hasEnrollmentId: Boolean(data?.[0]?.enrollment_id),
      entitlementStatus: data?.[0]?.entitlement_status || "",
    });

    const { data: confirmedProfile, error: confirmError } = await admin
      .from("profiles")
      .select("plan_key, access_level, subscription_status, entitlement_status, activation_status, is_activated")
      .eq("id", user.id)
      .maybeSingle();
    if (confirmError) throw confirmError;

    if (!isCommittedProfileEntitlementConfirmed(confirmedProfile)) {
      safeLog("verify-google-play-purchase profile entitlement not confirmed", {
        confirmedProfile,
        purchaseId: data?.[0]?.purchase_id || null,
        enrollmentId: data?.[0]?.enrollment_id || null,
      });
      return jsonResponse({
        ok: false,
        code: PROFILE_ENTITLEMENT_NOT_CONFIRMED_CODE,
        error: "Google Play purchase verified, but CLARA profile entitlement was not confirmed.",
        canonical_plan: "committed_249",
        canonical_access_level: "committed",
        purchase_id: data?.[0]?.purchase_id || null,
        enrollment_id: data?.[0]?.enrollment_id || null,
      }, 500);
    }

    safeLog("verify-google-play-purchase profile entitlement confirmed", {
      planKey: confirmedProfile?.plan_key,
      accessLevel: confirmedProfile?.access_level,
      subscriptionStatus: confirmedProfile?.subscription_status,
      entitlementStatus: confirmedProfile?.entitlement_status,
      activationStatus: confirmedProfile?.activation_status,
      isActivated: confirmedProfile?.is_activated === true,
    });

    return jsonResponse({
      ok: true,
      canonical_plan: "committed_249",
      canonical_access_level: "committed",
      profile_entitlement_confirmed: true,
      entitlement_fields: confirmedProfile,
      historical_product_receipt: productId !== CURRENT_PRODUCT_ID,
      purchase_id: data?.[0]?.purchase_id || null,
      enrollment_id: data?.[0]?.enrollment_id || null,
      status: data?.[0]?.entitlement_status || purchaseState.subscriptionStatus,
      subscription_status: purchaseState.subscriptionStatus,
      subscription_expires_at: purchaseState.expiryTimeMillis
        ? new Date(purchaseState.expiryTimeMillis).toISOString()
        : null,
    });
  } catch (error) {
    const linkedAccountCode = getLinkedAccountErrorCode(error);
    console.error("verify-google-play-purchase error", error);
    return jsonResponse({
      ok: false,
      code: linkedAccountCode || "VERIFICATION_FAILED",
      error: error instanceof Error ? error.message : "Verification failed",
    }, linkedAccountCode ? 409 : 500);
  }
});
