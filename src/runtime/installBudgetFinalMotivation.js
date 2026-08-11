const STYLE_ID = "clara-budget-final-motivation-style";
const HERO_CLASS = "clara-budget-final-hero";
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

const messageBySignature = new Map();
const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();

function installStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #root .${HERO_CLASS} {
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(96, 165, 250, 0.28);
      border-radius: 1.25rem;
      background: linear-gradient(145deg, #0d3d7b 0%, #0b2f65 52%, #0b2755 100%);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.09), 0 16px 34px rgba(0,0,0,0.24);
      padding: 1rem;
    }

    #root .${HERO_CLASS}::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 90% 0%, rgba(247,201,72,0.10), transparent 34%);
    }

    #root .clara-budget-final-kicker {
      position: relative;
      z-index: 1;
      margin: 0;
      color: rgba(247,201,72,0.88);
      font-size: 0.62rem;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    #root .clara-budget-final-message {
      position: relative;
      z-index: 1;
      margin: 0.55rem 0 0;
      max-width: 19rem;
      color: #ffffff;
      font-size: 1.08rem;
      font-weight: 900;
      line-height: 1.32;
      letter-spacing: -0.025em;
      text-wrap: balance;
    }

    #root .clara-budget-final-summary {
      position: relative;
      z-index: 1;
      margin-top: 1rem;
      padding-top: 0.9rem;
      border-top: 1px solid rgba(191,219,254,0.16);
    }

    #root .clara-budget-final-total-row {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 0.85rem;
    }

    #root .clara-budget-final-label {
      display: block;
      margin: 0;
      color: rgba(219,234,254,0.60);
      font-size: 0.58rem;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    #root .clara-budget-final-total {
      display: block;
      margin-top: 0.3rem;
      color: #f7c948;
      font-size: 1.55rem;
      font-weight: 950;
      line-height: 1;
      letter-spacing: -0.035em;
    }

    #root .clara-budget-final-cycle {
      margin: 0;
      color: #ffffff;
      font-size: 0.78rem;
      font-weight: 850;
      line-height: 1.2;
      text-align: right;
      text-transform: capitalize;
    }

    #root .clara-budget-final-dates {
      margin: 0.3rem 0 0;
      color: rgba(219,234,254,0.62);
      font-size: 0.67rem;
      font-weight: 650;
      line-height: 1.35;
      text-align: right;
    }

    #root .clara-budget-final-breakdown {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.45rem;
      margin-top: 0.85rem;
    }

    #root .clara-budget-final-breakdown > div {
      min-width: 0;
      border: 1px solid rgba(147,197,253,0.14);
      border-radius: 0.85rem;
      background: #0a2854;
      padding: 0.62rem 0.68rem;
    }

    #root .clara-budget-final-breakdown span {
      display: block;
      overflow: hidden;
      color: rgba(219,234,254,0.52);
      font-size: 0.52rem;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.08em;
      text-overflow: ellipsis;
      text-transform: uppercase;
      white-space: nowrap;
    }

    #root .clara-budget-final-breakdown strong {
      display: block;
      margin-top: 0.35rem;
      overflow: hidden;
      color: #ffffff;
      font-size: 0.82rem;
      font-weight: 900;
      line-height: 1.05;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    #root [data-clara-budget-final-original="true"] {
      display: none !important;
    }

    @media (max-width: 360px) {
      #root .clara-budget-final-total-row {
        align-items: flex-start;
        flex-direction: column;
      }

      #root .clara-budget-final-cycle,
      #root .clara-budget-final-dates {
        text-align: left;
      }
    }
  `;
  document.head.appendChild(style);
}

function pickMessage(signature) {
  if (messageBySignature.has(signature)) return messageBySignature.get(signature);

  let lastIndex = -1;
  try {
    lastIndex = Number.parseInt(localStorage.getItem(MESSAGE_STORAGE_KEY) || "-1", 10);
  } catch {}

  const available = MOTIVATION_MESSAGES.map((_, index) => index).filter((index) => index !== lastIndex);
  const index = available[Math.floor(Math.random() * available.length)] ?? 0;

  try {
    localStorage.setItem(MESSAGE_STORAGE_KEY, String(index));
  } catch {}

  const message = MOTIVATION_MESSAGES[index];
  messageBySignature.set(signature, message);
  return message;
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

function makeBreakdownItem(label, value) {
  const item = document.createElement("div");
  const name = document.createElement("span");
  const amount = document.createElement("strong");
  name.textContent = label;
  amount.textContent = value;
  item.append(name, amount);
  return item;
}

function buildHero({ message, total, cycle, dates, regular, protectedMoney, debt }) {
  const hero = document.createElement("div");
  hero.className = HERO_CLASS;

  const kicker = document.createElement("p");
  kicker.className = "clara-budget-final-kicker";
  kicker.textContent = "YOUR BUDGET IS READY";

  const messageNode = document.createElement("p");
  messageNode.className = "clara-budget-final-message";
  messageNode.textContent = message;

  const summary = document.createElement("div");
  summary.className = "clara-budget-final-summary";

  const totalRow = document.createElement("div");
  totalRow.className = "clara-budget-final-total-row";

  const totalWrap = document.createElement("div");
  const totalLabel = document.createElement("span");
  totalLabel.className = "clara-budget-final-label";
  totalLabel.textContent = "TOTAL BUDGET";
  const totalValue = document.createElement("strong");
  totalValue.className = "clara-budget-final-total";
  totalValue.textContent = total;
  totalWrap.append(totalLabel, totalValue);

  const cycleWrap = document.createElement("div");
  const cycleNode = document.createElement("p");
  cycleNode.className = "clara-budget-final-cycle";
  cycleNode.textContent = cycle;
  const datesNode = document.createElement("p");
  datesNode.className = "clara-budget-final-dates";
  datesNode.textContent = dates;
  cycleWrap.append(cycleNode, datesNode);

  totalRow.append(totalWrap, cycleWrap);

  const breakdown = document.createElement("div");
  breakdown.className = "clara-budget-final-breakdown";
  breakdown.append(
    makeBreakdownItem("Items", regular),
    makeBreakdownItem("Protected", protectedMoney),
    makeBreakdownItem("Obligations", debt),
  );

  summary.append(totalRow, breakdown);
  hero.append(kicker, messageNode, summary);
  return hero;
}

function hideOriginalSummary(section) {
  const header = Array.from(section.children).find((child) =>
    child.querySelector?.("h2") && normalize(child.textContent).includes("You created a"),
  );
  if (header) header.setAttribute("data-clara-budget-final-original", "true");

  const body = Array.from(section.children).find((child) => child.classList?.contains("p-4"));
  if (!body) return null;

  const stats = Array.from(body.children).find(
    (child) => child.classList?.contains("grid") && child.classList?.contains("grid-cols-2"),
  );
  if (stats) stats.setAttribute("data-clara-budget-final-original", "true");

  const explanation = Array.from(body.children).find((child) =>
    normalize(child.textContent).startsWith("It includes "),
  );
  if (explanation) explanation.setAttribute("data-clara-budget-final-original", "true");

  return body;
}

function enhanceFinalBudgetSummary(root) {
  if (!root) return;

  root.querySelectorAll("section").forEach((section) => {
    const activateButton = Array.from(section.querySelectorAll("button")).find((button) =>
      normalize(button.textContent).toLowerCase().includes("activate budget"),
    );
    if (!activateButton) return;

    const title = Array.from(section.querySelectorAll("h2")).find((node) =>
      normalize(node.textContent).startsWith("You created a "),
    );
    if (!title) return;

    const total = findStat(section, "Calculated total");
    const regular = findStat(section, "Regular items");
    const protectedMoney = findStat(section, "Protected money");
    const debt = findStat(section, "Debt & obligations");

    const titleText = normalize(title.textContent);
    const cycle = titleText
      .replace(/^You created a\s+/i, "")
      .replace(new RegExp(`^${total.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "")
      .replace(/\s+budget$/i, "") || "Budget";

    const coverage = Array.from(section.querySelectorAll("p")).find((node) =>
      normalize(node.textContent).startsWith("This budget is intended to cover "),
    );
    const dates = normalize(coverage?.textContent)
      .replace(/^This budget is intended to cover\s+/i, "")
      .replace(/\.$/, "");

    const signature = `${total}|${cycle}|${dates}`;
    const message = pickMessage(signature);
    const body = hideOriginalSummary(section);
    if (!body) return;

    let hero = body.querySelector(`:scope > .${HERO_CLASS}`);
    if (!hero) {
      hero = buildHero({ message, total, cycle, dates, regular, protectedMoney, debt });
      body.prepend(hero);
    }
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
