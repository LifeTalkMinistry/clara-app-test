import { buildClaraFinanceSnapshot } from "./clara-local-brain";

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-1.5-flash";

function getGeminiApiKey() {
  const env = import.meta?.env || {};
  return (
    env.VITE_GEMINI_API_KEY ||
    env.VITE_GOOGLE_GEMINI_API_KEY ||
    env.VITE_GOOGLE_AI_API_KEY ||
    env.VITE_GOOGLE_GENERATIVE_AI_API_KEY ||
    env.VITE_CLARA_GEMINI_API_KEY ||
    env.VITE_AI_API_KEY ||
    ""
  );
}

function getGeminiModel() {
  const env = import.meta?.env || {};
  return env.VITE_GEMINI_MODEL || env.VITE_CLARA_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
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

function summarizeSnapshot(context = {}) {
  const snapshot = buildClaraFinanceSnapshot(context);
  const budgetList = Array.isArray(snapshot.budgets) ? snapshot.budgets : [];
  const activeBudgetRows = budgetList.filter((budget) => isPositiveNumber(budget?.allocated));
  const hasActiveBudgetPlan = isPositiveNumber(snapshot.budgetAllocated) || activeBudgetRows.length > 0;
  const budgetState = hasActiveBudgetPlan
    ? "active budget plan loaded"
    : "no active budget plan loaded; budget remaining may show ₱0 but this is not the same as having ₱0 money left";

  const topCategories = Object.entries(snapshot.spendingByCategory || {})
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
    .slice(0, 5)
    .map(([category, amount]) => `${category}: ${money(amount)}`)
    .join(", ");

  const budgets = budgetList
    .slice(0, 8)
    .map((budget) => {
      const name = budget.name || budget.category || "Budget";
      return `${name}: allocated ${money(budget.allocated)}, spent ${money(budget.spent)}, remaining ${money(budget.remaining)}`;
    })
    .join(" | ");

  const wallets = (snapshot.wallets || [])
    .slice(0, 6)
    .map((wallet) => `${wallet.name}: ${money(wallet.balance)}`)
    .join(", ");

  const goals = (snapshot.savingsGoals || [])
    .slice(0, 5)
    .map((goal) => `${goal.name}: saved ${money(goal.saved)} / target ${money(goal.target)}`)
    .join(" | ");

  return {
    hasAnyData: snapshot.hasAnyData,
    availableMoney: snapshot.availableMoney,
    monthlySpent: snapshot.monthlySpent,
    budgetAllocated: snapshot.budgetAllocated,
    budgetSpent: snapshot.budgetSpent,
    budgetRemaining: snapshot.budgetRemaining,
    hasActiveBudgetPlan,
    budgetState,
    plannedSpent: snapshot.plannedSpent,
    unplannedSpent: snapshot.unplannedSpent,
    wantsSpent: snapshot.wantsSpent,
    needsSpent: snapshot.needsSpent,
    topCategories,
    budgets,
    wallets,
    savings: goals,
    emergencyFund: snapshot.emergencyFund,
  };
}

function buildGeminiPrompt({ message, context, mode }) {
  const summary = summarizeSnapshot(context);

  return `You are CLARA, a personal money coach. Your brand voice is calm, direct, practical, and emotionally intelligent.

Your job is not to sound generic. Help the user pause before spending and make a better decision.

Core finance definitions:
- Available money / money left = actual visible money available to the user.
- Budget remaining = planned spending allowance from an active budget plan.
- These are not the same.
- If Budget remaining is ₱0 because there is no active budget plan, do NOT say the user only has ₱0 left.
- If there is no active budget plan, say: "You have [available money] money left, but no active budget plan is loaded yet."
- For purchase decisions, judge available money first, then budget discipline second.
- Do not reject a small purchase just because budget remaining is ₱0 when available money is positive and no active budget plan exists.

Purchase decision order:
1. Check if the user has enough available money.
2. Check whether an active budget plan exists.
3. If no budget plan exists, treat the purchase as affordable vs wise, not budget-approved vs rejected.
4. Compare the purchase amount against available money.
5. Give one decision: Safe, Okay with limit, Better delay, or Not recommended.

Rules:
- Use the user's financial context below.
- Do not invent balances, budgets, transactions, or dates.
- Keep the reply short: 2 to 5 sentences max.
- Do not moralize. Do not shame. Sound like a calm coach.
- Mention one concrete number from context when possible.
- End with one clear next action.

Mode: ${mode || "normal_chat"}
User message: ${message}

Financial context:
- Has usable finance data: ${summary.hasAnyData ? "yes" : "no"}
- Available money / money left: ${money(summary.availableMoney)}
- This month spent: ${money(summary.monthlySpent)}
- Active budget plan: ${summary.hasActiveBudgetPlan ? "yes" : "no"}
- Budget state: ${summary.budgetState}
- Budget allocated: ${money(summary.budgetAllocated)}
- Budget spent: ${money(summary.budgetSpent)}
- Budget remaining: ${money(summary.budgetRemaining)}
- Planned spent: ${money(summary.plannedSpent)}
- Unplanned spent: ${money(summary.unplannedSpent)}
- Needs spent: ${money(summary.needsSpent)}
- Wants spent: ${money(summary.wantsSpent)}
- Wallets: ${summary.wallets || "none loaded"}
- Budgets: ${summary.budgets || "none loaded"}
- Savings goals: ${summary.savings || "none loaded"}
- Top spending categories: ${summary.topCategories || "none loaded"}
- Emergency fund: saved ${money(summary.emergencyFund?.saved)}, target ${money(summary.emergencyFund?.target)}

Reply as CLARA:`;
}

export function hasGeminiConfig() {
  return Boolean(getGeminiApiKey());
}

export async function generateClaraGeminiReply({ message, context = {}, mode = null, signal } = {}) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your environment.");
  }

  const model = getGeminiModel();
  const prompt = buildGeminiPrompt({ message, context, mode });
  const response = await fetch(
    `${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.45,
          topP: 0.9,
          maxOutputTokens: 220,
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
    .trim();

  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}
