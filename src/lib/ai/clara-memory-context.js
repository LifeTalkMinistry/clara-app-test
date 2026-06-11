/**
 * Memory context builder for CLARA.
 *
 * Given a list of memory objects, this module generates a concise
 * natural-language summary that can be sent to the AI model or used
 * directly in local replies. The goal is to surface only the most
 * relevant memories and phrase them in a friendly, human-like way.
 */

const ONBOARDING_MEMORY_CATEGORY_ORDER = [
  "onboarding_commitment",
  "onboarding_lifestyle_clarity",
  "onboarding_money_pressure",
  "onboarding_spending_trigger",
  "onboarding_guidance_style",
  "onboarding_guidance_intensity",
];

const ONBOARDING_MEMORY_CATEGORIES = new Set(ONBOARDING_MEMORY_CATEGORY_ORDER);

function isOnboardingMemory(mem = {}) {
  return ONBOARDING_MEMORY_CATEGORIES.has(mem.category);
}

function onboardingSortOrder(mem = {}) {
  const index = ONBOARDING_MEMORY_CATEGORY_ORDER.indexOf(mem.category);
  return index === -1 ? ONBOARDING_MEMORY_CATEGORY_ORDER.length : index;
}

function normalizeSentence(value = "") {
  return String(value || "").trim().replace(/[.?!]+$/g, "");
}

/**
 * Build a natural language summary from a memory entry. Each memory
 * category uses a slightly different phrasing template.
 *
 * @param {Object} mem A memory object with category and content.
 * @returns {string} A sentence fragment or short sentence.
 */
function memoryToSentence(mem) {
  const { category, content } = mem;
  switch (category) {
    case "financial_goal":
      return `your goal is to ${content}`;
    case "mood":
      return `you felt ${content}`;
    case "budget_preference":
      return `you mentioned your budget is ${content}`;
    case "spending_habit":
      return `you tend to ${content}`;
    case "spending_concern":
      return `you are ${content}`;
    case "income_context":
      return `you said your ${content}`;
    case "debt_context":
      return `you talked about ${content}`;
    case "savings_context":
      return `you’re ${content}`;
    case "emergency_fund_context":
      return `you’re focusing on ${content}`;
    case "app_preference":
      return `you prefer ${content}`;
    case "accountability":
      return `you asked to ${content}`;
    case "onboarding_commitment":
    case "onboarding_lifestyle_clarity":
    case "onboarding_money_pressure":
    case "onboarding_spending_trigger":
    case "onboarding_guidance_style":
    case "onboarding_guidance_intensity":
      return content;
    default:
      return `you mentioned ${content}`;
  }
}

/**
 * Construct a memory context string by selecting the most recent
 * memories and converting them into a single coherent statement.
 * Only up to `maxEntries` memories are included to avoid overly long
 * system prompts. If no memories are present, an empty string is
 * returned.
 *
 * @param {Array<Object>} memories A list of memory objects sorted
 *   arbitrarily.
 * @param {number} maxEntries The maximum number of memories to include.
 * @returns {string} A single sentence summarising recent memories.
 */
export function buildMemoryContext(memories, maxEntries = 3) {
  if (!Array.isArray(memories) || memories.length === 0) return "";
  const sorted = memories.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const latestOnboardingByCategory = new Map();

  for (const mem of sorted) {
    if (!isOnboardingMemory(mem) || latestOnboardingByCategory.has(mem.category)) continue;
    latestOnboardingByCategory.set(mem.category, mem);
  }

  const onboardingMemories = Array.from(latestOnboardingByCategory.values()).sort(
    (a, b) => onboardingSortOrder(a) - onboardingSortOrder(b),
  );
  const maxWithOnboarding = Math.max(maxEntries, onboardingMemories.length);
  const selected = onboardingMemories.length
    ? [
        ...onboardingMemories,
        ...sorted.filter((mem) => !isOnboardingMemory(mem)).slice(0, maxWithOnboarding - onboardingMemories.length),
      ]
    : sorted.slice(0, maxEntries);

  const sentences = [];
  for (const mem of selected) {
    const sentence = normalizeSentence(memoryToSentence(mem));
    if (sentence) {
      sentences.push(sentence);
    }
    if (sentences.length >= maxWithOnboarding) break;
  }
  if (sentences.length === 0) return "";
  const summary = sentences.join(". ");
  return summary.charAt(0).toUpperCase() + summary.slice(1) + ".";
}

/**
 * Given a list of memories and a user text, attempt to select only
 * the memories that are most relevant to the current message. At
 * present this simply returns the most recent memories, but could be
 * extended in future to use semantic matching.
 *
 * @param {Array<Object>} memories All stored memories for a user.
 * @param {string} text The current user input.
 * @param {number} maxEntries Maximum number of memories to return.
 * @returns {Array<Object>} A subset of memories.
 */
export function selectRelevantMemories(memories, text, maxEntries = 3) {
  if (!Array.isArray(memories) || memories.length === 0) return [];
  const sorted = memories.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const onboarding = [];
  const seenOnboarding = new Set();

  for (const mem of sorted) {
    if (!isOnboardingMemory(mem) || seenOnboarding.has(mem.category)) continue;
    seenOnboarding.add(mem.category);
    onboarding.push(mem);
  }

  if (!onboarding.length) return sorted.slice(0, maxEntries);

  const orderedOnboarding = onboarding.sort((a, b) => onboardingSortOrder(a) - onboardingSortOrder(b));
  const limit = Math.max(maxEntries, orderedOnboarding.length);

  return [
    ...orderedOnboarding,
    ...sorted.filter((mem) => !isOnboardingMemory(mem)).slice(0, limit - orderedOnboarding.length),
  ];
}
