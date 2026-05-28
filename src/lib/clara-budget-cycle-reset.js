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
  return row?.is_active === false || row?.active === false || ["inactive", "archived", "deleted", "closed"].includes(status);
}

function sameCycle(row = {}, header = {}) {
  if (!header) return false;
  const headerMonth = normalizeString(header.month || header.month_key || header.budget_month);
  const rowMonth = normalizeString(row.month || row.month_key || row.budget_month);
  const headerCycleStart = normalizeString(header.cycle_start || header.period_start || header.budget_cycle_start);
  const rowCycleStart = normalizeString(row.cycle_start || row.period_start || row.budget_cycle_start);

  if (headerCycleStart && rowCycleStart && headerCycleStart === rowCycleStart) return true;
  if (headerMonth && rowMonth && headerMonth === rowMonth) return true;
  return false;
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
  const activeHeader = (Array.isArray(budgets) ? budgets : []).find(
    (budget) => isBudgetHeader(budget) && !isInactive(budget)
  );

  const activeCategories = (Array.isArray(budgets) ? budgets : []).filter(
    (budget) => !isBudgetHeader(budget) && !isInactive(budget) && (!activeHeader || sameCycle(budget, activeHeader))
  );

  if (activeHeader?.id) {
    await updateBudget(activeHeader.id, archivePatch(now));
  }

  for (const category of activeCategories) {
    if (category?.id) {
      await updateBudget(category.id, archivePatch(now));
    }
  }

  const newHeader = await addBudget({
    ...headerPayload,
    is_active: true,
    active: true,
    status: headerPayload.status || "draft",
    reset_from_budget_id: activeHeader?.id || null,
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
        is_active: true,
        active: true,
        status: payload.status || "active",
        reset_from_budget_id: activeHeader?.id || null,
        reset_at: now,
        created_at: payload.created_at || now,
        updated_at: now,
      })
    );
  }

  return {
    archivedHeaderId: activeHeader?.id || null,
    archivedCategoryIds: activeCategories.map((category) => category.id).filter(Boolean),
    newHeader,
    newCategories,
  };
}
