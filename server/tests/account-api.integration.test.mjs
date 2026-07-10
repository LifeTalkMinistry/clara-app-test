import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { createPool } from "../src/database/pool.js";
import { runMigrations } from "../src/database/migrate.js";
import { hashPassword } from "../src/security.js";

const databaseUrl = process.env.TEST_DATABASE_URL || "";
const USER_PASSWORD = "Clara#2026Secure";
const ADMIN_PASSWORD = "Admin#2026Secure";

function cookieFrom(response, name) {
  const header = response.headers["set-cookie"];
  const values = Array.isArray(header) ? header : [header];
  const match = values.filter(Boolean).find((value) => String(value).startsWith(`${name}=`));
  return match ? String(match).split(";")[0] : "";
}

function bearer(token) {
  return { authorization: `Bearer ${token}` };
}

async function jsonRequest(app, { method = "GET", url, payload, headers = {} }) {
  const response = await app.inject({ method, url, payload, headers });
  return { response, body: response.json() };
}

async function signUp(app, overrides = {}) {
  return jsonRequest(app, {
    method: "POST",
    url: "/auth/signup",
    payload: {
      displayName: "CLARA Tester",
      email: `tester-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      password: USER_PASSWORD,
      platform: "web",
      ...overrides,
    },
  });
}

test(
  "universal account API works against PostgreSQL",
  { skip: !databaseUrl, timeout: 60_000 },
  async (t) => {
    const config = {
      nodeEnv: "test",
      port: 0,
      databaseUrl,
      databaseSsl: false,
      accessTokenSecret: "user-access-secret-for-integration-tests-123456",
      adminAccessTokenSecret: "admin-access-secret-for-integration-tests-123",
      adminPasswordHash: await hashPassword(ADMIN_PASSWORD),
      adminIdentifier: "integration-admin",
      allowedOrigins: ["https://clara.example.test"],
      refreshCookieName: "clara_refresh_test",
      adminRefreshCookieName: "clara_admin_refresh_test",
      cookieDomain: undefined,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlDays: 30,
      adminTokenTtlSeconds: 900,
      adminRefreshTokenTtlHours: 12,
      offlineGraceHours: 24,
      trustProxy: false,
    };

    const pool = createPool(config);
    await runMigrations({ config, pool });
    await runMigrations({ config, pool });
    await pool.query(
      `TRUNCATE legacy_ios_access_links, admin_notes, admin_audit_log, admin_sessions, sessions, memberships, users CASCADE`
    );
    const app = await buildApp({ config, pool });

    await t.test("migration is idempotent", async () => {
      const result = await pool.query(
        "SELECT COUNT(*)::int AS count FROM clara_schema_migrations WHERE name = '001_universal_accounts.sql'"
      );
      assert.equal(result.rows[0].count, 1);
    });

    let primary;
    await t.test("signup creates an active Free membership and persistent session", async () => {
      const created = await signUp(app, {
        displayName: "Max Test",
        email: "  Max.Test@Example.COM  ",
        platform: "ios_pwa",
      });
      assert.equal(created.response.statusCode, 200);
      assert.equal(created.body.user.email, "Max.Test@Example.COM");
      assert.equal(created.body.user.signupPlatform, "ios_pwa");
      assert.equal(created.body.membership.plan, "free");
      assert.equal(created.body.membership.effectivePlan, "free");
      assert.equal(created.body.membership.subscriptionStatus, "active");
      assert.ok(created.body.session.accessToken);
      assert.ok(cookieFrom(created.response, config.refreshCookieName));

      const stored = await pool.query(
        `SELECT u.normalized_email, u.password_hash, m.plan, m.subscription_status
         FROM users u JOIN memberships m ON m.user_id = u.id
         WHERE u.id = $1`,
        [created.body.user.id]
      );
      assert.equal(stored.rows[0].normalized_email, "max.test@example.com");
      assert.equal(stored.rows[0].plan, "free");
      assert.equal(stored.rows[0].subscription_status, "active");
      assert.match(stored.rows[0].password_hash, /^\$argon2id\$/);
      assert.equal(stored.rows[0].password_hash.includes(USER_PASSWORD), false);
      primary = created;
    });

    await t.test("weak password and duplicate normalized email are rejected", async () => {
      const weak = await signUp(app, { email: "weak@example.com", password: "password" });
      assert.equal(weak.response.statusCode, 400);
      assert.equal(weak.body.code, "weak_password");

      const duplicate = await signUp(app, { email: "max.test@example.com" });
      assert.equal(duplicate.response.statusCode, 409);
      assert.equal(duplicate.body.code, "account_unavailable");
    });

    await t.test("login normalizes email and rejects an incorrect password generically", async () => {
      const login = await jsonRequest(app, {
        method: "POST",
        url: "/auth/login",
        payload: { email: " MAX.TEST@EXAMPLE.COM ", password: USER_PASSWORD, platform: "web" },
      });
      assert.equal(login.response.statusCode, 200);
      assert.equal(login.body.user.id, primary.body.user.id);

      const rejected = await jsonRequest(app, {
        method: "POST",
        url: "/auth/login",
        payload: { email: "max.test@example.com", password: "Wrong#2026Password", platform: "web" },
      });
      assert.equal(rejected.response.statusCode, 401);
      assert.equal(rejected.body.code, "authentication_failed");
    });

    await t.test("disabled and suspended accounts cannot authenticate", async () => {
      for (const status of ["disabled", "suspended"]) {
        const created = await signUp(app, { email: `${status}@example.com` });
        await pool.query("UPDATE users SET account_status = $2 WHERE id = $1", [created.body.user.id, status]);
        const login = await jsonRequest(app, {
          method: "POST",
          url: "/auth/login",
          payload: { email: `${status}@example.com`, password: USER_PASSWORD, platform: "web" },
        });
        assert.equal(login.response.statusCode, 401);
        assert.equal(login.body.code, "authentication_failed");
      }
    });

    await t.test("refresh tokens rotate and replay revokes the replacement chain", async () => {
      const created = await signUp(app, { email: "rotation@example.com", platform: "android" });
      const originalCookie = cookieFrom(created.response, config.refreshCookieName);
      const refreshed = await jsonRequest(app, {
        method: "POST",
        url: "/auth/refresh",
        headers: { cookie: originalCookie },
      });
      assert.equal(refreshed.response.statusCode, 200);
      const rotatedCookie = cookieFrom(refreshed.response, config.refreshCookieName);
      assert.ok(rotatedCookie);
      assert.notEqual(rotatedCookie, originalCookie);

      const replay = await jsonRequest(app, {
        method: "POST",
        url: "/auth/refresh",
        headers: { cookie: originalCookie },
      });
      assert.equal(replay.response.statusCode, 401);

      const replacementAfterReplay = await jsonRequest(app, {
        method: "POST",
        url: "/auth/refresh",
        headers: { cookie: rotatedCookie },
      });
      assert.equal(replacementAfterReplay.response.statusCode, 401);
    });

    await t.test("logout and logout-all revoke refresh sessions", async () => {
      const loginOne = await jsonRequest(app, {
        method: "POST",
        url: "/auth/login",
        payload: { email: "max.test@example.com", password: USER_PASSWORD, platform: "web" },
      });
      const cookieOne = cookieFrom(loginOne.response, config.refreshCookieName);
      const logout = await jsonRequest(app, {
        method: "POST",
        url: "/auth/logout",
        headers: { cookie: cookieOne },
      });
      assert.equal(logout.response.statusCode, 200);
      const refreshAfterLogout = await jsonRequest(app, {
        method: "POST",
        url: "/auth/refresh",
        headers: { cookie: cookieOne },
      });
      assert.equal(refreshAfterLogout.response.statusCode, 401);

      const first = await jsonRequest(app, {
        method: "POST",
        url: "/auth/login",
        payload: { email: "max.test@example.com", password: USER_PASSWORD, platform: "web" },
      });
      const second = await jsonRequest(app, {
        method: "POST",
        url: "/auth/login",
        payload: { email: "max.test@example.com", password: USER_PASSWORD, platform: "android" },
      });
      const logoutAll = await jsonRequest(app, {
        method: "POST",
        url: "/auth/logout-all",
        headers: bearer(first.body.session.accessToken),
      });
      assert.equal(logoutAll.response.statusCode, 200);
      const secondRefresh = await jsonRequest(app, {
        method: "POST",
        url: "/auth/refresh",
        headers: { cookie: cookieFrom(second.response, config.refreshCookieName) },
      });
      assert.equal(secondRefresh.response.statusCode, 401);
    });

    await t.test("password change revokes old sessions and issues a replacement", async () => {
      const login = await jsonRequest(app, {
        method: "POST",
        url: "/auth/login",
        payload: { email: "max.test@example.com", password: USER_PASSWORD, platform: "web" },
      });
      const oldCookie = cookieFrom(login.response, config.refreshCookieName);
      const changed = await jsonRequest(app, {
        method: "POST",
        url: "/auth/change-password",
        headers: bearer(login.body.session.accessToken),
        payload: { newPassword: "Clara#2026Changed" },
      });
      assert.equal(changed.response.statusCode, 200);
      assert.equal(changed.body.user.mustChangePassword, false);
      assert.ok(cookieFrom(changed.response, config.refreshCookieName));

      const oldRefresh = await jsonRequest(app, {
        method: "POST",
        url: "/auth/refresh",
        headers: { cookie: oldCookie },
      });
      assert.equal(oldRefresh.response.statusCode, 401);

      const loginWithNewPassword = await jsonRequest(app, {
        method: "POST",
        url: "/auth/login",
        payload: { email: "max.test@example.com", password: "Clara#2026Changed", platform: "web" },
      });
      assert.equal(loginWithNewPassword.response.statusCode, 200);
    });

    await t.test("administrator controls are server-authorized and audited", async () => {
      const unauthorized = await jsonRequest(app, { url: "/admin/users" });
      assert.equal(unauthorized.response.statusCode, 401);

      const adminLogin = await jsonRequest(app, {
        method: "POST",
        url: "/admin/login",
        payload: { password: ADMIN_PASSWORD },
      });
      assert.equal(adminLogin.response.statusCode, 200);
      const adminHeaders = bearer(adminLogin.body.session.accessToken);

      const listed = await jsonRequest(app, {
        url: "/admin/users?search=max.test&platform=ios_pwa",
        headers: adminHeaders,
      });
      assert.equal(listed.response.statusCode, 200);
      assert.equal(listed.body.users.length, 1);
      assert.equal(listed.body.users[0].id, primary.body.user.id);

      const profile = await jsonRequest(app, {
        method: "PATCH",
        url: `/admin/users/${primary.body.user.id}/profile`,
        headers: adminHeaders,
        payload: { displayName: "Max Updated", email: "max.updated@example.com" },
      });
      assert.equal(profile.response.statusCode, 200);
      assert.equal(profile.body.user.displayName, "Max Updated");

      const future = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const membership = await jsonRequest(app, {
        method: "PATCH",
        url: `/admin/users/${primary.body.user.id}/membership`,
        headers: adminHeaders,
        payload: {
          plan: "committed",
          subscriptionStatus: "active",
          source: "manual",
          startedAt: new Date().toISOString(),
          currentPeriodEnd: future,
          cancelAtPeriodEnd: true,
        },
      });
      assert.equal(membership.response.statusCode, 200);
      assert.equal(membership.body.membership.effectivePlan, "committed");
      assert.equal(membership.body.membership.hasPaidAccess, true);
      assert.equal(membership.body.membership.cancelAtPeriodEnd, true);

      const note = await jsonRequest(app, {
        method: "POST",
        url: `/admin/users/${primary.body.user.id}/notes`,
        headers: adminHeaders,
        payload: { note: "Manual committed access approved." },
      });
      assert.equal(note.response.statusCode, 200);

      const temporaryPassword = "Temp#2026Secure";
      const temporary = await jsonRequest(app, {
        method: "POST",
        url: `/admin/users/${primary.body.user.id}/set-temporary-password`,
        headers: adminHeaders,
        payload: { temporaryPassword },
      });
      assert.equal(temporary.response.statusCode, 200);
      assert.equal(temporary.body.mustChangePassword, true);
      assert.equal(temporary.body.sessionsRevoked, true);

      const temporaryLogin = await jsonRequest(app, {
        method: "POST",
        url: "/auth/login",
        payload: { email: "max.updated@example.com", password: temporaryPassword, platform: "web" },
      });
      assert.equal(temporaryLogin.response.statusCode, 200);
      assert.equal(temporaryLogin.body.user.mustChangePassword, true);

      const badDelete = await jsonRequest(app, {
        method: "DELETE",
        url: `/admin/users/${primary.body.user.id}`,
        headers: adminHeaders,
        payload: { confirmation: "NO" },
      });
      assert.equal(badDelete.response.statusCode, 400);

      const deleted = await jsonRequest(app, {
        method: "DELETE",
        url: `/admin/users/${primary.body.user.id}`,
        headers: adminHeaders,
        payload: { confirmation: "DELETE" },
      });
      assert.equal(deleted.response.statusCode, 200);
      assert.equal(deleted.body.deleted, true);

      const audits = await pool.query(
        "SELECT action, safe_change_summary::text AS summary FROM admin_audit_log WHERE target_user_id = $1",
        [primary.body.user.id]
      );
      const actions = audits.rows.map((row) => row.action);
      assert.ok(actions.includes("profile_updated"));
      assert.ok(actions.includes("membership_updated"));
      assert.ok(actions.includes("temporary_password_set"));
      assert.ok(actions.includes("account_soft_deleted"));
      assert.equal(audits.rows.some((row) => row.summary.includes(temporaryPassword)), false);
    });

    await t.test("all supported signup platforms appear in administrator filtering", async () => {
      for (const platform of ["ios_pwa", "android", "web"]) {
        await signUp(app, { email: `${platform}@platform.example.com`, platform });
      }
      const adminLogin = await jsonRequest(app, {
        method: "POST",
        url: "/admin/login",
        payload: { password: ADMIN_PASSWORD },
      });
      const headers = bearer(adminLogin.body.session.accessToken);
      for (const platform of ["ios_pwa", "android", "web"]) {
        const listed = await jsonRequest(app, {
          url: `/admin/users?platform=${platform}`,
          headers,
        });
        assert.equal(listed.response.statusCode, 200);
        assert.ok(listed.body.users.some((user) => user.signupPlatform === platform));
      }
    });

    const forbiddenOrigin = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://evil.example" },
    });
    assert.equal(forbiddenOrigin.statusCode, 403);

    await app.close();
  }
);
