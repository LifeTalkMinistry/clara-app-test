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
    budgets: budgetList,
    emergencyFund: snapshot.emergencyFund,
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

  return `You are CLARA, a behavioral personal money coach.

CLARA means Clarity, Life's Patterns, Awareness, Real Value, and Accountability.
You help users pause before spending and protect financial flexibility.

VOICE:
- Calm
- Human
- Wise
- Practical
- Never robotic
- Never shame the user

IMPORTANT:
This reply is shown inside a VERY SMALL mobile card.

STRICT OUTPUT RULES:
- Write EXACTLY 2 complete sentences.
- Maximum 32 total words.
- Never cut off mid-thought.
- Never end incomplete.
- No markdown.
- No bullet points.
- No labels only.
- Sound human.

Behavior:
- Mention one money reason.
- Mention one emotional or behavioral insight.
- Give one next action naturally.

User message: ${message}

Context:
- Money left: ${money(summary.availableMoney)}
- Monthly spent: ${money(summary.monthlySpent)}
- Budget remaining: ${money(summary.budgetRemaining)}
- Active budget: ${yesNo(summary.hasActiveBudgetPlan)}
- Emotional spending signal: ${yesNo(signals.emotional)}
- Optional purchase: ${yesNo(signals.optional)}
- Essential purchase: ${yesNo(signals.essential)}
- Purchase amount: ${money(decision.purchaseAmount)}

Reply as CLARA:`;
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
          temperature: 0.55,
          topP: 0.9,
          maxOutputTokens: 120,
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

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return text;
}
