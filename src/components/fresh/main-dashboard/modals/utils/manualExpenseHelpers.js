export const normalizeManualExpenseValue = (value) => String(value ?? "").trim();

export const normalizeManualExpenseLower = (value) =>
  normalizeManualExpenseValue(value).toLowerCase();

export const cleanManualExpenseAmount = (value) => {
  const amount = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
};

export const cleanManualExpenseDate = (value, fallback = "") =>
  normalizeManualExpenseValue(value || fallback);

export const cleanManualExpenseCategory = (value, fallback = "other") =>
  normalizeManualExpenseLower(value || fallback) || fallback;

export const formatManualExpenseCurrency = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
