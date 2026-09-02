import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEBT_OBLIGATION_RECORD_KIND,
  estimateDebtPayoffMonths,
  getDebtObligationMode,
  getNextDebtDueDate,
  isActiveDebtObligation,
  isDebtLinkedExpense,
  summarizeDebtObligationsPure,
} from "../src/lib/debtObligationMath.js";

test("legacy paid balances stay inactive while recurring obligations remain active", () => {
  const legacyPaid = {
    recordKind: DEBT_OBLIGATION_RECORD_KIND,
    status: "active",
    totalDebt: 0,
    monthlyDebt: 2500,
  };
  assert.equal(getDebtObligationMode(legacyPaid), "balance");
  assert.equal(isActiveDebtObligation(legacyPaid), false);
  assert.equal(
    isActiveDebtObligation({ ...legacyPaid, obligationMode: "recurring" }),
    true,
  );
});

test("completed balances are excluded from current debt pressure", () => {
  const summary = summarizeDebtObligationsPure(
    [
      {
        recordKind: DEBT_OBLIGATION_RECORD_KIND,
        status: "active",
        obligationMode: "balance",
        totalDebt: 50000,
        monthlyDebt: 6000,
      },
      {
        recordKind: DEBT_OBLIGATION_RECORD_KIND,
        status: "completed",
        obligationMode: "balance",
        totalDebt: 0,
        monthlyDebt: 4000,
      },
    ],
    { income: 30000 },
  );
  assert.equal(summary.activeCount, 1);
  assert.equal(summary.monthlyDebt, 6000);
  assert.equal(summary.debtRatio, 20);
});

test("payoff math handles interest and negative amortization", () => {
  const withoutInterest = estimateDebtPayoffMonths({
    balance: 10000,
    monthlyPayment: 1000,
    annualInterestRate: 0,
  });
  const withInterest = estimateDebtPayoffMonths({
    balance: 10000,
    monthlyPayment: 1000,
    annualInterestRate: 24,
  });
  const impossible = estimateDebtPayoffMonths({
    balance: 100000,
    monthlyPayment: 1000,
    annualInterestRate: 24,
  });
  assert.equal(withoutInterest, 10);
  assert.ok(withInterest > withoutInterest);
  assert.equal(impossible, Number.POSITIVE_INFINITY);
});

test("monthly due dates roll forward and debt expenses remain identifiable", () => {
  const next = getNextDebtDueDate(
    { dueDate: "2025-01-31" },
    new Date("2026-02-10T00:00:00"),
  );
  assert.equal(next?.getFullYear(), 2026);
  assert.equal(next?.getMonth(), 1);
  assert.equal(next?.getDate(), 28);
  assert.equal(isDebtLinkedExpense({ linked_target_type: "debt" }, []), true);
  assert.equal(
    isDebtLinkedExpense(
      { category: "Home Credit" },
      [{ title: "Home Credit" }],
    ),
    true,
  );
  assert.equal(
    isDebtLinkedExpense(
      { category: "Groceries" },
      [{ title: "Home Credit" }],
    ),
    false,
  );
});

test("Debt / Obligations primary selector reflects normal worker commitments while legacy debt types remain readable", async () => {
  const logic = await readFile(
    new URL("../src/components/financial-carousel/cards/debt/logic/useDebtCardLogic.js", import.meta.url),
    "utf8",
  );
  const overlay = await readFile(
    new URL("../src/components/fresh/main-dashboard/assistant/ClaraDebtObligationOverlay.jsx", import.meta.url),
    "utf8",
  );

  for (const label of [
    "Housing / Rent",
    "Utilities",
    "Family Support",
    "Transportation",
    "Insurance",
    "Education",
    "Loan / Debt",
    "Other",
  ]) {
    assert.match(logic, new RegExp(label.replace("/", "\\/")));
  }

  assert.match(logic, /export const DEBT_TYPES = OBLIGATION_TYPES/);
  assert.match(logic, /LEGACY_DEBT_TYPES/);
  assert.match(logic, /Credit Card/);
  assert.match(logic, /Installment/);
  assert.match(logic, /Mortgage/);
  assert.match(logic, /Personal Debt/);
  assert.match(overlay, /DEBT_TYPES\.map/);
});
