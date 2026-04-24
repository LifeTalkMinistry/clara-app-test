/**
 * Memory context builder for CLARA.
 *
 * Given a list of memory objects, this module generates a concise
 * natural-language summary that can be sent to the AI model or used
 * directly in local replies. The goal is to surface only the most
 * relevant memories and phrase them in a friendly, human-like way.
 */

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
  // Sort by newest first
  const sorted = memories.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const sentences = [];
  for (const mem of sorted) {
    const sentence = memoryToSentence(mem);
    if (sentence) {
      sentences.push(sentence);
    }
    if (sentences.length >= maxEntries) break;
  }
  if (sentences.length === 0) return "";
  // Join sentences into one coherent paragraph with natural separators
  // Capitalise the first letter of the summary
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
  // Future: perform keyword matching between text and memory content.
  // For now, simply return the newest few memories.
  if (!Array.isArray(memories) || memories.length === 0) return [];
  const sorted = memories.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return sorted.slice(0, maxEntries);
}