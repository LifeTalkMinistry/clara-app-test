import {
  buildLocalAuthUser,
  getOrCreateLocalVaultId,
} from "@/lib/local-user-identity";
import {
  buildLocalMembershipProfile,
  getLocalAccountProfile,
  saveLocalAccountProfile,
} from "@/lib/local-profile-repository";
import { migrateLocalVaultOwnership } from "@/lib/local-vault-migration";
import { saveAccessSnapshot } from "@/lib/offline-access-cache";

const LOCAL_PLAN = Object.freeze({
  id: "local-committed-249",
  key: "committed_249",
  plan_key: "committed_249",
  name: "Committed",
  description:
    "Complete CLARA financial system and accountability experience.",
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

const localUserId = getOrCreateLocalVaultId();
let state = null;

function forceFreeCompatibilityProfile(profile = {}) {
  return {
    ...profile,
    plan: "free",
    plan_key: "free",
    subscription_plan: "free",
    access_level: "free",
    subscription_status: "free",
    subscription_label: "Free Version",
    account_status: "inactive",
    membership_source: "backend_required",
    entitlement_status: "free",
    enrollment_status: "none",
    activation_status: "not_required",
    status: "inactive",
    is_activated: false,
    is_enrolled: false,
    program_active: false,
    has_pro_access: false,
    has_program_access: false,
    isPro: false,
  };
}

function buildState() {
  const account = getLocalAccountProfile(localUserId);
  const user = buildLocalAuthUser(localUserId, account);
  const profile = forceFreeCompatibilityProfile(
    buildLocalMembershipProfile(user, account, {})
  );

  return {
    user,
    profile,
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

function refreshState() {
  state = buildState();
  saveAccessSnapshot({
    user: state.user,
    profile: state.profile,
    enrollment: null,
    accessState: {
      role: "user",
      plan: "free",
      membershipSource: "backend_required",
    },
    flow: "normal",
    currentPath: "/dashboard",
  });
  return state;
}

refreshState();

const ready = (async () => {
  const migration = await migrateLocalVaultOwnership(localUserId);
  const legacyId = String(migration?.fromUserId || "").trim();

  if (legacyId && legacyId !== localUserId) {
    const legacyProfile = getLocalAccountProfile(legacyId);
    const currentProfile = getLocalAccountProfile(localUserId);
    const legacyHasProfile =
      legacyProfile?.full_name !== "CLARA User" ||
      Boolean(legacyProfile?.clara_life_setup);
    const currentHasProfile =
      currentProfile?.full_name !== "CLARA User" ||
      Boolean(currentProfile?.clara_life_setup);

    if (legacyHasProfile && !currentHasProfile) {
      saveLocalAccountProfile(localUserId, {
        ...legacyProfile,
        id: localUserId,
        email: null,
      });
    }
  }

  console.info("[CLARA Runtime] local compatibility facade ready", {
    migrationStatus: migration?.status || "unknown",
  });
  return refreshState();
})().catch((error) => {
  console.error("[CLARA Runtime] local facade initialization failed", error);
  return refreshState();
});

function rowsFor(tableName) {
  const current = refreshState();
  if (tableName === "plans") return [{ ...LOCAL_PLAN }];
  if (tableName === "profiles") return [{ ...current.profile }];
  if (tableName === "enrollments") return [];
  return [];
}

function createQuery(tableName) {
  let operation = "select";
  let payload = null;
  let limit = null;
  const filters = [];
  const query = {};

  const execute = async (terminal = "select") => {
    await ready;
    if (
      tableName === "profiles" &&
      ["insert", "update", "upsert"].includes(operation)
    ) {
      const patch = Array.isArray(payload) ? payload[0] : payload;
      if (patch && typeof patch === "object") {
        const {
          plan: _plan,
          plan_key: _planKey,
          subscription_plan: _subscriptionPlan,
          access_level: _accessLevel,
          subscription_status: _subscriptionStatus,
          entitlement_status: _entitlementStatus,
          activation_status: _activationStatus,
          is_activated: _isActivated,
          is_enrolled: _isEnrolled,
          program_active: _programActive,
          isPro: _isPro,
          ...safePatch
        } = patch;
        saveLocalAccountProfile(localUserId, {
          ...safePatch,
          id: localUserId,
          email: null,
        });
      }
    }

    let rows = rowsFor(tableName);
    for (const filter of filters) {
      if (filter.type === "eq") {
        rows = rows.filter(
          (row) => row?.[filter.column] === filter.value
        );
      } else if (filter.type === "in") {
        rows = rows.filter((row) =>
          filter.values.includes(row?.[filter.column])
        );
      }
    }
    if (Number.isInteger(limit)) rows = rows.slice(0, limit);

    if (terminal === "single") {
      return rows.length === 1
        ? { data: rows[0], error: null }
        : {
            data: rows[0] || null,
            error: new Error("Local row not found."),
          };
    }
    if (terminal === "maybeSingle") {
      return { data: rows[0] || null, error: null };
    }
    if (terminal === "csv") return { data: "", error: null };
    if (terminal === "geojson") return { data: null, error: null };
    return { data: rows, error: null };
  };

  const chain = () => query;
  Object.assign(query, {
    select: chain,
    insert(value) {
      operation = "insert";
      payload = value;
      return query;
    },
    update(value) {
      operation = "update";
      payload = value;
      return query;
    },
    upsert(value) {
      operation = "upsert";
      payload = value;
      return query;
    },
    delete() {
      operation = "delete";
      return query;
    },
    eq(column, value) {
      filters.push({ type: "eq", column, value });
      return query;
    },
    in(column, values) {
      filters.push({ type: "in", column, values: values || [] });
      return query;
    },
    limit(value) {
      limit = Number(value);
      return query;
    },
    neq: chain,
    gt: chain,
    gte: chain,
    lt: chain,
    lte: chain,
    is: chain,
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
    range: chain,
    abortSignal: chain,
    throwOnError: chain,
    rollback: chain,
    returns: chain,
    single: () => execute("single"),
    maybeSingle: () => execute("maybeSingle"),
    csv: () => execute("csv"),
    geojson: () => execute("geojson"),
    explain: () => execute("select"),
    then: (resolve, reject) => execute().then(resolve, reject),
    catch: (reject) => execute().catch(reject),
    finally: (handler) => execute().finally(handler),
  });
  return query;
}

function createChannel() {
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

const accountError = () =>
  new Error("Use your CLARA backend account to sign in.");

export function createLocalSupabaseFacade() {
  return {
    auth: {
      async getSession() {
        const current = await ready;
        return { data: { session: current.session }, error: null };
      },
      async getUser() {
        const current = await ready;
        return { data: { user: current.user }, error: null };
      },
      async refreshSession() {
        const current = refreshState();
        return {
          data: { session: current.session, user: current.user },
          error: null,
        };
      },
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: null, error: accountError() }),
      signUp: async () => ({ data: null, error: accountError() }),
      signInWithOAuth: async () => ({ data: null, error: accountError() }),
      onAuthStateChange(callback) {
        let active = true;
        ready.then((current) => {
          if (active && typeof callback === "function") {
            callback("INITIAL_SESSION", current.session);
          }
        });
        return {
          data: {
            subscription: {
              unsubscribe() {
                active = false;
              },
            },
          },
        };
      },
    },
    from: (tableName) =>
      createQuery(String(tableName || "").toLowerCase()),
    channel: () => createChannel(),
    removeChannel: async () => ({ error: null }),
    removeAllChannels: async () => ({ error: null }),
    getChannels: () => [],
    functions: {
      invoke: async () => ({
        data: null,
        error: new Error(
          "Online functions are unavailable in local compatibility mode."
        ),
      }),
    },
  };
}
