import {
  filterIncomeHubRecords,
  logIncomeHubAiReader,
  summarizeIncomeRecords,
} from "@/lib/clara-income-hub-ai-reader";

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

function compactSourceFromText(text = "") {
  const normalized = normalizeText(text);
  const fromMatch = normalized.match(/(?:from|source)\s+([a-z0-9\s]{2,40})/);
  if (fromMatch?.[1]) return fromMatch[1].trim();
  if (normalized.includes("unifycx")) return "unifycx";
  if (normalized.includes("unify cx")) return "unify cx";
  return "";
}

function compactWalletFromText(text = "") {
  const normalized = normalizeText(text);
  const walletMatch = normalized.match(/(?:wallet|to|into|received by)\s+([a-z0-9\s]{2,40})/);
  if (walletMatch?.[1]) return walletMatch[1].trim();
  if (normalized.includes("gcash")) return "gcash";
  if (normalized.includes("maya")) return "maya";
  if (normalized.includes("bdo")) return "bdo";
  if (normalized.includes("bank")) return "bank";
  return "";
}

function detectIncomeQuery(message = "") {
  const text = normalizeText(message);
  if (!text) return null;

  const hasIncomeWord = /\b(income|salary|payday|money in|cash in|deposit|received|receive|unifycx|employer)\b/.test(text);
  const asksWhereTransferred = /where\s+(did|do|was|is)?.*transfer|transfer.*where|where.*income.*go|where.*salary.*go|where.*money.*go/.test(text);
  const asksReceivingWallet = /what wallet|which wallet|wallet received|received.*wallet|salary.*wallet|income.*wallet/.test(text);
  const asksTotalMoneyIn = /total money in|how much income|how much.*received|total income/.test(text);

  if (!hasIncomeWord && !asksWhereTransferred && !asksReceivingWallet && !asksTotalMoneyIn) return null;

  return {
    latest: /latest|last|recent|newest/.test(text),
    today: /today|this day/.test(text),
    yesterday: /yesterday/.test(text),
    thisWeek: /this week|week/.test(text),
    thisMonth: /this month|month/.test(text) || asksTotalMoneyIn,
    sourceText: compactSourceFromText(text),
    walletText: compactWalletFromText(text),
    asksWhereTransferred,
    asksReceivingWallet,
    asksSourcesList: /show all income sources|all income sources|income sources/.test(text),
    asksTotalMoneyIn,
  };
}

function noIncomeConnectionReply() {
  return "Income Hub data is not connected yet, so I can’t honestly say I checked real income records.";
}

function noIncomeRecordsReply(filters = {}) {
  if (filters.today) return "I checked your Income Hub, but I don’t see income recorded today.";
  if (filters.yesterday) return "I checked your Income Hub, but I don’t see income recorded yesterday.";
  if (filters.thisWeek) return "I checked your Income Hub, but I don’t see income recorded this week.";
  if (filters.thisMonth) return "I checked your Income Hub, but I don’t see income recorded for this month.";
  if (filters.sourceText) return `I checked your Income Hub, but I don’t see income records matching ${filters.sourceText}.`;
  if (filters.walletText) return `I checked your Income Hub, but I don’t see income received by ${filters.walletText}.`;
  return "I checked your Income Hub, but I don’t see any income records yet.";
}

function queryLabel(filters = {}) {
  if (filters.latest) return "latest";
  if (filters.today) return "today";
  if (filters.yesterday) return "yesterday";
  if (filters.thisWeek) return "this_week";
  if (filters.thisMonth) return "this_month";
  if (filters.sourceText) return "source";
  if (filters.walletText) return "wallet";
  return "income";
}

function formatIncomeLine(income, index) {
  const source = income.incomeSourceName || income.title || "Income";
  const wallet = income.destinationWalletName || income.walletName || "No wallet shown";
  return `${index + 1}. ${source} — ${peso(income.amount)} — ${wallet} — ${formatDate(income.date)}`;
}

function latestIncomeReply(income) {
  const source = income.incomeSourceName || income.title || "Income";
  const wallet = income.destinationWalletName || income.walletName || "No wallet shown";
  return `I checked your Income Hub. Your latest income source is ${source} for ${peso(income.amount)}, received on ${formatDate(income.date)} into your ${wallet}.`;
}

function incomeRecordsReply(records, filters = {}) {
  const label = filters.yesterday
    ? "yesterday"
    : filters.today
      ? "today"
      : filters.thisWeek
        ? "this week"
        : filters.thisMonth
          ? "this month"
          : filters.sourceText
            ? `from ${filters.sourceText}`
            : filters.walletText
              ? `received by ${filters.walletText}`
              : "matching your request";

  const summary = summarizeIncomeRecords(records);
  const lines = records.slice(0, 12).map(formatIncomeLine).join("\n");
  const moreCount = Math.max(records.length - 12, 0);
  const moreLine = moreCount > 0 ? `\n\nPlus ${moreCount} more income record${moreCount === 1 ? "" : "s"}.` : "";

  return `I checked your Income Hub. You received ${peso(summary.totalIncome)} ${label} from ${records.length} income record${records.length === 1 ? "" : "s"}:\n\n${lines}${moreLine}`;
}

function incomeSourcesReply(snapshot = {}) {
  const sources = Array.isArray(snapshot.incomeBySource) ? snapshot.incomeBySource : [];
  if (!sources.length) return "I checked your Income Hub, but I don’t see any income sources yet.";
  const lines = sources.slice(0, 12).map((source, index) => `${index + 1}. ${source.name} — ${peso(source.total)} — ${source.count} record${source.count === 1 ? "" : "s"}`).join("\n");
  return `I checked your Income Hub. Here are your income sources:\n\n${lines}`;
}

function incomeWalletReply(records = []) {
  const latest = records[0] || null;
  if (!latest) return "I checked your Income Hub, but I don’t see an income record with a receiving wallet.";
  const source = latest.incomeSourceName || latest.title || "Income";
  const wallet = latest.destinationWalletName || latest.walletName || "No wallet shown";
  return `I checked your Income Hub. Your ${source} income of ${peso(latest.amount)} was received into ${wallet} on ${formatDate(latest.date)}.`;
}

function incomeTransferReply(snapshot = {}) {
  const latestIncome = snapshot.latestIncome || null;
  const related = Array.isArray(snapshot.possibleRelatedTransfers) ? snapshot.possibleRelatedTransfers[0] : null;

  if (related?.income && related?.transfer) {
    const income = related.income;
    const transfer = related.transfer;
    return `I checked your Income Hub. The latest matching movement shows ${peso(income.amount)} from ${income.incomeSourceName || income.title || "income"} connected to a transfer from ${transfer.fromWalletName || "one wallet"} to ${transfer.toWalletName || "another wallet"}.`;
  }

  if (latestIncome) {
    return `I checked your Income Hub. I can see your latest income from ${latestIncome.incomeSourceName || latestIncome.title || "income"}, but I don’t see a matching transfer record connected to it.`;
  }

  return "I checked your Income Hub, but I don’t see enough income or transfer records to know where it was transferred.";
}

function getIncomeMatchingRecords(snapshot = {}, filters = {}) {
  if (!snapshot?.connected) return [];
  let records = filterIncomeHubRecords(snapshot.timeline || [], filters);
  if (filters.latest && !records.length && snapshot.latestIncome) records = [snapshot.latestIncome];
  return records;
}

export function buildIncomeHubDirectReply(message = "", context = {}) {
  const filters = detectIncomeQuery(message);
  if (!filters) return "";

  const snapshot = context?.incomeHubSnapshot || null;
  if (!snapshot || snapshot.connected !== true) return noIncomeConnectionReply();

  if (filters.asksWhereTransferred) {
    logIncomeHubAiReader("Query detected: transfer_flow");
    logIncomeHubAiReader("Matched records:", snapshot.possibleRelatedTransfers?.length || 0);
    return incomeTransferReply(snapshot);
  }

  if (filters.asksSourcesList) {
    logIncomeHubAiReader("Query detected: source");
    logIncomeHubAiReader("Matched records:", snapshot.incomeBySource?.length || 0);
    return incomeSourcesReply(snapshot);
  }

  const records = getIncomeMatchingRecords(snapshot, filters);
  logIncomeHubAiReader(`Query detected: ${queryLabel(filters)}`);
  logIncomeHubAiReader("Matched records:", records.length);

  if (!records.length) return noIncomeRecordsReply(filters);
  if (filters.asksReceivingWallet) return incomeWalletReply(records);
  if (filters.latest) return latestIncomeReply(records[0]);
  return incomeRecordsReply(records, filters);
}
