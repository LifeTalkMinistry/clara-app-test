export function formatMoneyForClara(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "₱0";
  return `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export function extractPurchaseAmount(message = "") {
  const matches = String(message || "")
    .replace(/,/g, "")
    .match(/(?:₱|php\s*)?\d+(?:\.\d{1,2})?/gi);

  if (!matches?.length) return null;

  const amounts = matches
    .map((match) => Number(match.replace(/php/gi, "").replace(/₱/g, "").trim()))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  return amounts.length ? Math.max(...amounts) : null;
}

export function createMoneyAwareFallbackReply({ message, walletMoney = 0, thisMonthSpent = 0, budgetAllocated = 0, budgetRemaining = 0 }) {
  const text = String(message || "").trim();
  const amount = extractPurchaseAmount(text);
  const available = Number(walletMoney) || 0;
  const spent = Number(thisMonthSpent) || 0;
  const hasActiveBudget = Number(budgetAllocated) > 0;
  const availableText = formatMoneyForClara(available);
  const spentText = formatMoneyForClara(spent);

  if (/what exact financial|currently see|what can you see|how much money|total expense|spent this month|financial information|card data/i.test(text)) {
    return `I can currently see ${availableText} money left and ${spentText} total expense this month from your dashboard cards.`;
  }

  if (!amount) {
    return `I can see ${availableText} money left and ${spentText} spent this month. Add a price only if you want a purchase decision.`;
  }

  const amountText = formatMoneyForClara(amount);

  if (available <= 0) {
    return `Not recommended. I can’t confirm available money right now, so don’t treat this as safe yet. Add or refresh your wallet first.`;
  }

  if (amount > available) {
    return `Not recommended. ${amountText} is higher than your visible money left of ${availableText}. Delay it or lower the cost.`;
  }

  const share = amount / available;

  if (!hasActiveBudget) {
    if (share >= 0.75) {
      return `Not recommended. You have ${availableText} money left, but ${amountText} would use almost all of it and no active budget plan is loaded yet. Delay this or set a budget first.`;
    }

    if (share >= 0.12) {
      return `Better delay. You have ${availableText} money left, but no active budget plan is loaded yet, so ${amountText} needs a pause. Buy only if this is planned or important.`;
    }

    return `Okay with limit. You have ${availableText} money left, but no active budget plan is loaded yet. ${amountText} is affordable, but log it and keep it intentional.`;
  }

  const remaining = Number(budgetRemaining) || 0;
  const remainingText = formatMoneyForClara(remaining);

  if (amount > remaining) {
    return `Better delay. You have ${availableText} money left, but only ${remainingText} remains in your active budget. Rebalance first or reduce the cost.`;
  }

  if (share >= 0.75) {
    return `Not recommended. ${amountText} would use most of your ${availableText} money left. Delay this unless it is urgent and planned.`;
  }

  if (share >= 0.12) {
    return `Okay with limit. You can afford ${amountText}, but it is a noticeable part of your ${availableText} money left. Buy only if it is planned.`;
  }

  return `Safe, but still intentional. ${amountText} fits within your ${availableText} money left. Log it after buying.`;
}
