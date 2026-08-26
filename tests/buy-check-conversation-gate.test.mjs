import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClaraBuyCheckDiscoveryQuestion,
  getClaraBuyCheckDiscoveryState,
  shouldRevealClaraBuyCheckMeans,
} from "../src/lib/clara-buy-check-conversation-gate.js";

test("item and price alone stay in discovery", () => {
  const evidence = { item: "T-shirt", price: 1000 };
  assert.equal(getClaraBuyCheckDiscoveryState(evidence).mature, false);
  assert.equal(buildClaraBuyCheckDiscoveryQuestion(evidence), "What’s making you want to buy it today?");
  assert.equal(shouldRevealClaraBuyCheckMeans("ready", evidence), false);
});

test("one motive answer still asks one more meaningful question", () => {
  const evidence = { item: "T-shirt", price: 1000, purpose: "I like the design" };
  assert.equal(getClaraBuyCheckDiscoveryState(evidence).mature, false);
  assert.equal(
    buildClaraBuyCheckDiscoveryQuestion(evidence),
    "If you skip it today, would anything important actually be affected?",
  );
});

test("motive plus urgency is mature enough for a decision", () => {
  const evidence = {
    item: "Work shoes",
    price: 1000,
    purpose: "Replacing my work shoes",
    urgency: "Mine broke and I need them tomorrow",
  };
  assert.equal(getClaraBuyCheckDiscoveryState(evidence).mature, true);
  assert.equal(shouldRevealClaraBuyCheckMeans("ready", evidence), true);
});

test("purpose plus concrete current situation can be mature immediately", () => {
  const evidence = {
    item: "Work shoes",
    price: 1000,
    purpose: "Need shoes for work",
    currentSituation: "My only pair is damaged",
  };
  assert.equal(getClaraBuyCheckDiscoveryState(evidence).mature, true);
});

test("Means stays hidden on probe even when context is mature", () => {
  const evidence = {
    item: "Work shoes",
    price: 1000,
    purpose: "Need shoes for work",
    urgency: "Need them tomorrow",
  };
  assert.equal(shouldRevealClaraBuyCheckMeans("probe", evidence), false);
  assert.equal(shouldRevealClaraBuyCheckMeans("reassess", evidence), true);
});
