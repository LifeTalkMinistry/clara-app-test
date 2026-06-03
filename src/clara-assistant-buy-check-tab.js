const BUY_CHECK_LABEL = "Buy Check";
const SMART_ACTIONS_LABELS = ["Smart Actions", "Analytic"];
const CORE_PANEL_LABELS = ["Core Features", "Forecast"];

const BUY_CHECK_CONTROLLED_PROMPT = `what are you thinking of buying

Start CLARA Buy Check controlled flow.

Do not show this as a user request. CLARA should initiate the conversation from the assistant side.

Reply only with this opening style:
Hi, Max! What item are you planning to buy?

Then continue Buy Check as a controlled guided flow:
1. Ask for item if missing.
2. Ask for amount if missing.
3. Ask if it was planned or unplanned.
4. Ask wallet/category only if needed.
5. Give a clear decision: Buy, Buy with cap, Reduce, Wait, or Pause.

Boundaries:
- Stay inside Buy Check mode.
- Do not answer unrelated general chat questions here.
- Ask only one missing question at a time.
- Use wallet, budget, recent spending, savings/emergency protection, and spending memory when available.
- Keep every reply short, practical, and decision-focused.`;

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

function setInputValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function submitPromptInsideMainChat(prompt = BUY_CHECK_CONTROLLED_PROMPT) {
  const shell = getAssistantShell();
  const input = shell?.querySelector("input, textarea");
  const form = input?.closest("form");
  const submitButton = form?.querySelector('button[type="submit"], button[aria-label*="Send"]');

  if (!input || !form) return false;

  setInputValue(input, prompt);

  window.setTimeout(() => {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else submitButton?.click?.();
  }, 30);

  return true;
}

function openBuyCheckMode() {
  submitPromptInsideMainChat();
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
