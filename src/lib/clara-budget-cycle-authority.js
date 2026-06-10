const CLOSED_BUDGET_STATUSES = new Set(["inactive", "archived", "deleted", "closed"]);
const FINISHED_BUDGET_STATUSES = new Set([
  "active",
  "activated",
  "complete",
  "completed",
  "finished",
]);

const PH_TIME_ZONE = "Asia/Manila";
const PH_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: PH_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function normalizeBudgetString(value) {
  return String(value ?? "").trim();
}

export function normalizeBudgetLower(value) {
  return normalizeBudgetString(value).toLowerCase();
}

export function getPHBudgetMonthKey(value = new Date()) {
  const parsed = value instanceof Date ? value : new Date(value);
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const parts = PH_DATE_FORMATTER.formatToParts(safeDate);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  return year && month ? `${year}-${month}` : "";
}

export function getPHBudgetMonthRange(monthKey = getPHBudgetMonthKey()) {
  const safeMonth = /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : getPHBudgetMonthKey();
  const [year, month] = safeMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${safeMonth}-01`,
    end: `${safeMonth}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function isBudgetHeader(row = {}) {
  return (
    row?.is_plan_header === true ||
    row?.plan_type === "monthly_budget" ||
    normalizeBudgetLower(row?.category) === "__monthly_budget__" ||
    normalizeBudgetLower(row?.budget_category) === "__monthly_budget__" ||
    normalizeBudgetLower(row?.type) === "monthly_budget"
  );
}

export function isBudgetRowInactive(row = {}) {
  const status = normalizeBudgetLower(row?.status);
  return (
    row?.is_active === false ||
    row?.active === false ||
    Boolean(row?.deleted_at || row?.deletedAt) ||
    CLOSED_BUDGET_STATUSES.has(status)
  );
}

export function isFinishedBudgetHeader(row = {}) {
  const status = normalizeBudgetLower(row?.status);
  return (
    row?.is_complete === true ||
    row?.complete === true ||
    row?.planIsComplete === true ||
    row?.plan_is_complete === true ||
    FINISHED_BUDGET_STATUSES.has(status)
  );
}

export function getBudgetMonthKey(row = {}) {
  return normalizeBudgetString(row?.month || row?.budget_month || row?.month_key);
}

function collectOwnerKeys(source = {}) {
  return [
    source?.user_id,
    source?.userId,
    source?.profile_id,
    source?.owner_id,
    source?.email,
    source?.user_email,
    source?.owner_email,
    source?.created_by,
  ]
    .map((value) => normalizeBudgetLower(value))
    .filter(Boolean);
}

export function belongsToBudgetOwner(row = {}, owner = null) {
  if (!owner) return true;
  const ownerKeys = collectOwnerKeys(owner);
  const rowKeys = collectOwnerKeys(row);
  if (!ownerKeys.length || !rowKeys.length) return true;
  return rowKeys.some((key) => ownerKeys.includes(key));
}

export function getBudgetAuthorityTimestampValue(row = {}) {
  const candidates = [
    row?.reset_start_at,
    row?.reset_at,
    row?.created_at,
    row?.createdAt,
    row?.updated_at,
    row?.updatedAt,
    row?.tracking_started_at,
    row?.tracking_start_date,
    row?.cycle_start,
    row?.budget_cycle_start,
    row?.period_start,
    row?.range_start,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null || candidate === "") continue;
    const time = new Date(candidate).getTime();
    if (!Number.isNaN(time)) return candidate;
  }

  return "";
}

export function getBudgetAuthorityTime(row = {}) {
  const value = getBudgetAuthorityTimestampValue(row);
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

export function selectDashboardBudgetHeaders({
  budgets = [],
  currentMonthKey = getPHBudgetMonthKey(),
  user = null,
} = {}) {
  const candidates = (Array.isArray(budgets) ? budgets : [])
    .filter((row) => {
      if (!isBudgetHeader(row) || isBudgetRowInactive(row)) return false;
      if (!belongsToBudgetOwner(row, user)) return false;
      const month = getBudgetMonthKey(row);
      return !month || !currentMonthKey || month === currentMonthKey;
    })
    .sort((left, right) => {
      const byAuthorityTime = getBudgetAuthorityTime(right) - getBudgetAuthorityTime(left);
      if (byAuthorityTime) return byAuthorityTime;
      return normalizeBudgetString(right?.id).localeCompare(normalizeBudgetString(left?.id));
    });

  const budgetCycleHeader = candidates[0] || null;
  const monthlyBudgetHeader =
    budgetCycleHeader && isFinishedBudgetHeader(budgetCycleHeader)
      ? budgetCycleHeader
      : null;

  return {
    candidates,
    budgetCycleHeader,
    monthlyBudgetHeader,
  };
}

export function hasExactBudgetTimestamp(value) {
  return /T\d{2}:\d{2}/.test(normalizeBudgetString(value));
}

export function getBudgetCycleStart(row = {}) {
  return (
    row?.reset_start_at ||
    row?.tracking_started_at ||
    row?.tracking_start_date ||
    row?.cycle_start ||
    row?.budget_cycle_start ||
    row?.period_start ||
    row?.range_start ||
    ""
  );
}

export function getBudgetCycleEnd(row = {}) {
  return (
    row?.cycle_end ||
    row?.budget_cycle_end ||
    row?.period_end ||
    row?.range_end ||
    ""
  );
}

export function getBudgetCycleRange(row = {}, fallbackMonthKey = "") {
  const monthKey =
    getBudgetMonthKey(row) || fallbackMonthKey || getPHBudgetMonthKey();
  const fallback = getPHBudgetMonthRange(monthKey);
  const rawStart = getBudgetCycleStart(row);
  const rawEnd = getBudgetCycleEnd(row);

  return {
    start: rawStart || fallback.start,
    end: rawEnd || fallback.end,
    hasTimestampStart: hasExactBudgetTimestamp(rawStart),
  };
}

export function getStrongestTransactionTimestamp(record = {}) {
  return (
    record?.created_at ||
    record?.createdAt ||
    record?.logged_at ||
    record?.spent_at ||
    record?.transaction_date ||
    record?.transactionDate ||
    record?.date ||
    ""
  );
}

function getDateOnly(value) {
  if (!value) return "";
  const raw = normalizeBudgetString(value);
  const dateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) return dateMatch[1];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const parts = PH_DATE_FORMATTER.formatToParts(parsed);
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";
  return year && month && day ? `${year}-${month}-${day}` : "";
}

function getEndTime(value) {
  if (!value) return null;
  if (hasExactBudgetTimestamp(value)) {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? null : time;
  }
  const dateOnly = getDateOnly(value);
  if (!dateOnly) return null;
  const time = new Date(`${dateOnly}T23:59:59.999+08:00`).getTime();
  return Number.isNaN(time) ? null : time;
}

export function isExpenseInBudgetCycle(expense = {}, range = {}) {
  if (range?.hasTimestampStart) {
    const startTime = new Date(range.start).getTime();
    const transactionValue = getStrongestTransactionTimestamp(expense);
    const transactionTime = new Date(transactionValue).getTime();
    const endTime = getEndTime(range.end);

    if (Number.isNaN(startTime) || Number.isNaN(transactionTime)) return false;
    if (transactionTime < startTime) return false;
    if (endTime !== null && transactionTime > endTime) return false;
    return true;
  }

  const transactionDate = getDateOnly(
    expense?.date ||
      expense?.transaction_date ||
      expense?.transactionDate ||
      expense?.spent_at ||
      expense?.created_at ||
      expense?.createdAt ||
      expense?.logged_at
  );
  const startDate = getDateOnly(range?.start);
  const endDate = getDateOnly(range?.end);

  if (!transactionDate || !startDate || !endDate) return false;
  return transactionDate >= startDate && transactionDate <= endDate;
}

export function doesBudgetRowBelongToCycle(row = {}, cycleHeader = null) {
  if (!cycleHeader) return true;
  if (!belongsToBudgetOwner(row, cycleHeader)) return false;

  const headerMonth = getBudgetMonthKey(cycleHeader);
  const rowMonth = getBudgetMonthKey(row);
  if (headerMonth && rowMonth && headerMonth !== rowMonth) return false;

  const headerStart = getBudgetCycleStart(cycleHeader);
  const rowStart = getBudgetCycleStart(row);

  if (headerStart && rowStart) {
    const headerTime = new Date(headerStart).getTime();
    const rowTime = new Date(rowStart).getTime();
    if (!Number.isNaN(headerTime) && !Number.isNaN(rowTime)) {
      return headerTime === rowTime;
    }
    return normalizeBudgetString(headerStart) === normalizeBudgetString(rowStart);
  }

  if (hasExactBudgetTimestamp(headerStart)) {
    const headerTime = new Date(headerStart).getTime();
    const rowTime = getBudgetAuthorityTime(row);
    return Number.isFinite(rowTime) && rowTime >= headerTime;
  }

  return !headerMonth || !rowMonth || headerMonth === rowMonth;
}
