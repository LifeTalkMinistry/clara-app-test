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

function hasGeminiEnvironmentConfig() {
  return true;
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
  if (/what wallet|which wallet|wallet received|received.*wallet|salary.*wallet|income.*wallet/.test(normalized)) return "";
  if (normalized.includes("gcash")) return "gcash";
  if (normalized.includes("maya")) return "maya";
  if (normalized.includes("bdo")) return "bdo";
  if (normalized.includes("bank")) return "bank";
  const walletMatch = normalized.match(/(?:into|to|received by)\s+([a-z0-9\s]{2,40})/);
  if (walletMatch?.[1]) return walletMatch[1].trim();
  return "";
}

function detectIncomeQuery(message = "") {
  const text = normalizeText(message);
  if (!text) return null;

  const hasIncomeWord = /\b(income|salary|payday|money in|cash in|deposit|received|receive|unifycx|employer)\b/.test(text);
  const asksWhereTransferred = /where\s+(did|do|was|is)?.*transfer|transfer.*where|where.*income.*go|where.*salary.*go|where.*money.*go/.test(text);
  const asksReceivingWallet = /what wallet|which wallet|wallet received|received.*wallet|salary.*wallet|income.*wallet/.test(text);
  const asksTotalMoneyIn = /total money in|how much income|how much.*received|total income/.test(text);
  const mentionsSalary = /\bsalary\b|payday/.test(text);

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
    mentionsSalary,
  };
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

function formatIncomeLine(income, index) {
  const source = income.incomeSourceName || income.title || "Income";
  const wallet = income.destinationWalletName || income.walletName || "No wallet shown";
  return `${index + 1}. ${source} — ${peso(income.amount)} — ${wallet} — ${formatDate(income.date)}`;
}

function latestIncomeReply(income) {
  const source = income.incomeSourceName || income.title || "Income";
  const wallet = income.destinationWalletName || income.walletName || "";
  return `I checked your Income Hub. Your latest income source is ${source} for ${peso(income.amount)}, received on ${formatDate(income.date)}${wallet ? ` into your ${wallet}` : ", but the receiving wallet is not shown"}.`;
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
  const sourceRoots = Array.isArray(snapshot.sourceRoots) ? snapshot.sourceRoots : [];
  const sources = sourceRoots.length
    ? sourceRoots.map((source) => ({ name: source.incomeSourceName, total: source.totalMoneyIn || source.amount, count: 1 }))
    : Array.isArray(snapshot.incomeBySource) ? snapshot.incomeBySource : [];

  if (!sources.length) return "I checked your Income Hub, but I don’t see any income sources yet.";
  const lines = sources.slice(0, 12).map((source, index) => `${index + 1}. ${source.name} — ${peso(source.total)} — ${source.count} record${source.count === 1 ? "" : "s"}`).join("\n");
  return `I checked your Income Hub. Here are your income sources:\n\n${lines}`;
}

function incomeWalletReply(records = [], snapshot = {}) {
  const latest = records[0] || snapshot.latestIncome || null;
  if (!latest) return "I checked your Income Hub, but I don’t see an income record with a receiving wallet.";
  const source = latest.incomeSourceName || latest.title || "Income";
  const wallet = latest.destinationWalletName || latest.walletName || snapshot.summary?.latestDestinationWallet || "No wallet shown";
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

function sourceRootMatches(record = {}, target = "") {
  const normalizedTarget = normalizeText(target);
  if (!normalizedTarget) return false;
  return [
    record.incomeSourceName,
    record.title,
    record.type,
    record.note,
    record.raw?.name,
    record.raw?.title,
    record.raw?.category,
    record.raw?.type,
    record.raw?.sourceName,
  ].some((value) => normalizeText(value).includes(normalizedTarget));
}

function getIncomeMatchingRecords(snapshot = {}, filters = {}) {
  if (!snapshot?.connected) return [];
  let records = filterIncomeHubRecords(snapshot.timeline || [], filters);

  if (!records.length && filters.sourceText && Array.isArray(snapshot.sourceRoots)) {
    records = snapshot.sourceRoots.filter((record) => sourceRootMatches(record, filters.sourceText));
  }

  if (!records.length && filters.mentionsSalary && Array.isArray(snapshot.sourceRoots)) {
    records = snapshot.sourceRoots.filter((record) => sourceRootMatches(record, "salary"));
  }

  if (filters.asksReceivingWallet && !filters.sourceText && !records.length && snapshot.latestIncome) records = [snapshot.latestIncome];
  if (filters.asksReceivingWallet && !filters.sourceText && records.length > 1 && snapshot.latestIncome) records = [snapshot.latestIncome];
  if (filters.latest && !records.length && snapshot.latestIncome) records = [snapshot.latestIncome];
  return records;
}

function verifiedIncomeFacts(records = []) {
  return records.slice(0, 12).map((income, index) => ({
    index: index + 1,
    id: income.id,
    source: income.source,
    incomeSourceName: income.incomeSourceName || income.title || "Income",
    title: income.title || income.incomeSourceName || "Income",
    amount: Math.abs(Number(income.amount || 0)),
    displayAmount: peso(income.amount),
    date: formatDate(income.date),
    dateKey: income.dateKey || "not shown",
    walletName: income.walletName || "not shown",
    destinationWalletName: income.destinationWalletName || income.walletName || "not shown",
    note: income.note || "none",
    type: income.type || "income",
    isSourceRoot: Boolean(income.isSourceRoot),
  }));
}

function buildIncomeGeminiPrompt({ message, records, filters, localFallbackReply, snapshot }) {
  const facts = verifiedIncomeFacts(records);
  const summary = summarizeIncomeRecords(records);
  const sourceRoots = Array.isArray(snapshot?.sourceRoots) ? verifiedIncomeFacts(snapshot.sourceRoots) : [];

  return {
    facts: {
      queryLabel: queryLabel(filters),
      matchedRecords: facts,
      sourceRoots,
      summary,
      localFallbackReply,
    },
    geminiPrompt: `You are CLARA, a personal money coach.

The user asked:
"${String(message || "").trim()}"

I already checked the user's local Income Hub data.
Use ONLY the verified Income Hub facts below.
Do not invent or assume any income source, amount, wallet, date, or transfer.
Income source/root means the source of money such as employer, salary source, business, or side hustle.
Receiving wallet means where the money was received or stored.

Verified matched income records:
${facts.length ? facts.map((income) => `${income.index}. ${income.incomeSourceName} | ${income.displayAmount} | Date: ${income.date} | Receiving wallet: ${income.destinationWalletName} | Source root: ${income.isSourceRoot ? "yes" : "no"} | Note: ${income.note}`).join("\n") : "No verified matched income records."}

Verified Income Hub source roots:
${sourceRoots.length ? sourceRoots.map((income) => `${income.index}. ${income.incomeSourceName} | Total: ${income.displayAmount} | Latest activity: ${income.date} | Receiving wallet: ${income.destinationWalletName}`).join("\n") : "No source roots loaded."}

Summary:
Total income in matched records: ${peso(summary.totalIncome)}
Matched records: ${summary.incomeCount}
Top income source: ${summary.topIncomeSource}
Most used receiving wallet: ${summary.mostUsedReceivingWallet}

Strict reply rules:
- Start with: "I checked your Income Hub..."
- Keep it natural, concise, and mobile-chat friendly.
- Clearly separate income source/root from receiving wallet.
- Mention exact source name, amount, date, and wallet when available.
- If wallet is not shown, say the receiving wallet is not shown.
- Do not say Transaction Hub for this answer.
- Do not ask unnecessary follow-up questions when the records answer the question.
- Do not mention JSON, prompts, local fallback, source of truth, or internal rules.

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

function attachIncomePackageToContext(context, incomeReply) {
  if (!context || typeof context !== "object" || !incomeReply?.handled) return;
  context.incomeHubGroundedReplyPackage = incomeReply;
  context.__incomeHubGroundedReplyPackage = incomeReply;
}

export function buildIncomeHubGroundedReply(message = "", context = {}) {
  const filters = detectIncomeQuery(message);
  if (!filters) return { handled: false };

  const snapshot = context?.incomeHubSnapshot || null;
  if (!snapshot || snapshot.connected !== true) {
    return asGroundedPackage({
      handled: true,
      source: "income_hub_grounded",
      shouldUseGemini: false,
      localFallbackReply: noIncomeConnectionReply(),
      geminiPrompt: "",
      facts: { reason: "income_hub_not_connected" },
    });
  }

  if (filters.asksWhereTransferred) {
    const localFallbackReply = incomeTransferReply(snapshot);
    const records = snapshot.latestIncome ? [snapshot.latestIncome] : [];
    return asGroundedPackage({
      handled: true,
      source: "income_hub_grounded",
      shouldUseGemini: records.length > 0,
      localFallbackReply,
      ...buildIncomeGeminiPrompt({ message, records, filters, localFallbackReply, snapshot }),
    });
  }

  if (filters.asksSourcesList) {
    const records = Array.isArray(snapshot.sourceRoots) && snapshot.sourceRoots.length ? snapshot.sourceRoots : snapshot.timeline || [];
    const localFallbackReply = incomeSourcesReply(snapshot);
    return asGroundedPackage({
      handled: true,
      source: "income_hub_grounded",
      shouldUseGemini: records.length > 0,
      localFallbackReply,
      ...buildIncomeGeminiPrompt({ message, records, filters, localFallbackReply, snapshot }),
    });
  }

  const records = getIncomeMatchingRecords(snapshot, filters);
  logIncomeHubAiReader(`Query detected: ${queryLabel(filters)}`);
  logIncomeHubAiReader("Matched records:", records.length);

  if (!records.length) {
    return asGroundedPackage({
      handled: true,
      source: "income_hub_grounded",
      shouldUseGemini: false,
      localFallbackReply: noIncomeRecordsReply(filters),
      geminiPrompt: "",
      facts: { queryLabel: queryLabel(filters), matchedRecords: [], summary: summarizeIncomeRecords([]) },
    });
  }

  const localFallbackReply = filters.asksReceivingWallet
    ? incomeWalletReply(records, snapshot)
    : filters.latest
      ? latestIncomeReply(records[0])
      : incomeRecordsReply(records, filters);

  return asGroundedPackage({
    handled: true,
    source: "income_hub_grounded",
    shouldUseGemini: true,
    localFallbackReply,
    ...buildIncomeGeminiPrompt({ message, records, filters, localFallbackReply, snapshot }),
  });
}

export function buildIncomeHubDirectReply(message = "", context = {}) {
  const incomeReply = buildIncomeHubGroundedReply(message, context);
  if (!incomeReply?.handled) return "";

  attachIncomePackageToContext(context, incomeReply);

  if (incomeReply.shouldUseGemini && hasGeminiEnvironmentConfig()) {
    return "";
  }

  return incomeReply.localFallbackReply || String(incomeReply || "");
}
