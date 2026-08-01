import { getStoredBackendUser } from "../lib/clara-backend-client";
import {
  LOCAL_FINANCE_STORES,
  getLocalRecordById,
  upsertLocalRecord,
} from "../lib/localFinanceStore";
import { syncServerFinance } from "../lib/server-finance-sync";

const INSTALL_FLAG = "__claraAccountStreakSyncInstalled";
const DAILY_CHECK_IN_EVENT = "clara:daily-check-in-updated";
const FINANCE_UPDATED_EVENT = "clara-local-finance-updated";
const STORAGE_PREFIX = "clara_daily_check_in_v3:";
const RECORD_PREFIX = "account_daily_check_in_v3:";
const RECORD_KIND = "account_daily_check_in_v3";
const STORE = LOCAL_FINANCE_STORES?.privatePreferences || "private_preferences";

let taskQueue = Promise.resolve();

function text(value) {
  return String(value ?? "").trim();
}

function getActiveIdentity() {
  const user = getStoredBackendUser();
  const userId = text(user?.id || user?.email);
  return userId ? { user, userId } : null;
}

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId}`;
}

function recordId(userId) {
  return `${RECORD_PREFIX}${userId}`;
}

function safeParse(value) {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function isoTime(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) ? time : 0;
}

function latestIso(...values) {
  return values
    .filter((value) => typeof value === "string" && value)
    .sort((left, right) => isoTime(right) - isoTime(left))[0] || null;
}

function earliestDay(...values) {
  return values
    .flat()
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
    .map(String)
    .sort()[0] || null;
}

function latestDay(...values) {
  const days = values
    .flat()
    .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")))
    .map(String)
    .sort();
  return days[days.length - 1] || null;
}

function eventIdentity(event, index) {
  return (
    text(event?.eventId || event?.event_id) ||
    text(event?.eligibleDay || event?.eligible_day) ||
    `event-${index}-${JSON.stringify(event)}`
  );
}

function eventTime(event) {
  return isoTime(
    event?.updatedAt ||
      event?.updated_at ||
      event?.createdAt ||
      event?.created_at ||
      event?.completedAt ||
      event?.completed_at
  );
}

function mergeEvents(left = [], right = []) {
  const merged = new Map();
  [...left, ...right].forEach((event, index) => {
    if (!event || typeof event !== "object") return;
    const key = eventIdentity(event, index);
    const existing = merged.get(key);
    if (!existing || eventTime(event) >= eventTime(existing)) merged.set(key, event);
  });

  return [...merged.values()].sort((first, second) => {
    const firstDay = text(first?.eligibleDay || first?.eligible_day);
    const secondDay = text(second?.eligibleDay || second?.eligible_day);
    if (firstDay !== secondDay) return firstDay.localeCompare(secondDay);
    return eventTime(first) - eventTime(second);
  });
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function mergeStreakStates(firstValue, secondValue, userId) {
  const first = safeParse(firstValue) || {};
  const second = safeParse(secondValue) || {};
  const firstIsNewer = isoTime(first.updatedAt || first.updated_at) >= isoTime(second.updatedAt || second.updated_at);
  const newer = firstIsNewer ? first : second;
  const older = firstIsNewer ? second : first;
  const checkInEvents = mergeEvents(first.checkInEvents, second.checkInEvents);
  const eventDays = checkInEvents.map((event) => event?.eligibleDay || event?.eligible_day);
  const completedDates = [...new Set([
    ...(Array.isArray(first.completedDates) ? first.completedDates : []),
    ...(Array.isArray(second.completedDates) ? second.completedDates : []),
    ...eventDays,
  ].filter(Boolean).map(String))].sort();
  const challengeStartDay = earliestDay(
    first.challengeStartDay,
    second.challengeStartDay,
    completedDates
  );
  const lastCheckInDay = latestDay(
    first.lastCheckInDay,
    first.lastCheckInDate,
    second.lastCheckInDay,
    second.lastCheckInDate,
    completedDates
  );
  const completedThirtyDaysAt = earliestDay(
    first.completedThirtyDaysAt?.slice?.(0, 10),
    second.completedThirtyDaysAt?.slice?.(0, 10)
  );
  const updatedAt = latestIso(
    first.updatedAt,
    first.updated_at,
    second.updatedAt,
    second.updated_at
  );

  return {
    ...older,
    ...newer,
    version: 3,
    userId,
    checkInEvents,
    completedDates,
    challengeStartDay,
    lastCheckInDay,
    lastCheckInDate: lastCheckInDay,
    currentStreak: Math.max(
      numberValue(first.currentStreak),
      numberValue(second.currentStreak)
    ),
    longestStreak: Math.max(
      numberValue(first.longestStreak),
      numberValue(second.longestStreak)
    ),
    lifetimeCheckIns: Math.max(
      checkInEvents.length,
      numberValue(first.lifetimeCheckIns),
      numberValue(second.lifetimeCheckIns)
    ),
    completedThirtyDays: Boolean(
      first.completedThirtyDays || second.completedThirtyDays
    ),
    completedThirtyDaysAt:
      completedThirtyDaysAt ||
      first.completedThirtyDaysAt ||
      second.completedThirtyDaysAt ||
      null,
    lastResetAt: latestIso(first.lastResetAt, second.lastResetAt),
    updatedAt: updatedAt || newer.updatedAt || older.updatedAt || null,
    updated_at: updatedAt || newer.updated_at || older.updated_at || null,
  };
}

function stableString(value) {
  if (Array.isArray(value)) return `[${value.map(stableString).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableString(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function readLocalState(userId) {
  try {
    return safeParse(window.localStorage.getItem(storageKey(userId)));
  } catch {
    return null;
  }
}

function writeLocalState(userId, state) {
  if (typeof window === "undefined" || !state) return false;
  const key = storageKey(userId);
  const serialized = JSON.stringify(state);

  try {
    if (window.localStorage.getItem(key) === serialized) return false;
    window.localStorage.setItem(key, serialized);
    window.dispatchEvent(
      new CustomEvent(DAILY_CHECK_IN_EVENT, {
        detail: {
          userId,
          state,
          reason: "account_sync",
          source: "account_streak_sync",
        },
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function readAccountRecord(userId) {
  return getLocalRecordById(STORE, recordId(userId), userId);
}

async function saveAccountRecord(userId, state, existing = null) {
  const updatedAt = state?.updatedAt || state?.updated_at || new Date().toISOString();
  return upsertLocalRecord(
    STORE,
    {
      ...(existing || {}),
      id: recordId(userId),
      recordKind: RECORD_KIND,
      kind: RECORD_KIND,
      state,
      updatedAt,
      updated_at: updatedAt,
      deletedAt: null,
      deleted_at: null,
      syncStatus: "local_only",
      source: "local",
    },
    userId
  );
}

async function hydrateFromAccountRecord() {
  const identity = getActiveIdentity();
  if (!identity) return;
  const { user, userId } = identity;

  const existing = await readAccountRecord(userId);
  const remoteState = safeParse(existing?.state);
  const localState = readLocalState(userId);
  if (!remoteState && !localState) return;

  const merged = mergeStreakStates(localState, remoteState, userId);
  writeLocalState(userId, merged);

  if (!existing || stableString(existing.state) !== stableString(merged)) {
    await saveAccountRecord(userId, merged, existing);
    await syncServerFinance({ user });
  }
}

async function mirrorLocalUpdate(event) {
  if (event?.detail?.source === "account_streak_sync") return;

  const identity = getActiveIdentity();
  if (!identity) return;
  const { user, userId } = identity;
  if (text(event?.detail?.userId) !== userId) return;

  try {
    await syncServerFinance({ user });
  } catch {
    // Continue offline with the strongest state currently available on this device.
  }

  const existing = await readAccountRecord(userId);
  const merged = mergeStreakStates(
    existing?.state,
    event?.detail?.state || readLocalState(userId),
    userId
  );

  writeLocalState(userId, merged);
  await saveAccountRecord(userId, merged, existing);

  try {
    await syncServerFinance({ user });
  } catch {
    // The IndexedDB write remains pending and the normal sync bridge retries later.
  }
}

function enqueue(task) {
  taskQueue = taskQueue.then(task, task).catch((error) => {
    console.warn("[CLARA Streak Sync] Account streak synchronization failed:", error);
  });
  return taskQueue;
}

export function installAccountStreakSyncBridge() {
  if (typeof window === "undefined" || window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  window.addEventListener(DAILY_CHECK_IN_EVENT, (event) => {
    enqueue(() => mirrorLocalUpdate(event));
  });
  window.addEventListener(FINANCE_UPDATED_EVENT, () => {
    enqueue(hydrateFromAccountRecord);
  });
  window.addEventListener("focus", () => enqueue(hydrateFromAccountRecord));
  window.addEventListener("online", () => enqueue(hydrateFromAccountRecord));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") enqueue(hydrateFromAccountRecord);
  });

  window.setTimeout(() => enqueue(hydrateFromAccountRecord), 1_500);
}

installAccountStreakSyncBridge();
