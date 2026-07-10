import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseFreeBuyCheckToday,
  getFreeBuyCheckUsage,
  getManilaBuyCheckDayKey,
  recordFreeBuyCheckCompletion,
  resetFreeBuyCheckUsageForTests,
} from "../src/lib/clara-buy-check-daily-limit.js";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("Free users receive one Buy Check per Manila day", () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-07-10T08:00:00.000Z");
  resetFreeBuyCheckUsageForTests(storage);

  assert.equal(canUseFreeBuyCheckToday("user-a", { now, storage }), true);
  const recorded = recordFreeBuyCheckCompletion("user-a", "session-1", { now, storage });

  assert.equal(recorded.count, 1);
  assert.equal(recorded.remaining, 0);
  assert.equal(recorded.available, false);
  assert.equal(canUseFreeBuyCheckToday("user-a", { now, storage }), false);
});

test("recording the same completed session is idempotent", () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-07-10T08:00:00.000Z");
  resetFreeBuyCheckUsageForTests(storage);

  recordFreeBuyCheckCompletion("user-a", "session-1", { now, storage });
  const repeated = recordFreeBuyCheckCompletion("user-a", "session-1", { now, storage });

  assert.equal(repeated.count, 1);
  assert.deepEqual(repeated.completedSessionIds, ["session-1"]);
});

test("the allowance resets after midnight in Manila", () => {
  const storage = createMemoryStorage();
  const beforeMidnight = new Date("2026-07-10T15:59:00.000Z");
  const afterMidnight = new Date("2026-07-10T16:01:00.000Z");
  resetFreeBuyCheckUsageForTests(storage);

  assert.equal(getManilaBuyCheckDayKey(beforeMidnight), "2026-07-10");
  assert.equal(getManilaBuyCheckDayKey(afterMidnight), "2026-07-11");

  recordFreeBuyCheckCompletion("user-a", "session-1", { now: beforeMidnight, storage });
  assert.equal(canUseFreeBuyCheckToday("user-a", { now: beforeMidnight, storage }), false);
  assert.equal(canUseFreeBuyCheckToday("user-a", { now: afterMidnight, storage }), true);
  assert.equal(getFreeBuyCheckUsage("user-a", { now: afterMidnight, storage }).count, 0);
});

test("daily usage is isolated per local CLARA user", () => {
  const storage = createMemoryStorage();
  const now = new Date("2026-07-10T08:00:00.000Z");
  resetFreeBuyCheckUsageForTests(storage);

  recordFreeBuyCheckCompletion("user-a", "session-a", { now, storage });

  assert.equal(canUseFreeBuyCheckToday("user-a", { now, storage }), false);
  assert.equal(canUseFreeBuyCheckToday("user-b", { now, storage }), true);
});
