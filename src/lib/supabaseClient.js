// CLARA Phase 1 Supabase removal bridge.
//
// This file intentionally keeps the old `supabase` export shape so existing
// imports continue to compile while CLARA migrates away from Supabase one phase
// at a time. It does not import @supabase/supabase-js and it does not create
// any remote connection.

export const supabaseUrl = "";
export const supabaseAnonKey = "";
export const isSupabaseConfigured = false;
export const isSupabaseDisabled = true;

const LOCAL_USER = {
  id: "local-clara-user",
  email: "local@clara.app",
  app_metadata: {},
  user_metadata: {
    full_name: "CLARA User",
    name: "CLARA User",
    display_name: "CLARA User",
    role: "user",
    plan_key: "free",
    subscription_label: "Free",
  },
};

const LOCAL_SESSION = {
  access_token: "local-clara-session",
  token_type: "bearer",
  user: LOCAL_USER,
};

const ok = (data = null) => Promise.resolve({ data, error: null });

const emptyListResponse = () => ok([]);
const emptyObjectResponse = () => ok(null);

function createLocalQueryBuilder(tableName = "") {
  const state = {
    tableName: String(tableName || ""),
    operation: "select",
    payload: null,
    expectsSingle: false,
  };

  const builder = {};

  const chain = () => builder;
  const setOperation = (operation) => (payload) => {
    state.operation = operation;
    state.payload = payload ?? null;
    return builder;
  };

  const resolveData = () => {
    if (state.expectsSingle) return null;
    if (["insert", "update", "upsert", "delete"].includes(state.operation)) {
      return null;
    }
    return [];
  };

  const terminal = () => ok(resolveData());

  Object.assign(builder, {
    select: chain,
    insert: setOperation("insert"),
    update: setOperation("update"),
    delete: setOperation("delete"),
    upsert: setOperation("upsert"),
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
    single: () => {
      state.expectsSingle = true;
      return emptyObjectResponse();
    },
    maybeSingle: () => {
      state.expectsSingle = true;
      return emptyObjectResponse();
    },
    csv: emptyListResponse,
    geojson: emptyListResponse,
    explain: emptyListResponse,
    then: (onFulfilled, onRejected) => terminal().then(onFulfilled, onRejected),
    catch: (onRejected) => terminal().catch(onRejected),
    finally: (onFinally) => terminal().finally(onFinally),
  });

  return builder;
}

function createLocalChannel() {
  const channel = {
    on: () => channel,
    subscribe: (callback) => {
      if (typeof callback === "function" && typeof window !== "undefined") {
        window.setTimeout(() => callback("SUBSCRIBED"), 0);
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

function createLocalStorageBucket(bucketName = "local") {
  return {
    upload: async (path) => ({
      data: { path: String(path || "") },
      error: null,
    }),
    remove: async () => ({ data: [], error: null }),
    list: async () => ({ data: [], error: null }),
    getPublicUrl: (path) => ({
      data: {
        publicUrl: String(path || "")
          ? `local://${String(bucketName || "local")}/${String(path || "")}`
          : "",
      },
    }),
  };
}

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    signInWithPassword: async () => ({ data: { session: LOCAL_SESSION, user: LOCAL_USER }, error: null }),
    signUp: async () => ({ data: { session: LOCAL_SESSION, user: LOCAL_USER }, error: null }),
    signInWithOAuth: async () => ({ data: { provider: "local" }, error: null }),
    signOut: async () => ({ error: null }),
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
  },
  from: (tableName) => createLocalQueryBuilder(tableName),
  rpc: async () => ({ data: null, error: null }),
  channel: () => createLocalChannel(),
  removeChannel: async () => ({ error: null }),
  removeAllChannels: async () => ({ error: null }),
  getChannels: () => [],
  storage: {
    from: (bucketName) => createLocalStorageBucket(bucketName),
  },
  functions: {
    invoke: async () => ({ data: null, error: null }),
  },
};
