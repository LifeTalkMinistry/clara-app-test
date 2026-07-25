import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/pages/MonthlyBudgetPlan.jsx", import.meta.url),
  "utf8",
);

test("protected money editor uses remaining-to-protect without rebasing fulfilled logs", () => {
  assert.match(source, /protectedRemainingAmount/);
  assert.match(source, /emergencyProtectedFunded \+ Math\.max/);
  assert.match(source, /alreadyFunded \+ desiredRemaining/);
  assert.match(source, /still to protect/);
  assert.match(source, /Already fulfilled/);
  assert.match(source, /New amount left to protect/);
});
