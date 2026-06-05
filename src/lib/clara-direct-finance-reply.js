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

function summarizeLabel(filters) {
  if (filters.latest) return "latest";
  if (filters.today) return "today";
  if (filters.yesterday) return "yesterday";
  if (filters.thisWeek) return "this_week";
  if (filters.thisMonth) return "this_month";
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

  if (!hasTransactionWord && !asksSpendingToday && !asksWhereTransferred) return null;

  const filters = {
    latest: /latest|last|recent|newest/.test(text),
    today: /today|this day/.test(text),
    yesterday: /yesterday/.test(text),
    thisWeek: /this week|week/.test(text),
    thisMonth: /this month|month/.test(text),
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

  if (!filters.today && !filters.yesterday && !filters.thisWeek && !filters.thisMonth && !filters.latest && /show all|all transactions|what happened/.test(text)) {
    filters.thisMonth = text.includes("month") ? true : false;
  }

  return filters;
}

function getTransactionHubSnapshot(context = {}) {
  return context?.transactionHubSnapshot || null;
}

function noConnectionReply() {
  return "Transaction Hub data is not connected yet, so I can’t honestly say I checked real records.";
}

function noRecordsReply(filters) {
  if (filters.today) return "I checked your Transaction Hub, but I don’t see any transactions recorded today.";
  if (filters.yesterday) return "I checked your Transaction Hub, but I don’t see any transactions recorded yesterday.";
  if (filters.thisWeek) return "I checked your Transaction Hub, but I don’t see any matching Transaction Hub records this week.";
  if (filters.thisMonth) return "I checked your Transaction Hub, but I don’t see any matching Transaction Hub records this month.";
  if (filters.income) return "I checked your Transaction Hub, but I don’t see any income transactions recorded yet.";
  if (filters.expense) return "I checked your Transaction Hub, but I don’t see any expense transactions matching that request.";
  if (filters.transfer) return "I checked your Transaction Hub, but I don’t see any transfer records matching that request.";
  return "I checked your Transaction Hub, but I don’t see any matching Transaction Hub records.";
}

function latestTransactionReply(transaction) {
  const walletPhrase = transaction.group === "transfer"
    ? `${transaction.fromWalletName || "Wallet"} → ${transaction.toWalletName || "Wallet"}`
    : transaction.walletName
      ? `added to ${transaction.walletName}`
      : "with no wallet shown";

  const notePhrase = transaction.note ? ` Note: ${transaction.note}` : "";

  return `I checked your Transaction Hub. Your latest transaction is ${transaction.title} for ${formatAmount(transaction)}, recorded on ${formatDate(transaction.date)}, ${walletPhrase}.${notePhrase}`;
}

function whereTransferredReply(snapshot, filters) {
  const transfers = filterTransactionHubTimeline(snapshot.timeline || [], { transfer: true, latest: true });
  const latestIncome = filterTransactionHubTimeline(snapshot.timeline || [], { income: true, latest: true })[0] || null;
  const latestTransfer = transfers[0] || null;

  logTransactionHubAiReader(`Query detected: ${summarizeLabel(filters)}`);
  logTransactionHubAiReader("Matched records:", latestTransfer ? 1 : 0);

  if (latestTransfer) {
    const amount = latestIncome && Math.abs(latestIncome.amount) === Math.abs(latestTransfer.amount)
      ? Math.abs(latestIncome.amount)
      : Math.abs(latestTransfer.amount);

    return `The latest matching transfer shows ${peso(amount)} moved from ${latestTransfer.fromWalletName || "one wallet"} to ${latestTransfer.toWalletName || "another wallet"}.`;
  }

  if (latestIncome) {
    return "I can see the latest income, but I don’t see a matching transfer record connected to it.";
  }

  return "I checked your Transaction Hub, but I don’t see enough income or transfer records to know where it was transferred.";
}

function recordsReply(records, filters) {
  const label = filters.yesterday
    ? "yesterday"
    : filters.today
      ? "today"
      : filters.thisWeek
        ? "this week"
        : filters.thisMonth
          ? "this month"
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

function buildTransactionHubDirectReply(message, context = {}) {
  const filters = detectTransactionQuery(message);
  if (!filters) return "";

  const snapshot = getTransactionHubSnapshot(context);

  if (!snapshot || snapshot.connected !== true) return noConnectionReply();

  if (filters.asksWhereTransferred) {
    return whereTransferredReply(snapshot, filters);
  }

  const records = filterTransactionHubTimeline(snapshot.timeline || [], filters);
  const queryLabel = summarizeLabel(filters);

  logTransactionHubAiReader(`Query detected: ${queryLabel}`);
  logTransactionHubAiReader("Matched records:", records.length);

  if (filters.latest) {
    const latest = records[0] || (hasTypeFilter(filters) ? null : snapshot.latestTransaction || null);
    return latest ? latestTransactionReply(latest) : noRecordsReply(filters);
  }

  if (!records.length) return noRecordsReply(filters);

  return recordsReply(records, filters);
}

export function buildContextualFinanceReply(message = "", context = {}) {
  const transactionReply = buildTransactionHubDirectReply(message, context);
  if (transactionReply) return transactionReply;

  return "";
}
