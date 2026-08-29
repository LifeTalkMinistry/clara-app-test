import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getDebtOccurrenceState } from "../src/lib/debtOccurrenceState.js";

const referenceDate = new Date("2026-08-29T04:00:00.000Z");

const recurringDebt = (paymentHistory = []) => ({
  id: "debt_cash_insurance",
  recordKind: "debt_obligation",
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

test("old paid periods do not make Pay Obligation crawl month-by-month through historical occurrences", () => {
  const record = recurringDebt([
    {
      amount: 81,
      dueDate: "2026-01-27",
      paidAt: "2026-01-28T01:00:00.000Z",
    },
    {
      amount: 81,
      dueDate: "2026-02-27",
      paidAt: "2026-02-28T01:00:00.000Z",
    },
  ]);

  const occurrence = getDebtOccurrenceState(record, referenceDate);
  assert.equal(occurrence.dueDate, "2026-08-27");
  assert.equal(occurrence.state, "overdue");
});

test("full payment of the active period advances directly to the next scheduled period", () => {
  const record = recurringDebt([
    {
      amount: 81,
      dueDate: "2026-08-27",
      paidAt: "2026-08-28T01:00:00.000Z",
    },
  ]);

  const occurrence = getDebtOccurrenceState(record, referenceDate);
  assert.equal(occurrence.dueDate, "2026-09-27");
  assert.equal(occurrence.state, "upcoming");
});

test("partial payment keeps the active period open until its indicated amount is fully satisfied", () => {
  const record = recurringDebt([
    {
      amount: 40,
      dueDate: "2026-08-27",
      paidAt: "2026-08-28T01:00:00.000Z",
    },
  ]);

  const occurrence = getDebtOccurrenceState(record, referenceDate);
  assert.equal(occurrence.dueDate, "2026-08-27");
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
  assert.match(source, /const effectiveRecord =/);
  assert.match(source, /setLocalRecord\(paymentResult\.debt\)/);
  assert.match(source, /const mode = getDebtObligationMode\(effectiveRecord\)/);
});
