import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const financeRepositorySource = await fs.readFile(
  new URL("../src/lib/financeRepository.js", import.meta.url),
  "utf8",
);

test("all synchronized finance mutations refresh authoritative versions first", () => {
  assert.match(
    financeRepositorySource,
    /import \{ getStoredBackendUser \} from "\.\/clara-backend-client\.js";/,
  );
  assert.match(
    financeRepositorySource,
    /import \{ syncServerFinance \} from "\.\/server-finance-sync\.js";/,
  );
  assert.match(
    financeRepositorySource,
    /async function prepareServerVersionBeforeMutation\(localUserId\)/,
  );
  assert.match(financeRepositorySource, /__claraPrepareServerFinanceMutation/);
  assert.match(financeRepositorySource, /await syncServerFinance\(\{ user \}\);/);

  for (const methodName of [
    "addExpense",
    "updateExpense",
    "deleteExpense",
    "addWallet",
    "updateWallet",
    "deleteWallet",
    "insertWalletTransaction",
    "addIncome",
    "addMoney",
    "transferBetweenWallets",
    "addBudget",
    "updateBudget",
    "deleteBudget",
    "upsertBudget",
    "upsertSavingsGoal",
    "upsertEmergencyFund",
  ]) {
    const methodPattern = new RegExp(
      `async ${methodName}\\(localUserId,[\\s\\S]*?await prepareServerVersionBeforeMutation\\(localUserId\\);`,
    );
    assert.match(financeRepositorySource, methodPattern);
  }
});
