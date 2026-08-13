function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripInstructionText(text = "") {
  return String(text || "")
    .replace(/CLARA REPLY FORMAT RULES:[\s\S]*$/i, "")
    .trim();
}

function extractPromptSection(prompt = "", label = "") {
  const source = String(prompt || "");
  const marker = `${label}:`;
  const index = source.toLowerCase().indexOf(marker.toLowerCase());
  if (index < 0) return "";
  const rest = source.slice(index + marker.length).trim();
  const nextHeading = rest.search(/\n\n[A-Z][^:\n]{0,80}:/);
  return stripInstructionText(nextHeading >= 0 ? rest.slice(0, nextHeading) : rest);
}

function extractVisibleUserMessage(message = "") {
  return (
    extractPromptSection(message, "Current visible user message") ||
    extractPromptSection(message, "User message") ||
    extractPromptSection(message, "Raw app prompt without formatting rules") ||
    stripInstructionText(message)
  );
}

function readPath(source = {}, path = "") {
  return String(path || "").split(".").reduce((current, key) => current?.[key], source);
}

function firstArray(source = {}, paths = []) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function firstValue(source = {}, paths = []) {
  for (const path of paths) {
    const value = readPath(source, path);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return null;
}

function localReply(userMessage = "", context = {}) {
  const input = cleanText(userMessage);
  const lower = input.toLowerCase();

  if (!input) return "I’m here. What do you want to check in CLARA?";
  if (/^(hi|hello|hey|yo|kumusta|kamusta)\b/i.test(input)) {
    return "Hi! I’m here. You can ask about your wallets, budgets, savings, schedule, or recent money activity.";
  }
  if (/how are you|kamusta ka|kumusta ka/i.test(input)) {
    return "I’m good and ready to help. What part of your money do you want to check?";
  }

  const wallets = firstArray(context, ["wallets", "finance.wallets", "walletRecords", "walletHub.wallets"]);
  const budgets = firstArray(context, ["budgets", "budgetPlan.categories", "finance.budgets", "budgetHub.budgets", "budgetHub.categories"]);
  const savingsGoals = firstArray(context, ["savingsGoals", "savings_goals", "finance.savingsGoals"]);
  const transactions = firstArray(context, ["transactions", "recentTransactions", "finance.transactions", "transactionHubSnapshot.timeline"]);
  const debts = firstArray(context, ["debts", "debtObligations", "obligations", "finance.debts", "finance.obligations"]);
  const schedule = firstValue(context, ["schedule", "calendar", "paydayInfo", "paydayCycle"]);

  if (/wallet|balance|cash|money left/.test(lower)) {
    return wallets.length
      ? `I can see ${wallets.length} wallet${wallets.length === 1 ? "" : "s"} in your current CLARA context. Open Wallets for the exact live balances and activity.`
      : "I don’t have a wallet snapshot in this chat context. Open Wallets to see the exact live balances.";
  }

  if (/budget|allocation|category/.test(lower)) {
    return budgets.length
      ? `I can see ${budgets.length} budget entr${budgets.length === 1 ? "y" : "ies"} in your current CLARA context. Open Budget for the exact remaining amounts.`
      : "I don’t have a budget snapshot in this chat context. Open Budget to review the current plan.";
  }

  if (/saving|savings|goal|ipon/.test(lower)) {
    return savingsGoals.length
      ? `You currently have ${savingsGoals.length} savings goal${savingsGoals.length === 1 ? "" : "s"} in the available CLARA context.`
      : "I don’t see a savings-goal snapshot here. Open Savings Goals to review or update them.";
  }

  if (/debt|utang|loan|obligation/.test(lower)) {
    return debts.length
      ? `I can see ${debts.length} debt or obligation entr${debts.length === 1 ? "y" : "ies"} in the available CLARA context.`
      : "I don’t see debt or obligation data in this chat context. Open Debt / Obligations for the current list.";
  }

  if (/transaction|recent activity|last expense|latest expense/.test(lower)) {
    return transactions.length
      ? `I can see ${transactions.length} recent transaction entr${transactions.length === 1 ? "y" : "ies"} in the current context. Open Transactions for the exact latest activity.`
      : "I don’t see recent transaction data in this chat context. Open Transactions for the live history.";
  }

  if (/schedule|calendar|appointment|event/.test(lower)) {
    return schedule
      ? "Your CLARA schedule context is available. Open Schedule for the exact event details and money-impact planning."
      : "I don’t have a schedule snapshot in this chat context. Open Schedule to review upcoming events.";
  }

  return "This general CLARA helper now uses local app logic instead of paid AI. I can point you to wallets, budgets, savings, schedule, debts, or transactions.";
}

// Legacy compatibility export. General CLARA chat no longer uses Gemini.
export function hasGeminiConfig() {
  return false;
}

// Legacy compatibility name retained so older callers keep working without a network request.
export async function generateClaraGeminiReply({ message, context = {} } = {}) {
  return localReply(extractVisibleUserMessage(message), context);
}

export async function refineClaraSupportMessageWithGemini({ topic, message }) {
  return `Topic: ${topic || "General"}\n\n${cleanText(message)}`;
}
