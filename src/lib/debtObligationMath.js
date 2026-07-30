export const DEBT_OBLIGATION_RECORD_KIND = "debt_obligation";
export const DEBT_COMPLETED_STATUSES = new Set([
  "inactive",
  "archived",
  "deleted",
  "closed",
  "paid",
  "completed",
]);

const normalizeString = (value) => String(value ?? "").trim();
const normalizeLower = (value) => normalizeString(value).toLowerCase();
const normalizeLabel = (value) =>
  normalizeLower(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const toDebtNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₱,\s]/g, "");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  }
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

export const getDebtBalance = (record = {}) =>
  toDebtNumber(
    record.totalDebt ?? record.balance ?? record.amount ?? record.debt_balance ?? 0
  );

export const getMonthlyDebtPayment = (record = {}) =>
  toDebtNumber(
    record.monthlyDebt ??
      record.monthlyPayment ??
      record.monthly_payment ??
      record.payment ??
      0
  );

export const getDebtInterestRate = (record = {}) =>
  toDebtNumber(record.interestRate ?? record.interest_rate ?? record.interest ?? 0);

export const getDebtTitleValue = (record = {}) =>
  normalizeString(
    record.title ||
      record.name ||
      record.lender ||
      record.creditor ||
      record.label ||
      record.debtName
  ) || "Debt obligation";

export const getDebtStatus = (record = {}) => normalizeLower(record.status || "active") || "active";

export const getDebtObligationMode = (record = {}) => {
  const explicit = normalizeLower(
    record.obligationMode || record.obligation_mode || record.balanceMode || record.balance_mode
  );
  if (["recurring", "monthly", "ongoing"].includes(explicit)) return "recurring";
  if (["balance", "payoff", "debt"].includes(explicit)) return "balance";
  if (
    record.isRecurring === true ||
    record.is_recurring === true ||
    record.recurring === true
  ) {
    return "recurring";
  }
  // Legacy records came from a debt-first form. A zero balance therefore means
  // payoff completed, not an automatically recurring bill. New recurring items
  // always persist an explicit obligationMode.
  return "balance";
};

export const isDebtObligationCompleted = (record = {}) =>
  DEBT_COMPLETED_STATUSES.has(getDebtStatus(record));

export const isActiveDebtObligation = (record = {}) => {
  if (record.recordKind !== DEBT_OBLIGATION_RECORD_KIND) return false;
  if (record.deletedAt || record.deleted_at || isDebtObligationCompleted(record)) return false;
  const mode = getDebtObligationMode(record);
  return mode === "recurring"
    ? getMonthlyDebtPayment(record) > 0
    : getDebtBalance(record) > 0;
};

export const getDebtDueDay = (record = {}) => {
  const explicit = Number(record.dueDay ?? record.due_day);
  if (Number.isInteger(explicit) && explicit >= 1 && explicit <= 31) return explicit;
  const raw = normalizeString(record.dueDate || record.due_date);
  const match = raw.match(/^\d{4}-\d{2}-(\d{2})/);
  if (match) return Math.min(31, Math.max(1, Number(match[1])));
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.getDate() : 0;
};

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

export const getNextDebtDueDate = (record = {}, fromDate = new Date()) => {
  const dueDay = getDebtDueDay(record);
  if (!dueDay) return null;
  const from = new Date(fromDate);
  if (Number.isNaN(from.getTime())) return null;
  from.setHours(0, 0, 0, 0);

  const build = (year, monthIndex) =>
    new Date(year, monthIndex, Math.min(dueDay, daysInMonth(year, monthIndex)));

  let next = build(from.getFullYear(), from.getMonth());
  if (next < from) next = build(from.getFullYear(), from.getMonth() + 1);
  return next;
};

export const isDebtDueDayInsideCycle = (record = {}, cycle = {}) => {
  const dueDay = getDebtDueDay(record);
  if (!dueDay || !cycle?.start || !cycle?.end) return false;
  const start = new Date(`${cycle.start}T00:00:00`);
  const end = new Date(`${cycle.end}T23:59:59`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return false;

  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth) {
    const candidate = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      Math.min(dueDay, daysInMonth(cursor.getFullYear(), cursor.getMonth()))
    );
    if (candidate >= start && candidate <= end) return true;
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return false;
};

export const getDebtRiskLevel = ({ totalDebt = 0, monthlyDebt = 0, income = 0 } = {}) => {
  const total = toDebtNumber(totalDebt);
  const monthly = toDebtNumber(monthlyDebt);
  const safeIncome = toDebtNumber(income);
  if (total <= 0 && monthly <= 0) return "Debt free";
  const ratio = safeIncome > 0 ? (monthly / safeIncome) * 100 : monthly > 0 ? 100 : 0;
  if (ratio < 20) return "Healthy";
  if (ratio <= 40) return "Moderate";
  return "Risk";
};

export const estimateDebtPayoffMonths = ({ balance = 0, monthlyPayment = 0, annualInterestRate = 0 } = {}) => {
  const principal = Math.max(0, toDebtNumber(balance));
  const payment = Math.max(0, toDebtNumber(monthlyPayment));
  const annualRate = Math.max(0, toDebtNumber(annualInterestRate));
  if (principal <= 0 || payment <= 0) return 0;
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate <= 0) return Math.ceil(principal / payment);
  const firstInterest = principal * monthlyRate;
  if (payment <= firstInterest) return Number.POSITIVE_INFINITY;
  const months = -Math.log(1 - (monthlyRate * principal) / payment) / Math.log(1 + monthlyRate);
  return Number.isFinite(months) && months > 0 ? Math.ceil(months) : 0;
};

export const isDebtLinkedExpense = (expense = {}, obligations = []) => {
  const linkedType = normalizeLower(
    expense.linked_target_type ||
      expense.linkedTargetType ||
      expense.protection_type ||
      expense.protectionType
  );
  if (linkedType === "debt") return true;
  if (expense.source_debt_id || expense.sourceDebtId) return true;

  const category = normalizeLabel(
    expense.budget_category ||
      expense.budgetCategory ||
      expense.expense_category ||
      expense.category ||
      expense.title ||
      expense.name
  );
  if (!category) return false;
  return (Array.isArray(obligations) ? obligations : []).some(
    (record) => normalizeLabel(getDebtTitleValue(record)) === category
  );
};

export const summarizeDebtObligationsPure = (records = [], options = {}) => {
  const activeRecords = (Array.isArray(records) ? records : []).filter(isActiveDebtObligation);
  const totalDebt = activeRecords.reduce((sum, record) => sum + getDebtBalance(record), 0);
  const monthlyDebt = activeRecords.reduce(
    (sum, record) => sum + getMonthlyDebtPayment(record),
    0
  );
  const income = toDebtNumber(options.income);
  const debtRatio = income > 0 ? (monthlyDebt / income) * 100 : monthlyDebt > 0 ? 100 : 0;
  const highestInterestRate = activeRecords.reduce(
    (highest, record) => Math.max(highest, getDebtInterestRate(record)),
    0
  );
  const payoffEstimates = activeRecords
    .filter((record) => getDebtObligationMode(record) === "balance")
    .map((record) =>
      estimateDebtPayoffMonths({
        balance: getDebtBalance(record),
        monthlyPayment: getMonthlyDebtPayment(record),
        annualInterestRate: getDebtInterestRate(record),
      })
    )
    .filter((value) => value > 0);
  const payoffMonths = payoffEstimates.includes(Number.POSITIVE_INFINITY)
    ? Number.POSITIVE_INFINITY
    : payoffEstimates.length
      ? Math.max(...payoffEstimates)
      : 0;

  return {
    activeCount: activeRecords.length,
    activeRecords,
    totalDebt,
    monthlyDebt,
    debtRatio,
    highestInterestRate,
    payoffMonths,
    riskLevel: getDebtRiskLevel({ totalDebt, monthlyDebt, income }),
    primaryObligation: activeRecords[0] || null,
  };
};
