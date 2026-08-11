const STYLE_ID = "clara-budget-final-motivation-style";
const SCREEN_MARKER = "data-clara-budget-final-screen";
const HERO_MARKER = "data-clara-budget-final-hero";
const HIDE_MARKER = "data-clara-budget-final-hide";
const MESSAGE_SIGNATURE_MARKER = "data-clara-budget-final-message-signature";
const MESSAGE_STORAGE_KEY = "clara_last_budget_motivation_index";

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

const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();

function installStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #root [${SCREEN_MARKER}="true"] [${HERO_MARKER}="true"] {
      align-items: flex-start !important;
      gap: 0 !important;
      width: 100% !important;
    }

    /* Remove the decorative completion icon; the message is the hero. */
    #root [${HERO_MARKER}="true"] > div:first-child {
      display: none !important;
    }

    #root [${HERO_MARKER}="true"] > div:last-child {
      width: 100% !important;
      min-width: 0 !important;
      flex: 1 1 100% !important;
    }

    /* Override the older Step 5 cleanup: this kicker is useful and intentional. */
    #root [${HERO_MARKER}="true"] > div:last-child > p:first-child {
      display: block !important;
      margin: 0 !important;
      color: rgba(247, 201, 72, 0.90) !important;
      font-size: 0.60rem !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      letter-spacing: 0.17em !important;
      text-transform: uppercase !important;
    }

    #root [${HERO_MARKER}="true"] h2 {
      margin: 0.58rem 0 0 !important;
      max-width: 19rem !important;
      color: #ffffff !important;
      font-size: 1.08rem !important;
      font-weight: 900 !important;
      line-height: 1.34 !important;
      letter-spacing: -0.028em !important;
      text-wrap: balance;
    }

    #root [${HERO_MARKER}="true"] h2 + p {
      margin: 0.9rem 0 0 !important;
      max-width: 100% !important;
      padding-top: 0.8rem !important;
      border-top: 1px solid rgba(191, 219, 254, 0.16) !important;
      color: rgba(239, 246, 255, 0.72) !important;
      font-size: 0.72rem !important;
      font-weight: 700 !important;
      line-height: 1.58 !important;
      letter-spacing: 0 !important;
      white-space: pre-line !important;
    }

    #root [${SCREEN_MARKER}="true"] > div:first-child {
      background:
        radial-gradient(circle at 92% 0%, rgba(247, 201, 72, 0.09), transparent 34%),
        linear-gradient(145deg, rgba(14, 62, 126, 0.96), rgba(10, 42, 91, 0.98)) !important;
      border-bottom-color: rgba(96, 165, 250, 0.22) !important;
      padding: 1rem !important;
    }

    /* The old four statistic cards and paragraph are now represented in the consolidated hero. */
    #root [${HIDE_MARKER}="true"] {
      display: none !important;
    }

    /* Pull the edit controls up after removing the duplicate stat block. */
    #root [${SCREEN_MARKER}="true"] > div.p-4 > div.mt-4.grid.grid-cols-3 {
      margin-top: 0 !important;
    }
  `;
  document.head.appendChild(style);
}

function findStat(section, label) {
  const labelNode = Array.from(section.querySelectorAll("p")).find(
    (node) => normalize(node.textContent).toLowerCase() === label.toLowerCase(),
  );
  const card = labelNode?.closest("div.rounded-2xl");
  if (!card) return "₱0";
  const paragraphs = Array.from(card.querySelectorAll(":scope > p"));
  return normalize(paragraphs[1]?.textContent) || "₱0";
}

function pickMessage() {
  let lastIndex = -1;
  try {
    lastIndex = Number.parseInt(localStorage.getItem(MESSAGE_STORAGE_KEY) || "-1", 10);
  } catch {}

  const available = MOTIVATION_MESSAGES.map((_, index) => index).filter((index) => index !== lastIndex);
  const index = available[Math.floor(Math.random() * available.length)] ?? 0;

  try {
    localStorage.setItem(MESSAGE_STORAGE_KEY, String(index));
  } catch {}

  return MOTIVATION_MESSAGES[index];
}

function extractFinalScreen(section) {
  const activateButton = Array.from(section.querySelectorAll("button")).find((button) =>
    normalize(button.textContent).toLowerCase().includes("activate budget"),
  );
  if (!activateButton) return null;

  const title = Array.from(section.querySelectorAll("h2")).find((node) =>
    normalize(node.textContent).startsWith("You created a ") || node.getAttribute(MESSAGE_SIGNATURE_MARKER),
  );
  if (!title) return null;

  const header = title.closest("div.flex.items-start.gap-3");
  const body = Array.from(section.children).find((child) => child.classList?.contains("p-4"));
  if (!header || !body) return null;

  return { activateButton, title, header, body };
}

function enhanceFinalBudgetSummary(root) {
  if (!root) return;

  root.querySelectorAll("section").forEach((section) => {
    const match = extractFinalScreen(section);
    if (!match) return;

    const { title, header, body } = match;
    section.setAttribute(SCREEN_MARKER, "true");
    header.setAttribute(HERO_MARKER, "true");

    const regular = findStat(section, "Regular items");
    const protectedMoney = findStat(section, "Protected money");
    const debt = findStat(section, "Debt & obligations");
    const total = findStat(section, "Calculated total");

    const currentTitle = normalize(title.textContent);
    let cycle = "Budget";
    if (currentTitle.startsWith("You created a ")) {
      cycle = currentTitle
        .replace(/^You created a\s+/i, "")
        .replace(/^₱[\d,.]+\s+/i, "")
        .replace(/\s+budget$/i, "") || "Budget";
    } else {
      cycle = title.dataset.claraBudgetCycle || "Budget";
    }

    const coverage = Array.from(section.querySelectorAll("p")).find((node) =>
      normalize(node.textContent).startsWith("This budget is intended to cover ") ||
      node.dataset?.claraBudgetCoverage === "true",
    );
    let dates = "";
    if (coverage) {
      const coverageText = normalize(coverage.textContent);
      dates = coverageText
        .replace(/^This budget is intended to cover\s+/i, "")
        .replace(/\.$/, "");
    }

    const signature = `${total}|${cycle}|${dates}`;
    if (title.getAttribute(MESSAGE_SIGNATURE_MARKER) !== signature) {
      title.dataset.claraBudgetCycle = cycle;
      title.setAttribute(MESSAGE_SIGNATURE_MARKER, signature);
      title.textContent = pickMessage();
    }

    const eyebrow = header.querySelector(":scope > div:last-child > p:first-child");
    if (eyebrow) eyebrow.textContent = "YOUR BUDGET IS READY";

    if (coverage) {
      coverage.dataset.claraBudgetCoverage = "true";
      coverage.textContent = `${total} total · ${cycle}\n${dates}\nItems ${regular} · Protected ${protectedMoney} · Obligations ${debt}`;
    }

    const statsGrid = Array.from(body.children).find(
      (child) => child.classList?.contains("grid") && child.classList?.contains("grid-cols-2"),
    );
    if (statsGrid) statsGrid.setAttribute(HIDE_MARKER, "true");

    const explanation = Array.from(body.children).find((child) =>
      normalize(child.textContent).startsWith("It includes "),
    );
    if (explanation) explanation.setAttribute(HIDE_MARKER, "true");

    /* Remove stale markers from the first implementation so the React-owned header cannot disappear. */
    section.querySelectorAll('[data-clara-budget-final-original="true"]').forEach((node) =>
      node.removeAttribute("data-clara-budget-final-original"),
    );
  });
}

function start() {
  installStyles();
  const root = document.getElementById("root");
  if (!root) return;

  enhanceFinalBudgetSummary(root);
  const observer = new MutationObserver(() => enhanceFinalBudgetSummary(root));
  observer.observe(root, { childList: true, subtree: true, characterData: true });
}

if (typeof window !== "undefined" && !window.__claraBudgetFinalMotivationInstalled) {
  window.__claraBudgetFinalMotivationInstalled = true;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
