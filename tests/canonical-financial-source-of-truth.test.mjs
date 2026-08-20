import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("wallet list reads canonical spendable values without subtracting protected money", () => {
  const source = read("src/components/financial-carousel/cards/wallet/ui/WalletListItem.jsx");
  assert.doesNotMatch(source, /Math\.max\(walletBalance\s*-\s*totalProtectedAmount/);
});

test("dashboard summary does not subtract Emergency Fund from gross wallets", () => {
  const source = read("src/lib/clara-dashboard-summary-ai-reader.js");
  assert.match(source, /walletTotals\.spendableBalance/);
  assert.doesNotMatch(source, /totalWalletBalance\s*-\s*emergencyProtectedAmount/);
});

test("finance repository owns canonical mutation invalidation", () => {
  const source = read("src/lib/financeRepository.js");
  for (const mutationSource of [
    "expense:add",
    "expense:update",
    "expense:delete",
    "wallet:add",
    "wallet:update",
    "wallet:delete",
    "wallet_transaction:add",
    "wallet_transfer:add",
    "budget:upsert",
    "savings_goal:upsert",
    "emergency_fund:upsert",
  ]) {
    assert.match(source, new RegExp(mutationSource.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(source, /clara:finance-data-updated/);
  assert.match(source, /financeDataRevision/);
});

test("canonical wallet engine owns the spendable subtraction", () => {
  const source = read("src/lib/clara-wallet-money-semantics.js");
  assert.match(source, /currentBalance\s*-\s*protectedAmounts\.totalProtectedAmount/);
  assert.match(source, /buildCanonicalWalletState/);
  assert.match(source, /otherProtectedAmount/);
});

test("buy check does not infer monetary protection from wallet names", () => {
  const source = read("src/lib/clara-buy-check-wallet-engine.js");
  assert.doesNotMatch(source, /emergency\|reserve\|savings/);
  assert.match(source, /spendabilityStatus/);
  assert.match(source, /getCanonicalWalletSpendableBalance/);
});

test("local brain and forecast do not recreate Emergency-only spendable money", () => {
  const localBrain = read("src/lib/clara-local-brain.js");
  const forecast = read("src/lib/clara-forecast-phase-one-snapshot.js");
  assert.doesNotMatch(localBrain, /totalWalletBalance\s*-\s*protectedEmergencyAmount/);
  assert.doesNotMatch(forecast, /totalWalletBalance\s*-\s*protectedMoney/);
  assert.match(localBrain, /canonicalFinancialState/);
  assert.match(forecast, /canonicalFinancialState/);
});

test("Weekly Cross-Check remains current-balance based", () => {
  const source = read("src/components/fresh/main-dashboard/assistant/ClaraWeeklyMoneyCheckOverlayV2.jsx");
  assert.match(source, /getWalletCurrentBalance/);
  assert.doesNotMatch(source, /getWalletSpendableBalance/);
});
