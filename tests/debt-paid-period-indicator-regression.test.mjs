import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getDebtOccurrenceState } from "../src/lib/debtOccurrenceState.js";

const referenceDate = new Date("2026-08-29T04:00:00.000Z");

const recurringDebt = (paymentHistory) => ({
  id: "debt_cash_insurance",
  title: "Cash Insurance",
  obligationMode: "recurring",
  obligation_mode: "recurring",
  monthlyDebt: 81,
  monthlyPayment: 81,
  monthly_payment: 81,
  dueDay: 27,
  due_day: 27,
  status: "active",
  paymentHistory,
  payment_history: paymentHistory,
});

test("full structured payment history advances past the satisfied occurrence even without a paidOccurrences marker", () => {
  const record = recurringDebt([
    {
      amount: 81,
      dueDate: "2026-02-27",
      paidAt: "2026-02-28T01:00:00.000Z",
    },
  ]);

  const occurrence = getDebtOccurrenceState(record, referenceDate);
  assert.equal(occurrence.dueDate, "2026-03-27");
  assert.equal(occurrence.state, "overdue");
});

test("partial structured payment history keeps the same occurrence open", () => {
  const record = recurringDebt([
    {
      amount: 40,
      dueDate: "2026-02-27",
      paidAt: "2026-02-28T01:00:00.000Z",
    },
  ]);

  const occurrence = getDebtOccurrenceState(record, referenceDate);
  assert.equal(occurrence.dueDate, "2026-02-27");
  assert.equal(occurrence.state, "overdue");
});

test("debt card keeps a persistent paid-period indicator in the expanded obligation UI", () => {
  const source = readFileSync(
    new URL("../src/components/financial-carousel/cards/debt/ui/DebtObligationItem.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /Last paid period/);
  assert.match(source, /getPaidDebtOccurrenceDates/);
  assert.match(source, /latestPaidOccurrence\.label/);
  assert.match(source, /This period/);
});
