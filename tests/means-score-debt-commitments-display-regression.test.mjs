import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authorityPath = path.join(__dirname, "../src/lib/clara-means-authority.js");
const source = fs.readFileSync(authorityPath, "utf8");

function loadOutstandingDebtHelper() {
  const start = source.indexOf("export function calculateMeansOutstandingDebtCommitments");
  assert.notEqual(start, -1, "canonical Means authority must expose debt commitment display helper");
  const end = source.indexOf("\nfunction currentCycleFutureDebtActual", start);
  assert.notEqual(end, -1, "debt commitment helper must remain before future-debt actual logic");

  const helperSource = source.slice(start, end).replace("export function", "function");
  const context = { result: null };
  vm.createContext(context);
  vm.runInContext(
    `const nonNegative = (value) => { const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0; }; ${helperSource}; result = calculateMeansOutstandingDebtCommitments;`,
    context
  );
  return context.result;
}

test("ORB debt commitments include overdue/current-cycle unpaid remainder", () => {
  const calculate = loadOutstandingDebtHelper();
  const result = calculate(
    [
      { kind: "debt", date: "2026-08-27", amount: 3000, actualPaid: 0 },
      { kind: "debt", date: "2026-08-29", amount: 81, actualPaid: 30 },
      { kind: "debt", date: "2026-09-05", amount: 500, actualPaid: 500 },
      { kind: "money_schedule", date: "2026-09-01", amount: 9999, actualPaid: 0 },
    ],
    400
  );

  assert.equal(result, 3451);
});

test("fully paid current-cycle debt leaves no remaining ORB debt commitment", () => {
  const calculate = loadOutstandingDebtHelper();
  assert.equal(calculate([{ kind: "debt", amount: 81, actualPaid: 81 }], 0), 0);
});

test("canonical snapshot no longer uses a future-only debt filter", () => {
  assert.match(
    source,
    /const debtUpcoming = calculateMeansOutstandingDebtCommitments\(\s*debtOccurrences,\s*baselineState\.carriedObligations\s*\);/
  );
  assert.doesNotMatch(
    source,
    /const debtUpcoming = futureContributions\s*\.filter\(\(entry\) => entry\.kind === "debt"\)/
  );
});
