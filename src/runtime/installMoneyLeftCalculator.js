const CALCULATOR_BUTTON_ATTR = "data-clara-money-calculator-toggle";
const CALCULATOR_MODAL_ATTR = "data-clara-money-calculator-modal";
const PRIVACY_BUTTON_SELECTOR = 'button[data-clara-summary-privacy-toggle="true"]';

const KEYS = [
  ["7", "8", "9", "÷"],
  ["4", "5", "6", "×"],
  ["1", "2", "3", "-"],
  ["0", ".", "(", ")"],
  ["C", "⌫", "=", "+"],
];

const applyStyles = (element, styles) => {
  Object.assign(element.style, styles);
  return element;
};

const evaluateExpression = (expression) => {
  const raw = String(expression || "").trim();
  if (!raw) return "";

  const sanitized = raw.replace(/×/g, "*").replace(/÷/g, "/");
  if (!/^[\d+\-*/().\s]+$/.test(sanitized)) {
    throw new Error("Invalid expression");
  }

  const result = Function(`"use strict"; return (${sanitized})`)();
  if (!Number.isFinite(result)) throw new Error("Invalid result");

  return String(Number(result.toFixed(8)));
};

const createCalculatorIcon = () => {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "14");
  svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = [
    '<rect width="16" height="20" x="4" y="2" rx="2" />',
    '<line x1="8" x2="16" y1="6" y2="6" />',
    '<line x1="8" x2="8" y1="10" y2="10" />',
    '<line x1="12" x2="12" y1="10" y2="10" />',
    '<line x1="16" x2="16" y1="10" y2="10" />',
    '<line x1="8" x2="8" y1="14" y2="14" />',
    '<line x1="12" x2="12" y1="14" y2="14" />',
    '<line x1="16" x2="16" y1="14" y2="14" />',
    '<line x1="8" x2="8" y1="18" y2="18" />',
    '<line x1="12" x2="12" y1="18" y2="18" />',
    '<line x1="16" x2="16" y1="18" y2="18" />',
  ].join("");
  return svg;
};

const closeCalculator = () => {
  document.querySelector(`[${CALCULATOR_MODAL_ATTR}="true"]`)?.remove();
};

const openCalculator = () => {
  closeCalculator();

  let expression = "";

  const overlay = document.createElement("div");
  overlay.setAttribute(CALCULATOR_MODAL_ATTR, "true");
  overlay.setAttribute("role", "presentation");
  applyStyles(overlay, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    background: "rgba(0, 5, 18, 0.76)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  });

  const dialog = document.createElement("section");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", "Calculator");
  applyStyles(dialog, {
    width: "min(320px, calc(100vw - 32px))",
    borderRadius: "24px",
    border: "1px solid rgba(34, 211, 238, 0.26)",
    background: "linear-gradient(145deg, rgba(4, 23, 51, 0.99), rgba(20, 13, 66, 0.99))",
    boxShadow: "0 28px 90px rgba(0,0,0,0.62), 0 0 34px rgba(34,211,238,0.14)",
    padding: "16px",
    color: "white",
    fontFamily: "inherit",
  });

  const header = document.createElement("div");
  applyStyles(header, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  });

  const title = document.createElement("strong");
  title.textContent = "Calculator";
  applyStyles(title, { fontSize: "16px", letterSpacing: "-0.01em" });

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.setAttribute("aria-label", "Close calculator");
  applyStyles(closeButton, {
    width: "32px",
    height: "32px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.75)",
    fontSize: "22px",
    lineHeight: "1",
    cursor: "pointer",
  });
  closeButton.addEventListener("click", closeCalculator);

  header.append(title, closeButton);

  const display = document.createElement("div");
  applyStyles(display, {
    minHeight: "76px",
    borderRadius: "16px",
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(1, 11, 31, 0.78)",
    padding: "12px 14px",
    boxShadow: "inset 0 1px 14px rgba(0,0,0,0.32)",
    marginBottom: "12px",
  });

  const expressionLine = document.createElement("div");
  applyStyles(expressionLine, {
    minHeight: "20px",
    textAlign: "right",
    color: "rgba(255,255,255,0.56)",
    fontSize: "14px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  });

  const resultLine = document.createElement("div");
  applyStyles(resultLine, {
    minHeight: "30px",
    marginTop: "4px",
    textAlign: "right",
    color: "rgb(103, 232, 249)",
    fontSize: "25px",
    fontWeight: "800",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  });

  display.append(expressionLine, resultLine);

  const renderDisplay = () => {
    expressionLine.textContent = expression || "0";
    try {
      resultLine.textContent = expression ? evaluateExpression(expression) : "";
    } catch {
      resultLine.textContent = "";
    }
  };

  const keypad = document.createElement("div");
  applyStyles(keypad, { display: "grid", gap: "8px" });

  const handleKey = (key) => {
    if (key === "C") {
      expression = "";
    } else if (key === "⌫") {
      expression = expression.slice(0, -1);
    } else if (key === "=") {
      try {
        expression = evaluateExpression(expression);
      } catch {
        resultLine.textContent = "Error";
        return;
      }
    } else {
      expression += key;
    }
    renderDisplay();
  };

  KEYS.forEach((row) => {
    const rowElement = document.createElement("div");
    applyStyles(rowElement, {
      display: "grid",
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
      gap: "8px",
    });

    row.forEach((key) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = key;
      button.setAttribute("aria-label", key === "⌫" ? "Delete last character" : key);

      const isEquals = key === "=";
      const isClear = key === "C";
      const isOperator = ["÷", "×", "-", "+"].includes(key);

      applyStyles(button, {
        height: "44px",
        borderRadius: "12px",
        border: isEquals
          ? "1px solid rgba(103,232,249,0.55)"
          : "1px solid rgba(255,255,255,0.10)",
        background: isEquals
          ? "rgb(34, 211, 238)"
          : isClear
            ? "rgba(244, 63, 94, 0.14)"
            : isOperator
              ? "rgba(139, 92, 246, 0.16)"
              : "rgba(255,255,255,0.06)",
        color: isEquals
          ? "rgb(2, 13, 31)"
          : isClear
            ? "rgb(253, 164, 175)"
            : isOperator
              ? "rgb(221, 214, 254)"
              : "white",
        fontSize: "15px",
        fontWeight: "700",
        cursor: "pointer",
        boxShadow: isEquals ? "0 0 18px rgba(34,211,238,0.22)" : "none",
      });

      button.addEventListener("click", () => handleKey(key));
      rowElement.appendChild(button);
    });

    keypad.appendChild(rowElement);
  });

  dialog.append(header, display, keypad);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  renderDisplay();

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeCalculator();
  });

  const handleEscape = (event) => {
    if (event.key !== "Escape") return;
    closeCalculator();
    window.removeEventListener("keydown", handleEscape);
  };
  window.addEventListener("keydown", handleEscape);
};

const positionCalculatorButton = (button) => {
  const compact = window.matchMedia?.("(max-width: 380px)")?.matches;
  button.style.left = compact ? "calc(42% + 38px)" : "calc(39% + 38px)";
  button.style.top = compact ? "1.75rem" : "2rem";
};

const ensureCalculatorButton = () => {
  const privacyButton = document.querySelector(PRIVACY_BUTTON_SELECTOR);
  if (!privacyButton) return;

  const summary = privacyButton.closest('[data-clara-dashboard-section="money-summary"]');
  if (!summary) return;

  let calculatorButton = summary.querySelector(`[${CALCULATOR_BUTTON_ATTR}="true"]`);
  if (!calculatorButton) {
    calculatorButton = document.createElement("button");
    calculatorButton.type = "button";
    calculatorButton.setAttribute(CALCULATOR_BUTTON_ATTR, "true");
    calculatorButton.setAttribute("aria-label", "Open calculator");
    calculatorButton.setAttribute("title", "Calculator");
    calculatorButton.appendChild(createCalculatorIcon());

    applyStyles(calculatorButton, {
      position: "absolute",
      zIndex: "50",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "32px",
      height: "32px",
      transform: "translateX(-50%)",
      borderRadius: "999px",
      border: "1px solid rgba(207, 250, 254, 0.15)",
      background: "rgba(255,255,255,0.075)",
      color: "rgba(255,255,255,0.65)",
      cursor: "pointer",
      transition: "transform 140ms ease, background 140ms ease, color 140ms ease",
      WebkitTapHighlightColor: "transparent",
    });

    calculatorButton.addEventListener("pointerdown", (event) => event.stopPropagation());
    calculatorButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openCalculator();
    });
    calculatorButton.addEventListener("mouseenter", () => {
      calculatorButton.style.background = "rgba(255,255,255,0.12)";
      calculatorButton.style.color = "rgba(255,255,255,0.86)";
    });
    calculatorButton.addEventListener("mouseleave", () => {
      calculatorButton.style.background = "rgba(255,255,255,0.075)";
      calculatorButton.style.color = "rgba(255,255,255,0.65)";
    });

    summary.appendChild(calculatorButton);
  }

  calculatorButton.disabled = Boolean(privacyButton.disabled);
  calculatorButton.style.opacity = calculatorButton.disabled ? "0.45" : "1";
  calculatorButton.style.pointerEvents = calculatorButton.disabled ? "none" : "auto";
  positionCalculatorButton(calculatorButton);
};

export function installMoneyLeftCalculator() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {};
  if (window.__claraMoneyLeftCalculatorInstalled) return () => {};
  window.__claraMoneyLeftCalculatorInstalled = true;

  let frame = null;
  const schedule = () => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
      frame = null;
      ensureCalculatorButton();
    });
  };

  schedule();

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("resize", schedule, { passive: true });

  return () => {
    observer.disconnect();
    window.removeEventListener("resize", schedule);
    if (frame !== null) window.cancelAnimationFrame(frame);
    closeCalculator();
    document.querySelector(`[${CALCULATOR_BUTTON_ATTR}="true"]`)?.remove();
    window.__claraMoneyLeftCalculatorInstalled = false;
  };
}
