function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const CARD_BODY_LIMITS = {
  purchase: 150,
  wallet: 155,
  budget: 150,
  goals: 145,
  emergency: 145,
  schedule: 155,
  pattern: 150,
  final: 160,
};

const CARD_BULLET_LIMITS = {
  purchase: 115,
  wallet: 115,
  budget: 115,
  goals: 115,
  emergency: 115,
  schedule: 115,
  pattern: 125,
  final: 120,
};

function clampText(value = "", limit = 150) {
  const text = clean(value);
  if (!text || text.length <= limit) return text;

  const roughCut = text.slice(0, Math.max(0, limit - 1));
  const lastSpace = roughCut.lastIndexOf(" ");
  const safeCut = lastSpace >= Math.floor(limit * 0.62) ? roughCut.slice(0, lastSpace) : roughCut;

  return `${safeCut.trim().replace(/[.,;:–—-]+$/g, "")}…`;
}

function compactMemorySignal(value = "") {
  const text = clean(value);
  const pieces = text
    .split(/\s+-\s+|[.!?]\s+/)
    .map(clean)
    .filter((piece) => piece.length >= 16);

  const bestPieces = pieces
    .filter((piece) => /spend|food|shopping|stress|trigger|impulse|goal|discipline|habit|budget|basketball|work/i.test(piece))
    .slice(0, 2);

  const summary = bestPieces.length ? bestPieces.join(". ") : pieces.slice(0, 1).join(". ");
  return clampText(summary || text, 125);
}

function limitCardData(kind = "", cardData = {}) {
  const bodyLimit = CARD_BODY_LIMITS[kind] || 150;
  const bulletLimit = CARD_BULLET_LIMITS[kind] || 115;

  return {
    ...cardData,
    body: clampText(cardData.body, bodyLimit),
    bullets: safeArray(cardData.bullets).slice(0, 3).map((item) => clampText(item, bulletLimit)),
  };
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  const amount = Number(value) || 0;
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function percent(value = 0) {
  const number = Number(value) || 0;
  return `${Math.max(0, Math.round(number))}%`;
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function sanitizeMemorySignal(value = "") {
  const text = clean(value)
    .replace(/^[-•]\s*/g, "")
    .replace(/\bStart Buy Check\b/gi, "")
    .replace(/\bBuy Check\b/gi, "purchase check")
    .replace(/\bmemory\.?\s*paydayBehavior\s*(is missing)?\.?/gi, "")
    .replace(/\bpaydayBehavior\b/gi, "payday spending pattern");

  if (!text || text.length < 8) return "No strong spending pattern was loaded for this check.";
  return compactMemorySignal(text);
}

function getMemorySignal(context = {}) {
  const memory = context.fullMemoryContext || {};
  const cabinets = safeArray(memory.memoryCabinets);
  const records = cabinets.flatMap((cabinet) => safeArray(cabinet.records));
  const notes = safeArray(memory.profileMemoryNotes);
  const all = [...records, ...notes];
  const chosen = all.find((record) => /payday|impulse|shopping|spending|reward|trigger|goal|discipline/i.test(`${record.summary || ""} ${safeArray(record.signals).join(" ")}`)) || all[0];
  return sanitizeMemorySignal(chosen?.summary || safeArray(chosen?.signals).join(" "));
}

function getMoneyImpactEvent(context = {}) {
  const schedule = safeArray(context.scheduleContext);
  return schedule.find((event) => toNumber(event.amount || event.cost || event.estimatedImpact) > 0 || /bill|due|rent|dinner|health|appointment|social|payment/i.test(`${event.type || ""} ${event.title || ""} ${event.note || ""}`)) || schedule[0] || null;
}

function buildCardData(kind, context = {}) {
  const purchase = context.purchaseSummary || {};
  const finance = context.financeContext || {};
  const price = toNumber(purchase.price);
  const spendable = toNumber(finance.totalSpendableWalletBalance);
  const afterPurchase = spendable - price;
  const budget = finance.matchingBudget;
  const remaining = toNumber(budget?.remaining);
  const budgetUse = budget && remaining > 0 ? (price / remaining) * 100 : 0;
  const goal = safeArray(finance.savingsGoals)[0];
  const emergency = finance.emergencyFund;
  const event = getMoneyImpactEvent(context);
  const eventAmount = toNumber(event?.amount || event?.cost || event?.estimatedImpact);
  const categoryExpenses = safeArray(finance.categoryExpenses);
  const categorySpend = categoryExpenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const memorySignal = getMemorySignal(context);
  const protectedWallets = safeArray(finance.protectedWallets);
  const spendableWallets = safeArray(finance.spendableWallets);

  switch (kind) {
    case "purchase":
      return {
        body: `CLARA is checking ${purchase.item || "this item"} as a ${purchase.inferredCategory || "purchase"} purchase for ${money(price)}.`,
        bullets: [
          `Reason given: ${purchase.reason || "Not specified"}.`,
          `The price being tested is ${money(price)}.`,
          "Next cards check if this fits the user's money environment.",
        ],
      };
    case "wallet":
      return {
        body: `Spendable wallets show ${money(spendable)} available before this purchase and ${money(afterPurchase)} after it.`,
        bullets: [
          spendableWallets.length ? `Usable wallets: ${spendableWallets.slice(0, 2).map((wallet) => `${wallet.name} ${money(wallet.balance)}`).join(" + ")}.` : "No spendable wallet was loaded.",
          protectedWallets.length ? `Protected wallets stay separate: ${protectedWallets.map((wallet) => wallet.name).join(", ")}.` : "No protected wallet was loaded.",
          afterPurchase < 0 ? "This purchase is bigger than spendable money." : `Wallet safety after purchase: ${money(afterPurchase)}.`,
        ],
      };
    case "budget":
      return {
        body: budget ? `${budget.title} has ${money(Math.max(0, remaining))} remaining before this purchase.` : `No exact ${purchase.inferredCategory || "category"} budget was found for this purchase.`,
        bullets: budget
          ? [
              `Purchase impact: ${percent(budgetUse)} of remaining budget room.`,
              `Remaining after purchase: ${money(Math.max(0, remaining - price))}.`,
              price > remaining ? "This would break the current category budget." : "This still fits the category budget.",
            ]
          : [
              "CLARA treats missing budget coverage as a caution signal.",
              "Create or assign a budget category before making this a habit.",
            ],
      };
    case "goals":
      return {
        body: goal ? `${goal.name} is currently at ${money(goal.savedAmount)} out of ${money(goal.targetAmount)}.` : "No savings goal was loaded for this purchase check.",
        bullets: goal
          ? [
              "This purchase should not slow the goal unless it is necessary.",
              `Price compared with saved goal amount: ${money(price)} vs ${money(goal.savedAmount)}.`,
              "Goal money should stay intentional, not accidental spending money.",
            ]
          : [
              "No active goal impact was available.",
              "CLARA still checks wallet, budget, emergency, schedule, and pattern.",
            ],
      };
    case "emergency":
      return {
        body: emergency ? `Emergency fund is ${money(emergency.savedAmount)} out of ${money(emergency.targetAmount)}.` : "No emergency fund was loaded for this check.",
        bullets: emergency
          ? [
              `Progress: ${emergency.targetAmount ? percent((toNumber(emergency.savedAmount) / toNumber(emergency.targetAmount)) * 100) : "Not available"}.`,
              "This should stay protected from wants and non-urgent purchases.",
              "If emergency money is needed for this item, the safer answer is to wait.",
            ]
          : [
              "Emergency protection could not be verified.",
              "CLARA avoids using missing emergency data as permission to spend.",
            ],
      };
    case "schedule":
      return {
        body: event ? `${event.title || "Upcoming event"}${event.date ? ` is scheduled on ${event.date}` : " is upcoming"}${eventAmount ? ` and may need ${money(eventAmount)}` : ""}.` : "No upcoming money-impact schedule was loaded for this check.",
        bullets: event
          ? [
              "Timing matters because upcoming events reduce flexibility.",
              eventAmount ? `This event competes with the ${money(price)} purchase.` : "No exact event cost was loaded.",
              "CLARA checks timing before giving the final decision.",
            ]
          : [
              "No schedule pressure was found.",
              "Final decision will rely more on wallet, budget, goals, emergency, and pattern.",
            ],
      };
    case "pattern":
      return {
        body: `CLARA found ${categoryExpenses.length} ${purchase.inferredCategory || "category"}-related purchase${categoryExpenses.length === 1 ? "" : "s"} this month totaling ${money(categorySpend)}.`,
        bullets: [
          memorySignal,
          context.mePageContext ? "The Me profile was available for this decision." : "No Me profile signal was available.",
          categoryExpenses.length ? "Repeated category activity raises the risk of impulse spending." : "No repeated category pattern was found this month.",
        ],
      };
    case "final":
      return {
        body: `CLARA combined wallet, budget, goals, emergency, schedule, and pattern before giving this decision.`,
        bullets: [
          budget ? `Budget room: ${money(Math.max(0, remaining))}.` : "Budget match was not available.",
          `Spendable after purchase: ${money(afterPurchase)}.`,
          `Safer move: ${fallbackSaferMoveFromContext(context)}.`,
        ],
      };
    default:
      return null;
  }
}

function fallbackSaferMoveFromContext(context = {}) {
  const purchase = context.purchaseSummary || {};
  const finance = context.financeContext || {};
  const price = toNumber(purchase.price);
  const budget = finance.matchingBudget;
  const remaining = toNumber(budget?.remaining);
  if (budget && price > remaining) return `wait or choose an option below ${money(Math.max(0, remaining))}`;
  if (budget && price >= remaining * 0.75) return `cap the purchase at ${money(price)} and avoid another ${purchase.inferredCategory || "similar"} purchase this week`;
  return "log it immediately if you proceed";
}

function cardKindFromEyebrow(text = "") {
  if (text.includes("01 / PURCHASE")) return "purchase";
  if (text.includes("02 / WALLET")) return "wallet";
  if (text.includes("03 / BUDGET")) return "budget";
  if (text.includes("04 / GOALS")) return "goals";
  if (text.includes("05 / EMERGENCY")) return "emergency";
  if (text.includes("06 / SCHEDULE")) return "schedule";
  if (text.includes("07 / PATTERN")) return "pattern";
  if (text.includes("08 / FINAL SUMMARY")) return "final";
  return "";
}

function renderBullets(items = []) {
  return `<ul class="clara-buy-check-card-bullets">${items
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function polishReportCards() {
  const report = document.querySelector("[data-clara-buy-check-report]");
  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__;
  if (!report || !context) return;

  report.querySelectorAll("article").forEach((article) => {
    if (article.dataset.claraContentPolished === "true") return;

    const eyebrow = clean(article.querySelector("p")?.textContent || "");
    const kind = cardKindFromEyebrow(eyebrow);
    const cardData = limitCardData(kind, buildCardData(kind, context));
    if (!cardData) return;

    const paragraphs = article.querySelectorAll("p");
    const body = paragraphs[1];
    const oldNote = paragraphs[2];

    if (body) body.textContent = cardData.body;
    if (oldNote) {
      oldNote.className = "clara-buy-check-card-points";
      oldNote.innerHTML = renderBullets(cardData.bullets);
    }

    article.dataset.claraContentPolished = "true";
  });
}

function installBuyCheckReportContentPolish() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_REPORT_CONTENT_POLISH_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_REPORT_CONTENT_POLISH_INSTALLED__ = true;

  const observer = new MutationObserver(() => polishReportCards());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  polishReportCards();
}

installBuyCheckReportContentPolish();
