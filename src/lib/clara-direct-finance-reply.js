import { buildWalletDirectReply } from "@/lib/clara-wallet-direct-finance-reply";
import { buildDashboardCardsDirectReply } from "@/lib/clara-dashboard-cards-ai-reader";
import { buildDashboardSummaryDirectReply } from "@/lib/clara-dashboard-summary-ai-reader";
import { buildIncomeHubDirectReply } from "@/lib/clara-income-direct-finance-reply";
import {
  filterTransactionHubTimeline,
  logTransactionHubAiReader,
  summarizeTransactionRecords,
} from "@/lib/clara-transaction-hub-ai-reader";

const TRANSACTION_WORDS = [
  "transaction",
  "transactions",
  "transaction hub",
  "latest transaction",
  "income transaction",
  "income transactions",
  "expense transaction",
  "expense transactions",
  "transfer",
  "transfers",
  "spend",
  "spent",
  "expense",
  "expenses",
  "wallet activity",
  "money in",
  "money out",
  "happened",
  "activity",
  "history",
];

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function peso(value) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "the recorded date";
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAmount(transaction) {
  const amount = Math.abs(Number(transaction?.amount || transaction?.signedAmount || 0));
  if (transaction?.group === "income") return `+${peso(amount)}`;
  if (transaction?.group === "expense" || transaction?.group === "savings") return `-${peso(amount)}`;
  return peso(amount);
}

function formatTransactionLine(transaction, index) {
  const wallet = transaction?.group === "transfer"
    ? [transaction?.fromWalletName || "Wallet", transaction?.toWalletName || "Wallet"].join(" → ")
    : transaction?.walletName || "No wallet shown";

  const status = transaction?.group === "expense" && transaction?.budgetStatus
    ? ` · ${transaction.budgetStatus}`
    : "";

  return `${index + 1}. ${transaction?.title || "Transaction"} — ${formatAmount(transaction)} — ${wallet}${status}`;
}

function summarizeLabel(filters = {}) {
  if (filters.latest) return "latest";
  if (filters.today) return "today";
  if (filters.yesterday) return "yesterday";
  if (filters.thisWeek) return "this_week";
  if (filters.thisMonth) return "this_month";
  if (filters.thisYear) return "this_year";
  if (filters.income) return "income";
  if (filters.expense) return "expense";
  if (filters.transfer) return "transfer";
  return "all";
}

function hasTypeFilter(filters = {}) {
  return Boolean(filters.income || filters.expense || filters.transfer || filters.savings || filters.wallet || filters.emergencyFund);
}

function detectTransactionQuery(message = "") {
  const text = normalizeText(message);
  if (!text) return null;

  const asksWhereTransferred = /where\s+(did|do|was|is)?.*transfer|transfer.*where|moved.*where|where.*moved/.test(text);
  const hasTransactionWord = TRANSACTION_WORDS.some((word) => text.includes(word));
  const asksSpendingToday = /(what|how much).*\b(spend|spent)\b/.test(text);
  const hasPeriodIntent = /\b(today|yesterday|this week|week|this month|month|this year|year|202\d)\b/.test(text);
  const asksTimelineSummary = /\b(what happened|show|check|summary|summarize|activity|history|records?)\b/.test(text) && hasPeriodIntent;

  if (!hasTransactionWord && !asksSpendingToday && !asksWhereTransferred && !asksTimelineSummary) return null;

  const filters = {
    latest: /latest|last|recent|newest/.test(text),
    today: /today|this day/.test(text),
    yesterday: /yesterday/.test(text),
    thisWeek: /this week|week/.test(text),
    thisMonth: /this month|month/.test(text),
    thisYear: /this year|year|202\d/.test(text),
    income: /income|salary|payday|money in|cash in|deposit/.test(text),
    expense: /expense|expenses|spend|spent|money out|purchase|bought|buy/.test(text),
    transfer: /transfer|transfers|moved|send|sent/.test(text),
    savings: /savings|saving goal|piggy/.test(text),
    wallet: /wallet activity|wallet transaction/.test(text),
    emergencyFund: /emergency fund|emergency/.test(text),
    asksWhereTransferred,
  };

  if (asksWhereTransferred) {
    filters.transfer = true;
    filters.latest = true;
  }

  if (!filters.today && !filters.yesterday && !filters.thisWeek && !filters.thisMonth && !filters.thisYear && !filters.latest && /show all|all transactions|what happened/.test(text)) {
    filters.thisMonth = text.includes("month");
    filters.thisYear = text.includes("year") || /202\d/.test(text);
  }

  return filters;
}

function getTransactionHubSnapshot(context = {}) {
  return context?.transactionHubSnapshot || null;
}

function noConnectionReply() {
  return "Transaction Hub data is not connected yet, so I can’t honestly say I checked real records.";
}

function noRecordsReply(filters = {}) {
  if (filters.today) return "I checked your Transaction Hub, but I don’t see any transactions recorded today.";
  if (filters.yesterday) return "I checked your Transaction Hub, but I don’t see any transactions recorded yesterday.";
  if (filters.thisWeek) return "I checked your Transaction Hub, but I don’t see any matching Transaction Hub records this week.";
  if (filters.thisMonth) return "I checked your Transaction Hub, but I don’t see any matching Transaction Hub records this month.";
  if (filters.thisYear) return "I checked your Transaction Hub, but I don’t see any matching Transaction Hub records this year.";
  if (filters.income) return "I checked your Transaction Hub, but I don’t see any income transactions recorded yet.";
  if (filters.expense) return "I checked your Transaction Hub, but I don’t see any expense transactions matching that request.";
  if (filters.transfer) return "I checked your Transaction Hub, but I don’t see any transfer records matching that request.";
  return "I checked your Transaction Hub, but I don’t see any matching Transaction Hub records.";
}

function latestTransactionReply(transaction = {}) {
  const walletPhrase = transaction.group === "transfer"
    ? `${transaction.fromWalletName || "Wallet"} → ${transaction.toWalletName || "Wallet"}`
    : transaction.walletName
      ? `added to ${transaction.walletName}`
      : "with no wallet shown";
  const notePhrase = transaction.note ? ` Note: ${transaction.note}` : "";
  return `I checked your Transaction Hub. Your latest transaction is ${transaction.title || "Transaction"} for ${formatAmount(transaction)}, recorded on ${formatDate(transaction.date)}, ${walletPhrase}.${notePhrase}`;
}

function whereTransferredReply(snapshot = {}, filters = {}) {
  const transfers = filterTransactionHubTimeline(snapshot.timeline || [], { transfer: true, latest: true });
  const latestIncome = filterTransactionHubTimeline(snapshot.timeline || [], { income: true, latest: true })[0] || null;
  const latestTransfer = transfers[0] || null;

  logTransactionHubAiReader(`Query detected: ${summarizeLabel(filters)}`);
  logTransactionHubAiReader("Matched records:", latestTransfer ? 1 : 0);

  if (latestTransfer) {
    const amount = latestIncome && Math.abs(latestIncome.amount) === Math.abs(latestTransfer.amount)
      ? Math.abs(latestIncome.amount)
      : Math.abs(latestTransfer.amount);
    return `I checked your Transaction Hub. The latest matching transfer shows ${peso(amount)} moved from ${latestTransfer.fromWalletName || "one wallet"} to ${latestTransfer.toWalletName || "another wallet"}.`;
  }

  if (latestIncome) return "I checked your Transaction Hub. I can see the latest income, but I don’t see a matching transfer record connected to it.";
  return "I checked your Transaction Hub, but I don’t see enough income or transfer records to know where it was transferred.";
}

function recordsReply(records = [], filters = {}) {
  const label = filters.yesterday
    ? "yesterday"
    : filters.today
      ? "today"
      : filters.thisWeek
        ? "this week"
        : filters.thisMonth
          ? "this month"
          : filters.thisYear
            ? "this year"
            : filters.income
              ? "income transactions"
              : filters.expense
                ? "expense transactions"
                : filters.transfer
                  ? "transfers"
                  : "matching transactions";

  const summary = summarizeTransactionRecords(records);
  const visibleRecords = records.slice(0, 12);
  const moreCount = Math.max(records.length - visibleRecords.length, 0);
  const lines = visibleRecords.map(formatTransactionLine).join("\n");
  const moreLine = moreCount > 0 ? `\n\nPlus ${moreCount} more record${moreCount === 1 ? "" : "s"}.` : "";

  return `I checked your Transaction Hub and found ${records.length} ${records.length === 1 ? "transaction" : "transactions"} ${label}:\n\n${lines}${moreLine}\n\nTotal in: ${peso(summary.totalMoneyIn)}\nTotal out: ${peso(summary.totalMoneyOut)}\nNet flow: ${peso(summary.netFlow)}.`;
}

function getMatchingRecords(snapshot = {}, filters = {}) {
  if (filters.asksWhereTransferred) return filterTransactionHubTimeline(snapshot.timeline || [], { transfer: true, latest: true });
  const records = filterTransactionHubTimeline(snapshot.timeline || [], filters);
  if (filters.latest) {
    const latest = records[0] || (hasTypeFilter(filters) ? null : snapshot.latestTransaction || null);
    return latest ? [latest] : [];
  }
  return records;
}

function asGroundedPackage(packageData = {}) {
  return {
    ...packageData,
    toString() {
      return String(packageData.localFallbackReply || "");
    },
    valueOf() {
      return String(packageData.localFallbackReply || "");
    },
    [Symbol.toPrimitive]() {
      return String(packageData.localFallbackReply || "");
    },
  };
}

function attachGroundedPackageToContext(context, transactionReply) {
  if (!context || typeof context !== "object" || !transactionReply?.handled) return;
  context.transactionHubGroundedReplyPackage = transactionReply;
  context.__transactionHubGroundedReplyPackage = transactionReply;
}

export function buildTransactionHubGroundedReply(message = "", context = {}) {
  const filters = detectTransactionQuery(message);
  if (!filters) return { handled: false };

  const snapshot = getTransactionHubSnapshot(context);
  if (!snapshot || snapshot.connected !== true) {
    return asGroundedPackage({
      handled: true,
      localFallbackReply: noConnectionReply(),
      shouldUseGemini: false,
      geminiPrompt: "",
      facts: { reason: "transaction_hub_not_connected" },
      source: "transaction_hub_grounded",
    });
  }

  if (filters.asksWhereTransferred) {
    const localFallbackReply = whereTransferredReply(snapshot, filters);
    return asGroundedPackage({
      handled: true,
      localFallbackReply,
      shouldUseGemini: false,
      geminiPrompt: "",
      facts: { queryLabel: summarizeLabel(filters) },
      source: "transaction_hub_grounded",
    });
  }

  const records = getMatchingRecords(snapshot, filters);
  const queryLabel = summarizeLabel(filters);
  logTransactionHubAiReader(`Query detected: ${queryLabel}`);
  logTransactionHubAiReader("Matched records:", records.length);

  if (!records.length) {
    return asGroundedPackage({
      handled: true,
      localFallbackReply: noRecordsReply(filters),
      shouldUseGemini: false,
      geminiPrompt: "",
      facts: { queryLabel, matchedRecords: [], summary: summarizeTransactionRecords([]) },
      source: "transaction_hub_grounded",
    });
  }

  const localFallbackReply = filters.latest ? latestTransactionReply(records[0]) : recordsReply(records, filters);
  return asGroundedPackage({
    handled: true,
    localFallbackReply,
    shouldUseGemini: false,
    geminiPrompt: "",
    facts: { queryLabel, summary: summarizeTransactionRecords(records) },
    source: "transaction_hub_grounded",
  });
}

export function buildContextualFinanceReply(message = "", context = {}) {
  const walletReply = buildWalletDirectReply(message, context);
  if (walletReply) return walletReply;

  const dashboardCardsReply = buildDashboardCardsDirectReply(message, context);
  if (dashboardCardsReply) return dashboardCardsReply;

  const dashboardSummaryReply = buildDashboardSummaryDirectReply(message, context);
  if (dashboardSummaryReply) return dashboardSummaryReply;

  const incomeReply = buildIncomeHubDirectReply(message, context);
  if (incomeReply) return incomeReply;

  const transactionReply = buildTransactionHubGroundedReply(message, context);

  if (transactionReply?.handled) {
    attachGroundedPackageToContext(context, transactionReply);
    return transactionReply.localFallbackReply || String(transactionReply || "");
  }

  return "";
}
