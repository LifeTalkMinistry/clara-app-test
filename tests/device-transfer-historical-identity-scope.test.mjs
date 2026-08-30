import test from "node:test";
import assert from "node:assert/strict";

import { financialDateKey, addFinancialDays } from "../src/lib/clara-financial-day.js";
import { normalizePreparedFinancialContext } from "../src/lib/clara-financial-context-migration.js";

function preparedWithLegacyFulfillment({ recordDate }) {
  const today = financialDateKey(new Date());
  const cycleStart = addFinancialDays(today, -5);
  const cycleEnd = addFinancialDays(today, 10);
  const expenseId = `expense-${recordDate}`;

  return {
    data: {
      localStorage: {},
      indexedDB: {
        supported: true,
        databases: [
          {
            name: "clara_local_finance",
            stores: {
              private_preferences: {
                records: [
                  {
                    id: `means-cycle-baseline:test:${cycleStart}:${cycleEnd}`,
                    recordKind: "means_cycle_baseline",
                    cycleStart,
                    cycleEnd,
                    baseline: {
                      version: 7,
                      cycleStart,
                      cycleEnd,
                      cycle100Anchor: 5000,
                    },
                  },
                ],
              },
              expenses: {
                records: [
                  {
                    id: expenseId,
                    title: "Legacy planned item",
                    amount: 500,
                    date: recordDate,
                    source: "money_schedule",
                    planning_status: "planned",
                  },
                ],
              },
              wallet_transactions: {
                records: [
                  {
                    id: `txn-${recordDate}`,
                    expense_id: expenseId,
                    amount: 500,
                    type: "expense",
                    date: recordDate,
                    source: "local",
                  },
                ],
              },
            },
          },
        ],
      },
    },
  };
}

test("historical ambiguous legacy identity does not block active-cycle migration", () => {
  const today = financialDateKey(new Date());
  const historicalDate = addFinancialDays(today, -20);
  const result = normalizePreparedFinancialContext(
    preparedWithLegacyFulfillment({ recordDate: historicalDate })
  );

  assert.deepEqual(result.unresolved, []);
});

test("active-cycle ambiguous legacy identity still fails closed", () => {
  const today = financialDateKey(new Date());
  const result = normalizePreparedFinancialContext(
    preparedWithLegacyFulfillment({ recordDate: today })
  );

  assert.ok(
    result.unresolved.some(
      (item) => item.code === "legacy_requirement_identity_unresolved"
    )
  );
});
