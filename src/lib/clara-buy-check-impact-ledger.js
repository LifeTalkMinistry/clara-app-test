const IMPACT_LEDGER_STORAGE_KEY = "clara_buy_check_impact_ledger_v1";
const LEGACY_NOT_BUY_STORAGE_KEY = "clara_buy_check_not_buy_reflections";
const PH_TIME_ZONE = "Asia/Manila";
const MAX_IMPACT_ENTRIES = 365;

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value = 0) {
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function readStorageList(key) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeCreatedAt(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function buildEntryId(createdAt, item, amount) {
  return `${createdAt}|${clean(item).toLowerCase()}|${toNumber(amount)}`;
}

function normalizeImpactEntry(entry = {}) {
  const purchase = entry.purchase && typeof entry.purchase === "object" ? entry.purchase : {};
  const item = clean(entry.item || purchase.item || "");
  const amount = toNumber(entry.amount ?? purchase.price ?? purchase.amount);
  const createdAt = normalizeCreatedAt(entry.created_at || entry.createdAt);
  const reason = clean(entry.reason || entry.reflection || purchase.reason || "");
  if (!item || amount <= 0 || !createdAt) return null;

  return {
    id: clean(entry.id) || buildEntryId(createdAt, item, amount),
    status: "avoided",
    item,
    amount,
    reason,
    created_at: createdAt,
  };
}

function getPHMonthKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  return year && month ? `${year}-${month}` : "";
}

function monthLabel(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value || "");
  if (Number.isNaN(date.getTime())) return "This month";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatImpactDate(value) {
  const date = value instanceof Date ? value : new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PH_TIME_ZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

function readAvoidedSpendingLedger() {
  const primary = readStorageList(IMPACT_LEDGER_STORAGE_KEY);
  const legacy = readStorageList(LEGACY_NOT_BUY_STORAGE_KEY);
  const seen = new Set();

  return [...primary, ...legacy]
    .map(normalizeImpactEntry)
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function getCurrentMonthImpact(now = new Date()) {
  const currentMonthKey = getPHMonthKey(now);
  const entries = readAvoidedSpendingLedger().filter((entry) => getPHMonthKey(entry.created_at) === currentMonthKey);
  const total = entries.reduce((sum, entry) => sum + toNumber(entry.amount), 0);

  return {
    monthKey: currentMonthKey,
    monthLabel: monthLabel(now),
    total,
    count: entries.length,
    entries,
  };
}

function saveAvoidedSpendingDecision(payload = {}) {
  if (typeof window === "undefined") return null;
  const entry = normalizeImpactEntry(payload);
  if (!entry) return null;

  try {
    const current = readStorageList(IMPACT_LEDGER_STORAGE_KEY)
      .map(normalizeImpactEntry)
      .filter(Boolean);
    const next = [entry, ...current.filter((existing) => existing.id !== entry.id)].slice(0, MAX_IMPACT_ENTRIES);
    window.localStorage.setItem(IMPACT_LEDGER_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("clara:buy-check-impact-updated", { detail: entry }));
  } catch {
    // The decision memory still succeeds when local storage is unavailable.
  }

  return entry;
}

export {
  IMPACT_LEDGER_STORAGE_KEY,
  formatImpactDate,
  getCurrentMonthImpact,
  readAvoidedSpendingLedger,
  saveAvoidedSpendingDecision,
};
