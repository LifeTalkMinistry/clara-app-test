import test from "node:test";
import assert from "node:assert/strict";
import { resetMonthlyBudgetCycle } from "../src/lib/clara-budget-cycle-reset.js";

test("reset uses the exact reset time instead of the cycle start date", async () => {
  const createdRows = [];

  const result = await resetMonthlyBudgetCycle({
    budgets: [],
    headerPayload: {
      cycle_start: "2026-07-01",
      period_start: "2026-07-01",
      cycle_end: "2026-07-31",
      status: "draft",
    },
    categoryPayloads: [
      {
        title: "Food",
        cycle_start: "2026-07-01",
        period_start: "2026-07-01",
      },
    ],
    addBudget: async (payload) => {
      createdRows.push(payload);
      return payload;
    },
    updateBudget: async () => {},
  });

  const [header, category] = createdRows;

  assert.match(header.reset_start_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.notEqual(header.reset_start_at, header.cycle_start);
  assert.equal(header.tracking_started_at, header.reset_start_at);
  assert.equal(header.tracking_start_date, header.reset_start_at);
  assert.equal(category.reset_start_at, header.reset_start_at);
  assert.equal(category.tracking_started_at, header.reset_start_at);
  assert.equal(result.newHeader.reset_start_at, header.reset_start_at);
});

test("an explicit tracking boundary is preserved", async () => {
  const boundary = "2026-07-29T19:15:00.000Z";

  const result = await resetMonthlyBudgetCycle({
    headerPayload: {
      cycle_start: "2026-07-01",
      reset_start_at: boundary,
    },
    addBudget: async (payload) => payload,
    updateBudget: async () => {},
  });

  assert.equal(result.newHeader.reset_start_at, boundary);
  assert.equal(result.newHeader.tracking_started_at, boundary);
  assert.equal(result.newHeader.tracking_start_date, boundary);
});
