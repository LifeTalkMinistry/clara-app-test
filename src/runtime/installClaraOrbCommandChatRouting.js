import { CLARA_ORB_COMMAND_SELECT_EVENT } from "../lib/clara-orb-command-ring.js";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "../lib/clara-pause-events.js";

const RUNTIME_KEY = "__claraOrbCommandChatRoutingRuntime__";
const LOG_EXPENSE_OVERLAY_SELECTOR = '[data-clara-log-expense-chat="true"]';
const MONEY_SCHEDULE_OVERLAY_SELECTOR = '[data-clara-money-schedule-chat="true"]';
const LOG_EXPENSE_VIEWPORT_SELECTOR = '[data-clara-ai-message-viewport="true"]';
const LOG_EXPENSE_AMOUNT_INPUT_SELECTOR = 'input[placeholder="Amount spent"]';
const LOG_EXPENSE_ITEM_INPUT_SELECTOR = 'input[placeholder="What was it for?"]';
const CANONICAL_FORM_ATTRIBUTE = "data-clara-buy-check-react-form";
const CANONICAL_STACK_ATTRIBUTE = "data-clara-ai-message-stack";
const CHAT_COMMAND_MODES = Object.freeze({
  "log-expense": "log-expense",
  "add-income": "add-income",
  wallet: "wallet",
  calendar: "calendar",
  "money-schedule": "money-schedule",
  "emergency-fund": "emergency-fund",
  "savings-goal": "savings-goal",
  "debt-obligation": "debt-obligation",
  "weekly-cross-check": "weekly-cross-check",
});
const registeredAmountInputs = new WeakSet();

function sanitizeLogExpenseAmountInput(value) {
  const compact = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^0-9.]/g, "");
  const decimalIndex = compact.indexOf(".");

  if (decimalIndex < 0) return compact;

  const whole = compact.slice(0, decimalIndex) || "0";
  const fraction = compact
    .slice(decimalIndex + 1)
    .replace(/\./g, "")
    .slice(0, 2);

  return `${whole}.${fraction}`;
}

function setInputValueWithoutTouchingReactTracker(input, value) {
  if (!input) return;

  const inputPrototype =
    typeof HTMLInputElement !== "undefined" ? HTMLInputElement.prototype : null;
  const nativeValueSetter = inputPrototype
    ? Object.getOwnPropertyDescriptor(inputPrototype, "value")?.set
    : null;

  if (nativeValueSetter) {
    nativeValueSetter.call(input, value);
    return;
  }

  input.value = value;
}

function configureLogExpenseComposerInputs(overlay) {
  if (!overlay) return;

  const amountInput = overlay.querySelector(LOG_EXPENSE_AMOUNT_INPUT_SELECTOR);
  if (amountInput) {
    amountInput.setAttribute("inputmode", "decimal");
    amountInput.setAttribute("pattern", "[0-9]*[.]?[0-9]{0,2}");
    amountInput.setAttribute("autocomplete", "off");
    amountInput.setAttribute("data-clara-log-expense-input-kind", "amount");

    if (!registeredAmountInputs.has(amountInput)) {
      registeredAmountInputs.add(amountInput);
      amountInput.addEventListener(
        "input",
        () => {
          const sanitized = sanitizeLogExpenseAmountInput(amountInput.value);
          if (sanitized !== amountInput.value) {
            setInputValueWithoutTouchingReactTracker(amountInput, sanitized);
          }
        },
        true
      );
    }
  }

  const itemInput = overlay.querySelector(LOG_EXPENSE_ITEM_INPUT_SELECTOR);
  if (itemInput) {
    itemInput.setAttribute("inputmode", "text");
    itemInput.setAttribute("autocomplete", "off");
    itemInput.removeAttribute("pattern");
    itemInput.setAttribute("data-clara-log-expense-input-kind", "item");
  }
}

function simplifyLogExpenseHeader(overlay) {
  const header = overlay?.querySelector?.("header");
  if (!header) return;

  const title = header.querySelector("h1");
  const supportingCopy = header.querySelectorAll("p");

  supportingCopy.forEach((element) => {
    element.hidden = true;
  });

  header.dataset.claraLogExpensePremiumHeader = "true";
  header.style.minHeight = "64px";
  header.style.paddingTop = "0";
  header.style.paddingBottom = "0";

  if (title) {
    title.textContent = "Log Expense";
    title.style.position = "absolute";
    title.style.inset = "0 76px";
    title.style.display = "flex";
    title.style.alignItems = "center";
    title.style.justifyContent = "center";
    title.style.margin = "0";
    title.style.textAlign = "center";
    title.style.fontSize = "16px";
    title.style.lineHeight = "1";
    title.style.letterSpacing = "-0.02em";
    title.style.pointerEvents = "none";
  }
}

function simplifyMoneyScheduleHeader(overlay) {
  const header = overlay?.querySelector?.("header");
  if (!header) return;

  const title = header.querySelector("h1");
  const supportingCopy = header.querySelectorAll("p");
  const closeButton = header.querySelector('button[aria-label="Close Money Schedule"]');
  const accentLine = header.firstElementChild;

  supportingCopy.forEach((element) => {
    element.hidden = true;
  });

  header.dataset.claraMoneySchedulePremiumHeader = "true";
  header.style.minHeight = "64px";
  header.style.paddingTop = "0";
  header.style.paddingBottom = "0";
  header.style.background =
    "linear-gradient(115deg,rgba(5,26,62,0.98),rgba(7,22,48,0.98) 56%,rgba(7,31,38,0.96))";

  if (accentLine instanceof HTMLElement) {
    accentLine.style.background = "linear-gradient(90deg,#1769ff,#2be1d8)";
  }

  if (title) {
    title.textContent = "Money Schedule";
    title.style.position = "absolute";
    title.style.inset = "0 76px";
    title.style.display = "flex";
    title.style.alignItems = "center";
    title.style.justifyContent = "center";
    title.style.margin = "0";
    title.style.textAlign = "center";
    title.style.fontSize = "16px";
    title.style.lineHeight = "1";
    title.style.letterSpacing = "-0.02em";
    title.style.pointerEvents = "none";
  }

  if (closeButton instanceof HTMLElement) {
    closeButton.style.right = "6px";
  }
}

function registerLogExpenseChatKeyboardOwnership() {
  if (typeof document === "undefined") return;

  const overlay = document.querySelector(LOG_EXPENSE_OVERLAY_SELECTOR);
  if (!overlay) return;

  const form = overlay.querySelector("form");
  if (form && form.getAttribute(CANONICAL_FORM_ATTRIBUTE) !== "true") {
    form.setAttribute(CANONICAL_FORM_ATTRIBUTE, "true");
  }

  configureLogExpenseComposerInputs(overlay);
  simplifyLogExpenseHeader(overlay);

  const viewport = overlay.querySelector(LOG_EXPENSE_VIEWPORT_SELECTOR);
  const stack = viewport?.firstElementChild || null;
  if (stack && stack.getAttribute(CANONICAL_STACK_ATTRIBUTE) !== "true") {
    stack.setAttribute(CANONICAL_STACK_ATTRIBUTE, "true");
  }
}

function registerMoneySchedulePresentation() {
  if (typeof document === "undefined") return;

  const overlay = document.querySelector(MONEY_SCHEDULE_OVERLAY_SELECTOR);
  if (!overlay) return;

  simplifyMoneyScheduleHeader(overlay);
}

function installClaraOrbCommandChatRouting() {
  if (typeof window === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  let registrationFrame = 0;

  const queueKeyboardRegistration = () => {
    if (registrationFrame || typeof document === "undefined") return;
    registrationFrame = window.requestAnimationFrame(() => {
      registrationFrame = 0;
      registerLogExpenseChatKeyboardOwnership();
      registerMoneySchedulePresentation();
    });
  };

  const handleCommandSelect = (event) => {
    const commandId = String(event?.detail?.commandId || "").trim();
    const mode = CHAT_COMMAND_MODES[commandId];
    if (!mode) return;

    event.preventDefault?.();

    const requestId = `clara-orb-${commandId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.dispatchEvent(
      new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
        detail: {
          requestId,
          source: "clara-orb-page",
          mode,
          commandId,
        },
      })
    );

    if (commandId === "log-expense" || commandId === "money-schedule") {
      queueKeyboardRegistration();
    }
  };

  const root =
    typeof document !== "undefined"
      ? document.getElementById("root") || document.body
      : null;
  const observer =
    root && typeof MutationObserver !== "undefined"
      ? new MutationObserver(queueKeyboardRegistration)
      : null;

  observer?.observe(root, {
    childList: true,
    subtree: true,
  });

  window.addEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleCommandSelect);
  queueKeyboardRegistration();

  window[RUNTIME_KEY] = {
    destroy() {
      observer?.disconnect();
      if (registrationFrame) window.cancelAnimationFrame(registrationFrame);
      registrationFrame = 0;
      window.removeEventListener(CLARA_ORB_COMMAND_SELECT_EVENT, handleCommandSelect);
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbCommandChatRouting();