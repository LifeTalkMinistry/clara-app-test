import { requestGeminiJson, hasGeminiJsonConfig } from "@/lib/clara-gemini-json-utils";
import { getAvailableCabinetNames, normalizeCabinetName, saveMemoryToCabinet } from "@/lib/memory-cabinets";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanList(value) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, 12) : [];
}

function isUsefulMemoryText(text = "") {
  const value = clean(text).toLowerCase();
  if (!value || value.length < 18) return false;
  if (/^(hi|hello|hey|okay|ok|thanks|thank you|salamat|run context diagnostic)$/i.test(value)) return false;
  if (/context diagnostic|source:|debug|test only/i.test(value)) return false;
  return /(spend|spent|buy|budget|wallet|save|goal|debt|utang|stress|tired|work|shift|family|partner|habit|routine|decision|prefer|feel|emotion|pressure|payday|bill|expense|gastos|ipon)/i.test(value);
}

function normalizeMemoryJson(json = {}) {
  const cabinetNames = cleanList(json.cabinet_names)
    .map(normalizeCabinetName)
    .filter(Boolean)
    .slice(0, 5);

  const summary = clean(json.summary);

  return {
    should_save: Boolean(json.should_save) && Boolean(summary) && cabinetNames.length > 0,
    summary,
    cabinet_names: cabinetNames,
    signals: cleanList(json.signals),
    emotional_tone: clean(json.emotional_tone || json.emotionalTone),
    financial_relevance: clean(json.financial_relevance || json.financialRelevance),
    should_use_when: cleanList(json.should_use_when || json.shouldUseWhen),
  };
}

function fallbackSummaryFromMessages(messages = []) {
  const usefulMessages = (Array.isArray(messages) ? messages : [])
    .map((message) => clean(message?.text || message?.content || message?.message))
    .filter(isUsefulMemoryText)
    .slice(-6);

  if (!usefulMessages.length) {
    return normalizeMemoryJson({ should_save: false });
  }

  const combined = usefulMessages.join(" | ");
  const cabinets = [];

  if (/spend|spent|buy|expense|gastos|food|order|shopping/i.test(combined)) cabinets.push("Spending Memory");
  if (/budget|limit|allocation/i.test(combined)) cabinets.push("Budget Memory");
  if (/wallet|cash|gcash|maya|bank/i.test(combined)) cabinets.push("Wallet Memory");
  if (/goal|save|ipon|target/i.test(combined)) cabinets.push("Goal Memory");
  if (/debt|utang|loan/i.test(combined)) cabinets.push("Debt Memory");
  if (/work|shift|schedule|routine|sleep|payday/i.test(combined)) cabinets.push("Schedule Memory");
  if (/stress|tired|feel|emotion|sad|happy|burnout|pressure/i.test(combined)) cabinets.push("Emotional Memory");
  if (/family|partner|friend|relationship|coworker/i.test(combined)) cabinets.push("Relationship Memory");
  if (/prefer|style|tone|remind/i.test(combined)) cabinets.push("Preference Memory");

  return normalizeMemoryJson({
    should_save: true,
    summary: combined.slice(0, 700),
    cabinet_names: cabinets.length ? cabinets : ["Spending Memory", "Emotional Memory"],
    signals: ["fallback_summary", "live_session_memory"],
    emotional_tone: "not analyzed",
    financial_relevance: "Saved because the user shared a money, behavior, routine, preference, or emotional spending signal.",
    should_use_when: ["When the user asks about similar spending behavior, pressure, habits, routines, or decisions."],
  });
}

export async function summarizeClaraConversationForMemory({ messages = [] } = {}) {
  const cleanMessages = (Array.isArray(messages) ? messages : [])
    .map((message) => ({
      role: clean(message?.role || "user"),
      text: clean(message?.text || message?.content || message?.message),
      source: clean(message?.source),
      capturedAt: clean(message?.capturedAt || message?.createdAt),
    }))
    .filter((message) => message.text)
    .slice(-30);

  if (!cleanMessages.some((message) => isUsefulMemoryText(message.text))) {
    return normalizeMemoryJson({ should_save: false });
  }

  if (!hasGeminiJsonConfig()) {
    return fallbackSummaryFromMessages(cleanMessages);
  }

  const prompt = `You are CLARA's Conversation Memory Summarizer.

Summarize this CLARA chat into useful long-term memory.

Do NOT save greetings.
Do NOT save diagnostics.
Do NOT save raw full conversation.
Do NOT save filler.

Only save:
- financial behavior
- emotional triggers
- spending habits
- goals
- repeated concerns
- important decisions
- preferences
- lifestyle or schedule pressure that affects money

Available cabinets:
${getAvailableCabinetNames().map((name) => `- ${name}`).join("\n")}

Return JSON only:
{
  "should_save": true,
  "summary": "",
  "cabinet_names": [],
  "signals": [],
  "emotional_tone": "",
  "financial_relevance": "",
  "should_use_when": []
}

Conversation:
${JSON.stringify(cleanMessages, null, 2)}`;

  try {
    const result = await requestGeminiJson({ prompt, temperature: 0.18, maxOutputTokens: 850, label: "CLARA Conversation Memory Summarizer" });
    return normalizeMemoryJson(result.json);
  } catch {
    return fallbackSummaryFromMessages(cleanMessages);
  }
}

export async function saveClaraConversationMemory({ messages = [], clearLiveSession = false } = {}) {
  const memory = await summarizeClaraConversationForMemory({ messages });

  if (!memory.should_save) {
    return { saved: false, memory, savedEntries: [] };
  }

  const entry = {
    summary: memory.summary,
    signals: memory.signals,
    emotional_tone: memory.emotional_tone,
    financial_relevance: memory.financial_relevance,
    should_use_when: memory.should_use_when,
    relevanceScore: 0.72,
    source: "clara_overlay_conversation_summary",
  };

  const savedEntries = memory.cabinet_names
    .map((cabinetName) => saveMemoryToCabinet(cabinetName, entry))
    .filter(Boolean);

  if (clearLiveSession && typeof window !== "undefined") {
    window.CLARA_BEHAVIORAL_MEMORY?.clearLiveUserMessageHistory?.();
  }

  return { saved: savedEntries.length > 0, memory, savedEntries };
}
