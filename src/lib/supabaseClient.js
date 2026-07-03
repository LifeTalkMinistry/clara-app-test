import { createClient } from "@supabase/supabase-js";
import { isLocalBetaMode } from "@/lib/clara-runtime-mode";
import {
  buildLocalAuthUser,
  getOrCreateLocalVaultId,
} from "@/lib/local-user-identity";
import {
  buildLocalMembershipProfile,
  getLocalAccountProfile,
  saveLocalAccountProfile,
} from "@/lib/local-profile-repository";
import {
  deriveLocalMembershipProfile,
  getLocalGooglePlayEntitlement,
  saveLocalGooglePlayEntitlement,
  toLocalEnrollment,
} from "@/lib/local-google-play-entitlement";
import { migrateLocalVaultOwnership } from "@/lib/local-vault-migration";
import { saveAccessSnapshot } from "@/lib/offline-access-cache";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey =
  import.meta.env["VITE_SUPABASE_" + "ANON_KEY"] || "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const LOCAL_COMMITTED_PLAN = Object.freeze({
  id: "local-committed-249",
  key: "committed_249",
  plan_key: "committed_249",
  name: "Committed",
  description: "Complete CLARA financial system and accountability experience.",
  price: 249,
  active: true,
  popular: true,
  sort_order: 1,
  product_id: "clara_commitment_249",
  cta_label: "Start Your Commitment — ₱249/month",
  features: [
    "Complete CLARA financial system",
    "Full AI guidance and decision support",
    "Me, Schedule, Learning Hub, and committed features",
    "Renews monthly through Google Play",
  ],
});

function safeParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getInitialLocalUserId() {
  const permanentId = getOrCreateLocalVaultId();
  if (typeof window === "undefined") return permanentId;

  const snapshot = safeParse(
    window.localStorage.getItem("clara_access_snapshot_v2:last")
  );
  return (
    String(snapshot?.userId || "").trim() ||
    String(window.localStorage.getItem("clara_active_memory_user_id") || "").trim() ||
    permanentId
  );
}

function buildLocalRuntimeState(localUserId) {
  const localProfile = getLocalAccountProfile(localUserId);
  const user = buildLocalAuthUser(localUserId, localProfile);
  const entitlement = getLocalGooglePlayEntitlement(localUserId);
  const profile = buildLocalMembershipProfile(
    user,
    localProfile,
    deriveLocalMembershipProfile(entitlement)
  );

  return {
    localUserId,
    user,
    profile,
    entitlement,
    session: {
      access_token: null,
      refresh_token: null,
      token_type: "local",
      expires_at: null,
      user,
      is_local_session: true,
    },
  };
}

let localRuntimeState = buildLocalRuntimeState(getInitialLocalUserId());

function saveLocalRuntimeSnapshot(state) {
  saveAccessSnapshot({
    user: state.user,
    profile: state.profile,
    role: state.profile.role,
    plan: state.profile.plan,
    planLabel: state.profile.subscription_label,
    subscriptionStatus: state.profile.subscription_status,
    accessStatus: state.profile.status,
    onboardingCompleted:
      state.profile.onboarding_completed ||
      state.profile.has_completed_universal_onboarding,
    programOnboardingCompleted:
      state.profile.program_onboarding_completed ||
      state.profile.has_completed_program_onboarding,
    lastResolvedAppFlow: "normal",
    lastValidRoute: "/dashboard",
  });
}

saveLocalRuntimeSnapshot(localRuntimeState);

const localRuntimeReady = (async () => {
  const permanentId = getOrCreateLocalVaultId();
  const previousId = localRuntimeState.localUserId;
  const migration = await migrateLocalVaultOwnership(permanentId);
  const activeId = migration?.activeUserId || permanentId;

  if (activeId !== previousId) {
    const previousProfile = getLocalAccountProfile(previousId);
    const previousEntitlement = getLocalGooglePlayEntitlement(previousId);
    const targetEntitlement = getLocalGooglePlayEntitlement(activeId);

    if (
      previousProfile?.full_name !== "CLARA User" ||
      previousProfile?.clara_life_setup
    ) {
      saveLocalAccountProfile(activeId, previousProfile);
    }

    if (
      targetEntitlement?.state === "inactive" &&
      previousEntitlement?.state !== "inactive"
    ) {
      saveLocalGooglePlayEntitlement(activeId, {
        ...previousEntitlement,
        localUserId: activeId,
      });
    }
  }

  localRuntimeState = buildLocalRuntimeState(activeId);
  saveLocalRuntimeSnapshot(localRuntimeState);
  console.info("[CLARA Runtime] local compatibility facade ready", {
    localUserId: activeId,
  });
  return localRuntimeState;
})().catch((error) => {
  console.error("[CLARA Runtime] local initialization failed", error);
  return localRuntimeState;
});

function refreshLocalRuntimeState() {
  localRuntimeState = buildLocalRuntimeState(localRuntimeState.localUserId);
  saveLocalRuntimeSnapshot(localRuntimeState);
  return localRuntimeState;
}

function applyFilters(rows, filters) {
  return filters.reduce((result, filter) => {
    if (filter.type === "eq") {
      return result.filter((row) => row?.[filter.column] === filter.value);
    }
    if (filter.type === "in") {
      return result.filter((row) => filter.values.includes(row?.[filter.column]));
    }
    return result;
  }, rows);
}

function getLocalRows(tableName) {
  const state = refreshLocalRuntimeState();

  if (tableName === "plans") return [{ ...LOCAL_COMMITTED_PLAN }];
  if (tableName === "profiles") return [{ ...state.profile }];
  if (tableName === "enrollments") {
    const enrollment = toLocalEnrollment(state.entitlement);
    return enrollment ? [enrollment] : [];
  }
  return [];
}

function createLocalQueryBuilder(tableName) {
  let operation = "select";
  let payload = null;
  let filters = [];
  let limitValue = null;

  const execute = async (terminal = "select") => {
    await localRuntimeReady;

    if (
      tableName === "profiles" &&
      ["insert", "upsert", "update"].includes(operation)
    ) {
      const patch = Array.isArray(payload) ? payload[0] : payload;
      if (patch && typeof patch === "object") {
        saveLocalAccountProfile(localRuntimeState.localUserId, patch);
        refreshLocalRuntimeState();
      }
    }

    let rows = applyFilters(getLocalRows(tableName), filters);
    if (Number.isInteger(limitValue)) rows = rows.slice(0, limitValue);

    if (terminal === "single") {
      if (rows.length !== 1) {
        return {
          data: rows[0] || null,
          error:
            rows.length === 0
              ? new Error("No local row found.")
              : new Error("Multiple local rows found."),
        };
      }
      return { data: rows[0], error: null };
    }

    if (terminal === "maybeSingle") {
      return { data: rows[0] || null, error: null };
    }

    if (terminal === "csv") return { data: "", error: null };
    if (terminal === "geojson") return { data: null, error: null };
    return { data: rows, error: null };
  };

  const builder = {
    select() {
      if (operation === "select") operation = "select";
      return builder;
    },
    insert(value) {
      operation = "insert";
      payload = value;
      return builder;
    },
    upsert(value) {
      operation = "upsert";
      payload = value;
      return builder;
    },
    update(value) {
      operation = "update";
      payload = value;
      return builder;
    },
    delete() {
      operation = "delete";
      return builder;
    },
    eq(column, value) {
      filters.push({ type: "eq", column, value });
      return builder;
    },
    in(column, values) {
      filters.push({ type: "in", column, values: values || [] });
      return builder;
    },
    neq() {
      return builder;
    },
    gt() {
      return builder;
    },
    gte() {
      return builder;
    },
    lt() {
      return builder;
    },
    lte() {
      return builder;
    },
    is() {
      return builder;
    },
    contains() {
      return builder;
    },
    containedBy() {
      return builder;
    },
    overlaps() {
      return builder;
    },
    like() {
      return builder;
    },
    ilike() {
      return builder;
    },
    match() {
      return builder;
    },
    not() {
      return builder;
    },
    or() {
      return builder;
    },
    filter() {
      return builder;
    },
    order() {
      return builder;
    },
    limit(value) {
      limitValue = Number(value);
      return builder;
    },
    range() {
      return builder;
    },
    abortSignal() {
      return builder;
    },
    throwOnError() {
      return builder;
    },
    rollback() {
      return builder;
    },
    returns() {
      return builder;
    },
    single: () => execute("single"),
    maybeSingle: () => execute("maybeSingle"),
    csv: () => execute("csv"),
    geojson: () => execute("geojson"),
    explain: () => execute("select"),
    then: (onFulfilled, onRejected) =>
      execute("select").then(onFulfilled, onRejected),
    catch: (onRejected) => execute("select").catch(onRejected),
    finally: (onFinally) => execute("select").finally(onFinally),
  };

  return builder;
}

function createLocalChannel() {
  const channel = {
    on: () => channel,
    subscribe: (callback) => {
      if (typeof callback === "function") {
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

function createLocalSupabaseFacade() {
  return {
    auth: {
      async getSession() {
        const state = await localRuntimeReady;
        return { data: { session: state.session }, error: null };
      },
      async getUser() {
        const state = await localRuntimeReady;
        return { data: { user: state.user }, error: null };
      },
      async refreshSession() {
        const state = await localRuntimeReady;
        return { data: { session: state.session, user: state.user }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async signInWithPassword() {
        return {
          data: null,
          error: new Error("Accounts are disabled in the CLARA local beta."),
        };
      },
      async signUp() {
        return {
          data: null,
          error: new Error("Accounts are disabled in the CLARA local beta."),
        };
      },
      async signInWithOAuth() {
        return {
          data: null,
          error: new Error("Accounts are disabled in the CLARA local beta."),
        };
      },
      onAuthStateChange(callback) {
        let cancelled = false;
        localRuntimeReady.then((state) => {
          if (!cancelled && typeof callback === "function") {
            callback("INITIAL_SESSION", state.session);
          }
        });
        return {
          data: {
            subscription: {
              unsubscribe() {
                cancelled = true;
              },
            },
          },
        };
      },
    },
    from(tableName) {
      return createLocalQueryBuilder(String(tableName || "").toLowerCase());
    },
    channel() {
      return createLocalChannel();
    },
    async removeChannel() {
      return { error: null };
    },
    async removeAllChannels() {
      return { error: null };
    },
    getChannels() {
      return [];
    },
    functions: {
      async invoke() {
        return {
          data: null,
          error: new Error(
            "Remote functions are unavailable in the CLARA local beta."
          ),
        };
      },
    },
  };
}

function createMissingConfigFacade() {
  const error = () => new Error("Supabase is not configured.");
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: error() }),
      getUser: async () => ({ data: { user: null }, error: error() }),
      refreshSession: async () => ({ data: { session: null }, error: error() }),
      signInWithPassword: async () => ({ data: null, error: error() }),
      signUp: async () => ({ data: null, error: error() }),
      signInWithOAuth: async () => ({ data: null, error: error() }),
      signOut: async () => ({ error: error() }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe() {} } },
      }),
    },
    from: () => createLocalQueryBuilder("missing"),
    channel: () => createLocalChannel(),
    removeChannel: async () => ({ error: null }),
    removeAllChannels: async () => ({ error: null }),
    getChannels: () => [],
    functions: {
      invoke: async () => ({ data: null, error: error() }),
    },
  };
}

const cloudClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const supabase = isLocalBetaMode()
  ? createLocalSupabaseFacade()
  : cloudClient || createMissingConfigFacade();
