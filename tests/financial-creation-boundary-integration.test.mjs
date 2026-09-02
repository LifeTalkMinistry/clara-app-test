import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { buildDebtObligationScheduleProjection } from "../src/lib/financialCardScheduleProjection.js";
import { getDebtOccurrenceState } from "../src/lib/debtOccurrenceState.js";
import { DEBT_OBLIGATION_RECORD_KIND } from "../src/lib/debtObligationMath.js";

const recurringDebt = (overrides = {}) => ({
  id: "rent-obligation",
  recordKind: DEBT_OBLIGATION_RECORD_KIND,
  title: "House Rent",
  obligationMode: "recurring",
  obligation_mode: "recurring",
  monthlyDebt: 8000,
  monthlyPayment: 8000,
  monthly_payment: 8000,
  dueDay: 1,
  due_day: 1,
  status: "active",
  ...overrides,
});

const source = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

test("a debt created after this month's due day starts with the next valid occurrence", () => {
  const record = recurringDebt({ createdAt: "2026-09-02T09:00:00+08:00" });
  const referenceDate = new Date("2026-09-02T09:30:00+08:00");
  const projection = buildDebtObligationScheduleProjection([record], { referenceDate });

  assert.equal(projection.some((event) => event.date === "2026-09-01"), false);
  assert.equal(projection.some((event) => event.date === "2026-10-01"), true);

  const occurrence = getDebtOccurrenceState(record, referenceDate);
  assert.equal(occurrence.state, "upcoming");
  assert.equal(occurrence.dueDate, "2026-10-01");
});

test("a same-day debt occurrence is valid because occurrenceDate equals createdAt day", () => {
  const record = recurringDebt({ createdAt: "2026-09-01T08:00:00+08:00" });
  const referenceDate = new Date("2026-09-01T12:00:00+08:00");
  const projection = buildDebtObligationScheduleProjection([record], { referenceDate });

  assert.equal(projection.some((event) => event.date === "2026-09-01"), true);
  const occurrence = getDebtOccurrenceState(record, referenceDate);
  assert.equal(occurrence.state, "due_today");
  assert.equal(occurrence.dueDate, "2026-09-01");
});

test("Means filters both recurring Money Schedule and debt occurrences at creation boundary", () => {
  const means = source("../src/lib/clara-means-authority.js");

  assert.match(
    means,
    /enumerateFinancialDates\(cycleStart, cycleEnd\)[\s\S]*?\.filter\(\(date\) => isFinancialOccurrenceOnOrAfterCreation\(routine, date\)\)/
  );
  assert.match(
    means,
    /isFinancialOccurrenceOnOrAfterCreation\(record, date\)/
  );
  assert.match(
    means,
    /isFinancialOccurrenceOnOrAfterCreation\(record, oneTime\)/
  );
});

test("editing does not reset an existing Money Schedule or debt creation boundary", () => {
  const moneySchedule = source("../src/lib/clara-money-schedule-repository.js");
  const debtStore = source("../src/lib/debtObligationStore.js");

  assert.match(
    moneySchedule,
    /const createdAt = existing\s*\? cleanText\(existing\.createdAt \|\| existing\.created_at\)\s*:\s*now;/
  );
  assert.match(
    debtStore,
    /const createdAt = existingRecord\s*\? normalizeString\(existingRecord\.createdAt \|\| existingRecord\.created_at\)\s*:\s*normalizeString\(payload\.createdAt \|\| payload\.created_at\) \|\| now;/
  );
});

test("legacy Money Schedule records do not get a fabricated creation day on read", () => {
  const moneySchedule = source("../src/lib/clara-money-schedule-repository.js");

  assert.match(
    moneySchedule,
    /const createdAt = cleanText\(value\.createdAt \|\| value\.created_at\);/
  );
  assert.doesNotMatch(
    moneySchedule,
    /createdAt:\s*cleanText\(value\.createdAt \|\| value\.created_at\) \|\| new Date\(\)\.toISOString\(\)/
  );
});
