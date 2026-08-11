const TOP_EXPLANATION =
  "Add each expense or responsibility one at a time. CLARA will calculate your real budget total as you go.";
const TOTAL_EXPLANATION =
  "This total grows from the items you add. There is no preset ceiling.";
const EMPTY_STATE_EXPLANATIONS = new Set([
  "You can continue without a regular item if this budget will contain only protected money or a confirmed obligation.",
  "You can continue without a regular item if this budget will contain only protected money or a saved obligation.",
]);
const REVIEW_INTRO_TITLE = "Your budget is taking shape";
const STEP4_INFO_TITLE = "How long should this budget cover?";
const STEP4_INFO_BODY =
  "The timeframe gives meaning to the total you built. It will not change or prorate your amounts automatically.";
const HIDDEN_MARKER = "data-clara-budget-copy-hidden";
const PROGRESS_HIDDEN_MARKER = "data-clara-budget-progress-hidden";
const STEP4_INFO_MARKER = "data-clara-budget-step4-info";
const STEP_NAMES = ["Budget Items", "Commitments", "Review", "Timeframe", "Activate"];
const MANUAL_EXPENSE_CLEANUP_STYLE_ID = "clara-manual-expense-copy-cleanup";

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
const shouldHideCopy = (text) =>
  text === TOP_EXPLANATION || text === TOTAL_EXPLANATION || EMPTY_STATE_EXPLANATIONS.has(text);

function installManualExpenseCleanupStyles() {
  if (typeof document === "undefined" || document.getElementById(MANUAL_EXPENSE_CLEANUP_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = MANUAL_EXPENSE_CLEANUP_STYLE_ID;
  style.textContent = `
    .clara-manual-expense-sheet section[data-expense-step="amount"] > p:first-child,
    .clara-manual-expense-sheet section[data-expense-step="amount"] > h3 + p,
    .clara-manual-expense-sheet section[data-expense-step="budget"] > p:first-child,
    .clara-manual-expense-sheet section[data-expense-step="budget"] > h3 + p,
    .clara-manual-expense-sheet section[data-expense-step="wallet"] > p:first-child,
    .clara-manual-expense-sheet section[data-expense-step="wallet"] > h3 + p {
      display: none !important;
    }

    .clara-manual-expense-sheet section[data-expense-step="amount"] > h3,
    .clara-manual-expense-sheet section[data-expense-step="budget"] > h3,
    .clara-manual-expense-sheet section[data-expense-step="wallet"] > h3 {
      margin-top: 0 !important;
    }

    .clara-manual-expense-sheet div:has(+ div > section[data-expense-step="wallet"]) {
      display: none !important;
    }

    /* React info controls: keep the explanation inside the card flow instead of floating over fields. */
    #root [class*="circle_at_top_left"] :is(
      .flex.items-start.justify-between.gap-3,
      .flex.items-center.justify-between.gap-3
    ):has(> div.relative > button[aria-label^="About "]) {
      position: relative !important;
      z-index: 70;
    }

    #root [class*="circle_at_top_left"] div.relative:has(> button[aria-label^="About "]) {
      position: static !important;
      z-index: 80 !important;
    }

    #root [class*="circle_at_top_left"] div:has(
      > :is(.flex.items-start.justify-between.gap-3, .flex.items-center.justify-between.gap-3)
        > div.relative
        > button[aria-label^="About "][aria-expanded="true"]
    ) {
      padding-bottom: 6.25rem !important;
    }

    #root [class*="circle_at_top_left"] button[aria-label^="About "] + div {
      position: absolute !important;
      top: calc(100% + 0.65rem) !important;
      right: 0 !important;
      left: 0 !important;
      z-index: 120 !important;
      width: auto !important;
      max-width: none !important;
      min-height: 0 !important;
      padding: 0.85rem 1rem !important;
      border: 1px solid #315f8a !important;
      border-radius: 0.9rem !important;
      background-color: #071a31 !important;
      background-image: linear-gradient(180deg, #0c2949 0%, #071a31 100%) !important;
      color: #f4f9ff !important;
      opacity: 1 !important;
      overflow: visible !important;
      white-space: normal !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 16px 34px rgba(0,0,0,0.44) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      isolation: isolate;
    }

    .clara-budget-step4-info-row {
      position: relative;
      z-index: 80;
      display: flex;
      width: 100%;
      justify-content: flex-end;
      margin-bottom: 0.75rem;
    }

    .clara-budget-step-info-button {
      display: inline-flex;
      width: 2rem;
      height: 2rem;
      flex: 0 0 2rem;
      align-items: center;
      justify-content: center;
      border: 1px solid #3f78ad !important;
      border-radius: 9999px !important;
      background-color: #0b315b !important;
      background-image: linear-gradient(145deg, #154d86 0%, #0a2b52 100%) !important;
      color: #eef7ff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px rgba(0,0,0,0.30) !important;
      cursor: pointer;
    }

    .clara-budget-step-info-button[aria-expanded="true"] {
      border-color: #75b7f0 !important;
      background-color: #174b86 !important;
      background-image: linear-gradient(145deg, #1d5d9f 0%, #0d3768 100%) !important;
    }

    .clara-budget-step-info-popover {
      position: static;
      width: 100%;
      margin-top: 0.7rem;
      padding: 0.9rem 1rem;
      border: 1px solid #2f628f !important;
      border-radius: 1rem !important;
      background-color: #071a31 !important;
      background-image: linear-gradient(180deg, #0b2746 0%, #071a31 100%) !important;
      color: #f4f9ff !important;
      opacity: 1 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 30px rgba(0,0,0,0.42) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      isolation: isolate;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: start;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) .clara-budget-step-info-popover {
      grid-column: 1 / -1;
      grid-row: 2;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) .clara-budget-step-info-button {
      grid-column: 2;
      grid-row: 1;
      justify-self: end;
    }

    .clara-budget-step-info-popover[hidden] {
      display: none !important;
    }

    .clara-budget-step-info-popover strong {
      display: block;
      margin-bottom: 0.35rem;
      color: #ffffff;
      font-size: 0.82rem;
      line-height: 1.25rem;
    }

    .clara-budget-step-info-popover p {
      margin: 0;
      color: rgba(239,246,255,0.78);
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.15rem;
    }
  `;
  document.head.appendChild(style);
}

function isReviewIntroBlock(element) {
  if (!element) return false;
  const text = normalizeText(element.textContent);
  return text.includes(REVIEW_INTRO_TITLE) && text.includes("Step 3");
}

function isRedundantProgressCard(element) {
  if (!element || element.tagName !== "SECTION") return false;

  const text = normalizeText(element.textContent);
  if (!text) return false;

  return STEP_NAMES.some((name, index) => {
    const step = index + 1;
    const percent = step * 20;
    return text === `Step ${step} of 5 ${name} ${percent}%`;
  });
}

function restoreReusedElements(root) {
  if (!root) return;

  root.querySelectorAll(`[${HIDDEN_MARKER}="true"]`).forEach((element) => {
    const text = normalizeText(element.textContent);
    if (shouldHideCopy(text) || isReviewIntroBlock(element)) return;

    element.hidden = false;
    element.style.removeProperty("display");
    element.removeAttribute(HIDDEN_MARKER);
  });

  root.querySelectorAll(`[${PROGRESS_HIDDEN_MARKER}="true"]`).forEach((element) => {
    if (isRedundantProgressCard(element)) return;

    element.hidden = false;
    element.style.removeProperty("display");
    element.removeAttribute(PROGRESS_HIDDEN_MARKER);
  });
}

function hideRedundantProgressCard(root) {
  if (!root) return;

  root.querySelectorAll("section").forEach((section) => {
    if (!isRedundantProgressCard(section)) return;

    section.setAttribute(PROGRESS_HIDDEN_MARKER, "true");
    section.hidden = true;
    section.style.display = "none";
  });
}

function createInfoIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "10");

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", "M12 16v-4");

  const dot = document.createElementNS("http://www.w3.org/2000/svg", "path");
  dot.setAttribute("d", "M12 8h.01");

  svg.append(circle, line, dot);
  return svg;
}

function installStep4Info(root) {
  if (!root) return;

  root.querySelectorAll("div.flex.items-start.gap-3").forEach((header) => {
    const text = normalizeText(header.textContent);
    if (!text.includes(STEP4_INFO_TITLE) || !text.includes(STEP4_INFO_BODY)) return;

    const section = header.closest("section");
    if (!section || section.querySelector(`[${STEP4_INFO_MARKER}="true"]`)) return;

    const row = document.createElement("div");
    row.className = "clara-budget-step4-info-row";
    row.setAttribute(STEP4_INFO_MARKER, "true");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "clara-budget-step-info-button";
    button.setAttribute("aria-label", "About timeframe");
    button.setAttribute("aria-expanded", "false");
    button.appendChild(createInfoIcon());

    const popover = document.createElement("div");
    popover.className = "clara-budget-step-info-popover";
    popover.hidden = true;

    const title = document.createElement("strong");
    title.textContent = STEP4_INFO_TITLE;

    const body = document.createElement("p");
    body.textContent = STEP4_INFO_BODY;

    popover.append(title, body);

    button.addEventListener("click", () => {
      const opening = popover.hidden;
      popover.hidden = !opening;
      button.setAttribute("aria-expanded", opening ? "true" : "false");
    });

    row.append(button, popover);
    header.replaceWith(row);
  });
}

function hideMatchingCopy(root) {
  if (!root) return;

  restoreReusedElements(root);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const elementsToHide = new Set();
  let node = walker.nextNode();

  while (node) {
    const text = normalizeText(node.nodeValue);

    if (text === TOP_EXPLANATION || text === TOTAL_EXPLANATION) {
      const paragraph = node.parentElement?.closest("p");
      if (paragraph) elementsToHide.add(paragraph);
    }

    if (EMPTY_STATE_EXPLANATIONS.has(text)) {
      const explanationCard = node.parentElement?.closest("div");
      if (explanationCard) elementsToHide.add(explanationCard);
    }

    if (text === REVIEW_INTRO_TITLE) {
      const reviewIntro = node.parentElement?.closest("div.flex.items-start.gap-3");
      if (reviewIntro) elementsToHide.add(reviewIntro);
    }

    node = walker.nextNode();
  }

  elementsToHide.forEach((element) => {
    element.setAttribute(HIDDEN_MARKER, "true");
    element.hidden = true;
    element.style.display = "none";
  });

  hideRedundantProgressCard(root);
  installStep4Info(root);
}

export function installBudgetSetupCopyCleanup() {
  if (typeof window === "undefined" || window.__claraBudgetSetupCopyCleanupInstalled) return;
  window.__claraBudgetSetupCopyCleanupInstalled = true;

  installManualExpenseCleanupStyles();

  const start = () => {
    const root = document.getElementById("root");
    if (!root) return;

    hideMatchingCopy(root);

    const observer = new MutationObserver(() => hideMatchingCopy(root));
    observer.observe(root, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-expanded", "hidden"] });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
