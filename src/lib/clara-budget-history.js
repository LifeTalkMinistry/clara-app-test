import {
  createBudgetSetupDraft,
  makeDraftItemId,
  normalizeBudgetText,
} from "./clara-derived-budget.js";

const safeArray = (value) => (Array.isArray(value) ? value : []);
const text = (value) => String(value ?? "").trim();
const lower = (value) => normalizeBudgetText(value);

function numberFrom(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function isBudgetHeader(row = {}) {
  return Boolean(
    row?.is_plan_header === true ||
      lower(row?.plan_type) === "monthly budget" ||
      lower(row?.category) === "monthly budget" ||
      lower(row?.budget_category) === "monthly budget" ||
      lower(row?.type) === "monthly budget",
  );
}

function isCompletedHeader(row = {}) {
  const status = lower(row?.status);
  const completionStatus = lower(
    row?.completion_status || row?.completionStatus || row?.budget_lifecycle_status,
  );
  return Boolean(
    isBudgetHeader(row) &&
      (completionStatus === "completed" || status === "closed") &&
      (row?.is_active === false || row?.active === false || status === "closed"),
  );
}

function cycleIdentity(row = {}) {
  return {
    draftId: text(row?.setup_draft_id || row?.draft_id),
    cycleStart: text(row?.cycle_start || row?.period_start || row?.budget_cycle_start),
    month: text(row?.month || row?.month_key || row?.budget_month),
  };
}

function sameCycle(row = {}, header = {}) {
  const a = cycleIdentity(row);
  const b = cycleIdentity(header);
  if (a.draftId && b.draftId && a.draftId === b.draftId) return true;
  if (a.cycleStart && b.cycleStart && a.cycleStart === b.cycleStart) return true;
  if (a.month && b.month && a.month === b.month) return true;
  return false;
}

function categoryTitle(row = {}) {
  return text(row?.title || row?.name || row?.category || row?.budget_category || "Budget item");
}

function categoryKey(row = {}) {
  return text(row?.key || row?.setup_item_id || row?.id || categoryTitle(row));
}

function categoryAllocated(row = {}) {
  return Math.max(
    0,
    numberFrom(
      row?.allocated,
      row?.allocated_amount,
      row?.budget_amount,
      row?.total_budget,
      row?.amount,
    ),
  );
}

function categorySpent(row = {}) {
  return Math.max(0, numberFrom(row?.spent, row?.spent_amount, row?.used, row?.current));
}

function isProtectedCategory(row = {}) {
  const key = lower(categoryKey(row));
  return Boolean(
    row?.isProtectedCommitment === true ||
      row?.is_protected_commitment === true ||
      key.startsWith("protected ") ||
      key.includes("protected emergency") ||
      key.includes("protected savings"),
  );
}

function isDebtCategory(row = {}) {
  return Boolean(
    row?.is_commitment === true ||
      row?.isCommitment === true ||
      lower(row?.commitment_type || row?.commitmentType) === "debt" ||
      row?.source_debt_id ||
      row?.sourceDebtId,
  );
}

function savingsGoalSourceId(row = {}) {
  const explicit = text(
    row?.source_savings_goal_id ||
      row?.sourceSavingsGoalId ||
      row?.savings_goal_id ||
      row?.savingsGoalId,
  );
  if (explicit) return explicit;

  const key = categoryKey(row);
  const match = key.match(/^protected-savings-(.+)$/i);
  return match?.[1] ? text(match[1]) : "";
}

function protectedType(row = {}) {
  const explicit = lower(
    row?.protectedType ||
      row?.protected_type ||
      row?.protection_type ||
      row?.linked_target_type ||
      row?.target_type,
  );
  if (explicit.includes("emergency")) return "emergency_fund";
  if (explicit.includes("saving")) return "savings_goal";

  const key = lower(categoryKey(row));
  const title = lower(categoryTitle(row));
  if (key.includes("protected emergency") || title === "emergency fund") return "emergency_fund";
  if (key.includes("protected savings") || savingsGoalSourceId(row)) return "savings_goal";
  return isProtectedCategory(row) ? "protected" : "";
}

function normalizedCategorySnapshot(row = {}) {
  const allocated = categoryAllocated(row);
  const spent = categorySpent(row);
  const key = categoryKey(row);
  return {
    id: text(row?.id),
    key,
    title: categoryTitle(row),
    allocated,
    spent,
    remaining: Math.max(allocated - spent, 0),
    sortOrder: numberFrom(
      row?.sortOrder,
      row?.sort_order,
      row?.displayOrder,
      row?.display_order,
      row?.position,
    ),
    isProtectedCommitment: isProtectedCategory(row),
    protectedType: protectedType(row),
    sourceSavingsGoalId: savingsGoalSourceId(row),
    isCommitment: isDebtCategory(row),
    commitmentType: isDebtCategory(row) ? "debt" : "",
    sourceDebtId: text(row?.source_debt_id || row?.sourceDebtId),
  };
}

export function buildBudgetCompletionSnapshot({
  header = {},
  categories = [],
  declared = 0,
  allocated = 0,
  spent = 0,
  remaining = 0,
  unallocated = 0,
  unplannedSpent = 0,
  undocumentedSpent = 0,
  outsidePlanItems = [],
} = {}) {
  const normalizedCategories = safeArray(categories).map(normalizedCategorySnapshot);
  const outsidePlanSpent = safeArray(outsidePlanItems).reduce(
    (sum, item) => sum + Math.max(0, numberFrom(item?.amount, item?.total, item?.value)),
    0,
  );

  return {
    version: 1,
    headerId: text(header?.id),
    title: text(header?.title || header?.name || "Budget"),
    cycleType: text(header?.cycle_type || header?.budget_cycle || "monthly"),
    cycleStart: text(header?.cycle_start || header?.period_start),
    cycleEnd: text(header?.cycle_end || header?.period_end),
    month: text(header?.month || header?.month_key),
    declared: Math.max(0, numberFrom(declared)),
    allocated: Math.max(0, numberFrom(allocated)),
    spent: Math.max(0, numberFrom(spent)),
    remaining: Math.max(0, numberFrom(remaining)),
    unallocated: Math.max(0, numberFrom(unallocated)),
    unplannedSpent: Math.max(0, numberFrom(unplannedSpent)),
    undocumentedSpent: Math.max(0, numberFrom(undocumentedSpent)),
    outsidePlanSpent,
    categories: normalizedCategories,
    categoryCount: normalizedCategories.length,
  };
}

function fallbackSnapshot(header, budgets) {
  const categories = safeArray(budgets)
    .filter((row) => !isBudgetHeader(row) && sameCycle(row, header))
    .map(normalizedCategorySnapshot);
  const allocated = categories.reduce((sum, category) => sum + category.allocated, 0);
  const spent = categories.reduce((sum, category) => sum + category.spent, 0);
  const declared = Math.max(
    0,
    numberFrom(
      header?.declared_amount,
      header?.declared_budget,
      header?.monthly_budget_amount,
      header?.total_budget,
      header?.amount,
      allocated,
    ),
  );

  return {
    version: 0,
    headerId: text(header?.id),
    title: text(header?.title || header?.name || "Budget"),
    cycleType: text(header?.cycle_type || header?.budget_cycle || "monthly"),
    cycleStart: text(header?.cycle_start || header?.period_start),
    cycleEnd: text(header?.cycle_end || header?.period_end),
    month: text(header?.month || header?.month_key),
    declared,
    allocated,
    spent,
    remaining: Math.max(declared - spent, 0),
    unallocated: Math.max(declared - allocated, 0),
    unplannedSpent: 0,
    undocumentedSpent: 0,
    outsidePlanSpent: 0,
    categories,
    categoryCount: categories.length,
  };
}

export function getCompletedBudgetHistory(budgets = []) {
  const safeBudgets = safeArray(budgets);
  return safeBudgets
    .filter(isCompletedHeader)
    .map((header) => {
      const rawSnapshot = header?.completion_snapshot || header?.completionSnapshot;
      const snapshot = rawSnapshot && typeof rawSnapshot === "object"
        ? { ...fallbackSnapshot(header, safeBudgets), ...rawSnapshot }
        : fallbackSnapshot(header, safeBudgets);
      const completedAt = text(
        header?.completed_at ||
          header?.completedAt ||
          snapshot?.completedAt ||
          header?.closed_at ||
          header?.updated_at ||
          header?.updatedAt,
      );
      return {
        id: text(header?.id),
        header,
        snapshot: { ...snapshot, completedAt },
        completedAt,
        title: snapshot?.title || text(header?.title || header?.name || "Budget"),
        cycleStart: snapshot?.cycleStart || text(header?.cycle_start || header?.period_start),
        cycleEnd: snapshot?.cycleEnd || text(header?.cycle_end || header?.period_end),
        declared: Math.max(0, numberFrom(snapshot?.declared)),
        spent: Math.max(0, numberFrom(snapshot?.spent)),
        categories: safeArray(snapshot?.categories),
      };
    })
    .sort((left, right) => {
      const leftTime = new Date(left.completedAt || 0).getTime();
      const rightTime = new Date(right.completedAt || 0).getTime();
      return (Number.isFinite(rightTime) ? rightTime : 0) -
        (Number.isFinite(leftTime) ? leftTime : 0);
    });
}

function activeSavingsGoalIds(goals = []) {
  return new Set(
    safeArray(goals)
      .filter((goal) => {
        const status = lower(goal?.status || goal?.goal_status || goal?.state || "active");
        return !["done", "completed", "complete", "archived", "inactive", "deleted"].includes(status);
      })
      .map((goal) => text(goal?.id || goal?.goal_id || goal?.key))
      .filter(Boolean),
  );
}

function hasActiveEmergencyFund(emergencyFund) {
  if (!emergencyFund || typeof emergencyFund !== "object") return false;
  if (emergencyFund?.resetAt || emergencyFund?.reset_at) return false;
  const status = lower(emergencyFund?.status || emergencyFund?.state || "active");
  return !["reset", "inactive", "archived", "deleted", "not setup", "not set"].includes(status);
}

export function buildReusableBudgetDraft(historyEntry, {
  savingsGoals = [],
  emergencyFund = null,
} = {}) {
  const categories = safeArray(historyEntry?.categories || historyEntry?.snapshot?.categories);
  const regular = categories
    .filter((category) => !isProtectedCategory(category) && !isDebtCategory(category))
    .filter((category) => categoryAllocated(category) > 0);
  const seenTitles = new Set();
  const items = [];
  for (const category of regular) {
    const title = categoryTitle(category);
    const normalizedTitle = lower(title);
    if (!normalizedTitle || seenTitles.has(normalizedTitle)) continue;
    seenTitles.add(normalizedTitle);
    items.push({
      id: makeDraftItemId(),
      title,
      amount: categoryAllocated(category),
    });
  }

  const protectedCategories = categories.filter(isProtectedCategory);
  const emergencyCategory = protectedCategories.find(
    (category) => protectedType(category) === "emergency_fund",
  );
  const canReuseEmergency =
    hasActiveEmergencyFund(emergencyFund) && categoryAllocated(emergencyCategory) > 0;

  const liveGoalIds = activeSavingsGoalIds(savingsGoals);
  const selectedSavingsGoalIds = [];
  const savingsGoalAmounts = {};
  for (const category of protectedCategories) {
    if (protectedType(category) !== "savings_goal") continue;
    const goalId = savingsGoalSourceId(category);
    if (!goalId || !liveGoalIds.has(goalId)) continue;
    const amount = categoryAllocated(category);
    if (amount <= 0 || selectedSavingsGoalIds.includes(goalId)) continue;
    selectedSavingsGoalIds.push(goalId);
    savingsGoalAmounts[goalId] = amount;
  }

  const omittedDebtCount = categories.filter(isDebtCategory).length;
  const reusedProtectedCount = (canReuseEmergency ? 1 : 0) + selectedSavingsGoalIds.length;
  const draft = createBudgetSetupDraft({
    items,
    includeEmergencyFund: canReuseEmergency,
    emergencyFundAmount: canReuseEmergency ? categoryAllocated(emergencyCategory) : 0,
    selectedSavingsGoalIds,
    savingsGoalAmounts,
    selectedDebtIds: [],
    outsideDueConfirmed: {},
    reusedFromBudgetId: text(historyEntry?.id || historyEntry?.header?.id),
    reusedFromCompletedAt: text(historyEntry?.completedAt || historyEntry?.snapshot?.completedAt),
  });

  return {
    draft,
    reusedItemCount: items.length,
    reusedProtectedCount,
    omittedDebtCount,
    hasReusableStructure: items.length > 0 || reusedProtectedCount > 0,
  };
}
