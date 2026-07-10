import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRefreshCredential,
  generateRefreshToken,
  hashPassword,
  hashRefreshToken,
  normalizeEmail,
  parseRefreshCredential,
  signAccessToken,
  validatePasswordStrength,
  verifyAccessToken,
  verifyPassword,
} from "../src/security.js";

test("email normalization is stable and case-insensitive", () => {
  assert.equal(normalizeEmail("  Max@Example.COM  "), "max@example.com");
});

test("weak passwords are rejected", () => {
  const result = validatePasswordStrength("password");
  assert.equal(result.valid, false);
  assert.ok(result.failures.length >= 3);
});

test("strong passwords are accepted", () => {
  assert.equal(validatePasswordStrength("Clara#2026Secure").valid, true);
});

test("Argon2id password hashes verify without exposing plaintext", async () => {
  const hash = await hashPassword("Clara#2026Secure");
  assert.match(hash, /^\$argon2id\$/);
  assert.equal(await verifyPassword(hash, "Clara#2026Secure"), true);
  assert.equal(await verifyPassword(hash, "wrong-password"), false);
  assert.equal(hash.includes("Clara#2026Secure"), false);
});

test("access tokens reject wrong secrets and wrong token kinds", () => {
  const token = signAccessToken(
    { sub: "user-1", sid: "session-1" },
    { secret: "a".repeat(32), ttlSeconds: 900, kind: "user" }
  );
  assert.equal(
    verifyAccessToken(token, { secret: "a".repeat(32), kind: "user" }).sub,
    "user-1"
  );
  assert.equal(verifyAccessToken(token, { secret: "b".repeat(32), kind: "user" }), null);
  assert.equal(verifyAccessToken(token, { secret: "a".repeat(32), kind: "admin" }), null);
});

test("refresh credentials store only a token hash server-side", () => {
  const token = generateRefreshToken();
  const credential = buildRefreshCredential("session-id", token);
  const parsed = parseRefreshCredential(credential);
  assert.equal(parsed.sessionId, "session-id");
  assert.equal(parsed.token, token);
  assert.notEqual(hashRefreshToken(token), token);
  assert.equal(hashRefreshToken(token).length, 64);
});
