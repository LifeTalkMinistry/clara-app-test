const ACTION_SELECTOR =
  'button[data-clara-calculator-manual-log-action="true"]';
const CALCULATOR_MODAL_SELECTOR =
  '[data-clara-money-calculator-modal="true"]';
const MANUAL_EXPENSE_AMOUNT_SELECTOR =
  '.clara-manual-expense-sheet input[aria-label="Expense amount"]';

const readPositiveAmount = (value) => {
  const amount = Number(String(value ?? "").replaceAll(",", "").trim());
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Number(amount.toFixed(2));
};

const readCalculatorResult = (button) => {
  const overlay = button?.closest?.(CALCULATOR_MODAL_SELECTOR);
  const dialog = overlay?.querySelector?.('section[role="dialog"]');
  const display = dialog?.children?.[1] || null;
  const resultLine = display?.children?.[1] || null;
  return readPositiveAmount(resultLine?.textContent);
};

const setReactControlledInputValue = (input, value) => {
  if (!input) return false;

  const nextValue = String(Number(Number(value).toFixed(2)));
  const previousValue = input.value;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;

  if (nativeSetter) nativeSetter.call(input, nextValue);
  else input.value = nextValue;

  // React tracks the last rendered value. Reset the tracker to the old value
  // so the synthetic input event is treated as a genuine change.
  input._valueTracker?.setValue?.(previousValue);

  const inputEvent =
    typeof window.InputEvent === "function"
      ? new InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType: "insertText",
          data: nextValue,
        })
      : new Event("input", { bubbles: true, composed: true });

  input.dispatchEvent(inputEvent);
  input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
  return true;
};

export function installMoneyLeftCalculatorAmountPrefill() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  if (window.__claraCalculatorAmountPrefillInstalled) return () => {};
  window.__claraCalculatorAmountPrefillInstalled = true;

  let pendingAmount = null;
  let retryTimer = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 24;

  const stopRetry = () => {
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    retryTimer = null;
    attempts = 0;
  };

  const tryPrefill = () => {
    retryTimer = null;
    if (!Number.isFinite(pendingAmount) || pendingAmount <= 0) return;

    const input = document.querySelector(MANUAL_EXPENSE_AMOUNT_SELECTOR);
    if (input) {
      setReactControlledInputValue(input, pendingAmount);

      window.requestAnimationFrame(() => {
        const renderedInput = document.querySelector(
          MANUAL_EXPENSE_AMOUNT_SELECTOR
        );
        if (!renderedInput) return;

        const renderedAmount = readPositiveAmount(renderedInput.value);
        if (renderedAmount === pendingAmount) {
          renderedInput.focus?.({ preventScroll: true });
          pendingAmount = null;
          stopRetry();
        }
      });
    }

    if (pendingAmount && attempts < MAX_ATTEMPTS) {
      attempts += 1;
      retryTimer = window.setTimeout(tryPrefill, 80);
    }
  };

  const schedulePrefill = () => {
    if (!pendingAmount || retryTimer !== null) return;
    retryTimer = window.setTimeout(tryPrefill, 0);
  };

  const handleCalculatorAction = (event) => {
    const button = event.target?.closest?.(ACTION_SELECTOR);
    if (!button) return;

    const amount = readCalculatorResult(button);
    if (!amount) return;

    pendingAmount = amount;
    attempts = 0;
    schedulePrefill();
  };

  document.addEventListener("click", handleCalculatorAction, true);

  const observer = new MutationObserver(schedulePrefill);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return () => {
    document.removeEventListener("click", handleCalculatorAction, true);
    observer.disconnect();
    stopRetry();
    pendingAmount = null;
    window.__claraCalculatorAmountPrefillInstalled = false;
  };
}
