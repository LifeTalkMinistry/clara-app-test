import {
  AI_INTENTS,
  normalizeGeminiCommand,
  parseCommand,
} from "@/lib/ai-command/command-parser";

function cleanText(value) {
  return String(value || "").trim();
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

function isGreeting(text) {
  return /^(hi|hello|hey|yo|good\s*(morning|afternoon|evening)|kumusta|kamusta|hi there|hello there)\b/i.test(cleanText(text));
}

function asksHowAreYou(text) {
  return /(how are you|how r you|kumusta ka|kamusta ka|how's it going|how are things)/i.test(cleanText(text));
}

function isHappyMood(text) {
  return /(happy|excited|great mood|good mood|blessed|thankful|grateful|masaya|sobrang saya)/i.test(cleanText(text));
}

function isSadMood(text) {
  return /(sad|tired|stress|stressed|overwhelmed|bad day|malungkot|pagod|naiinis|worried|anxious)/i.test(cleanText(text));
}

function createLocalAssistantMessage(text) {
  const input = cleanText(text);
  if (!input) return "I’m here. Tell me what you want to log, check, or plan with your money.";
  if (asksHowAreYou(input)) return "I’m doing good — ready to help you stay on top of your money. What do you want to check first?";
  if (isGreeting(input)) return "Hi! I’m here with you. Want to log an expense, check your wallet, or plan your spending today?";


  if (isHappyMood(input)) return "Glad to hear that. Want to quickly check your money left or log anything you spent today?";
  if (isSadMood(input)) return "I’m here with you. Want to do a quick money check so things feel a little more organized?";

  return "I can help with wallets, expenses, budgets, savings, and spending plans using CLARA’s local financial tools. What do you want to check?";
}

function buildLocalFallbackCommand(text) {
  const cleanedText = cleanText(text);
  return normalizeGeminiCommand({
    intent: AI_INTENTS.GENERAL_GUIDANCE,
    confidence: 0.45,
    parsedData: {
      item: cleanedText,
      date: todayManilaDate(),
      period: currentManilaPeriod(),
    },
    assistantMessage: createLocalAssistantMessage(cleanedText),
    meta: {
      source: "local_rule_engine",
      provider: "none",
      billableAi: false,
    },
  });
}

// Compatibility name retained because the existing assistant engine imports it.
// This function is deliberately local: it never contacts Gemini or any paid AI API.
export async function askGeminiForUnderstanding({ text, session } = {}) {
  const userInput = cleanText(text);
  const parsed = parseCommand(userInput, session?.currentCommand || null);

  if (parsed?.intent && parsed.intent !== AI_INTENTS.UNKNOWN) {
    return normalizeGeminiCommand({
      ...parsed,
      parsedData: {
        ...(parsed.parsedData || {}),
        date: parsed?.parsedData?.date || todayManilaDate(),
        period: parsed?.parsedData?.period || currentManilaPeriod(),
      },
      assistantMessage: cleanText(parsed.assistantMessage) || createLocalAssistantMessage(userInput),
      meta: {
        ...(parsed.meta || {}),
        source: "local_rule_engine",
        provider: "none",
        billableAi: false,
      },
    });
  }

  return buildLocalFallbackCommand(userInput);
}

export function getGeminiStatus() {
  return {
    configured: false,
    model: "local-financial-reasoning",
    provider: "none",
    billableAi: false,
  };
}
