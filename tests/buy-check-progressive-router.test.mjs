import test from "node:test";
import assert from "node:assert/strict";
import {
  CLARA_BUY_CHECK_PHASE,
  applyLocalPurchaseFacts,
  claraFutureCommitmentAmount,
  claraPaymentAmountDueNow,
  claraTotalCommitment,
  hasConfirmedClaraPaymentStructure,
  hasConfirmedClaraPurchasePrice,
  isClaraPurchaseContextMature,
  mergeClaraPurchaseEvidence,
  routeClaraBuyCheckPhase,
} from "../src/lib/clara-buy-check-intelligence-router.js";

test("first turn preserves ESTABLISH architecture even when local facts are rich", () => {
  const evidence = applyLocalPurchaseFacts("I need shoes for ₱1,500 because mine broke and I have work tomorrow.", {});
  assert.equal(routeClaraBuyCheckPhase({ connected: false, evidence }), CLARA_BUY_CHECK_PHASE.ESTABLISH);
  assert.equal(isClaraPurchaseContextMature(evidence), true);
});

test("a direct one-time amount becomes authoritative", () => {
  const evidence = applyLocalPurchaseFacts("I want to buy shoes for ₱2,500", {});
  assert.equal(hasConfirmedClaraPurchasePrice(evidence), true);
  assert.equal(hasConfirmedClaraPaymentStructure(evidence), true);
  assert.equal(evidence.price, 2500);
  assert.equal(evidence.purchaseType, "one_time");
});

test("pure want requires one meaningful decision signal before metric", () => {
  const purchase = applyLocalPurchaseFacts("Can I buy a T-shirt for ₱1,000?", {});
  const reason = applyLocalPurchaseFacts("I just like the design.", purchase);
  assert.equal(isClaraPurchaseContextMature(reason), false);

  const context = applyLocalPurchaseFacts("I already have enough shirts. Nothing happens if I wait.", reason);
  assert.equal(isClaraPurchaseContextMature(context), true);
  assert.equal(routeClaraBuyCheckPhase({ connected: true, evidence: context }), CLARA_BUY_CHECK_PHASE.METRIC);
});

test("rich urgent need can become mature immediately without redundant discovery", () => {
  const evidence = applyLocalPurchaseFacts("I need shoes for ₱1,500 because mine broke and I have work tomorrow.", {});
  assert.equal(evidence.item.toLowerCase(), "shoes");
  assert.equal(claraPaymentAmountDueNow(evidence), 1500);
  assert.match(evidence.currentSituation, /broke/i);
  assert.match(evidence.urgency, /tomorrow/i);
  assert.equal(isClaraPurchaseContextMature(evidence), true);
});

test("voucher math remains a candidate until the user confirms it", () => {
  const pending = applyLocalPurchaseFacts("The shoes are ₱2,500 but I have a ₱500 voucher", {});
  assert.equal(hasConfirmedClaraPaymentStructure(pending), false);
  assert.equal(pending.priceCandidate, 2000);
  assert.equal(pending.priceStatus, "needs_confirmation");

  const confirmed = applyLocalPurchaseFacts("Yes", pending);
  assert.equal(hasConfirmedClaraPaymentStructure(confirmed), true);
  assert.equal(confirmed.price, 2000);
  assert.equal(confirmed.priceSource, "user_confirmation");
});

test("app-derived voucher candidate cannot be overwritten by Gemini", () => {
  const pending = applyLocalPurchaseFacts(
    "Can I buy these shoes? They cost ₱2,500 but I have a ₱500 voucher.",
    {},
  );
  const merged = mergeClaraPurchaseEvidence(pending, {
    item: "shoes",
    purchaseType: "one_time",
    priceCandidate: 2500,
    priceStatus: "needs_confirmation",
    purpose: "buying shoes",
  });

  assert.equal(merged.priceCandidate, 2000);
  assert.equal(merged.priceStatus, "needs_confirmation");
  assert.equal(merged.purpose, "buying shoes");
});

test("user confirmation overrides the older pending voucher candidate", () => {
  const pending = applyLocalPurchaseFacts(
    "Can I buy these shoes? They cost ₱2,500 but I have a ₱500 voucher.",
    {},
  );
  const confirmed = applyLocalPurchaseFacts("Yes", pending);
  const merged = mergeClaraPurchaseEvidence(pending, confirmed);

  assert.equal(hasConfirmedClaraPaymentStructure(merged), true);
  assert.equal(merged.price, 2000);
  assert.equal(merged.priceStatus, "confirmed");
  assert.equal(merged.priceSource, "user_confirmation");
});

test("installment shorthand never collapses into a one-time price", () => {
  const pending = applyLocalPurchaseFacts("Can I get a phone? It’s ₱1,500 per month for 6 months.", {});
  assert.equal(pending.purchaseType, "installment");
  assert.equal(hasConfirmedClaraPurchasePrice(pending), false);
  assert.equal(hasConfirmedClaraPaymentStructure(pending), false);
  assert.equal(pending.amountDueNow, 1500);
  assert.equal(pending.paymentAmount, 1500);
  assert.equal(pending.remainingPayments, 5);
  assert.equal(pending.totalPayments, 6);
  assert.equal(pending.totalCommitment, 9000);
  assert.equal(pending.paymentStructureStatus, "needs_confirmation");
});

test("app-derived pending installment cannot be collapsed by Gemini", () => {
  const pending = applyLocalPurchaseFacts("Can I get a phone? It’s ₱1,500 per month for 6 months.", {});
  const merged = mergeClaraPurchaseEvidence(pending, {
    purchaseType: "installment",
    amountDueNow: 1500,
    paymentAmount: 1500,
    remainingPayments: 0,
    totalPayments: 1,
    totalCommitment: 1500,
    frequency: "monthly",
    paymentStructureStatus: "needs_confirmation",
  });

  assert.equal(merged.amountDueNow, 1500);
  assert.equal(merged.paymentAmount, 1500);
  assert.equal(merged.remainingPayments, 5);
  assert.equal(merged.totalPayments, 6);
  assert.equal(merged.totalCommitment, 9000);
});

test("user confirmation locks the installment as 1500 due now and 9000 total", () => {
  const pending = applyLocalPurchaseFacts("Can I get a phone? It’s ₱1,500 per month for 6 months.", {});
  const confirmed = applyLocalPurchaseFacts("Yes", pending);
  assert.equal(hasConfirmedClaraPaymentStructure(confirmed), true);
  assert.equal(confirmed.paymentStructureStatus, "confirmed");
  assert.equal(claraPaymentAmountDueNow(confirmed), 1500);
  assert.equal(claraTotalCommitment(confirmed), 9000);
  assert.equal(claraFutureCommitmentAmount(confirmed), 7500);
});

test("user confirmation overrides the older pending installment structure", () => {
  const pending = applyLocalPurchaseFacts("Can I get a phone? It’s ₱1,500 per month for 6 months.", {});
  const confirmed = applyLocalPurchaseFacts("Yes", pending);
  const merged = mergeClaraPurchaseEvidence(pending, confirmed);

  assert.equal(hasConfirmedClaraPaymentStructure(merged), true);
  assert.equal(merged.paymentStructureStatus, "confirmed");
  assert.equal(merged.paymentStructureSource, "user_confirmation");
  assert.equal(claraPaymentAmountDueNow(merged), 1500);
  assert.equal(claraTotalCommitment(merged), 9000);
  assert.equal(claraFutureCommitmentAmount(merged), 7500);
});

test("an explicit installment with no fees can be confirmed directly", () => {
  const evidence = applyLocalPurchaseFacts(
    "The phone is ₱1,500 today, then ₱1,500 every month for 5 additional months, with no fees.",
    {},
  );
  assert.equal(hasConfirmedClaraPaymentStructure(evidence), true);
  assert.equal(evidence.purchaseType, "installment");
  assert.equal(evidence.amountDueNow, 1500);
  assert.equal(evidence.remainingPayments, 5);
  assert.equal(evidence.totalCommitment, 9000);
  assert.equal(evidence.fees, 0);
});
