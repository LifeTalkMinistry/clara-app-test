const CALCULATOR_MODAL_SELECTOR =
  '[data-clara-money-calculator-modal="true"]';
const MANUAL_LOG_ACTION_ATTR =
  "data-clara-calculator-manual-log-action";
const MANUAL_EXPENSE_ORB_SELECTOR =
  '[data-clara-manual-expense-orb="true"]';
const MANUAL_EXPENSE_CLOSE_SELECTOR =
  'button[aria-label="Close manual expense sheet"]';

const formatPeso = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₱0";

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const normalizeAmount = (value) => {
  const amount = Number(String(value ?? "").replaceAll(",", "").trim());
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Number(amount.toFixed(2));
};

const setNativeInputValue = (input, value) => {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;

  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const findManualExpenseAmountInput = () => {
  const closeButton = document.querySelector(MANUAL_EXPENSE_CLOSE_SELECTOR);
  const sheet = closeButton?.closest?.("div.fixed.inset-0") || closeButton?.parentElement?.parentElement;

  return (
    sheet?.querySelector?.(
      'input[type="number"][inputmode="decimal"]'
    ) || null
  );
};

const simulateManualExpenseOrbTap = () => {
  const orb = document.querySelector(MANUAL_EXPENSE_ORB_SELECTOR);
  if (!orb) return false;

  const rect = orb.getBoundingClientRect();
  const clientX = rect.left + rect.width / 2;
  const clientY = rect.top + rect.height / 2;
  const PointerEventCtor = window.PointerEvent || window.MouseEvent;
  const pointerId = Math.max(1, Math.floor(Date.now() % 100000));

  const baseOptions = {
    bubbles: true,
    cancelable: true,
    composed: true,
    button: 0,
    clientX,
    clientY,
    isPrimary: true,
    pointerId,
    pointerType: "mouse",
  };

  orb.dispatchEvent(
    new PointerEventCtor("pointerdown", {
      ...baseOptions,
      buttons: 1,
    })
  );

  window.setTimeout(() => {
    orb.dispatchEvent(
      new PointerEventCtor("pointerup", {
        ...baseOptions,
        buttons: 0,
      })
    );
  }, 36);

  return true;
};

const createHelperText = () => {
  const helper = document.createElement("p");
  helper.textContent =
    "The result will be placed in Amount. You still choose the wallet, category, and save.";
  Object.assign(helper.style, {
    margin: "8px 4px 0",
    color: "rgba(255,255,255,0.48)",
    fontSize: "11px",
    lineHeight: "1.5",
    textAlign: "center",
  });
  return helper;
};

const createManualLogButton = () => {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(MANUAL_LOG_ACTION_ATTR, "true");
  button.setAttribute("data-clara-no-sound", "true");

  Object.assign(button.style, {
    width: "100%",
    minHeight: "48px",
    marginTop: "12px",
    borderRadius: "14px",
    border: "1px solid rgba(110, 231, 183, 0.34)",
    background:
      "linear-gradient(135deg, rgb(52, 211, 153), rgb(34, 211, 238))",
    color: "rgb(3, 19, 38)",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: "800",
    letterSpacing: "-0.01em",
    cursor: "pointer",
    boxShadow:
      "0 12px 26px rgba(16,185,129,0.20), 0 0 18px rgba(34,211,238,0.12)",
    transition: "transform 140ms ease, opacity 140ms ease",
  });

  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });

  return button;
};

export function installMoneyLeftCalculatorManualLogBridge() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {};
  }

  if (window.__claraCalculatorManualLogBridgeInstalled) {
    return () => {};
  }

  window.__claraCalculatorManualLogBridgeInstalled = true;

  let pendingAmount = null;
  let pendingFocusTimer = null;
  const enhancedModals = new WeakSet();
  const resultObservers = new WeakMap();

  const fillPendingAmount = () => {
    if (!Number.isFinite(pendingAmount) || pendingAmount <= 0) return false;

    const amountInput = findManualExpenseAmountInput();
    if (!amountInput) return false;

    const amountValue = String(Number(pendingAmount.toFixed(2)));
    setNativeInputValue(amountInput, amountValue);
    pendingAmount = null;

    window.clearTimeout(pendingFocusTimer);
    pendingFocusTimer = window.setTimeout(() => {
      amountInput.focus({ preventScroll: false });
      amountInput.select?.();
    }, 80);

    return true;
  };

  const enhanceCalculator = (overlay) => {
    if (!overlay || enhancedModals.has(overlay)) return;

    const dialog = overlay.querySelector('section[role="dialog"]');
    if (!dialog) return;

    const display = dialog.children?.[1] || null;
    const resultLine = display?.children?.[1] || null;
    const keypad = dialog.children?.[2] || null;

    if (!resultLine || !keypad) return;

    enhancedModals.add(overlay);

    const actionButton = createManualLogButton();
    const helperText = createHelperText();
    keypad.insertAdjacentElement("afterend", actionButton);
    actionButton.insertAdjacentElement("afterend", helperText);

    const readResult = () => normalizeAmount(resultLine.textContent);

    const updateActionState = () => {
      const amount = readResult();
      const enabled = Number.isFinite(amount) && amount > 0;

      actionButton.disabled = !enabled;
      actionButton.style.opacity = enabled ? "1" : "0.46";
      actionButton.style.cursor = enabled ? "pointer" : "not-allowed";
      actionButton.textContent = enabled
        ? `Use ${formatPeso(amount)} in Manual Log`
        : "Enter a valid amount first";
    };

    actionButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const amount = readResult();
      if (!Number.isFinite(amount) || amount <= 0) return;

      pendingAmount = amount;
      actionButton.disabled = true;
      actionButton.style.opacity = "0.72";
      actionButton.textContent = "Opening Manual Log…";

      resultObservers.get(overlay)?.disconnect?.();
      overlay.remove();

      window.requestAnimationFrame(() => {
        simulateManualExpenseOrbTap();
      });
    });

    const resultObserver = new MutationObserver(updateActionState);
    resultObserver.observe(resultLine, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    resultObservers.set(overlay, resultObserver);

    updateActionState();
  };

  const scan = () => {
    document
      .querySelectorAll(CALCULATOR_MODAL_SELECTOR)
      .forEach((overlay) => enhanceCalculator(overlay));

    fillPendingAmount();
  };

  scan();

  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return () => {
    observer.disconnect();
    window.clearTimeout(pendingFocusTimer);
    document
      .querySelectorAll(`[${MANUAL_LOG_ACTION_ATTR}="true"]`)
      .forEach((button) => button.remove());
    window.__claraCalculatorManualLogBridgeInstalled = false;
  };
}
