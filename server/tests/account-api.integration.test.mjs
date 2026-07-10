import test from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { createPool } from "../src/database/pool.js";
import { runMigrations } from "../src/database/migrate.js";
import { hashPassword } from "../src/security.js";

const databaseUrl = process.env.TEST_DATABASE_URL || "";
const USER_PASSWORD = "Clara#2026Secure";
const CHANGED_PASSWORD = "Clara#2026Changed";
const TEMPORARY_PASSWORD = "Temp#2026Secure";
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

async function request(app, { method = "GET", url, payload, headers = {} }) {
  const response = await app.inject({ method, url, payload, headers });
  return { response, body: response.json() };
}

async function signup(app, overrides = {}) {
  return request(app, {
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

async function login(app, email, password = USER_PASSWORD, platform = "web") {
  return request(app, {
    method: "POST",
    url: "/auth/login",
    payload: { email, password, platform },
  });
}

test(
  "universal CLARA account API works against PostgreSQL",
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
      "TRUNCATE legacy_ios_access_links, admin_notes, admin_audit_log, admin_sessions, sessions, memberships, users CASCADE"
    );
    const app = await buildApp({ config, pool });

    try {
      await t.test("migration is idempotent", async () => {
        const result = await pool.query(
          "SELECT COUNT(*)::int AS count FROM clara_schema_migrations WHERE name = '001_universal_accounts.sql'"
        );
        assert.equal(result.rows[0].count, 1);
      });

      let primary;
      await t.test("signup creates an active Free membership and first session", async () => {
        primary = await signup(app, {
          displayName: "Max Test",
          email: "Max.Test@Example.COM",
          platform: "ios_pwa",
        });
        assert.equal(primary.response.statusCode, 200);
        assert.equal(primary.body.user.email, "Max.Test@Example.COM");
        assert.equal(primary.body.user.signupPlatform, "ios_pwa");
        assert.equal(primary.body.membership.plan, "free");
        assert.equal(primary.body.membership.effectivePlan, "free");
        assert.equal(primary.body.membership.subscriptionStatus, "active");
        assert.ok(primary.body.session.accessToken);
        assert.ok(cookieFrom(primary.response, config.refreshCookieName));

        const stored = await pool.query(
          `SELECT u.normalized_email, u.password_hash, m.plan, m.subscription_status
           FROM users u JOIN memberships m ON m.user_id = u.id
           WHERE u.id = $1`,
          [primary.body.user.id]
        );
        assert.equal(stored.rows[0].normalized_email, "max.test@example.com");
        assert.equal(stored.rows[0].plan, "free");
        assert.equal(stored.rows[0].subscription_status, "active");
        assert.match(stored.rows[0].password_hash, /^\$argon2id\$/);
        assert.equal(stored.rows[0].password_hash.includes(USER_PASSWORD), false);
      });

      await t.test("weak passwords and duplicate normalized emails are rejected", async () => {
        const weak = await signup(app, { email: "weak@example.com", password: "password" });
        assert.equal(weak.response.statusCode, 400);
        assert.equal(weak.body.code, "weak_password");

        const duplicate = await signup(app, { email: "max.test@example.com" });
        assert.equal(duplicate.response.statusCode, 409);
        assert.equal(duplicate.body.code, "account_unavailable");
      });

      await t.test("login is case-insensitive and errors remain generic", async () => {
        const accepted = await login(app, "MAX.TEST@EXAMPLE.COM");
        assert.equal(accepted.response.statusCode, 200);
        assert.equal(accepted.body.user.id, primary.body.user.id);

        const rejected = await login(app, "max.test@example.com", "Wrong#2026Password");
        assert.equal(rejected.response.statusCode, 401);
        assert.equal(rejected.body.code, "authentication_failed");

        const acceptedCookie = cookieFrom(accepted.response, config.refreshCookieName);
        const logout = await request(app, {
          method: "POST",
          url: "/auth/logout",
          headers: { cookie: acceptedCookie },
        });
        assert.equal(logout.response.statusCode, 200);
        const refreshAfterLogout = await request(app, {
          method: "POST",
          url: "/auth/refresh",
          headers: { cookie: acceptedCookie },
        });
        assert.equal(refreshAfterLogout.response.statusCode, 401);
      });

      await t.test("disabled and suspended accounts cannot authenticate", async () => {
        for (const status of ["disabled", "suspended"]) {
          await pool.query("UPDATE users SET account_status = $2 WHERE id = $1", [primary.body.user.id, status]);
          const blocked = await login(app, "max.test@example.com");
          assert.equal(blocked.response.statusCode, 401);
          assert.equal(blocked.body.code, "authentication_failed");
        }
        await pool.query("UPDATE users SET account_status = 'active' WHERE id = $1", [primary.body.user.id]);
      });

      let androidAccount;
      await t.test("refresh rotation rejects replay and revokes its replacement", async () => {
        androidAccount = await signup(app, {
          email: "android@platform.example.com",
          platform: "android",
        });
        assert.equal(androidAccount.response.statusCode, 200);
        const originalCookie = cookieFrom(androidAccount.response, config.refreshCookieName);

        const refreshed = await request(app, {
          method: "POST",
          url: "/auth/refresh",
          headers: { cookie: originalCookie },
        });
        assert.equal(refreshed.response.statusCode, 200);
        const rotatedCookie = cookieFrom(refreshed.response, config.refreshCookieName);
        assert.ok(rotatedCookie);
        assert.notEqual(rotatedCookie, originalCookie);

        const replay = await request(app, {
          method: "POST",
          url: "/auth/refresh",
          headers: { cookie: originalCookie },
        });
        assert.equal(replay.response.statusCode, 401);

        const replacement = await request(app, {
          method: "POST",
          url: "/auth/refresh",
          headers: { cookie: rotatedCookie },
        });
        assert.equal(replacement.response.statusCode, 401);
      });

      let webAccount;
      await t.test("logout-all and password changes revoke previous sessions", async () => {
        webAccount = await signup(app, {
          email: "web@platform.example.com",
          platform: "web",
        });
        assert.equal(webAccount.response.statusCode, 200);

        const first = await login(app, "max.test@example.com", USER_PASSWORD, "web");
        const second = await login(app, "max.test@example.com", USER_PASSWORD, "android");
        const secondCookie = cookieFrom(second.response, config.refreshCookieName);
        const logoutAll = await request(app, {
          method: "POST",
          url: "/auth/logout-all",
          headers: bearer(first.body.session.accessToken),
        });
        assert.equal(logoutAll.response.statusCode, 200);
        const secondRefresh = await request(app, {
          method: "POST",
          url: "/auth/refresh",
          headers: { cookie: secondCookie },
        });
        assert.equal(secondRefresh.response.statusCode, 401);

        const passwordSession = await login(app, "max.test@example.com");
        const oldCookie = cookieFrom(passwordSession.response, config.refreshCookieName);
        const changed = await request(app, {
          method: "POST",
          url: "/auth/change-password",
          headers: bearer(passwordSession.body.session.accessToken),
          payload: { newPassword: CHANGED_PASSWORD },
        });
        assert.equal(changed.response.statusCode, 200);
        assert.equal(changed.body.user.mustChangePassword, false);
        assert.ok(cookieFrom(changed.response, config.refreshCookieName));

        const oldRefresh = await request(app, {
          method: "POST",
          url: "/auth/refresh",
          headers: { cookie: oldCookie },
        });
        assert.equal(oldRefresh.response.statusCode, 401);
        const newLogin = await login(app, "max.test@example.com", CHANGED_PASSWORD);
        assert.equal(newLogin.response.statusCode, 200);
      });

      await t.test("administrator controls are authorized, effective, and audited", async () => {
        const unauthorized = await request(app, { url: "/admin/users" });
        assert.equal(unauthorized.response.statusCode, 401);

        const adminLogin = await request(app, {
          method: "POST",
          url: "/admin/login",
          payload: { password: ADMIN_PASSWORD },
        });
        assert.equal(adminLogin.response.statusCode, 200);
        const adminHeaders = bearer(adminLogin.body.session.accessToken);

        const listed = await request(app, {
          url: "/admin/users?search=max.test&platform=ios_pwa",
          headers: adminHeaders,
        });
        assert.equal(listed.response.statusCode, 200);
        assert.equal(listed.body.users.length, 1);
        assert.equal(listed.body.users[0].id, primary.body.user.id);

        const profile = await request(app, {
          method: "PATCH",
          url: `/admin/users/${primary.body.user.id}/profile`,
          headers: adminHeaders,
          payload: { displayName: "Max Updated", email: "max.updated@example.com" },
        });
        assert.equal(profile.response.statusCode, 200);
        assert.equal(profile.body.user.displayName, "Max Updated");

        const periodEnd = new Date(Date.now() + 7 * 86_400_000).toISOString();
        const membership = await request(app, {
          method: "PATCH",
          url: `/admin/users/${primary.body.user.id}/membership`,
          headers: adminHeaders,
          payload: {
            plan: "committed",
            subscriptionStatus: "active",
            source: "manual",
            startedAt: new Date().toISOString(),
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: true,
          },
        });
        assert.equal(membership.response.statusCode, 200);
        assert.equal(membership.body.membership.effectivePlan, "committed");
        assert.equal(membership.body.membership.hasPaidAccess, true);
        assert.equal(membership.body.membership.cancelAtPeriodEnd, true);

        const note = await request(app, {
          method: "POST",
          url: `/admin/users/${primary.body.user.id}/notes`,
          headers: adminHeaders,
          payload: { note: "Manual committed access approved." },
        });
        assert.equal(note.response.statusCode, 200);

        const temporary = await request(app, {
          method: "POST",
          url: `/admin/users/${primary.body.user.id}/set-temporary-password`,
          headers: adminHeaders,
          payload: { temporaryPassword: TEMPORARY_PASSWORD },
        });
        assert.equal(temporary.response.statusCode, 200);
        assert.equal(temporary.body.mustChangePassword, true);
        assert.equal(temporary.body.sessionsRevoked, true);

        const temporaryLogin = await login(app, "max.updated@example.com", TEMPORARY_PASSWORD);
        assert.equal(temporaryLogin.response.statusCode, 200);
        assert.equal(temporaryLogin.body.user.mustChangePassword, true);

        const badDelete = await request(app, {
          method: "DELETE",
          url: `/admin/users/${primary.body.user.id}`,
          headers: adminHeaders,
          payload: { confirmation: "NO" },
        });
        assert.equal(badDelete.response.statusCode, 400);

        const deleted = await request(app, {
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
        assert.equal(audits.rows.some((row) => row.summary.includes(TEMPORARY_PASSWORD)), false);

        for (const [platform, expectedId] of [
          ["ios_pwa", primary.body.user.id],
          ["android", androidAccount.body.user.id],
          ["web", webAccount.body.user.id],
        ]) {
          const filtered = await request(app, {
            url: `/admin/users?platform=${platform}`,
            headers: adminHeaders,
          });
          assert.equal(filtered.response.statusCode, 200);
          assert.ok(filtered.body.users.some((user) => user.id === expectedId));
        }
      });

      await t.test("unapproved origins are rejected", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/health",
          headers: { origin: "https://evil.example" },
        });
        assert.equal(response.statusCode, 403);
      });
    } finally {
      await app.close();
    }
  }
);
