import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PACKAGE_NAME = "com.clara.lifeos.app";
const CURRENT_PRODUCT_ID = "clara_commitment_249";
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
  const isTrialing = paymentState === 2;
  const isExpired = !expiryTimeMillis || expiryTimeMillis <= now;
  const isPaymentPending = paymentState === 0;
  const isCancelled = cancelReason !== undefined || userCancellationTimeMillis !== undefined;
  const isActive = !isExpired && !isPaymentPending && !isCancelled;

  return {
    expiryTimeMillis,
    isTrialing,
    isExpired,
    isPaymentPending,
    isCancelled,
    isActive,
    subscriptionStatus: isTrialing ? "trialing" : "active",
  };
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are not configured.");

    const authHeader = request.headers.get("authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return jsonResponse({ ok: false, error: "Unauthorized" }, 401);

    const body = await request.json();
    const productId = String(body.product_id || "").trim();
    const purchaseToken = String(body.purchase_token || "").trim();
    const orderId = String(body.order_id || "").trim() || null;
    const packageName = String(body.package_name || "").trim() || PACKAGE_NAME;

    if (!productId || !purchaseToken || !SUPPORTED_RECEIPT_PRODUCT_IDS.has(productId)) {
      return jsonResponse({ ok: false, error: "Invalid purchase payload" }, 400);
    }
    if (packageName !== PACKAGE_NAME) {
      return jsonResponse({ ok: false, error: "Invalid package name " + packageName }, 400);
    }

    const accessToken = await getAccessToken();
    const googlePurchase = await verifyWithGoogle(accessToken, productId, purchaseToken);
    const purchaseState = classifyGooglePurchase(googlePurchase);

    if (!purchaseState.isActive) {
      return jsonResponse({
        ok: false,
        error: purchaseState.isExpired
          ? "Purchase is expired"
          : purchaseState.isPaymentPending
            ? "Purchase payment is still pending"
            : "Purchase is cancelled or no longer active",
        code: purchaseState.isExpired
          ? "SUBSCRIPTION_EXPIRED"
          : purchaseState.isPaymentPending
            ? "PAYMENT_PENDING"
            : "SUBSCRIPTION_CANCELLED",
        google_purchase: googlePurchase,
      }, 409);
    }

    if (Number(googlePurchase.acknowledgementState ?? 1) === 0) {
      await acknowledgeWithGoogle(accessToken, productId, purchaseToken);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const trustedPayload = {
      ...googlePurchase,
      claraSubscriptionStatus: purchaseState.subscriptionStatus,
      claraVerifiedProductId: productId,
      claraVerifiedPackageName: PACKAGE_NAME,
      claraVerifiedAt: new Date().toISOString(),
    };
    const { data, error } = await admin.rpc("process_google_play_purchase", {
      p_user_id: user.id,
      p_plan_key: "committed_249",
      p_product_id: productId,
      p_purchase_token: purchaseToken,
      p_order_id: orderId,
      p_payload: trustedPayload,
    });
    if (error) throw error;

    return jsonResponse({
      ok: true,
      canonical_plan: "committed_249",
      canonical_access_level: "committed",
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
    console.error("verify-google-play-purchase error", error);
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Verification failed" }, 500);
  }
});
