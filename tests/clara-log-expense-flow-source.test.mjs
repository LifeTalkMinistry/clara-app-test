import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const overlaySource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraLogExpenseOverlayV2.jsx", import.meta.url),
  "utf8"
);

const environmentSource = await readFile(
  new URL("../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlay.jsx", import.meta.url),
  "utf8"
);

test("Log Expense chat starts with greeting and planned versus unplanned choice", () => {
  assert.match(overlaySource, /Hi \$\{firstName\}!/);
  assert.match(overlaySource, /scheduled budget, or was it unplanned spending/i);
  assert.match(overlaySource, />Scheduled \/ Planned</);
  assert.match(overlaySource, />Unplanned Spending</);
});

test("planned spending branch explicitly avoids duplicate logging", () => {
  assert.match(overlaySource, /you don’t have to log it again/i);
  assert.match(overlaySource, /count it twice/i);
  assert.match(overlaySource, /Show my planned list/);
});

test("unplanned spending reuses the atomic Buy Check expense repository", () => {
  assert.match(overlaySource, /addBuyCheckExpense/);
  assert.match(overlaySource, /planning_status: "unplanned"/);
  assert.match(overlaySource, /Logged through CLARA Orb/);
  assert.match(overlaySource, /dispatchFinanceUpdates\(\)/);
});

test("CLARA environment renders dedicated Log Expense mode", () => {
  assert.match(environmentSource, /entryMode === "log-expense"/);
  assert.match(environmentSource, /<ClaraLogExpenseOverlay/);
});
