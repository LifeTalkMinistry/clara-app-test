const BUY_CHECK_LABEL = "Buy Check";
const SMART_ACTIONS_LABELS = ["Smart Actions", "Analytic"];
const CORE_PANEL_LABELS = ["Core Features", "Forecast"];
const BUY_CHECK_ACTION_MATCHERS = ["Afford Check", "Can I Afford This?", "Can I Buy This?", "Buy Check"];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function includesAny(text = "", labels = []) {
  return labels.some((label) => text.includes(label));
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return includesAny(text, CORE_PANEL_LABELS) && includesAny(text, SMART_ACTIONS_LABELS);
  });
}

function getAssistantButtons() {
  const shell = getAssistantShell();
  if (!shell) return [];
  return Array.from(shell.querySelectorAll("button"));
}

function isAssistantTabButton(button) {
  if (!button) return false;
  const label = clean(button.textContent);
  if (!["Talk to CLARA", "Memory", BUY_CHECK_LABEL].includes(label)) return false;
  const shell = getAssistantShell();
  if (!shell || !shell.contains(button)) return false;
  const rowText = clean(button.parentElement?.textContent || "");
  return includesAny(rowText, CORE_PANEL_LABELS) && includesAny(rowText, SMART_ACTIONS_LABELS);
}

function findButtonByAnyLabel(labels = []) {
  return getAssistantButtons().find((button) => labels.includes(clean(button.textContent))) || null;
}

function findBuyCheckActionButton() {
  return getAssistantButtons().find((button) => {
    const text = clean(button.innerText || button.textContent);
    return BUY_CHECK_ACTION_MATCHERS.some((matcher) => text.includes(matcher)) && text.includes("purchase");
  }) || getAssistantButtons().find((button) => {
    const text = clean(button.innerText || button.textContent);
    return BUY_CHECK_ACTION_MATCHERS.some((matcher) => text.includes(matcher));
  }) || null;
}

function relabelBuyCheckTab() {
  getAssistantButtons().forEach((button) => {
    if (!isAssistantTabButton(button)) return;
    if (clean(button.textContent) === BUY_CHECK_LABEL) return;

    button.textContent = BUY_CHECK_LABEL;
    button.dataset.claraBuyCheckTab = "true";
    button.setAttribute("aria-label", "Open CLARA Buy Check");
    button.setAttribute("title", "Buy Check");
  });
}

function submitBuyCheckFallback() {
  const shell = getAssistantShell();
  const input = shell?.querySelector("input, textarea");
  const form = input?.closest("form");
  const submitButton = form?.querySelector('button[type="submit"], button[aria-label*="Send"]');
  if (!input || !form) return;

  const nextValue = "Start Buy Check. Ask me what item I want to buy and how much it costs.";
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));

  window.setTimeout(() => {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else submitButton?.click?.();
  }, 30);
}

function clickSmartActionsPanel(button) {
  if (!button) return false;

  button.dataset.claraProgrammaticOpenSmart = "true";
  button.click();
  window.setTimeout(() => {
    delete button.dataset.claraProgrammaticOpenSmart;
  }, 180);
  return true;
}

function openBuyCheckMode() {
  const smartActionsButton = findButtonByAnyLabel(SMART_ACTIONS_LABELS);
  if (!smartActionsButton) {
    submitBuyCheckFallback();
    return;
  }

  clickSmartActionsPanel(smartActionsButton);

  window.setTimeout(() => {
    const affordButton = findBuyCheckActionButton();
    if (affordButton) affordButton.click();
    else submitBuyCheckFallback();
  }, 90);
}

function installBuyCheckClickCapture() {
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;

    const isBuyCheckTab = button.dataset?.claraBuyCheckTab === "true" || clean(button.textContent) === BUY_CHECK_LABEL;
    if (!isBuyCheckTab || !getAssistantShell()?.contains(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openBuyCheckMode();
  }, true);
}

function installBuyCheckObserver() {
  const observer = new MutationObserver(() => relabelBuyCheckTab());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  relabelBuyCheckTab();
}

function installClaraAssistantBuyCheckTab() {
  if (typeof window === "undefined" || window.__CLARA_ASSISTANT_BUY_CHECK_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_BUY_CHECK_TAB_INSTALLED__ = true;
  installBuyCheckClickCapture();
  installBuyCheckObserver();
}

installClaraAssistantBuyCheckTab();
