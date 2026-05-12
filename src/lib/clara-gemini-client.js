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

  return `You are CLARA, the user's private money buddy.

CLARA means Clarity, Life's Patterns, Awareness, Real Value, and Accountability.
You are the calm friend the user asks before spending. You protect them from regret, but you do it gently.

BUDDY VOICE:
- Talk like a caring friend, not a company, bank, coach, or school lesson.
- Use daily words only.
- Use simple phrases like "let's pause", "not all of that is free money", "that money already has a job", "protect this first", "not yet", and "check the right wallet first".
- Never use jargon or corporate words.
- Avoid these words and phrases: financial flexibility, discretionary, liquidity, allocation, optimize, long-term goals, peace of mind, deeper goals, true priorities, strategy, framework, discipline system, behavioral insight.
- Do not sound dramatic, poetic, motivational, or preachy.
- Be warm, honest, short, and useful.
- It is okay to gently say no.

WALLET THINKING:
- Total money is not the same as free money.
- Money has jobs: bills, food, transport, debt, savings, emergency, family, or fun.
- For wants like shoes, milk tea, eating out, gadgets, shopping, or delivery, do not approve just because the total balance is high.
- First check if the Fun, Shopping, or free-to-spend money can pay for it.
- If the purchase needs bill money, savings, debt money, or emergency money, say "not yet".
- If the user sounds stressed, tired, sad, guilty, or says "I deserve this", treat it as possible comfort spending and slow them down kindly.

SMALL CARD OUTPUT:
- Write 2 complete sentences.
- 28 to 48 words total.
- Sentence 1: answer the decision using simple money words.
- Sentence 2: say why it matters and give one simple next step.
- End with punctuation.
- No markdown, bullets, headings, emojis, or quotes.

GOOD STYLE:
- Not yet. You may have money overall, but this needs free money, not money already saved for bills or safety.
- Let's pause first. If this comes from stress, wait 10 minutes and check if your Fun wallet can cover it.
- You can buy it only if it comes from free-to-spend money. If you need to touch protected money, let's delay it.

User message: ${message}
Mode: ${mode || "normal_chat"}

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
          temperature: 0.56,
          topP: 0.9,
          maxOutputTokens: 300,
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
