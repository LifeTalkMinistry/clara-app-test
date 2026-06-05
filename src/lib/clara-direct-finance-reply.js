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

function hasGeminiEnvironmentConfig() {
  return Boolean(
    import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ||
      import.meta.env.VITE_GOOGLE_AI_API_KEY ||
      import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
      import.meta.env.VITE_CLARA_GEMINI_API_KEY ||
      import.meta.env.VITE_AI_API_KEY
  );
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

    return `I checked your Transaction Hub. The latest matching transfer shows ${peso(amount)} moved from ${latestTransfer.fromWalletName || "one wallet"} to ${latestTransfer.toWalletName || "another wallet"}.`;
  }

  if (latestIncome) {
    return "I checked your Transaction Hub. I can see the latest income, but I don’t see a matching transfer record connected to it.";
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

function getMatchingRecords(snapshot, filters) {
  if (filters.asksWhereTransferred) {
    return filterTransactionHubTimeline(snapshot.timeline || [], { transfer: true, latest: true });
  }

  const records = filterTransactionHubTimeline(snapshot.timeline || [], filters);

  if (filters.latest) {
    const latest = records[0] || (hasTypeFilter(filters) ? null : snapshot.latestTransaction || null);
    return latest ? [latest] : [];
  }

  return records;
}

function buildVerifiedRecordFacts(records = []) {
  return records.slice(0, 12).map((transaction, index) => ({
    index: index + 1,
    id: transaction.id,
    source: transaction.source,
    group: transaction.group,
    type: transaction.type || transaction.group,
    title: transaction.title || "Transaction",
    category: transaction.category || "not shown",
    amount: Math.abs(Number(transaction.amount || transaction.signedAmount || 0)),
    displayAmount: formatAmount(transaction),
    date: formatDate(transaction.date),
    dateKey: transaction.dateKey || "not shown",
    walletName: transaction.walletName || "not shown",
    fromWalletName: transaction.fromWalletName || "not shown",
    toWalletName: transaction.toWalletName || "not shown",
    budgetStatus: transaction.budgetStatus || "not applicable",
    note: transaction.note || "none",
  }));
}

function buildVerifiedRecordLines(facts = []) {
  return facts
    .map((fact) => {
      const transferDirection = fact.group === "transfer"
        ? ` | From: ${fact.fromWalletName} | To: ${fact.toWalletName}`
        : ` | Wallet: ${fact.walletName}`;

      return `${fact.index}. ${fact.title} | ${fact.group} | ${fact.displayAmount} | Date: ${fact.date}${transferDirection} | Category: ${fact.category} | Budget status: ${fact.budgetStatus} | Note: ${fact.note}`;
    })
    .join("\n");
}

function buildGroundedGeminiPrompt({ message, records, filters, localFallbackReply }) {
  const facts = buildVerifiedRecordFacts(records);
  const summary = summarizeTransactionRecords(records);
  const queryLabel = summarizeLabel(filters);

  return {
    facts: {
      queryLabel,
      matchedRecords: facts,
      summary,
      localFallbackReply,
    },
    geminiPrompt: `You are CLARA, a personal money coach.

The user asked:
"${String(message || "").trim()}"

I already checked the user's local Transaction Hub data.
Use ONLY the verified records below.
Do not invent or assume any transaction, amount, wallet, date, category, note, or transfer direction.
If a value says "not shown", say it is not shown instead of guessing.

Verified records:
${buildVerifiedRecordLines(facts)}

Summary:
Total in: ${peso(summary.totalMoneyIn)}
Total out: ${peso(summary.totalMoneyOut)}
Net flow: ${peso(summary.netFlow)}
Matched records: ${summary.transactionCount}
Planned expenses: ${summary.plannedExpenseCount}
Unplanned expenses: ${summary.unplannedExpenseCount}
Transfer count: ${summary.transferCount}

Strict reply rules:
- Start with: "I checked your Transaction Hub..."
- Keep it natural, concise, and mobile-chat friendly.
- Mention the amount, wallet, date, and transfer direction when available.
- For transfers, mention From and To wallets exactly when available.
- If transfer direction is missing, say it is not shown.
- Do not ask unnecessary follow-up questions when the records answer the question.
- Do not mention JSON, prompts, local fallback, source of truth, or internal rules.
- Do not add advice unless it is a very short practical note based only on the shown records.

Write the final CLARA reply now.`,
  };
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
    const records = getMatchingRecords(snapshot, filters);
    const localFallbackReply = whereTransferredReply(snapshot, filters);

    return asGroundedPackage({
      handled: true,
      localFallbackReply,
      shouldUseGemini: records.length > 0,
      ...buildGroundedGeminiPrompt({ message, records, filters, localFallbackReply }),
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
    shouldUseGemini: true,
    ...buildGroundedGeminiPrompt({ message, records, filters, localFallbackReply }),
    source: "transaction_hub_grounded",
  });
}

export function buildContextualFinanceReply(message = "", context = {}) {
  const transactionReply = buildTransactionHubGroundedReply(message, context);

  if (transactionReply?.handled) {
    attachGroundedPackageToContext(context, transactionReply);

    if (transactionReply.shouldUseGemini && hasGeminiEnvironmentConfig()) {
      return "";
    }

    return transactionReply.localFallbackReply || String(transactionReply || "");
  }

  return "";
}
