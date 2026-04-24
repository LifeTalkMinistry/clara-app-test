/**
 * Memory router for CLARA.
 *
 * This module acts as a high-level façade over the memory storage,
 * extraction and context-building utilities. It provides a single
 * `processMessage` function that can be called whenever the user sends
 * a message. This function will extract any useful memories from the
 * text, persist them, and return a memory context summary that can
 * optionally be included in AI calls. Helper functions are also
 * exposed to retrieve raw memories or build contexts on demand.
 */

import { getMemories, appendMemory } from "./clara-memory";
import { extractMemoriesFromText } from "./clara-memory-extractor";
import { buildMemoryContext } from "./clara-memory-context";

/**
 * Process an incoming user message: extract memory candidates, persist
 * them, and return a context summary. This is safe to call on every
 * message; it will simply no-op if nothing useful is found.
 *
 * @param {string|undefined|null} userId The user identifier.
 * @param {string} text The user message.
 * @returns {{ memoryContext: string, extracted: Array<Object>, memories: Array<Object> }}
 */
export function processMessage(userId, text) {
  const extracted = extractMemoriesFromText(text);
  // Persist each extracted memory
  for (const mem of extracted) {
    appendMemory(userId, mem);
  }
  const memories = getMemories(userId);
  const memoryContext = buildMemoryContext(memories);
  return { memoryContext, extracted, memories };
}

/**
 * Get a memory context summary for a given user. This can be used
 * outside of processMessage if you need to include memories without
 * adding new ones.
 *
 * @param {string|undefined|null} userId The user identifier.
 * @param {number} maxEntries Maximum number of memories to summarise.
 * @returns {string} A concise memory context sentence.
 */
export function getMemoryContext(userId, maxEntries = 3) {
  const memories = getMemories(userId);
  return buildMemoryContext(memories, maxEntries);
}