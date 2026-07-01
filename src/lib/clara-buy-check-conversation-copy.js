import { clean, money } from "./clara-buy-check-budget-core.js";

function priceStepMessage() {
  return "Why do you want to buy it? You can say replacement, work need, reward, health, hobby, or simply that you want it.";
}

function confirmationText(flow = {}) {
  const item = clean(flow.item || "this item");
  const price = money(flow.price);
  const reason = clean(flow.reason);

  if (reason) {
    return `You’re considering ${item} for ${price} because ${reason}. Did I get that right before I run the full Buy Check?`;
  }

  return `You’re considering ${item} for ${price}. Did I get that right before I run the full Buy Check?`;
}

export { confirmationText, priceStepMessage };
