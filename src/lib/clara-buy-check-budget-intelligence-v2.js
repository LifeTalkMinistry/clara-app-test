import {
  clean,
  safeList,
  safeRecord,
  toNumber,
} from "./clara-buy-check-budget-core.js";
import { buildContextPackage, buildContextSignals } from "./clara-buy-check-context-contract.js";

const PH_TIME_ZONE = "Asia/Manila";

function signedMoney(value = 0) {
  const amount = toNumber(value);
  return `${amount < 0 ? "-" : ""}₱${Math.abs(amount).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function remainingOrShortfall(value = 0) {
  const amount = toNumber(value);
  return amount >= 0
    ? `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })} remaining`
    : `₱${Math.abs(amount).toLocaleString("en-PH", { maximumFractionDigits: 0 })} short`;
}

function getPHDateString(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PH_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function normalizeNeedType(reason = "", category = "") {
  const text = `${reason} ${category}`.toLowerCase();
  if (/health|medical|medicine|doctor|work|job|school|study|replacement|replace|broken|repair|lost/.test(text)) return "need";
  if (/savings|goal|invest/.test(text)) return "savings";
  return "want";
}

function saveLocalList(key, payload) {
  try {
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    const list = Array.isArray(current) ? current : [];
    list.unshift(payload);
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

function dispatchFinanceUpdates() {
  if (typeof window === "undefined") return;
  ["clara-expenses-updated", "clara-finance-updated", "clara-wallets-updated", "clara-wallet-transactions-updated", "clara-local-finance-updated"].forEach((name) => window.dispatchEvent(new Event(name)));
}

export {
  budgetCoverageFromAssessment,
  createDecisionState,
  createInitialState,
  createMessage,
  money,
  parsePrice,
} from "./clara-buy-check-budget-core.js";
export { analyzeBuyCheckBudgetCoverage } from "./clara-buy-check-budget-engine.js";
export { normalizeExpenseCategory } from "./clara-buy-check-category-engine.js";
export { getWalletOptions } from "./clara-buy-check-wallet-engine.js";
export {
  buildContextPackage,
  buildContextSignals,
  clean,
  safeList,
  safeRecord,
  toNumber,
  getPHDateString,
  normalizeNeedType,
  saveLocalList,
  dispatchFinanceUpdates,
  remainingOrShortfall,
  signedMoney,
};
