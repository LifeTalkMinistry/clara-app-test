import { createClient } from "@supabase/supabase-js";
import {
  getSupabaseQuotaNotice,
  isSupabaseQuotaBlocked,
  markSupabaseQuotaBlocked,
} from "@/lib/supabaseQuotaGuard";

export const cloudSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const cloudSupabaseAnonKey =
  import.meta.env["VITE_SUPABASE_" + "ANON_KEY"] || "";
export const isCloudSupabaseConfigured = Boolean(
  cloudSupabaseUrl && cloudSupabaseAnonKey
);

const REMOTE_TABLE_ALLOWLIST = new Set(["profiles", "plans", "enrollments"]);
const TERMINAL_QUERY_METHODS = new Set([
  "single",
  "maybeSingle",
  "csv",
  "geojson",
  "explain",
]);

const localResponse = async (terminal = "select") => {
  if (terminal === "single" || terminal === "maybeSingle") {
    return { data: null, error: null };
  }
  if (terminal === "csv") return { data: "", error: null };
  if (terminal === "geojson") return { data: null, error: null };
  return { data: [], error: null };
};

function quotaError() {
  const error = new Error(getSupabaseQuotaNotice());
  error.status = 402;
  error.code = "supabase_quota_blocked";
  return error;
}

const quotaResponse = async (terminal = "select") => ({
  ...(await localResponse(terminal)),
  error: quotaError(),
});

function createQueryBuilder(responseFactory) {
  const builder = {};
  const chain = () => builder;
  Object.assign(builder, {
    select: chain,
    insert: chain,
    update: chain,
    delete: chain,
    upsert: chain,
    eq: chain,
    neq: chain,
    gt: chain,
    gte: chain,
    lt: chain,
    lte: chain,
    is: chain,
    in: chain,
    contains: chain,
    containedBy: chain,
    overlaps: chain,
    like: chain,
    ilike: chain,
    match: chain,
    not: chain,
    or: chain,
    filter: chain,
    order: chain,
    limit: chain,
    range: chain,
    abortSignal: chain,
    throwOnError: chain,
    rollback: chain,
    returns: chain,
    single: () => responseFactory("single"),
    maybeSingle: () => responseFactory("maybeSingle"),
    csv: () => responseFactory("csv"),
    geojson: () => responseFactory("geojson"),
    explain: () => responseFactory("explain"),
    then: (resolve, reject) => responseFactory("select").then(resolve, reject),
    catch: (reject) => responseFactory("select").catch(reject),
    finally: (handler) => responseFactory("select").finally(handler),
  });
  return builder;
}

const localOnlyQueryBuilder = () => createQueryBuilder(localResponse);
const quotaBlockedQueryBuilder = () => createQueryBuilder(quotaResponse);

async function wrapResult(request) {
  try {
    const result = await request;
    if (result?.error) markSupabaseQuotaBlocked(result.error);
    return result;
  } catch (error) {
    markSupabaseQuotaBlocked(error);
    throw error;
  }
}

function quotaAwareQueryBuilder(queryBuilder) {
  if (isSupabaseQuotaBlocked()) return quotaBlockedQueryBuilder();

  return new Proxy(queryBuilder, {
    get(target, property, receiver) {
      if (isSupabaseQuotaBlocked()) {
        const blocked = quotaBlockedQueryBuilder();
        const value = blocked[property];
        return typeof value === "function" ? value.bind(blocked) : value;
      }

      if (property === "then") {
        return (resolve, reject) =>
          wrapResult(Promise.resolve(target)).then(resolve, reject);
      }
      if (property === "catch") {
        return (reject) => wrapResult(Promise.resolve(target)).catch(reject);
      }
      if (property === "finally") {
        return (handler) => wrapResult(Promise.resolve(target)).finally(handler);
      }

      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;

      return (...args) => {
        const next = value.apply(target, args);
        if (TERMINAL_QUERY_METHODS.has(property)) return wrapResult(next);
        if (next && typeof next === "object") return quotaAwareQueryBuilder(next);
        return next;
      };
    },
  });
}

function configuredProxy(client) {
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === "from") {
        return (tableName) => {
          const normalized = String(tableName || "").toLowerCase();
          if (!REMOTE_TABLE_ALLOWLIST.has(normalized)) {
            return localOnlyQueryBuilder();
          }
          if (isSupabaseQuotaBlocked()) return quotaBlockedQueryBuilder();
          return quotaAwareQueryBuilder(target.from(tableName));
        };
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

const missingResponse = async () => ({
  data: null,
  error: new Error("Supabase is not configured."),
});

function missingChannel() {
  const channel = {
    on: () => channel,
    subscribe: (callback) => {
      if (typeof callback === "function") {
        window.setTimeout?.(() => callback("SUBSCRIBED"), 0);
      }
      return channel;
    },
    unsubscribe: async () => ({ error: null }),
    send: async () => ({ error: null }),
    track: async () => ({ error: null }),
    untrack: async () => ({ error: null }),
  };
  return channel;
}

function missingProxy() {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "auth") {
          return {
            getSession: async () => ({
              data: { session: null },
              error: new Error("Supabase is not configured."),
            }),
            getUser: async () => ({
              data: { user: null },
              error: new Error("Supabase is not configured."),
            }),
            signInWithPassword: missingResponse,
            signUp: missingResponse,
            signInWithOAuth: missingResponse,
            signOut: async () => ({
              error: new Error("Supabase is not configured."),
            }),
            onAuthStateChange: (callback) => {
              if (typeof callback === "function") callback("INITIAL_SESSION", null);
              return {
                data: { subscription: { unsubscribe() {} } },
              };
            },
          };
        }
        if (property === "from") return () => createQueryBuilder(missingResponse);
        if (property === "channel") return () => missingChannel();
        if (property === "removeChannel") return async () => ({ error: null });
        if (property === "removeAllChannels") return async () => ({ error: null });
        if (property === "getChannels") return () => [];
        return undefined;
      },
    }
  );
}

const instance = isCloudSupabaseConfigured
  ? createClient(cloudSupabaseUrl, cloudSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const cloudSupabase = instance ? configuredProxy(instance) : missingProxy();
