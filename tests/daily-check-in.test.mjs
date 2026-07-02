import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { performDailyCheckIn } from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInActions.js";
import { deriveChallengeMetrics } from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInEngine.js";
import {
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

function persistedCheckIn(value, userId = "user-1") {
  return performDailyCheckIn({
    value,
    userId,
    todayKey: TODAY,
    persist: (nextState) => writeState(userId, nextState, "test", TODAY),
  });
}

test("existing two-day streak increments to three without reset bubble", () => {
  localStorage.clear();
  const result = persistedCheckIn({
    completedDates: [TWO_DAYS_AGO, YESTERDAY],
    currentStreak: 2,
    longestStreak: 2,
  });

  assert.equal(result.status, "completed");
  assert.equal(result.state.currentStreak, 3);
  assert.equal(result.state.completedDates.filter((date) => date === TODAY).length, 1);
  assert.equal(result.state.lastCheckInDate, TODAY);
  assert.notEqual(result.state.pendingBubble?.type, "streak_reset");
  assert.equal(deriveChallengeMetrics(result.state, TODAY).challengeDay, 3);
});

test("stale stored currentStreak cannot override completedDates", () => {
  const state = normalizeState({
    completedDates: [TWO_DAYS_AGO, YESTERDAY, TODAY],
    currentStreak: 1,
  }, "user-2", TODAY);
  assert.equal(state.currentStreak, 3);
});

test("stale lastCheckInDate does not break continuation", () => {
  localStorage.clear();
  for (const lastCheckInDate of [null, "2026-06-20"]) {
    const result = persistedCheckIn({
      completedDates: [YESTERDAY],
      lastCheckInDate,
      currentStreak: 1,
    }, `stale-last-${lastCheckInDate || "null"}`);
    assert.equal(result.status, "completed");
    assert.equal(result.state.currentStreak, 2);
  }
});

test("same-day check-in remains idempotent", () => {
  const result = performDailyCheckIn({
    value: { completedDates: [TODAY], currentStreak: 99 },
    userId: "user-4",
    todayKey: TODAY,
    persist: () => assert.fail("duplicate check-in must not persist"),
  });
  assert.equal(result.status, "already_checked_in");
  assert.equal(result.state.completedDates.filter((date) => date === TODAY).length, 1);
  assert.equal(result.state.currentStreak, 1);
});

test("genuine missed day resets active streak once and preserves history", () => {
  const initial = {
    completedDates: ["2026-06-28", "2026-06-29", TWO_DAYS_AGO],
    currentStreak: 3,
    longestStreak: 5,
    lifetimeCheckIns: 9,
  };
  const first = validateState(initial, "user-5", TODAY);
  assert.equal(first.changed, true);
  assert.equal(first.state.currentStreak, 0);
  assert.equal(first.state.cycleStartedAt, null);
  assert.deepEqual(first.state.completedDates, initial.completedDates);
  assert.equal(first.state.lastCheckInDate, TWO_DAYS_AGO);
  assert.equal(first.state.longestStreak, 5);
  assert.equal(first.state.lifetimeCheckIns, 9);
  assert.equal(first.state.pendingBubble.type, "streak_reset");
  assert.ok(first.state.lastResetAt);

  const second = validateState(first.state, "user-5", TODAY);
  assert.equal(second.changed, false);
  assert.equal(second.state.pendingBubble.id, first.state.pendingBubble.id);
});

test("successful persistence restores the same state after reload", () => {
  localStorage.clear();
  const result = persistedCheckIn({
    completedDates: [TWO_DAYS_AGO, YESTERDAY],
  }, "reload-user");
  const reloaded = loadState("reload-user", TODAY);
  assert.equal(reloaded.currentStreak, result.state.currentStreak);
  assert.deepEqual(reloaded.completedDates, result.state.completedDates);
  assert.equal(reloaded.lastCheckInDate, result.state.lastCheckInDate);
  assert.equal(
    deriveChallengeMetrics(reloaded, TODAY).challengeDay,
    deriveChallengeMetrics(result.state, TODAY).challengeDay,
  );
});

test("guest-to-user session migration merges once and removes source after persistence", () => {
  localStorage.clear();
  assert.equal(writeState("guest", {
    completedDates: [YESTERDAY],
    lifetimeCheckIns: 1,
  }, "seed", TODAY).ok, true);

  const migration = migrateSessionIdentityState("guest", "auth-user", TODAY);
  assert.equal(migration.ok, true);
  assert.equal(migration.migrated, true);
  assert.deepEqual(migration.state.completedDates, [YESTERDAY]);
  assert.equal(localStorage.getItem(storageKey("guest")), null);

  const repeated = migrateSessionIdentityState("guest", "auth-user", TODAY);
  assert.equal(repeated.migrated, false);
  assert.deepEqual(repeated.state.completedDates, [YESTERDAY]);
});

test("identity migration merges destination history without adding counters", () => {
  localStorage.clear();
  writeState("temporary-user", {
    completedDates: [TWO_DAYS_AGO, YESTERDAY],
    currentStreak: 200,
    longestStreak: 8,
    lifetimeCheckIns: 12,
  }, "seed", TODAY);
  writeState("destination-user", {
    completedDates: [YESTERDAY, TODAY],
    currentStreak: 300,
    longestStreak: 5,
    lifetimeCheckIns: 10,
  }, "seed", TODAY);

  const migration = migrateSessionIdentityState(
    "temporary-user",
    "destination-user",
    TODAY,
  );
  assert.equal(migration.ok, true);
  assert.deepEqual(migration.state.completedDates, [TWO_DAYS_AGO, YESTERDAY, TODAY]);
  assert.equal(migration.state.currentStreak, 3);
  assert.equal(migration.state.lifetimeCheckIns, 12);
  assert.equal(migration.state.longestStreak, 8);
});

test("persistence failure returns storage_error and does not show today as completed", () => {
  localStorage.clear();
  localStorage.failWrites = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = performDailyCheckIn({
      value: { completedDates: [YESTERDAY] },
      userId: "failure-user",
      todayKey: TODAY,
      persist: (nextState) => writeState("failure-user", nextState, "test", TODAY),
    });
    assert.equal(result.status, "storage_error");
    assert.equal(result.state.completedDates.includes(TODAY), false);
    assert.equal(deriveChallengeMetrics(result.state, TODAY).checkedInToday, false);
    assert.equal(localStorage.getItem(storageKey("failure-user")), null);
  } finally {
    console.error = originalError;
    localStorage.failWrites = false;
  }
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
