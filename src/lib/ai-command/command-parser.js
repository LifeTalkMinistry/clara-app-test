import { inferExpenseCategory } from "@/lib/ai-command/category-inference";
import {
  getDateScopeMeta,
  getPHMonthKey,
  getTodayPHDateString,
  parseLooseDateToPHDate,
} from "@/lib/ai-command/time";

export const AI_INTENTS = {
  GET_LAST_EXPENSE: "GET_LAST_EXPENSE",
  LOG_EXPENSE: "LOG_EXPENSE",
  ADD_MONEY: "ADD_MONEY",
  TRANSFER_MONEY: "TRANSFER_MONEY",
  CHECK_BALANCE: "CHECK_BALANCE",
  READ_SPENDING: "READ_SPENDING",
  READ_WALLET_HISTORY: "READ_WALLET_HISTORY",
  READ_BUDGET_STATUS: "READ_BUDGET_STATUS",
  READ_SAVINGS_STATUS: "READ_SAVINGS_STATUS",
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
  MULTI_ACTION: "MULTI_ACTION",
  UNKNOWN: "UNKNOWN",
};

export const WRITE_INTENTS = new Set([
  AI_INTENTS.LOG_EXPENSE,
  AI_INTENTS.ADD_MONEY,
  AI_INTENTS.TRANSFER_MONEY,
  AI_INTENTS.CREATE_BUDGET,
  AI_INTENTS.CREATE_SAVINGS_GOAL,
  AI_INTENTS.MULTI_ACTION,
]);

const FIELD_PROMPTS = {
  amount: "How much should I use?",
  item: "What should I log this as?",
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
const ACTION_SPLIT_RE = /\s+(?:and then|then|and)\s+/i;

const COMMON_EXPENSE_KEYWORDS = [
  "food",
  "meal",
  "meals",
  "lunch",
  "dinner",
  "breakfast",
  "snack",
  "snacks",
  "coffee",
  "milk tea",
  "milktea",
  "tea",
  "water",
  "drink",
  "drinks",
  "groceries",
  "grocery",
  "market",
  "restaurant",
  "fast food",
  "mcdo",
  "jollibee",
  "chowking",
  "kfc",
  "grab",
  "grabfood",
  "foodpanda",
  "fare",
  "transport",
  "transportation",
  "bus",
  "jeep",
  "jeepney",
  "taxi",
  "tricycle",
  "train",
  "lrt",
  "mrt",
  "gas",
  "fuel",
  "parking",
  "load",
  "mobile load",
  "internet",
  "wifi",
  "bill",
  "bills",
  "electricity",
  "water bill",
  "rent",
  "medicine",
  "meds",
  "pharmacy",
  "hospital",
  "doctor",
  "shopping",
  "clothes",
  "shirt",
  "shoes",
  "personal",
  "school",
  "tuition",
  "book",
  "books",
  "subscription",
  "netflix",
  "spotify",
  "youtube",
  "game",
  "gift",
  "donation",
  "tithe",
  "offering",
];

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function cleanupLabel(value) {
  return normalizeText(value)
    .replace(/^(a|an|the|my|for|of|to|into|from|using)\s+/i, "")
    .replace(/\s+(this month|today|yesterday|this morning|last night)$/i, "")
    .replace(/[?.!,]+$/g, "")
    .trim();
}

function isGenericExpenseStarter(value) {
  const normalized = normalizeLower(value)
    .replace(/[?.!,]+$/g, "")
    .trim();

  return [
    "i want to log",
    "want to log",
    "log",
    "log expense",
    "log an expense",
    "i want to log expense",
    "i want to log an expense",
    "i want to add an expense",
    "add an expense",
    "add expense",
    "expense",
    "spent",
    "i spent",
    "i want to spend",
    "buy",
    "i want to buy",
    "i bought",
    "paid",
    "i paid",
  ].includes(normalized);
}

function stripAmountPhrase(text) {
  return normalizeText(text)
    .replace(CURRENCY_RE, " ")
    .replace(/\b(pesos?|php)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractAmount(text) {
  const match = normalizeText(text).match(CURRENCY_RE);
  if (!match) return null;

  const amount = Number(String(match[1]).replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function extractAfterKeyword(text, keyword) {
  const match = normalizeText(text).match(new RegExp(`\\b${keyword}\\s+(.+)$`, "i"));
  return match ? cleanupLabel(match[1]) : "";
}

function hasCommonExpenseKeyword(text) {
  const lower = normalizeLower(text);

  return COMMON_EXPENSE_KEYWORDS.some((keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(lower);
  });
}

function looksLikeBareExpense(text) {
  const lower = normalizeLower(text);
  const amount = extractAmount(lower);

  if (!amount) return false;
  if (/\b(should i|can i afford|is it okay|decision|advice|recommend|plan|analyze|analyse)\b/.test(lower)) {
    return false;
  }

  if (/\b(add|put|deposit|cash in|top up|transfer|move|send)\b/.test(lower)) {
    return false;
  }

  return hasCommonExpenseKeyword(lower);
}

function detectScope(text) {
  const lower = normalizeLower(text);

  if (/\byesterday|last night\b/.test(lower)) return "yesterday";
  if (/\blast month\b/.test(lower)) return "last month";
  if (/\bthis month\b/.test(lower)) return "this month";
  if (/\bthis morning\b/.test(lower)) return "this morning";

  return "today";
}

function detectIntent(text) {
  const lower = normalizeLower(text);

  if (
    /\b(last expense|latest expense|recent expense|most recent expense|last spending|latest spending|recent spending|what was my last expense|what did i spend recently|what was my recent expense)\b/.test(
      lower
    )
  ) {
    return AI_INTENTS.GET_LAST_EXPENSE;
  }

  if (looksLikeBareExpense(lower)) {
    return AI_INTENTS.LOG_EXPENSE;
  }

  if (/\b(transfer|move|send)\b/.test(lower) && /\b(to|from|wallet|gcash|maya|cash)\b/.test(lower)) {
    return AI_INTENTS.TRANSFER_MONEY;
  }

  if (/\b(wallet history|transaction history|history for|recent transactions)\b/.test(lower)) {
    return AI_INTENTS.READ_WALLET_HISTORY;
  }

  if (/\b(how much did i spend|spent today|spent yesterday|spending today|spending yesterday)\b/.test(lower)) {
    return AI_INTENTS.READ_SPENDING;
  }

  if (/\b(budget left|budget status|budget remaining|how is my budget|how are my budgets)\b/.test(lower)) {
    return AI_INTENTS.READ_BUDGET_STATUS;
  }

  if (
    /\b(savings status|savings goals?|saving goals?|save-for|save for goal|how much saved)\b/.test(lower) &&
    !/\bcreate|make|set|help me create\b/.test(lower)
  ) {
    return AI_INTENTS.READ_SAVINGS_STATUS;
  }

  if (/\b(balance|money left|how much.*have|left for today|left this month|wallet balances?)\b/.test(lower)) {
    return AI_INTENTS.CHECK_BALANCE;
  }

  if (/\b(analy[sz]e|analysis|spending pattern|breakdown|where did my money)\b/.test(lower)) {
    return AI_INTENTS.ANALYZE_SPENDING;
  }

  if (/\b(save|saving|savings suggestion|suggest.*saving)\b/.test(lower) && !/\bgoal\b/.test(lower)) {
    return AI_INTENTS.SUGGEST_SAVINGS;
  }

  if (/\b(plan.*spend|spending today|budget today|help.*spending)\b/.test(lower)) {
    return AI_INTENTS.PLAN_SPENDING;
  }

  if (/\b(emergency fund|survive|months can i)\b/.test(lower)) {
    return AI_INTENTS.EMERGENCY_FUND_PLAN;
  }

  if (/\b(should i|can i afford|is it okay|buy this|decision)\b/.test(lower)) {
    return AI_INTENTS.DECISION_GUIDANCE;
  }

  if (/\b(plan my day|daily plan|schedule|today'?s plan|today plan)\b/.test(lower)) {
    return AI_INTENTS.DAILY_PLANNING;
  }

  if (/\b(remind me|reminder|remember to)\b/.test(lower)) {
    return AI_INTENTS.CREATE_REMINDER;
  }

  if (/\b(habit|routine)\b/.test(lower)) {
    return AI_INTENTS.HABIT_TRACKING;
  }

  if (/\b(productivity|focus|procrastinat|get things done)\b/.test(lower)) {
    return AI_INTENTS.PRODUCTIVITY_COACHING;
  }

  if (/\b(goal plan|plan a goal|life goal)\b/.test(lower)) {
    return AI_INTENTS.GOAL_PLANNING;
  }

  if (/\b(lifestyle|organize my life|life advice)\b/.test(lower)) {
    return AI_INTENTS.LIFESTYLE_GUIDANCE;
  }

  if (/\b(stress|overwhelmed|anxious|guilty|feel bad)\b/.test(lower)) {
    return AI_INTENTS.EMOTIONAL_GUIDANCE;
  }

  if (/\b(budget|allocate|allocation)\b/.test(lower)) {
    return AI_INTENTS.CREATE_BUDGET;
  }

  if (
    /\b(create|make|set|start|open|help me create)\b/.test(lower) &&
    /\b(savings goals?|saving goals?|goal)\b/.test(lower)
  ) {
    return AI_INTENTS.CREATE_SAVINGS_GOAL;
  }

  if (/\b(savings goals?|saving goals?|goal)\b/.test(lower)) {
    return AI_INTENTS.CREATE_SAVINGS_GOAL;
  }

  if (/\b(add|put|deposit|cash in|top up)\b/.test(lower) && /\b(to|into|wallet|gcash|maya|cash)\b/.test(lower)) {
    return AI_INTENTS.ADD_MONEY;
  }

  if (/\b(bought|buy|spent|paid|log|expense|purchased)\b/.test(lower)) {
    return AI_INTENTS.LOG_EXPENSE;
  }

  return AI_INTENTS.UNKNOWN;
}

function extractWallet(text, fallbackToMention = true) {
  const raw = normalizeText(text);
  const lower = raw.toLowerCase();

  const matches = [
    raw.match(/\b(?:from|using)\s+([a-z0-9 _-]{2,40})(?:\s+for\b|\s+under\b|\s+today\b|\s+yesterday\b|$)/i),
    raw.match(/\b(?:into|to|wallet)\s+([a-z0-9 _-]{2,40})(?:\s+for\b|\s+today\b|\s+yesterday\b|$)/i),
  ].filter(Boolean);

  if (matches[0]) return cleanupLabel(matches[0][1]);
  if (!fallbackToMention) return "";
  if (lower.includes("gcash")) return "GCash";
  if (lower.includes("maya")) return "Maya";
  if (/\bcash\b/.test(lower)) return "Cash";

  return "";
}

function extractTransferWallets(text) {
  const raw = normalizeText(text);
  const fromMatch = raw.match(/\bfrom\s+([a-z0-9 _-]+?)(?:\s+to\b|$)/i);
  const toMatch = raw.match(/\bto\s+([a-z0-9 _-]+?)(?:\s+from\b|$)/i);

  return {
    fromWallet: fromMatch ? cleanupLabel(fromMatch[1]) : "",
    toWallet: toMatch ? cleanupLabel(toMatch[1]) : "",
  };
}

function extractExpenseItem(text) {
  const raw = normalizeText(text);
  const afterFor = extractAfterKeyword(raw, "for");
  if (afterFor && !isGenericExpenseStarter(afterFor)) return afterFor;

  const cleaned = cleanupLabel(
    stripAmountPhrase(raw)
      .replace(/^(i\s+)?(bought|buy|spent|paid|log|purchased)\s*/i, "")
      .replace(/\b(from|using|under|today|yesterday|this morning|last night)\b.*$/i, "")
  );

  if (!cleaned || isGenericExpenseStarter(cleaned)) return "";
  return cleaned;
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
    withoutAmount.match(/\b(?:goal|goals|savings goal|savings goals|saving goal|saving goals)\s+(?:for\s+)?(.+?)(?:\s+by\s+.+)?$/i) ||
    withoutAmount.match(/\bcreate\s+(?:a\s+)?(.+?)\s+goal/i) ||
    withoutAmount.match(/\bmake\s+(?:a\s+)?(?:savings\s+)?goals?\s+for\s+(.+)$/i) ||
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

function getMissingFields(intent, parsedData) {
  return (REQUIRED_FIELDS[intent] || []).filter((field) => {
    if (field === "item") return !parsedData.item && !parsedData.label;
    return !parsedData[field] || (typeof parsedData[field] === "number" && parsedData[field] <= 0);
  });
}

function applyMissingFieldAnswer(command, text) {
  const next = { ...(command?.parsedData || {}) };
  const firstMissing = command?.missingFields?.[0];
  const amount = extractAmount(text);

  if (!firstMissing) return next;

  if (["amount", "targetAmount"].includes(firstMissing)) {
    next[firstMissing] = amount || Number(normalizeText(text).replace(/,/g, ""));
  } else if (firstMissing === "wallet") {
    next.wallet = extractWallet(text) || normalizeText(text);
  } else if (firstMissing === "fromWallet" || firstMissing === "toWallet") {
    next[firstMissing] = extractWallet(text) || normalizeText(text);
  } else if (firstMissing === "period") {
    next.period = extractPeriod(text);
  } else {
    next[firstMissing] = cleanupLabel(text);
  }

  if (command.intent === AI_INTENTS.LOG_EXPENSE && !next.date) {
    next.date = getTodayPHDateString();
  }

  return next;
}

function applyCorrections(command, text) {
  const next = { ...(command?.parsedData || {}) };
  const lower = normalizeLower(text);
  const amount = extractAmount(text);

  if (amount) {
    if (command.intent === AI_INTENTS.CREATE_SAVINGS_GOAL || /\btarget\b/.test(lower)) {
      next.targetAmount = amount;
    } else {
      next.amount = amount;
    }
  }

  const wallet = extractWallet(text);

  if (wallet && /\b(wallet|from|using|into|to|gcash|maya|cash)\b/.test(lower)) {
    if (command.intent === AI_INTENTS.TRANSFER_MONEY) {
      const transferWallets = extractTransferWallets(text);
      if (transferWallets.fromWallet) next.fromWallet = transferWallets.fromWallet;
      if (transferWallets.toWallet) next.toWallet = transferWallets.toWallet;
    } else {
      next.wallet = wallet;
    }
  }

  const labelMatch = normalizeText(text).match(/\b(?:label|name|call it|for|under)\s+(.+)$/i);

  if (labelMatch) {
    const label = cleanupLabel(labelMatch[1]);

    if (command.intent === AI_INTENTS.LOG_EXPENSE) {
      next.item = label;
      next.label = label;
      next.category = next.category || inferExpenseCategory(label);
    } else {
      next.label = label;
    }
  }

  const detectedDate = parseLooseDateToPHDate(text);
  if (detectedDate && command.intent === AI_INTENTS.LOG_EXPENSE) next.date = detectedDate;

  const targetDate = extractTargetDate(text);
  if (targetDate) next.targetDate = targetDate;

  return next;
}

function buildSingleCommand(intent, parsedData = {}, confidence = 0.5, conversationalText = "") {
  const safeIntent = AI_INTENTS[intent] || intent || AI_INTENTS.UNKNOWN;
  const missingFields = getMissingFields(safeIntent, parsedData);
  const isWrite = WRITE_INTENTS.has(safeIntent) && safeIntent !== AI_INTENTS.MULTI_ACTION;
  const canExecute = safeIntent !== AI_INTENTS.UNKNOWN && missingFields.length === 0;

  const status =
    safeIntent === AI_INTENTS.UNKNOWN
      ? "detected"
      : canExecute && isWrite
        ? "awaiting_confirmation"
        : canExecute
          ? "ready_to_execute"
          : "collecting_missing_fields";

  const defaultPrompt =
    safeIntent === AI_INTENTS.LOG_EXPENSE
      ? missingFields[0] === "amount"
        ? "How much was it?"
        : missingFields[0] === "item"
          ? "What did you spend it on?"
          : missingFields[0] === "wallet"
            ? "Which wallet should I use?"
            : FIELD_PROMPTS[missingFields[0]]
      : FIELD_PROMPTS[missingFields[0]];

  return {
    intent: safeIntent,
    confidence,
    parsedData,
    missingFields,
    requiresConfirmation: isWrite,
    canExecute,
    confirmationText: canExecute && isWrite ? generateConfirmation({ intent: safeIntent, parsedData }) : "",
    assistantMessage: conversationalText,
    userPrompt:
      safeIntent === AI_INTENTS.UNKNOWN
        ? conversationalText
        : missingFields.length
          ? conversationalText || defaultPrompt || "What should I use for that?"
          : conversationalText,
    status,
  };
}

function maybeBuildMultiAction(text) {
  const parts = normalizeText(text)
    .split(ACTION_SPLIT_RE)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return null;

  const subcommands = parts.map((part) => parseSingleIntentCommand(part));
  const actionable = subcommands.filter(
    (command) => command.intent !== AI_INTENTS.UNKNOWN && command.intent !== AI_INTENTS.GENERAL_GUIDANCE
  );

  if (actionable.length < 2) return null;

  const missingFields = actionable.flatMap((command) => command.missingFields || []);
  const allExecutable = actionable.every((command) => command.canExecute);

  return {
    intent: AI_INTENTS.MULTI_ACTION,
    confidence: 0.82,
    parsedData: {
      commands: actionable,
    },
    missingFields,
    requiresConfirmation: true,
    canExecute: allExecutable,
    confirmationText: allExecutable
      ? `Just to confirm: ${actionable
          .map((command) =>
            generateConfirmation(command)
              .replace(/^Just to confirm:\s*/i, "")
              .replace(/\s*Should I proceed\?$/i, "")
              .replace(/\s*Should I log it\?$/i, "")
          )
          .join(" Then ")}. Should I do both?`
      : "",
    assistantMessage: "",
    userPrompt: missingFields.length ? FIELD_PROMPTS[missingFields[0]] || "What detail should I use first?" : "",
    status: allExecutable ? "awaiting_confirmation" : "collecting_missing_fields",
    subcommands: actionable,
  };
}

function parseSingleIntentCommand(text, previousCommand = null) {
  const raw = normalizeText(text);

  if (!raw) return buildSingleCommand(AI_INTENTS.UNKNOWN, {}, 0.1);

  if (previousCommand?.status === "collecting_missing_fields") {
    return buildSingleCommand(
      previousCommand.intent,
      applyMissingFieldAnswer(previousCommand, raw),
      previousCommand.confidence || 0.7
    );
  }

  if (previousCommand?.status === "awaiting_confirmation" && !isYesText(raw)) {
    return buildSingleCommand(
      previousCommand.intent,
      applyCorrections(previousCommand, raw),
      previousCommand.confidence || 0.7
    );
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
    parsedData.date = parseLooseDateToPHDate(raw) || getTodayPHDateString();

    if (looksLikeBareExpense(raw)) {
      confidence += 0.12;
    }
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
  } else if (intent === AI_INTENTS.READ_SPENDING) {
    parsedData.scope = detectScope(raw);
  } else if (intent === AI_INTENTS.READ_WALLET_HISTORY) {
    parsedData.wallet = extractWallet(raw);
  } else if (intent === AI_INTENTS.READ_BUDGET_STATUS) {
    parsedData.category = inferExpenseCategory(raw);
    parsedData.period = extractPeriod(raw);
  } else if (intent === AI_INTENTS.READ_SAVINGS_STATUS) {
    parsedData.label = extractGoalLabel(raw);
  } else if (intent === AI_INTENTS.GET_LAST_EXPENSE) {
    parsedData.scope = "latest";
  } else if (intent === AI_INTENTS.DECISION_GUIDANCE) {
    parsedData.decisionSubject = cleanupLabel(raw);
    parsedData.amount = amount || undefined;
  } else if (intent !== AI_INTENTS.UNKNOWN) {
    parsedData.label = cleanupLabel(raw);
  }

  if (amount) confidence += 0.1;

  return buildSingleCommand(intent, parsedData, Math.min(confidence, 0.95));
}

export function buildCommand(intent, parsedData = {}, confidence = 0.5, conversationalText = "") {
  return buildSingleCommand(intent, parsedData, confidence, conversationalText);
}

export function normalizeGeminiCommand(value = {}) {
  const parsedData = value.parsedData && typeof value.parsedData === "object" ? { ...value.parsedData } : {};
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

  if (intent === AI_INTENTS.READ_SPENDING) {
    parsedData.scope = parsedData.scope || "today";
  }

  if (intent === AI_INTENTS.GET_LAST_EXPENSE) {
    parsedData.scope = parsedData.scope || "latest";
  }

  return buildSingleCommand(intent, parsedData, Number(value.confidence) || 0.7, value.assistantMessage || "");
}

export function parseCommand(text, previousCommand = null) {
  const raw = normalizeText(text);

  if (!raw) return buildSingleCommand(AI_INTENTS.UNKNOWN, {}, 0.1);

  if (previousCommand?.intent === AI_INTENTS.MULTI_ACTION && previousCommand?.status === "collecting_missing_fields") {
    const firstPending = (previousCommand.subcommands || []).find((command) => !command.canExecute);
    if (!firstPending) return previousCommand;

    const updatedFirst = parseSingleIntentCommand(raw, firstPending);
    const subcommands = (previousCommand.subcommands || []).map((command) =>
      command === firstPending ? updatedFirst : command
    );

    const allExecutable = subcommands.every((command) => command.canExecute);
    const missingFields = subcommands.flatMap((command) => command.missingFields || []);

    return {
      ...previousCommand,
      parsedData: { commands: subcommands },
      subcommands,
      canExecute: allExecutable,
      missingFields,
      status: allExecutable ? "awaiting_confirmation" : "collecting_missing_fields",
      confirmationText: allExecutable
        ? `Just to confirm: ${subcommands
            .map((command) =>
              generateConfirmation(command)
                .replace(/^Just to confirm:\s*/i, "")
                .replace(/\s*Should I proceed\?$/i, "")
                .replace(/\s*Should I log it\?$/i, "")
            )
            .join(" Then ")}. Should I do both?`
        : "",
      assistantMessage: "",
      userPrompt: missingFields.length ? FIELD_PROMPTS[missingFields[0]] || "What detail should I use first?" : "",
    };
  }

  const multiAction = maybeBuildMultiAction(raw);
  if (multiAction) return multiAction;

  return parseSingleIntentCommand(raw, previousCommand);
}

export function generateConfirmation(command) {
  const data = command.parsedData || {};
  const amount = formatPeso(data.amount || data.targetAmount);
  const label = data.item || data.label || "this";

  if (command.intent === AI_INTENTS.LOG_EXPENSE) {
    return `Just to confirm: ${amount} for ${label} from ${data.wallet} under ${data.category || "other"} on ${data.date || "today"}. Should I log it?`;
  }

  if (command.intent === AI_INTENTS.ADD_MONEY) {
    return `Just to confirm: add ${amount} to your ${data.wallet} wallet. Should I proceed?`;
  }

  if (command.intent === AI_INTENTS.TRANSFER_MONEY) {
    return `Just to confirm: transfer ${amount} from ${data.fromWallet} to ${data.toWallet}. Should I proceed?`;
  }

  if (command.intent === AI_INTENTS.CREATE_BUDGET) {
    return `Just to confirm: create a ${amount} budget for ${titleCase(label)} for ${data.period || "this month"}. Should I proceed?`;
  }

  if (command.intent === AI_INTENTS.CREATE_SAVINGS_GOAL) {
    const deadline = data.targetDate ? ` by ${data.targetDate}` : "";
    return `Just to confirm: create a ${titleCase(label)} savings goal with a target of ${amount}${deadline}. Should I proceed?`;
  }

  return "";
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

export function resolveReadScopeLabel(scope) {
  return getDateScopeMeta(scope).label;
}