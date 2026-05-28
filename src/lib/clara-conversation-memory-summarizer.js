import { requestGeminiJson, hasGeminiJsonConfig } from "@/lib/clara-gemini-json-utils";
import { getAvailableCabinetNames, normalizeCabinetName, saveMemoryToCabinet, readMemoryCabinet } from "@/lib/memory-cabinets";

const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";

const FIXED_STORY_SECTIONS = [
  "Identity",
  "Work",
  "Money",
  "Emotional",
  "Health",
  "Routine",
  "Relationships",
  "Home",
  "Food",
  "Lifestyle",
  "Growth",
  "Decision Style",
  "Support Style",
  "Triggers",
  "Protection",
];

const STORY_CATEGORY_GUIDE = {
  Identity: "name, age, gender, life stage, role, location",
  Work: "job type, schedule, stress, income pattern, career goals",
  Money: "spending habits, budget style, wallet behavior, savings, debt, bills",
  Emotional: "stress, exhaustion, anxiety, guilt, motivation, confidence",
  Health: "sleep, energy, food, exercise, sickness, medication",
  Routine: "daily schedule, commute, after-work habits, weekends, payday rhythm",
  Relationships: "family, partner, friends, coworkers, dependents, social pressure",
  Home: "living situation, rent, household responsibilities, shared expenses",
  Food: "cravings, convenience food, delivery, groceries, meal planning",
  Lifestyle: "hobbies, entertainment, shopping, travel, social life",
  Growth: "learning, goals, discipline, faith, self-improvement",
  "Decision Style": "how user decides, hesitation, impulsiveness, risk tolerance",
  "Support Style": "preferred guidance, reminders, tone, accountability style",
  Triggers: "situations that cause spending, stress, avoidance, reward behavior",
  Protection: "emergency fund, boundaries, safety plans, financial risk prevention",
};

const CATEGORY_ALIASES = new Map([
  ["spending", "Money"],
  ["budget", "Money"],
  ["wallet", "Money"],
  ["goals", "Money"],
  ["goal", "Money"],
  ["emergency", "Protection"],
  ["debt", "Money"],
  ["bills", "Money"],
  ["bill", "Money"],
  ["schedule", "Routine"],
  ["decision", "Decision Style"],
  ["learning", "Growth"],
  ["preference", "Support Style"],
  ["relationship", "Relationships"],
  ["sports", "Health"],
  ["sport", "Health"],
  ["fitness", "Health"],
  ["exercise", "Health"],
]);

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanList(value, limit = 12) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, limit) : [];
}

function now() {
  return new Date().toISOString();
}

function normalizeTitleKey(value = "") {
  return clean(value).replace(/memory$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleToFixedCategory(value = "") {
  const key = normalizeTitleKey(value);
  if (!key) return "Lifestyle";
  const direct = FIXED_STORY_SECTIONS.find((title) => title.toLowerCase() === key);
  return direct || CATEGORY_ALIASES.get(key) || "Lifestyle";
}

function normalizeBullet(value = "") {
  return clean(value).replace(/^[•\-*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
}

function isTemporaryOrLiveFactBullet(value = "") {
  const text = clean(value).toLowerCase();
  if (!text) return true;
  if (/[₱$€£]\s?\d|\b\d+[,.]?\d*\s?(php|peso|pesos)\b/i.test(text)) return true;
  if (/\b(available|current|total)\s+(balance|wallet balance|amount|money)\b/i.test(text)) return true;
  if (/\b(balance across all wallets|money left right now|remaining right now|currently has|currently have)\b/i.test(text)) return true;
  if (/\b(is asking|asked|checking their wallet|checking his wallet|checking her wallet|see if they can afford|recent improvement in spending habits)\b/i.test(text)) return true;
  if (/\b(today|right now|currently|this exact moment)\b.*\b(balance|wallet|amount|remaining|left)\b/i.test(text)) return true;
  return false;
}

function normalizeStory(story = {}) {
  const sections = Array.isArray(story.sections) ? story.sections : [];
  const merged = new Map();

  sections.forEach((section) => {
    const title = titleToFixedCategory(section.title || section.name || section.category || "Lifestyle");
    const bullets = (Array.isArray(section.bullets) ? section.bullets : section.items || section.memories || [])
      .map(normalizeBullet)
      .filter((bullet) => bullet && !isTemporaryOrLiveFactBullet(bullet))
      .slice(0, 8);
    if (!bullets.length) return;

    const existing = merged.get(title);
    merged.set(title, {
      id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title,
      type: "fixed",
      bullets: [...new Set([...(existing?.bullets || []), ...bullets])].slice(0, 8),
      createdAt: existing?.createdAt || clean(section.createdAt) || now(),
      updatedAt: now(),
    });
  });

  const ordered = FIXED_STORY_SECTIONS.map((title) => merged.get(title)).filter(Boolean);

  return {
    id: "clara-user-context-story",
    type: "user_context_story",
    schemaVersion: 4,
    sections: ordered,
    createdAt: clean(story.createdAt) || now(),
    updatedAt: clean(story.updatedAt) || now(),
    sectionCount: ordered.length,
    bulletCount: ordered.reduce((sum, section) => sum + section.bullets.length, 0),
    source: "clara_user_context_story",
  };
}

function readUserContextStory() {
  if (typeof window === "undefined") return normalizeStory({});
  try {
    return normalizeStory(JSON.parse(window.localStorage.getItem(USER_CONTEXT_STORY_KEY) || "{}"));
  } catch {
    return normalizeStory({});
  }
}

function writeUserContextStory(story = {}) {
  const normalized = normalizeStory({ ...story, updatedAt: now() });
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(USER_CONTEXT_STORY_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: normalized }));
    } catch {}
  }
  return normalized;
}

function formatStory(story = readUserContextStory()) {
  const normalized = normalizeStory(story);
  if (!normalized.sections.length) return "No user context story saved yet.";
  return normalized.sections.map((section) => `${section.title}\n${section.bullets.map((bullet) => `- ${bullet}`).join("\n")}`).join("\n\n");
}

function mergeStoryPatch(baseStory = {}, patchStory = {}) {
  const base = normalizeStory(baseStory);
  const patch = normalizeStory(patchStory);
  return normalizeStory({
    ...base,
    updatedAt: now(),
    sections: [...(base.sections || []), ...(patch.sections || [])],
  });
}

function addPatch(sectionMap, title, bullet) {
  const fixedTitle = titleToFixedCategory(title);
  const cleaned = normalizeBullet(bullet);
  if (!cleaned || isTemporaryOrLiveFactBullet(cleaned)) return;

  const existing = sectionMap.get(fixedTitle) || { title: fixedTitle, bullets: [] };
  if (!existing.bullets.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
    existing.bullets.push(cleaned);
  }
  existing.bullets = existing.bullets.slice(0, 8);
  sectionMap.set(fixedTitle, existing);
}

function deterministicSectionsFromMemory(memory = {}) {
  const text = clean(memory.summary);
  const lower = text.toLowerCase();
  if (!text || isTemporaryOrLiveFactBullet(text)) return [];

  const patch = new Map();

  const ageMatch = text.match(/\b(?:i'?m|i am|age[:\s])\s*(\d{1,3})\b/i);
  if (ageMatch) addPatch(patch, "Identity", `Age: ${ageMatch[1]}`);
  if (/\b(young adult|student|professional|creator|life stage|role|location)\b/i.test(lower)) {
    addPatch(patch, "Identity", "User is defining their current life stage and personal direction.");
  }

  if (/\b(work|job|shift|after work|long shift|office|bpo|career)\b/i.test(lower)) {
    addPatch(patch, "Work", "Work schedule and after-work conditions can affect the user's decisions.");
  }
  if (/\b(mentally exhausted|exhausting work|work exhaustion|drained after work)\b/i.test(lower)) {
    addPatch(patch, "Work", "Work-related mental exhaustion can influence the user's spending behavior.");
  }

  if (/\b(save|saving|budget|money|spending|spend|expense|debt|bill|bills|impulsive purchase|trying to save)\b/i.test(lower)) {
    addPatch(patch, "Money", "User is working on stronger financial discipline and spending awareness.");
  }
  if (/\b(friends|family|social pressure|invite|invited|eat out|food delivery|cravings|convenience meals)\b/i.test(lower) && /\b(save|saving|budget|spend|spending|money)\b/i.test(lower)) {
    addPatch(patch, "Money", "Social plans and food cravings can affect the user's saving discipline.");
  }

  if (/\b(stress|stressed|exhausted|tired|boredom|bored|pressure|emotionally|guilt|anxiety|drained|mentally exhausted)\b/i.test(lower)) {
    addPatch(patch, "Emotional", "Stress, exhaustion, boredom, or pressure can influence the user's spending behavior.");
  }
  if (/\b(basketball|exercise|gym|jogging|fitness)\b/i.test(lower) && /\b(stress|cope|reset|emotionally|balanced)\b/i.test(lower)) {
    addPatch(patch, "Emotional", "Healthy activities like basketball can help the user regulate stress.");
  }

  if (/\b(sleep|energy|health|exercise|basketball|sports|gym|jogging|fitness)\b/i.test(lower)) {
    addPatch(patch, "Health", "User wants better physical energy and healthier coping patterns.");
  }
  if (/\b(basketball|sports|exercise|gym|jogging|fitness)\b/i.test(lower)) {
    addPatch(patch, "Health", "Basketball or physical activity supports healthier stress release.");
  }

  if (/\b(routine|after work|after-work|night|nighttime|late-night|weekend|payday|rhythm|rest first|planning properly|prepare myself|before spending)\b/i.test(lower)) {
    addPatch(patch, "Routine", "After-work, nighttime, or payday periods can become higher-risk spending windows.");
  }
  if (/\b(rest first|pause first|planning properly|prepare myself|avoid rushing)\b/i.test(lower)) {
    addPatch(patch, "Routine", "User wants a routine that includes pausing or resting before spending decisions.");
  }

  if (/\b(friends|family|partner|coworker|social pressure|invite|invited|join plans|eat out)\b/i.test(lower)) {
    addPatch(patch, "Relationships", "Social invitations from friends or family can create spending pressure.");
  }

  if (/\b(home|household|shared expenses|shared responsibilities|living situation|rent|household needs)\b/i.test(lower)) {
    addPatch(patch, "Home", "Shared responsibilities and household needs can affect budgeting priorities.");
  }

  if (/\b(food|craving|cravings|delivery|convenience food|convenience meals|eat out|groceries|meal|takeout|order food|hungry|hunger)\b/i.test(lower)) {
    addPatch(patch, "Food", "Food delivery, cravings, and convenience meals are recurring spending temptations.");
  }

  if (/\b(hobby|hobbies|basketball|entertainment|shopping|travel|social life|eat out|join plans)\b/i.test(lower)) {
    addPatch(patch, "Lifestyle", "User wants healthier hobbies and lifestyle choices instead of spending to cope.");
  }

  if (/\b(improve|self-improvement|discipline|disciplined|better habits|stable future|growth|faith|goals)\b/i.test(lower)) {
    addPatch(patch, "Growth", "User is building discipline and better habits over time.");
  }

  if (/\b(pause first|pause|avoid rushing|before spending|better decisions|decision|decisions|tempted|impulsive)\b/i.test(lower)) {
    addPatch(patch, "Decision Style", "Pausing before spending helps the user make better choices.");
  }

  if (/\b(calm guidance|supportive guidance|guidance|understood|guilt|harsh correction|reminders|accountability|tone)\b/i.test(lower)) {
    addPatch(patch, "Support Style", "User responds better to calm, supportive guidance than guilt-based correction.");
  }

  if (/\b(trigger|triggers|hunger|hungry|boredom|bored|social pressure|late-night|nighttime|exhaustion|tempted|temptation|stress spending|reward spending)\b/i.test(lower)) {
    addPatch(patch, "Triggers", "Hunger, boredom, social pressure, stress, or late-night exhaustion can trigger impulse spending.");
  }
  if (/\b(friends|family|invite|invited|eat out|food delivery|convenience meals)\b/i.test(lower)) {
    addPatch(patch, "Triggers", "Social invitations and convenience food can become spending triggers.");
  }

  if (/\b(emergency fund|boundaries|boundary|safety plan|protection|unexpected expenses|stable future|financial risk|shared expenses)\b/i.test(lower)) {
    addPatch(patch, "Protection", "User wants stronger boundaries and financial protection from unexpected expenses.");
  }

  if (!patch.size) addPatch(patch, "Lifestyle", text);

  return FIXED_STORY_SECTIONS.map((title) => patch.get(title)).filter(Boolean);
}

function isUsefulMemoryText(text = "") {
  const value = clean(text).toLowerCase();
  if (!value || value.length < 10) return false;
  if (/^(hi|hello|hey|okay|ok|thanks|thank you|salamat|run context diagnostic)$/i.test(value)) return false;
  if (/context diagnostic|source:|debug|test only/i.test(value)) return false;
  return /(spend|spent|buy|budget|wallet|save|goal|debt|utang|stress|tired|work|shift|family|partner|habit|routine|decision|prefer|feel|emotion|pressure|payday|bill|expense|gastos|ipon|takeout|delivery|order|food|basketball|sport|sports|jogging|gym|exercise|fitness|sleep|health|rent|home|faith|growth|support|trigger|emergency|energy|after work|friends|household|hunger|boredom)/i.test(value);
}

function normalizeMemoryJson(json = {}) {
  const cabinetNames = cleanList(json.cabinet_names).map(normalizeCabinetName).filter(Boolean).slice(0, 5);
  const summary = clean(json.summary);
  return {
    should_save: Boolean(json.should_save) && Boolean(summary) && cabinetNames.length > 0 && !isTemporaryOrLiveFactBullet(summary),
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
    .filter((text) => isUsefulMemoryText(text) && !isTemporaryOrLiveFactBullet(text))
    .slice(-6);

  if (!usefulMessages.length) return normalizeMemoryJson({ should_save: false });

  const combined = usefulMessages.join(" | ").slice(0, 700);
  const cabinets = [];
  if (/spend|spent|buy|expense|gastos|food|order|shopping|takeout|delivery/i.test(combined)) cabinets.push("Spending Memory");
  if (/budget|limit|allocation/i.test(combined)) cabinets.push("Budget Memory");
  if (/wallet|cash|gcash|maya|bank/i.test(combined)) cabinets.push("Wallet Memory");
  if (/goal|save|ipon|target/i.test(combined)) cabinets.push("Goal Memory");
  if (/debt|utang|loan/i.test(combined)) cabinets.push("Debt Memory");
  if (/work|shift|schedule|routine|sleep|payday|after work/i.test(combined)) cabinets.push("Schedule Memory");
  if (/stress|tired|feel|emotion|sad|happy|burnout|pressure|drained|exhausted/i.test(combined)) cabinets.push("Emotional Memory");
  if (/family|partner|friend|relationship|coworker/i.test(combined)) cabinets.push("Relationship Memory");
  if (/sport|sports|basketball|jogging|gym|exercise|fitness/i.test(combined)) cabinets.push("Lifestyle Memory");
  if (/prefer|style|tone|remind|guidance/i.test(combined)) cabinets.push("Preference Memory");

  return normalizeMemoryJson({
    should_save: true,
    summary: combined,
    cabinet_names: cabinets.length ? cabinets : ["Lifestyle Memory", "Decision Memory"],
    signals: ["fallback_summary", "live_session_memory"],
    emotional_tone: "not analyzed",
    financial_relevance: "Saved because the user shared a long-term behavior, routine, preference, lifestyle, or decision signal.",
    should_use_when: ["When the user asks about similar habits, routines, pressure, spending behavior, or decisions."],
  });
}

function normalizeCabinetDocumentJson(json = {}, fallbackMemory = {}) {
  const bullets = cleanList(json.bullets || json.document_bullets || json.documentBullets, 12).filter((bullet) => !isTemporaryOrLiveFactBullet(bullet));
  if (!bullets.length) {
    return {
      bullets: [clean(fallbackMemory.summary)].filter((bullet) => bullet && !isTemporaryOrLiveFactBullet(bullet)),
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
  return writeUserContextStory(mergeStoryPatch(current, { sections: deterministicSectionsFromMemory(memory) }));
}

async function updateUserContextStoryWithAi(memory = {}) {
  const currentStory = readUserContextStory();
  const deterministicPatch = { sections: deterministicSectionsFromMemory(memory) };

  if (!hasGeminiJsonConfig()) {
    return writeUserContextStory(mergeStoryPatch(currentStory, deterministicPatch));
  }

  const prompt = `You are CLARA's User Context Story Editor.

Update the user's ONE readable memory story using STRICT FIXED CATEGORIES ONLY.

IMPORTANT:
- You are NOT rewriting the whole profile.
- Return ONLY the sections that should be added or improved from the new memory.
- Existing sections not related to the new memory must be omitted from your response so the app can preserve them.

Current story:
${formatStory(currentStory)}

New memory:
${memory.summary}

Fixed categories and meanings:
${FIXED_STORY_SECTIONS.map((section) => `- ${section}: ${STORY_CATEGORY_GUIDE[section]}`).join("\n")}

Routing examples:
- "Friends invite me to eat out" -> Relationships, Food, Money, Triggers, Lifestyle.
- "Shared expenses and household needs" -> Home, Money, Protection.
- "Late-night hunger, boredom, and food delivery" -> Food, Triggers, Routine, Emotional, Money.
- "Pause first before spending" -> Decision Style, Money, Growth.
- "Basketball helps me cope" -> Health, Lifestyle, Emotional, Routine, Triggers.

Rules:
- Return JSON only.
- NEVER create a new category.
- Use only the fixed category titles exactly as written.
- One memory may affect multiple categories.
- If the memory says basketball, sports, gym, jogging, exercise, or fitness, place it under Health, Routine, Triggers, Money, or Lifestyle depending on meaning. Do NOT create Sports or Fitness.
- If the memory mentions after-work rhythm, night routine, payday weekends, resting first, planning properly, or preparing before spending, update Routine.
- Do NOT save exact wallet balances, current amounts, current remaining budget, one-time affordability checks, or temporary app states.
- Save long-term behavior patterns, preferences, triggers, routines, emotional patterns, and stable life context only.
- Improve related bullets instead of duplicating them.
- Maximum 8 bullets per returned section.
- Keep bullets concise and human-readable.

JSON shape:
{"sections":[{"title":"Routine","bullets":[]}]}`;

  try {
    const result = await requestGeminiJson({ prompt, temperature: 0.12, maxOutputTokens: 1300, label: "CLARA User Context Story Editor" });
    const aiPatch = normalizeStory(result.json || {});
    return writeUserContextStory(mergeStoryPatch(currentStory, mergeStoryPatch(deterministicPatch, aiPatch)));
  } catch {
    return writeUserContextStory(mergeStoryPatch(currentStory, deterministicPatch));
  }
}

async function updateCabinetBulletsWithAi({ cabinetName, memory } = {}) {
  const currentDocument = readMemoryCabinet(cabinetName)?.[0] || null;
  const currentBullets = cleanList(currentDocument?.document_bullets, 12).filter((bullet) => !isTemporaryOrLiveFactBullet(bullet));

  if (!hasGeminiJsonConfig()) return normalizeCabinetDocumentJson({}, memory);

  const prompt = `You are CLARA's Cabinet Memory Editor.
Update this cabinet: ${cabinetName}
Current bullets:
${currentBullets.length ? currentBullets.map((bullet) => `- ${bullet}`).join("\n") : "No saved bullets yet."}
New memory:
${memory.summary}
Rules:
- Do not save exact wallet balances, current amounts, or one-time app states.
- Save stable patterns only.
Return JSON only: {"bullets":[],"signals":[],"emotional_tone":"","financial_relevance":"","should_use_when":[]}`;

  try {
    const result = await requestGeminiJson({ prompt, temperature: 0.12, maxOutputTokens: 760, label: "CLARA Cabinet Memory Editor" });
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
    .filter((message) => message.text && !isTemporaryOrLiveFactBullet(message.text))
    .slice(-30);

  if (!cleanMessages.some((message) => isUsefulMemoryText(message.text))) return normalizeMemoryJson({ should_save: false });
  if (!hasGeminiJsonConfig()) return fallbackSummaryFromMessages(cleanMessages);

  const prompt = `You are CLARA's Conversation Memory Summarizer.
Summarize this chat into useful long-term memory only.

Save only stable life context:
- behavior patterns
- emotional triggers
- spending habits
- goals or growth direction without exact live amounts
- decision style
- support style
- routines
- health/lifestyle patterns that affect money

Do NOT save:
- exact wallet balances
- available balance
- current amount left
- one-time affordability checks
- live dashboard/card values
- temporary questions like "can I afford this right now?"

Available cabinets:
${getAvailableCabinetNames().map((name) => `- ${name}`).join("\n")}

Return JSON only: {"should_save":true,"summary":"","cabinet_names":[],"signals":[],"emotional_tone":"","financial_relevance":"","should_use_when":[]}
Conversation:
${JSON.stringify(cleanMessages, null, 2)}`;

  try {
    const result = await requestGeminiJson({ prompt, temperature: 0.12, maxOutputTokens: 850, label: "CLARA Conversation Memory Summarizer" });
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
    if (!cabinetDocument.bullets.length) continue;
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
