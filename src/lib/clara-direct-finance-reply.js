const USE_CONTEXTUAL_FINANCE_REPLY = true;

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9₱.,\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function money(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
    : "₱0";
}

function toNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const number = typeof value === "number" ? value : Number(String(value).replace(/[₱,\s]/g, ""));
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function toMaybeNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const number = typeof value === "number" ? value : Number(String(value).replace(/[₱,\s]/g, ""));
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function getWalletName(wallet = {}) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "Wallet").trim() || "Wallet";
}

function getWalletId(wallet = {}) {
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || "").trim();
}

function getWalletBalance(wallet = {}) {
  return toMaybeNumber(wallet?.derived_balance, wallet?.balance, wallet?.current_balance, wallet?.wallet_balance, wallet?.available_balance, wallet?.starting_balance, wallet?.amount);
}

function getWalletProtected(wallet = {}) {
  return toNumber(wallet?.emergencyProtectedAmount, wallet?.emergency_protected_amount, wallet?.protectedEmergencyAmount, wallet?.protected_emergency_amount);
}

function getEmergencyFundAmount(emergencyFund = {}) {
  return toNumber(emergencyFund?.protectedBalance, emergencyFund?.protected_balance, emergencyFund?.reserveBalance, emergencyFund?.reserve_balance, emergencyFund?.savedAmount, emergencyFund?.saved_amount, emergencyFund?.currentAmount, emergencyFund?.current_amount, emergencyFund?.amount, emergencyFund?.balance, emergencyFund?.moneyLeft);
}

function getEmergencyLink(emergencyFund = {}) {
  return {
    id: String(emergencyFund?.linkedWalletId || emergencyFund?.linked_wallet_id || emergencyFund?.reserveWalletId || emergencyFund?.reserve_wallet_id || "").trim(),
    name: String(emergencyFund?.linkedWalletName || emergencyFund?.linked_wallet_name || emergencyFund?.reserveWalletName || emergencyFund?.reserve_wallet_name || "").trim(),
  };
}

function findLinkedEmergencyWallet(emergencyFund = {}, wallets = []) {
  const link = getEmergencyLink(emergencyFund);
  return (Array.isArray(wallets) ? wallets : []).find((item) => (link.id && getWalletId(item) === link.id) || (link.name && getWalletName(item) === link.name)) || null;
}

function getEmergencyFundWalletName(emergencyFund = {}, wallets = []) {
  const link = getEmergencyLink(emergencyFund);
  const wallet = findLinkedEmergencyWallet(emergencyFund, wallets);
  return wallet ? getWalletName(wallet) : link.name || "an existing wallet";
}

function getBudgetPlan(context = {}) {
  return context?.budgetPlan || context?.monthlyBudgetPlan || context?.activeBudget || context?.derivedActiveBudget || context?.finance?.budgetPlan || {};
}

function getDeclaredBudget(context = {}) {
  const plan = getBudgetPlan(context);
  return toMaybeNumber(
    plan?.declaredBudget,
    plan?.declared_budget,
    plan?.declaredAmount,
    plan?.declared_amount,
    context?.declaredMonthlyBudgetAmount,
    context?.declared_budget,
    context?.activeBudget?.declaredBudget,
    context?.activeBudget?.declared_budget,
    context?.derivedActiveBudget?.declaredBudget,
    context?.derivedActiveBudget?.declared_budget,
    context?.budgetSummary?.declaredBudget
  );
}

function getBudgetSpent(context = {}) {
  const plan = getBudgetPlan(context);
  return toMaybeNumber(
    plan?.spentTotal,
    plan?.spent_total,
    plan?.totalSpent,
    plan?.spent,
    context?.budgetSpent,
    context?.monthlySpent,
    context?.totalExpensesThisMonth
  ) ?? 0;
}

function getSnapshot(context = {}) {
  const wallets = Array.isArray(context.wallets) ? context.wallets : [];
  const emergencyFund = context.emergencyFund || context.emergency_fund || {};
  const readableBalances = wallets.map(getWalletBalance).filter((value) => value !== null);
  const walletTotal = wallets.length && readableBalances.length ? readableBalances.reduce((sum, value) => sum + value, 0) : null;
  const protectedTotalFromWallets = wallets.reduce((sum, wallet) => sum + getWalletProtected(wallet), 0);
  const storedEmergencyAmount = getEmergencyFundAmount(emergencyFund);
  const linkedWallet = findLinkedEmergencyWallet(emergencyFund, wallets);
  const hasLink = Boolean(getEmergencyLink(emergencyFund).id || getEmergencyLink(emergencyFund).name);
  const orphanedEmergencyFund = storedEmergencyAmount > 0 && (!wallets.length || !linkedWallet || !hasLink);
  const emergencyAmount = orphanedEmergencyFund || walletTotal === null ? 0 : Math.min(Math.max(protectedTotalFromWallets, storedEmergencyAmount), walletTotal);
  const spendableTotal = walletTotal === null ? null : Math.max(walletTotal - emergencyAmount, 0);
  const linkedWalletName = getEmergencyFundWalletName(emergencyFund, wallets);
  const protectedWallet = wallets.find((wallet) => getWalletProtected(wallet) > 0);
  const declaredBudget = getDeclaredBudget(context);
  const spentBudget = getBudgetSpent(context);
  const remainingBudget = declaredBudget === null ? null : Math.max(declaredBudget - spentBudget, 0);

  return {
    wallets,
    emergencyFund,
    walletTotal,
    storedEmergencyAmount,
    orphanedEmergencyFund,
    emergencyAmount,
    spendableTotal,
    linkedWalletName: protectedWallet ? getWalletName(protectedWallet) : linkedWalletName,
    declaredBudget,
    spentBudget,
    remainingBudget,
  };
}

function isFullBudgetScenario(text = "") {
  return /\b(full|fully|entire|all)\b/.test(text) && /\b(budget|monthly budget|spending plan)\b/.test(text) && /\b(left|remain|remaining|available|wallet|money|spendable)\b/.test(text);
}

function explicitlyUsingEmergencyFund(text = "") {
  return /\b(use emergency|using emergency|use my emergency fund|emergency spend|take from emergency)\b/.test(text);
}

function isEmergencyProtectionQuestion(text = "") {
  return /\b(emergency fund|emergency|protected|reserve)\b/.test(text);
}

function purchaseAmount(text = "") {
  const values = [...String(text || "").replace(/,/g, "").matchAll(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/gi)]
    .map((match) => Number(match[1]))
    .filter((number) => Number.isFinite(number) && number > 0);
  return values.length ? Math.max(...values) : null;
}

function buildFullBudgetScenarioReply(snapshot = {}) {
  if (!snapshot.wallets.length) return "I don’t see any wallet records yet, so I can’t calculate what would remain after using the budget.";
  if (snapshot.walletTotal === null) return "I can see your wallet record, but I can’t read its current balance clearly yet.";
  if (snapshot.declaredBudget === null || snapshot.declaredBudget <= 0) return "I don’t see an active declared budget yet, so I can’t subtract a full budget from your wallet balance.";

  const remainingBudgetToSpend = snapshot.remainingBudget ?? snapshot.declaredBudget;
  const walletAfterFullBudget = Math.max(snapshot.walletTotal - remainingBudgetToSpend, 0);
  const spendableAfterFullBudget = snapshot.spendableTotal === null ? null : Math.max(snapshot.spendableTotal - remainingBudgetToSpend, 0);

  if (snapshot.emergencyAmount > 0 && spendableAfterFullBudget !== null) {
    return `If you fully use your remaining budget of ${money(remainingBudgetToSpend)}, your wallet total would go from ${money(snapshot.walletTotal)} to about ${money(walletAfterFullBudget)}. Since ${money(snapshot.emergencyAmount)} is protected as Emergency Fund, your safer spendable money after that would be about ${money(spendableAfterFullBudget)}.`;
  }

  return `If you fully use your remaining budget of ${money(remainingBudgetToSpend)}, your wallet total would go from ${money(snapshot.walletTotal)} to about ${money(walletAfterFullBudget)}.`;
}

export function buildContextualFinanceReply(prompt = "", context = {}) {
  if (!USE_CONTEXTUAL_FINANCE_REPLY) return "";

  const text = normalizeText(prompt);
  const snapshot = getSnapshot(context);

  if (isFullBudgetScenario(text)) return buildFullBudgetScenarioReply(snapshot);

  const amount = purchaseAmount(text);
  const canUseEmergency = explicitlyUsingEmergencyFund(text);
  const isEmergencyQuestion = isEmergencyProtectionQuestion(text);

  // Keep this deterministic file only for scenario math and emergency-protection logic.
  // Normal wallet checks must go through Finance Brain so CLARA does not sound static.
  if (!amount && !canUseEmergency && !isEmergencyQuestion) return "";

  if (!snapshot.wallets.length) return "";
  if (snapshot.walletTotal === null) return "";
  if (snapshot.orphanedEmergencyFund && isEmergencyQuestion) return `I see old Emergency Fund data showing ${money(snapshot.storedEmergencyAmount)}, but it is not linked to an existing wallet yet. I will treat that as unavailable for now, so your spendable wallet money is ${money(snapshot.spendableTotal)}. Create or link a wallet first before CLARA counts that emergency fund.`;

  if (amount !== null && !canUseEmergency) {
    if (amount > snapshot.spendableTotal) return `I would not treat this as safe from normal wallet money. Your wallets show ${money(snapshot.walletTotal)}, but ${money(snapshot.emergencyAmount)} is protected as Emergency Fund inside ${snapshot.linkedWalletName}, so your spendable money is about ${money(snapshot.spendableTotal)}. If this is truly an emergency, use the Emergency Fund flow first; otherwise, delay or reduce the cost.`;
    return `This looks possible from normal spendable money, but do not count your Emergency Fund as free cash. Your wallets show ${money(snapshot.walletTotal)}, with ${money(snapshot.emergencyAmount)} protected inside ${snapshot.linkedWalletName}, leaving about ${money(snapshot.spendableTotal)} spendable. If you proceed, log it as planned and keep the protected amount untouched.`;
  }

  if (canUseEmergency) return `Your Emergency Fund has about ${money(snapshot.emergencyAmount)} protected inside ${snapshot.linkedWalletName}. If this is a real emergency, use the Emergency Fund card so CLARA updates the protected amount intentionally and keeps the wallet logic clear.`;

  if (isEmergencyQuestion) return `Your Emergency Fund is treated as protected money, not a separate wallet. I can see about ${money(snapshot.emergencyAmount)} protected inside ${snapshot.linkedWalletName}. Your wallet total may include that money, but CLARA should not count it as normal spendable cash.`;

  return "";
}
