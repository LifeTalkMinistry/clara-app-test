import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const financeRepositorySource = await fs.readFile(
  new URL("../src/lib/financeRepository.js", import.meta.url),
  "utf8",
);

test("budget reset refreshes authoritative server versions before local mutation", () => {
  assert.match(
    financeRepositorySource,
    /import \{ getStoredBackendUser \} from "\.\/clara-backend-client\.js";/,
  );
  assert.match(
    financeRepositorySource,
    /import \{ syncServerFinance \} from "\.\/server-finance-sync\.js";/,
  );
  assert.match(financeRepositorySource, /function isBudgetResetPatch\(patch = \{\}\)/);
  assert.match(
    financeRepositorySource,
    /await syncServerFinance\(\{ user, forcePull: true \}\);/,
  );
  assert.match(
    financeRepositorySource,
    /async updateBudget\(localUserId, budgetId, patch, \.\.\.args\)[\s\S]*if \(isBudgetResetPatch\(patch\)\)[\s\S]*await refreshServerVersionBeforeBudgetReset\(localUserId\)[\s\S]*return repository\.updateBudget\(localUserId, budgetId, patch, \.\.\.args\);/,
  );
});
