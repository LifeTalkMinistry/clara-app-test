import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const ADMIN_PASSWORD_SHA256 = "8f59e2471a4d278d0881010d8f86852f729b7daa61f3524939febe730a6ca306";
const ADMIN_SESSION_MS = 15 * 60 * 1000;
const MAX_TEXT_LENGTH = 240;
const CODE_PATTERN = /^CLARA-[A-F0-9]{6}$/;

const encoder = new TextEncoder();

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: CORS_HEADERS });
}

function fail(status: number, code: string, message: string) {
  return json(status, { ok: false, code, message });
}

function cleanText(value: unknown, max = MAX_TEXT_LENGTH) {
  return String(value ?? "").trim().slice(0, max);
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlText(value: string) {
  return base64Url(encoder.encode(value));
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return atob(padded);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64Url(new Uint8Array(signature));
}

async function signAdminToken(serviceRoleKey: string) {
  const payload = {
    type: "clara_hidden_admin",
    exp: Date.now() + ADMIN_SESSION_MS,
    nonce: crypto.randomUUID(),
  };
  const encoded = base64UrlText(JSON.stringify(payload));
  const signature = await hmac(encoded, `${serviceRoleKey}:clara-hidden-admin`);
  return {
    token: `${encoded}.${signature}`,
    expiresAt: new Date(payload.exp).toISOString(),
  };
}

async function verifyAdminToken(token: string, serviceRoleKey: string) {
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature) return false;

  const expectedSignature = await hmac(encoded, `${serviceRoleKey}:clara-hidden-admin`);
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(decodeBase64Url(encoded));
    return payload?.type === "clara_hidden_admin" && Number(payload?.exp) > Date.now();
  } catch {
    return false;
  }
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function deriveStatus(row: Record<string, any>) {
  if (row.revoked_at) return "Revoked";
  if (!row.enabled) return "Disabled";
  if (!row.activated_at) return "Available";
  if (row.expires_at && Date.now() >= Date.parse(row.expires_at)) return "Expired";
  return "Active";
}

function serializeCode(row: Record<string, any>) {
  const status = deriveStatus(row);
  const expiresAtMs = row.expires_at ? Date.parse(row.expires_at) : NaN;
  const remainingMs = Number.isFinite(expiresAtMs) ? Math.max(0, expiresAtMs - Date.now()) : 0;

  return {
    id: row.id,
    code: row.code,
    enabled: Boolean(row.enabled),
    status,
    activatedByUserId: row.activated_by_user_id,
    activatedByName: row.activated_by_name,
    activatedByEmail: row.activated_by_email,
    activatedAt: row.activated_at,
    accessDurationDays: row.access_duration_days,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    adminNote: row.admin_note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    remainingDays: Math.ceil(remainingMs / 86_400_000),
    remainingHours: Math.ceil(remainingMs / 3_600_000),
  };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return fail(405, "method_not_allowed", "Method not allowed.");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRoleKey) {
    return fail(503, "service_unavailable", "CLARA access service is not configured.");
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, any>;
  try {
    body = await request.json();
  } catch {
    return fail(400, "invalid_request", "Invalid request.");
  }

  const action = cleanText(body.action, 40);

  try {
    if (action === "verify_admin") {
      const password = String(body.password || "");
      if (!password || password.length > 200) {
        return fail(401, "incorrect_password", "The admin password is incorrect.");
      }

      const passwordHash = await sha256Hex(password);
      if (!constantTimeEqual(passwordHash, ADMIN_PASSWORD_SHA256)) {
        return fail(401, "incorrect_password", "The admin password is incorrect.");
      }

      const session = await signAdminToken(serviceRoleKey);
      return json(200, {
        ok: true,
        adminToken: session.token,
        expiresAt: session.expiresAt,
      });
    }

    if (action === "admin_list" || action === "admin_update") {
      const adminToken = cleanText(body.adminToken, 2000);
      if (!(await verifyAdminToken(adminToken, serviceRoleKey))) {
        return fail(401, "unauthorized", "Admin authorization has expired.");
      }

      if (action === "admin_list") {
        const { data, error } = await service
          .from("clara_ios_access_codes")
          .select("*")
          .order("created_at", { ascending: true });

        if (error) throw error;
        return json(200, {
          ok: true,
          codes: (data || []).map(serializeCode),
        });
      }

      const codeId = cleanText(body.codeId, 80);
      const operation = cleanText(body.operation, 40);
      if (!codeId) return fail(400, "invalid_request", "Select an access code first.");

      const { data: current, error: currentError } = await service
        .from("clara_ios_access_codes")
        .select("*")
        .eq("id", codeId)
        .maybeSingle();

      if (currentError) throw currentError;
      if (!current) return fail(404, "code_not_found", "Access code not found.");

      let changes: Record<string, unknown> = {};

      if (operation === "toggle") {
        changes = { enabled: Boolean(body.enabled) };
      } else if (operation === "extend") {
        if (!current.activated_at || !current.expires_at) {
          return fail(400, "invalid_extension", "Activate the code before extending it.");
        }

        let nextExpiry: Date;
        if (body.customExpiresAt) {
          nextExpiry = new Date(body.customExpiresAt);
        } else {
          const days = Number(body.days);
          if (![7, 15, 30].includes(days)) {
            return fail(400, "invalid_extension", "Choose a valid extension.");
          }
          nextExpiry = new Date(Math.max(Date.now(), Date.parse(current.expires_at)) + days * 86_400_000);
        }

        if (!Number.isFinite(nextExpiry.getTime()) || nextExpiry.getTime() <= Date.now()) {
          return fail(400, "invalid_extension", "Choose a valid future expiration date.");
        }

        changes = { expires_at: nextExpiry.toISOString() };
      } else if (operation === "reset") {
        changes = {
          enabled: true,
          activated_by_user_id: null,
          activated_by_name: null,
          activated_by_email: null,
          activated_at: null,
          expires_at: null,
          revoked_at: null,
          access_token_hash: null,
        };
      } else if (operation === "revoke") {
        changes = {
          enabled: false,
          revoked_at: new Date().toISOString(),
        };
      } else if (operation === "note") {
        changes = { admin_note: cleanText(body.adminNote, 2000) };
      } else {
        return fail(400, "invalid_operation", "Unsupported code action.");
      }

      const { data: updated, error: updateError } = await service
        .from("clara_ios_access_codes")
        .update(changes)
        .eq("id", codeId)
        .select("*")
        .single();

      if (updateError) throw updateError;
      return json(200, { ok: true, code: serializeCode(updated) });
    }

    if (action === "redeem") {
      const code = cleanText(body.code, 40).toUpperCase();
      const userId = cleanText(body.userId, 160);
      const name = cleanText(body.name, 160);
      const email = cleanText(body.email, 200).toLowerCase();

      if (!CODE_PATTERN.test(code)) return fail(400, "invalid_code", "Enter a valid CLARA access code.");
      if (!userId) return fail(400, "invalid_user", "CLARA could not identify this device.");

      const { data: record, error: findError } = await service
        .from("clara_ios_access_codes")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (findError) throw findError;
      if (!record) return fail(404, "code_not_found", "That access code was not found.");
      if (record.revoked_at) return fail(403, "code_revoked", "That access code has been revoked.");
      if (!record.enabled) return fail(403, "code_disabled", "That access code is currently turned off.");
      if (record.expires_at && Date.now() >= Date.parse(record.expires_at)) {
        return fail(403, "code_expired", "That access code has expired.");
      }
      if (record.activated_by_user_id && record.activated_by_user_id !== userId) {
        return fail(409, "code_assigned", "That access code is already assigned to another user.");
      }

      const now = new Date();
      const isFirstActivation = !record.activated_at;
      const accessDurationDays = Number(record.access_duration_days) || 30;
      const expiresAt = isFirstActivation
        ? new Date(now.getTime() + accessDurationDays * 86_400_000)
        : new Date(record.expires_at);
      const accessToken = randomToken();
      const accessTokenHash = await sha256Hex(accessToken);

      const changes = {
        activated_by_user_id: userId,
        activated_by_name: name || record.activated_by_name || "iPhone user",
        activated_by_email: email || record.activated_by_email || null,
        activated_at: isFirstActivation ? now.toISOString() : record.activated_at,
        expires_at: expiresAt.toISOString(),
        revoked_at: null,
        access_token_hash: accessTokenHash,
      };

      let updateQuery = service
        .from("clara_ios_access_codes")
        .update(changes)
        .eq("id", record.id);

      if (isFirstActivation) updateQuery = updateQuery.is("activated_by_user_id", null);

      const { data: updated, error: updateError } = await updateQuery.select("*").maybeSingle();
      if (updateError) throw updateError;
      if (!updated) return fail(409, "code_assigned", "That access code was just assigned to another user.");

      return json(200, {
        ok: true,
        accessToken,
        codeLabel: updated.code,
        activatedAt: updated.activated_at,
        expiresAt: updated.expires_at,
      });
    }

    if (action === "validate") {
      const accessToken = cleanText(body.accessToken, 1000);
      if (!accessToken) return fail(401, "missing_session", "No iPhone access session was found.");

      const accessTokenHash = await sha256Hex(accessToken);
      const { data: record, error: findError } = await service
        .from("clara_ios_access_codes")
        .select("*")
        .eq("access_token_hash", accessTokenHash)
        .maybeSingle();

      if (findError) throw findError;
      if (!record) return fail(401, "invalid_session", "This iPhone access session is no longer valid.");
      if (record.revoked_at) return fail(403, "code_revoked", "This iPhone access has been revoked.");
      if (!record.enabled) return fail(403, "code_disabled", "This iPhone access is currently turned off.");
      if (!record.expires_at || Date.now() >= Date.parse(record.expires_at)) {
        return fail(403, "code_expired", "This iPhone access has expired.");
      }

      return json(200, {
        ok: true,
        valid: true,
        activatedAt: record.activated_at,
        expiresAt: record.expires_at,
      });
    }

    return fail(400, "invalid_action", "Unsupported access request.");
  } catch (_error) {
    return fail(500, "request_failed", "CLARA could not complete the request right now.");
  }
});
