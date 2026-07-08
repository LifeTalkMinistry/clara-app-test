import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  getEligibleDayKey,
  isValidDateKey,
} from "../src/lib/challenge-schedule.js";
import { performDailyCheckIn } from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInActions.js";
import {
  buildDailyCheckInEventId,
  createDailyCheckInEvent,
  deriveChallengeMetrics,
} from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInEngine.js";
import {
  clearDailyCheckInState,
  legacyStorageKey,
  loadState,
  migrateSessionIdentityState,
  storageKey,
  writeState,
} from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInPersistence.js";
import { normalizeState } from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInState.js";
import { validateState } from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInValidation.js";

const TODAY = "2026-07-02";
const YESTERDAY = "2026-07-01";
const TWO_DAYS_AGO = "2026-06-30";

class MemoryStorage {
  constructor() {
    this.values = new Map();
    this.failWrites = false;
  }
  get length() { return this.values.size; }
  key(index) { return [...this.values.keys()][index] || null; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) {
    if (this.failWrites) throw new Error("quota");
    this.values.set(key, String(value));
  }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

const localStorage = new MemoryStorage();
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};
globalThis.window = {
  localStorage,
  dispatchEvent() {},
};

function event(userId, eligibleDay) {
  return createDailyCheckInEvent({ userId, eligibleDay, now: new Date(`${eligibleDay}T08:00:00+08:00`) });
}

function persistedCheckIn(value, userId = "user-1", todayKey = TODAY) {
  return performDailyCheckIn({
    value,
    userId,
    todayKey,
    persist: (nextState, expectedEvent) => writeState(userId, nextState, "test", todayKey, expectedEvent),
  });
}

test("eligible day uses Manila 6 AM boundary", () => {
  assert.equal(getEligibleDayKey(new Date("2026-07-09T21:59:59.000Z")), "2026-07-09");
  assert.equal(getEligibleDayKey(new Date("2026-07-09T22:00:00.000Z")), "2026-07-10");
  assert.equal(getEligibleDayKey(new Date("2026-07-08T18:00:00.000Z")), "2026-07-08");
});

test("real date validation rejects impossible calendar dates", () => {
  assert.equal(isValidDateKey("2026-02-31"), false);
  assert.equal(isValidDateKey("2026-13-10"), false);
  assert.equal(isValidDateKey("2026-00-04"), false);
  assert.equal(isValidDateKey("2028-02-29"), true);
});

test("first confirmed check-in starts day 1 and creates one event", () => {
  localStorage.clear();
  const result = persistedCheckIn({}, "first-user");

  assert.equal(result.status, "completed");
  assert.equal(result.state.challengeStartDay, TODAY);
  assert.equal(result.state.challengeCurrentDay, 1);
  assert.equal(result.state.completedCheckInDays, 1);
  assert.equal(result.state.currentStreak, 1);
  assert.equal(result.state.checkInEvents.length, 1);
  assert.equal(result.state.checkInEvents[0].eventId, buildDailyCheckInEventId("first-user", TODAY));
});

test("same eligible day check-in remains idempotent", () => {
  const result = performDailyCheckIn({
    value: { checkInEvents: [event("user-4", TODAY)], currentStreak: 99 },
    userId: "user-4",
    todayKey: TODAY,
    persist: () => assert.fail("duplicate check-in must not persist"),
  });
  assert.equal(result.status, "already_checked_in");
  assert.equal(result.state.checkInEvents.filter((item) => item.eligibleDay === TODAY).length, 1);
  assert.equal(result.state.currentStreak, 1);
});

test("stale stored currentStreak cannot override event history", () => {
  const state = normalizeState({
    checkInEvents: [event("user-2", TWO_DAYS_AGO), event("user-2", YESTERDAY), event("user-2", TODAY)],
    currentStreak: 1,
  }, "user-2", TODAY);
  assert.equal(state.currentStreak, 3);
});

test("calendar challenge advances even when streak resets", () => {
  const state = normalizeState({
    challengeStartDay: TWO_DAYS_AGO,
    checkInEvents: [event("calendar-user", TWO_DAYS_AGO), event("calendar-user", TODAY)],
  }, "calendar-user", TODAY);

  assert.equal(state.challengeCurrentDay, 3);
  assert.equal(state.completedCheckInDays, 2);
  assert.equal(state.currentStreak, 1);
  const metrics = deriveChallengeMetrics(state, TODAY);
  assert.equal(metrics.challengeDay, 3);
  assert.equal(metrics.challengeDotStates[0].completed, true);
  assert.equal(metrics.challengeDotStates[1].completed, false);
  assert.equal(metrics.challengeDotStates[2].completed, true);
});

test("genuine missed day records reset once and preserves history", () => {
  const initial = {
    challengeStartDay: "2026-06-28",
    checkInEvents: [
      event("user-5", "2026-06-28"),
      event("user-5", "2026-06-29"),
      event("user-5", TWO_DAYS_AGO),
    ],
    longestStreak: 5,
    lifetimeCheckIns: 9,
  };
  const first = validateState(initial, "user-5", TODAY);
  assert.equal(first.changed, true);
  assert.equal(first.state.currentStreak, 0);
  assert.equal(first.state.challengeCurrentDay, 5);
  assert.equal(first.state.completedDates.length, 3);
  assert.equal(first.state.longestStreak, 5);
  assert.equal(first.state.lifetimeCheckIns, 9);
  assert.equal(first.state.pendingBubble.type, "streak_reset");

  const second = validateState(first.state, "user-5", TODAY);
  assert.equal(second.changed, false);
  assert.equal(second.state.pendingBubble.id, first.state.pendingBubble.id);
});

test("successful v3 persistence restores the same state after reload", () => {
  localStorage.clear();
  const result = persistedCheckIn({
    challengeStartDay: TWO_DAYS_AGO,
    checkInEvents: [event("reload-user", TWO_DAYS_AGO), event("reload-user", YESTERDAY)],
  }, "reload-user");
  const reloaded = loadState("reload-user", TODAY);
  assert.equal(reloaded.currentStreak, result.state.currentStreak);
  assert.equal(reloaded.challengeCurrentDay, 3);
  assert.deepEqual(reloaded.completedDates, result.state.completedDates);
  assert.equal(reloaded.lastCheckInDay, result.state.lastCheckInDay);
});

test("persistence failure returns storage_error and does not show success", () => {
  localStorage.clear();
  localStorage.failWrites = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = persistedCheckIn({ checkInEvents: [event("failure-user", YESTERDAY)] }, "failure-user");
    assert.equal(result.status, "storage_error");
    assert.equal(result.state.completedDates.includes(TODAY), false);
    assert.equal(localStorage.getItem(storageKey("failure-user")), null);
  } finally {
    console.error = originalError;
    localStorage.failWrites = false;
  }
});

test("reset clears v3, v2, legacy, and memory state", () => {
  localStorage.clear();
  writeState("reset-user", { checkInEvents: [event("reset-user", TODAY)] }, "seed", TODAY);
  localStorage.setItem(legacyStorageKey("reset-user"), JSON.stringify({ completedDates: [YESTERDAY] }));
  clearDailyCheckInState("reset-user");
  assert.equal(localStorage.getItem(storageKey("reset-user")), null);
  assert.equal(localStorage.getItem(legacyStorageKey("reset-user")), null);
  assert.equal(loadState("reset-user", TODAY).checkInEvents.length, 0);
});

test("v2 migration preserves valid dates as unique v3 events", () => {
  localStorage.clear();
  localStorage.setItem(legacyStorageKey("v2-user"), JSON.stringify({
    completedDates: [YESTERDAY, YESTERDAY, "2026-02-31", TODAY],
    cycleStartedAt: YESTERDAY,
    longestStreak: 8,
    lifetimeCheckIns: 12,
  }));
  const migrated = loadState("v2-user", TODAY);
  assert.equal(migrated.checkInEvents.length, 2);
  assert.deepEqual(migrated.completedDates, [YESTERDAY, TODAY]);
  assert.equal(migrated.longestStreak, 8);
  assert.equal(migrated.lifetimeCheckIns, 12);
  assert.equal(localStorage.getItem(legacyStorageKey("v2-user")) !== null, true);
});

test("guest-to-user session migration merges once and removes source", () => {
  localStorage.clear();
  assert.equal(writeState("guest", { checkInEvents: [event("guest", YESTERDAY)] }, "seed", TODAY).ok, true);

  const migration = migrateSessionIdentityState("guest", "auth-user", TODAY);
  assert.equal(migration.ok, true);
  assert.equal(migration.migrated, true);
  assert.deepEqual(migration.state.completedDates, [YESTERDAY]);
  assert.equal(localStorage.getItem(storageKey("guest")), null);

  const repeated = migrateSessionIdentityState("guest", "auth-user", TODAY);
  assert.equal(repeated.migrated, false);
  assert.deepEqual(repeated.state.completedDates, [YESTERDAY]);
});

test("challenge completion remains after later streak reset", () => {
  const state = normalizeState({
    challengeStartDay: "2026-06-01",
    completedThirtyDays: true,
    completedThirtyDaysAt: "2026-06-30T00:00:00.000Z",
    checkInEvents: [event("complete-user", "2026-06-01")],
  }, "complete-user", "2026-07-10");
  assert.equal(state.challengeStatus, "completed");
  assert.equal(state.challengeCurrentDay, 30);
  assert.equal(state.currentStreak, 0);
  assert.equal(state.completedThirtyDays, true);
});

test("production import resolves through one authoritative engine", async () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const logicDir = path.resolve(
    testDir,
    "../src/components/fresh/main-dashboard/daily-tip/logic",
  );
  const uiSource = await readFile(path.resolve(logicDir, "../ui/DailyTipCard.jsx"), "utf8");
  const jsEntry = (await readFile(path.resolve(logicDir, "useDailyCheckIn.js"), "utf8")).trim();
  const mjsEntry = (await readFile(path.resolve(logicDir, "useDailyCheckIn.mjs"), "utf8")).trim();

  assert.match(uiSource, /import useDailyCheckIn from "\.\.\/logic\/useDailyCheckIn";/);
  assert.equal(jsEntry, 'export { default } from "./useDailyCheckInCore.js";');
  assert.equal(mjsEntry, jsEntry);
});
