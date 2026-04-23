import { getCommandSchema } from "./commandSchema";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return normalizeText(value).toLowerCase();
}

function isPresent(value) {
  return value !== null && value !== undefined && value !== "";
}

function cleanCapturedValue(value) {
  return normalizeText(value)
    .replace(
      /\b(?:from|using|via|under|category|wallet|today|tomorrow|yesterday)\b.*$/i,
      ""
    )
    .replace(/[.,]+$/, "")
    .trim();
}

function extractAmount(text) {
  const raw = normalizeText(text);

  const pesoMatch = raw.match(
    /(?:₱\s*|php\s*)?(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)/i
  );
  if (!pesoMatch) return null;

  const parsed = Number(String(pesoMatch[1]).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractDate(text) {
  const t = lower(text);

  if (t.includes("today")) return "today";
  if (t.includes("tomorrow")) return "tomorrow";
  if (t.includes("yesterday")) return "yesterday";

  const isoMatch = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return null;
}

function extractPeriod(text) {
  const t = lower(text);

  if (t.includes("daily")) return "daily";
  if (t.includes("weekly")) return "weekly";
  if (t.includes("monthly")) return "monthly";
  if (t.includes("yearly")) return "yearly";

  return null;
}

function extractSimpleCategory(text) {
  const t = lower(text);

  const categories = [
    "food",
    "transport",
    "housing",
    "utilities",
    "entertainment",
    "shopping",
    "health",
    "education",
    "personal",
    "other",
  ];

  return categories.find((category) => t.includes(category)) || null;
}

function isLikelyCategoryOnly(text) {
  const value = lower(text);
  return [
    "food",
    "transport",
    "housing",
    "utilities",
    "entertainment",
    "shopping",
    "health",
    "education",
    "personal",
    "other",
  ].includes(value);
}

function extractItem(text) {
  const raw = normalizeText(text);
  const t = raw.toLowerCase();

  if (!raw || isLikelyCategoryOnly(raw)) return null;

  const stopTokens =
    "(?=\\s+(?:from|using|via|under|category|wallet)\\b|\\s+(?:today|tomorrow|yesterday)\\b|\\s+\\d{4}-\\d{2}-\\d{2}\\b|$)";

  const patterns = [
    new RegExp(
      `\\bspent\\s+(?:₱\\s*|php\\s*)?(?:\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)\\s+on\\s+(.+?)${stopTokens}`,
      "i"
    ),
    new RegExp(
      `\\bpaid\\s+(?:₱\\s*|php\\s*)?(?:\\d{1,3}(?:,\\d{3})*(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)\\s+for\\s+(.+?)${stopTokens}`,
      "i"
    ),
    new RegExp(`\\bbought\\s+(.+?)${stopTokens}`, "i"),
    new RegExp(`\\bfor\\s+(.+?)${stopTokens}`, "i"),
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) {
      const item = cleanCapturedValue(match[1]);
      if (item && !isLikelyCategoryOnly(item)) {
        return item;
      }
    }
  }

  if (t.includes("milk tea")) return "milk tea";
  if (t.includes("coffee")) return "coffee";
  if (t.includes("groceries")) return "groceries";
  if (t.includes("fare")) return "fare";
  if (t.includes("milk")) return "milk";

  return null;
}

function extractName(text, intent) {
  const raw = normalizeText(text);

  if (intent === "CREATE_BUDGET") {
    const match = raw.match(
      /budget(?:\s+for|\s+called|\s+named)?\s+([a-z0-9\s'-]+)/i
    );
    if (match?.[1]) return normalizeText(match[1]);
  }

  if (intent === "CREATE_SAVINGS_GOAL") {
    const match = raw.match(
      /(?:goal|save for|saving for|called|named)\s+([a-z0-9\s'-]+)/i
    );
    if (match?.[1]) return normalizeText(match[1]);
  }

  return null;
}

function extractTargetAmount(text) {
  return extractAmount(text);
}

function extractDeadline(text) {
  const t = lower(text);

  if (t.includes("next month")) return "next month";
  if (t.includes("next year")) return "next year";

  const isoMatch = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (isoMatch) return isoMatch[1];

  return null;
}

function extractWallet(text, financeSummary = {}) {
  const t = lower(text);
  const wallets = Array.isArray(financeSummary.wallets)
    ? [...financeSummary.wallets]
    : [];

  wallets.sort((a, b) => lower(b?.name).length - lower(a?.name).length);

  const matched = wallets.find((wallet) => {
    const walletName = lower(wallet?.name);
    return walletName && t.includes(walletName);
  });

  return matched?.name || null;
}

function buildMissingFields(schema, fields) {
  return schema.required.filter((key) => !isPresent(fields[key]));
}

export function extractFields(intent, text, financeSummary = {}) {
  const schema = getCommandSchema(intent);

  if (!schema) {
    return {
      intent,
      fields: {},
      missingFields: [],
    };
  }

  const rawText = normalizeText(text);
  const fields = {};

  if (intent === "LOG_EXPENSE") {
    fields.amount = extractAmount(rawText);
    fields.item = extractItem(rawText);
    fields.category = extractSimpleCategory(rawText);
    fields.wallet = extractWallet(rawText, financeSummary);
    fields.date = extractDate(rawText) || schema.defaults?.date || null;
  }

  if (intent === "ADD_MONEY") {
    fields.amount = extractAmount(rawText);
    fields.wallet = extractWallet(rawText, financeSummary);
  }

  if (intent === "CREATE_BUDGET") {
    fields.name = extractName(rawText, intent);
    fields.amount = extractAmount(rawText);
    fields.period = extractPeriod(rawText);
  }

  if (intent === "CREATE_SAVINGS_GOAL") {
    fields.name = extractName(rawText, intent);
    fields.target_amount = extractTargetAmount(rawText);
    fields.deadline = extractDeadline(rawText);
  }

  return {
    intent,
    fields,
    missingFields: buildMissingFields(schema, fields),
  };
}