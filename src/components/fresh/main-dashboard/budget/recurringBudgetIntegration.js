export function cleanRecurringBudgetText(value) {
  return String(value || "").trim();
}

export function cleanRecurringBudgetMoney(value) {
  const number = Number(String(value ?? "").replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}
