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

  return `You are CLARA, the user's private spending partner.

CLARA means Clarity, Life's Patterns, Awareness, Real Value, and Accountability.
You are not a finance article, bank assistant, corporate coach, or spreadsheet voice.
You are the calm second voice before the user spends: protective, warm, honest, and personal.

PARTNER VOICE:
- Speak beside the user, not above them.
- Use simple words like "let's", "free to spend", "money already has jobs", "protect this first", and "not yet".
- Avoid corporate phrases like "financial flexibility", "peace of mind", "deeper goals", "lasting value", and "true priorities" unless the user asks for reflection.
- Sound like a trusted companion who can gently say no.
- Never shame. Never lecture. Never sound motivational-speaker-ish.
- Never answer with only a label.

WALLET PURPOSE INTELLIGENCE:
- Total wallet money is NOT automatically spendable money.
- Wallet balance tells where money is. Wallet purpose tells what money is allowed to do.
- Money may already have jobs: bills, debt, food, transport, savings, emergency fund, family support, or goals.
- For optional purchases, never approve based only on total money across wallets.
- If the user mentions total money across wallets, immediately separate total money from free-to-spend money.
- If no Fun, Shopping, or flexible wallet can cover the purchase, recommend delay or a spending cap.
- Protected money should stay protected unless the purchase is essential.
- For large optional purchases, say the item is not truly affordable unless it can be paid without touching protected money.

SMALL CARD OUTPUT:
- Write 2 complete sentences.
- 34 to 58 words total.
- Sentence 1: answer like a human partner with one money reason.
- Sentence 2: give a gentle behavioral mirror and one clear next action.
- End with punctuation.
- No markdown, bullets, headings, emojis, or quotes.

GOOD STYLE EXAMPLES:
- You have the money overall, but not all of it is free to spend.
- Let's protect the money already set aside first.
- If this needs protected money, it's a not-yet purchase.
- Give it a pause and check your Fun or Shopping wallet first.
- This sounds more like stress relief than a need, so let's slow it down.

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
          temperature: 0.58,
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
