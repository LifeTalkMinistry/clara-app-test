import { CLARA_OPEN_BUY_CHECK_EVENT } from "@/lib/clara-pause-events";

const INSTALL_FLAG = "__CLARA_BUY_CHECK_AUTO_START_BRIDGE_INSTALLED__";
const STYLE_ID = "clara-buy-check-auto-start-style";
const SHELL_SELECTOR = '[data-clara-pause-overlay="true"]';
const START_SELECTOR = '[data-clara-start-buy-check="true"]';
const STATIC_CHAT_SELECTOR = '[data-clara-buy-check-static-chat="true"]';
const RETAINED_BOARD_SELECTOR = '[data-clara-buy-check-intro-retained="true"]';

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getShell() {
  return document.querySelector(SHELL_SELECTOR);
}

function getMain() {
  return getShell()?.querySelector("main") || null;
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-buy-check-active-question {
      margin: 18px auto 0;
      max-width: 292px;
      border: 1px solid rgba(110,231,183,.16);
      border-radius: 18px;
      background: rgba(15,23,42,.28);
      padding: 13px 14px;
      text-align: left;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
    }

    .clara-buy-check-active-question strong {
      display: block;
      color: rgba(255,255,255,.94);
      font: 900 13px/1.45 system-ui, sans-serif;
    }

    .clara-buy-check-active-question span {
      display: block;
      margin-top: 5px;
      color: rgba(203,213,225,.72);
      font: 650 11.5px/1.5 system-ui, sans-serif;
    }

    .clara-buy-check-active-question em {
      color: rgba(110,231,183,.92);
      font-style: normal;
      font-weight: 850;
    }

    ${RETAINED_BOARD_SELECTOR} {
      flex: 0 0 auto;
      margin-bottom: 12px;
    }
  `;

  document.head.appendChild(style);
}

function buildRetainedBoard(board) {
  const retainedBoard = board.cloneNode(true);

  retainedBoard.removeAttribute("data-clara-pause-entry-board");
  retainedBoard.removeAttribute("data-clara-buy-check-board");
  retainedBoard.dataset.claraBuyCheckIntroRetained = "true";

  retainedBoard
    .querySelectorAll(
      `${START_SELECTOR}, .clara-buy-check-board-start, [data-clara-buy-check-close-board], button[aria-label="Close CLARA AI mode"]`
    )
    .forEach((node) => node.remove());

  const activeQuestion = document.createElement("div");
  activeQuestion.className = "clara-buy-check-active-question";
  activeQuestion.dataset.claraBuyCheckActiveQuestion = "true";
  activeQuestion.setAttribute("aria-live", "polite");
  activeQuestion.innerHTML = `
    <strong>Hi, Max! What do you want to buy?</strong>
    <span>Type the exact item first. <em>Example: Running shoes</em></span>
  `;

  retainedBoard.appendChild(activeQuestion);
  return retainedBoard;
}

function hideDuplicateOpeningQuestion(chat) {
  const firstClaraRow = Array.from(
    chat.querySelectorAll(".clara-buy-check-static-bubble-row.clara")
  ).find((row) =>
    clean(row.textContent).startsWith("Hi, Max! What do you want to buy?")
  );

  firstClaraRow?.remove();
}

function prepareInput() {
  const input = getShell()?.querySelector("input, textarea");
  if (!input) return;

  input.setAttribute("placeholder", "Type the item you want to buy");
  window.setTimeout(() => input.focus?.(), 80);
}

function attachRetainedBoard(retainedBoard, attempt = 0) {
  const main = getMain();
  const chat = main?.querySelector(STATIC_CHAT_SELECTOR);

  if (!chat) {
    if (attempt < 10) {
      window.requestAnimationFrame(() =>
        attachRetainedBoard(retainedBoard, attempt + 1)
      );
    }
    return;
  }

  if (!chat.querySelector(RETAINED_BOARD_SELECTOR)) {
    chat.prepend(retainedBoard);
  }

  hideDuplicateOpeningQuestion(chat);
  prepareInput();
}

function autoStartBoard(board) {
  if (!board || board.dataset.claraBuyCheckAutoStarted === "true") return;

  const startButton = board.querySelector(START_SELECTOR);
  if (!startButton) return;

  board.dataset.claraBuyCheckAutoStarted = "true";
  const retainedBoard = buildRetainedBoard(board);

  startButton.click();
  window.requestAnimationFrame(() => attachRetainedBoard(retainedBoard));
}

function scanForStartBoard() {
  const shell = getShell();
  if (!shell) return;

  const startButton = shell.querySelector(START_SELECTOR);
  const board = startButton?.closest?.(
    '[data-clara-buy-check-board="true"], [data-clara-pause-entry-board="true"], section'
  );

  autoStartBoard(board);
}

function scheduleScan() {
  window.requestAnimationFrame(scanForStartBoard);
}

function installBuyCheckAutoStartBridge() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALL_FLAG]) return;

  window[INSTALL_FLAG] = true;
  ensureStyles();

  window.addEventListener(CLARA_OPEN_BUY_CHECK_EVENT, scheduleScan);

  const observer = new MutationObserver(scheduleScan);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  scanForStartBoard();
}

installBuyCheckAutoStartBridge();
