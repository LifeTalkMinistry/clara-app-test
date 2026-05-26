import { buildClaraFinanceSnapshot } from "@/lib/clara-local-brain";
import { buildClaraLifeStageAiContext } from "@/lib/clara-life-stage-ai-context";

function formatMoney(value) {
  const number = Number(value);
  return Number.isFinite(number)
    ? `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`
    : null;
}

function normalizeText(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactKey(value = "") {
  return normalizeText(value).replace(/\s+/g, "");
}

function walletName(wallet = {}) {
  return String(wallet?.name || wallet?.wallet_name || wallet?.label || "Wallet").trim();
}

function walletBalance(wallet = {}) {
  return wallet?.balance ?? wallet?.current_balance ?? wallet?.wallet_balance ?? wallet?.available_balance ?? null;
}

function getWallets(snapshot = {}) {
  const walletBalances = Array.isArray(snapshot.walletBalances) ? snapshot.walletBalances : [];
  const wallets = Array.isArray(snapshot.wallets) ? snapshot.wallets : [];
  const source = walletBalances.length ? walletBalances : wallets;

  return source
    .map((wallet) => ({
      ...wallet,
      name: walletName(wallet),
      balance: walletBalance(wallet),
    }))
    .filter((wallet) => wallet.name && wallet.balance !== null && wallet.balance !== undefined);
}

function isPrimaryWalletQuestion(text = "") {
  return text.includes("primary wallet") || text.includes("main wallet") || text.includes("first wallet") || text.includes("top wallet");
}

function isBalanceQuestion(text = "") {
  return (
    text.includes("how much") ||
    text.includes("balance") ||
    text.includes("money left") ||
    text.includes("current money") ||
    text.includes("currently have") ||
    text.includes("available money") ||
    text.includes("check my money") ||
    isPrimaryWalletQuestion(text)
  );
}

function isExpenseLoggingPrompt(text = "") {
  return /\b(i spent|spent|i bought|bought|log|logged|record|add expense|expense of)\b/.test(text) && /\d/.test(text);
}

function isLifeStageAdviceQuestion(text = "") {
  if (isExpenseLoggingPrompt(text)) return false;

  return /\b(should i|can i|is it okay|okay to|safe to|afford|buy|purchase|spend on|money advice|spending advice|budget advice|next best move|plan my spending|spending plan|budget fixer|savings plan|save more|debt|utang|loan|bills|payday|emergency fund|overspend|overspending|prioritize|priority)\b/.test(text);
}

function getLifeStageContext(context = {}) {
  return (
    context?.lifeStageContext ||
    context?.lifeStageAiContext ||
    context?.meLifeStageProfile ||
    buildClaraLifeStageAiContext()
  );
}

function signalText(lifeStageContext = {}) {
  const signals = (Array.isArray(lifeStageContext.snapshotTopSignals) ? lifeStageContext.snapshotTopSignals : [])
    .map((signal) => signal?.label)
    .filter(Boolean)
    .slice(0, 2);

  if (!signals.length) return "";
  return ` with ${signals.join(" and ")} active`;
}

function firstRecommendedMove(lifeStageContext = {}) {
  return (Array.isArray(lifeStageContext.recommendedNextMoves) ? lifeStageContext.recommendedNextMoves : [])
    .filter(Boolean)[0] || "protect essentials first before optional spending";
}

function buildLifeStageAdviceReply(prompt = "", context = {}) {
  const text = normalizeText(prompt);
  if (!isLifeStageAdviceQuestion(text)) return "";

  const lifeStageContext = getLifeStageContext(context);
  const snapshot = buildClaraFinanceSnapshot(context || {});
  const available = formatMoney(snapshot.availableMoney ?? snapshot.totalWalletBalance ?? snapshot.totalBalance);
  const dominant = lifeStageContext?.dominantPressure || "your main pressure";
  const nextMove = firstRecommendedMove(lifeStageContext);

  if (!lifeStageContext?.hasProfile) {
    const moneyLine = available ? ` I can see ${available} available, so use that as the temporary boundary.` : "";
    return `I can give sharper guidance after you complete your Me profile, because then I can connect this advice to your real life stage and pressure patterns.${moneyLine} For now, protect bills, essentials, savings, and emergency buffer before saying yes to optional spending.`;
  }

  if (/\b(afford|buy|purchase|should i|can i|safe to|okay to|spend on)\b/.test(text)) {
    const moneyLine = available ? ` You currently have ${available} visible, but the safer question is whether this still protects bills, essentials, savings, and your emergency buffer.` : "";
    return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, I’d protect ${dominant} first before deciding on this purchase.${moneyLine} Next safest move: ${nextMove}`;
  }

  if (/\b(save|savings|emergency fund)\b/.test(text)) {
    return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, your savings advice should protect ${dominant} first. Start with one small protected amount before flexible spending. Next safest move: ${nextMove}`;
  }

  if (/\b(budget|plan my spending|spending plan|budget fixer|payday|bills|overspend|overspending)\b/.test(text)) {
    return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, build the plan around ${dominant} first. Protect fixed bills and essentials before flexible spending, then use the remaining money as the safe zone. Next safest move: ${nextMove}`;
  }

  if (/\b(debt|utang|loan|prioritize|priority|next best move)\b/.test(text)) {
    return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, prioritize the move that lowers ${dominant} without weakening essentials. Next safest move: ${nextMove}`;
  }

  return `Since your current Me profile shows ${lifeStageContext.lifeStage}${signalText(lifeStageContext)}, I’d use ${dominant} as the main filter for this money decision. Next safest move: ${nextMove}`;
}

function findRequestedWallet(prompt = "", wallets = []) {
  const text = normalizeText(prompt);
  const compact = compactKey(prompt);

  for (const wallet of wallets) {
    const name = normalizeText(wallet.name);
    const key = compactKey(wallet.name);
    if (!key) continue;

    const exactWord = text.split(" ").includes(name);
    const compactMatch = key.length > 1 && compact.includes(key);
    const singleLetterMatch = key.length === 1 && text.split(" ").includes(key);

    if (exactWord || compactMatch || singleLetterMatch) return wallet;
  }

  return null;
}

export function buildContextualFinanceReply(prompt, context) {
  const text = normalizeText(prompt);

  if (text.includes("talk to clara context mode is active")) return "";

  if (context?.allowDirectLifeStageAdvice === true) {
    const lifeStageAdvice = buildLifeStageAdviceReply(prompt, context);
    if (lifeStageAdvice) return lifeStageAdvice;
  }

  if (!isBalanceQuestion(text)) return "";

  const snapshot = buildClaraFinanceSnapshot(context || {});
  const wallets = getWallets(snapshot);
  const primaryWallet = wallets[0] || null;
  const requestedWallet = isPrimaryWalletQuestion(text)
    ? primaryWallet
    : findRequestedWallet(prompt, wallets);

  if (requestedWallet) {
    const amount = formatMoney(requestedWallet.balance);
    if (!amount) return `I found ${requestedWallet.name}, but I cannot calculate its balance clearly yet.`;

    return isPrimaryWalletQuestion(text)
      ? `Your primary wallet is ${requestedWallet.name}, and it currently has ${amount}.`
      : `${requestedWallet.name} currently has ${amount}.`;
  }

  const total = snapshot.availableMoney ?? snapshot.totalWalletBalance ?? snapshot.totalBalance;
  const totalText = formatMoney(total);

  if (!totalText) {
    return snapshot.hasAnyData
      ? "I can see your finance data, but I cannot calculate the wallet total clearly yet. Open your wallet card and refresh once."
      : "I do not see wallet data yet. Add a wallet first, then I can answer your current money accurately.";
  }

  const breakdown = wallets
    .slice(0, 5)
    .map((wallet) => `${wallet.name}: ${formatMoney(wallet.balance)}`)
    .join(", ");

  return `You currently have ${totalText} available across your wallets.${breakdown ? ` That includes ${breakdown}.` : ""}`;
}
