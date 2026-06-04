function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

/*
  Buy Check card text capacity
  Based on the current mobile card size, the safe readable target is around
  380-430 total characters per card across body + bullets.

  These are maximum limits, not required lengths. Short data stays short, but
  CLARA can now use more of the card when helpful without creating oversized slides.
*/
const CARD_BODY_LIMITS = {
  purchase: 210,
  wallet: 205,
  budget: 200,
  goals: 200,
  emergency: 200,
  schedule: 210,
  pattern: 205,
  final: 220,
};

const CARD_BULLET_LIMITS = {
  purchase: 135,
  wallet: 135,
  budget: 135,
  goals: 135,
  emergency: 135,
  schedule: 135,
  pattern: 145,
  final: 145,
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
  return clampText(summary || text, 170);
}

function limitCardData(kind = "", cardData = {}) {
  const bodyLimit = CARD_BODY_LIMITS[kind] || 205;
  const bulletLimit = CARD_BULLET_LIMITS[kind] || 135;

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
        body: `CLARA is checking ${purchase.item || "this item"} as a ${purchase.inferredCategory || "purchase"} purchase for ${money(price)}. This first card confirms the item, price, and stated reason before judging if it fits the money plan.`,
        bullets: [
          `Reason given: ${purchase.reason || "Not specified"}. CLARA will treat the reason as context, not automatic permission to spend.`,
          `The price being tested is ${money(price)}, and every next card compares that amount with a different protection area.`,
          "The report checks wallet, budget, goals, emergency fund, schedule, and spending pattern before the final call.",
        ],
      };
    case "wallet":
      return {
        body: `Spendable wallets show ${money(spendable)} before this purchase and ${money(afterPurchase)} after it. This tells CLARA whether the item can be paid for without touching protected money.`,
        bullets: [
          spendableWallets.length ? `Usable wallets: ${spendableWallets.slice(0, 2).map((wallet) => `${wallet.name} ${money(wallet.balance)}`).join(" + ")}.` : "No spendable wallet was loaded, so CLARA cannot fully confirm cash safety.",
          protectedWallets.length ? `Protected wallets stay separate: ${protectedWallets.map((wallet) => wallet.name).join(", ")}.` : "No protected wallet was loaded, so CLARA keeps the decision cautious.",
          afterPurchase < 0 ? "This purchase is bigger than spendable money, so the safer action is to wait or reduce it." : `Wallet safety after purchase: ${money(afterPurchase)} remains visible after the decision.`,
        ],
      };
    case "budget":
      return {
        body: budget ? `${budget.title} has ${money(Math.max(0, remaining))} remaining before this purchase. CLARA compares the price against the category plan, not only the wallet balance.` : `No exact ${purchase.inferredCategory || "category"} budget was found for this purchase, so CLARA treats the item as less controlled.`,
        bullets: budget
          ? [
              `Purchase impact: ${percent(budgetUse)} of remaining budget room, based on the current category balance.`,
              `Remaining after purchase: ${money(Math.max(0, remaining - price))}. This shows the space left after saying yes.`,
              price > remaining ? "This would break the current category budget and should be delayed or reduced." : "This still fits the category budget, but the final card still checks other risks.",
            ]
          : [
              "Missing budget coverage is a caution signal because spending has no clear category boundary.",
              "Create or assign a budget category before allowing this purchase to become a habit.",
            ],
      };
    case "goals":
      return {
        body: goal ? `${goal.name} is currently at ${money(goal.savedAmount)} out of ${money(goal.targetAmount)}. CLARA checks whether this purchase slows down progress toward that target.` : "No savings goal was loaded for this purchase check, so CLARA cannot measure direct goal impact.",
        bullets: goal
          ? [
              "This purchase should not slow the goal unless it is necessary or clearly planned.",
              `Price compared with saved goal amount: ${money(price)} vs ${money(goal.savedAmount)}.`,
              "Goal money should stay intentional, not accidental spending money pulled into a quick decision.",
            ]
          : [
              "No active goal impact was available, so this card stays informational instead of approving the purchase.",
              "CLARA still checks wallet, budget, emergency, schedule, and pattern before the final call.",
            ],
      };
    case "emergency":
      return {
        body: emergency ? `Emergency fund is ${money(emergency.savedAmount)} out of ${money(emergency.targetAmount)}. CLARA checks if the purchase could pressure protected safety money.` : "No emergency fund was loaded for this check, so CLARA avoids treating missing safety data as permission to spend.",
        bullets: emergency
          ? [
              `Progress: ${emergency.targetAmount ? percent((toNumber(emergency.savedAmount) / toNumber(emergency.targetAmount)) * 100) : "Not available"}. This shows how much safety is already built.`,
              "Emergency money should stay protected from wants and non-urgent purchases.",
              "If emergency money is needed for this item, the safer answer is to wait or choose a smaller option.",
            ]
          : [
              "Emergency protection could not be verified, so CLARA keeps the decision conservative.",
              "CLARA avoids using missing emergency data as permission to spend.",
            ],
      };
    case "schedule":
      return {
        body: event ? `${event.title || "Upcoming event"}${event.date ? ` is scheduled on ${event.date}` : " is upcoming"}${eventAmount ? ` and may need ${money(eventAmount)}` : ""}. Timing matters because future obligations reduce spending flexibility.` : "No upcoming money-impact schedule was loaded for this check, so CLARA relies more on wallet, budget, goals, emergency, and pattern.",
        bullets: event
          ? [
              "Timing matters because upcoming events can make today's purchase feel affordable but risky later.",
              eventAmount ? `This event competes with the ${money(price)} purchase and should be protected first.` : "No exact event cost was loaded, so CLARA checks timing but avoids guessing the amount.",
              "CLARA checks timing before the final decision so the user does not spend only based on today's feeling.",
            ]
          : [
              "No schedule pressure was found, which lowers timing risk but does not automatically approve the purchase.",
              "Final decision will rely more on wallet, budget, goals, emergency, and pattern.",
            ],
      };
    case "pattern":
      return {
        body: `CLARA found ${categoryExpenses.length} ${purchase.inferredCategory || "category"}-related purchase${categoryExpenses.length === 1 ? "" : "s"} this month totaling ${money(categorySpend)}. This checks whether the item fits a pattern or a one-time need.`,
        bullets: [
          memorySignal,
          context.mePageContext ? "The Me profile was available, so CLARA can compare the purchase with the user's stated behavior and priorities." : "No Me profile signal was available, so CLARA only uses transaction and money context here.",
          categoryExpenses.length ? "Repeated category activity raises the risk of impulse spending and makes this purchase worth slowing down." : "No repeated category pattern was found this month, so this looks less repetitive.",
        ],
      };
    case "final":
      return {
        body: `CLARA combined wallet, budget, goals, emergency, schedule, and pattern before giving this decision. The final call should protect money stability, not just answer yes or no.`,
        bullets: [
          budget ? `Budget room: ${money(Math.max(0, remaining))}. This is the strongest category boundary for the decision.` : "Budget match was not available, so the final answer should stay cautious.",
          `Spendable after purchase: ${money(afterPurchase)}. This is the visible wallet result if the user proceeds.`,
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
