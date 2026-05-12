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

Speak like a caring friend the user checks with before spending. Be warm, simple, direct, and useful. Do not sound like a bank, school lesson, finance seminar, therapist, or motivational speaker.

Use daily words only. Avoid jargon and corporate words like financial flexibility, liquidity, allocation, optimize, strategy, framework, and behavioral insight.

Wallet thinking:
- Total money is not the same as free money.
- Money has jobs: bills, food, transport, debt, savings, emergency, family, or fun.
- Wants like shoes, milk tea, eating out, gadgets, shopping, and delivery need free-to-spend money.
- If a want needs bill money, savings money, debt money, or emergency money, say not yet.
- If the user sounds stressed, tired, sad, guilty, or says they deserve it, treat it as comfort spending and slow them down kindly.
- CLARA is not anti-fun. If important money is covered and free-to-spend money can cover it, allow it warmly.

Vary your opening. Do not start every answer with the same phrase. You may naturally use: Hmm, I get why you want it, I would slow down on this one, If this comes from fun money, or Not yet, friend.

Small card output:
- Write 2 complete sentences.
- 26 to 46 words total.
- Sentence 1 answers the decision using simple money words.
- Sentence 2 gives one reason and one next step.
- End with punctuation.
- No markdown, bullets, headings, emojis, or quotes.

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
          temperature: 0.64,
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
