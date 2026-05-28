import { hasGeminiJsonConfig, requestGeminiJson } from "@/lib/clara-gemini-json-utils";

const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const MEMORY_PANEL_ID = "clara-assistant-memory-panel";
const MEMORY_EDIT_PANEL_ID = "clara-assistant-memory-edit-panel";
const MAX_BULLETS_PER_SECTION = 8;

const FIXED_MEMORY_SECTIONS = [
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

const SECTION_ALIASES = new Map([
  ["spending", "Money"],
  ["budget", "Money"],
  ["wallet", "Money"],
  ["goals", "Money"],
  ["goal", "Money"],
  ["emergency", "Protection"],
  ["debt", "Money"],
  ["bills", "Money"],
  ["schedule", "Routine"],
  ["preference", "Support Style"],
  ["decision", "Decision Style"],
  ["learning", "Growth"],
  ["relationship", "Relationships"],
  ["relationships", "Relationships"],
  ["sports", "Health"],
  ["sport", "Health"],
  ["fitness", "Health"],
]);

const EMPTY_CATEGORY_TEXT = "No strong pattern saved yet.";
const MEMORY_EDIT_INTRO = "You’re editing CLARA’s memory board. Tell me what you want to add, move, remove, or correct. For example: ‘Move the food delivery note from Money to Food.’";
const MEMORY_EDIT_FOLLOW_UP = "Anything else you want to add, move, remove, or correct?";

let memoryEditMessages = [];
let memoryEditProcessing = false;
let pendingMemoryEditClarification = null;

function safeParseStorage(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function now() {
  return new Date().toISOString();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value = "") {
  if (!value) return "Not updated yet";
  try {
    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return clean(value) || "Not updated yet";
  }
}

function normalizeTitleKey(value = "") {
  return clean(value)
    .replace(/memory$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fixedTitleFromSection(value = "") {
  const key = normalizeTitleKey(value);
  const direct = FIXED_MEMORY_SECTIONS.find((title) => title.toLowerCase() === key);
  return direct || SECTION_ALIASES.get(key) || "Lifestyle";
}

function cleanBullet(value = "") {
  return clean(value)
    .replace(/^[•\-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function isTemporaryOrLiveFact(value = "") {
  const text = clean(value).toLowerCase();
  if (!text) return true;
  if (/[₱$€£]\s?\d|\b\d+[,.]?\d*\s?(php|peso|pesos)\b/i.test(text)) return true;
  if (/\b(available|current|total)\s+(balance|wallet balance|amount|money)\b/i.test(text)) return true;
  if (/\b(balance across all wallets|money left right now|remaining right now|currently has|currently have)\b/i.test(text)) return true;
  if (/\b(is asking|asked|checking their wallet|checking his wallet|checking her wallet|see if they can afford|recent improvement in spending habits)\b/i.test(text)) return true;
  if (/\b(today|right now|currently|this exact moment)\b.*\b(balance|wallet|amount|remaining|left)\b/i.test(text)) return true;
  if (/^no strong pattern saved yet\.?$/i.test(text)) return true;
  return false;
}

function categoryForBullet(bullet = "", fallbackTitle = "Lifestyle") {
  const text = clean(bullet).toLowerCase();

  if (/\b(name|age|gender|life stage|role|location|student|professional|creator)\b/i.test(text)) return "Identity";
  if (/\b(work|job|shift|career|income pattern|payday|after work|bpo|office)\b/i.test(text)) return "Work";
  if (/\b(spend|spending|budget|wallet|save|saving|debt|bill|bills|gastos|ipon|afford|purchase|money|expense)\b/i.test(text)) return "Money";
  if (/\b(stress|exhaust|tired|anxiety|guilt|motivation|confidence|emotion|mental|reward-spending|drained)\b/i.test(text)) return "Emotional";
  if (/\b(sleep|energy|exercise|basketball|sport|sports|gym|jogging|fitness|sickness|medication|food discipline)\b/i.test(text)) return "Health";
  if (/\b(routine|commute|after-work|after work|weekend|nighttime|night|daily|payday rhythm|low energy periods)\b/i.test(text)) return "Routine";
  if (/\b(family|partner|friend|coworker|dependent|social pressure|relationship|girlfriend|boyfriend|wife|husband)\b/i.test(text)) return "Relationships";
  if (/\b(home|rent|household|living situation|shared expenses)\b/i.test(text)) return "Home";
  if (/\b(food|craving|delivery|convenience food|groceries|meal|takeout|order food)\b/i.test(text)) return "Food";
  if (/\b(hobby|entertainment|shopping|travel|social life|basketball)\b/i.test(text)) return "Lifestyle";
  if (/\b(learning|goals|discipline|faith|self-improvement|improve|growth)\b/i.test(text)) return "Growth";
  if (/\b(decide|decision|hesitation|impulsive|risk tolerance|pause-before-spending|pause before spending)\b/i.test(text)) return "Decision Style";
  if (/\b(guidance|reminder|tone|accountability|responds better|supportive|guilt)\b/i.test(text)) return "Support Style";
  if (/\b(trigger|cause|temptation|avoidance|reward behavior|risk window|lowers resistance)\b/i.test(text)) return "Triggers";
  if (/\b(emergency fund|boundary|boundaries|safety plan|protection|financial risk)\b/i.test(text)) return "Protection";

  return fallbackTitle;
}

function collectSectionMap(value, options = {}) {
  const { trustSavedTitles = false } = options;
  const merged = new Map();
  if (!value || typeof value !== "object") return merged;

  const sections = Array.isArray(value.sections) ? value.sections : [];
  const schemaVersion = Number(value.schemaVersion || 0);
  const shouldTrustTitles = trustSavedTitles || schemaVersion >= 5;

  sections.forEach((section) => {
    const fallbackTitle = fixedTitleFromSection(section.title || section.name || section.category || "Lifestyle");
    const bullets = Array.isArray(section.bullets) ? section.bullets : section.items || section.memories || [];

    bullets.map(cleanBullet).filter(Boolean).forEach((bullet) => {
      if (isTemporaryOrLiveFact(bullet)) return;
      const title = shouldTrustTitles ? fallbackTitle : categoryForBullet(bullet, fallbackTitle);
      const existing = merged.get(title) || { title, bullets: [] };

      if (!existing.bullets.some((item) => item.toLowerCase() === bullet.toLowerCase())) {
        existing.bullets.push(bullet);
      }

      existing.bullets = existing.bullets.slice(0, MAX_BULLETS_PER_SECTION);
      merged.set(title, existing);
    });
  });

  return merged;
}

function normalizeSections(value, { includeEmpty = true, trustSavedTitles = false } = {}) {
  const merged = collectSectionMap(value, { trustSavedTitles });

  return FIXED_MEMORY_SECTIONS
    .map((title) => {
      const existing = merged.get(title);
      return existing || (includeEmpty ? { title, bullets: [], isEmpty: true } : null);
    })
    .filter(Boolean);
}

function buildNormalizedStory(rawStory = {}) {
  const sections = normalizeSections(rawStory, { includeEmpty: false, trustSavedTitles: true });
  return {
    id: "clara-user-context-story",
    type: "user_context_story",
    schemaVersion: 8,
    sections: sections.map((section) => ({
      id: section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: section.title,
      type: "fixed",
      bullets: section.bullets,
      createdAt: rawStory?.createdAt || now(),
      updatedAt: now(),
    })),
    createdAt: rawStory?.createdAt || now(),
    updatedAt: now(),
    sectionCount: sections.length,
    bulletCount: sections.reduce((sum, section) => sum + section.bullets.length, 0),
    source: "clara_user_context_story",
  };
}

function migrateStoredStoryIfNeeded(rawStory) {
  if (!rawStory || typeof rawStory !== "object") return rawStory;

  const normalized = buildNormalizedStory(rawStory);
  const before = JSON.stringify(rawStory.sections || []);
  const after = JSON.stringify(normalized.sections || []);
  const usesOnlyFixed = normalized.sections.every((section) => FIXED_MEMORY_SECTIONS.includes(section.title));

  if (before !== after || Number(rawStory.schemaVersion || 0) < 8 || !usesOnlyFixed) {
    try {
      window.localStorage.setItem(USER_CONTEXT_STORY_KEY, JSON.stringify(normalized));
      window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: normalized }));
    } catch {}
    return normalized;
  }

  return rawStory;
}

function readUserContextStory() {
  return migrateStoredStoryIfNeeded(safeParseStorage(USER_CONTEXT_STORY_KEY) || {}) || buildNormalizedStory({});
}

function writeUserContextStory(story = {}) {
  const normalized = buildNormalizedStory({ ...story, updatedAt: now() });
  try {
    window.localStorage.setItem(USER_CONTEXT_STORY_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: normalized }));
  } catch {}
  return normalized;
}

function createEmptyMemoryPanel() {
  return `
    <div class="clara-memory-empty">
      <p class="clara-memory-title">No saved memory yet.</p>
      <p class="clara-memory-note">Once CLARA summarizes your story or behavioral context, it will appear here as readable bullet sections.</p>
    </div>
  `;
}

function createSectionHtml(section) {
  const items = section.bullets.length
    ? section.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")
    : `<li class="clara-memory-section-empty-line">${EMPTY_CATEGORY_TEXT}</li>`;

  return `
    <section class="clara-memory-section ${section.bullets.length ? "" : "is-empty"}">
      <h4>${escapeHtml(section.title)}</h4>
      <ul>${items}</ul>
    </section>
  `;
}

function buildMemoryPanelHtml() {
  const userStory = readUserContextStory();
  const sections = normalizeSections(userStory, { includeEmpty: true, trustSavedTitles: true });
  const updatedAt = userStory?.updatedAt || userStory?.createdAt || "";

  return `
    <div id="${MEMORY_PANEL_ID}" class="clara-memory-review-shell" role="dialog" aria-label="CLARA Memory Review">
      <div class="clara-memory-review-backdrop" data-close-clara-context-memory="true"></div>
      <section class="clara-memory-review-panel">
        <header class="clara-memory-review-header">
          <div>
            <p>CLARA Internal</p>
            <h2>Memory Review</h2>
            <span>Last updated: ${formatDate(updatedAt)}</span>
          </div>
          <div class="clara-memory-header-actions">
            <button type="button" data-open-clara-memory-edit="true" aria-label="Edit memory board" title="Edit memory board">✎</button>
            <button type="button" data-close-clara-context-memory="true" aria-label="Close memory review">×</button>
          </div>
        </header>

        <main class="clara-memory-review-list">
          <div class="clara-memory-context-intro">
            <p>What CLARA understands so far</p>
            <span>This fixed life context board shows all master categories. Empty cards mean CLARA has no strong saved pattern there yet.</span>
          </div>

          <div class="clara-memory-context-disclaimer">
            <p>CLARA is still learning you.</p>
            <span>Some memories may be incomplete or misunderstood. Tap the pen above to add, move, remove, or correct anything.</span>
          </div>

          ${sections.length ? sections.map(createSectionHtml).join("") : createEmptyMemoryPanel()}
        </main>
      </section>
    </div>
  `;
}

function buildMemoryBoardText(story = readUserContextStory()) {
  const sections = normalizeSections(story, { includeEmpty: true, trustSavedTitles: true });
  return sections
    .map((section) => {
      const bullets = section.bullets.length ? section.bullets.map((bullet) => `- ${bullet}`).join("\n") : "- No saved memory.";
      return `${section.title}\n${bullets}`;
    })
    .join("\n\n");
}

function normalizePatchUpdates(updates = []) {
  return (Array.isArray(updates) ? updates : [])
    .map((update) => {
      const category = fixedTitleFromSection(update?.category || update?.title || update?.section || "");
      const remove = Array.isArray(update?.remove) ? update.remove.map(cleanBullet).filter(Boolean) : [];
      const add = Array.isArray(update?.add) ? update.add.map(cleanBullet).filter((item) => item && !isTemporaryOrLiveFact(item)) : [];
      if (!FIXED_MEMORY_SECTIONS.includes(category)) return null;
      if (!remove.length && !add.length) return null;
      return { category, remove, add };
    })
    .filter(Boolean);
}

function normalizeMemoryEditResult(json = {}, fallbackReply = "") {
  const status = ["needs_clarification", "ready_to_update", "no_change"].includes(json?.status)
    ? json.status
    : normalizePatchUpdates(json?.updates || []).length
      ? "ready_to_update"
      : "needs_clarification";

  const updates = normalizePatchUpdates(json?.updates || []);
  const clarifyingQuestion = clean(json?.clarifying_question || json?.clarifyingQuestion || "");
  const assistantReply = clean(json?.assistant_reply || json?.assistantReply || fallbackReply || "");

  if (status === "ready_to_update" && !updates.length) {
    return {
      status: "needs_clarification",
      updates: [],
      clarifying_question: clarifyingQuestion || "What exactly should I add, move, remove, or correct?",
      assistant_reply: assistantReply || clarifyingQuestion || "What exactly should I add, move, remove, or correct?",
    };
  }

  if (status === "needs_clarification") {
    const question = clarifyingQuestion || assistantReply || "What should CLARA change on your memory board?";
    return {
      status,
      updates: [],
      clarifying_question: question,
      assistant_reply: assistantReply || question,
    };
  }

  return {
    status,
    updates,
    clarifying_question: clarifyingQuestion,
    assistant_reply: assistantReply || (status === "ready_to_update" ? `Got it — I updated your memory board. ${MEMORY_EDIT_FOLLOW_UP}` : "No changes made yet."),
  };
}

function matchBulletForRemoval(savedBullet = "", removal = "") {
  const saved = clean(savedBullet).toLowerCase();
  const target = clean(removal).toLowerCase();
  if (!saved || !target) return false;
  if (saved === target) return true;
  if (saved.includes(target) || target.includes(saved)) return true;

  const savedWords = new Set(saved.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 3));
  const targetWords = target.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 3);
  if (!savedWords.size || !targetWords.length) return false;
  const hits = targetWords.filter((word) => savedWords.has(word)).length;
  return hits >= Math.min(3, targetWords.length);
}

function applyMemoryBoardPatch(existingStory = readUserContextStory(), updates = []) {
  const normalizedUpdates = normalizePatchUpdates(updates);
  const currentSections = normalizeSections(existingStory, { includeEmpty: false, trustSavedTitles: true });
  const map = new Map(currentSections.map((section) => [section.title, { ...section, bullets: [...section.bullets] }]));

  normalizedUpdates.forEach((update) => {
    const existing = map.get(update.category) || { title: update.category, bullets: [] };
    let bullets = [...existing.bullets];

    if (update.remove.length) {
      bullets = bullets.filter((bullet) => !update.remove.some((removal) => matchBulletForRemoval(bullet, removal)));
    }

    update.add.forEach((bullet) => {
      if (!bullet || isTemporaryOrLiveFact(bullet)) return;
      if (!bullets.some((saved) => saved.toLowerCase() === bullet.toLowerCase())) {
        bullets.push(bullet);
      }
    });

    bullets = bullets.map(cleanBullet).filter((bullet) => bullet && !isTemporaryOrLiveFact(bullet)).slice(0, MAX_BULLETS_PER_SECTION);

    if (bullets.length) map.set(update.category, { title: update.category, bullets });
    else map.delete(update.category);
  });

  const nextSections = FIXED_MEMORY_SECTIONS
    .map((title) => map.get(title))
    .filter((section) => section?.bullets?.length)
    .map((section) => ({
      id: section.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      title: section.title,
      type: "fixed",
      bullets: section.bullets.slice(0, MAX_BULLETS_PER_SECTION),
      createdAt: existingStory?.createdAt || now(),
      updatedAt: now(),
      source: "user_corrected",
    }));

  return {
    id: "clara-user-context-story",
    type: "user_context_story",
    schemaVersion: 8,
    sections: nextSections,
    createdAt: existingStory?.createdAt || now(),
    updatedAt: now(),
    sectionCount: nextSections.length,
    bulletCount: nextSections.reduce((sum, section) => sum + section.bullets.length, 0),
    source: "clara_user_context_story",
  };
}

function isExitMemoryEditText(value = "") {
  const text = clean(value).toLowerCase().replace(/[.!?]+$/g, "");
  return /^(no|no thanks|that'?s all|thats all|done|exit|exit edit mode|stop|okay na|tapos na|all set|all set for now|nothing else|good for now|i'?m good|im good|we'?re good|were good)$/i.test(text);
}

function buildMemoryEditPrompt(userMessage = "") {
  const pendingBlock = pendingMemoryEditClarification
    ? `\nPrevious unclear message:\n"${pendingMemoryEditClarification.originalUserMessage}"\n\nClarifying question CLARA already asked:\n"${pendingMemoryEditClarification.clarifyingQuestion}"\n\nUser's new answer:\n"${clean(userMessage)}"\n\nUse the previous unclear message, the clarifying question, and the user's new answer together. If the answer now makes the edit clear, return ready_to_update. If it is still unclear, ask one more specific follow-up and do not update yet.`
    : `\nUser correction:\n"${clean(userMessage)}"`;

  return `You are CLARA’s Memory Board Editor.

You are not just a command parser. You are a conversational memory editor.
Your job is to understand whether the user gave enough information to safely update CLARA's memory board.

Current memory board:
${buildMemoryBoardText()}
${pendingBlock}

Return JSON only with this exact shape:
{
  "status": "needs_clarification" | "ready_to_update" | "no_change",
  "clarifying_question": "",
  "updates": [
    { "category": "Relationships", "remove": [], "add": ["User is in a relationship."] }
  ],
  "assistant_reply": ""
}

Core rules:
- If the user's instruction is clear, return status "ready_to_update" and a PATCH only.
- If the user's instruction is unclear, incomplete, too vague, or references "that" without a clear target, return "needs_clarification" and ask one natural follow-up question.
- Do NOT update memory when status is "needs_clarification".
- Never pretend an update happened if it did not.
- If the user asks a normal question during edit mode, answer briefly in assistant_reply and connect it back to memory editing. Use status "no_change" unless they also request an edit.
- Treat user correction as higher authority than AI-generated memory.
- Preserve unrelated categories.
- Do not rewrite the whole board.
- Use only fixed categories. Never create custom categories.
- May update multiple categories only when the user's meaning is clear.
- Never save live balances, temporary amounts, one-time affordability checks, or “user is asking/checking…”
- Keep bullets concise, human-readable, and stable.

Fixed categories only:
${FIXED_MEMORY_SECTIONS.join(", ")}

When to ask clarification:
- "I have a girlfriend" -> Ask whether to save simply under Relationships or also as emotional/future money context.
- "Move that to Lifestyle" -> Ask which memory they mean.
- "On lifestyle" -> Ask what they want to add or correct under Lifestyle.
- "Fix this" -> Ask what should be changed and where.

Good replies:
- "Got it — I added your girlfriend under Relationships. Since you only mentioned the relationship detail, I didn’t add anything to Money or Emotional yet. ${MEMORY_EDIT_FOLLOW_UP}"
- "I’m not sure what you want added under Lifestyle yet. What should CLARA remember — a hobby, habit, preference, or spending pattern?"
- "Which memory do you want me to move to Lifestyle — the basketball coping habit or the healthier hobbies note?"`;
}

function fallbackMemoryEditResult(userMessage = "") {
  const text = clean(userMessage);
  const lower = text.toLowerCase();
  const updates = [];
  const categoryPattern = FIXED_MEMORY_SECTIONS.map((item) => item.replace(/\s+/g, "\\s+")).join("|");

  if (pendingMemoryEditClarification) {
    const targetCategory = fixedTitleFromSection(pendingMemoryEditClarification.possibleTargetCategory || "");
    if (FIXED_MEMORY_SECTIONS.includes(targetCategory) && text.length > 4) {
      updates.push({ category: targetCategory, remove: [], add: [text] });
      return normalizeMemoryEditResult({
        status: "ready_to_update",
        updates,
        assistant_reply: `Got it — I added that under ${targetCategory}. ${MEMORY_EDIT_FOLLOW_UP}`,
      });
    }
  }

  const moveMatch = lower.match(new RegExp(`move\\s+(.+?)\\s+from\\s+(${categoryPattern})\\s+to\\s+(${categoryPattern})`, "i"));
  if (moveMatch) {
    const phrase = clean(moveMatch[1]);
    updates.push({ category: fixedTitleFromSection(moveMatch[2]), remove: [phrase], add: [] });
    updates.push({ category: fixedTitleFromSection(moveMatch[3]), remove: [], add: [phrase] });
    return normalizeMemoryEditResult({ status: "ready_to_update", updates, assistant_reply: `Got it — I moved that memory. ${MEMORY_EDIT_FOLLOW_UP}` });
  }

  const addMatch = text.match(new RegExp(`(?:add|save|put)\\s+(?:this\\s+)?(?:to|under|in|on)\\s+(${categoryPattern})[:\\s-]+(.+)`, "i"));
  if (addMatch) {
    const category = fixedTitleFromSection(addMatch[1]);
    updates.push({ category, remove: [], add: [clean(addMatch[2])] });
    return normalizeMemoryEditResult({ status: "ready_to_update", updates, assistant_reply: `Got it — I added that under ${category}. ${MEMORY_EDIT_FOLLOW_UP}` });
  }

  const relationshipAdd = /\b(add|save|remember|put)\b/i.test(text) && /\b(relationship|relationships|girlfriend|boyfriend|partner)\b/i.test(text);
  if (relationshipAdd) {
    updates.push({ category: "Relationships", remove: [], add: [text.replace(/^no,?\s*/i, "")] });
    return normalizeMemoryEditResult({
      status: "ready_to_update",
      updates,
      assistant_reply: `Got it — I added that under Relationships. Since you only mentioned the relationship detail, I didn’t add anything to Money or Emotional yet. ${MEMORY_EDIT_FOLLOW_UP}`,
    });
  }

  if (/^on\s+/.test(lower) || /^under\s+/.test(lower) || /^in\s+/.test(lower)) {
    const category = FIXED_MEMORY_SECTIONS.find((item) => lower.includes(item.toLowerCase()));
    const target = category || "that category";
    return normalizeMemoryEditResult({
      status: "needs_clarification",
      clarifying_question: `What would you like me to add or correct under ${target}?`,
      assistant_reply: `What would you like me to add or correct under ${target}?`,
    });
  }

  if (/\b(that|this|it)\b/i.test(text) && /\b(move|remove|delete|change|fix)\b/i.test(text)) {
    return normalizeMemoryEditResult({
      status: "needs_clarification",
      clarifying_question: "Which memory do you mean, and what category should I update?",
      assistant_reply: "Which memory do you mean, and what category should I update?",
    });
  }

  if (/\b(girlfriend|boyfriend|partner)\b/i.test(text) && !/\b(add|save|remember|put)\b/i.test(text)) {
    return normalizeMemoryEditResult({
      status: "needs_clarification",
      clarifying_question: "Do you want me to save this simply under Relationships, or should I also remember that your relationship may affect emotional support or future money decisions?",
      assistant_reply: "Got it. Do you want me to save this simply under Relationships, or should I also remember that your relationship may affect emotional support or future money decisions?",
    });
  }

  return normalizeMemoryEditResult({
    status: "needs_clarification",
    clarifying_question: "What exactly should I add, move, remove, or correct on your memory board?",
    assistant_reply: "What exactly should I add, move, remove, or correct on your memory board?",
  });
}

async function getMemoryBoardEditResult(userMessage = "") {
  if (!hasGeminiJsonConfig()) return fallbackMemoryEditResult(userMessage);

  try {
    const result = await requestGeminiJson({
      prompt: buildMemoryEditPrompt(userMessage),
      temperature: 0.22,
      maxOutputTokens: 1300,
      label: "CLARA Conversational Memory Board Editor",
    });

    return normalizeMemoryEditResult(result.json || {});
  } catch (error) {
    console.warn("[CLARA Memory Edit] Gemini failed, using conversational fallback.", error);
    return fallbackMemoryEditResult(userMessage);
  }
}

function createMemoryEditMessageHtml(message, index) {
  const role = message.role === "user" ? "user" : "assistant";
  return `
    <div class="clara-memory-edit-message ${role}" data-memory-edit-message-index="${index}">
      ${escapeHtml(message.text).replace(/\n/g, "<br>")}
    </div>
  `;
}

function buildMemoryEditPanelHtml() {
  return `
    <div id="${MEMORY_EDIT_PANEL_ID}" class="clara-memory-review-shell clara-memory-edit-shell" role="dialog" aria-label="CLARA Memory Edit Mode">
      <div class="clara-memory-review-backdrop" data-close-clara-memory-edit="true"></div>
      <section class="clara-memory-review-panel clara-memory-edit-panel">
        <header class="clara-memory-review-header">
          <div>
            <p>CLARA Memory</p>
            <h2>Edit Mode</h2>
            <span>Fixed categories only • User corrections are trusted</span>
          </div>
          <div class="clara-memory-header-actions">
            <button type="button" data-open-clara-memory-review="true" aria-label="Back to memory review">←</button>
            <button type="button" data-close-clara-memory-edit="true" aria-label="Close memory edit">×</button>
          </div>
        </header>

        <main class="clara-memory-edit-body">
          <div class="clara-memory-edit-note">
            <p>Edit Memory Board</p>
            <span>Tell CLARA what to add, move, remove, or correct. If something is unclear, CLARA should ask before changing memory.</span>
          </div>

          <div class="clara-memory-edit-messages" data-memory-edit-messages="true">
            ${memoryEditMessages.map(createMemoryEditMessageHtml).join("")}
            ${memoryEditProcessing ? `<div class="clara-memory-edit-message assistant">CLARA is thinking through your edit...</div>` : ""}
          </div>
        </main>

        <form class="clara-memory-edit-form" data-memory-edit-form="true">
          <input name="memoryEditText" ${memoryEditProcessing ? "disabled" : ""} autocomplete="off" placeholder="Add, move, remove, or correct memory..." />
          <button type="submit" ${memoryEditProcessing ? "disabled" : ""}>↑</button>
        </form>
      </section>
    </div>
  `;
}

function removeMemoryEditPanel() {
  document.getElementById(MEMORY_EDIT_PANEL_ID)?.remove();
}

function removeMemoryPanel() {
  document.getElementById(MEMORY_PANEL_ID)?.remove();
}

function showMemoryEditPanel() {
  removeMemoryPanel();
  removeMemoryEditPanel();
  if (!memoryEditMessages.length) {
    memoryEditMessages = [{ role: "assistant", text: MEMORY_EDIT_INTRO }];
  }
  document.body.insertAdjacentHTML("beforeend", buildMemoryEditPanelHtml());
  requestAnimationFrame(() => {
    const input = document.querySelector(`#${MEMORY_EDIT_PANEL_ID} input[name="memoryEditText"]`);
    const messages = document.querySelector(`#${MEMORY_EDIT_PANEL_ID} [data-memory-edit-messages]`);
    input?.focus?.();
    messages?.scrollTo?.({ top: messages.scrollHeight, behavior: "smooth" });
  });
}

function showMemoryPanel() {
  removeMemoryPanel();
  removeMemoryEditPanel();
  document.body.insertAdjacentHTML("beforeend", buildMemoryPanelHtml());
}

async function submitMemoryEditText(userMessage = "") {
  const text = clean(userMessage);
  if (!text || memoryEditProcessing) return;

  memoryEditMessages.push({ role: "user", text });

  if (isExitMemoryEditText(text)) {
    pendingMemoryEditClarification = null;
    memoryEditMessages.push({ role: "assistant", text: "All set — I kept your memory board saved." });
    showMemoryEditPanel();
    window.setTimeout(() => showMemoryPanel(), 620);
    return;
  }

  memoryEditProcessing = true;
  showMemoryEditPanel();

  try {
    const result = await getMemoryBoardEditResult(text);

    if (result.status === "ready_to_update") {
      const updates = normalizePatchUpdates(result.updates || []);
      if (updates.length) {
        const existingStory = readUserContextStory();
        const nextStory = applyMemoryBoardPatch(existingStory, updates);
        writeUserContextStory(nextStory);
      }
      pendingMemoryEditClarification = null;
      memoryEditMessages.push({ role: "assistant", text: result.assistant_reply || `Got it — I updated your memory board. ${MEMORY_EDIT_FOLLOW_UP}` });
    } else if (result.status === "needs_clarification") {
      pendingMemoryEditClarification = {
        originalUserMessage: pendingMemoryEditClarification?.originalUserMessage || text,
        clarifyingQuestion: result.clarifying_question || result.assistant_reply,
        possibleTargetCategory: result.possible_target_category || result.possibleTargetCategory || "",
        possibleAction: result.possible_action || result.possibleAction || "",
        createdAt: now(),
      };
      memoryEditMessages.push({ role: "assistant", text: result.assistant_reply || result.clarifying_question || "What should I clarify before updating memory?" });
    } else {
      pendingMemoryEditClarification = null;
      memoryEditMessages.push({ role: "assistant", text: result.assistant_reply || `No memory change made yet. ${MEMORY_EDIT_FOLLOW_UP}` });
    }
  } catch (error) {
    console.error("[CLARA Memory Edit] Failed to update memory board.", error);
    memoryEditMessages.push({ role: "assistant", text: "I couldn’t update that memory yet. Tell me the category and what to add, move, remove, or correct." });
  } finally {
    memoryEditProcessing = false;
    showMemoryEditPanel();
  }
}

function ensureMemoryStyles() {
  if (document.getElementById("clara-assistant-memory-tab-style")) return;

  const style = document.createElement("style");
  style.id = "clara-assistant-memory-tab-style";
  style.textContent = `
    .clara-memory-review-shell {
      position: fixed;
      inset: 0;
      z-index: 520;
      display: flex;
      justify-content: center;
      align-items: stretch;
      color: white;
      padding: 0;
    }
    .clara-memory-review-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(2,6,23,.58);
      backdrop-filter: blur(5px);
    }
    .clara-memory-review-panel {
      position: relative;
      width: min(430px, 100vw);
      min-height: 100vh;
      height: 100vh;
      max-height: 100vh;
      overflow: hidden;
      border-radius: 0;
      border: 1px solid rgba(255,255,255,.12);
      background: radial-gradient(circle at 18% 0%, rgba(45,212,191,.22), transparent 34%), radial-gradient(circle at 84% 10%, rgba(124,58,237,.24), transparent 38%), linear-gradient(145deg, rgba(3,12,22,.97), rgba(24,28,72,.94));
      box-shadow: 0 -22px 90px rgba(0,0,0,.54), inset 0 1px 0 rgba(255,255,255,.10);
      backdrop-filter: blur(24px);
      display: flex;
      flex-direction: column;
      padding-top: max(env(safe-area-inset-top), 18px);
    }
    .clara-memory-review-header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 20px 14px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      flex: 0 0 auto;
    }
    .clara-memory-review-header p {
      margin: 0 0 6px;
      color: rgba(125,211,252,.72);
      font: 900 10px/1 system-ui, sans-serif;
      letter-spacing: .22em;
      text-transform: uppercase;
    }
    .clara-memory-review-header h2 {
      margin: 0;
      font: 950 24px/1.05 system-ui, sans-serif;
      color: white;
    }
    .clara-memory-review-header span {
      display: block;
      margin-top: 7px;
      color: rgba(226,232,240,.68);
      font: 750 12px/1.4 system-ui, sans-serif;
    }
    .clara-memory-header-actions {
      display: inline-flex;
      gap: 8px;
      flex: 0 0 auto;
    }
    .clara-memory-review-header button,
    .clara-memory-edit-form button {
      width: 40px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.16);
      background: rgba(255,255,255,.06);
      color: white;
      font-size: 20px;
      flex: 0 0 auto;
      transition: transform .16s ease, background .16s ease;
    }
    .clara-memory-review-header button:active,
    .clara-memory-edit-form button:active { transform: scale(.96); }
    .clara-memory-review-list {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 14px 14px max(24px, env(safe-area-inset-bottom));
      scrollbar-width: none;
    }
    .clara-memory-review-list::-webkit-scrollbar,
    .clara-memory-edit-messages::-webkit-scrollbar { display: none; }
    .clara-memory-context-intro,
    .clara-memory-context-disclaimer,
    .clara-memory-edit-note {
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 24px;
      background: rgba(255,255,255,.045);
      padding: 14px;
      margin-bottom: 12px;
    }
    .clara-memory-context-disclaimer {
      border-color: rgba(125,211,252,.16);
      background: rgba(125,211,252,.065);
    }
    .clara-memory-context-intro p,
    .clara-memory-context-disclaimer p,
    .clara-memory-edit-note p {
      margin: 0;
      font: 950 15px/1.2 system-ui, sans-serif;
      color: rgba(255,255,255,.94);
    }
    .clara-memory-context-intro span,
    .clara-memory-context-disclaimer span,
    .clara-memory-edit-note span {
      display: block;
      margin-top: 8px;
      color: rgba(203,213,225,.68);
      font: 650 12px/1.55 system-ui, sans-serif;
    }
    .clara-memory-section {
      margin-bottom: 10px;
      border: 1px solid rgba(255,255,255,.09);
      border-radius: 24px;
      background: rgba(255,255,255,.055);
      padding: 14px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.07);
    }
    .clara-memory-section.is-empty {
      background: rgba(255,255,255,.032);
      border-style: dashed;
    }
    .clara-memory-section h4 {
      margin: 0 0 10px;
      font: 950 14px/1 system-ui, sans-serif;
      color: rgba(110,231,183,.95);
    }
    .clara-memory-section ul {
      margin: 0;
      padding-left: 18px;
      display: grid;
      gap: 8px;
    }
    .clara-memory-section li {
      color: rgba(248,250,252,.90);
      font: 700 12.5px/1.55 system-ui, sans-serif;
    }
    .clara-memory-section-empty-line {
      color: rgba(203,213,225,.48) !important;
      font-style: italic !important;
      list-style-type: none;
      margin-left: -18px;
    }
    .clara-memory-empty {
      border: 1px dashed rgba(255,255,255,.14);
      border-radius: 24px;
      padding: 28px 18px;
      background: rgba(255,255,255,0.05);
      text-align: center;
    }
    .clara-memory-title {
      margin: 0;
      font: 900 14px/1.4 system-ui, sans-serif;
      color: white;
    }
    .clara-memory-note {
      display: block;
      margin-top: 8px;
      font: 650 12px/1.55 system-ui, sans-serif;
      color: rgba(203,213,225,0.76);
    }
    .clara-memory-edit-panel { padding-bottom: max(env(safe-area-inset-bottom), 12px); }
    .clara-memory-edit-body {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 14px 14px 0;
    }
    .clara-memory-edit-messages {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding-bottom: 12px;
      scrollbar-width: none;
    }
    .clara-memory-edit-message {
      max-width: 92%;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 22px;
      padding: 11px 13px;
      font: 700 12.5px/1.55 system-ui, sans-serif;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
    }
    .clara-memory-edit-message.assistant {
      align-self: flex-start;
      background: rgba(255,255,255,.055);
      color: rgba(248,250,252,.88);
    }
    .clara-memory-edit-message.user {
      align-self: flex-end;
      background: rgba(110,231,183,.18);
      border-color: rgba(110,231,183,.22);
      color: white;
    }
    .clara-memory-edit-form {
      margin: 0 14px;
      display: flex;
      gap: 8px;
      align-items: center;
      border: 1px solid rgba(255,255,255,.10);
      border-radius: 22px;
      background: rgba(255,255,255,.055);
      padding: 8px;
      flex: 0 0 auto;
    }
    .clara-memory-edit-form input {
      min-width: 0;
      flex: 1 1 auto;
      height: 40px;
      border: 0;
      background: transparent;
      color: white;
      outline: none;
      font: 700 13px/1 system-ui, sans-serif;
    }
    .clara-memory-edit-form input::placeholder { color: rgba(203,213,225,.46); }
    .clara-memory-edit-form button {
      background: linear-gradient(135deg, rgba(110,231,183,.95), rgba(34,211,238,.78));
      color: rgba(2,6,23,.95);
      font-weight: 950;
    }
    .clara-memory-edit-form button:disabled,
    .clara-memory-edit-form input:disabled { opacity: .55; }
  `;
  document.head.appendChild(style);
}

function findAssistantTabButtons() {
  return Array.from(document.querySelectorAll("button")).filter((button) => {
    const text = clean(button.textContent);
    if (!["Talk to CLARA", "Memory", "Core Features", "Smart Actions"].includes(text)) return false;
    return Boolean(button.closest(".fixed"));
  });
}

function relabelTalkButton() {
  findAssistantTabButtons().forEach((button) => {
    if (clean(button.textContent) === "Talk to CLARA") {
      button.textContent = "Memory";
      button.dataset.claraMemoryTab = "true";
    }
  });
}

function installClickCapture() {
  document.addEventListener("click", (event) => {
    const closeMemory = event.target?.closest?.("[data-close-clara-context-memory]");
    if (closeMemory) {
      removeMemoryPanel();
      return;
    }

    const closeEdit = event.target?.closest?.("[data-close-clara-memory-edit]");
    if (closeEdit) {
      removeMemoryEditPanel();
      pendingMemoryEditClarification = null;
      return;
    }

    const backToReview = event.target?.closest?.("[data-open-clara-memory-review]");
    if (backToReview) {
      event.preventDefault();
      showMemoryPanel();
      return;
    }

    const openEdit = event.target?.closest?.("[data-open-clara-memory-edit]");
    if (openEdit) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      pendingMemoryEditClarification = null;
      memoryEditMessages = [{ role: "assistant", text: MEMORY_EDIT_INTRO }];
      showMemoryEditPanel();
      return;
    }

    const button = event.target?.closest?.("button");
    if (!button) return;

    const label = clean(button.textContent);
    if (label === "Memory") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      showMemoryPanel();
      return;
    }

    if (label === "Core Features" || label === "Smart Actions") {
      removeMemoryPanel();
      removeMemoryEditPanel();
      pendingMemoryEditClarification = null;
    }
  }, true);
}

function installSubmitCapture() {
  document.addEventListener("submit", (event) => {
    const form = event.target?.closest?.("[data-memory-edit-form]");
    if (!form) return;

    event.preventDefault();
    event.stopPropagation();
    const input = form.querySelector('input[name="memoryEditText"]');
    const value = clean(input?.value);
    if (!value) return;
    input.value = "";
    submitMemoryEditText(value);
  }, true);
}

function installObserver() {
  const observer = new MutationObserver(() => relabelTalkButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  relabelTalkButton();
}

function installStoryRefresh() {
  window.addEventListener("clara-user-context-story-updated", () => {
    if (document.getElementById(MEMORY_PANEL_ID)) showMemoryPanel();
  });
}

function installClaraAssistantMemoryTab() {
  if (typeof window === "undefined" || window.__CLARA_ASSISTANT_MEMORY_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_MEMORY_TAB_INSTALLED__ = true;
  ensureMemoryStyles();
  installClickCapture();
  installSubmitCapture();
  installObserver();
  installStoryRefresh();
}

installClaraAssistantMemoryTab();
