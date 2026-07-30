import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { transformSavingsGoalsManagedBalance } from "../src/build/savingsGoalManagedBalanceTransform.js";

const source = fs.readFileSync("src/pages/SavingsGoalsIntegrated.jsx", "utf8");

test("existing Savings Goals use explicit managed-balance actions", () => {
  const transformed = transformSavingsGoalsManagedBalance(source);

  assert.match(transformed, /existing \? currentSavedAmount/);
  assert.match(transformed, /Manage Saved Amount/);
  assert.match(transformed, /handleReleaseSavings/);
  assert.match(transformed, /handleCorrectSavingsBalance/);
  assert.match(transformed, /Savings balance needs correction/);
  assert.match(transformed, /Release Savings/);
  assert.match(transformed, /Correct Saved Balance/);
  assert.match(transformed, /Record correction only; no wallet transaction was created/);
  assert.match(transformed, /Protection removed; wallet balance was not changed/);
});

test("the transform fails loudly when the Savings Goal source contract changes", () => {
  assert.throws(
    () => transformSavingsGoalsManagedBalance("export default function ChangedSavingsPage() {}"),
    /Missing source contract/,
  );
});
