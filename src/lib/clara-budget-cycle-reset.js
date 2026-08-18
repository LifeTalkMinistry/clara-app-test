function normalizeString(value) {
  return String(value || "").trim();
}

function normalizeLower(value) {
  return normalizeString(value).toLowerCase();
}

function isBudgetHeader(row = {}) {
  return (
    row?.is_plan_header === true ||
    row?.plan_type === "monthly_budget" ||
    normalizeLower(row?.category) === "__monthly_budget__" ||
    normalizeLower(row?.budget_category) === "__monthly_budget__" ||
    normalizeLower(row?.type) === "monthly_budget"
  );
}

function isInactive(row = {}) {
  const status = normalizeLower(row?.status);
  return (
    row?.is_active === false ||
    row?.active === false ||
    ["inactive", "archived", "deleted", "closed", "reset"].includes(status)
  );
}

function sameCycle(row = {}, header = {}) {
  if (!header) return false;
  const headerMonth = normalizeString(header.month || header.month_key || header.budget_month);
  const rowMonth = normalizeString(row.month || row.month_key || row.budget_month);
  const headerCycleStart = normalizeString(
    header.cycle_start || header.period_start || header.budget_cycle_start
  );
  const rowCycleStart = normalizeString(
    row.cycle_start || row.period_start || row.budget_cycle_start
  );
  const headerDraftId = normalizeString(header.setup_draft_id || header.draft_id);
  const rowDraftId = normalizeString(row.setup_draft_id || row.draft_id);

  if (headerDraftId && rowDraftId && headerDraftId === rowDraftId) return true;
  if (headerCycleStart && rowCycleStart && headerCycleStart === rowCycleStart) return true;
  if (headerMonth && rowMonth && headerMonth === rowMonth) return true;
  return false;
}

function hasCycleIdentity(row = {}) {
  return Boolean(
    normalizeString(row.month || row.month_key || row.budget_month) ||
      normalizeString(row.cycle_start || row.period_start || row.budget_cycle_start) ||
      normalizeString(row.setup_draft_id || row.draft_id)
  );
}

function archivePatch(now) {
  return {
    is_active: false,
    active: false,
    status: "archived",
    archived_at: now,
    closed_at: now,
    updated_at: now,
  };
}

function completedPatch(now, budgetId) {
  return {
    is_active: false,
    active: false,
    status: "closed",
    completion_status: "completed",
    budget_lifecycle_status: "completed",
    completed_budget_id: budgetId || null,
    completed_at: now,
    closed_at: now,
    updated_at: now,
  };
}

function getTimestamp(row = {}) {
  const value = new Date(row?.updated_at || row?.created_at || 0).getTime();
  return Number.isFinite(value) ? value : 0;
}

function findActiveHeader(budgets = [], headerHint = null) {
  const activeHeaders = budgets
    .filter((budget) => isBudgetHeader(budget) && !isInactive(budget))
    .sort((a, b) => getTimestamp(b) - getTimestamp(a));

  if (!activeHeaders.length) return null;
  if (!headerHint) return activeHeaders[0];

  return activeHeaders.find((header) => sameCycle(header, headerHint)) || activeHeaders[0];
}

export async function completeMonthlyBudgetCycle({
  budgets = [],
  headerHint = null,
  completionSnapshot = null,
  updateBudget,
} = {}) {
  if (typeof updateBudget !== "function") {
    throw new Error("updateBudget is required to complete the budget cycle.");
  }

  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const activeHeader = findActiveHeader(safeBudgets, headerHint);

  if (!activeHeader?.id) {
    throw new Error("No active budget was found to complete.");
  }

  const activeCategories = safeBudgets.filter((budget) => {
    if (!budget?.id || isBudgetHeader(budget) || isInactive(budget)) return false;
    if (sameCycle(budget, activeHeader)) return true;

    // Legacy category rows can predate explicit cycle metadata. If they are
    // still active, they belong to the live plan and must close with it so an
    // orphan category cannot continue accepting planned expenses.
    return !hasCycleIdentity(budget);
  });

  const now = new Date().toISOString();
  const patch = completedPatch(now, activeHeader.id);
  const closedCategoryIds = [];

  // Close categories before the header. If a category write fails, the header
  // remains active and the user can safely retry instead of leaving an active
  // orphan category under a completed plan.
  for (const category of activeCategories) {
    await updateBudget(String(category.id), patch);
    closedCategoryIds.push(category.id);
  }

  const storedSnapshot = completionSnapshot && typeof completionSnapshot === "object"
    ? {
        ...completionSnapshot,
        version: Number(completionSnapshot.version) || 1,
        headerId: normalizeString(completionSnapshot.headerId || activeHeader.id),
        completedAt: now,
      }
    : null;

  await updateBudget(String(activeHeader.id), {
    ...patch,
    completion_snapshot: storedSnapshot,
    completion_snapshot_version: storedSnapshot?.version || null,
  });

  return {
    closedHeaderId: activeHeader.id,
    completedHeaderId: activeHeader.id,
    closedCategoryIds,
    closedAt: now,
    completedAt: now,
    completionSnapshot: storedSnapshot,
  };
}

// Backward-compatible name for callers that still use the older "close" wording.
export async function closeMonthlyBudgetCycle(options = {}) {
  return completeMonthlyBudgetCycle(options);
}

function resetBoundaryFrom(payload = {}) {
  // The cycle window describes when the plan is scheduled to run. It must not
  // be reused as the fresh-session cutoff, or transactions from earlier in the
  // same cycle will immediately reappear after a reset.
  return normalizeString(
    payload.reset_start_at ||
      payload.tracking_started_at ||
      payload.tracking_start_date
  );
}

export async function resetMonthlyBudgetCycle({
  budgets = [],
  headerPayload,
  categoryPayloads = [],
  addBudget,
  updateBudget,
} = {}) {
  if (typeof addBudget !== "function") {
    throw new Error("addBudget is required to reset the budget cycle.");
  }

  if (typeof updateBudget !== "function") {
    throw new Error("updateBudget is required to archive the old budget cycle.");
  }

  if (!headerPayload || typeof headerPayload !== "object") {
    throw new Error("A new budget header payload is required.");
  }

  const now = new Date().toISOString();
  const resetBoundary = resetBoundaryFrom(headerPayload) || now;
  const safeBudgets = Array.isArray(budgets) ? budgets : [];

  // A user can have an old active header plus a newer unfinished draft. Picking
  // only the first header leaves the other one alive, which makes the old total
  // reappear after reset. Reset therefore closes every non-archived header.
  const activeHeaders = safeBudgets.filter(
    (budget) => isBudgetHeader(budget) && !isInactive(budget)
  );
  const primaryHeader = activeHeaders[0] || null;

  const activeCategories = safeBudgets.filter((budget) => {
    if (isBudgetHeader(budget) || isInactive(budget)) return false;

    // Legacy budget rows sometimes have no cycle metadata. They still belong to
    // the active budgeting ecosystem and must be cleared by a full reset.
    if (!hasCycleIdentity(budget)) return true;

    if (activeHeaders.some((header) => sameCycle(budget, header))) return true;
    return sameCycle(budget, headerPayload);
  });

  const archivedHeaderIds = [];
  for (const header of activeHeaders) {
    if (!header?.id) continue;
    await updateBudget(header.id, archivePatch(now));
    archivedHeaderIds.push(header.id);
  }

  const archivedCategoryIds = [];
  for (const category of activeCategories) {
    if (!category?.id) continue;
    await updateBudget(category.id, archivePatch(now));
    archivedCategoryIds.push(category.id);
  }

  const newHeader = await addBudget({
    ...headerPayload,
    reset_start_at: resetBoundary,
    tracking_started_at: resetBoundary,
    tracking_start_date: resetBoundary,
    cycle_start: headerPayload.cycle_start || resetBoundary,
    period_start: headerPayload.period_start || headerPayload.cycle_start || resetBoundary,
    is_active: true,
    active: true,
    status: headerPayload.status || "draft",
    reset_from_budget_id: primaryHeader?.id || null,
    reset_from_budget_ids: archivedHeaderIds,
    reset_at: now,
    created_at: headerPayload.created_at || now,
    updated_at: now,
  });

  const newCategories = [];
  for (const payload of Array.isArray(categoryPayloads) ? categoryPayloads : []) {
    if (!payload) continue;
    newCategories.push(
      await addBudget({
        ...payload,
        reset_start_at: payload.reset_start_at || resetBoundary,
        tracking_started_at: payload.tracking_started_at || resetBoundary,
        tracking_start_date: payload.tracking_start_date || resetBoundary,
        is_active: true,
        active: true,
        status: payload.status || "active",
        reset_from_budget_id: primaryHeader?.id || null,
        reset_from_budget_ids: archivedHeaderIds,
        reset_at: now,
        created_at: payload.created_at || now,
        updated_at: now,
      })
    );
  }

  return {
    archivedHeaderId: primaryHeader?.id || null,
    archivedHeaderIds,
    archivedCategoryIds,
    newHeader,
    newCategories,
  };
}
