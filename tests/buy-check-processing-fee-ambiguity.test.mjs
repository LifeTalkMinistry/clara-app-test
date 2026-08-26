import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  applyLocalPurchaseFacts,
  claraFutureCommitmentAmount,
  claraPaymentAmountDueNow,
  claraTotalCommitment,
  hasConfirmedClaraPaymentStructure,
} from "../src/lib/clara-buy-check-intelligence-router.js";

const prompt = "Can I get this laptop? It’s ₱2,000 per month for 6 months, plus a ₱600 processing fee.";

test("processing fee before the fee label is preserved as unresolved payment authority", () => {
  const pending = applyLocalPurchaseFacts(prompt, {});

  assert.equal(pending.purchaseType, "installment");
  assert.equal(pending.amountDueNow, 2000);
  assert.equal(pending.paymentAmount, 2000);
  assert.equal(pending.remainingPayments, 5);
  assert.equal(pending.totalPayments, 6);
  assert.equal(pending.fees, 600);
  assert.equal(pending.feeTreatment, "unresolved");
  assert.equal(pending.totalCommitment, 12600);
  assert.equal(pending.paymentStructureStatus, "needs_confirmation");
  assert.equal(hasConfirmedClaraPaymentStructure(pending), false);
});

test("a generic yes cannot confirm an installment while fee timing is unresolved", () => {
  const pending = applyLocalPurchaseFacts(prompt, {});
  const stillPending = applyLocalPurchaseFacts("Yes", pending);

  assert.equal(stillPending.fees, 600);
  assert.equal(stillPending.feeTreatment, "unresolved");
  assert.equal(stillPending.paymentStructureStatus, "needs_confirmation");
  assert.equal(hasConfirmedClaraPaymentStructure(stillPending), false);
});

test("upfront fee reply updates due-now amount before final confirmation", () => {
  const pending = applyLocalPurchaseFacts(prompt, {});
  const feeResolved = applyLocalPurchaseFacts("It’s paid upfront.", pending);

  assert.equal(feeResolved.feeTreatment, "upfront");
  assert.equal(feeResolved.amountDueNow, 2600);
  assert.equal(feeResolved.paymentAmount, 2000);
  assert.equal(feeResolved.totalCommitment, 12600);
  assert.equal(feeResolved.paymentStructureStatus, "needs_confirmation");
  assert.equal(hasConfirmedClaraPaymentStructure(feeResolved), false);

  const confirmed = applyLocalPurchaseFacts("Yes", feeResolved);
  assert.equal(hasConfirmedClaraPaymentStructure(confirmed), true);
  assert.equal(claraPaymentAmountDueNow(confirmed), 2600);
  assert.equal(claraTotalCommitment(confirmed), 12600);
  assert.equal(claraFutureCommitmentAmount(confirmed), 10000);
});

test("separate-later fee remains part of total commitment without inflating due now", () => {
  const pending = applyLocalPurchaseFacts(prompt, {});
  const feeResolved = applyLocalPurchaseFacts("It’s paid separately later.", pending);

  assert.equal(feeResolved.feeTreatment, "separate_later");
  assert.equal(feeResolved.amountDueNow, 2000);
  assert.equal(feeResolved.paymentAmount, 2000);
  assert.equal(feeResolved.totalCommitment, 12600);
  assert.equal(feeResolved.paymentStructureStatus, "needs_confirmation");
});

test("split-evenly fee becomes 2100 per payment", () => {
  const pending = applyLocalPurchaseFacts(prompt, {});
  const feeResolved = applyLocalPurchaseFacts("It’s split evenly across the 6 payments.", pending);

  assert.equal(feeResolved.feeTreatment, "split_evenly");
  assert.equal(feeResolved.amountDueNow, 2100);
  assert.equal(feeResolved.paymentAmount, 2100);
  assert.equal(feeResolved.totalCommitment, 12600);
  assert.equal(feeResolved.paymentStructureStatus, "needs_confirmation");
});

test("expert fallback asks specifically how the known processing fee is paid", () => {
  const source = fs.readFileSync(
    new URL("../src/lib/clara-buy-check-expert-ai.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /processing fee paid—upfront, added to the installments, or separately later/);
  assert.match(source, /source\.feeTreatment === "unresolved"/);
  assert.match(source, /source\.feeTreatment === "installments_unspecified"/);
});
