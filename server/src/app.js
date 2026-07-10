import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { createPool, withTransaction } from "./database/pool.js";
import {
  buildDeviceId,
  buildRefreshCredential,
  generateRefreshToken,
  getBearerToken,
  hashPassword,
  hashRefreshToken,
  normalizeEmail,
  parseRefreshCredential,
  signAccessToken,
  validatePasswordStrength,
  verifyAccessToken,
  verifyPassword,
} from "./security.js";
import { serializeMembership } from "./membership.js";

const PLATFORM_VALUES = ["ios_pwa", "android", "web"];
const PLAN_VALUES = ["free", "beta", "committed"];
const SUBSCRIPTION_STATUS_VALUES = ["active", "cancelled", "expired", "suspended", "refunded"];
const SUBSCRIPTION_SOURCE_VALUES = ["free", "manual", "beta", "android", "ios", "web"];
const ACCOUNT_STATUS_VALUES = ["active", "suspended", "disabled", "deleted"];

const platformSchema = z.enum(PLATFORM_VALUES);
const emailSchema = z.string().email().max(320);
const displayNameSchema = z.string().trim().min(1).max(120);
const passwordSchema = z.string().max(256);
const uuidSchema = z.string().uuid();

const signupSchema = z.object({
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  platform: platformSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  platform: platformSchema,
});

function apiError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function parseBody(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw apiError(400, "invalid_request", "Please check the submitted information.");
  }
  return result.data;
}

function cookieOptions(config, maxAgeSeconds) {
  return {
    path: "/",
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    domain: config.cookieDomain,
    maxAge: maxAgeSeconds,
  };
}

function clearCookie(reply, name, config) {
  reply.clearCookie(name, {
    path: "/",
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    domain: config.cookieDomain,
  });
}

function safeUser(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    accountStatus: row.account_status,
    signupPlatform: row.signup_platform,
    mustChangePassword: Boolean(row.must_change_password),
    passwordChangedAt: row.password_changed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function loadUserAndMembership(queryable, userId) {
  const result = await queryable.query(
    `SELECT
       u.*,
       m.id AS membership_id,
       m.user_id AS membership_user_id,
       m.plan,
       m.subscription_status,
       m.source,
       m.started_at,
       m.current_period_end,
       m.cancel_at_period_end,
       m.cancelled_at,
       m.expired_at,
       m.refunded_at,
       m.suspended_at,
       m.created_at AS membership_created_at,
       m.updated_at AS membership_updated_at
     FROM users u
     LEFT JOIN memberships m ON m.user_id = u.id
     WHERE u.id = $1
     LIMIT 1`,
    [userId]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  return {
    user: row,
    membership: {
      id: row.membership_id,
      user_id: row.membership_user_id,
      plan: row.plan,
      subscription_status: row.subscription_status,
      source: row.source,
      started_at: row.started_at,
      current_period_end: row.current_period_end,
      cancel_at_period_end: row.cancel_at_period_end,
      cancelled_at: row.cancelled_at,
      expired_at: row.expired_at,
      refunded_at: row.refunded_at,
      suspended_at: row.suspended_at,
      created_at: row.membership_created_at,
      updated_at: row.membership_updated_at,
    },
  };
}

function assertAccountCanAuthenticate(user) {
  if (!user || user.account_status !== "active") {
    throw apiError(401, "authentication_failed", "Email or password not accepted.");
  }
}

async function createUserSession(queryable, { user, platform, deviceId, config }) {
  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 86_400_000);
  const inserted = await queryable.query(
    `INSERT INTO sessions (user_id, refresh_token_hash, device_id, platform, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at, expires_at`,
    [user.id, refreshHash, deviceId, platform, expiresAt]
  );
  const session = inserted.rows[0];
  const accessToken = signAccessToken(
    { sub: user.id, sid: session.id, accountStatus: user.account_status },
    { secret: config.accessTokenSecret, ttlSeconds: config.accessTokenTtlSeconds, kind: "user" }
  );
  return {
    session,
    accessToken,
    refreshCredential: buildRefreshCredential(session.id, refreshToken),
  };
}

async function createAdminSession(queryable, config) {
  const refreshToken = generateRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + config.adminRefreshTokenTtlHours * 3_600_000);
  const inserted = await queryable.query(
    `INSERT INTO admin_sessions (admin_identifier, refresh_token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id, created_at, expires_at`,
    [config.adminIdentifier, refreshHash, expiresAt]
  );
  const session = inserted.rows[0];
  const accessToken = signAccessToken(
    { sub: config.adminIdentifier, sid: session.id },
    {
      secret: config.adminAccessTokenSecret,
      ttlSeconds: config.adminTokenTtlSeconds,
      kind: "admin",
    }
  );
  return {
    session,
    accessToken,
    refreshCredential: buildRefreshCredential(session.id, refreshToken),
  };
}

function buildAuthEnvelope(user, membership, issued, config) {
  return {
    ok: true,
    user: safeUser(user),
    membership: serializeMembership(user, membership, config.offlineGraceHours),
    session: {
      accessToken: issued.accessToken,
      tokenType: "Bearer",
      expiresIn: config.accessTokenTtlSeconds,
      expiresAt: new Date(Date.now() + config.accessTokenTtlSeconds * 1000).toISOString(),
      sessionId: issued.session.id,
    },
  };
}

async function writeAudit(queryable, config, targetUserId, action, summary = {}) {
  await queryable.query(
    `INSERT INTO admin_audit_log (admin_identifier, target_user_id, action, safe_change_summary)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [config.adminIdentifier, targetUserId || null, action, JSON.stringify(summary)]
  );
}

export async function buildApp({ config, pool = createPool(config) }) {
  const app = Fastify({ logger: true, trustProxy: config.trustProxy });
  app.decorate("db", pool);
  app.decorate("config", config);

  await app.register(cookie);
  await app.register(helmet, { global: true });
  await app.register(rateLimit, { global: false });
  await app.register(cors, {
    credentials: true,
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      const error = apiError(403, "origin_not_allowed", "Origin is not allowed.");
      callback(error, false);
    },
  });

  app.setErrorHandler((error, request, reply) => {
    const validationError = error instanceof z.ZodError;
    const statusCode = validationError ? 400 : Number(error.statusCode) || 500;
    if (statusCode >= 500) request.log.error(error);
    reply.code(statusCode).send({
      ok: false,
      code: validationError
        ? "invalid_request"
        : error.code || (statusCode >= 500 ? "server_error" : "request_failed"),
      message:
        statusCode >= 500
          ? "CLARA account service is temporarily unavailable."
          : validationError
            ? "Please check the submitted information."
            : error.message,
    });
  });

  app.addHook("onClose", async () => {
    await pool.end();
  });

  async function requireUser(request) {
    const token = getBearerToken(request);
    const payload = verifyAccessToken(token, {
      secret: config.accessTokenSecret,
      kind: "user",
    });
    if (!payload?.sub || !payload?.sid) {
      throw apiError(401, "unauthorized", "Authentication is required.");
    }

    const result = await pool.query(
      `SELECT u.*, s.revoked_at, s.expires_at AS session_expires_at
       FROM users u
       JOIN sessions s ON s.user_id = u.id
       WHERE u.id = $1 AND s.id = $2
       LIMIT 1`,
      [payload.sub, payload.sid]
    );
    const row = result.rows[0];
    if (!row || row.revoked_at || Date.parse(row.session_expires_at) <= Date.now()) {
      throw apiError(401, "session_revoked", "This session is no longer valid.");
    }
    assertAccountCanAuthenticate(row);
    request.auth = { userId: row.id, sessionId: payload.sid, mustChangePassword: row.must_change_password };
  }

  async function requireAdmin(request) {
    const token = getBearerToken(request);
    const payload = verifyAccessToken(token, {
      secret: config.adminAccessTokenSecret,
      kind: "admin",
    });
    if (payload?.sub !== config.adminIdentifier || !payload?.sid) {
      throw apiError(401, "admin_unauthorized", "Administrator authorization is required.");
    }
    const result = await pool.query(
      `SELECT id FROM admin_sessions
       WHERE id = $1 AND admin_identifier = $2 AND revoked_at IS NULL AND expires_at > now()`,
      [payload.sid, config.adminIdentifier]
    );
    if (!result.rowCount) {
      throw apiError(401, "admin_session_revoked", "Administrator authorization has expired.");
    }
    request.admin = { identifier: config.adminIdentifier, sessionId: payload.sid };
  }

  app.get("/health", async () => ({ ok: true, service: "clara-account-api" }));

  app.post(
    "/auth/signup",
    { config: { rateLimit: { max: 8, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = parseBody(signupSchema, request.body);
      const normalizedEmail = normalizeEmail(input.email);
      const strength = validatePasswordStrength(input.password);
      if (!strength.valid) {
        throw apiError(400, "weak_password", `Password must include ${strength.failures.join(", ")}.`);
      }

      let created;
      try {
        created = await withTransaction(pool, async (client) => {
          const passwordHash = await hashPassword(input.password);
          const userResult = await client.query(
            `INSERT INTO users (email, normalized_email, display_name, password_hash, signup_platform)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [input.email.trim(), normalizedEmail, input.displayName.trim(), passwordHash, input.platform]
          );
          const user = userResult.rows[0];
          const membershipResult = await client.query(
            `INSERT INTO memberships (user_id, plan, subscription_status, source)
             VALUES ($1, 'free', 'active', 'free')
             RETURNING *`,
            [user.id]
          );
          const issued = await createUserSession(client, {
            user,
            platform: input.platform,
            deviceId: buildDeviceId(request),
            config,
          });
          return { user, membership: membershipResult.rows[0], issued };
        });
      } catch (error) {
        if (error?.code === "23505") {
          throw apiError(409, "account_unavailable", "Unable to create this account. Try logging in instead.");
        }
        throw error;
      }

      reply.setCookie(
        config.refreshCookieName,
        created.issued.refreshCredential,
        cookieOptions(config, config.refreshTokenTtlDays * 86_400)
      );
      return buildAuthEnvelope(created.user, created.membership, created.issued, config);
    }
  );

  app.post(
    "/auth/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const input = parseBody(loginSchema, request.body);
      const result = await pool.query(
        `SELECT * FROM users WHERE normalized_email = $1 LIMIT 1`,
        [normalizeEmail(input.email)]
      );
      const user = result.rows[0];
      const passwordAccepted = user ? await verifyPassword(user.password_hash, input.password) : false;
      if (!user || !passwordAccepted) {
        throw apiError(401, "authentication_failed", "Email or password not accepted.");
      }
      assertAccountCanAuthenticate(user);
      const membershipResult = await pool.query("SELECT * FROM memberships WHERE user_id = $1", [user.id]);
      const issued = await createUserSession(pool, {
        user,
        platform: input.platform,
        deviceId: buildDeviceId(request),
        config,
      });
      reply.setCookie(
        config.refreshCookieName,
        issued.refreshCredential,
        cookieOptions(config, config.refreshTokenTtlDays * 86_400)
      );
      return buildAuthEnvelope(user, membershipResult.rows[0], issued, config);
    }
  );

  app.post("/auth/refresh", async (request, reply) => {
    const parsed = parseRefreshCredential(request.cookies?.[config.refreshCookieName]);
    if (!parsed) {
      clearCookie(reply, config.refreshCookieName, config);
      throw apiError(401, "missing_refresh_session", "No refresh session is available.");
    }

    try {
      const refreshed = await withTransaction(pool, async (client) => {
        const result = await client.query(
          `SELECT
             s.id AS session_id,
             s.user_id AS session_user_id,
             s.refresh_token_hash,
             s.device_id,
             s.platform AS session_platform,
             s.expires_at AS session_expires_at,
             s.revoked_at AS session_revoked_at,
             s.replaced_by_session_id,
             u.*
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.id = $1
           FOR UPDATE`,
          [parsed.sessionId]
        );
        const row = result.rows[0];
        const tokenHashMatches = row?.refresh_token_hash === hashRefreshToken(parsed.token);
        if (
          !row ||
          row.session_revoked_at ||
          Date.parse(row.session_expires_at) <= Date.now() ||
          !tokenHashMatches
        ) {
          if (row?.id && (row.session_revoked_at || !tokenHashMatches)) {
            await client.query(
              "UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1",
              [row.id]
            );
          }
          throw apiError(401, "invalid_refresh_session", "The refresh session is no longer valid.");
        }
        assertAccountCanAuthenticate(row);
        const issued = await createUserSession(client, {
          user: row,
          platform: row.session_platform,
          deviceId: row.device_id,
          config,
        });
        await client.query(
          "UPDATE sessions SET revoked_at = now(), replaced_by_session_id = $2 WHERE id = $1",
          [row.session_id, issued.session.id]
        );
        const loaded = await loadUserAndMembership(client, row.id);
        return { ...loaded, issued };
      });
      reply.setCookie(
        config.refreshCookieName,
        refreshed.issued.refreshCredential,
        cookieOptions(config, config.refreshTokenTtlDays * 86_400)
      );
      return buildAuthEnvelope(refreshed.user, refreshed.membership, refreshed.issued, config);
    } catch (error) {
      clearCookie(reply, config.refreshCookieName, config);
      throw error;
    }
  });

  app.post("/auth/logout", async (request, reply) => {
    const parsed = parseRefreshCredential(request.cookies?.[config.refreshCookieName]);
    if (parsed) {
      await pool.query(
        `UPDATE sessions SET revoked_at = COALESCE(revoked_at, now())
         WHERE id = $1 AND refresh_token_hash = $2`,
        [parsed.sessionId, hashRefreshToken(parsed.token)]
      );
    }
    clearCookie(reply, config.refreshCookieName, config);
    return { ok: true };
  });

  app.post("/auth/logout-all", { preHandler: requireUser }, async (request, reply) => {
    await pool.query(
      "UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1",
      [request.auth.userId]
    );
    clearCookie(reply, config.refreshCookieName, config);
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: requireUser }, async (request) => {
    const loaded = await loadUserAndMembership(pool, request.auth.userId);
    return {
      ok: true,
      user: safeUser(loaded.user),
      membership: serializeMembership(loaded.user, loaded.membership, config.offlineGraceHours),
    };
  });

  app.get("/membership/status", { preHandler: requireUser }, async (request) => {
    const loaded = await loadUserAndMembership(pool, request.auth.userId);
    return {
      ok: true,
      membership: serializeMembership(loaded.user, loaded.membership, config.offlineGraceHours),
    };
  });

  app.post("/auth/change-password", { preHandler: requireUser }, async (request, reply) => {
    const input = parseBody(z.object({ newPassword: passwordSchema }), request.body);
    const strength = validatePasswordStrength(input.newPassword);
    if (!strength.valid) {
      throw apiError(400, "weak_password", `Password must include ${strength.failures.join(", ")}.`);
    }
    const changed = await withTransaction(pool, async (client) => {
      const loaded = await loadUserAndMembership(client, request.auth.userId);
      const passwordHash = await hashPassword(input.newPassword);
      const userResult = await client.query(
        `UPDATE users
         SET password_hash = $2, must_change_password = false, password_changed_at = now(), updated_at = now()
         WHERE id = $1
         RETURNING *`,
        [request.auth.userId, passwordHash]
      );
      await client.query(
        "UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1",
        [request.auth.userId]
      );
      const issued = await createUserSession(client, {
        user: userResult.rows[0],
        platform: loaded.user.signup_platform,
        deviceId: buildDeviceId(request),
        config,
      });
      return { user: userResult.rows[0], membership: loaded.membership, issued };
    });
    reply.setCookie(
      config.refreshCookieName,
      changed.issued.refreshCredential,
      cookieOptions(config, config.refreshTokenTtlDays * 86_400)
    );
    return buildAuthEnvelope(changed.user, changed.membership, changed.issued, config);
  });

  app.post(
    "/admin/login",
    { config: { rateLimit: { max: 6, timeWindow: "5 minutes" } } },
    async (request, reply) => {
      const input = parseBody(z.object({ password: passwordSchema }), request.body);
      const accepted = await verifyPassword(config.adminPasswordHash, input.password);
      if (!accepted) {
        throw apiError(401, "admin_authentication_failed", "Administrator password not accepted.");
      }
      const issued = await createAdminSession(pool, config);
      reply.setCookie(
        config.adminRefreshCookieName,
        issued.refreshCredential,
        cookieOptions(config, config.adminRefreshTokenTtlHours * 3600)
      );
      return {
        ok: true,
        admin: { identifier: config.adminIdentifier },
        session: {
          accessToken: issued.accessToken,
          expiresAt: new Date(Date.now() + config.adminTokenTtlSeconds * 1000).toISOString(),
        },
      };
    }
  );

  app.post("/admin/refresh", async (request, reply) => {
    const parsed = parseRefreshCredential(request.cookies?.[config.adminRefreshCookieName]);
    if (!parsed) throw apiError(401, "admin_refresh_missing", "Administrator authorization has expired.");
    const refreshed = await withTransaction(pool, async (client) => {
      const result = await client.query(
        `SELECT * FROM admin_sessions WHERE id = $1 FOR UPDATE`,
        [parsed.sessionId]
      );
      const row = result.rows[0];
      if (
        !row ||
        row.revoked_at ||
        Date.parse(row.expires_at) <= Date.now() ||
        row.refresh_token_hash !== hashRefreshToken(parsed.token)
      ) {
        throw apiError(401, "admin_refresh_invalid", "Administrator authorization has expired.");
      }
      const issued = await createAdminSession(client, config);
      await client.query(
        "UPDATE admin_sessions SET revoked_at = now(), replaced_by_session_id = $2 WHERE id = $1",
        [row.id, issued.session.id]
      );
      return issued;
    });
    reply.setCookie(
      config.adminRefreshCookieName,
      refreshed.refreshCredential,
      cookieOptions(config, config.adminRefreshTokenTtlHours * 3600)
    );
    return {
      ok: true,
      session: {
        accessToken: refreshed.accessToken,
        expiresAt: new Date(Date.now() + config.adminTokenTtlSeconds * 1000).toISOString(),
      },
    };
  });

  app.post("/admin/logout", { preHandler: requireAdmin }, async (request, reply) => {
    await pool.query("UPDATE admin_sessions SET revoked_at = now() WHERE id = $1", [request.admin.sessionId]);
    clearCookie(reply, config.adminRefreshCookieName, config);
    return { ok: true };
  });

  app.get("/admin/users", { preHandler: requireAdmin }, async (request) => {
    const query = z
      .object({
        search: z.string().max(200).optional(),
        platform: z.enum(PLATFORM_VALUES).optional(),
        plan: z.enum(PLAN_VALUES).optional(),
        subscriptionStatus: z.enum(SUBSCRIPTION_STATUS_VALUES).optional(),
        accountStatus: z.enum(ACCOUNT_STATUS_VALUES).optional(),
        limit: z.coerce.number().int().min(1).max(200).default(100),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(request.query || {});
    const where = [];
    const values = [];
    const add = (clause, value) => {
      values.push(value);
      where.push(clause.replace("?", `$${values.length}`));
    };
    if (query.search) add("concat_ws(' ', u.display_name, u.email) ILIKE ?", `%${query.search.trim()}%`);
    if (query.platform) add("u.signup_platform = ?", query.platform);
    if (query.plan) add("m.plan = ?", query.plan);
    if (query.subscriptionStatus) add("m.subscription_status = ?", query.subscriptionStatus);
    if (query.accountStatus) add("u.account_status = ?", query.accountStatus);
    values.push(query.limit, query.offset);
    const result = await pool.query(
      `SELECT u.*, m.*,
         u.id AS user_id,
         u.created_at AS user_created_at,
         u.updated_at AS user_updated_at,
         COUNT(*) OVER()::int AS total_count
       FROM users u
       JOIN memberships m ON m.user_id = u.id
       ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
       ORDER BY u.created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );
    return {
      ok: true,
      total: result.rows[0]?.total_count || 0,
      users: result.rows.map((row) => ({
        id: row.user_id,
        displayName: row.display_name,
        email: row.email,
        signupPlatform: row.signup_platform,
        accountStatus: row.account_status,
        mustChangePassword: Boolean(row.must_change_password),
        createdAt: row.user_created_at,
        plan: row.plan,
        subscriptionStatus: row.subscription_status,
        subscriptionSource: row.source,
        startedAt: row.started_at,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
      })),
    };
  });

  app.get("/admin/users/:id", { preHandler: requireAdmin }, async (request) => {
    const userId = uuidSchema.parse(request.params.id);
    const loaded = await loadUserAndMembership(pool, userId);
    if (!loaded) throw apiError(404, "user_not_found", "Account not found.");
    const notes = await pool.query(
      "SELECT id, note, admin_identifier, created_at FROM admin_notes WHERE target_user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return {
      ok: true,
      user: safeUser(loaded.user),
      membership: serializeMembership(loaded.user, loaded.membership, config.offlineGraceHours),
      notes: notes.rows,
    };
  });

  app.patch("/admin/users/:id/profile", { preHandler: requireAdmin }, async (request) => {
    const userId = uuidSchema.parse(request.params.id);
    const input = parseBody(
      z.object({ displayName: displayNameSchema.optional(), email: emailSchema.optional() }).refine(
        (value) => value.displayName || value.email,
        "At least one field is required."
      ),
      request.body
    );
    const updates = [];
    const values = [userId];
    if (input.displayName) {
      values.push(input.displayName.trim());
      updates.push(`display_name = $${values.length}`);
    }
    if (input.email) {
      values.push(input.email.trim());
      updates.push(`email = $${values.length}`);
      values.push(normalizeEmail(input.email));
      updates.push(`normalized_email = $${values.length}`);
    }
    try {
      const result = await pool.query(
        `UPDATE users SET ${updates.join(", ")}, updated_at = now() WHERE id = $1 RETURNING *`,
        values
      );
      if (!result.rowCount) throw apiError(404, "user_not_found", "Account not found.");
      await writeAudit(pool, config, userId, "profile_updated", {
        displayNameChanged: Boolean(input.displayName),
        emailChanged: Boolean(input.email),
      });
      return { ok: true, user: safeUser(result.rows[0]) };
    } catch (error) {
      if (error?.code === "23505") throw apiError(409, "email_unavailable", "That email cannot be used.");
      throw error;
    }
  });

  app.patch("/admin/users/:id/account-status", { preHandler: requireAdmin }, async (request) => {
    const userId = uuidSchema.parse(request.params.id);
    const input = parseBody(z.object({ accountStatus: z.enum(ACCOUNT_STATUS_VALUES) }), request.body);
    const result = await pool.query(
      `UPDATE users
       SET account_status = $2,
           disabled_at = CASE WHEN $2 IN ('disabled', 'deleted') THEN now() ELSE NULL END,
           deleted_at = CASE WHEN $2 = 'deleted' THEN now() ELSE NULL END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [userId, input.accountStatus]
    );
    if (!result.rowCount) throw apiError(404, "user_not_found", "Account not found.");
    if (input.accountStatus !== "active") {
      await pool.query("UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1", [userId]);
    }
    await writeAudit(pool, config, userId, "account_status_updated", { accountStatus: input.accountStatus });
    return { ok: true, user: safeUser(result.rows[0]) };
  });

  app.patch("/admin/users/:id/membership", { preHandler: requireAdmin }, async (request) => {
    const userId = uuidSchema.parse(request.params.id);
    const input = parseBody(
      z.object({
        plan: z.enum(PLAN_VALUES).optional(),
        subscriptionStatus: z.enum(SUBSCRIPTION_STATUS_VALUES).optional(),
        source: z.enum(SUBSCRIPTION_SOURCE_VALUES).optional(),
        startedAt: z.string().datetime().nullable().optional(),
        currentPeriodEnd: z.string().datetime().nullable().optional(),
        cancelAtPeriodEnd: z.boolean().optional(),
        cancelImmediately: z.boolean().optional(),
      }),
      request.body
    );

    const assignments = new Map();
    const values = [userId];
    const setParameter = (column, value) => {
      values.push(value);
      assignments.set(column, `$${values.length}`);
    };
    const setExpression = (column, expression) => {
      assignments.set(column, expression);
    };

    if (input.plan) setParameter("plan", input.plan);
    if (input.subscriptionStatus) setParameter("subscription_status", input.subscriptionStatus);
    if (input.source) setParameter("source", input.source);
    if (input.startedAt !== undefined) setParameter("started_at", input.startedAt);
    if (input.currentPeriodEnd !== undefined) setParameter("current_period_end", input.currentPeriodEnd);
    if (input.cancelAtPeriodEnd !== undefined) setParameter("cancel_at_period_end", input.cancelAtPeriodEnd);

    if (input.subscriptionStatus === "cancelled") {
      setExpression("cancelled_at", "COALESCE(cancelled_at, now())");
    }
    if (input.subscriptionStatus === "expired") setExpression("expired_at", "COALESCE(expired_at, now())");
    if (input.subscriptionStatus === "refunded") setExpression("refunded_at", "COALESCE(refunded_at, now())");
    if (input.subscriptionStatus === "suspended") setExpression("suspended_at", "COALESCE(suspended_at, now())");

    if (input.cancelImmediately) {
      setExpression("subscription_status", "'cancelled'");
      setExpression("cancel_at_period_end", "false");
      setExpression("cancelled_at", "now()");
      setExpression("current_period_end", "now()");
    }

    if (input.plan === "free") {
      setExpression("subscription_status", "'active'");
      setExpression("source", "'free'");
      setExpression("cancel_at_period_end", "false");
      setExpression("current_period_end", "NULL");
      setExpression("cancelled_at", "NULL");
      setExpression("expired_at", "NULL");
      setExpression("refunded_at", "NULL");
      setExpression("suspended_at", "NULL");
    }

    if (!assignments.size) throw apiError(400, "invalid_request", "No membership changes were submitted.");
    const fields = Array.from(assignments, ([column, expression]) => `${column} = ${expression}`);
    const result = await pool.query(
      `UPDATE memberships SET ${fields.join(", ")}, updated_at = now() WHERE user_id = $1 RETURNING *`,
      values
    );
    if (!result.rowCount) throw apiError(404, "membership_not_found", "Membership not found.");
    const loaded = await loadUserAndMembership(pool, userId);
    await writeAudit(pool, config, userId, "membership_updated", {
      plan: loaded.membership.plan,
      subscriptionStatus: loaded.membership.subscription_status,
      source: loaded.membership.source,
      cancelAtPeriodEnd: loaded.membership.cancel_at_period_end,
    });
    return {
      ok: true,
      membership: serializeMembership(loaded.user, loaded.membership, config.offlineGraceHours),
    };
  });

  app.post("/admin/users/:id/set-temporary-password", { preHandler: requireAdmin }, async (request) => {
    const userId = uuidSchema.parse(request.params.id);
    const input = parseBody(z.object({ temporaryPassword: passwordSchema }), request.body);
    const strength = validatePasswordStrength(input.temporaryPassword);
    if (!strength.valid) {
      throw apiError(400, "weak_password", `Temporary password must include ${strength.failures.join(", ")}.`);
    }
    const passwordHash = await hashPassword(input.temporaryPassword);
    const result = await withTransaction(pool, async (client) => {
      const updated = await client.query(
        `UPDATE users
         SET password_hash = $2, must_change_password = true, password_changed_at = now(), updated_at = now()
         WHERE id = $1 RETURNING id`,
        [userId, passwordHash]
      );
      if (!updated.rowCount) throw apiError(404, "user_not_found", "Account not found.");
      await client.query("UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1", [userId]);
      await writeAudit(client, config, userId, "temporary_password_set", { sessionsRevoked: true });
      return updated.rows[0];
    });
    return { ok: true, userId: result.id, mustChangePassword: true, sessionsRevoked: true };
  });

  app.post("/admin/users/:id/revoke-sessions", { preHandler: requireAdmin }, async (request) => {
    const userId = uuidSchema.parse(request.params.id);
    const result = await pool.query(
      "UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
    await writeAudit(pool, config, userId, "sessions_revoked", { count: result.rowCount });
    return { ok: true, revokedCount: result.rowCount };
  });

  app.post("/admin/users/:id/notes", { preHandler: requireAdmin }, async (request) => {
    const userId = uuidSchema.parse(request.params.id);
    const input = parseBody(z.object({ note: z.string().trim().min(1).max(2000) }), request.body);
    const result = await pool.query(
      `INSERT INTO admin_notes (target_user_id, admin_identifier, note)
       VALUES ($1, $2, $3)
       RETURNING id, note, admin_identifier, created_at`,
      [userId, config.adminIdentifier, input.note]
    );
    await writeAudit(pool, config, userId, "admin_note_added", { noteLength: input.note.length });
    return { ok: true, note: result.rows[0] };
  });

  app.delete("/admin/users/:id", { preHandler: requireAdmin }, async (request) => {
    const userId = uuidSchema.parse(request.params.id);
    parseBody(z.object({ confirmation: z.literal("DELETE") }), request.body);
    const result = await withTransaction(pool, async (client) => {
      const updated = await client.query(
        `UPDATE users
         SET account_status = 'deleted', deleted_at = now(), disabled_at = now(), updated_at = now()
         WHERE id = $1 AND account_status <> 'deleted'
         RETURNING id`,
        [userId]
      );
      if (!updated.rowCount) throw apiError(404, "user_not_found", "Account not found or already deleted.");
      await client.query("UPDATE sessions SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1", [userId]);
      await writeAudit(client, config, userId, "account_soft_deleted", { sessionsRevoked: true });
      return updated.rows[0];
    });
    return { ok: true, userId: result.id, deleted: true };
  });

  app.get("/admin/legacy-ios-access", { preHandler: requireAdmin }, async () => {
    const result = await pool.query(
      `SELECT * FROM legacy_ios_access_links ORDER BY activated_at DESC NULLS LAST, created_at DESC`
    );
    return { ok: true, records: result.rows };
  });

  app.post("/admin/legacy-ios-access/:id/link", { preHandler: requireAdmin }, async (request) => {
    const legacyId = uuidSchema.parse(request.params.id);
    const input = parseBody(z.object({ userId: uuidSchema }), request.body);
    const result = await pool.query(
      `UPDATE legacy_ios_access_links
       SET linked_user_id = $2, migrated_at = now(), updated_at = now()
       WHERE id = $1 RETURNING *`,
      [legacyId, input.userId]
    );
    if (!result.rowCount) throw apiError(404, "legacy_record_not_found", "Legacy record not found.");
    await writeAudit(pool, config, input.userId, "legacy_ios_record_linked", { legacyRecordId: legacyId });
    return { ok: true, record: result.rows[0] };
  });

  return app;
}
