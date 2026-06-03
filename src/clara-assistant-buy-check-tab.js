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

Controlled static questions:
1. Ask: What do you want to buy?
2. After the item is answered, ask: How much does it cost?
3. After the price is answered, ask: Why do you want to buy it?

After those 3 answers are collected:
- Stop asking default questions.
- Create a short static summary of the user answers: item, price, reason.
- Internally decide which context is useful to inspect for this purchase.
- Always consider the full memory context by default.
- Include Me page / life profile context by default if available.
- Include schedule/calendar context when it can affect timing, bills, payday, work, events, or spending pressure.

Context router inventory CLARA can use:
- wallets and spendable balance
- budgets and category room
- expenses / recent transactions
- similar purchases
- savings goals
- emergency fund
- obligations, bills, subscriptions, debt, income/payday cycle when available
- schedule / calendar context
- Me page / life profile context
- full memory context

Decision rule:
- If the purchase has budget room or supports a saved goal, it may be planned/aligned.
- If it is outside budget, outside goals, emotionally driven, or risky based on memory/context, treat it as unplanned/risky.
- Do not directly ask the user if it is planned or unplanned.

Final response format:
Decision: Buy / Buy with cap / Reduce / Wait / Pause
Risk: Low / Medium / High
Why: 2-3 short reasons
Safer move: 1 clear action

Boundaries:
- Stay inside Buy Check mode.
- Do not answer unrelated general chat questions here.
- Ask only one static question at a time before the diagnosis.
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
      margin: 16px auto 0;
      display: grid;
      max-width: 250px;
      gap: 9px;
      text-align: left;
    }

    .clara-buy-check-board-steps span {
      display: flex;
      gap: 10px;
      align-items: center;
      color: rgba(226,232,240,.82);
      font: 800 12.5px/1.35 system-ui, sans-serif;
    }

    .clara-buy-check-board-steps b {
      display: grid;
      width: 22px;
      height: 22px;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 999px;
      border: 1px solid rgba(110,231,183,.20);
      background: rgba(110,231,183,.10);
      color: rgba(110,231,183,.96);
      font: 950 11px/1 system-ui, sans-serif;
    }

    .clara-buy-check-board-start {
      margin: 18px auto 0;
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
      margin: 15px auto 0;
      max-width: 286px;
      color: rgba(203,213,225,.62);
      font: 750 12px/1.55 system-ui, sans-serif;
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

function hidePanelTabsForBuyCheckBoard(board) {
  const shell = getAssistantShell();
  if (!shell || !board) return;

  const tabRow = Array.from(shell.querySelectorAll("div")).find((node) => {
    if (node.contains(board)) return false;

    const text = clean(node.textContent);
    return (
      text.includes(BUY_CHECK_LABEL) &&
      text.includes("Forecast") &&
      text.includes("Analytic") &&
      node.querySelectorAll("button").length >= 3
    );
  });

  if (!tabRow) return;

  const noisyShell = tabRow.parentElement?.querySelectorAll("button").length === 3
    ? tabRow.parentElement
    : tabRow;

  noisyShell.style.display = "none";
  noisyShell.setAttribute("data-clara-hidden-during-buy-check", "true");
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
    <h3 class="mt-3 text-xl font-black leading-tight tracking-tight text-white">Let’s check this purchase first.</h3>
    <div class="mx-auto mt-3 max-w-[292px] text-sm leading-6 text-slate-300/75">
      <p>Answer clearly so CLARA can judge the decision properly.</p>
    </div>
    <div class="clara-buy-check-board-steps">
      <span><b>1</b> Item you want to buy</span>
      <span><b>2</b> Amount or price</span>
      <span><b>3</b> Why you want it</span>
    </div>
    <p class="clara-buy-check-board-note">Then CLARA checks wallet, budget, schedule, Me profile, goals, and memory before giving a decision.</p>
    <button type="button" class="clara-buy-check-board-start" data-clara-start-buy-check="true">Start Buy Check</button>
  `;

  board.setAttribute("data-clara-buy-check-board", "true");
  hidePanelTabsForBuyCheckBoard(board);
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
