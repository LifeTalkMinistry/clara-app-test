import { CLARA_ORB_COMMAND_SELECT_EVENT } from "../lib/clara-orb-command-ring.js";
import { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "../lib/clara-pause-events.js";

const RUNTIME_KEY = "__claraOrbCommandChatRoutingRuntime__";
const LOG_EXPENSE_OVERLAY_SELECTOR = '[data-clara-log-expense-chat="true"]';
const LOG_EXPENSE_VIEWPORT_SELECTOR = '[data-clara-ai-message-viewport="true"]';
const LOG_EXPENSE_AMOUNT_INPUT_SELECTOR = 'input[placeholder="Amount spent"]';
const LOG_EXPENSE_ITEM_INPUT_SELECTOR = 'input[placeholder="What was it for?"]';
const CANONICAL_FORM_ATTRIBUTE = "data-clara-buy-check-react-form";
const CANONICAL_STACK_ATTRIBUTE = "data-clara-ai-message-stack";
const CLARA_CALENDAR_PATH = "/community?view=schedule";
const CHAT_COMMAND_MODES = Object.freeze({
  "log-expense": "log-expense",
  wallet: "wallet",
  "money-schedule": "money-schedule",
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

      // Sanitize at the actual input target before React's delegated onChange
      // reads the value. Mobile receives the decimal keyboard, while desktop
      // typing and pasted text still cannot put letters into the amount draft.
      amountInput.addEventListener(
        "input",
        () => {
          const sanitized = sanitizeLogExpenseAmountInput(amountInput.value);
          if (sanitized !== amountInput.value) {
            amountInput.value = sanitized;
          }
        },
        true
      );
    }
  }

  const itemInput = overlay.querySelector(LOG_EXPENSE_ITEM_INPUT_SELECTOR);
  if (itemInput) {
    // Item/reason is descriptive content. Restore a normal text keyboard and
    // remove the numeric-only constraint from the amount step.
    itemInput.setAttribute("inputmode", "text");
    itemInput.setAttribute("autocomplete", "off");
    itemInput.removeAttribute("pattern");
    itemInput.setAttribute("data-clara-log-expense-input-kind", "item");
  }
}

function registerLogExpenseChatKeyboardOwnership() {
  if (typeof document === "undefined") return;

  const overlay = document.querySelector(LOG_EXPENSE_OVERLAY_SELECTOR);
  if (!overlay) return;

  // The shared CLARA keyboard guard recognizes active chat composers through
  // this canonical form attribute. Log Expense mounts its composer only during
  // free-text phases (amount / item), so register it as soon as React adds it.
  // Without this marker the guard can treat the composer as missing and release
  // keyboard ownership, which can drop focus before the user can type.
  const form = overlay.querySelector("form");
  if (form && form.getAttribute(CANONICAL_FORM_ATTRIBUTE) !== "true") {
    form.setAttribute(CANONICAL_FORM_ATTRIBUTE, "true");
  }

  configureLogExpenseComposerInputs(overlay);

  // Register the transcript stack too so keyboard-time scroll anchoring uses
  // the same conversation geometry as Ask Before You Spend.
  const viewport = overlay.querySelector(LOG_EXPENSE_VIEWPORT_SELECTOR);
  const stack = viewport?.firstElementChild || null;
  if (stack && stack.getAttribute(CANONICAL_STACK_ATTRIBUTE) !== "true") {
    stack.setAttribute(CANONICAL_STACK_ATTRIBUTE, "true");
  }
}

function openActualCalendar() {
  if (typeof window === "undefined") return false;

  const history = window.history;
  const location = window.location;

  // The production Calendar already lives at the Community Schedule view.
  // Reuse that authoritative surface instead of mounting a second calendar.
  // When possible, keep this as an in-app navigation so the Orb transition
  // does not force a full browser reload.
  if (history?.pushState && location) {
    history.pushState(history.state ?? null, "", CLARA_CALENDAR_PATH);

    try {
      if (typeof PopStateEvent !== "undefined") {
        window.dispatchEvent(
          new PopStateEvent("popstate", {
            state: history.state ?? null,
          })
        );
      } else {
        window.dispatchEvent(new Event("popstate"));
      }
    } catch {
      window.dispatchEvent(new Event("popstate"));
    }

    return true;
  }

  if (location?.assign) {
    location.assign(CLARA_CALENDAR_PATH);
    return true;
  }

  return false;
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
    });
  };

  const handleCommandSelect = (event) => {
    const commandId = String(event?.detail?.commandId || "").trim();

    if (commandId === "calendar") {
      openActualCalendar();
      return;
    }

    const mode = CHAT_COMMAND_MODES[commandId];
    if (!mode) return;

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

    if (commandId === "log-expense") {
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
