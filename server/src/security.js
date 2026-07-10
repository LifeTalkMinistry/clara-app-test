import argon2 from "argon2";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const encoder = new TextEncoder();

export function normalizeEmail(value) {
  return String(value || "").trim().normalize("NFKC").toLowerCase();
}

export function validatePasswordStrength(password) {
  const value = String(password || "");
  const failures = [];
  if (value.length < 10) failures.push("at least 10 characters");
  if (!/[a-z]/.test(value)) failures.push("a lowercase letter");
  if (!/[A-Z]/.test(value)) failures.push("an uppercase letter");
  if (!/[0-9]/.test(value)) failures.push("a number");
  if (!/[^A-Za-z0-9]/.test(value)) failures.push("a symbol");
  return { valid: failures.length === 0, failures };
}

export function hashPassword(password) {
  return argon2.hash(String(password), {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}

export function verifyPassword(hash, password) {
  return argon2.verify(String(hash || ""), String(password || ""), {
    type: argon2.argon2id,
  });
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeJson(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signAccessToken(payload, { secret, ttlSeconds, kind = "user" }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "CLARA" };
  const body = {
    ...payload,
    kind,
    iss: "clara-account-api",
    iat: now,
    exp: now + Number(ttlSeconds),
  };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedBody = base64Url(JSON.stringify(body));
  const unsigned = `${encodedHeader}.${encodedBody}`;
  const signature = createHmac("sha256", secret).update(unsigned).digest("base64url");
  return `${unsigned}.${signature}`;
}

export function verifyAccessToken(token, { secret, kind = "user" }) {
  const [encodedHeader, encodedBody, suppliedSignature] = String(token || "").split(".");
  if (!encodedHeader || !encodedBody || !suppliedSignature) return null;
  const unsigned = `${encodedHeader}.${encodedBody}`;
  const expectedSignature = createHmac("sha256", secret).update(unsigned).digest("base64url");
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) return null;

  try {
    const header = decodeJson(encodedHeader);
    const body = decodeJson(encodedBody);
    if (header?.alg !== "HS256" || header?.typ !== "CLARA") return null;
    if (body?.iss !== "clara-account-api" || body?.kind !== kind) return null;
    if (!Number.isFinite(body?.exp) || Date.now() >= body.exp * 1000) return null;
    return body;
  } catch {
    return null;
  }
}

export function generateRefreshToken() {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

export function buildRefreshCredential(sessionId, token) {
  return `${sessionId}.${token}`;
}

export function parseRefreshCredential(value) {
  const [sessionId, token] = String(value || "").split(".");
  if (!sessionId || !token) return null;
  return { sessionId, token };
}

export function getBearerToken(request) {
  const header = request?.headers?.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1] || null;
}

export function sanitizeSafeText(value, maxLength = 240) {
  return String(value || "").trim().slice(0, maxLength);
}

export function buildDeviceId(request) {
  const supplied = sanitizeSafeText(request?.headers?.["x-clara-device-id"], 120);
  if (supplied) return supplied;
  const basis = `${request?.ip || "unknown"}|${request?.headers?.["user-agent"] || "unknown"}`;
  return createHash("sha256").update(basis).digest("hex").slice(0, 32);
}

export { encoder };
