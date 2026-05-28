import { requestGeminiJson, hasGeminiJsonConfig } from "@/lib/clara-gemini-json-utils";
import { getAvailableCabinetNames, normalizeCabinetName, saveMemoryToCabinet, readMemoryCabinet } from "@/lib/memory-cabinets";

const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const DEFAULT_STORY_SECTIONS = ["Spending", "Budget", "Wallet", "Goals", "Emergency", "Debt", "Schedule", "Emotional", "Lifestyle", "Decision", "Learning", "Preference", "Relationship"];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanList(value, limit = 12) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, limit) : [];
}

function now() {
  return new Date().toISOString();
}

function titleCase(value = "") {
  const cleaned = clean(value).replace(/memory$/i, "").replace(/[^a-z0-9ñáéíóúü\s&/-]/gi, "").trim();
  if (!cleaned) return "General";
  const defaultTitle = DEFAULT_STORY_SECTIONS.find((title) => title.toLowerCase() === cleaned.toLowerCase());
  if (defaultTitle) return defaultTitle;
  return cleaned.split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

function normalizeBullet(value = "") {
  return clean(value).replace(/^[•\-*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
}

function normalizeStory(story = {}) {
  const sections = Array.isArray(story.sections) ? story.sections : [];
  const merged = new Map();

  sections.forEach((section, index) => {
    const title = titleCase(section.title || section.name || section.category || `Section ${index + 1}`);
    const bullets = (Array.isArray(section.bullets) ? section.bullets : section.items || section.memories || [])
      .map(normalizeBullet)
      .filter(Boolean)
      .slice(0, 8);
    if (!title || !bullets.length) return;

    const key = title.toLowerCase();
    const existing = merged.get(key);
    merged.set(key, {
      id: existing?.id || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title,
      type: DEFAULT_STORY_SECTIONS.some((item) => item.toLowerCase() === key) ? "default" : "custom",
      bullets: [...new Set([...(existing?.bullets || []), ...bullets])].slice(0, 8),
      createdAt: existing?.createdAt || clean(section.createdAt) || now(),
      updatedAt: now(),
    });
  });

  const allSections = Array.from(merged.values());
  const byTitle = new Map(allSections.map((section) => [section.title.toLowerCase(), section]));
  const orderedDefaults = DEFAULT_STORY_SECTIONS.map((title) => byTitle.get(title.toLowerCase())).filter(Boolean);
  const custom = allSections.filter((section) => !DEFAULT_STORY_SECTIONS.some((title) => title.toLowerCase() === section.title.toLowerCase()));
  const ordered = [...orderedDefaults, ...custom].slice(0, 18);

  return {
    id: "clara-user-context-story",
    type: "user_context_story",
    schemaVersion: 2,
    sections: ordered,
    createdAt: clean(story.createdAt) || now(),
    updatedAt: clean(story.updatedAt) || now(),
    sectionCount: ordered.length,
    bulletCount: ordered.reduce((sum, section) => sum + section.bullets.length, 0),
    source: "clara_user_context_story",
  };
}

function readUserContextStory() {
  try {
    return normalizeStory(JSON.parse(window.localStorage.getItem(USER_CONTEXT_STORY_KEY) || "{}"));
  } catch {
    return normalizeStory({});
  }
}

function writeUserContextStory(story = {}) {
  const normalized = normalizeStory({ ...story, updatedAt: now() });
  try {
    window.localStorage.setItem(USER_CONTEXT_STORY_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: normalized }));
  } catch {}
  return normalized;
}

function formatStory(story = readUserContextStory()) {
  const normalized = normalizeStory(story);
  if (!normalized.sections.length) return "No user context story saved yet.";
  return normalized.sections.map((section) => `${section.title}\n${section.bullets.map((bullet) => `- ${bullet}`).join("\n")}`).join("\n\n");
}

function isUsefulMemoryText(text = "") {
  const value = clean(text).toLowerCase();
  if (!value || value.length < 10) return false;
  if (/^(hi|hello|hey|okay|ok|thanks|thank you|salamat|run context diagnostic)$/i.test(value)) return false;
  if (/context diagnostic|source:|debug|test only/i.test(value)) return false;
  return /(spend|spent|buy|budget|wallet|save|goal|debt|utang|stress|tired|work|shift|family|partner|habit|routine|decision|prefer|feel|emotion|pressure|payday|bill|expense|gastos|ipon|takeout|delivery|order|food|basketball|sport|sports|jogging|gym|exercise|fitness)/i.test(value);
}

function normalizeMemoryJson(json = {}) {
  const cabinetNames = cleanList(json.cabinet_names).map(normalizeCabinetName).filter(Boolean).slice(0, 5);
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

  if (!usefulMessages.length) return normalizeMemoryJson({ should_save: false });

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
  if (/sport|sports|basketball|jogging|gym|exercise|fitness/i.test(combined)) cabinets.push("Lifestyle Memory");
  if (/prefer|style|tone|remind/i.test(combined)) cabinets.push("Preference Memory");

  return normalizeMemoryJson({
    should_save: true,
    summary: combined.slice(0, 700),
    cabinet_names: cabinets.length ? cabinets : ["Lifestyle Memory", "Decision Memory"],
    signals: ["fallback_summary", "live_session_memory"],
    emotional_tone: "not analyzed",
    financial_relevance: "Saved because the user shared a money, behavior, routine, preference, lifestyle, or decision signal.",
    should_use_when: ["When the user asks about similar habits, routines, pressure, spending behavior, or decisions."],
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

function fallbackStoryFromMemory(memory = {}) {
  const current = readUserContextStory();
  const sections = [...(current.sections || [])];
  const title = /basketball|sport|sports/i.test(memory.summary) ? "Sports" : (memory.cabinet_names?.[0] || "Lifestyle Memory").replace(/ Memory$/, "");
  sections.push({ title, bullets: [memory.summary] });
  return writeUserContextStory({ ...current, sections });
}

async function updateUserContextStoryWithAi(memory = {}) {
  if (!hasGeminiJsonConfig()) return fallbackStoryFromMemory(memory);

  const prompt = `You are CLARA's User Context Story Editor.

Update the user's ONE readable memory story. This is the only Memory Review source.

Current story:
${formatStory()}

New memory:
${memory.summary}

Default categories:
${DEFAULT_STORY_SECTIONS.map((section) => `- ${section}`).join("\n")}

Rules:
- Return JSON only.
- Keep default categories when they fit.
- Create a custom category when the user reveals a specific new life pattern.
- If the user mentions basketball, sports, gym, jogging, exercise, or fitness as part of behavior, create or update Sports or Fitness.
- Improve related bullets instead of duplicating them.
- Maximum 18 sections and 8 bullets per section.

JSON shape:
{"sections":[{"title":"Spending","bullets":[]}]}`;

  try {
    const result = await requestGeminiJson({ prompt, temperature: 0.17, maxOutputTokens: 1300, label: "CLARA User Context Story Editor" });
    return writeUserContextStory(result.json || {});
  } catch {
    return fallbackStoryFromMemory(memory);
  }
}

async function updateCabinetBulletsWithAi({ cabinetName, memory } = {}) {
  const currentDocument = readMemoryCabinet(cabinetName)?.[0] || null;
  const currentBullets = cleanList(currentDocument?.document_bullets, 12);

  if (!hasGeminiJsonConfig()) return normalizeCabinetDocumentJson({}, memory);

  const prompt = `You are CLARA's Cabinet Memory Editor.
Update this cabinet: ${cabinetName}
Current bullets:
${currentBullets.length ? currentBullets.map((bullet) => `- ${bullet}`).join("\n") : "No saved bullets yet."}
New memory:
${memory.summary}
Return JSON only: {"bullets":[],"signals":[],"emotional_tone":"","financial_relevance":"","should_use_when":[]}`;

  try {
    const result = await requestGeminiJson({ prompt, temperature: 0.16, maxOutputTokens: 760, label: "CLARA Cabinet Memory Editor" });
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

  if (!cleanMessages.some((message) => isUsefulMemoryText(message.text))) return normalizeMemoryJson({ should_save: false });
  if (!hasGeminiJsonConfig()) return fallbackSummaryFromMessages(cleanMessages);

  const prompt = `You are CLARA's Conversation Memory Summarizer.
Summarize this chat into useful long-term memory.
Save financial behavior, emotional triggers, spending habits, goals, decisions, preferences, lifestyle, sports, fitness, or schedule pressure that affects money.
Available cabinets:
${getAvailableCabinetNames().map((name) => `- ${name}`).join("\n")}
Return JSON only: {"should_save":true,"summary":"","cabinet_names":[],"signals":[],"emotional_tone":"","financial_relevance":"","should_use_when":[]}
Conversation:
${JSON.stringify(cleanMessages, null, 2)}`;

  try {
    const result = await requestGeminiJson({ prompt, temperature: 0.18, maxOutputTokens: 850, label: "CLARA Conversation Memory Summarizer" });
    const normalized = normalizeMemoryJson(result.json);
    return normalized.should_save ? normalized : fallbackSummaryFromMessages(cleanMessages);
  } catch {
    return fallbackSummaryFromMessages(cleanMessages);
  }
}

export async function saveClaraConversationMemory({ messages = [], clearLiveSession = false } = {}) {
  const memory = await summarizeClaraConversationForMemory({ messages });

  if (!memory.should_save) {
    const userContextStory = readUserContextStory();
    return { saved: false, memory, savedEntries: [], userContextStory, universalProfile: userContextStory };
  }

  const userContextStory = await updateUserContextStoryWithAi(memory);
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

  if (clearLiveSession && typeof window !== "undefined") window.CLARA_BEHAVIORAL_MEMORY?.clearLiveUserMessageHistory?.();

  return { saved: savedEntries.length > 0 || userContextStory.bulletCount > 0, memory, savedEntries, userContextStory, universalProfile: userContextStory };
}
