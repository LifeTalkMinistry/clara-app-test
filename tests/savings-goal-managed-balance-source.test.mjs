import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const page = readSource("src/pages/SavingsGoalsIntegrated.jsx");
const vite = readSource("vite.config.js");

test("managed Savings Goal balance behavior lives in source code", () => {
  assert.match(page, /existing \? currentSavedAmount/);
  assert.match(page, /Manage Saved Amount/);
  assert.match(page, /handleReleaseSavings/);
  assert.match(page, /handleCorrectSavingsBalance/);
  assert.match(page, /Savings balance needs correction/);
  assert.match(page, /Release Savings/);
  assert.match(page, /Correct Saved Balance/);
  assert.match(page, /Record correction only; no wallet transaction was created/);
  assert.match(page, /Protection removed; wallet balance was not changed/);
});

test("Vite compiles Savings Goals directly without source rewriting", () => {
  assert.doesNotMatch(vite, /savingsGoalManagedBalancePlugin|savingsGoalManagedBalanceTransform/);
  assert.equal(
    existsSync(new URL("../src/build/savingsGoalManagedBalanceTransform.js", import.meta.url)),
    false,
  );
});
