import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");

test("calculator result prefills the active manual expense flow", async () => {
  const [wrapperSource, coreSource, summarySource] = await Promise.all([
    read("../src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlers.js"),
    read("../src/components/fresh/main-dashboard/finance-actions/useDashboardFinanceActionHandlersCore.js"),
    read("../src/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable.jsx"),
  ]);

  assert.match(
    wrapperSource,
    /import useDashboardFinanceActionHandlersCore from "\.\/useDashboardFinanceActionHandlersCore"/,
  );
  assert.match(wrapperSource, /request\?\.resolvedGesture/);
  assert.match(
    wrapperSource,
    /request\?\.initialAmount \?\? request\?\.detail\?\.initialAmount/,
  );
  assert.match(wrapperSource, /amount:\s*initialAmount/);
  assert.match(wrapperSource, /openManualExpenseWithAmount\(request\)/);
  assert.doesNotMatch(wrapperSource, /MutationObserver|querySelector|_valueTracker/);

  assert.match(coreSource, /const openManualExpenseModal = useCallback/);
  assert.match(summarySource, /orb\.openManualExpense\(undefined, amount\)/);
});
