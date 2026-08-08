import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const PACKAGE_NAME = "com.clara.lifeos.app";
const SUPPORT_PRODUCTS = Object.freeze({
  clara_supporter_99: { tier: "supporter", amountPhp: 99 },
  clara_builder_249: { tier: "builder", amountPhp: 249 },
  clara_champion_499: { tier: "champion", amountPhp: 499 },
});

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
};

type SupabaseUser = {
  id: string;
  email?: string | null;
};

type SupportProduct = {
  tier: "supporter" | "builder" | "champion";
  amountPhp: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
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

function getBearerToken(authHeader: string) {
  return String(authHeader || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
}

async function getAuthenticatedUser(
  admin: ReturnType<typeof createClient>,
  authHeader: string
) {
  const accessToken = getBearerToken(authHeader);
  if (!accessToken) return null;
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error) return null;
  return (data?.user || null) as SupabaseUser | null;
}

async function getGoogleAccessToken() {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not configured.");

  const serviceAccount = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const header = base64Url(
    encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  );
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
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    encoder.encode(`${header}.${claims}`)
  );
  const assertion = `${header}.${claims}.${base64Url(
    new Uint8Array(signature)
  )}`;

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

async function verifyWithGoogle(
  accessToken: string,
  productId: string,
  purchaseToken: string
) {
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}` +
    `/purchases/subscriptions/${productId}/tokens/${purchaseToken}`;
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google support purchase verification failed: ${await response.text()}`);
  }
  return response.json();
}

async function acknowledgeWithGoogle(
  accessToken: string,
  productId: string,
  purchaseToken: string
) {
  const url =
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}` +
    `/purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ developerPayload: "clara-voluntary-support" }),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(`Google support purchase acknowledgement failed: ${await response.text()}`);
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function classifyGooglePurchase(googlePurchase: Record<string, unknown>) {
  const expiryTimeMillis = Number(googlePurchase.expiryTimeMillis || 0);
  const startTimeMillis = Number(googlePurchase.startTimeMillis || 0);
  const paymentState = Number(googlePurchase.paymentState ?? -1);
  const now = Date.now();
  const active = expiryTimeMillis > now && paymentState !== 0;
  return {
    active,
    pending: paymentState === 0,
    expiryTimeMillis,
    startTimeMillis: startTimeMillis || now,
    autoRenewing: googlePurchase.autoRenewing === true,
  };
}

async function getChampionAvailability(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin
    .from("support_program_config")
    .select("champion_slot_cap,champion_slots_used")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw error;
  const cap = Number(data?.champion_slot_cap);
  const used = Number(data?.champion_slots_used || 0);
  if (!Number.isInteger(cap) || cap <= 0) return null;
  return { cap, used, available: Math.max(cap - used, 0) };
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

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const user = await getAuthenticatedUser(
      admin,
      request.headers.get("authorization") || ""
    );
    if (!user) {
      return jsonResponse(
        { ok: false, error: "Unauthorized", code: "AUTH_SESSION_INVALID" },
        401
      );
    }

    const body = await request.json();
    const productId = String(body.product_id || "").trim();
    const purchaseToken = String(body.purchase_token || "").trim();
    const requestedTier = String(body.tier || "").trim().toLowerCase();
    const packageName = String(body.package_name || "").trim() || PACKAGE_NAME;
    const suppliedOrderId = String(body.order_id || "").trim();
    const product = SUPPORT_PRODUCTS[
      productId as keyof typeof SUPPORT_PRODUCTS
    ] as SupportProduct | undefined;

    if (!product || !purchaseToken || requestedTier !== product.tier) {
      return jsonResponse(
        { ok: false, error: "Invalid support purchase payload", code: "INVALID_SUPPORT_PURCHASE" },
        400
      );
    }
    if (packageName !== PACKAGE_NAME) {
      return jsonResponse(
        { ok: false, error: "Invalid package name", code: "INVALID_PACKAGE_NAME" },
        400
      );
    }

    if (product.tier === "champion") {
      const availability = await getChampionAvailability(admin);
      if (availability && availability.available <= 0) {
        return jsonResponse(
          {
            ok: false,
            error: "CLARA Champion support is currently full.",
            code: "CHAMPION_CAPACITY_FULL",
            champion_availability: availability,
          },
          409
        );
      }
    }

    const googleAccessToken = await getGoogleAccessToken();
    const googlePurchase = await verifyWithGoogle(
      googleAccessToken,
      productId,
      purchaseToken
    );
    const purchaseState = classifyGooglePurchase(googlePurchase);

    if (!purchaseState.active) {
      return jsonResponse(
        {
          ok: false,
          error: purchaseState.pending
            ? "Support payment is still pending."
            : "Support purchase is not active.",
          code: purchaseState.pending ? "PAYMENT_PENDING" : "SUPPORT_INACTIVE",
        },
        409
      );
    }

    if (Number(googlePurchase.acknowledgementState ?? 1) === 0) {
      await acknowledgeWithGoogle(googleAccessToken, productId, purchaseToken);
    }

    const verifiedOrderId = String(googlePurchase.orderId || suppliedOrderId || "").trim();
    const purchaseReference = verifiedOrderId || `token-sha256:${await sha256(purchaseToken)}`;
    const supportStartAt = new Date(purchaseState.startTimeMillis).toISOString();
    const supportExpiresAt = new Date(purchaseState.expiryTimeMillis).toISOString();
    const renewalAt = purchaseState.autoRenewing ? supportExpiresAt : null;
    const nowIso = new Date().toISOString();

    const safeMetadata = {
      autoRenewing: purchaseState.autoRenewing,
      paymentState: Number(googlePurchase.paymentState ?? -1),
      cancelReason: googlePurchase.cancelReason ?? null,
      verifiedAt: nowIso,
    };

    const { data: support, error: supportError } = await admin
      .from("support_subscriptions")
      .upsert(
        {
          user_id: user.id,
          tier: product.tier,
          amount_php: product.amountPhp,
          payment_provider: "google_play",
          product_id: productId,
          provider_order_id: purchaseReference,
          payment_date: supportStartAt,
          support_start_at: supportStartAt,
          support_expires_at: supportExpiresAt,
          renewal_at: renewalAt,
          status: "active",
          custom_amount_php: null,
          provider_metadata: safeMetadata,
          updated_at: nowIso,
        },
        { onConflict: "payment_provider,provider_order_id" }
      )
      .select(
        "id,user_id,tier,amount_php,payment_date,support_start_at,support_expires_at,renewal_at,status,custom_amount_php,product_id,created_at,updated_at"
      )
      .single();

    if (supportError) throw supportError;

    const championAvailability = await getChampionAvailability(admin);
    return jsonResponse({
      ok: true,
      support,
      champion_availability: championAvailability,
      app_access_changed: false,
    });
  } catch (error) {
    console.error("verify-clara-support-purchase error", error);
    return jsonResponse(
      {
        ok: false,
        code: "VERIFICATION_FAILED",
        error: error instanceof Error ? error.message : "Support verification failed",
      },
      500
    );
  }
});
