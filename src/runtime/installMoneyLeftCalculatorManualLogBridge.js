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
  const sheet =
    closeButton?.closest?.("div.fixed.inset-0") ||
    closeButton?.parentElement?.parentElement;

  return (
    sheet?.querySelector?.('input[type="number"][inputmode="decimal"]') ||
    null
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

const createArrowIcon = () => {
  const iconShell = document.createElement("span");
  iconShell.setAttribute("aria-hidden", "true");
  Object.assign(iconShell.style, {
    display: "grid",
    width: "26px",
    height: "26px",
    flex: "0 0 26px",
    placeItems: "center",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.075)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
  });

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2.2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.innerHTML = [
    '<path d="M5 12h14" />',
    '<path d="m13 6 6 6-6 6" />',
  ].join("");

  iconShell.appendChild(svg);
  return iconShell;
};

const createManualLogButton = () => {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(MANUAL_LOG_ACTION_ATTR, "true");
  button.setAttribute("data-clara-no-sound", "true");

  const label = document.createElement("span");
  label.setAttribute("data-clara-calculator-manual-log-label", "true");
  Object.assign(label.style, {
    minWidth: "0",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  });

  const arrow = createArrowIcon();
  button.append(label, arrow);

  Object.assign(button.style, {
    width: "100%",
    height: "50px",
    marginTop: "12px",
    padding: "0 12px 0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
    borderRadius: "15px",
    border: "1px solid rgba(103,232,249,0.28)",
    background:
      "linear-gradient(135deg, rgba(13,35,75,0.98), rgba(49,30,111,0.98))",
    color: "rgba(255,255,255,0.96)",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: "800",
    letterSpacing: "-0.01em",
    cursor: "pointer",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px rgba(3,8,28,0.34), 0 0 20px rgba(34,211,238,0.08)",
    transition:
      "transform 140ms ease, opacity 140ms ease, border-color 140ms ease, background 140ms ease",
    WebkitTapHighlightColor: "transparent",
  });

  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    if (!button.disabled) button.style.transform = "scale(0.985)";
  });
  button.addEventListener("pointerup", () => {
    button.style.transform = "scale(1)";
  });
  button.addEventListener("pointercancel", () => {
    button.style.transform = "scale(1)";
  });
  button.addEventListener("pointerleave", () => {
    button.style.transform = "scale(1)";
  });
  button.addEventListener("mouseenter", () => {
    if (button.disabled) return;
    button.style.borderColor = "rgba(103,232,249,0.42)";
    button.style.background =
      "linear-gradient(135deg, rgba(16,43,91,0.99), rgba(59,35,128,0.99))";
  });
  button.addEventListener("mouseleave", () => {
    button.style.borderColor = "rgba(103,232,249,0.28)";
    button.style.background =
      "linear-gradient(135deg, rgba(13,35,75,0.98), rgba(49,30,111,0.98))";
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
    const actionLabel = actionButton.querySelector(
      '[data-clara-calculator-manual-log-label="true"]'
    );
    keypad.insertAdjacentElement("afterend", actionButton);

    const readResult = () => normalizeAmount(resultLine.textContent);

    const updateActionState = () => {
      const amount = readResult();
      const enabled = Number.isFinite(amount) && amount > 0;

      actionButton.disabled = !enabled;
      actionButton.style.opacity = enabled ? "1" : "0.44";
      actionButton.style.cursor = enabled ? "pointer" : "not-allowed";
      actionButton.setAttribute(
        "aria-label",
        enabled
          ? `Log ${formatPeso(amount)} as an expense`
          : "Calculate an amount first"
      );
      actionLabel.textContent = enabled
        ? `Log ${formatPeso(amount)} as Expense`
        : "Calculate an amount first";
    };

    actionButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const amount = readResult();
      if (!Number.isFinite(amount) || amount <= 0) return;

      pendingAmount = amount;
      actionButton.disabled = true;
      actionButton.style.opacity = "0.72";
      actionLabel.textContent = "Opening Manual Log…";

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
