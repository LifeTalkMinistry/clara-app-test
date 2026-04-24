import { AI_INTENTS, normalizeGeminiCommand } from "@/lib/ai-command/command-parser";
import { compactFinanceSnapshot } from "@/lib/ai-command/finance-context";

const DEFAULT_MODEL = "gemini-1.5-flash";
const DEFAULT_TIMEOUT_MS = 18000;

function getGeminiConfig() {
  return {
    apiKey:
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_GOOGLE_GEMINI_API_KEY ||
      "",
    model: import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL,
  };
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJson(text) {
  const raw = String(text || "").trim();

  if (!raw) {
    throw new Error("Gemini returned an empty response.");
  }

  const direct = safeJsonParse(raw);
  if (direct) return direct;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = String(fenced?.[1] || raw).trim();

  const fencedParsed = safeJsonParse(candidate);
  if (fencedParsed) return fencedParsed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini did not return valid JSON.");
  }

  const sliced = candidate.slice(start, end + 1);
  const parsed = safeJsonParse(sliced);

  if (!parsed) {
    throw new Error("Gemini returned malformed JSON.");
  }

  return parsed;
}

function todayManilaDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function currentManilaPeriod() {
  return todayManilaDate().slice(0, 7);
}

function cleanText(value) {
  return String(value || "").trim();
}

function isGreeting(text) {
  return /^(hi|hello|hey|yo|good\s*(morning|afternoon|evening)|kumusta|kamusta|hi there|hello there)\b/i.test(
    cleanText(text)
  );
}

function asksHowAreYou(text) {
  return /(how are you|how r you|kumusta ka|kamusta ka|how's it going|how are things)/i.test(
    cleanText(text)
  );
}

function isHappyMood(text) {
  return /(happy|excited|great mood|good mood|blessed|thankful|grateful|masaya|sobrang saya)/i.test(
    cleanText(text)
  );
}

function isSadMood(text) {
  return /(sad|tired|stress|stressed|overwhelmed|bad day|malungkot|pagod|naiinis|worried|anxious)/i.test(
    cleanText(text)
  );
}

function buildSystemPrompt() {
  return `You are CLARA, a premium voice-first financial and Life OS assistant for Philippine users.

PERSONALITY:
- You sound human, calm, warm, and practical.
- You are not robotic, not generic, and not overly formal.
- You can do light small talk, but you naturally guide the user back to money, spending, wallets, budgets, or planning.
- You should feel like a supportive financial companion, not a customer support bot.
- Keep replies short unless the user asks for deep advice.

IMPORTANT BEHAVIOR:
- The assistantMessage must be freshly written for the user's exact message.
- Never reuse the same generic response repeatedly.
- Never say "How can I assist you today?" unless it feels natural.
- Prefer: "What do you want to check or log today?"
- Ask only one follow-up question when information is missing.
- Do not claim that an expense, wallet update, transfer, or budget was saved. The app executor handles actual writes after confirmation.

SMALL TALK RULE:
- If the user greets you, respond naturally and gently guide toward a finance action.
- If the user shares a mood, acknowledge it briefly and connect it to a useful next financial step.
- If the user asks who you are, explain that you are CLARA, their finance and Life OS assistant.

EXAMPLES:
User: "hi"
Assistant: "Hi Max! I’m here with you. Want to log an expense, check your wallet, or plan your spending today?"

User: "how are you?"
Assistant: "I’m doing good — ready to help you stay on top of your money. What do you want to check first?"

User: "I'm happy today"
Assistant: "Love that. Since you’re in a good mood, want to quickly check your money left or log anything you spent today?"

User: "I spent 120 on food"
Assistant: "Got it — ₱120 for food. Which wallet did you use?"

User: "Can I buy shoes?"
Assistant: "Let’s check if it fits your budget first. How much are the shoes?"

FINANCIAL STYLE:
- Use Philippine peso amounts.
- Use Asia/Manila dates.
- If finance context exists, use it.
- If finance context is missing, be honest and ask for the missing detail.
- For decisions, give a clear recommendation and a short reason.

Allowed intents:
${Object.values(AI_INTENTS).join(", ")}

Write intents:
LOG_EXPENSE, ADD_MONEY, TRANSFER_MONEY, CREATE_BUDGET, CREATE_SAVINGS_GOAL.

Return ONLY valid JSON. No markdown. No explanations outside JSON.

JSON shape:
{
  "intent": "ONE_ALLOWED_INTENT",
  "confidence": 0.0,
  "parsedData": {
    "amount": number,
    "item": string,
    "label": string,
    "category": "food|transport|housing|utilities|entertainment|shopping|health|education|personal|other",
    "wallet": string,
    "fromWallet": string,
    "toWallet": string,
    "date": "YYYY-MM-DD",
    "period": "YYYY-MM",
    "targetAmount": number,
    "targetDate": "YYYY-MM-DD",
    "decisionSubject": string,
    "scope": "today|yesterday|this month|last month",
    "commands": []
  },
  "assistantMessage": "short, human-like, natural response"
}`;
}

function createLocalAssistantMessage(text) {
  const input = cleanText(text);

  if (!input) {
    return "I’m here. Tell me what you want to log, check, or plan with your money.";
  }

  if (asksHowAreYou(input)) {
    return "I’m doing good — ready to help you stay on top of your money. What do you want to check first?";
  }

  if (isGreeting(input)) {
    return "Hi Max! I’m here with you. Want to log an expense, check your wallet, or plan your spending today?";
  }

  if (isHappyMood(input)) {
    return "Love that. Since you’re in a good mood, want to quickly check your money left or log anything you spent today?";
  }

  if (isSadMood(input)) {
    return "I’m here with you. Want to do a quick money check so things feel a little more organized?";
  }

  return "I’m having trouble reaching Gemini right now, but I’m still here. Tell me the expense, wallet update, or budget action you want to do.";
}

function buildFallbackCommand(text, error) {
  const cleanedText = cleanText(text);

  return normalizeGeminiCommand({
    intent: AI_INTENTS.GENERAL_GUIDANCE,
    confidence: 0.25,
    parsedData: {
      item: cleanedText,
      date: todayManilaDate(),
      period: currentManilaPeriod(),
    },
    assistantMessage: createLocalAssistantMessage(cleanedText),
    meta: {
      source: "local_fallback",
      errorCode: error?.code || "GEMINI_UNAVAILABLE",
      errorMessage: error?.message || "Gemini unavailable.",
    },
  });
}

function withTimeout(ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();

  const timeoutId = window.setTimeout(() => {
    controller.abort();
  }, ms);

  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeoutId),
  };
}

function sanitizeGeminiResult(parsed) {
  const normalized = normalizeGeminiCommand(parsed);

  return normalizeGeminiCommand({
    ...normalized,
    confidence:
      typeof normalized?.confidence === "number"
        ? Math.max(0, Math.min(1, normalized.confidence))
        : 0.65,
    parsedData: {
      ...(normalized?.parsedData || {}),
      date: normalized?.parsedData?.date || todayManilaDate(),
      period: normalized?.parsedData?.period || currentManilaPeriod(),
    },
    assistantMessage:
      cleanText(normalized?.assistantMessage) ||
      "Got it. What would you like to do next with your money?",
  });
}

export async function askGeminiForUnderstanding({ text, session, financeSnapshot }) {
  const { apiKey, model } = getGeminiConfig();
  const userInput = cleanText(text);

  if (!apiKey) {
    return buildFallbackCommand(
      userInput,
      Object.assign(new Error("Gemini API key is not configured."), {
        code: "GEMINI_NOT_CONFIGURED",
      })
    );
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const compact = compactFinanceSnapshot(financeSnapshot);

  const recentHistory = (session?.history || [])
    .slice(-8)
    .filter((message) => message?.content)
    .map((message) => ({
      role: message.role === "assistant" || message.role === "model" ? "assistant" : "user",
      content: cleanText(message.content).slice(0, 1000),
    }));

  const prompt = `${buildSystemPrompt()}

CURRENT MANILA DATE:
${todayManilaDate()}

CURRENT MANILA PERIOD:
${currentManilaPeriod()}

CURRENT FINANCE CONTEXT:
${JSON.stringify(compact || {}, null, 2)}

CURRENT COMMAND IN PROGRESS:
${JSON.stringify(session?.currentCommand || null, null, 2)}

RECENT CONVERSATION:
${JSON.stringify(recentHistory, null, 2)}

USER INPUT:
${userInput}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: isGreeting(userInput) || asksHowAreYou(userInput) ? 0.95 : 0.72,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 900,
      responseMimeType: "application/json",
    },
  };

  const timeout = withTimeout();

  try {
    console.info("[CLARA Gemini] Request started:", {
      model,
      hasInput: Boolean(userInput),
      hasFinanceSnapshot: Boolean(financeSnapshot),
      historyCount: recentHistory.length,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeout.signal,
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw Object.assign(new Error(payload?.error?.message || "Gemini request failed."), {
        code: "GEMINI_FAILED",
        status: response.status,
        payload,
      });
    }

    const textPayload =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .filter(Boolean)
        .join("\n") || "";

    const parsed = extractJson(textPayload);
    const normalized = sanitizeGeminiResult(parsed);

    return {
      ...normalized,
      meta: {
        ...(normalized?.meta || {}),
        source: "gemini",
        model,
      },
    };
  } catch (error) {
    const finalError =
      error?.name === "AbortError"
        ? Object.assign(new Error("Gemini request timed out."), {
            code: "GEMINI_TIMEOUT",
          })
        : error;

    console.warn("[CLARA Gemini] Falling back:", finalError);

    return buildFallbackCommand(userInput, finalError);
  } finally {
    timeout.clear();
  }
}

export function getGeminiStatus() {
  const { apiKey, model } = getGeminiConfig();

  return {
    configured: Boolean(apiKey),
    model,
  };
}