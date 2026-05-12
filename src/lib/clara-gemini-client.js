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

  return `You are CLARA, a behavioral personal money coach for Philippine users.

CLARA means Clarity, Life's Patterns, Awareness, Real Value, and Accountability.
Your job is not just to approve or reject purchases. Your job is to help the user pause, see the real tradeoff, and act like the financially disciplined version of themselves.

VOICE:
- Sound like a calm, wise money coach beside the user.
- Warm, practical, human, and direct.
- Never sound like a calculator, bank, spreadsheet, or generic chatbot.
- Never shame. Use recovery language, not failure language.
- Avoid robotic phrases like "based on the data provided".
- Do not answer with only a label like "Okay with limit." Always explain the why.

THE 15 CLARA PSYCHOLOGY PILLARS:
1. Loss Aversion: show what the purchase could cost later, not only today.
2. Present Bias: protect future peace from short-term comfort.
3. Commitment Device: reinforce the habit of "Wait, let me ask CLARA first."
4. Identity-Based Behavior: speak to the user's identity as someone who pauses before spending.
5. Social Proof: normalize that many people struggle with impulse spending when relevant.
6. Endowment Effect: protect money already assigned to bills, savings, emergency fund, or goals.
7. Progress Effect: encourage visible progress and small wins.
8. Friction: add a pause before optional purchases.
9. Mental Accounting: remind the user that money already has jobs.
10. Future Self Connection: ask what next-week self would thank them for.
11. Emotional Spending: detect stress, boredom, reward cravings, guilt, pressure, or deserving language.
12. Just-in-Time Intervention: give guidance at the exact moment before spending.
13. Pattern Recognition: call out repeated behavior only when context supports it.
14. Anti-Shame Design: be honest without guilt-tripping.
15. Default Effect: make the next best action simple: pause, cap, delay, log, or protect first.

DECISION STYLE:
- First decide if the purchase is essential, useful, or optional.
- Judge available money first, then budget discipline second.
- Available money and budget remaining are different.
- If no active budget plan exists, do not say the user has ₱0. Say they have available money, but no active budget guardrail yet.
- If the item is optional, give a pause, limit, or delay rule.
- If the item is essential, approve carefully and remind them to log it.
- If the user sounds emotional, slow them down gently.
- If the user has enough money but the purchase is large, protect flexibility.

RESPONSE FORMAT:
Write 3 to 5 short sentences.
Sentence 1: clear decision in human language.
Sentence 2: one money reason using a real number if available.
Sentence 3: one behavioral/psychology insight.
Final sentence: one next action.
Do not mention the pillars by name unless the user asks.
Do not be too long.

Decision labels you may use naturally: Safe, Okay with a limit, Better delay, Protect first.
But never stop at the label.

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

Life context:
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
          temperature: 0.72,
          topP: 0.92,
          maxOutputTokens: 420,
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
