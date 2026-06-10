import {
  belongsToBudgetOwner,
  doesBudgetRowBelongToCycle,
  getBudgetMonthKey,
  isBudgetHeader,
  isBudgetRowInactive,
  normalizeBudgetString,
  selectDashboardBudgetHeaders,
} from "./clara-budget-cycle-authority.js";

function archivePatch(now, extra = {}) {
  return {
    is_active: false,
    active: false,
    status: "archived",
    archived_at: now,
    closed_at: now,
    updated_at: now,
    ...extra,
  };
}

function restorePatch(row = {}, now) {
  return {
    is_active: row?.is_active !== false,
    active: row?.active !== false,
    status: row?.status || "active",
    archived_at: row?.archived_at ?? null,
    closed_at: row?.closed_at ?? null,
    updated_at: now,
  };
}

function unwrapCreatedRow(result) {
  return result?.budget || result?.record || result?.data || result || null;
}

function sameTargetMonth(row = {}, headerPayload = {}) {
  const rowMonth = getBudgetMonthKey(row);
  const targetMonth = getBudgetMonthKey(headerPayload);
  return !rowMonth || !targetMonth || rowMonth === targetMonth;
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

  const safeBudgets = Array.isArray(budgets) ? budgets : [];
  const now = new Date().toISOString();
  const resetStartAt = headerPayload.reset_start_at || now;
  const owner = {
    user_id: headerPayload.user_id,
    userId: headerPayload.userId,
    email: headerPayload.email,
    user_email: headerPayload.user_email,
    created_by: headerPayload.created_by,
  };
  const { budgetCycleHeader: activeHeader } = selectDashboardBudgetHeaders({
    budgets: safeBudgets.filter(
      (row) => sameTargetMonth(row, headerPayload) && belongsToBudgetOwner(row, owner)
    ),
    currentMonthKey: getBudgetMonthKey(headerPayload),
    user: owner,
  });
  const activeCategories = safeBudgets.filter(
    (row) =>
      !isBudgetHeader(row) &&
      !isBudgetRowInactive(row) &&
      sameTargetMonth(row, headerPayload) &&
      belongsToBudgetOwner(row, owner) &&
      (!activeHeader || doesBudgetRowBelongToCycle(row, activeHeader))
  );

  const createdHeaderResult = await addBudget({
    ...headerPayload,
    is_active: true,
    active: true,
    status: headerPayload.status || "draft",
    is_complete: false,
    reset_from_budget_id: activeHeader?.id || null,
    reset_start_at: resetStartAt,
    reset_at: now,
    created_at: headerPayload.created_at || now,
    updated_at: now,
  });
  const newHeader = unwrapCreatedRow(createdHeaderResult);
  const newHeaderId = normalizeBudgetString(newHeader?.id || createdHeaderResult?.id);

  if (!newHeaderId) {
    throw new Error("The new budget cycle marker was not persisted with an id.");
  }

  const archivedRows = [];
  const newCategories = [];

  try {
    if (activeHeader?.id && String(activeHeader.id) !== newHeaderId) {
      await updateBudget(activeHeader.id, archivePatch(now));
      archivedRows.push(activeHeader);
    }

    for (const category of activeCategories) {
      if (!category?.id) continue;
      await updateBudget(category.id, archivePatch(now));
      archivedRows.push(category);
    }

    for (const payload of Array.isArray(categoryPayloads) ? categoryPayloads : []) {
      if (!payload) continue;
      const createdCategoryResult = await addBudget({
        ...payload,
        is_active: true,
        active: true,
        status: payload.status || "active",
        reset_from_budget_id: activeHeader?.id || null,
        reset_start_at: payload.reset_start_at || resetStartAt,
        reset_at: now,
        created_at: payload.created_at || now,
        updated_at: now,
      });
      newCategories.push(unwrapCreatedRow(createdCategoryResult));
    }
  } catch (error) {
    for (const row of [...archivedRows].reverse()) {
      if (!row?.id) continue;
      try {
        await updateBudget(row.id, restorePatch(row, new Date().toISOString()));
      } catch (restoreError) {
        console.error("CLARA budget reset rollback could not restore a row.", restoreError);
      }
    }

    try {
      await updateBudget(
        newHeaderId,
        archivePatch(new Date().toISOString(), {
          reset_failed_at: new Date().toISOString(),
          reset_failure_reason: error?.message || "Budget reset archival failed.",
        })
      );
    } catch (rollbackError) {
      console.error("CLARA budget reset rollback could not archive the new marker.", rollbackError);
    }

    throw error;
  }

  return {
    archivedHeaderId: activeHeader?.id || null,
    archivedCategoryIds: activeCategories.map((category) => category.id).filter(Boolean),
    newHeader,
    newCategories,
    resetStartAt,
  };
}
