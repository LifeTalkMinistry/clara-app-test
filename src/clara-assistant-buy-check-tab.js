const BUY_CHECK_LABEL = "Buy Check";
const SMART_ACTIONS_LABELS = ["Smart Actions", "Analytic"];
const CORE_PANEL_LABELS = ["Core Features", "Forecast"];
const BUY_CHECK_STYLE_ID = "clara-buy-check-board-style";

const BUY_CHECK_CONTROLLED_PROMPT = `what are you thinking of buying

Start CLARA Buy Check controlled diagnosis flow.

Do not show this as a user request. CLARA should initiate the conversation from the assistant side.

Reply only with this opening style:
Hi, Max! What do you want to buy?

Type the exact item first. Example: Running shoes

Then continue as a controlled diagnosis flow:
1. If the user gives the item, ask: How much does it cost?
2. If the user gives the amount, ask: Was this planned or unplanned?
3. If the user says planned or unplanned, ask one optional follow-up only if needed.
4. Do not ask wallet/category unless CLARA cannot infer it.
5. Then give a clear decision: Buy, Buy with cap, Reduce, Wait, or Pause.

Decision context to use when available:
- wallet and spendable money
- budget room
- current month spending
- similar recent purchases
- emergency fund and savings protection
- spending memory/triggers

Boundaries:
- Stay inside Buy Check mode.
- Do not answer unrelated general chat questions here.
- Ask only one missing question at a time.
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

function ensureBuyCheckBoardStyle() {
  if (document.getElementById(BUY_CHECK_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = BUY_CHECK_STYLE_ID;
  style.textContent = `
    .clara-buy-check-board-close {
      position: absolute;
      right: 12px;
      top: 12px;
      display: grid;
      width: 32px;
      height: 32px;
      place-items: center;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.14);
      background: rgba(255,255,255,.075);
      color: rgba(255,255,255,.78);
      font: 800 18px/1 system-ui, sans-serif;
    }

    .clara-buy-check-board-steps {
      margin: 14px auto 0;
      display: grid;
      max-width: 295px;
      gap: 8px;
      text-align: left;
    }

    .clara-buy-check-board-steps span {
      display: flex;
      gap: 9px;
      align-items: flex-start;
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 16px;
      background: rgba(255,255,255,.045);
      padding: 9px 10px;
      color: rgba(226,232,240,.78);
      font: 750 12px/1.35 system-ui, sans-serif;
    }

    .clara-buy-check-board-steps b {
      color: rgba(110,231,183,.95);
      font-weight: 950;
    }

    .clara-buy-check-board-start {
      margin: 17px auto 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 999px;
      background: linear-gradient(135deg, rgba(110,231,183,.98), rgba(34,211,238,.84));
      color: rgba(2,6,23,.96);
      padding: 12px 18px;
      font: 950 13px/1 system-ui, sans-serif;
      box-shadow: 0 0 28px rgba(45,212,191,.18);
    }

    .clara-buy-check-board-note {
      margin: 12px auto 0;
      max-width: 285px;
      color: rgba(203,213,225,.58);
      font: 750 11.5px/1.5 system-ui, sans-serif;
    }
  `;
  document.head.appendChild(style);
}

function findInstructionBoard() {
  const shell = getAssistantShell();
  if (!shell) return null;

  const closeButton = shell.querySelector('button[aria-label="Close CLARA AI mode"]');
  const board = closeButton?.closest?.(".relative");
  if (board) return board;

  return Array.from(shell.querySelectorAll("div")).find((node) => {
    const text = clean(node.textContent);
    return (
      text.includes("Need help thinking through a decision") ||
      text.includes("Hi, any spending concern today") ||
      text.includes("What money situation are we figuring out") ||
      text.includes("Tell CLARA what")
    );
  }) || null;
}

function closeAssistantOverlay() {
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

function renderBuyCheckBoard() {
  ensureBuyCheckBoardStyle();

  const board = findInstructionBoard();
  if (!board) {
    submitPromptInsideMainChat();
    return;
  }

  board.innerHTML = `
    <button type="button" class="clara-buy-check-board-close" data-clara-buy-check-close-board="true" aria-label="Close CLARA AI mode">×</button>
    <p class="text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100/55">BUY CHECK</p>
    <h3 class="mt-3 text-2xl font-black leading-tight tracking-tight text-white">Before CLARA checks this purchase...</h3>
    <div class="mx-auto mt-3 max-w-[300px] space-y-2 text-sm leading-6 text-slate-300/75">
      <p>Give the details clearly so CLARA can judge it properly.</p>
      <p>CLARA will ask a few short questions, then give you a decision.</p>
    </div>
    <div class="clara-buy-check-board-steps">
      <span><b>1</b> What do you want to buy?</span>
      <span><b>2</b> How much does it cost?</span>
      <span><b>3</b> Was it planned or unplanned?</span>
    </div>
    <p class="clara-buy-check-board-note">After that, CLARA checks your wallet, budget, spending pattern, goals, and memory before saying Buy, Wait, Reduce, or Pause.</p>
    <button type="button" class="clara-buy-check-board-start" data-clara-start-buy-check="true">Start Buy Check</button>
  `;

  board.setAttribute("data-clara-buy-check-board", "true");
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
  renderBuyCheckBoard();
}

function installBuyCheckClickCapture() {
  document.addEventListener("click", (event) => {
    const closeBoard = event.target?.closest?.("[data-clara-buy-check-close-board]");
    if (closeBoard) {
      event.preventDefault();
      event.stopPropagation();
      closeAssistantOverlay();
      return;
    }

    const startButton = event.target?.closest?.("[data-clara-start-buy-check]");
    if (startButton) {
      event.preventDefault();
      event.stopPropagation();
      submitPromptInsideMainChat();
      return;
    }

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
