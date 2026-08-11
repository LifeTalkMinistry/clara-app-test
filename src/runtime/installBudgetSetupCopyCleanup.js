const EMPTY_STATE_PREFIX = "You can continue without a regular item";
const STEP4_INFO_TITLE = "How long should this budget cover?";
const STEP4_INFO_BODY =
  "The timeframe gives meaning to the total you built. It will not change or prorate your amounts automatically.";
const STEP4_RELATIONSHIP_LABEL = "Relationship to your total";
const STEP4_RELATIONSHIP_BODY =
  "The same amount can mean something very different over seven days versus a full month. CLARA records both together.";

const STYLE_ID = "clara-budget-setup-cleanup-style";
const HIDDEN_MARKER = "data-clara-budget-copy-hidden";
const TRANSIT_REVIEW_MARKER = "data-clara-budget-transit-review";
const STEP4_INFO_MARKER = "data-clara-budget-step4-info";
const STEP4_RELATIONSHIP_MARKER = "data-clara-budget-step4-relationship-info";
const FINAL_SCREEN_MARKER = "data-clara-budget-final-owned";
const FINAL_HERO_MARKER = "data-clara-budget-final-hero-owned";
const FINAL_MESSAGE_INDEX = "data-clara-budget-message-index";
const FINAL_ORIGINAL_CYCLE = "data-clara-budget-original-cycle";
const FINAL_ORIGINAL_DATES = "data-clara-budget-original-dates";
const LAST_MESSAGE_STORAGE_KEY = "clara_last_budget_motivation_index";

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

function installStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    /* Keep the small help panels solid and in-flow instead of floating over inputs. */
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
      background: linear-gradient(145deg, #154d86 0%, #0a2b52 100%) !important;
      border-color: #3f78ad !important;
      color: #eef7ff !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
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

    #root [${HIDDEN_MARKER}="true"],
    #root [${TRANSIT_REVIEW_MARKER}="true"] {
      display: none !important;
    }

    /* Timeframe is now the visible Step 3. */
    .clara-budget-step4-info-row {
      position: relative;
      z-index: 80;
      display: flex;
      width: 100%;
      min-height: 2.25rem;
      align-items: center;
      justify-content: space-between;
      gap: 0.85rem;
      margin-bottom: 0.8rem;
    }

    .clara-budget-step4-info-row::before {
      content: "TIMEFRAME";
      display: block;
      color: #ffffff;
      font-size: 0.92rem;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      text-shadow: 0 4px 18px rgba(0,0,0,0.28);
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

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) {
      display: grid !important;
      grid-template-columns: 1fr auto !important;
      align-items: start !important;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden]))::before {
      grid-column: 1 !important;
      grid-row: 1 !important;
      align-self: center !important;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) .clara-budget-step-info-button {
      grid-column: 2 !important;
      grid-row: 1 !important;
      justify-self: end !important;
    }

    .clara-budget-step4-info-row:has(.clara-budget-step-info-popover:not([hidden])) .clara-budget-step-info-popover {
      grid-column: 1 / -1 !important;
      grid-row: 2 !important;
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

    /* Final screen is now the only Review step. */
    #root [${FINAL_SCREEN_MARKER}="true"] > div:first-child {
      display: block !important;
      padding: 1rem !important;
      border-bottom-color: rgba(96,165,250,0.22) !important;
      background:
        radial-gradient(circle at 92% 0%, rgba(247,201,72,0.10), transparent 34%),
        linear-gradient(145deg, #0d3d7b 0%, #0a2b5b 56%, #09264f 100%) !important;
    }

    #root [${FINAL_HERO_MARKER}="true"] {
      display: flex !important;
      align-items: flex-start !important;
      width: 100% !important;
      gap: 0 !important;
    }

    #root [${FINAL_HERO_MARKER}="true"] > div:first-child {
      display: none !important;
    }

    #root [${FINAL_HERO_MARKER}="true"] > div:last-child {
      display: block !important;
      width: 100% !important;
      min-width: 0 !important;
      flex: 1 1 100% !important;
    }

    #root [${FINAL_HERO_MARKER}="true"] > div:last-child > p:first-child {
      display: block !important;
      margin: 0 !important;
      color: #f7c948 !important;
      font-size: 0.61rem !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      letter-spacing: 0.17em !important;
      text-transform: uppercase !important;
    }

    #root [${FINAL_HERO_MARKER}="true"] h2 {
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

    /* The old date/total sentence under the motivation is intentionally removed. */
    #root [${FINAL_HERO_MARKER}="true"] h2 + p {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
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

function installTimeframeInfo(root) {
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

function installRelationshipInfo(root) {
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

function hideEmptyBudgetCopy(root) {
  root.querySelectorAll(`[${HIDDEN_MARKER}="true"]`).forEach((element) => {
    if (normalizeText(element.textContent).startsWith(EMPTY_STATE_PREFIX)) return;
    element.hidden = false;
    element.removeAttribute(HIDDEN_MARKER);
  });

  root.querySelectorAll("div").forEach((element) => {
    if (!normalizeText(element.textContent).startsWith(EMPTY_STATE_PREFIX)) return;
    const card = element.closest("div.rounded-2xl") || element;
    card.setAttribute(HIDDEN_MARKER, "true");
    card.hidden = true;
  });
}

function findButton(section, matcher) {
  return Array.from(section?.querySelectorAll("button") || []).find((button) => matcher(normalizeText(button.textContent)));
}

function detectActualStep(root) {
  const sections = Array.from(root.querySelectorAll("section"));

  for (const section of sections) {
    if (findButton(section, (text) => text.toLowerCase().includes("activate budget"))) return { step: 5, section };
  }

  for (const section of sections) {
    const text = normalizeText(section.textContent);
    if (text.includes("Every 2 weeks") && text.includes("Custom")) return { step: 4, section };
  }

  for (const section of sections) {
    if (normalizeText(section.textContent).includes("Total budget needed")) return { step: 3, section };
  }

  for (const section of sections) {
    if (findButton(section, (text) => text === "Back to items")) return { step: 2, section };
  }

  for (const section of sections) {
    if (findButton(section, (text) => text === "Add item" || text === "Update item")) return { step: 1, section };
  }

  return { step: 0, section: null };
}

function setButtonLabel(button, label) {
  if (!button || normalizeText(button.textContent) === label) return;
  const textNode = Array.from(button.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && normalizeText(node.nodeValue),
  );
  if (textNode) textNode.nodeValue = `${label} `;
  else button.insertBefore(document.createTextNode(`${label} `), button.firstChild);
}

function setVirtualHeader(root, actualStep) {
  const labels = {
    1: "Step 1 of 4 · Budget Items",
    2: "Step 2 of 4 · Protected Money",
    3: "Step 3 of 4 · Timeframe",
    4: "Step 3 of 4 · Timeframe",
    5: "Step 4 of 4 · Review",
  };
  const next = labels[actualStep];
  if (!next) return;

  const stickyHeader = root.querySelector("header.sticky");
  if (!stickyHeader) return;
  const progress = Array.from(stickyHeader.querySelectorAll("p")).find((node) => /Step\s+\d+\s+of\s+\d+/i.test(node.textContent));
  if (progress && normalizeText(progress.textContent) !== next) progress.textContent = next;
}

function pickMessageIndex() {
  let lastIndex = -1;
  try {
    lastIndex = Number.parseInt(localStorage.getItem(LAST_MESSAGE_STORAGE_KEY) || "-1", 10);
  } catch {}

  const choices = MOTIVATION_MESSAGES.map((_, index) => index).filter((index) => index !== lastIndex);
  const index = choices[Math.floor(Math.random() * choices.length)] ?? 0;
  try {
    localStorage.setItem(LAST_MESSAGE_STORAGE_KEY, String(index));
  } catch {}
  return index;
}

function enhanceFinalReview(section) {
  if (!section) return;

  const headerShell = section.firstElementChild;
  const header = headerShell?.querySelector("div.flex.items-start.gap-3");
  const textWrap = header?.querySelector(":scope > div:last-child");
  const eyebrow = textWrap?.querySelector(":scope > p:first-child");
  const title = header?.querySelector("h2");
  const summary = title?.nextElementSibling;
  if (!headerShell || !header || !textWrap || !eyebrow || !title || !summary) return;

  section.setAttribute(FINAL_SCREEN_MARKER, "true");
  header.setAttribute(FINAL_HERO_MARKER, "true");
  header.removeAttribute("data-clara-budget-step5-polished");

  if (!section.getAttribute(FINAL_ORIGINAL_CYCLE)) {
    const originalTitle = normalizeText(title.textContent);
    const cycle = originalTitle
      .replace(/^You created a\s+/i, "")
      .replace(/^₱[\d,.]+\s+/i, "")
      .replace(/\s+budget$/i, "") || "Budget";
    section.setAttribute(FINAL_ORIGINAL_CYCLE, cycle);
  }

  if (!section.getAttribute(FINAL_ORIGINAL_DATES)) {
    const originalSummary = normalizeText(summary.textContent);
    const dates = originalSummary
      .replace(/^This budget is intended to cover\s+/i, "")
      .replace(/\.$/, "");
    section.setAttribute(FINAL_ORIGINAL_DATES, dates);
  }

  let messageIndex = Number.parseInt(section.getAttribute(FINAL_MESSAGE_INDEX) || "", 10);
  if (!Number.isInteger(messageIndex) || !MOTIVATION_MESSAGES[messageIndex]) {
    messageIndex = pickMessageIndex();
    section.setAttribute(FINAL_MESSAGE_INDEX, String(messageIndex));
  }

  eyebrow.textContent = "YOUR BUDGET IS READY";
  title.textContent = MOTIVATION_MESSAGES[messageIndex];
}

let transitionDirection = "forward";
let transitBusy = false;

function installNavigationCapture(root) {
  if (root.dataset.claraBudgetFourStepCapture === "true") return;
  root.dataset.claraBudgetFourStepCapture = "true";

  root.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("button");
      if (!button) return;
      const { step, section } = detectActualStep(root);
      if (!section || !section.contains(button)) return;
      const label = normalizeText(button.textContent);

      if (step === 2 && (label === "Review total" || label === "Set timeframe")) {
        transitionDirection = "forward";
      } else if (step === 4 && label === "Back") {
        transitionDirection = "back";
      }
    },
    true,
  );
}

function skipRedundantReview(section) {
  if (!section || transitBusy) return;
  section.setAttribute(TRANSIT_REVIEW_MARKER, "true");
  transitBusy = true;

  requestAnimationFrame(() => {
    const target =
      transitionDirection === "back"
        ? findButton(section, (text) => text === "Back")
        : findButton(section, (text) => text === "Set timeframe");

    if (target) target.click();
    transitionDirection = "forward";
    window.setTimeout(() => {
      transitBusy = false;
    }, 80);
  });
}

function applyFourStepFlow(root) {
  const { step, section } = detectActualStep(root);
  if (!step || !section) return;

  setVirtualHeader(root, step);

  if (step === 2) {
    const next = findButton(section, (text) => text === "Review total" || text === "Set timeframe");
    setButtonLabel(next, "Set timeframe");
  }

  if (step === 3) {
    skipRedundantReview(section);
    return;
  }

  if (step === 4) {
    const next = findButton(section, (text) => text === "Final summary" || text === "Review budget");
    setButtonLabel(next, "Review budget");
    installTimeframeInfo(root);
    installRelationshipInfo(root);
  }

  if (step === 5) {
    enhanceFinalReview(section);
  }
}

export function installBudgetSetupCopyCleanup() {
  if (typeof window === "undefined" || window.__claraBudgetSetupCopyCleanupInstalled) return;
  window.__claraBudgetSetupCopyCleanupInstalled = true;

  installStyles();

  const start = () => {
    const root = document.getElementById("root");
    if (!root) return;

    installNavigationCapture(root);

    let scheduled = false;
    const run = () => {
      scheduled = false;
      hideEmptyBudgetCopy(root);
      applyFourStepFlow(root);
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
