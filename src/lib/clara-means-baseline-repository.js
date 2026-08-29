import {
  LOCAL_FINANCE_STORES,
  getLocalRecordById,
  upsertLocalRecord,
} from "@/lib/localFinanceStore";
import {
  legacyMeansCycleBaselineV6StorageKey,
  meansCycleBaselineStorageKey,
  parseMeansBaseline,
} from "@/lib/clara-means-cycle-baseline";

const STORE_NAME = LOCAL_FINANCE_STORES.privatePreferences;
const RECORD_KIND = "means_cycle_baseline";
const RECORD_VERSION = 1;

const clean = (value) => String(value ?? "").trim();
const dateKey = (value) => clean(value).slice(0, 10);

function recordId(cycleStart, cycleEnd) {
  return `means-cycle-baseline:${dateKey(cycleStart)}:${dateKey(cycleEnd)}`;
}

function readLocalStorageKey(key) {
  if (typeof window === "undefined" || !window.localStorage || !key) return null;
  try {
    return parseMeansBaseline(window.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function readLegacyLocalStorage(owner, cycleStart, cycleEnd) {
  const v7 = readLocalStorageKey(
    meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd)
  );
  if (v7) return v7;

  // Preserve the old active-cycle evidence. V6 cannot be silently reinterpreted as
  // a V7 Cycle 100 Anchor because its requiredRunway was adaptive.
  return readLocalStorageKey(
    legacyMeansCycleBaselineV6StorageKey(owner, cycleStart, cycleEnd)
  );
}

function writeLegacyCache(owner, cycleStart, cycleEnd, baseline) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      meansCycleBaselineStorageKey(owner, cycleStart, cycleEnd),
      JSON.stringify(baseline)
    );
  } catch {
    // IndexedDB remains authoritative. This is only a compatibility cache.
  }
}

export async function readMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
} = {}) {
  const localUserId = clean(owner);
  const start = dateKey(cycleStart);
  const end = dateKey(cycleEnd);
  if (!localUserId || !start || !end) return null;

  try {
    const record = await getLocalRecordById(
      STORE_NAME,
      recordId(start, end),
      localUserId
    );
    const durable = parseMeansBaseline(record?.baseline);
    if (durable) return durable;
  } catch {
    // Fall through to localStorage so Means remains usable if IndexedDB is unavailable.
  }

  const legacy = readLegacyLocalStorage(localUserId, start, end);
  if (!legacy) return null;

  // Promote the exact baseline object without changing its schema/version. If this is V6,
  // the V7 authority will explicitly report migration_unresolved rather than fabricating
  // an immutable anchor from the old adaptive denominator.
  try {
    await persistMeansCycleBaseline({
      owner: localUserId,
      cycleStart: start,
      cycleEnd: end,
      baseline: legacy,
    });
  } catch {
    // The local value still protects the current browser until durable storage returns.
  }

  return legacy;
}

export async function persistMeansCycleBaseline({
  owner,
  cycleStart,
  cycleEnd,
  baseline,
} = {}) {
  const localUserId = clean(owner);
  const start = dateKey(cycleStart);
  const end = dateKey(cycleEnd);
  const parsedBaseline = parseMeansBaseline(baseline);
  if (!localUserId || !start || !end || !parsedBaseline) return null;

  const record = {
    id: recordId(start, end),
    kind: RECORD_KIND,
    recordKind: RECORD_KIND,
    recordType: RECORD_KIND,
    version: RECORD_VERSION,
    cycleStart: start,
    cycle_start: start,
    cycleEnd: end,
    cycle_end: end,
    baseline: parsedBaseline,
    source: "means-authority",
    syncStatus: "local_only",
  };

  try {
    const saved = await upsertLocalRecord(STORE_NAME, record, localUserId);
    writeLegacyCache(localUserId, start, end, parsedBaseline);
    return saved;
  } catch (error) {
    // Preserve protection on this browser even if IndexedDB is temporarily unavailable.
    writeLegacyCache(localUserId, start, end, parsedBaseline);
    throw error;
  }
}

export const MEANS_BASELINE_RECORD_KIND = RECORD_KIND;
