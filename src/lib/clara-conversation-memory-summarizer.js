import { requestGeminiJson, hasGeminiJsonConfig } from "@/lib/clara-gemini-json-utils";
import {
  getAvailableCabinetNames,
  normalizeCabinetName,
  saveMemoryToCabinet,
  readMemoryCabinet,
} from "@/lib/memory-cabinets";
import {
  DEFAULT_UNIVERSAL_MEMORY_SECTIONS,
  formatUniversalMemoryProfileForPrompt,
  normalizeUniversalMemoryProfile,
  readUniversalMemoryProfile,
  writeUniversalMemoryProfile,
} from "@/lib/clara-universal-memory-profile";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanList(value, limit = 12) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, limit) : [];
}

function isUsefulMemoryText(text = "") {
  const value = clean(text).toLowerCase();
  if (!value || value.length < 18) return false;
  if (/^(hi|hello|hey|okay|ok|thanks|thank you|salamat|run context diagnostic)$/i.test(value)) return false;
  if (/context diagnostic|source:|debug|test only/i.test(value)) return false;
  return /(spend|spent|buy|budget|wallet|save|goal|debt|utang|stress|tired|work|shift|family|partner|habit|routine|decision|prefer|feel|emotion|pressure|payday|bill|expense|gastos|ipon|takeout|delivery|order|food)/i.test(value);
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
    signals: cleanList(json.signals, 16),
    emotional_tone: clean(json.emotional_tone || json.emotionalTone),
    financial_relevance: clean(json.financial_relevance || json.financialRelevance),
    should_use_when: cleanList(json.should_use_when || json.shouldUseWhen, 16),
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

  if (/spend|spent|buy|expense|gastos|food|order|shopping|takeout|delivery/i.test(combined)) cabinets.push("Spending Memory");
  if (/budget|limit|allocation/i.test(combined)) cabinets.push("Budget Memory");
  if (/wallet|cash|gcash|maya|bank/i.test(combined)) cabinets.push("Wallet Memory");
  if (/goal|save|ipon|target/i.test(combined)) cabinets.push("Goal Memory");
  if (/debt|utang|loan/i.test(combined)) cabinets.push("Debt Memory");
  if (/work|shift|schedule|routine|sleep|payday/i.test(combined)) cabinets.push("Schedule Memory");
  if (/stress|tired|feel|emotion|sad|happy|burnout|pressure|drained|exhausted/i.test(combined)) cabinets.push("Emotional Memory");
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

function normalizeCabinetDocumentJson(json = {}, fallbackMemory = {}) {
  const bullets = cleanList(json.bullets || json.document_bullets || json.documentBullets, 12);

  if (!bullets.length) {
    return {
      bullets: [clean(fallbackMemory.summary)].filter(Boolean),
      signals: cleanList(fallbackMemory.signals, 16),
      emotional_tone: clean(fallbackMemory.emotional_tone),
      financial_relevance: clean(fallbackMemory.financial_relevance),
      should_use_when: cleanList(fallbackMemory.should_use_when, 16),
    };
  }

  return {
    bullets,
    signals: cleanList(json.signals || fallbackMemory.signals, 16),
    emotional_tone: clean(json.emotional_tone || json.emotionalTone || fallbackMemory.emotional_tone),
    financial_relevance: clean(json.financial_relevance || json.financialRelevance || fallbackMemory.financial_relevance),
    should_use_when: cleanList(json.should_use_when || json.shouldUseWhen || fallbackMemory.should_use_when, 16),
  };
}

function normalizeUniversalProfileJson(json = {}, fallbackMemory = {}) {
  const sections = Array.isArray(json.sections) ? json.sections : [];

  if (!sections.length) {
    return normalizeUniversalMemoryProfile({
      sections: fallbackMemory.cabinet_names.map((cabinetName) => ({
        title: cabinetName.replace(/ Memory$/, ""),
        bullets: [fallbackMemory.summary],
      })),
    });
  }

  return normalizeUniversalMemoryProfile({ sections });
}

async function updateUniversalMemoryProfileWithAi(memory = {}) {
  const currentProfile = readUniversalMemoryProfile();
  const currentProfileText = formatUniversalMemoryProfileForPrompt(currentProfile);

  if (!hasGeminiJsonConfig()) {
    return writeUniversalMemoryProfile(normalizeUniversalProfileJson({}, memory));
  }

  const prompt = `You are CLARA's Universal Memory Profile Editor.

Update CLARA's ONE universal memory profile.

Current profile:
${currentProfileText}

New memory to incorporate:
${memory.summary}

Suggested default categories from the summarizer:
${memory.cabinet_names.join(", ") || "none"}

Signals:
${(memory.signals || []).map((signal) => `- ${signal}`).join("\n") || "none"}

Default category options:
${DEFAULT_UNIVERSAL_MEMORY_SECTIONS.map((section) => `- ${section}`).join("\n")}

Rules:
- Return JSON only.
- Keep the profile organized by section title.
- Use default categories when they fit.
- You MAY create a better custom category if the memory reveals a more specific life pattern.
- If the new memory relates to an existing bullet, improve that bullet instead of adding a duplicate.
- Add a new bullet only when it is a meaningfully different insight.
- Keep each section concise, human-readable, and behavior-focused.
- Maximum 18 sections, maximum 8 bullets per section.
- Do not mention cabinets, JSON, database, or internal memory.

JSON shape:
{
  "sections": [
    {
      "title": "Spending",
      "bullets": []
    }
  ]
}`;

  try {
    const result = await requestGeminiJson({
      prompt,
      temperature: 0.17,
      maxOutputTokens: 1300,
      label: "CLARA Universal Memory Profile Editor",
    });
    return writeUniversalMemoryProfile(normalizeUniversalProfileJson(result.json, memory));
  } catch {
    return writeUniversalMemoryProfile(normalizeUniversalProfileJson({}, memory));
  }
}

async function updateCabinetBulletsWithAi({ cabinetName, memory } = {}) {
  const currentDocument = readMemoryCabinet(cabinetName)?.[0] || null;
  const currentBullets = cleanList(currentDocument?.document_bullets, 12);

  if (!hasGeminiJsonConfig()) {
    return normalizeCabinetDocumentJson({}, memory);
  }

  const prompt = `You are CLARA's Cabinet Memory Editor.

Update ONE cabinet's living memory document.

Cabinet:
${cabinetName}

Current bullet memory document:
${currentBullets.length ? currentBullets.map((bullet) => `- ${bullet}`).join("\n") : "No saved bullets yet."}

New memory to incorporate:
${memory.summary}

New signals:
${(memory.signals || []).map((signal) => `- ${signal}`).join("\n") || "none"}

Rules:
- Return JSON only.
- Keep one concise bullet document for this cabinet.
- If the new memory is related to an existing bullet, improve that existing bullet instead of adding a duplicate.
- Add a new bullet only when the behavior is meaningfully different.
- Keep 3 to 8 bullets when possible, maximum 12.
- Each bullet should be one human-readable behavior insight.
- Do not mention cabinets, JSON, databases, or internal memory.

JSON shape:
{
  "bullets": [],
  "signals": [],
  "emotional_tone": "",
  "financial_relevance": "",
  "should_use_when": []
}`;

  try {
    const result = await requestGeminiJson({
      prompt,
      temperature: 0.16,
      maxOutputTokens: 760,
      label: "CLARA Cabinet Memory Editor",
    });
    return normalizeCabinetDocumentJson(result.json, memory);
  } catch {
    return normalizeCabinetDocumentJson({}, memory);
  }
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
    return { saved: false, memory, savedEntries: [], universalProfile: readUniversalMemoryProfile() };
  }

  const universalProfile = await updateUniversalMemoryProfileWithAi(memory);
  const savedEntries = [];

  for (const cabinetName of memory.cabinet_names) {
    const cabinetDocument = await updateCabinetBulletsWithAi({ cabinetName, memory });
    const entry = {
      summary: cabinetDocument.bullets.map((bullet) => `- ${bullet}`).join("\n"),
      document_bullets: cabinetDocument.bullets,
      signals: cabinetDocument.signals,
      emotional_tone: cabinetDocument.emotional_tone,
      financial_relevance: cabinetDocument.financial_relevance,
      should_use_when: cabinetDocument.should_use_when,
      occurrenceCount: 1,
      relevanceScore: 0.72,
      source: "clara_overlay_conversation_summary",
    };

    const saved = saveMemoryToCabinet(cabinetName, entry);
    if (saved) savedEntries.push(saved);
  }

  if (clearLiveSession && typeof window !== "undefined") {
    window.CLARA_BEHAVIORAL_MEMORY?.clearLiveUserMessageHistory?.();
  }

  return { saved: savedEntries.length > 0 || universalProfile.bulletCount > 0, memory, savedEntries, universalProfile };
}
