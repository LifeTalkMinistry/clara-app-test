import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

function getGeminiApiKey() {
  return (
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ||
    import.meta.env.VITE_GOOGLE_AI_API_KEY ||
    import.meta.env.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
    import.meta.env.VITE_CLARA_GEMINI_API_KEY ||
    import.meta.env.VITE_AI_API_KEY ||
    ""
  );
}

function getGeminiModel() {
  return (
    import.meta.env.VITE_GEMINI_MODEL ||
    import.meta.env.VITE_CLARA_GEMINI_MODEL ||
    DEFAULT_GEMINI_MODEL
  );
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "unknown";
  return `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function isPositiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0;
}

function extractUserClaimedTotalMoney(text = "") {
  const clean = String(text || "").replace(/,/g, "");
  const patterns = [
    /(?:i\s*(?:still\s*)?have|i\s*currently\s*have|my\s*wallet\s*(?:has|have)|total\s*(?:money|wallets?|balance)|money\s*left)\D{0,40}(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/i,
    /(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)\D{0,28}(?:total|across\s+my\s+wallets|in\s+my\s+wallets|money\s+left)/i,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    const amount = match ? Number(match[1]) : null;
    if (Number.isFinite(amount) && amount > 0) return amount;
  }

  return null;
}

function isMeaningfulMoneyMismatch(claimedAmount, actualAmount) {
  if (!isPositiveNumber(claimedAmount) || !isPositiveNumber(actualAmount)) return false;
  const difference = Math.abs(Number(claimedAmount) - Number(actualAmount));
  return difference >= 500 && difference / Math.max(Number(actualAmount), 1) >= 0.15;
}

function shortList(items = [], formatter, empty = "none loaded") {
  const rows = Array.isArray(items) ? items : [];
  const text = rows
    .slice(0, 5)
    .map((item) => formatter(item))
    .filter(Boolean)
    .join("; ");

  return text || empty;
}

function summarizeSnapshot(context = {}) {
  const snapshot = buildClaraFinanceSnapshot(context);
  const budgetList = Array.isArray(snapshot.budgets) ? snapshot.budgets : [];
  const savingsList = Array.isArray(snapshot.savingsGoals) ? snapshot.savingsGoals : [];
  const walletList = Array.isArray(snapshot.wallets) ? snapshot.wallets : [];
  const walletTransactionList = Array.isArray(snapshot.walletTransactions)
    ? snapshot.walletTransactions
    : [];
  const activeBudgetRows = budgetList.filter((budget) => isPositiveNumber(budget?.allocated));
  const hasActiveBudgetPlan = isPositiveNumber(snapshot.budgetAllocated) || activeBudgetRows.length > 0;
  const hasEmergencyData =
    isPositiveNumber(snapshot.emergencyFund?.saved) ||
    isPositiveNumber(snapshot.emergencyFund?.target) ||
    isPositiveNumber(snapshot.emergencyFund?.monthsCovered);
  const hasSavingsData =
    savingsList.length > 0 ||
    isPositiveNumber(snapshot.savingsSaved) ||
    isPositiveNumber(snapshot.savingsTarget);

  const cardInventory = [
    `Wallet: ${walletList.length ? `${walletList.length} wallet(s) loaded` : snapshot.availableMoney !== null ? "total money loaded only" : "not loaded"}`,
    `Budget: ${hasActiveBudgetPlan ? "active budget loaded" : "no active budget loaded"}`,
    `Emergency: ${hasEmergencyData ? "emergency/survival data loaded" : "not loaded"}`,
    `Savings: ${hasSavingsData ? "savings data loaded" : "not loaded"}`,
    "Debt: not connected to live card data yet",
    "Investment: not connected to live card data yet",
  ].join(" | ");

  return {
    hasAnyData: snapshot.hasAnyData,
    availableMoney: snapshot.availableMoney,
    monthlySpent: snapshot.monthlySpent,
    budgetAllocated: snapshot.budgetAllocated,
    budgetSpent: snapshot.budgetSpent,
    budgetRemaining: snapshot.budgetRemaining,
    hasActiveBudgetPlan,
    plannedSpent: snapshot.plannedSpent,
    unplannedSpent: snapshot.unplannedSpent,
    wantsSpent: snapshot.wantsSpent,
    needsSpent: snapshot.needsSpent,
    wallets: walletList,
    walletCount: walletList.length,
    walletTransactions: walletTransactionList,
    walletTransactionCount: walletTransactionList.length,
    walletsSummary: shortList(
      walletList,
      (wallet) => `${wallet.name || "Wallet"}: ${money(wallet.balance)}`,
      snapshot.availableMoney !== null ? `Total visible money: ${money(snapshot.availableMoney)}` : "none loaded"
    ),
    budgets: budgetList,
    budgetSummary: shortList(
      budgetList,
      (budget) => {
        const name = budget.name || budget.category || "Budget";
        return `${name}: set ${money(budget.allocated)}, spent ${money(budget.spent)}, left ${money(budget.remaining)}`;
      },
      hasActiveBudgetPlan ? "active budget loaded" : "no active budget loaded"
    ),
    savingsGoals: savingsList,
    savingsSaved: snapshot.savingsSaved,
    savingsTarget: snapshot.savingsTarget,
    savingsSummary: shortList(
      savingsList,
      (goal) => `${goal.name || "Goal"}: saved ${money(goal.saved)} of ${money(goal.target)}`,
      hasSavingsData
        ? `Savings total: ${money(snapshot.savingsSaved)} of ${money(snapshot.savingsTarget)}`
        : "none loaded"
    ),
    emergencyFund: snapshot.emergencyFund,
    hasEmergencyData,
    cardInventory,
  };
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function summarizeDecisionContext(message, context) {
  const enriched = buildContextForGeminiPrompt({ message, financeContext: context });

  return {
    profile: enriched.profile || {},
    purchaseAmount: enriched.purchaseAmount,
    purchaseSignals: enriched.purchaseSignals || {},
  };
}

function buildGeminiPrompt({ message, context, mode }) {
  const summary = summarizeSnapshot(context);
  const decision = summarizeDecisionContext(message, context);
  const signals = decision.purchaseSignals || {};
  const claimedTotalMoney = extractUserClaimedTotalMoney(message);
  const moneyClaimMismatch = isMeaningfulMoneyMismatch(
    claimedTotalMoney,
    summary.availableMoney
  );

  return `You are CLARA, the user's private money buddy.

Speak like a caring friend the user checks with before spending. Be warm, simple, direct, and useful. Do not sound like a bank, school lesson, finance seminar, therapist, or motivational speaker.

Use daily words only. Avoid jargon and corporate words like financial flexibility, liquidity, allocation, optimize, strategy, framework, and behavioral insight.

Grounding rule:
- Use only the finance context below.
- Do not invent wallet names, savings goals, debt, investment, income, or budget categories.
- If a card is not connected or not loaded, say that simply.
- If the user asks what cards you can see, answer with the card inventory and mention what still looks disconnected.

Sync rule:
- Trust the app wallet/card data first, not the user's claimed amount.
- If the user claims they have more money than CLARA currently sees, gently correct it before giving spending advice.
- Say something like: Hmm, I only see ₱X in your wallet right now. If you really have ₱Y, update your wallet first so we stay synced.
- Remind the user to update wallets, expenses, transfers, and budget changes before asking for spending approval.
- Never approve a purchase based only on money the user says they have if it is not visible in CLARA.
- Keep this reminder friendly, not scolding.

Wallet thinking:
- Total money is not the same as free money.
- Money has jobs: bills, food, transport, debt, savings, emergency, family, or fun.
- Wants like shoes, milk tea, eating out, gadgets, shopping, and delivery need free-to-spend money.
- If a want needs bill money, savings money, debt money, or emergency money, say not yet.
- If the user sounds stressed, tired, sad, guilty, or says they deserve it, treat it as comfort spending and slow them down kindly.
- CLARA is not anti-fun. If important money is covered and free-to-spend money can cover it, allow it warmly.

Budget thinking:
- Treat the category budget as the first warning, even when total wallet money looks higher.
- If a purchase is bigger than the category money left, say what it might touch: food, bills, savings, emergency money, or other important money.
- Praise the check-in habit with simple words like: Good thing you checked first.
- Give one safe next move: wait until payday, save for it, lower the price, use fun money only, or update the budget first.
- Do not only block the user. Guide the next safe move.

Emotional spending style:
- When the user says life is hard, they are tired, or they just want to feel happy, acknowledge that first.
- Do not give a plain wellness line like "see how you feel later" unless paired with a money reason.
- Use protective lines like: I do not want this hard week to become another stress next week.
- Use simple truth lines like: You deserve rest, not a purchase that might make tomorrow heavier.
- Offer a smaller safer reward when possible: small food, a walk, rest, or a cheaper treat from fun money.
- Stay gentle, but do not let emotion force a bad money choice.

Vary your opening. Do not start every answer with the same phrase. You may naturally use: Hmm, I get why you want it, I would slow down on this one, If this comes from fun money, Good thing you checked first, or Not yet, friend.

Small card output:
- For purchase decisions, write 2 complete sentences and keep it short.
- For card visibility or dashboard-data questions, you may write up to 4 short sentences so the answer is complete.
- If the user's claimed money does not match CLARA's visible wallet data, the FIRST sentence must mention the mismatch and syncing reminder.
- End with punctuation.
- No markdown, bullets, headings, emojis, or quotes.

User message: ${message}
Mode: ${mode || "normal_chat"}

User claimed total money:
- Claimed visible/total money: ${money(claimedTotalMoney)}
- Current CLARA visible wallet money: ${money(summary.availableMoney)}
- Claim mismatch with app data: ${yesNo(moneyClaimMismatch)}

Finance card inventory:
- ${summary.cardInventory}

Wallet card:
- Money left / visible total: ${money(summary.availableMoney)}
- Wallet count: ${summary.walletCount}
- Wallet details: ${summary.walletsSummary}
- Recent wallet activity count: ${summary.walletTransactionCount}

Budget card:
- Active budget: ${yesNo(summary.hasActiveBudgetPlan)}
- Budget set: ${money(summary.budgetAllocated)}
- Budget spent: ${money(summary.budgetSpent)}
- Budget left: ${money(summary.budgetRemaining)}
- Budget details: ${summary.budgetSummary}

Emergency fund card:
- Has emergency data: ${yesNo(summary.hasEmergencyData)}
- Saved: ${money(summary.emergencyFund?.saved)}
- Target / survival number: ${money(summary.emergencyFund?.target)}
- Months covered: ${summary.emergencyFund?.monthsCovered ?? "unknown"}

Savings goals card:
- Savings goals count: ${summary.savingsGoals.length}
- Savings saved total: ${money(summary.savingsSaved)}
- Savings target total: ${money(summary.savingsTarget)}
- Savings details: ${summary.savingsSummary}

Spending context:
- Monthly spent: ${money(summary.monthlySpent)}
- Planned spent: ${money(summary.plannedSpent)}
- Unplanned spent: ${money(summary.unplannedSpent)}
- Needs spent: ${money(summary.needsSpent)}
- Wants spent: ${money(summary.wantsSpent)}

Cards not yet live:
- Debt card: no live debt/obligation data is passed to CLARA yet.
- Investment card: no live investment data is passed to CLARA yet.

Purchase signal:
- Emotional spending signal: ${yesNo(signals.emotional)}
- Optional purchase: ${yesNo(signals.optional)}
- Essential purchase: ${yesNo(signals.essential)}
- Purchase amount: ${money(decision.purchaseAmount)}

Reply as CLARA:`;
}

function looksIncompleteReply(text) {
  const clean = String(text || "").trim();
  if (clean.length < 20) return true;
  if (!/[.!?]$/.test(clean)) return true;
  if (/\b(and|but|because|so|to|for|with|of|the|a|an|is|are|can|should|let)$/i.test(clean)) return true;
  return false;
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, signal } = {}) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const model = getGeminiModel();
  const prompt = buildGeminiPrompt({ message, context, mode });

  const response = await fetch(
    `${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.62,
          topP: 0.9,
          maxOutputTokens: 420,
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  if (looksIncompleteReply(text)) {
    throw new Error(`Gemini returned an incomplete response: ${text}`);
  }

  return text;
}
