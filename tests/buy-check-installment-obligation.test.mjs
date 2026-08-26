import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildClaraInstallmentObligationPayload,
  normalizeClaraInstallmentDueDay,
} from "../src/lib/clara-buy-check-installment-obligation.js";

const confirmedInstallment = {
  purchaseType: "installment",
  amountDueNow: 1500,
  paymentAmount: 1500,
  remainingPayments: 5,
  totalPayments: 6,
  totalCommitment: 9000,
  frequency: "monthly",
  fees: 0,
};

test("Buy Check converts a confirmed installment into an obligation payload", () => {
  const payload = buildClaraInstallmentObligationPayload({
    item: "phone",
    reason: "Current phone still works; user chose the upgrade anyway.",
    paymentStructure: confirmedInstallment,
    dueDay: 15,
    sessionId: "buy-check-test",
  });

  assert.equal(payload.title, "phone");
  assert.equal(payload.debtType, "installment");
  assert.equal(payload.obligationMode, "balance");
  assert.equal(payload.totalDebt, 9000);
  assert.equal(payload.monthlyDebt, 1500);
  assert.equal(payload.dueDay, 15);
  assert.equal(payload.installmentAmountDueNow, 1500);
  assert.equal(payload.installmentRemainingPaymentsAfterInitial, 5);
  assert.equal(payload.installmentTotalPayments, 6);
  assert.equal(payload.installmentTotalCommitment, 9000);
  assert.equal(payload.sourceFeature, "ask_before_you_spend");
  assert.match(payload.notes, /Debt \/ Obligations|installment obligation/i);
  assert.match(payload.notes, /₱9,000 total commitment/i);
});

test("installment documentation requires a real monthly due day", () => {
  assert.equal(normalizeClaraInstallmentDueDay(1), 1);
  assert.equal(normalizeClaraInstallmentDueDay(31), 31);
  assert.equal(normalizeClaraInstallmentDueDay(0), null);
  assert.equal(normalizeClaraInstallmentDueDay(32), null);

  assert.throws(
    () => buildClaraInstallmentObligationPayload({
      item: "phone",
      paymentStructure: confirmedInstallment,
      dueDay: "",
    }),
    /day of the month/i,
  );
});

test("unsupported installment frequencies are not silently forced into the monthly obligation model", () => {
  assert.throws(
    () => buildClaraInstallmentObligationPayload({
      item: "phone",
      paymentStructure: { ...confirmedInstallment, frequency: "weekly" },
      dueDay: 15,
    }),
    /monthly installment schedules only/i,
  );
});

test("Buy Check saves installment purchases to Debt / Obligations before the expense path", () => {
  const source = fs.readFileSync(
    new URL("../src/components/fresh/main-dashboard/assistant/useClaraBuyCheckFlowV5.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /buildClaraInstallmentObligationPayload/);
  assert.match(source, /upsertDebtObligation/);
  assert.match(source, /recordMode:\s*installmentDocumentation[\s\S]*installment_obligation/);
  assert.match(source, /source:\s*"buy_check_installment_obligation"/);
  assert.match(source, /Installment documented/);
  assert.match(source, /No wallet money was deducted yet/);
  assert.doesNotMatch(source, /cannot safely record the future payment schedule yet/);

  const obligationBranch = source.indexOf('decision.choice === "buy" && paymentStructure');
  const expenseWrite = source.indexOf("await addBuyCheckExpense");
  assert.ok(obligationBranch >= 0 && expenseWrite > obligationBranch);
});

test("Buy Check installment UI documents an obligation instead of asking for a wallet", () => {
  const source = fs.readFileSync(
    new URL("../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /INSTALLMENT TO DOCUMENT/);
  assert.match(source, /Debt \/ Obligations instead of logging it as a one-time expense/);
  assert.match(source, /DUE EACH MONTH/);
  assert.match(source, /Document installment/);
  assert.match(source, /No wallet money is deducted just for documenting it/);
  assert.match(source, /onInstallmentDueDayChange/);
  assert.match(source, /isInstallment \? \(/);
  assert.match(source, /\) : isBuy \? \(/);
  assert.match(source, /isBuy && !isInstallment && !selectedWallet/);
});

test("installment due day uses a native 1-31 picker instead of a fragile text input", () => {
  const source = fs.readFileSync(
    new URL("../src/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentOverlayV2.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-clara-installment-due-day-picker="true"/);
  assert.match(source, /<select[\s\S]*id="clara-installment-due-day"/);
  assert.match(source, /Array\.from\(\{ length: 31 \}/);
  assert.match(source, /Choose day/);
  assert.doesNotMatch(source, /placeholder="1-31"/);
  assert.match(source, /installment-obligation-day-picker/);
});
