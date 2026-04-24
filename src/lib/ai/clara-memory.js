/**
 * CLARA Memory Storage
 *
 * This module provides a local-first storage layer for the CLARA assistant.
 * Memories are small pieces of user-specific context that the assistant
 * can use to personalise responses. Each memory has a category (e.g.
 * "financial_goal", "mood") and a textual content describing what the
 * user said. Memories are stored in the browser's localStorage when
 * available, and fall back to an in-memory cache when localStorage is
 * unavailable or when the userId is missing (guest).
 *
 * Memory objects have the following shape:
 * {
 *   id: string,        // a unique identifier
 *   category: string,  // one of the supported memory categories
 *   content: string,   // the extracted phrase/value
 *   timestamp: number  // milliseconds since epoch when the memory was saved
 * }
 *
 * The key used in localStorage is `clara_memory_${userId}`. If userId
 * is falsy, memories are held in memory only and not persisted to
 * localStorage for privacy reasons.
 */

const inMemoryStore = {};

/**
 * Build a storage key for a given user. If the userId is missing,
 * "guest" is used as a safe fallback. Sensitive guest memories are
 * not persisted to localStorage.
 *
 * @param {string|undefined|null} userId The user identifier.
 * @returns {string} The storage key.
 */
function getKey(userId) {
  const uid = userId || "guest";
  return `clara_memory_${uid}`;
}

/**
 * Attempt to load a value from localStorage. Errors are silently
 * swallowed to avoid crashing in environments where localStorage is not
 * available (e.g. server-side rendering).
 *
 * @param {string} key The key to load.
 * @returns {any|null} Parsed JSON data or null if not found or invalid.
 */
function loadFromLocalStorage(key) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      // Ignore JSON parse or access errors
    }
  }
  return null;
}

/**
 * Persist a value to localStorage. Failures are silently ignored.
 *
 * @param {string} key The key under which to save.
 * @param {any} data The data to serialise.
 */
function saveToLocalStorage(key, data) {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      // Ignore quota or security errors
    }
  }
}

/**
 * Retrieve all memories for a given user. This function first attempts
 * to load from localStorage; if nothing is found it falls back to
 * in-memory storage. The returned array is a direct reference to the
 * stored array, so callers should not mutate it directly.
 *
 * @param {string|undefined|null} userId The user identifier.
 * @returns {Array<Object>} An array of memory objects.
 */
export function getMemories(userId) {
  const key = getKey(userId);
  // Attempt to load from localStorage
  const local = loadFromLocalStorage(key);
  if (Array.isArray(local)) {
    inMemoryStore[key] = local;
    return local;
  }
  // Fall back to in-memory store
  return inMemoryStore[key] || [];
}

/**
 * Replace the entire memory list for a user. This is primarily used
 * internally; external callers should use appendMemory to add new
 * entries. If the userId is falsy, memories are not persisted to
 * localStorage.
 *
 * @param {string|undefined|null} userId The user identifier.
 * @param {Array<Object>} memories The new list of memories.
 */
export function setMemories(userId, memories) {
  const key = getKey(userId);
  inMemoryStore[key] = Array.isArray(memories) ? memories : [];
  // Persist only for authenticated users
  if (userId) {
    saveToLocalStorage(key, inMemoryStore[key]);
  }
}

/**
 * Append a single memory entry for a user. A unique ID and timestamp
 * are automatically assigned. Empty or incomplete memories are
 * ignored. Guest memories are kept only in memory and not persisted.
 *
 * @param {string|undefined|null} userId The user identifier.
 * @param {{category: string, content: string}} memory A memory object.
 */
export function appendMemory(userId, memory) {
  if (!memory || !memory.category || !memory.content) return;
  const key = getKey(userId);
  const current = getMemories(userId).slice();
  // Avoid storing duplicate memories with the same category and content
  const duplicate = current.find(
    (m) => m.category === memory.category && m.content === memory.content,
  );
  if (duplicate) {
    return;
  }
  current.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    category: memory.category,
    content: memory.content,
    timestamp: Date.now(),
  });
  setMemories(userId, current);
}

/**
 * Clear all stored memories for a user. Guest memories are simply
 * dropped from the in-memory store. For authenticated users, the
 * corresponding localStorage key is removed as well.
 *
 * @param {string|undefined|null} userId The user identifier.
 */
export function clearMemories(userId) {
  const key = getKey(userId);
  delete inMemoryStore[key];
  if (userId) {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch (err) {
        // ignore
      }
    }
  }
}