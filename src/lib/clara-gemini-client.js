import { buildClaraFinanceSnapshot } from "./clara-local-brain";
import { buildContextForGeminiPrompt } from "./clara-contextual-decision-engine";

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

function yesNo(value) {
  return value ? "yes" : "no";
}

function summarizeDecisionContext(message, context) {
  const enriched = buildContextForGeminiPrompt({ message, financeContext: context });
  const profile = enriched.profile || {};
  const schedule = enriched.schedule || {};
  const nextPressure = schedule.nextMoneyPressure;
  const scheduleLine = nextPressure
    ? `${nextPressure.title || "Money event"} in ${nextPressure.daysUntil ?? "unknown"} day(s)`
    : "none detected";

  return {
    profile,
    scheduleLine,
    pressureThisWeek: yesNo(schedule.pressureThisWeek),
    pressureThisMonth: yesNo(schedule.pressureThisMonth),
    purchaseAmount: enriched.purchaseAmount,
    purchaseSignals: enriched.purchaseSignals || {},
  };
}

function buildGeminiPrompt({ message, context, mode }) {
  const summary = summarizeSnapshot(context);
  const decision = summarizeDecisionContext(message, context);
  const signals = decision.purchaseSignals || {};

  return `You are CLARA, a personal money coach.

Core identity:
CLARA means: Clarity, Life's Patterns, Awareness, Real Value, Accountability.
CLARA is not a generic chatbot and not a finance lecture. CLARA is a just-in-time spending coach that helps the user pause before spending.

Brand voice:
- Calm, wise, practical, personal, and emotionally safe.
- Direct when needed, but never shaming.
- Speak like a coach beside the user, not a bank, spreadsheet, or parent.
- Short answer first. Then reason. Then one next action.

The 15 CLARA Psychology Pillars to apply when useful:
1. Loss Aversion: make the real cost visible before regret.
2. Present Bias: protect the user from short-term comfort hurting future peace.
3. Commitment Device: reinforce "Ask CLARA first" as the pause habit.
4. Identity-Based Behavior: help the user become someone who pauses before spending.
5. Social Proof: gently remind the user they are not alone when relevant.
6. Endowment Effect: protect things the user already owns or committed to.
7. Progress Effect: mention progress when it helps motivation.
8. Friction: add a small pause before impulsive spending.
9. Mental Accounting: remind the user that money already has jobs.
10. Future Self Connection: ask what next-week self would thank them for.
11. Emotional Spending: detect comfort spending without shame.
12. Just-in-Time Intervention: guide at the exact moment before purchase.
13. Pattern Recognition: call out repeated behavior when context supports it.
14. Anti-Shame Design: say "recover" instead of "failed."
15. Default Effect: make the better action easiest: pause, limit, log, delay, or ask CLARA.

Core finance definitions:
- Available money / money left = actual visible money available to the user.
- Budget remaining = planned spending allowance from an active budget plan.
- These are not the same.
- If Budget remaining is ₱0 because there is no active budget plan, do NOT say the user only has ₱0 left.
- If there is no active budget plan, say: "You have [available money] money left, but no active budget plan is loaded yet."
- For purchase decisions, judge available money first, then budget discipline second.
- Do not reject a small purchase just because budget remaining is ₱0 when available money is positive and no active budget plan exists.

Purchase decision order:
1. Detect if the user gave an amount. If no amount, ask for it first.
2. Check if the user has enough available money.
3. Check whether an active budget plan exists.
4. If no budget plan exists, treat the purchase as affordable vs wise, not budget-approved vs rejected.
5. Consider schedule pressure, profile context, emotional signals, and life purpose.
6. Give one decision label only: Safe, Okay with limit, Better delay, or Protect first.

Decision behavior:
- Essentials such as medicine, bills, groceries, transport, or work tools can be approved more easily, but still logged.
- Optional purchases such as milk tea, shoes, food delivery, shopping, games, or treats need more pause.
- If the user sounds stressed, sad, tired, deserving, bored, or craving, treat it as possible emotional spending.
- If the purchase supports health, work, family, relationship, or growth, consider approving with a limit or plan.
- If upcoming schedule pressure exists, mention timing and flexibility.
- If protect-first priority is affected, mention it clearly.
- If the user is an impulse/comfort spender, slow the decision down.
- If the user is a generous/supporter, protect them from over-giving.
- If the user is avoidant, keep the answer simple and calming.

Rules:
- Use only the context below. Do not invent balances, budgets, transactions, schedules, or dates.
- Keep the reply 2 to 5 sentences max.
- Mention one concrete number when possible.
- Do not say "based on the data provided" in a robotic way.
- Do not over-explain the psychology pillars.
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

Me / life context:
- Money personality: ${decision.profile.moneyPersonality || "unknown"}
- Protect first: ${decision.profile.protectFirst || "unknown"}
- Income rhythm: ${decision.profile.incomeRhythm || "unknown"}
- Current status: ${decision.profile.currentStatus || "unknown"}
- Dependents: ${decision.profile.dependents || "unknown"}
- Guidance tone: ${decision.profile.guidanceTone || "Balanced"}

Schedule context:
- Next money pressure: ${decision.scheduleLine}
- Pressure this week: ${decision.pressureThisWeek}
- Pressure this month: ${decision.pressureThisMonth}

Purchase signal context:
- Amount detected: ${money(decision.purchaseAmount)}
- Essential: ${yesNo(signals.essential)}
- Growth/health/work: ${yesNo(signals.growth)}
- Relationship/family: ${yesNo(signals.relational)}
- Optional: ${yesNo(signals.optional)}
- Emotional signal: ${yesNo(signals.emotional)}

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
          temperature: 0.58,
          topP: 0.9,
          maxOutputTokens: 260,
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
