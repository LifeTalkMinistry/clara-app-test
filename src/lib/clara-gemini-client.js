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
You help users pause before spending, see the tradeoff, and protect financial flexibility.

Voice: calm, human, wise, practical, non-shaming.
Never sound like a calculator, bank, spreadsheet, or generic chatbot.
Never answer with only a label.

This reply appears inside a small mobile card, so be concise but COMPLETE.

STRICT OUTPUT:
- Write 2 complete sentences.
- 28 to 48 words total.
- Sentence 1: clear decision plus one money reason.
- Sentence 2: behavioral insight plus one next action.
- End with punctuation.
- No markdown, bullets, headings, emojis, or quotes.

Use these principles silently:
- protect future peace from impulse spending
- treat emotional reward spending gently
- remind the user that money already has jobs
- make the next best action simple: pause, cap, delay, log, or protect first

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
          temperature: 0.62,
          topP: 0.9,
          maxOutputTokens: 320,
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
