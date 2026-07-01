import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateActiveStreak,
  calculateLongestStreak,
  normalizeDates,
  reconcileCheckInHistory,
} from "../src/components/fresh/main-dashboard/daily-tip/logic/dailyCheckInEngine.js";

test("consecutive check-ins progress from Day 1 through Day 3 and beyond", () => {
  assert.equal(calculateActiveStreak(["2026-06-29"], "2026-06-29"), 1);
  assert.equal(
    calculateActiveStreak(["2026-06-29", "2026-06-30"], "2026-06-30"),
    2,
  );
  assert.equal(
    calculateActiveStreak(
      ["2026-06-29", "2026-06-30", "2026-07-01"],
      "2026-07-01",
    ),
    3,
  );
});

test("stale Day 2 scalar is repaired from the completed date history", () => {
  const repaired = reconcileCheckInHistory(
    {
      currentStreak: 2,
      lastCheckInDate: "2026-06-30",
      completedDates: ["2026-06-29", "2026-06-30", "2026-07-01"],
    },
    "2026-07-01",
  );

  assert.equal(repaired.currentStreak, 3);
  assert.equal(repaired.activeStreak, 3);
  assert.equal(repaired.lastCheckInDate, "2026-07-01");
});

test("a separately saved last check-in date is merged back into history", () => {
  const repaired = reconcileCheckInHistory(
    {
      currentStreak: 3,
      lastCheckInDate: "2026-07-01",
      completedDates: ["2026-06-29", "2026-06-30"],
    },
    "2026-07-01",
  );

  assert.deepEqual(repaired.completedDates, [
    "2026-06-29",
    "2026-06-30",
    "2026-07-01",
  ]);
  assert.equal(repaired.currentStreak, 3);
});

test("duplicate same-day records do not inflate the streak", () => {
  assert.deepEqual(
    normalizeDates(["2026-07-01", "2026-07-01", "invalid"]),
    ["2026-07-01"],
  );
  assert.equal(calculateActiveStreak(["2026-07-01", "2026-07-01"], "2026-07-01"), 1);
});

test("a missed day breaks the active streak while preserving the prior scalar for reset handling", () => {
  const reconciled = reconcileCheckInHistory(
    {
      currentStreak: 2,
      lastCheckInDate: "2026-06-30",
      completedDates: ["2026-06-29", "2026-06-30"],
    },
    "2026-07-02",
  );

  assert.equal(reconciled.activeStreak, 0);
  assert.equal(reconciled.currentStreak, 2);
});

test("longest streak is calculated from separate streak runs", () => {
  assert.equal(
    calculateLongestStreak([
      "2026-06-20",
      "2026-06-21",
      "2026-06-23",
      "2026-06-24",
      "2026-06-25",
    ]),
    3,
  );
});
