function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

/*
  Buy Check card text capacity
  Based on the current mobile card size, the safe readable target is around
  380-430 total characters per card across body + bullets.

  These are maximum limits, not required lengths. Short data stays short, but
  Clara can now use more of the card when helpful without creating oversized slides.
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

  if (!text || text.length < 8) return "I did not find a strong spending pattern for this check.";
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

function purchaseFeelingText(reason = "") {
  const text = clean(reason).toLowerCase();
  if (!text) return "I hear you. You are interested in this, so I’ll check it fairly before saying yes or no.";
  if (/reward|treat|deserve|celebrate|gift|birthday|stress|tired|drained|sad|happy|excited/i.test(text)) return `I hear the feeling behind this: ${reason}. That feeling is valid, but I still need to protect your money plan.`;
  if (/health|medical|fitness|wellness|comfort|pain|need/i.test(text)) return `I hear that this may feel connected to your wellbeing: ${reason}. I’ll check if the timing and cost are healthy too.`;
  if (/work|job|school|study|business|career/i.test(text)) return `I hear that this may feel practical: ${reason}. I’ll check if it supports you without hurting the plan.`;
  if (/want|like|nice|cool|style|fashion/i.test(text)) return `I hear the want behind this: ${reason}. Wanting it is okay, but I’ll check if now is the right time.`;
  return `I hear your reason: ${reason}. I’ll respect that, then compare it with your real money context.`;
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
        body: `You want to buy ${purchase.item || "this item"} for ${money(price)}. ${purchaseFeelingText(purchase.reason)}`,
        bullets: [
          `I’m reading this as a ${purchase.inferredCategory || "purchase"} purchase, so I won’t judge it by emotion alone.`,
          `I’ll test ${money(price)} against your wallet, budget, goals, emergency fund, schedule, and pattern.`,
          "This card is me acknowledging you first. The next cards are where I show the money proof.",
        ],
      };
    case "wallet":
      return {
        body: `I can see ${money(spendable)} in spendable wallets before this purchase. After buying, you would have ${money(afterPurchase)} left in visible spendable money.`,
        bullets: [
          spendableWallets.length ? `Your usable wallets include ${spendableWallets.slice(0, 2).map((wallet) => `${wallet.name} ${money(wallet.balance)}`).join(" + ")}.` : "I could not confirm a spendable wallet, so I need to stay cautious.",
          protectedWallets.length ? `I’m keeping these protected: ${protectedWallets.map((wallet) => wallet.name).join(", ")}.` : "I do not see a protected wallet signal here, so I won’t assume extra safety.",
          afterPurchase < 0 ? "This is bigger than your spendable money, so my safer move is to wait or reduce it." : `Your wallet safety after this would be ${money(afterPurchase)}.`,
        ],
      };
    case "budget":
      return {
        body: budget ? `Your ${budget.title} budget has ${money(Math.max(0, remaining))} left before this purchase. I’m checking the category plan, not just whether cash exists.` : `I did not find an exact ${purchase.inferredCategory || "category"} budget for this, so I need to treat it as less controlled.`,
        bullets: budget
          ? [
              `This would use ${percent(budgetUse)} of your remaining budget room in this category.`,
              `After buying, that category would have ${money(Math.max(0, remaining - price))} left.`,
              price > remaining ? "This would break your current category budget, so I’d delay or reduce it." : "This fits the category budget, but I still need to check the other risks.",
            ]
          : [
              "Without a matching budget, I cannot clearly see the boundary for this spending.",
              "I’d rather you assign a category before this becomes a repeated habit.",
            ],
      };
    case "goals":
      return {
        body: goal ? `Your goal, ${goal.name}, is at ${money(goal.savedAmount)} out of ${money(goal.targetAmount)}. I’m checking if this purchase could slow that progress.` : "I did not find a savings goal for this check, so I cannot measure direct goal impact.",
        bullets: goal
          ? [
              "I don’t want this purchase to slow your goal unless it is necessary or clearly planned.",
              `The price is ${money(price)} compared with ${money(goal.savedAmount)} already saved.`,
              "Your goal money should stay intentional, not become accidental spending money.",
            ]
          : [
              "Since no active goal was loaded, I’ll rely more on wallet, budget, emergency, schedule, and pattern.",
              "Missing goal data does not automatically mean this is safe to buy.",
            ],
      };
    case "emergency":
      return {
        body: emergency ? `Your emergency fund is ${money(emergency.savedAmount)} out of ${money(emergency.targetAmount)}. I’m checking if this purchase could pressure your safety money.` : "I did not find emergency fund data here, so I won’t treat missing safety data as permission to spend.",
        bullets: emergency
          ? [
              `Your emergency progress is ${emergency.targetAmount ? percent((toNumber(emergency.savedAmount) / toNumber(emergency.targetAmount)) * 100) : "not available"}.`,
              "I want your emergency money protected from wants and non-urgent purchases.",
              "If this needs emergency money, my safer answer is to wait or choose a smaller option.",
            ]
          : [
              "Because I could not verify emergency protection, I’ll keep this decision conservative.",
              "I won’t use missing emergency data as a reason to approve the purchase.",
            ],
      };
    case "schedule":
      return {
        body: event ? `I see ${event.title || "an upcoming event"}${event.date ? ` on ${event.date}` : " coming up"}${eventAmount ? ` that may need ${money(eventAmount)}` : ""}. Timing matters because future obligations reduce flexibility.` : "I don’t see upcoming money-impact schedule pressure, so I’ll lean more on wallet, budget, goals, emergency, and pattern.",
        bullets: event
          ? [
              "Something can feel affordable today but become stressful when the next obligation arrives.",
              eventAmount ? `This event competes with the ${money(price)} purchase, so I want it protected first.` : "I do not have the exact event cost, so I’ll check timing without guessing the amount.",
              "I’m checking timing so you don’t decide only from today’s feeling.",
            ]
          : [
              "No schedule pressure lowers timing risk, but it does not automatically make this a yes.",
              "I’ll still check the rest of your money environment before the final call.",
            ],
      };
    case "pattern":
      return {
        body: `I found ${categoryExpenses.length} ${purchase.inferredCategory || "category"}-related purchase${categoryExpenses.length === 1 ? "" : "s"} this month totaling ${money(categorySpend)}. I’m checking if this is a pattern or a one-time need.`,
        bullets: [
          memorySignal,
          context.mePageContext ? "I also have your Me profile, so I can compare this with your stated behavior and priorities." : "I do not have a Me profile signal here, so I’ll rely on transaction and money context.",
          categoryExpenses.length ? "Repeated activity in this category raises impulse risk, so I want you to slow down first." : "I don’t see repeated category activity this month, so this looks less repetitive.",
        ],
      };
    case "final":
      return {
        body: `I combined your wallet, budget, goals, emergency fund, schedule, and pattern before giving this decision. My goal is to protect your stability, not just say yes or no.`,
        bullets: [
          budget ? `Your budget room is ${money(Math.max(0, remaining))}. This is the strongest category boundary I can see.` : "I did not find a budget match, so I need the final answer to stay cautious.",
          `If you proceed, your spendable money after purchase would be ${money(afterPurchase)}.`,
          `My safer move: ${fallbackSaferMoveFromContext(context)}.`,
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
