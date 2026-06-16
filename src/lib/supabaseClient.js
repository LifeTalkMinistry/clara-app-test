import { createClient } from "@supabase/supabase-js";
import { markGooglePlayEntitlementVerified } from "@/lib/google-play-entitlement-refresh";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = import.meta.env["VITE_SUPABASE_" + "ANON_KEY"] || "";

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

const REMOTE_TABLE_ALLOWLIST = new Set(["profiles", "plans", "enrollments"]);
const GOOGLE_PLAY_VERIFY_FUNCTION_PATH = "/functions/v1/verify-google-play-purchase";
const GOOGLE_PLAY_VERIFY_FETCH_OBSERVER_KEY = "__claraGooglePlayVerifyFetchObserverInstalled";

function getFetchUrl(input) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input?.url || "";
}

async function readFetchBody(input, init = {}) {
  if (typeof init?.body === "string") return init.body;

  if (typeof Request !== "undefined" && input instanceof Request) {
    try {
      return await input.clone().text();
    } catch {
      return "";
    }
  }

  return "";
}

function parseJsonSafely(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function installGooglePlayVerifyFetchObserver() {
  if (typeof window === "undefined") return;
  if (typeof window.fetch !== "function") return;
  if (window[GOOGLE_PLAY_VERIFY_FETCH_OBSERVER_KEY]) return;

  const nativeFetch = window.fetch.bind(window);
  window[GOOGLE_PLAY_VERIFY_FETCH_OBSERVER_KEY] = true;

  window.fetch = async (input, init = {}) => {
    const response = await nativeFetch(input, init);

    try {
      const requestUrl = getFetchUrl(input);
      if (!requestUrl.includes(GOOGLE_PLAY_VERIFY_FUNCTION_PATH)) return response;
      if (!response?.ok) return response;

      const data = await response.clone().json().catch(() => null);
      if (!data?.ok) return response;

      const requestPayload = parseJsonSafely(await readFetchBody(input, init)) || {};

      markGooglePlayEntitlementVerified({
        userId: requestPayload.user_id,
        purchaseToken: requestPayload.purchase_token,
        status:
          data?.status ||
          data?.subscription_status ||
          data?.entitlement_status ||
          "active",
        plan: data?.canonical_plan || data?.plan_key || requestPayload.plan_key || "committed_249",
      });
    } catch (error) {
      console.warn("[CLARA Billing] verified purchase refresh observer skipped", error);
    }

    return response;
  };
}

installGooglePlayVerifyFetchObserver();

let supabaseInstance = null;

if (isSupabaseConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
} else {
  console.error("Supabase is not configured. Missing URL or anon key.");
}

const createLocalOnlyResponse = async (terminal = "select") => {
  if (terminal === "single") return { data: null, error: null };
  if (terminal === "maybeSingle") return { data: null, error: null };
  if (terminal === "csv") return { data: "", error: null };
  if (terminal === "geojson") return { data: null, error: null };
  return { data: [], error: null };
};

const createLocalOnlyQueryBuilder = () => {
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
    single: () => createLocalOnlyResponse("single"),
    maybeSingle: () => createLocalOnlyResponse("maybeSingle"),
    csv: () => createLocalOnlyResponse("csv"),
    geojson: () => createLocalOnlyResponse("geojson"),
    explain: () => createLocalOnlyResponse("explain"),
    then: (onFulfilled, onRejected) =>
      createLocalOnlyResponse("select").then(onFulfilled, onRejected),
    catch: (onRejected) => createLocalOnlyResponse("select").catch(onRejected),
    finally: (onFinally) => createLocalOnlyResponse("select").finally(onFinally),
  });

  return builder;
};

const createConfiguredSupabaseProxy = (client) =>
  new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (tableName) => {
          const normalizedTableName = String(tableName || "").toLowerCase();

          if (!REMOTE_TABLE_ALLOWLIST.has(normalizedTableName)) {
            return createLocalOnlyQueryBuilder();
          }

          return target.from(tableName);
        };
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

const missingConfigResponse = async () => ({
  data: null,
  error: new Error("Supabase is not configured."),
});

const createMissingConfigQueryBuilder = () => {
  const builder = {};
  const chain = () => builder;
  const terminal = () => missingConfigResponse();

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
    single: terminal,
    maybeSingle: terminal,
    csv: terminal,
    geojson: terminal,
    explain: terminal,
    then: (onFulfilled, onRejected) => terminal().then(onFulfilled, onRejected),
    catch: (onRejected) => terminal().catch(onRejected),
    finally: (onFinally) => terminal().finally(onFinally),
  });

  return builder;
};

const createMissingConfigChannel = () => {
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
};

const createMissingConfigProxy = () =>
  new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "auth") {
          const notConfigured = async () => ({
            data: null,
            error: new Error("Supabase is not configured."),
          });

          return {
            getSession: async () => ({
              data: { session: null },
              error: new Error("Supabase is not configured."),
            }),
            getUser: async () => ({
              data: { user: null },
              error: new Error("Supabase is not configured."),
            }),
            signInWithPassword: notConfigured,
            signUp: notConfigured,
            signInWithOAuth: notConfigured,
            signOut: async () => ({
              error: new Error("Supabase is not configured."),
            }),
            onAuthStateChange: (callback) => {
              if (typeof callback === "function") {
                callback("INITIAL_SESSION", null);
              }

              return {
                data: {
                  subscription: {
                    unsubscribe: () => {},
                  },
                },
              };
            },
          };
        }

        if (prop === "from") {
          return () => createMissingConfigQueryBuilder();
        }

        if (prop === "channel") {
          return () => createMissingConfigChannel();
        }

        if (prop === "removeChannel") {
          return async () => ({ error: null });
        }

        if (prop === "removeAllChannels") {
          return async () => ({ error: null });
        }

        if (prop === "getChannels") {
          return () => [];
        }

        return undefined;
      },
    }
  );

export const supabase = supabaseInstance
  ? createConfiguredSupabaseProxy(supabaseInstance)
  : createMissingConfigProxy();
