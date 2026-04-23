import { inferExpenseCategory } from "@/lib/ai-command/category-inference";
import { getPHMonthKey, getTodayPHDateString, parseLooseDateToPHDate } from "@/lib/ai-command/time";

export const AI_INTENTS = {
  LOG_EXPENSE: "LOG_EXPENSE",
  ADD_MONEY: "ADD_MONEY",
  TRANSFER_MONEY: "TRANSFER_MONEY",
  CHECK_BALANCE: "CHECK_BALANCE",
  ANALYZE_SPENDING: "ANALYZE_SPENDING",
  SUGGEST_SAVINGS: "SUGGEST_SAVINGS",
  PLAN_SPENDING: "PLAN_SPENDING",
  EMERGENCY_FUND_PLAN: "EMERGENCY_FUND_PLAN",
  DECISION_GUIDANCE: "DECISION_GUIDANCE",
  DAILY_PLANNING: "DAILY_PLANNING",
  CREATE_REMINDER: "CREATE_REMINDER",
  HABIT_TRACKING: "HABIT_TRACKING",
  PRODUCTIVITY_COACHING: "PRODUCTIVITY_COACHING",
  GOAL_PLANNING: "GOAL_PLANNING",
  LIFESTYLE_GUIDANCE: "LIFESTYLE_GUIDANCE",
  EMOTIONAL_GUIDANCE: "EMOTIONAL_GUIDANCE",
  GENERAL_GUIDANCE: "GENERAL_GUIDANCE",
  CREATE_BUDGET: "CREATE_BUDGET",
  CREATE_SAVINGS_GOAL: "CREATE_SAVINGS_GOAL",
  UNKNOWN: "UNKNOWN",
};

export const WRITE_INTENTS = new Set([
  AI_INTENTS.LOG_EXPENSE,
  AI_INTENTS.ADD_MONEY,
  AI_INTENTS.TRANSFER_MONEY,
  AI_INTENTS.CREATE_BUDGET,
  AI_INTENTS.CREATE_SAVINGS_GOAL,
]);

const FIELD_PROMPTS = {
  amount: "How much should I use?",
  item: "What did you buy?",
  label: "What should I call it?",
  wallet: "Which wallet should I use?",
  fromWallet: "Which wallet should I transfer from?",
  toWallet: "Which wallet should I transfer to?",
  period: "Which month should this budget cover?",
  targetAmount: "What target amount should I set?",
  decisionSubject: "What decision do you want help with?",
};

const REQUIRED_FIELDS = {
  [AI_INTENTS.LOG_EXPENSE]: ["amount", "item", "wallet"],
  [AI_INTENTS.ADD_MONEY]: ["amount", "wallet"],
  [AI_INTENTS.TRANSFER_MONEY]: ["amount", "fromWallet", "toWallet"],
  [AI_INTENTS.CREATE_BUDGET]: ["label", "amount"],
  [AI_INTENTS.CREATE_SAVINGS_GOAL]: ["label", "targetAmount"],
  [AI_INTENTS.DECISION_GUIDANCE]: ["decisionSubject"],
};

const CURRENCY_RE = /(?:php|p|peso|pesos|₱)?\s*([0-9][0-9,]*(?:\.\d+)?)/i;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

export function isCancelText(text) {
  return /^(cancel|never mind|nevermind|stop|quit|close|forget it)$/i.test(normalizeText(text));
}

export function isYesText(text) {
  return /^(yes|yep|yeah|sure|confirm|proceed|go ahead|okay|ok|do it)$/i.test(normalizeText(text));
}

export function isNoText(text) {
  return /^(no|nope|not yet|wait|hold on)$/i.test(normalizeText(text));
}

function extractAmount(text) {
  const match = normalizeText(text).match(CURRENCY_RE);
  if (!match) return null;
  const amount = Number(String(match[1]).replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function cleanupLabel(value) {
  return normalizeText(value)
    .replace(/^(a|an|the|my|for|of|to|into|from|using)\s+/i, "")
    .replace(/\s+(this month|today|tomorrow)$/i, "")
    .replace(/[?.!,]+$/g, "")
    .trim();
}

function stripAmountPhrase(text) {
  return normalizeText(text)
    .replace(CURRENCY_RE, " ")
    .replace(/\b(pesos?|php)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAfterFor(text) {
  const match = normalizeText(text).match(/\bfor\s+(.+)$/i);
  return match ? cleanupLabel(match[1]) : "";
}

function detectIntent(text) {
  const lower = normalizeLower(text);
  if (/\b(transfer|move|send)\b/.test(lower) && /\b(to|from|wallet|gcash|maya|cash)\b/.test(lower)) return AI_INTENTS.TRANSFER_MONEY;
  if (/\b(balance|money left|how much.*have|left for today|left this month)\b/.test(lower)) return AI_INTENTS.CHECK_BALANCE;
  if (/\b(analy[sz]e|analysis|spending pattern|spent this|breakdown|where did my money)\b/.test(lower)) return AI_INTENTS.ANALYZE_SPENDING;
  if (/\b(save|saving|savings suggestion|suggest.*saving)\b/.test(lower) && !/\bgoal\b/.test(lower)) return AI_INTENTS.SUGGEST_SAVINGS;
  if (/\b(plan.*spend|spending today|budget today|help.*spending)\b/.test(lower)) return AI_INTENTS.PLAN_SPENDING;
  if (/\b(emergency fund|survive|months can i)\b/.test(lower)) return AI_INTENTS.EMERGENCY_FUND_PLAN;
  if (/\b(should i|can i afford|is it okay|buy this|decision)\b/.test(lower)) return AI_INTENTS.DECISION_GUIDANCE;
  if (/\b(plan my day|daily plan|schedule|today'?s plan|today plan)\b/.test(lower)) return AI_INTENTS.DAILY_PLANNING;
  if (/\b(remind me|reminder|remember to)\b/.test(lower)) return AI_INTENTS.CREATE_REMINDER;
  if (/\b(habit|routine)\b/.test(lower)) return AI_INTENTS.HABIT_TRACKING;
  if (/\b(productivity|focus|procrastinat|get things done)\b/.test(lower)) return AI_INTENTS.PRODUCTIVITY_COACHING;
  if (/\b(goal plan|plan a goal|life goal)\b/.test(lower)) return AI_INTENTS.GOAL_PLANNING;
  if (/\b(lifestyle|organize my life|life advice)\b/.test(lower)) return AI_INTENTS.LIFESTYLE_GUIDANCE;
  if (/\b(stress|overwhelmed|anxious|guilty|feel bad)\b/.test(lower)) return AI_INTENTS.EMOTIONAL_GUIDANCE;
  if (/\b(budget|allocate|allocation)\b/.test(lower)) return AI_INTENTS.CREATE_BUDGET;
  if (/\b(savings goal|saving goal|goal)\b/.test(lower)) return AI_INTENTS.CREATE_SAVINGS_GOAL;
  if (/\b(add|put|deposit|cash in|top up)\b/.test(lower) && /\b(to|into|wallet|gcash|maya|cash)\b/.test(lower)) return AI_INTENTS.ADD_MONEY;
  if (/\b(bought|buy|spent|paid|log|expense|purchased)\b/.test(lower)) return AI_INTENTS.LOG_EXPENSE;
  if (lower.length > 5) return AI_INTENTS.GENERAL_GUIDANCE;
  return AI_INTENTS.UNKNOWN;
}

function extractWallet(text) {
  const lower = normalizeLower(text);
  const explicit = lower.match(/\b(?:from|to|into|using|wallet)\s+([a-z0-9 _-]{2,40})$/i);
  if (explicit) return cleanupLabel(explicit[1]);
  if (lower.includes("gcash")) return "GCash";
  if (lower.includes("maya")) return "Maya";
  if (lower.includes("cash")) return "Cash";
  return "";
}

function extractTransferWallets(text) {
  const raw = normalizeText(text);
  const fromMatch = raw.match(/\bfrom\s+([a-z0-9 _-]+?)(?:\s+to\b|$)/i);
  const toMatch = raw.match(/\bto\s+([a-z0-9 _-]+)$/i);
  return {
    fromWallet: fromMatch ? cleanupLabel(fromMatch[1]) : "",
    toWallet: toMatch ? cleanupLabel(toMatch[1]) : "",
  };
}

function extractExpenseItem(text) {
  const afterFor = extractAfterFor(text);
  if (afterFor) return afterFor;
  return cleanupLabel(
    stripAmountPhrase(text)
      .replace(/^(i\s+)?(bought|buy|spent|paid|log|purchased)\s*/i, "")
      .replace(/\b(of|for)\b/i, " ")
  );
}

function extractBudgetLabel(text) {
  const patterns = [
    /\bbudget\s+for\s+(.+)$/i,
    /\bfor\s+(.+?)(?:\s+this month|\s+monthly|\s+budget)?$/i,
  ];
  for (const pattern of patterns) {
    const match = normalizeText(text).match(pattern);
    if (match) return cleanupLabel(match[1].replace(CURRENCY_RE, ""));
  }
  return cleanupLabel(stripAmountPhrase(text).replace(/create|make|set|budget|monthly/gi, ""));
}

function extractGoalLabel(text) {
  const withoutAmount = stripAmountPhrase(text);
  const match =
    withoutAmount.match(/\b(?:goal|savings goal)\s+(?:for\s+)?(.+?)(?:\s+by\s+.+)?$/i) ||
    withoutAmount.match(/\bcreate\s+(?:a\s+)?(.+?)\s+goal/i) ||
    withoutAmount.match(/\bmake\s+(?:a\s+)?(?:savings\s+)?goal\s+for\s+(.+)$/i) ||
    withoutAmount.match(/\bsave\s+for\s+(.+)$/i);
  return match ? cleanupLabel(match[1]) : "";
}

function extractPeriod(text) {
  const lower = normalizeLower(text);
  if (lower.includes("this month") || lower.includes("monthly")) return getPHMonthKey();
  const match = lower.match(/\b(20\d{2}-\d{2})\b/);
  return match ? match[1] : getPHMonthKey();
}

function extractTargetDate(text) {
  const match = normalizeText(text).match(/\bby\s+(.+)$/i);
  return match ? parseLooseDateToPHDate(match[1]) : "";
}

function applyMissingFieldAnswer(command, text) {
  const next = { ...(command?.parsedData || {}) };
  const firstMissing = command?.missingFields?.[0];
  const amount = extractAmount(text);
  if (!firstMissing) return next;
  if (["amount", "targetAmount"].includes(firstMissing)) next[firstMissing] = amount || Number(normalizeText(text).replace(/,/g, ""));
  else if (firstMissing === "wallet") next.wallet = extractWallet(text) || normalizeText(text);
  else if (firstMissing === "fromWallet" || firstMissing === "toWallet") next[firstMissing] = extractWallet(text) || normalizeText(text);
  else if (firstMissing === "period") next.period = extractPeriod(text);
  else next[firstMissing] = cleanupLabel(text);
  return next;
}

function applyCorrections(command, text) {
  const next = { ...(command?.parsedData || {}) };
  const lower = normalizeLower(text);
  const amount = extractAmount(text);
  if (amount) {
    if (command.intent === AI_INTENTS.CREATE_SAVINGS_GOAL || /\btarget\b/.test(lower)) next.targetAmount = amount;
    else next.amount = amount;
  }
  const wallet = extractWallet(text);
  if (wallet && /\b(wallet|from|using|gcash|maya|cash)\b/.test(lower)) next.wallet = wallet;
  const transferWallets = extractTransferWallets(text);
  if (transferWallets.fromWallet) next.fromWallet = transferWallets.fromWallet;
  if (transferWallets.toWallet) next.toWallet = transferWallets.toWallet;
  const labelMatch = normalizeText(text).match(/\b(?:label|name|call it|for)\s+(.+)$/i);
  if (labelMatch) {
    const label = cleanupLabel(labelMatch[1]);
    if (command.intent === AI_INTENTS.LOG_EXPENSE) next.item = label;
    else next.label = label;
  }
  const targetDate = extractTargetDate(text);
  if (targetDate) next.targetDate = targetDate;
  return next;
}

function getMissingFields(intent, parsedData) {
  return (REQUIRED_FIELDS[intent] || []).filter((field) => {
    if (field === "item") return !parsedData.item && !parsedData.label;
    return !parsedData[field] || (typeof parsedData[field] === "number" && parsedData[field] <= 0);
  });
}

export function buildCommand(intent, parsedData = {}, confidence = 0.5, conversationalText = "") {
  const safeIntent = AI_INTENTS[intent] || intent || AI_INTENTS.UNKNOWN;
  const missingFields = getMissingFields(safeIntent, parsedData);
  const isWrite = WRITE_INTENTS.has(safeIntent);
  const canExecute = safeIntent !== AI_INTENTS.UNKNOWN && missingFields.length === 0;
  const status =
    safeIntent === AI_INTENTS.UNKNOWN
      ? "detected"
      : canExecute && isWrite
        ? "awaiting_confirmation"
        : canExecute
          ? "ready_to_execute"
          : "collecting_missing_fields";

  return {
    intent: safeIntent,
    confidence,
    parsedData,
    missingFields,
    requiresConfirmation: isWrite,
    canExecute,
    confirmationText: canExecute && isWrite ? generateConfirmation({ intent: safeIntent, parsedData }) : "",
    userPrompt:
      safeIntent === AI_INTENTS.UNKNOWN
        ? "I am not fully sure yet. Are you trying to log money, move money, check your finances, or plan something?"
        : missingFields.length
          ? FIELD_PROMPTS[missingFields[0]] || "What should I use for that?"
          : conversationalText,
    status,
  };
}

export function normalizeGeminiCommand(value = {}) {
  const parsedData = value.parsedData && typeof value.parsedData === "object" ? value.parsedData : {};
  const intent = AI_INTENTS[value.intent] || value.intent || AI_INTENTS.UNKNOWN;
  if (intent === AI_INTENTS.LOG_EXPENSE) {
    parsedData.date = parsedData.date || getTodayPHDateString();
    parsedData.category = parsedData.category || inferExpenseCategory(parsedData.item || parsedData.label || "");
    parsedData.label = parsedData.label || parsedData.item || "";
  }
  if (intent === AI_INTENTS.CREATE_BUDGET) {
    parsedData.period = parsedData.period || getPHMonthKey();
    parsedData.category = parsedData.category || inferExpenseCategory(parsedData.label || "");
  }
  return buildCommand(intent, parsedData, Number(value.confidence) || 0.7, value.assistantMessage || "");
}

export function parseCommand(text, previousCommand = null) {
  const raw = normalizeText(text);
  if (!raw) return buildCommand(AI_INTENTS.UNKNOWN, {}, 0.1);

  if (previousCommand?.status === "collecting_missing_fields") {
    return buildCommand(previousCommand.intent, applyMissingFieldAnswer(previousCommand, raw), previousCommand.confidence || 0.7);
  }

  if (previousCommand?.status === "awaiting_confirmation" && !isYesText(raw)) {
    return buildCommand(previousCommand.intent, applyCorrections(previousCommand, raw), previousCommand.confidence || 0.7);
  }

  const intent = detectIntent(raw);
  const amount = extractAmount(raw);
  const parsedData = {};
  let confidence = intent === AI_INTENTS.UNKNOWN ? 0.2 : 0.72;

  if (intent === AI_INTENTS.LOG_EXPENSE) {
    parsedData.amount = amount;
    parsedData.item = extractExpenseItem(raw);
    parsedData.label = parsedData.item;
    parsedData.wallet = extractWallet(raw);
    parsedData.category = inferExpenseCategory(parsedData.item || raw);
    parsedData.date = getTodayPHDateString();
  } else if (intent === AI_INTENTS.ADD_MONEY) {
    parsedData.amount = amount;
    parsedData.wallet = extractWallet(raw);
  } else if (intent === AI_INTENTS.TRANSFER_MONEY) {
    parsedData.amount = amount;
    Object.assign(parsedData, extractTransferWallets(raw));
  } else if (intent === AI_INTENTS.CREATE_BUDGET) {
    parsedData.amount = amount;
    parsedData.label = extractBudgetLabel(raw);
    parsedData.category = inferExpenseCategory(parsedData.label || raw);
    parsedData.period = extractPeriod(raw);
  } else if (intent === AI_INTENTS.CREATE_SAVINGS_GOAL) {
    parsedData.targetAmount = amount;
    parsedData.label = extractGoalLabel(raw);
    parsedData.targetDate = extractTargetDate(raw);
  } else if (intent === AI_INTENTS.DECISION_GUIDANCE) {
    parsedData.decisionSubject = cleanupLabel(raw);
    parsedData.amount = amount || undefined;
  } else if (intent !== AI_INTENTS.UNKNOWN) {
    parsedData.label = cleanupLabel(raw);
  }

  if (amount) confidence += 0.1;
  return buildCommand(intent, parsedData, Math.min(confidence, 0.95));
}

export function generateConfirmation(command) {
  const data = command.parsedData || {};
  const amount = formatPeso(data.amount || data.targetAmount);
  const label = data.item || data.label || "this";

  if (command.intent === AI_INTENTS.LOG_EXPENSE) {
    return `Just to confirm: ${amount} for ${label} from ${data.wallet} under ${data.category || "other"} for today. Should I log it?`;
  }
  if (command.intent === AI_INTENTS.ADD_MONEY) {
    return `Just to confirm: add ${amount} to your ${data.wallet} wallet. Should I proceed?`;
  }
  if (command.intent === AI_INTENTS.TRANSFER_MONEY) {
    return `Just to confirm: transfer ${amount} from ${data.fromWallet} to ${data.toWallet}. Should I proceed?`;
  }
  if (command.intent === AI_INTENTS.CREATE_BUDGET) {
    return `Just to confirm: create a ${amount} budget for ${titleCase(label)} for this month. Should I proceed?`;
  }
  if (command.intent === AI_INTENTS.CREATE_SAVINGS_GOAL) {
    const deadline = data.targetDate ? ` by ${data.targetDate}` : "";
    return `Just to confirm: create a ${titleCase(label)} savings goal with a target of ${amount}${deadline}. Should I proceed?`;
  }
  return "";
}

export function formatPeso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function titleCase(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}
