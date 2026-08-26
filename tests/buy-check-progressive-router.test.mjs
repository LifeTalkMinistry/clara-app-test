import test from "node:test";
import assert from "node:assert/strict";
import {
  CLARA_BUY_CHECK_PHASE,
  applyLocalPurchaseFacts,
  hasConfirmedClaraPurchasePrice,
  isClaraPurchaseContextMature,
  routeClaraBuyCheckPhase,
} from "../src/lib/clara-buy-check-intelligence-router.js";

test("first turn always establishes connection without needing financial context", () => {
  const evidence = applyLocalPurchaseFacts("Can I buy a shirt for ₱1,000?", {});
  assert.equal(evidence.price, 1000);
  assert.equal(evidence.priceStatus, "confirmed");
  assert.equal(routeClaraBuyCheckPhase({ connected: false, evidence }), CLARA_BUY_CHECK_PHASE.ESTABLISH);
});

test("a direct single user-stated amount becomes authoritative", () => {
  const evidence = applyLocalPurchaseFacts("I want to buy shoes for ₱2,500", {});
  assert.equal(hasConfirmedClaraPurchasePrice(evidence), true);
  assert.equal(evidence.price, 2500);
  assert.equal(evidence.priceSource, "user_direct");
});

test("discounts and multiple amounts stay unconfirmed", () => {
  const evidence = applyLocalPurchaseFacts("The shoes are ₱2,500 but I have a ₱500 voucher", {});
  assert.equal(hasConfirmedClaraPurchasePrice(evidence), false);
  assert.equal(evidence.priceStatus, "needs_confirmation");
});

test("user confirmation locks a Gemini-proposed payable candidate", () => {
  const pending = {
    item: "shoes",
    priceCandidate: 2000,
    priceStatus: "needs_confirmation",
  };
  const evidence = applyLocalPurchaseFacts("Yes", pending);
  assert.equal(evidence.price, 2000);
  assert.equal(evidence.priceStatus, "confirmed");
  assert.equal(evidence.priceSource, "user_confirmation");
});

test("item and confirmed price are not enough for the metric phase", () => {
  const evidence = {
    item: "T-shirt",
    price: 1000,
    priceStatus: "confirmed",
    priceSource: "user_direct",
  };
  assert.equal(isClaraPurchaseContextMature(evidence), false);
  assert.equal(routeClaraBuyCheckPhase({ connected: true, evidence }), CLARA_BUY_CHECK_PHASE.DISCOVER);
});

test("purpose plus one meaningful decision signal unlocks metric phase", () => {
  const evidence = {
    item: "work shoes",
    price: 1000,
    priceStatus: "confirmed",
    priceSource: "user_direct",
    purpose: "Replacing broken work shoes",
    urgency: "Needed for work tomorrow",
  };
  assert.equal(isClaraPurchaseContextMature(evidence), true);
  assert.equal(routeClaraBuyCheckPhase({ connected: true, evidence }), CLARA_BUY_CHECK_PHASE.METRIC);
});


test("local discovery fallback carries reason and waiting consequence forward", () => {
  const purchase = applyLocalPurchaseFacts("Can I buy a T-shirt for ₱1,000?", {});
  const reason = applyLocalPurchaseFacts("I just like the design.", purchase);
  assert.equal(reason.purpose, "I just like the design.");
  assert.equal(isClaraPurchaseContextMature(reason), false);

  const context = applyLocalPurchaseFacts(
    "I already have enough shirts. Nothing happens if I wait.",
    reason,
  );
  assert.equal(context.consequenceOfWaiting, "I already have enough shirts. Nothing happens if I wait.");
  assert.equal(isClaraPurchaseContextMature(context), true);
  assert.equal(routeClaraBuyCheckPhase({ connected: true, evidence: context }), CLARA_BUY_CHECK_PHASE.METRIC);
});
