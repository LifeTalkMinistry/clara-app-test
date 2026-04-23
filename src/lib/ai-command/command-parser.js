import { inferExpenseCategory } from "@/lib/ai-command/category-inference";
import { getPHMonthKey, getTodayPHDateString, parseLooseDateToPHDate } from "@/lib/ai-command/time";

export const AI_INTENTS = {
  LOG_EXPENSE: "LOG_EXPENSE",
  ADD_MONEY: "ADD_MONEY",
  CREATE_BUDGET: "CREATE_BUDGET",
  CREATE_SAVINGS_GOAL: "CREATE_SAVINGS_GOAL",
  UNKNOWN: "UNKNOWN",
};

const FIELD_PROMPTS = {
  amount: "How much was it?",
  item: "What did you buy?",
  label: "What should I call it?",
  wallet: "Which wallet should I use?",
  period: "Which month should this budget cover?",
  targetAmount: "What target amount should I set?",
};

const REQUIRED_FIELDS = {
  [AI_INTENTS.LOG_EXPENSE]: ["amount", "item", "wallet"],
  [AI_INTENTS.ADD_MONEY]: ["amount", "wallet"],
  [AI_INTENTS.CREATE_BUDGET]: ["label", "amount"],
  [AI_INTENTS.CREATE_SAVINGS_GOAL]: ["label", "targetAmount"],
};

const CURRENCY_RE = /(?:₱|php|p)?\s*([0-9][0-9,]*(?:\.\d+)?)/i;

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

function extractAmount(text) {
  const match = normalizeText(text).match(CURRENCY_RE);
  if (!match) return null;
  const amount = Number(String(match[1]).replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function cleanupLabel(value) {
  return normalizeText(value)
    .replace(/^(a|an|the|my|for|of|to)\s+/i, "")
    .replace(/\s+(this month|today|tomorrow)$/i, "")
    .trim();
}

function extractAfterFor(text) {
  const match = normalizeText(text).match(/\bfor\s+(.+)$/i);
  return match ? cleanupLabel(match[1]) : "";
}

function stripAmountPhrase(text) {
  return normalizeText(text)
    .replace(CURRENCY_RE, " ")
    .replace(/\b(pesos?|php)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectIntent(text) {
  const lower = normalizeLower(text);
  if (/\b(budget|allocate|allocation)\b/.test(lower)) return AI_INTENTS.CREATE_BUDGET;
  if (/\b(savings goal|saving goal|goal)\b/.test(lower)) return AI_INTENTS.CREATE_SAVINGS_GOAL;
  if (/\b(add|put|deposit|cash in|top up)\b/.test(lower) && /\b(to|into|wallet|gcash|maya|cash)\b/.test(lower)) {
    return AI_INTENTS.ADD_MONEY;
  }
  if (/\b(bought|buy|spent|paid|log|expense|purchased)\b/.test(lower)) return AI_INTENTS.LOG_EXPENSE;
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

function extractExpenseItem(text) {
  const afterFor = extractAfterFor(text);
  if (afterFor) return afterFor;

  const stripped = stripAmountPhrase(text)
    .replace(/^(i\s+)?(bought|buy|spent|paid|log|purchased)\s*/i, "")
    .replace(/\b(of|for)\b/i, " ")
    .trim();
  return cleanupLabel(stripped);
}

function extractBudgetLabel(text) {
  const lower = normalizeLower(text);
  const patterns = [
    /\bbudget\s+for\s+(.+)$/i,
    /\bfor\s+(.+?)\s+(?:this month|monthly|budget)?$/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return cleanupLabel(match[1].replace(CURRENCY_RE, ""));
  }
  return lower.includes("budget") ? cleanupLabel(stripAmountPhrase(text).replace(/create|make|set|budget|monthly/gi, "")) : "";
}

function extractGoalLabel(text) {
  const withoutAmount = stripAmountPhrase(text);
  const match =
    withoutAmount.match(/\b(?:goal|savings goal)\s+(?:for\s+)?(.+?)(?:\s+by\s+.+)?$/i) ||
    withoutAmount.match(/\bcreate\s+(?:a\s+)?(.+?)\s+goal/i) ||
    withoutAmount.match(/\bmake\s+(?:a\s+)?(?:savings\s+)?goal\s+for\s+(.+)$/i);
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
  const missing = command?.missingFields || [];
  const firstMissing = missing[0];
  const amount = extractAmount(text);

  if (!firstMissing) return next;
  if (["amount", "targetAmount"].includes(firstMissing)) {
    next[firstMissing] = amount || Number(normalizeText(text).replace(/,/g, ""));
  } else if (firstMissing === "wallet") {
    next.wallet = extractWallet(text) || normalizeText(text);
  } else if (firstMissing === "period") {
    next.period = extractPeriod(text);
  } else {
    next[firstMissing] = cleanupLabel(text);
  }

  return next;
}

function applyCorrections(command, text) {
  const next = { ...(command?.parsedData || {}) };
  const lower = normalizeLower(text);
  const amount = extractAmount(text);

  if (amount) {
    if (command.intent === AI_INTENTS.CREATE_SAVINGS_GOAL && /\btarget|amount|make it|change\b/.test(lower)) {
      next.targetAmount = amount;
    } else {
      next.amount = amount;
    }
  }

  const wallet = extractWallet(text);
  if (wallet && /\b(wallet|from|using|gcash|maya|cash)\b/.test(lower)) next.wallet = wallet;

  const labelMatch = text.match(/\b(?:label|name|call it|for)\s+(.+)$/i);
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

export function buildCommand(intent, parsedData = {}, confidence = 0.5) {
  const missingFields = getMissingFields(intent, parsedData);
  const canExecute = intent !== AI_INTENTS.UNKNOWN && missingFields.length === 0;
  const status =
    intent === AI_INTENTS.UNKNOWN
      ? "detected"
      : canExecute
        ? "awaiting_confirmation"
        : "collecting_missing_fields";

  return {
    intent,
    confidence,
    parsedData,
    missingFields,
    requiresConfirmation: intent !== AI_INTENTS.UNKNOWN,
    canExecute,
    confirmationText: canExecute ? generateConfirmation({ intent, parsedData }) : "",
    userPrompt:
      intent === AI_INTENTS.UNKNOWN
        ? "I’m not fully sure what you want to do yet. Are you trying to log an expense, add money, create a budget, or create a savings goal?"
        : missingFields.length
          ? FIELD_PROMPTS[missingFields[0]] || "What should I use for that?"
          : "",
    status,
  };
}

export function parseCommand(text, previousCommand = null) {
  const raw = normalizeText(text);
  if (!raw) return buildCommand(AI_INTENTS.UNKNOWN, {}, 0.1);

  if (previousCommand?.status === "collecting_missing_fields") {
    return buildCommand(
      previousCommand.intent,
      applyMissingFieldAnswer(previousCommand, raw),
      previousCommand.confidence || 0.7
    );
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
  } else if (intent === AI_INTENTS.CREATE_BUDGET) {
    parsedData.amount = amount;
    parsedData.label = extractBudgetLabel(raw);
    parsedData.category = inferExpenseCategory(parsedData.label || raw);
    parsedData.period = extractPeriod(raw);
  } else if (intent === AI_INTENTS.CREATE_SAVINGS_GOAL) {
    parsedData.targetAmount = amount;
    parsedData.label = extractGoalLabel(raw);
    parsedData.targetDate = extractTargetDate(raw);
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
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

