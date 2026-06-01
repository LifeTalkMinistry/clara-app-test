import { buildScheduleDirectReply } from "./clara-schedule-ai-context";

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

function getWalletName(wallet = {}) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "Wallet").trim() || "Wallet";
}

function getWalletId(wallet = {}) {
  return String(wallet?.id || wallet?.wallet_id || wallet?.walletId || "").trim();
}

function getWalletBalance(wallet = {}) {
  return toNumber(wallet?.derived_balance, wallet?.balance, wallet?.current_balance, wallet?.wallet_balance, wallet?.available_balance, wallet?.starting_balance, wallet?.amount);
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

function getSnapshot(context = {}) {
  const wallets = Array.isArray(context.wallets) ? context.wallets : [];
  const emergencyFund = context.emergencyFund || context.emergency_fund || {};
  const walletTotal = wallets.reduce((sum, wallet) => sum + getWalletBalance(wallet), 0);
  const protectedTotalFromWallets = wallets.reduce((sum, wallet) => sum + getWalletProtected(wallet), 0);
  const storedEmergencyAmount = getEmergencyFundAmount(emergencyFund);
  const linkedWallet = findLinkedEmergencyWallet(emergencyFund, wallets);
  const hasLink = Boolean(getEmergencyLink(emergencyFund).id || getEmergencyLink(emergencyFund).name);
  const orphanedEmergencyFund = storedEmergencyAmount > 0 && (!wallets.length || !linkedWallet || !hasLink);
  const emergencyAmount = orphanedEmergencyFund ? 0 : Math.max(protectedTotalFromWallets, storedEmergencyAmount);
  const spendableTotal = Math.max(walletTotal - emergencyAmount, 0);
  const linkedWalletName = getEmergencyFundWalletName(emergencyFund, wallets);
  const protectedWallet = wallets.find((wallet) => getWalletProtected(wallet) > 0);

  return { wallets, emergencyFund, walletTotal, storedEmergencyAmount, orphanedEmergencyFund, emergencyAmount, spendableTotal, linkedWalletName: protectedWallet ? getWalletName(protectedWallet) : linkedWalletName };
}

function isEmergencyOrWalletQuestion(text = "") {
  return /\b(emergency fund|emergency|protected|reserve|wallet|spendable|available money|money left|how much money|can spend|afford)\b/.test(text);
}

function explicitlyUsingEmergencyFund(text = "") {
  return /\b(use emergency|using emergency|use my emergency fund|emergency spend|take from emergency)\b/.test(text);
}

function purchaseAmount(text = "") {
  const values = [...String(text || "").replace(/,/g, "").matchAll(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/gi)]
    .map((match) => Number(match[1]))
    .filter((number) => Number.isFinite(number) && number > 0);
  return values.length ? Math.max(...values) : null;
}

export function buildContextualFinanceReply(prompt = "", context = {}) {
  if (!USE_CONTEXTUAL_FINANCE_REPLY) return "";

  const scheduleReply = buildScheduleDirectReply(prompt, context);
  if (scheduleReply) return scheduleReply;

  const text = normalizeText(prompt);
  if (!isEmergencyOrWalletQuestion(text)) return "";

  const snapshot = getSnapshot(context);
  const amount = purchaseAmount(text);
  const canUseEmergency = explicitlyUsingEmergencyFund(text);

  if (snapshot.orphanedEmergencyFund) return `I see old Emergency Fund data showing ${money(snapshot.storedEmergencyAmount)}, but it is not linked to an existing wallet yet. I will treat that as unavailable for now, so your spendable wallet money is ${money(snapshot.spendableTotal)}. Create or link a wallet first before CLARA counts that emergency fund.`;

  if (amount !== null && !canUseEmergency) {
    if (amount > snapshot.spendableTotal) return `I would not treat this as safe from normal wallet money. Your wallets show ${money(snapshot.walletTotal)}, but ${money(snapshot.emergencyAmount)} is protected as Emergency Fund inside ${snapshot.linkedWalletName}, so your spendable money is about ${money(snapshot.spendableTotal)}. If this is truly an emergency, use the Emergency Fund flow first; otherwise, delay or reduce the cost.`;
    return `This looks possible from normal spendable money, but do not count your Emergency Fund as free cash. Your wallets show ${money(snapshot.walletTotal)}, with ${money(snapshot.emergencyAmount)} protected inside ${snapshot.linkedWalletName}, leaving about ${money(snapshot.spendableTotal)} spendable. If you proceed, log it as planned and keep the protected amount untouched.`;
  }

  if (canUseEmergency) return `Your Emergency Fund has about ${money(snapshot.emergencyAmount)} protected inside ${snapshot.linkedWalletName}. If this is a real emergency, use the Emergency Fund card so CLARA updates the protected amount intentionally and keeps the wallet logic clear.`;

  if (text.includes("emergency") || text.includes("protected") || text.includes("reserve")) return `Your Emergency Fund is treated as protected money, not a separate wallet. I can see about ${money(snapshot.emergencyAmount)} protected inside ${snapshot.linkedWalletName}. Your wallet total may include that money, but CLARA should not count it as normal spendable cash.`;

  return `Your wallets show ${money(snapshot.walletTotal)} total, but ${money(snapshot.emergencyAmount)} is protected as Emergency Fund inside ${snapshot.linkedWalletName}. Your normal spendable wallet money is about ${money(snapshot.spendableTotal)}. Use the Emergency Fund only through the Emergency Fund card when it is truly needed.`;
}
