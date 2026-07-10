import { z } from "zod";

const booleanText = z
  .string()
  .optional()
  .transform((value) => String(value || "false").toLowerCase() === "true");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8787),
  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: booleanText,
  CLARA_ACCESS_TOKEN_SECRET: z.string().min(32),
  CLARA_ADMIN_ACCESS_TOKEN_SECRET: z.string().min(32),
  CLARA_ADMIN_PASSWORD_HASH: z.string().startsWith("$argon2"),
  CLARA_ADMIN_IDENTIFIER: z.string().min(1).default("clara-owner"),
  CLARA_ALLOWED_ORIGINS: z.string().min(1),
  CLARA_REFRESH_COOKIE_NAME: z.string().min(1).default("clara_refresh"),
  CLARA_ADMIN_REFRESH_COOKIE_NAME: z.string().min(1).default("clara_admin_refresh"),
  CLARA_COOKIE_DOMAIN: z.string().optional().default(""),
  CLARA_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(3600).default(900),
  CLARA_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  CLARA_ADMIN_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(1800).default(900),
  CLARA_ADMIN_REFRESH_TOKEN_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(12),
  CLARA_OFFLINE_GRACE_HOURS: z.coerce.number().int().min(1).max(48).default(24),
  TRUST_PROXY: booleanText,
});

export function loadConfig(env = process.env) {
  const parsed = schema.parse(env);
  const allowedOrigins = parsed.CLARA_ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!allowedOrigins.length) {
    throw new Error("At least one exact CLARA origin is required.");
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    databaseSsl: parsed.DATABASE_SSL,
    accessTokenSecret: parsed.CLARA_ACCESS_TOKEN_SECRET,
    adminAccessTokenSecret: parsed.CLARA_ADMIN_ACCESS_TOKEN_SECRET,
    adminPasswordHash: parsed.CLARA_ADMIN_PASSWORD_HASH,
    adminIdentifier: parsed.CLARA_ADMIN_IDENTIFIER,
    allowedOrigins,
    refreshCookieName: parsed.CLARA_REFRESH_COOKIE_NAME,
    adminRefreshCookieName: parsed.CLARA_ADMIN_REFRESH_COOKIE_NAME,
    cookieDomain: parsed.CLARA_COOKIE_DOMAIN || undefined,
    accessTokenTtlSeconds: parsed.CLARA_ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlDays: parsed.CLARA_REFRESH_TOKEN_TTL_DAYS,
    adminTokenTtlSeconds: parsed.CLARA_ADMIN_TOKEN_TTL_SECONDS,
    adminRefreshTokenTtlHours: parsed.CLARA_ADMIN_REFRESH_TOKEN_TTL_HOURS,
    offlineGraceHours: parsed.CLARA_OFFLINE_GRACE_HOURS,
    trustProxy: parsed.TRUST_PROXY,
  };
}
