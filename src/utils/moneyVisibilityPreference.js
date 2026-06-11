const STORAGE_KEY = "clara_money_visibility";
const HIDDEN_VALUE = "hidden";

export function shouldShowMoneyAmounts() {
  if (typeof window === "undefined" || !window.localStorage) {
    return true;
  }

  try {
    return window.localStorage.getItem(STORAGE_KEY) !== HIDDEN_VALUE;
  } catch (error) {
    console.warn("[CLARA] Failed to read money visibility preference:", error);
    return true;
  }
}

export function maskMoneyAmount(mask = "₱••••••") {
  return mask;
}

export function formatMoneyWithVisibility(value, formatter, mask = "₱••••••") {
  if (!shouldShowMoneyAmounts()) {
    return maskMoneyAmount(mask);
  }

  return typeof formatter === "function" ? formatter(value) : String(value ?? "");
}
