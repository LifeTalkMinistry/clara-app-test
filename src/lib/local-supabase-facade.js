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
import { getStoredBackendUser } from "@/lib/clara-backend-client";
import { updateCurrentBackendProfile } from "@/lib/profile-backend-client";

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

const LOCAL_COMPAT_TABLES = new Set([
  "user_task_reminder_settings",
  "user_task_reminder_states",
]);
const LOCAL_COMPAT_TABLE_PREFIX = "clara_local_compat_table_v1:";

let state = null;

function currentLocalUserId() {
  return getOrCreateLocalVaultId();
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage || null;
  } catch {
    return null;
  }
}

function compatTableStorageKey(tableName, localUserId = currentLocalUserId()) {
  return `${LOCAL_COMPAT_TABLE_PREFIX}${localUserId}:${tableName}`;
}

function readCompatRows(tableName, localUserId = currentLocalUserId()) {
  if (!LOCAL_COMPAT_TABLES.has(tableName)) return [];
  try {
    const raw = getStorage()?.getItem(compatTableStorageKey(tableName, localUserId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompatRows(tableName, rows, localUserId = currentLocalUserId()) {
  if (!LOCAL_COMPAT_TABLES.has(tableName)) return;
  try {
    getStorage()?.setItem(
      compatTableStorageKey(tableName, localUserId),
      JSON.stringify(Array.isArray(rows) ? rows : [])
    );
  } catch {
    // Compatibility persistence must never prevent the main local app from opening.
  }
}

function createCompatRowId() {
  if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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
  const localUserId = currentLocalUserId();
  const account = getLocalAccountProfile(localUserId);
  const localIdentity = buildLocalAuthUser(localUserId, account);
  const backendUser = getStoredBackendUser();
  const displayName = String(
    backendUser?.name || localIdentity.display_name || "CLARA User"
  ).trim() || "CLARA User";
  const role = String(backendUser?.role || localIdentity.role || "user")
    .trim()
    .toLowerCase() || "user";
  const email = backendUser?.email || null;
  const accountId = backendUser?.id != null ? String(backendUser.id) : null;

  const user = {
    ...localIdentity,
    email,
    role,
    display_name: displayName,
    full_name: displayName,
    account_id: accountId,
    server_user_id: accountId,
    local_vault_id: localUserId,
    is_local_user: !backendUser,
    user_metadata: {
      ...localIdentity.user_metadata,
      full_name: displayName,
      name: displayName,
      display_name: displayName,
      role,
      ...(accountId ? { account_id: accountId } : {}),
    },
  };

  const profile = {
    ...forceFreeCompatibilityProfile(
      buildLocalMembershipProfile(user, account, {})
    ),
    id: localUserId,
    email,
    role,
    display_name: displayName,
    full_name: displayName,
    account_id: accountId,
    local_vault_id: localUserId,
  };

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
      role: state.profile.role || "user",
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
  const startupLocalUserId = currentLocalUserId();
  const migration = await migrateLocalVaultOwnership(startupLocalUserId);
  const legacyId = String(migration?.fromUserId || "").trim();

  if (legacyId && legacyId !== startupLocalUserId) {
    const legacyProfile = getLocalAccountProfile(legacyId);
    const currentProfile = getLocalAccountProfile(startupLocalUserId);
    const legacyHasProfile =
      legacyProfile?.full_name !== "CLARA User" ||
      Boolean(legacyProfile?.clara_life_setup);
    const currentHasProfile =
      currentProfile?.full_name !== "CLARA User" ||
      Boolean(currentProfile?.clara_life_setup);

    if (legacyHasProfile && !currentHasProfile) {
      saveLocalAccountProfile(startupLocalUserId, {
        ...legacyProfile,
        id: startupLocalUserId,
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

function rowsFor(tableName, localUserId = currentLocalUserId()) {
  const current = refreshState();
  if (tableName === "plans") return [{ ...LOCAL_PLAN }];
  if (tableName === "profiles") return [{ ...current.profile }];
  if (tableName === "enrollments") return [];
  if (LOCAL_COMPAT_TABLES.has(tableName)) {
    return readCompatRows(tableName, localUserId);
  }
  return [];
}

function matchesFilter(row, filter) {
  if (filter.type === "eq") return row?.[filter.column] === filter.value;
  if (filter.type === "in") return filter.values.includes(row?.[filter.column]);
  if (filter.type === "is") return row?.[filter.column] === filter.value;
  return true;
}

function applyFilters(rows, filters) {
  return rows.filter((row) => filters.every((filter) => matchesFilter(row, filter)));
}

function normalizeMutationRows(value) {
  if (Array.isArray(value)) return value.filter((row) => row && typeof row === "object");
  return value && typeof value === "object" ? [value] : [];
}

function createQuery(tableName) {
  let operation = "select";
  let payload = null;
  let limit = null;
  let conflictColumns = [];
  const filters = [];
  const query = {};

  const execute = async (terminal = "select") => {
    await ready;
    const localUserId = currentLocalUserId();
    let mutationRows = null;

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
          role: _role,
          account_id: _accountId,
          server_user_id: _serverUserId,
          local_vault_id: _localVaultId,
          email: _email,
          ...safePatch
        } = patch;
        const saved = saveLocalAccountProfile(localUserId, {
          ...safePatch,
          id: localUserId,
          email: null,
        });
        mutationRows = [{ ...refreshState().profile, ...saved }];
      }
    }

    if (LOCAL_COMPAT_TABLES.has(tableName)) {
      let storedRows = readCompatRows(tableName, localUserId);
      const incomingRows = normalizeMutationRows(payload);

      if (operation === "insert") {
        mutationRows = incomingRows.map((row) => ({
          id: row.id || createCompatRowId(),
          created_at: row.created_at || new Date().toISOString(),
          ...row,
        }));
        storedRows = [...storedRows, ...mutationRows];
        writeCompatRows(tableName, storedRows, localUserId);
      } else if (operation === "upsert") {
        const keys = conflictColumns.length ? conflictColumns : ["id"];
        mutationRows = incomingRows.map((row) => {
          const existingIndex = storedRows.findIndex((candidate) =>
            keys.every((key) => candidate?.[key] === row?.[key])
          );
          const nextRow = {
            ...(existingIndex >= 0 ? storedRows[existingIndex] : {}),
            id:
              row.id ||
              (existingIndex >= 0 ? storedRows[existingIndex]?.id : null) ||
              createCompatRowId(),
            created_at:
              row.created_at ||
              (existingIndex >= 0 ? storedRows[existingIndex]?.created_at : null) ||
              new Date().toISOString(),
            ...row,
          };
          if (existingIndex >= 0) storedRows[existingIndex] = nextRow;
          else storedRows.push(nextRow);
          return nextRow;
        });
        writeCompatRows(tableName, storedRows, localUserId);
      } else if (operation === "update") {
        const targetRows = applyFilters(storedRows, filters);
        const targetIds = new Set(targetRows.map((row) => row.id));
        storedRows = storedRows.map((row) =>
          targetIds.has(row.id) ? { ...row, ...(payload || {}) } : row
        );
        mutationRows = storedRows.filter((row) => targetIds.has(row.id));
        writeCompatRows(tableName, storedRows, localUserId);
      } else if (operation === "delete") {
        const targetRows = applyFilters(storedRows, filters);
        const targetIds = new Set(targetRows.map((row) => row.id));
        storedRows = storedRows.filter((row) => !targetIds.has(row.id));
        mutationRows = targetRows;
        writeCompatRows(tableName, storedRows, localUserId);
      }
    }

    let rows = mutationRows || rowsFor(tableName, localUserId);
    if (!mutationRows) rows = applyFilters(rows, filters);
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
    upsert(value, options = {}) {
      operation = "upsert";
      payload = value;
      conflictColumns = String(options?.onConflict || "")
        .split(",")
        .map((column) => column.trim())
        .filter(Boolean);
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
    is(column, value) {
      filters.push({ type: "is", column, value });
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
        return { data: { session: refreshState().session || current.session }, error: null };
      },
      async getUser() {
        await ready;
        return { data: { user: refreshState().user }, error: null };
      },
      async refreshSession() {
        const current = refreshState();
        return {
          data: { session: current.session, user: current.user },
          error: null,
        };
      },
      async updateUser({ data } = {}) {
        const name = String(
          data?.full_name || data?.name || data?.display_name || ""
        ).trim();
        const updated = await updateCurrentBackendProfile({ name });
        const localUserId = currentLocalUserId();
        saveLocalAccountProfile(localUserId, {
          full_name: updated.name,
          display_name: updated.name,
        });
        const current = refreshState();
        return {
          data: {
            user: {
              ...current.user,
              full_name: updated.name,
              display_name: updated.name,
              user_metadata: {
                ...current.user.user_metadata,
                full_name: updated.name,
                name: updated.name,
                display_name: updated.name,
              },
            },
          },
          error: null,
        };
      },
      signOut: async () => ({ error: null }),
      signInWithPassword: async () => ({ data: null, error: accountError() }),
      signUp: async () => ({ data: null, error: accountError() }),
      signInWithOAuth: async () => ({ data: null, error: accountError() }),
      onAuthStateChange(callback) {
        let active = true;
        ready.then(() => {
          if (active && typeof callback === "function") {
            callback("INITIAL_SESSION", refreshState().session);
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
  };
}
