const TOP_EXPLANATION =
  "Add each expense or responsibility one at a time. CLARA will calculate your real budget total as you go.";
const TOTAL_EXPLANATION =
  "This total grows from the items you add. There is no preset ceiling.";
const EMPTY_STATE_PREFIX = "You can continue without a regular item";
const REVIEW_INTRO_TITLE = "Your budget is taking shape";
const STEP4_INFO_TITLE = "How long should this budget cover?";
const STEP4_INFO_BODY =
  "The timeframe gives meaning to the total you built. It will not change or prorate your amounts automatically.";
const STEP4_RELATIONSHIP_LABEL = "Relationship to your total";
const STEP4_RELATIONSHIP_BODY =
  "The same amount can mean something very different over seven days versus a full month. CLARA records both together.";

const HIDDEN_MARKER = "data-clara-budget-copy-hidden";
const PROGRESS_HIDDEN_MARKER = "data-clara-budget-progress-hidden";
const STEP4_INFO_MARKER = "data-clara-budget-step4-info";
const STEP4_RELATIONSHIP_MARKER = "data-clara-budget-step4-relationship-info";
const STEP5_SCREEN_MARKER = "data-clara-budget-final-owned";
const STEP5_HERO_MARKER = "data-clara-budget-final-hero-owned";
const STEP5_HIDE_MARKER = "data-clara-budget-final-summary-hidden";
const STEP5_MESSAGE_INDEX = "data-clara-budget-message-index";
const STEP5_ORIGINAL_CYCLE = "data-clara-budget-original-cycle";
const STEP5_ORIGINAL_DATES = "data-clara-budget-original-dates";
const LAST_MESSAGE_STORAGE_KEY = "clara_last_budget_motivation_index";

const STEP_NAMES = ["Budget Items", "Commitments", "Review", "Timeframe", "Activate"];
const STYLE_ID = "clara-budget-setup-cleanup-style";

const MOTIVATION_MESSAGES = [
  "You gave your money a direction before it had the chance to disappear.",
  "A budget is not a limit. It is a decision made ahead of time.",
  "You just made your next payday easier to handle.",
  "Every peso now has a clearer purpose.",
  "Planning your money today gives you more choices tomorrow.",
  "You are not guessing anymore. Your money has a plan.",
  "This is what financial control looks like: deciding before spending.",
  "A few minutes of planning can protect an entire month of income.",
  "You just turned your income into a plan instead of a question mark.",
  "The goal is not to spend nothing. The goal is to spend on purpose.",
  "You made space for what matters before the month gets busy.",
  "Budgeting is one small decision that can prevent many stressful ones later.",
  "You are building the habit of telling your money where to go.",
  "Your budget does not need to be perfect. It needs to give you direction.",
  "You just made your money easier to understand and harder to lose track of.",
  "A clear plan today can mean fewer money surprises later.",
  "This budget is a promise to be intentional with what you earn.",
  "You took control before expenses could take control for you.",
  "Your money now has priorities, not just destinations.",
  "You are creating breathing room one planned peso at a time.",
  "The strongest budget is the one you can actually follow. You have a starting point.",
  "You just replaced uncertainty with a plan you can see.",
  "Small planning habits become strong financial habits over time.",
  "This is more than a total. It is a plan for the life your income needs to support.",
  "You gave yourself a clearer answer to the question: where should my money go?",
  "Money feels lighter when the important decisions are already made.",
  "Your next spending decision now has something solid to compare against.",
  "You are practicing control before temptation, pressure, or impulse shows up.",
  "A budget gives every priority a place before everything starts competing for your money.",
  "You finished the plan. Now your job is simple: follow the direction you already chose.",
];

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();
const isEmptyStateCopy = (text) => normalizeText(text).startsWith(EMPTY_STATE_PREFIX);
const shouldHideCopy = (text) =>
  text === TOP_EXPLANATION || text === TOTAL_EXPLANATION || isEmptyStateCopy(text);

function installStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
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

    /* Existing React info hints: solid, inline, and never floating over fields. */
    #root [class*="circle_at_top_left"] :is(
      .flex.items-start.justify-between.gap-3,
      .flex.items-center.justify-between.gap-3
    ):has(> div.relative > button[aria-label^="About "]) {
      position: relative !important;
      z-index: 70 !important;
      flex-wrap: wrap !important;
      overflow: visible !important;
    }

    #root [class*="circle_at_top_left"] div.relative:has(> button[aria-label^="About "]) {
      display: contents !important;
    }

    #root [class*="circle_at_top_left"] button[aria-label^="About "] {
      position: relative !important;
      z-index: 90 !important;
      flex: 0 0 2rem !important;
    }

    #root [class*="circle_at_top_left"] button[aria-label^="About "] + div {
      position: static !important;
      inset: auto !important;
      order: 50 !important;
      flex: 0 0 100% !important;
      width: 100% !important;
      max-width: none !important;
      margin-top: 0.4rem !important;
      padding: 0.82rem 0.95rem !important;
      border: 1px solid #315f8a !important;
      border-radius: 0.9rem !important;
      background: linear-gradient(180deg, #0c2949 0%, #071a31 100%) !important;
      color: #f4f9ff !important;
      opacity: 1 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 26px rgba(0,0,0,0.34) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .clara-budget-step4-info-row {
      position: relative;
      z-index: 80;
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem;
      margin-bottom: 0.8rem;
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
      background: linear-gradient(145deg, #154d86 0%, #0a2b52 100%) !important;
      color: #eef7ff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px rgba(0,0,0,0.30) !important;
      cursor: pointer;
    }

    .clara-budget-step-info-button[aria-expanded="true"] {
      border-color: #75b7f0 !important;
      background: linear-gradient(145deg, #1d5d9f 0%, #0d3768 100%) !important;
    }

    .clara-budget-step-info-popover {
      position: static !important;
      width: 100% !important;
      margin-top: 0.7rem !important;
      padding: 0.9rem 1rem !important;
      border: 1px solid #2f628f !important;
      border-radius: 1rem !important;
      background: linear-gradient(180deg, #0b2746 0%, #071a31 100%) !important;
      color: #f4f9ff !important;
      opacity: 1 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 30px rgba(0,0,0,0.42) !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) {
      display: grid !important;
      grid-template-columns: 1fr auto !important;
      align-items: start !important;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) .clara-budget-step-info-popover {
      grid-column: 1 / -1 !important;
      grid-row: 2 !important;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) .clara-budget-step-info-button {
      grid-column: 2 !important;
      grid-row: 1 !important;
      justify-self: end !important;
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

    .clara-budget-relationship-info-head {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 0.75rem !important;
    }

    .clara-budget-relationship-info-head > p {
      min-width: 0 !important;
      margin: 0 !important;
    }

    #root [${HIDDEN_MARKER}="true"],
    #root [${PROGRESS_HIDDEN_MARKER}="true"],
    #root [${STEP5_HIDE_MARKER}="true"] {
      display: none !important;
    }

    /* Final activate screen: the motivation + consolidated summary is the hero. */
    #root [${STEP5_SCREEN_MARKER}="true"] > div:first-child {
      display: block !important;
      padding: 1rem !important;
      border-bottom-color: rgba(96,165,250,0.22) !important;
      background:
        radial-gradient(circle at 92% 0%, rgba(247,201,72,0.10), transparent 34%),
        linear-gradient(145deg, #0d3d7b 0%, #0a2b5b 56%, #09264f 100%) !important;
    }

    #root [${STEP5_HERO_MARKER}="true"] {
      display: flex !important;
      align-items: flex-start !important;
      width: 100% !important;
      gap: 0 !important;
    }

    #root [${STEP5_HERO_MARKER}="true"] > div:first-child {
      display: none !important;
    }

    #root [${STEP5_HERO_MARKER}="true"] > div:last-child {
      display: block !important;
      width: 100% !important;
      min-width: 0 !important;
      flex: 1 1 100% !important;
    }

    #root [${STEP5_HERO_MARKER}="true"] > div:last-child > p:first-child {
      display: block !important;
      margin: 0 !important;
      color: #f7c948 !important;
      font-size: 0.61rem !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      letter-spacing: 0.17em !important;
      text-transform: uppercase !important;
    }

    #root [${STEP5_HERO_MARKER}="true"] h2 {
      display: block !important;
      margin: 0.62rem 0 0 !important;
      max-width: 20rem !important;
      color: #ffffff !important;
      font-size: 1.12rem !important;
      font-weight: 900 !important;
      line-height: 1.34 !important;
      letter-spacing: -0.028em !important;
      text-wrap: balance;
    }

    #root [${STEP5_HERO_MARKER}="true"] h2 + p {
      display: block !important;
      margin: 0.95rem 0 0 !important;
      max-width: 100% !important;
      padding-top: 0.85rem !important;
      border-top: 1px solid rgba(191,219,254,0.16) !important;
      color: rgba(239,246,255,0.74) !important;
      font-size: 0.72rem !important;
      font-weight: 700 !important;
      line-height: 1.62 !important;
      letter-spacing: 0 !important;
      white-space: pre-line !important;
    }

    #root [${STEP5_HERO_MARKER}="true"] h2 + p::first-line {
      color: #f7c948 !important;
      font-size: 0.96rem !important;
      font-weight: 900 !important;
    }

    #root [${STEP5_SCREEN_MARKER}="true"] > div.p-4 > div.mt-4.grid.grid-cols-3 {
      margin-top: 0 !important;
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
    return text === `Step ${step} of 5 ${name} ${step * 20}%`;
  });
}

function restoreReusedElements(root) {
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
  root.querySelectorAll("section").forEach((section) => {
    if (!isRedundantProgressCard(section)) return;
    section.setAttribute(PROGRESS_HIDDEN_MARKER, "true");
    section.hidden = true;
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

function createInfoButton(label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "clara-budget-step-info-button";
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-expanded", "false");
  button.appendChild(createInfoIcon());
  return button;
}

function createInfoPopover(titleText, bodyText) {
  const popover = document.createElement("div");
  popover.className = "clara-budget-step-info-popover";
  popover.hidden = true;

  const title = document.createElement("strong");
  title.textContent = titleText;
  const body = document.createElement("p");
  body.textContent = bodyText;
  popover.append(title, body);
  return popover;
}

function wireInfoToggle(button, popover) {
  button.addEventListener("click", () => {
    const opening = popover.hidden;
    popover.hidden = !opening;
    button.setAttribute("aria-expanded", opening ? "true" : "false");
  });
}

function installStep4Info(root) {
  root.querySelectorAll("div.flex.items-start.gap-3").forEach((header) => {
    const text = normalizeText(header.textContent);
    if (!text.includes(STEP4_INFO_TITLE) || !text.includes(STEP4_INFO_BODY)) return;

    const section = header.closest("section");
    if (!section || section.querySelector(`[${STEP4_INFO_MARKER}="true"]`)) return;

    const row = document.createElement("div");
    row.className = "clara-budget-step4-info-row";
    row.setAttribute(STEP4_INFO_MARKER, "true");

    const button = createInfoButton("About timeframe");
    const popover = createInfoPopover(STEP4_INFO_TITLE, STEP4_INFO_BODY);
    wireInfoToggle(button, popover);
    row.append(button, popover);
    header.replaceWith(row);
  });
}

function installStep4RelationshipInfo(root) {
  root.querySelectorAll("p").forEach((body) => {
    if (normalizeText(body.textContent) !== STEP4_RELATIONSHIP_BODY) return;

    const card = body.closest("div.rounded-2xl");
    if (!card || card.getAttribute(STEP4_RELATIONSHIP_MARKER) === "true") return;

    const directParagraphs = Array.from(card.children).filter((child) => child.tagName === "P");
    const label = directParagraphs.find(
      (paragraph) => normalizeText(paragraph.textContent).toLowerCase() === STEP4_RELATIONSHIP_LABEL.toLowerCase(),
    );
    if (!label) return;

    card.setAttribute(STEP4_RELATIONSHIP_MARKER, "true");
    const head = document.createElement("div");
    head.className = "clara-budget-relationship-info-head";
    label.replaceWith(head);
    head.appendChild(label);

    const button = createInfoButton("About relationship to your total");
    const popover = createInfoPopover("Why timeframe matters", STEP4_RELATIONSHIP_BODY);
    wireInfoToggle(button, popover);
    head.appendChild(button);
    body.replaceWith(popover);
  });
}

function hideMatchingCopy(root) {
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

    if (isEmptyStateCopy(text)) {
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
  });

  hideRedundantProgressCard(root);
}

function findStat(section, label) {
  const labelNode = Array.from(section.querySelectorAll("p")).find(
    (node) => normalizeText(node.textContent).toLowerCase() === label.toLowerCase(),
  );
  const card = labelNode?.closest("div.rounded-2xl");
  if (!card) return "₱0";
  const paragraphs = Array.from(card.querySelectorAll(":scope > p"));
  return normalizeText(paragraphs[1]?.textContent) || "₱0";
}

function pickMessageIndex() {
  let lastIndex = -1;
  try {
    lastIndex = Number.parseInt(localStorage.getItem(LAST_MESSAGE_STORAGE_KEY) || "-1", 10);
  } catch {}

  const available = MOTIVATION_MESSAGES.map((_, index) => index).filter((index) => index !== lastIndex);
  const index = available[Math.floor(Math.random() * available.length)] ?? 0;

  try {
    localStorage.setItem(LAST_MESSAGE_STORAGE_KEY, String(index));
  } catch {}

  return index;
}

function enhanceStep5(root) {
  root.querySelectorAll("section").forEach((section) => {
    const activateButton = Array.from(section.querySelectorAll("button")).find((button) =>
      normalizeText(button.textContent).toLowerCase().includes("activate budget"),
    );
    if (!activateButton) return;

    const headerShell = section.firstElementChild;
    const body = Array.from(section.children).find((child) => child.classList?.contains("p-4"));
    if (!headerShell || !body) return;

    const header = headerShell.querySelector("div.flex.items-start.gap-3");
    const title = header?.querySelector("h2");
    const textWrap = header?.querySelector(":scope > div:last-child");
    const eyebrow = textWrap?.querySelector(":scope > p:first-child");
    const summary = title?.nextElementSibling;
    if (!header || !title || !eyebrow || !summary) return;

    /* Clear markers left by the earlier experimental runtime. */
    section.querySelectorAll("[data-clara-budget-final-original], [data-clara-budget-final-hide]").forEach((element) => {
      element.removeAttribute("data-clara-budget-final-original");
      element.removeAttribute("data-clara-budget-final-hide");
    });
    header.removeAttribute("data-clara-budget-step5-polished");

    section.setAttribute(STEP5_SCREEN_MARKER, "true");
    header.setAttribute(STEP5_HERO_MARKER, "true");

    const regular = findStat(section, "Regular items");
    const protectedMoney = findStat(section, "Protected money");
    const debt = findStat(section, "Debt & obligations");
    const total = findStat(section, "Calculated total");

    if (!section.getAttribute(STEP5_ORIGINAL_CYCLE)) {
      const originalTitle = normalizeText(title.textContent);
      const cycle = originalTitle
        .replace(/^You created a\s+/i, "")
        .replace(/^₱[\d,.]+\s+/i, "")
        .replace(/\s+budget$/i, "") || "Budget";
      section.setAttribute(STEP5_ORIGINAL_CYCLE, cycle);
    }

    if (!section.getAttribute(STEP5_ORIGINAL_DATES)) {
      const originalSummary = normalizeText(summary.textContent);
      const dates = originalSummary
        .replace(/^This budget is intended to cover\s+/i, "")
        .replace(/\.$/, "");
      section.setAttribute(STEP5_ORIGINAL_DATES, dates);
    }

    let messageIndex = Number.parseInt(section.getAttribute(STEP5_MESSAGE_INDEX) || "", 10);
    if (!Number.isInteger(messageIndex) || !MOTIVATION_MESSAGES[messageIndex]) {
      messageIndex = pickMessageIndex();
      section.setAttribute(STEP5_MESSAGE_INDEX, String(messageIndex));
    }

    const cycle = section.getAttribute(STEP5_ORIGINAL_CYCLE) || "Budget";
    const dates = section.getAttribute(STEP5_ORIGINAL_DATES) || "";
    const message = MOTIVATION_MESSAGES[messageIndex];

    if (eyebrow.textContent !== "YOUR BUDGET IS READY") eyebrow.textContent = "YOUR BUDGET IS READY";
    if (title.textContent !== message) title.textContent = message;

    const consolidated = `${total} TOTAL BUDGET\n${cycle}${dates ? ` · ${dates}` : ""}\nItems ${regular} · Protected ${protectedMoney} · Obligations ${debt}`;
    if (summary.textContent !== consolidated) summary.textContent = consolidated;

    const statsGrid = Array.from(body.children).find(
      (child) => child.classList?.contains("grid") && child.classList?.contains("grid-cols-2"),
    );
    if (statsGrid) statsGrid.setAttribute(STEP5_HIDE_MARKER, "true");

    const explanation = Array.from(body.children).find((child) =>
      normalizeText(child.textContent).startsWith("It includes "),
    );
    if (explanation) explanation.setAttribute(STEP5_HIDE_MARKER, "true");
  });
}

export function installBudgetSetupCopyCleanup() {
  if (typeof window === "undefined" || window.__claraBudgetSetupCopyCleanupInstalled) return;
  window.__claraBudgetSetupCopyCleanupInstalled = true;

  installStyles();

  const start = () => {
    const root = document.getElementById("root");
    if (!root) return;

    let scheduled = false;
    const run = () => {
      scheduled = false;
      hideMatchingCopy(root);
      installStep4Info(root);
      installStep4RelationshipInfo(root);
      enhanceStep5(root);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(run);
    };

    run();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
