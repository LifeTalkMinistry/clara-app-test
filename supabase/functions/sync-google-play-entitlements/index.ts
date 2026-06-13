import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PACKAGE_NAME = "com.clara.lifeos.app";
const COMMITTED_PLAN_KEY = "committed_249";
const COMMITTED_PRODUCT_ID = "clara_commitment_249";
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-sync-secret",
};

type GooglePurchase = Record<string, unknown>;
type PurchaseRecord = {
  id: string;
  user_id: string;
  product_id: string;
  purchase_token: string;
  order_id?: string | null;
  raw_payload?: GooglePurchase | null;
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
  return response.json() as Promise<GooglePurchase>;
}

function classifyGooglePurchase(googlePurchase: GooglePurchase) {
  const expiryTimeMillis = Number(googlePurchase.expiryTimeMillis || 0);
  const paymentState = Number(googlePurchase.paymentState ?? -1);
  const cancelReason = googlePurchase.cancelReason;
  const userCancellationTimeMillis = googlePurchase.userCancellationTimeMillis;
  const expiresAt = expiryTimeMillis ? new Date(expiryTimeMillis).toISOString() : null;
  const isExpired = !expiryTimeMillis || expiryTimeMillis <= Date.now();
  const isTrialing = paymentState === 2;
  const isPaymentPending = paymentState === 0;
  const isCancelled = cancelReason !== undefined || userCancellationTimeMillis !== undefined;

  if (isExpired) {
    return { active: false, subscriptionStatus: "expired", entitlementStatus: "expired", expiresAt, isTrialing };
  }
  if (isPaymentPending) {
    return { active: false, subscriptionStatus: "payment_failed", entitlementStatus: "payment_failed", expiresAt, isTrialing };
  }
  if (isCancelled) {
    return { active: false, subscriptionStatus: "cancelled", entitlementStatus: "cancelled", expiresAt, isTrialing };
  }
  if (isTrialing) {
    return { active: true, subscriptionStatus: "trialing", entitlementStatus: "active", expiresAt, isTrialing };
  }
  return { active: true, subscriptionStatus: "active", entitlementStatus: "active", expiresAt, isTrialing };
}

async function assertSyncAuthorized(request: Request, serviceRoleKey: string) {
  const configuredSecret = Deno.env.get("GOOGLE_PLAY_SYNC_SECRET") || "";
  const providedSecret = request.headers.get("x-sync-secret") || "";
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  if (configuredSecret && providedSecret === configuredSecret) return;
  if (bearerToken && bearerToken === serviceRoleKey) return;
  throw new Error("Unauthorized lifecycle sync request.");
}

async function updateActiveAccess(admin: ReturnType<typeof createClient>, purchase: PurchaseRecord, state: ReturnType<typeof classifyGooglePurchase>, googlePurchase: GooglePurchase) {
  const nowIso = new Date().toISOString();
  const payload = {
    ...googlePurchase,
    claraSubscriptionStatus: state.subscriptionStatus,
    claraLifecycleSyncedAt: nowIso,
  };

  const { error: purchaseError } = await admin
    .from("google_play_purchases")
    .update({
      purchase_state: state.subscriptionStatus,
      verified_at: nowIso,
      processed_at: nowIso,
      raw_payload: payload,
      updated_at: nowIso,
    })
    .eq("id", purchase.id);
  if (purchaseError) throw purchaseError;

  const { error: enrollmentError } = await admin
    .from("enrollments")
    .update({
      status: "approved",
      purchase_payload: payload,
      last_billing_sync_at: nowIso,
    })
    .eq("user_id", purchase.user_id)
    .eq("play_purchase_token", purchase.purchase_token);
  if (enrollmentError) throw enrollmentError;

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      plan: COMMITTED_PLAN_KEY,
      plan_key: COMMITTED_PLAN_KEY,
      subscription_plan: COMMITTED_PLAN_KEY,
      access_level: "committed",
      tier_type: "clara_commitment",
      enrollment_source: "google_play",
      purchase_source: "google_play",
      access_source: "google_play",
      subscription_status: state.subscriptionStatus,
      subscription_label: "CLARA Commitment",
      subscription_expires_at: state.expiresAt,
      trial_started_at: state.isTrialing ? nowIso : undefined,
      trial_ends_at: state.isTrialing ? state.expiresAt : undefined,
      play_product_id: purchase.product_id,
      play_purchase_token: purchase.purchase_token,
      entitlement_status: state.entitlementStatus,
      status: "active",
      enrollment_status: "approved",
      is_enrolled: true,
      program_active: true,
      activation_status: "active",
      is_activated: true,
      last_billing_sync_at: nowIso,
    })
    .eq("id", purchase.user_id);
  if (profileError) throw profileError;
}

async function updateInactiveAccess(admin: ReturnType<typeof createClient>, purchase: PurchaseRecord, state: ReturnType<typeof classifyGooglePurchase>, googlePurchase: GooglePurchase) {
  const nowIso = new Date().toISOString();
  const payload = {
    ...googlePurchase,
    claraSubscriptionStatus: state.subscriptionStatus,
    claraLifecycleSyncedAt: nowIso,
  };

  const { data: profile, error: profileReadError } = await admin
    .from("profiles")
    .select("admin_plan_override")
    .eq("id", purchase.user_id)
    .maybeSingle();
  if (profileReadError) throw profileReadError;

  const hasAdminOverride = profile?.admin_plan_override === true;

  const { error: purchaseError } = await admin
    .from("google_play_purchases")
    .update({
      purchase_state: state.subscriptionStatus,
      verified_at: nowIso,
      raw_payload: payload,
      updated_at: nowIso,
    })
    .eq("id", purchase.id);
  if (purchaseError) throw purchaseError;

  const { error: enrollmentError } = await admin
    .from("enrollments")
    .update({
      status: state.subscriptionStatus,
      purchase_payload: payload,
      last_billing_sync_at: nowIso,
    })
    .eq("user_id", purchase.user_id)
    .eq("play_purchase_token", purchase.purchase_token);
  if (enrollmentError) throw enrollmentError;

  const profileUpdate = hasAdminOverride
    ? {
        subscription_status: state.subscriptionStatus,
        subscription_expires_at: state.expiresAt,
        entitlement_status: state.entitlementStatus,
        last_billing_sync_at: nowIso,
      }
    : {
        plan: "free",
        plan_key: "free",
        subscription_plan: "free",
        access_level: "free",
        subscription_status: state.subscriptionStatus,
        subscription_expires_at: state.expiresAt,
        entitlement_status: state.entitlementStatus,
        status: state.entitlementStatus,
        enrollment_status: state.entitlementStatus,
        is_enrolled: false,
        program_active: false,
        activation_status: state.entitlementStatus,
        is_activated: false,
        last_billing_sync_at: nowIso,
      };

  const { error: profileError } = await admin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", purchase.user_id);
  if (profileError) throw profileError;
}

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service credentials are not configured.");
    await assertSyncAuthorized(request, serviceRoleKey);

    const body = await request.json().catch(() => ({}));
    const limit = Math.min(Math.max(Number(body?.limit || 200), 1), 500);
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const accessToken = await getAccessToken();

    const { data: purchases, error: purchaseReadError } = await admin
      .from("google_play_purchases")
      .select("id,user_id,product_id,purchase_token,order_id,raw_payload")
      .eq("plan_key", COMMITTED_PLAN_KEY)
      .eq("product_id", COMMITTED_PRODUCT_ID)
      .not("purchase_token", "is", null)
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (purchaseReadError) throw purchaseReadError;

    const results = [];
    for (const purchase of (purchases || []) as PurchaseRecord[]) {
      try {
        const googlePurchase = await verifyWithGoogle(accessToken, purchase.product_id, purchase.purchase_token);
        const state = classifyGooglePurchase(googlePurchase);
        if (state.active) {
          await updateActiveAccess(admin, purchase, state, googlePurchase);
        } else {
          await updateInactiveAccess(admin, purchase, state, googlePurchase);
        }
        results.push({ purchase_id: purchase.id, user_id: purchase.user_id, status: state.subscriptionStatus, ok: true });
      } catch (error) {
        console.error("sync-google-play-entitlements item failed", { purchase_id: purchase.id, error });
        results.push({
          purchase_id: purchase.id,
          user_id: purchase.user_id,
          ok: false,
          error: error instanceof Error ? error.message : "Unknown sync error",
        });
      }
    }

    return jsonResponse({ ok: true, scanned: purchases?.length || 0, results });
  } catch (error) {
    console.error("sync-google-play-entitlements error", error);
    const message = error instanceof Error ? error.message : "Lifecycle sync failed";
    return jsonResponse({ ok: false, error: message }, message.includes("Unauthorized") ? 401 : 500);
  }
});

/*
Supabase scheduling note:
Deploy this function, then schedule it through Supabase cron or an external scheduler.
Recommended cadence while testing: every 15 to 60 minutes.
Call it with either:
- Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>, or
- x-sync-secret: <GOOGLE_PLAY_SYNC_SECRET> when that secret is configured.
*/
