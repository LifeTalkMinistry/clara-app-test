import { createClient } from "@supabase/supabase-js";
import {
  createNoopRealtimeChannel,
  isRealtimeSuspended,
  recordRealtimeStatus,
  wrapRealtimeChannel,
} from "./claraRealtimeGuard";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = import.meta.env["VITE_SUPABASE_" + "ANON_KEY"] || "";

export const isSupabaseConfigured = Boolean(supabaseUrl) && Boolean(supabaseAnonKey);

let supabaseInstance = null;

if (isSupabaseConfigured) {
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      timeout: 10_000,
      heartbeatIntervalMs: 30_000,
      reconnectAfterMs: (tries) => {
        if (isRealtimeSuspended()) return 10 * 60_000;
        if (tries >= 2) {
          recordRealtimeStatus("TIMED_OUT", { channel: "supabase-reconnect-backoff" });
          return 10 * 60_000;
        }
        return Math.min(30_000, 1_000 * Math.pow(2, tries));
      },
    },
  });
} else {
  console.error("Supabase is not configured. Missing URL or anon key.");
}

const normalizeString = (value) => String(value ?? "").trim();

const getExpenseCategoryFallback = (payload) =>
  normalizeString(
    payload?.category ||
      payload?.expense_category ||
      payload?.budget_category ||
      payload?.classification ||
      payload?.type ||
      "other"
  ).toLowerCase() || "other";

const normalizeExpenseWriteRow = (row) => {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;

  const nextRow = { ...row };

  if (!normalizeString(nextRow.category) && normalizeString(nextRow.expense_category)) {
    nextRow.category = getExpenseCategoryFallback(nextRow);
  }

  delete nextRow.expense_category;

  return nextRow;
};

const normalizeExpenseWritePayload = (payload) => {
  if (Array.isArray(payload)) {
    return payload.map((row) => normalizeExpenseWriteRow(row));
  }

  return normalizeExpenseWriteRow(payload);
};

const createExpenseTableProxy = (tableBuilder) =>
  new Proxy(tableBuilder, {
    get(target, prop, receiver) {
      if (["insert", "update", "upsert"].includes(prop)) {
        return (payload, options) =>
          Reflect.get(target, prop, target).call(
            target,
            normalizeExpenseWritePayload(payload),
            options
          );
      }

      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });

const createConfiguredSupabaseProxy = (client) =>
  new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "from") {
        return (tableName) => {
          const tableBuilder = target.from(tableName);
          return String(tableName || "").toLowerCase() === "expenses"
            ? createExpenseTableProxy(tableBuilder)
            : tableBuilder;
        };
      }

      if (prop === "channel") {
        return (channelName, options) => {
          if (isRealtimeSuspended()) return createNoopRealtimeChannel(channelName);
          const channel = target.channel(channelName, options);
          return wrapRealtimeChannel(channel, channelName);
        };
      }

      if (prop === "removeChannel") {
        return async (channel) => {
          if (!channel || channel.__claraNoopRealtime) return { error: null };
          return target.removeChannel(channel);
        };
      }

      if (prop === "removeAllChannels") {
        return async () => {
          try {
            return await target.removeAllChannels();
          } catch {
            return { error: null };
          }
        };
      }

      if (prop === "getChannels") {
        return () => {
          try {
            return target.getChannels();
          } catch {
            return [];
          }
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

const createMissingConfigChannel = () => createNoopRealtimeChannel("supabase-not-configured");

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
