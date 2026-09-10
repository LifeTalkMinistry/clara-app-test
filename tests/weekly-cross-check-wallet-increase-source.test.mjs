import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Weekly Cross-Check distinguishes Income Hub money from a plain wallet correction", async () => {
  const overlay = await source(
    "../src/components/fresh/main-dashboard/assistant/ClaraWeeklyMoneyCheckOverlayV2.jsx"
  );

  assert.match(overlay, /It came from Income Hub/);
  assert.match(overlay, /Just correct this wallet/);
  assert.match(overlay, /income_source_select/);
  assert.match(overlay, /income_hub_transfer/);
  assert.match(overlay, /incomeSourceId/);
  assert.match(overlay, /without labeling this difference as income/);
});

test("Income Hub attribution only offers sources that can cover the wallet increase", async () => {
  const overlay = await source(
    "../src/components/fresh/main-dashboard/assistant/ClaraWeeklyMoneyCheckOverlayV2.jsx"
  );

  assert.match(
    overlay,
    /source\.availableBalance \+ DIFFERENCE_EPSILON >= currentPositiveDifference/
  );
  assert.match(overlay, /I can’t match .* to money currently available in Income Hub/);
  assert.match(overlay, /That keeps the wallet accurate without counting the same money twice/);
});

test("Income Hub wallet-increase reconciliation is atomic and does not touch Means baseline authority", async () => {
  const reconciliation = await source(
    "../src/lib/weeklyMoneyCheckReconciliationRepository.js"
  );

  assert.match(reconciliation, /LOCAL_FINANCE_STORES\.privatePreferences/);
  assert.match(reconciliation, /income_hub_transfer/);
  assert.match(reconciliation, /income_source_id: incomeSource\.id/);
  assert.match(reconciliation, /income_flow_type: "income_source_transfer"/);
  assert.match(reconciliation, /currentBalance: nextSourceBalance/);
  assert.match(reconciliation, /\[INCOME_SOURCE_STORE, WALLET_STORE, WALLET_TRANSACTION_STORE\]/);
  assert.doesNotMatch(reconciliation, /cycle100Anchor/);
  assert.doesNotMatch(reconciliation, /requiredRunway/);
  assert.doesNotMatch(reconciliation, /resetMeansAssumedSpent/);
});
