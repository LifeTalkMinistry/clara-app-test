import {
  getExpectedIncomeWindow,
  getRecurringCashFlowOwnerId,
} from "./recurringCashFlowRepository.js";

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

function normalizeScheduledIncomeSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const nextExpectedDate = clean(snapshot.nextExpectedDate || snapshot.next_expected_date);
  const previousExpectedDate = clean(snapshot.previousExpectedDate || snapshot.previous_expected_date);
  const timing = snapshot.timing && typeof snapshot.timing === "object" ? snapshot.timing : {};
  const configured = snapshot.configured === true || snapshot.connected === true || Boolean(nextExpectedDate || previousExpectedDate || timing.id);

  if (!configured) return null;

  return {
    configured: true,
    nextExpectedDate: nextExpectedDate || null,
    previousExpectedDate: previousExpectedDate || null,
    daysUntilNextIncome: Number.isFinite(Number(snapshot.daysUntilNextIncome ?? snapshot.days_until_next_income))
      ? Math.max(0, Number(snapshot.daysUntilNextIncome ?? snapshot.days_until_next_income))
      : null,
    sourceName: clean(snapshot.sourceName || snapshot.source_name || timing.sourceName || timing.source_name),
  };
}

function readScheduledIncome(context = {}, now = new Date()) {
  const supplied = normalizeScheduledIncomeSnapshot(
    context.incomeTimingSnapshot ||
      context.incomeScheduleSnapshot ||
      context.incomeSchedule ||
      null
  );
  if (supplied) return supplied;

  const ownerIdentity = context.user || context.userId || context.user_id || context.localUserId || context.local_user_id;
  if (!ownerIdentity) return null;

  try {
    const ownerId = getRecurringCashFlowOwnerId(ownerIdentity);
    const window = getExpectedIncomeWindow(ownerId, now);
    if (!window?.timing) return null;

    return {
      configured: true,
      nextExpectedDate: window.nextExpectedDate || null,
      previousExpectedDate: window.previousExpectedDate || null,
      daysUntilNextIncome: Number.isFinite(Number(window.daysUntilNextIncome))
        ? Math.max(0, Number(window.daysUntilNextIncome))
        : null,
      sourceName: clean(window.timing.sourceName || window.timing.source_name),
    };
  } catch (error) {
    console.warn("[CLARA Buy Check] Income schedule timing could not be read safely.", error);
    return null;
  }
}

function scheduledDateToIso(dateKey) {
  if (!dateKey) return null;
  const date = parseDate(`${dateKey}T12:00:00`);
  return date ? date.toISOString() : null;
}

function analyzeIncomeRunway(context = {}, options = {}) {
  const now = parseDate(options.now) || new Date();
  const records = collectIncomeRecords(context);
  const latest = records[records.length - 1] || null;
  const scheduledIncome = readScheduledIncome(context, now);

  if (scheduledIncome?.nextExpectedDate) {
    return {
      connected: true,
      latestIncomeDate: latest?.date || null,
      latestIncomeAmount: latest?.amount || 0,
      sourceName: scheduledIncome.sourceName || latest?.sourceName || "",
      estimatedNextIncomeDate: scheduledDateToIso(scheduledIncome.nextExpectedDate),
      daysUntilNextIncome: scheduledIncome.daysUntilNextIncome,
      regularity: "scheduled",
      confidence: "high",
      timingAuthority: "schedule",
      basis: ["configured_income_schedule"],
      recordCount: records.length,
    };
  }

  if (scheduledIncome?.configured) {
    return {
      connected: true,
      latestIncomeDate: latest?.date || null,
      latestIncomeAmount: latest?.amount || 0,
      sourceName: scheduledIncome.sourceName || latest?.sourceName || "",
      estimatedNextIncomeDate: null,
      daysUntilNextIncome: null,
      regularity: "scheduled",
      confidence: "low",
      timingAuthority: "schedule",
      basis: ["configured_income_schedule_has_no_next_occurrence"],
      recordCount: records.length,
    };
  }

  return {
    connected: Boolean(context.incomeHubSnapshot?.connected || Array.isArray(context.incomes) || Array.isArray(context.incomeSources)),
    latestIncomeDate: latest?.date || null,
    latestIncomeAmount: latest?.amount || 0,
    sourceName: latest?.sourceName || "",
    estimatedNextIncomeDate: null,
    daysUntilNextIncome: null,
    regularity: "unknown",
    confidence: "none",
    timingAuthority: "schedule",
    basis: ["no_configured_income_schedule"],
    recordCount: records.length,
  };
}

export { analyzeIncomeRunway, collectIncomeRecords, parseDate };
