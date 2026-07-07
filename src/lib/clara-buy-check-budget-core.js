const PH_TIME_ZONE = "Asia/Manila";
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

const isRecord = (value) => Boolean(value && typeof value === "object");
const safeRecord = (value) => (isRecord(value) ? value : {});
const safeList = (value) => (Array.isArray(value) ? value.filter(isRecord) : []);

const CATEGORY_ALIASES = {
  food: ["food", "foods", "meal", "meals", "coffee", "snack", "snacks", "grocery", "groceries", "dining", "restaurant"],
  transport: ["transport", "transportation", "commute", "fare", "fares", "gas", "fuel", "jeep", "bus", "taxi", "grab", "angkas", "moveit"],
  housing: ["housing", "house", "rent", "mortgage", "apartment"],
  utilities: ["bill", "bills", "utility", "utilities", "electric", "electricity", "water", "internet", "wifi", "load", "subscription", "subscriptions"],
  health: ["health", "medical", "medicine", "doctor", "hospital", "vitamin", "checkup", "wellness", "fitness"],
  education: ["education", "school", "study", "tuition", "books", "supplies"],
  shopping: ["shopping", "shop", "shoe", "shoes", "sneaker", "sneakers", "clothes", "clothing", "shirt", "bag", "watch", "gadget", "phone", "lazada", "shopee"],
  entertainment: ["entertainment", "fun", "leisure", "game", "games", "gaming", "movie", "cinema", "concert", "hobby", "hobbies", "outing"],
  personal: ["personal", "self care", "selfcare", "beauty", "skincare", "makeup", "haircut", "allowance"],
};

const FLEXIBLE_BUDGET_NAMES = [
  "other",
  "others",
  "other expense",
  "other expenses",
  "misc",
  "miscellaneous",
  "random expense",
  "random expenses",
  "excess expense",
  "excess expenses",
  "extra expense",
  "extra expenses",
  "extra spending",
  "flexible spending",
  "unplanned spending",
  "unplanned expense",
  "unplanned expenses",
  "spending allowance",
  "personal allowance",
  "wants budget",
  "want budget",
  "wants",
  "lifestyle",
  "discretionary",
  "discretionary spending",
  "fun money",
  "pocket money",
  "spending buffer",
  "buffer",
  "general spending",
];

const CATEGORY_LABELS = {
  food: "Food",
  transport: "Transportation",
  housing: "Housing",
  utilities: "Bills",
  health: "Health",
  education: "Education",
  shopping: "Shopping",
  entertainment: "Entertainment",
  personal: "Personal",
  other: "Lifestyle",
};

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  return `₱${Math.max(0, toNumber(value)).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function createMessage(role, text) {
  return {
    id: `buy-check-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text: clean(text),
  };
}

function createInitialState(sessionId = "") {
  return {
    sessionId,
    step: "item",
    item: "",
    price: 0,
    reason: "",
    clarification: "",
    followUpAnswer: "",
    purchaseContext: "",
    askedClarification: false,
    planningStatus: null,
    budgetCoverage: null,
    budgetAssessment: null,
    confirmation: null,
    diagnosis: null,
    busy: false,
    done: false,
    messages: [],
  };
}

function createDecisionState() {
  return {
    phase: "choose",
    choice: "",
    explanation: "",
    walletId: "",
    busy: false,
    error: "",
    result: null,
  };
}

function parsePrice(value = "") {
  const match = clean(value).match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  return match ? toNumber(match[1]) : 0;
}

function includesAlias(text, aliases = []) {
  const normalizedText = normalize(text);
  return aliases.some((alias) => {
    const normalizedAlias = normalize(alias);
    return normalizedText === normalizedAlias || normalizedText.includes(normalizedAlias);
  });
}

function inferCategoryKey(value = "") {
  const text = normalize(value);
  if (includesAlias(text, CATEGORY_ALIASES.food)) return "food";
  if (includesAlias(text, CATEGORY_ALIASES.transport)) return "transport";
  if (includesAlias(text, CATEGORY_ALIASES.housing)) return "housing";
  if (includesAlias(text, CATEGORY_ALIASES.utilities)) return "utilities";
  if (includesAlias(text, CATEGORY_ALIASES.health)) return "health";
  if (includesAlias(text, CATEGORY_ALIASES.education)) return "education";
  if (includesAlias(text, CATEGORY_ALIASES.shopping)) return "shopping";
  if (includesAlias(text, CATEGORY_ALIASES.entertainment)) return "entertainment";
  if (includesAlias(text, CATEGORY_ALIASES.personal)) return "personal";
  return "other";
}

function normalizeExpenseCategory(value = "") {
  return inferCategoryKey(value);
}

function walletId(value) {
  const wallet = safeRecord(value);
  return clean(wallet.id ?? wallet.wallet_id ?? wallet.walletId ?? wallet.key ?? wallet.uuid ?? "");
}

function walletName(value) {
  const wallet = safeRecord(value);
  return clean(wallet.name || wallet.wallet_name || wallet.title || wallet.label || wallet.type || "Wallet");
}

function walletBalance(value) {
  const wallet = safeRecord(value);
  return toNumber(
    wallet.derived_balance ??
      wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance ??
      0,
  );
}

function isProtectedWallet(value) {
  const wallet = safeRecord(value);
  return /emergency|reserve|saving|goal/.test(normalize(`${walletName(wallet)} ${wallet.type || ""}`));
}

function getWalletOptions(context = {}, amount = 0) {
  const seen = new Set();
  return safeList(context.wallets)
    .filter((wallet) => !isProtectedWallet(wallet))
    .map((wallet) => {
      const id = walletId(wallet);
      const name = walletName(wallet);
      const balance = walletBalance(wallet);
      const key = id || normalize(name);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      return {
        id,
        name,
        balance,
        enough: Boolean(id) && balance >= toNumber(amount),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.enough) - Number(a.enough) || b.balance - a.balance);
}

function budgetId(value) {
  const budget = safeRecord(value);
  return clean(budget.id ?? budget.budget_id ?? budget.budgetId ?? budget.uuid ?? "");
}

function budgetTitle(value) {
  const budget = safeRecord(value);
  return clean(
    budget.title ||
      budget.name ||
      budget.label ||
      budget.display_name ||
      budget.displayName ||
      budget.category ||
      budget.budget_category ||
      "Budget",
  );
}

function budgetSearchText(value) {
  const budget = safeRecord(value);
  return clean(
    [
      budget.title,
      budget.name,
      budget.label,
      budget.display_name,
      budget.displayName,
      budget.category,
      budget.budget_category,
      budget.budgetCategory,
      budget.expense_category,
      budget.expenseCategory,
      budget.bucket,
      budget.type,
    ]
      .filter(Boolean)
      .join(" "),