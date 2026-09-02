import assert from "node:assert/strict";
import test from "node:test";

import {
  getFinancialCreationBoundaryDate,
  isFinancialOccurrenceOnOrAfterCreation,
} from "../src/lib/clara-financial-day.js";

test("financial items never own occurrences before their creation day", () => {
  const record = { createdAt: "2026-09-10T09:00:00+08:00" };

  assert.equal(getFinancialCreationBoundaryDate(record), "2026-09-10");
  assert.equal(isFinancialOccurrenceOnOrAfterCreation(record, "2026-09-09"), false);
  assert.equal(isFinancialOccurrenceOnOrAfterCreation(record, "2026-09-10"), true);
  assert.equal(isFinancialOccurrenceOnOrAfterCreation(record, "2026-09-11"), true);
});

test("creation boundary follows the CLARA financial day in Asia Manila", () => {
  const record = { createdAt: "2026-09-01T16:30:00.000Z" };

  assert.equal(getFinancialCreationBoundaryDate(record), "2026-09-02");
  assert.equal(isFinancialOccurrenceOnOrAfterCreation(record, "2026-09-01"), false);
  assert.equal(isFinancialOccurrenceOnOrAfterCreation(record, "2026-09-02"), true);
});

test("legacy financial items without a trustworthy createdAt remain unbounded", () => {
  const legacyRecord = { id: "legacy-financial-item" };

  assert.equal(getFinancialCreationBoundaryDate(legacyRecord), "");
  assert.equal(isFinancialOccurrenceOnOrAfterCreation(legacyRecord, "2026-01-01"), true);
});
