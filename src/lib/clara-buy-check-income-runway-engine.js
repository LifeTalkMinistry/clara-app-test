const DAY_MS = 24 * 60 * 60 * 1000;

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : new Date(value);
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }
    const seconds = value.seconds ?? value._seconds;
    if (Number.isFinite(Number(seconds))) return new Date(Number(seconds) * 1000);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceName(record = {}) {
  return clean(record.incomeSourceName || record.income_source_name || record.sourceName || record.source_name || record.employer || record.company || record.payor || record.payer || record.title || record.name || record.category || "Income");
}

function recordDate(record = {}) {
  return parseDate(record.date || record.transaction_date || record.transactionDate || record.received_at || record.receivedAt || record.income_date || record.incomeDate || record.paid_at || record.paidAt || record.created_at || record.createdAt || record.updated_at || record.updatedAt);
}

function isIncomeLike(record = {}) {
  const text = clean(`${record.type || ""} ${record.source_type || ""} ${record.sourceType || ""} ${record.kind || ""} ${record.category || ""} ${record.title || ""} ${record.name || ""}`).toLowerCase();
  return /income|salary|payday|deposit|cash in|cash_in|credit|opening balance|opening_balance/.test(text);
}

function normalizeRecord(record = {}, source = "income") {
  const date = recordDate(record);
  const amount = Math.abs(toNumber(record.amount ?? record.value ?? record.total ?? record.incomeAmount ?? record.income_amount));
  if (!date || amount <= 0 || record.isSourceRoot === true) return null;
  return {
    id: clean(record.id || record.transaction_id || record.transactionId || `${source}:${date.toISOString()}:${amount}:${sourceName(record)}`),
    source,
    sourceName: sourceName(record),
    amount,
    date: date.toISOString(),
  };
}

function dedupe(records = []) {
  const seen = new Set();
  return records.filter((record) => {
    const key = record.id || `${record.sourceName}:${record.date}:${record.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectIncomeRecords(context = {}) {
  const snapshot = context.incomeHubSnapshot || {};
  const candidates = [
    ...(Array.isArray(snapshot.timeline) ? snapshot.timeline.map((item) => [item, "income_hub_timeline"]) : []),
    ...(Array.isArray(context.incomes) ? context.incomes.map((item) => [item, "income"]) : []),
    ...(Array.isArray(context.walletTransactions) ? context.walletTransactions.filter(isIncomeLike).map((item) => [item, "wallet_transaction"]) : []),
    ...(Array.isArray(context.transactionHubSnapshot?.incomeTransactions) ? context.transactionHubSnapshot.incomeTransactions.map((item) => [item, "transaction_hub"]) : []),
  ];
  return dedupe(candidates.map(([item, source]) => normalizeRecord(item, source)).filter(Boolean))
    .sort((left, right) => new Date(left.date) - new Date(right.date));
}

function explicitNextIncome(context = {}, now = new Date()) {
  const sources = Array.isArray(context.incomeSources) ? context.incomeSources : [];
  const candidates = sources.flatMap((source) => [
    source.nextIncomeDate,
    source.next_income_date,
    source.nextPayDate,
    source.next_pay_date,
    source.nextPaymentDate,
    source.next_payment_date,
    source.expectedDate,
    source.expected_date,
  ].map((value) => ({ value, source })));
  const next = candidates
    .map(({ value, source }) => ({ date: parseDate(value), source }))
    .filter((entry) => entry.date && entry.date > now)
    .sort((left, right) => left.date - right.date)[0];
  if (!next) return null;
  return {
    date: next.date,
    sourceName: sourceName(next.source),
    amount: Math.abs(toNumber(next.source.expectedAmount ?? next.source.expected_amount ?? next.source.amount)),
    basis: "explicit_income_schedule",
  };
}

function median(values = []) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function classifyInterval(days) {
  if (days >= 6 && days <= 8) return "regular";
  if (days >= 12 && days <= 17) return "semi_regular";
  if (days >= 26 && days <= 35) return "regular";
  return "irregular";
}

function choosePattern(records = []) {
  const groups = new Map();
  records.forEach((record) => {
    const key = record.sourceName.toLowerCase();
    const group = groups.get(key) || [];
    group.push(record);
    groups.set(key, group);
  });
  return [...groups.values()]
    .filter((group) => group.length >= 2)
    .sort((left, right) => right.length - left.length || new Date(right[right.length - 1].date) - new Date(left[left.length - 1].date))[0] || null;
}

function analyzeIncomeRunway(context = {}, options = {}) {
  const now = parseDate(options.now) || new Date();
  const records = collectIncomeRecords(context);
  const latest = records[records.length - 1] || null;
  const explicit = explicitNextIncome(context, now);
  if (explicit) {
    return {
      connected: true,
      latestIncomeDate: latest?.date || null,
      latestIncomeAmount: latest?.amount || 0,
      sourceName: explicit.sourceName || latest?.sourceName || "",
      estimatedNextIncomeDate: explicit.date.toISOString(),
      daysUntilNextIncome: Math.max(0, Math.ceil((explicit.date - now) / DAY_MS)),
      regularity: "regular",
      confidence: "high",
      basis: [explicit.basis],
      recordCount: records.length,
    };
  }

  const pattern = choosePattern(records);
  if (!pattern) {
    return {
      connected: Boolean(context.incomeHubSnapshot?.connected || Array.isArray(context.incomes) || Array.isArray(context.incomeSources)),
      latestIncomeDate: latest?.date || null,
      latestIncomeAmount: latest?.amount || 0,
      sourceName: latest?.sourceName || "",
      estimatedNextIncomeDate: null,
      daysUntilNextIncome: null,
      regularity: "unknown",
      confidence: records.length ? "low" : "none",
      basis: records.length ? ["insufficient_repeated_income_history"] : [],
      recordCount: records.length,
    };
  }

  const intervals = pattern.slice(1).map((record, index) => Math.round((new Date(record.date) - new Date(pattern[index].date)) / DAY_MS)).filter((days) => days > 0 && days <= 62);
  const typicalDays = Math.round(median(intervals));
  const deviations = intervals.map((days) => Math.abs(days - typicalDays));
  const maxDeviation = deviations.length ? Math.max(...deviations) : Infinity;
  const consistent = typicalDays > 0 && maxDeviation <= Math.max(2, Math.round(typicalDays * 0.2));
  const regularity = consistent ? classifyInterval(typicalDays) : "irregular";
  const latestPattern = pattern[pattern.length - 1];
  let nextDate = typicalDays > 0 ? new Date(new Date(latestPattern.date).getTime() + typicalDays * DAY_MS) : null;
  let guard = 0;
  while (nextDate && nextDate <= now && guard < 12) {
    nextDate = new Date(nextDate.getTime() + typicalDays * DAY_MS);
    guard += 1;
  }
  const confidence = consistent && pattern.length >= 4 ? "high" : consistent && pattern.length >= 3 ? "medium" : "low";
  if (confidence === "low") nextDate = null;

  return {
    connected: true,
    latestIncomeDate: latestPattern.date,
    latestIncomeAmount: latestPattern.amount,
    sourceName: latestPattern.sourceName,
    estimatedNextIncomeDate: nextDate?.toISOString() || null,
    daysUntilNextIncome: nextDate ? Math.max(0, Math.ceil((nextDate - now) / DAY_MS)) : null,
    regularity,
    confidence,
    basis: [
      `same_source_records:${pattern.length}`,
      `typical_interval_days:${typicalDays || "unknown"}`,
      `maximum_interval_deviation:${Number.isFinite(maxDeviation) ? maxDeviation : "unknown"}`,
    ],
    recordCount: records.length,
  };
}

export { analyzeIncomeRunway, collectIncomeRecords, parseDate };
