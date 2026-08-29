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
  const end = source.indexOf("\nasync function readAllDebtRecords", start);
  assert.notEqual(end, -1, "debt commitment helper must remain isolated from data loading");

  const helperSource = source.slice(start, end).replace("export function", "function");
  const context = { result: null };
  vm.createContext(context);
  vm.runInContext(
    `const nonNegative = (value) => { const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, "")); return Number.isFinite(parsed) ? Math.max(0, parsed) : 0; }; ${helperSource}; result = calculateMeansOutstandingDebtCommitments;`,
    context
  );
  return context.result;
}

test("ORB debt commitments include unpaid remainder for represented current-cycle occurrences", () => {
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

  // Legacy carry input is ignored: only represented active-cycle debt occurrences count.
  assert.equal(result, 3051);
});

test("fully paid current-cycle debt leaves no remaining ORB debt commitment", () => {
  const calculate = loadOutstandingDebtHelper();
  assert.equal(calculate([{ kind: "debt", amount: 81, actualPaid: 81 }], 0), 0);
});

test("canonical snapshot does not add carried obligations to debt commitments", () => {
  assert.match(
    source,
    /const debtUpcoming = calculateMeansOutstandingDebtCommitments\(debtOccurrences\);/
  );
  assert.doesNotMatch(source, /baselineState\.carriedObligations/);
  assert.doesNotMatch(source, /confirmedCarriedDebt/);
});
