import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PACKAGE_NAME = "com.clara.moneytracker";
const PRODUCT_TYPES: Record<string, "subs" | "products"> = {
  clara_pro_99: "subs",
  clara_core_199: "subs",
  clara_lifeos_499: "subs",
  pro_99: "subs",
  core_199: "subs",
  lifeos_499: "subs",
  core_599: "subs",
  coaching_1299: "subs",
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function getAccessToken() {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");

  const serviceAccount = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const header = base64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64Url(
    encoder.encode(
      JSON.stringify({
        iss: serviceAccount.client_email,
        scope: "https://www.googleapis.com/auth/androidpublisher",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
      })
    )
  );

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    encoder.encode(`${header}.${claims}`)
  );
  const assertion = `${header}.${claims}.${base64Url(new Uint8Array(signature))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function verifyWithGoogle({
  accessToken,
  productId,
  purchaseToken,
}: {
  accessToken: string;
  productId: string;
  purchaseToken: string;
}) {
  const productType = PRODUCT_TYPES[productId];
  if (!productType) throw new Error("Unsupported product id.");

  const path =
    productType === "subs"
      ? `applications/${PACKAGE_NAME}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`
      : `applications/${PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}`;
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/${path}`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google purchase verification failed: ${await response.text()}`);
  }

  return response.json();
}

async function acknowledgeWithGoogle({
  accessToken,
  productId,
  purchaseToken,
}: {
  accessToken: string;
  productId: string;
  purchaseToken: string;
}) {
  const productType = PRODUCT_TYPES[productId];
  const path =
    productType === "subs"
      ? `applications/${PACKAGE_NAME}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`
      : `applications/${PACKAGE_NAME}/purchases/products/${productId}/tokens/${purchaseToken}:acknowledge`;
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ developerPayload: "clara-entitlement-sync" }),
  });

  if (!response.ok && response.status !== 409) {
    throw new Error(`Google purchase acknowledgement failed: ${await response.text()}`);
  }
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase service credentials are not configured.");
    }

    const authHeader = request.headers.get("authorization") || "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const productId = String(body.product_id || "").trim();
    const purchaseToken = String(body.purchase_token || "").trim();
    const orderId = String(body.order_id || "").trim() || null;
    const planKey = String(body.plan_key || "").trim();
    const packageName = String(body.package_name || "").trim() || PACKAGE_NAME;

    console.log("verify-google-play-purchase request", {
      user_id: user.id,
      product_id: productId,
      plan_key: planKey,
      package_name: packageName,
      order_id: orderId,
      purchase_token_present: Boolean(purchaseToken),
      purchase_token_preview: purchaseToken
        ? `${purchaseToken.slice(0, 8)}...${purchaseToken.slice(-6)}`
        : "",
    });

    if (!productId || !purchaseToken || !PRODUCT_TYPES[productId]) {
      return jsonResponse({ ok: false, error: "Invalid purchase payload" }, 400);
    }

    if (packageName !== PACKAGE_NAME) {
      return jsonResponse({ ok: false, error: `Invalid package name ${packageName}` }, 400);
    }

    const accessToken = await getAccessToken();
    const googlePurchase = await verifyWithGoogle({ accessToken, productId, purchaseToken });

    const productType = PRODUCT_TYPES[productId];
    const expiryTimeMillis = Number(googlePurchase.expiryTimeMillis || 0);
    const subscriptionActive =
      productType === "subs" &&
      expiryTimeMillis > Date.now() &&
      googlePurchase.cancelReason === undefined;
    const oneTimePurchased =
      productType === "products" && Number(googlePurchase.purchaseState ?? 0) === 0;

    if (!subscriptionActive && !oneTimePurchased) {
      return jsonResponse({ ok: false, error: "Purchase is not completed", google_purchase: googlePurchase }, 409);
    }

    const acknowledgementState = Number(googlePurchase.acknowledgementState ?? 1);
    if (acknowledgementState === 0) {
      await acknowledgeWithGoogle({ accessToken, productId, purchaseToken });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await admin.rpc("process_google_play_purchase", {
      p_user_id: user.id,
      p_plan_key: planKey,
      p_product_id: productId,
      p_purchase_token: purchaseToken,
      p_order_id: orderId,
      p_payload: googlePurchase,
    });

    if (error) throw error;

    return jsonResponse({
      ok: true,
      purchase_id: data?.[0]?.purchase_id || null,
      enrollment_id: data?.[0]?.enrollment_id || null,
      status: data?.[0]?.entitlement_status || "processed",
    });
  } catch (error) {
    console.error("verify-google-play-purchase error", error);
    return jsonResponse({ ok: false, error: error instanceof Error ? error.message : "Verification failed" }, 500);
  }
});
