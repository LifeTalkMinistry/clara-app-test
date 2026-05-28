import { getCabinetDefinition } from "./cabinet-registry";

const PREFIX = "CLARA_MEMORY_CABINET_V1";
const LIMIT = 80;
const MERGE_SIMILARITY_THRESHOLD = 0.38;

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function now() {
  return new Date().toISOString();
}

function keyFor(cabinetKey) {
  return `${PREFIX}:${cabinetKey}`;
}

function readRawEntries(cabinetKey) {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(keyFor(cabinetKey)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(cabinetKey, entries) {
  const next = (Array.isArray(entries) ? entries : [])
    .filter((entry) => clean(entry?.summary))
    .sort((left, right) => {
      const rightScore = Number(right.relevanceScore || 0) + Number(right.occurrenceCount || 1) * 0.015;
      const leftScore = Number(left.relevanceScore || 0) + Number(left.occurrenceCount || 1) * 0.015;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return String(right.updatedAt || "").localeCompare(String(left.updatedAt || ""));
    })
    .slice(0, LIMIT);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(keyFor(cabinetKey), JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("clara-memory-cabinet-updated", { detail: { cabinetKey } }));
    } catch {}
  }

  return next;
}

function makeList(value) {
  return Array.isArray(value) ? value.map(clean).filter(Boolean) : [];
}

function normalizeWords(value = "") {
  const stopWords = new Set([
    "the", "and", "that", "this", "with", "from", "because", "after", "before", "your", "you", "user", "clara", "money", "memory",
    "tend", "tends", "feel", "feeling", "indicating", "identified", "habit", "linked", "frequently", "recurring", "pattern",
  ]);
  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9ñáéíóúü\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
}

function signature(value = "") {
  return [...new Set(normalizeWords(value))].sort().slice(0, 12).join("-");
}

function similarity(left = "", right = "") {
  const a = new Set(normalizeWords(left));
  const b = new Set(normalizeWords(right));
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / Math.min(a.size, b.size);
}

function uniqueList(...lists) {
  return [...new Set(lists.flat().map(clean).filter(Boolean))].slice(0, 16);
}

function strengthLabel(count = 1) {
  if (count >= 5) return "strong";
  if (count >= 3) return "repeated";
  if (count >= 2) return "emerging";
  return "new";
}

function normalizeEntry(cabinet, input = {}) {
  const summary = clean(input.summary || input.text || input.content || input.value);
  if (!summary) return null;

  const timestamp = now();
  const count = Math.max(1, Number(input.occurrenceCount || input.reinforcementCount || 1));

  return {
    id: clean(input.id) || `${cabinet.key}-${Date.now()}`,
    cabinet: cabinet.name,
    cabinetKey: cabinet.key,
    summary,
    pattern_key: clean(input.pattern_key || input.patternKey) || signature(summary),
    signals: makeList(input.signals),
    emotional_tone: clean(input.emotional_tone || input.emotionalTone),
    financial_relevance: clean(input.financial_relevance || input.financialRelevance),
    should_use_when: makeList(input.should_use_when || input.shouldUseWhen),
    createdAt: clean(input.createdAt) || timestamp,
    firstSeenAt: clean(input.firstSeenAt || input.createdAt) || timestamp,
    lastSeenAt: clean(input.lastSeenAt || input.updatedAt) || timestamp,
    updatedAt: clean(input.updatedAt) || timestamp,
    occurrenceCount: count,
    patternStrength: clean(input.patternStrength) || strengthLabel(count),
    relevanceScore: Math.max(0, Math.min(1, Number(input.relevanceScore ?? input.score ?? 0.65))),
    source: clean(input.source) || "clara_memory_cabinet",
    mergedFromSimilarMemory: Boolean(input.mergedFromSimilarMemory),
  };
}

function findMergeIndex(entries = [], entry = {}) {
  const incomingKey = clean(entry.pattern_key);
  const exactKeyIndex = entries.findIndex((item) => incomingKey && clean(item.pattern_key) === incomingKey);
  if (exactKeyIndex >= 0) return exactKeyIndex;

  let bestIndex = -1;
  let bestScore = 0;

  entries.forEach((item, index) => {
    const score = similarity(item.summary, entry.summary);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= MERGE_SIMILARITY_THRESHOLD ? bestIndex : -1;
}

function mergeEntries(existing = {}, incoming = {}) {
  const existingCount = Math.max(1, Number(existing.occurrenceCount || 1));
  const incomingCount = Math.max(1, Number(incoming.occurrenceCount || 1));
  const occurrenceCount = existingCount + incomingCount;
  const summary = incoming.summary.length > existing.summary.length ? incoming.summary : existing.summary;
  const relevanceScore = Math.min(1, Math.max(Number(existing.relevanceScore || 0.65), Number(incoming.relevanceScore || 0.65)) + 0.06);

  return {
    ...existing,
    ...incoming,
    id: existing.id,
    createdAt: existing.createdAt || incoming.createdAt,
    firstSeenAt: [existing.firstSeenAt, existing.createdAt, incoming.firstSeenAt, incoming.createdAt].filter(Boolean).sort()[0] || now(),
    lastSeenAt: [existing.lastSeenAt, existing.updatedAt, incoming.lastSeenAt, incoming.updatedAt].filter(Boolean).sort().slice(-1)[0] || now(),
    updatedAt: now(),
    summary,
    pattern_key: existing.pattern_key || incoming.pattern_key || signature(summary),
    signals: uniqueList(existing.signals, incoming.signals),
    should_use_when: uniqueList(existing.should_use_when, incoming.should_use_when),
    emotional_tone: incoming.emotional_tone || existing.emotional_tone,
    financial_relevance: incoming.financial_relevance || existing.financial_relevance,
    occurrenceCount,
    patternStrength: strengthLabel(occurrenceCount),
    relevanceScore,
    mergedFromSimilarMemory: true,
  };
}

function consolidateEntries(cabinet, entries = []) {
  return (Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeEntry(cabinet, entry))
    .filter(Boolean)
    .reduce((merged, entry) => {
      const mergeIndex = findMergeIndex(merged, entry);
      if (mergeIndex < 0) return [entry, ...merged];
      return merged.map((item, index) => index === mergeIndex ? mergeEntries(item, entry) : item);
    }, []);
}

function searchScore(entry, query) {
  const words = normalizeWords(query);
  const recurrenceBoost = Math.min(0.16, Math.max(0, Number(entry.occurrenceCount || 1) - 1) * 0.04);
  if (!words.length) return Math.min(1, Number(entry.relevanceScore || 0.45) + recurrenceBoost);

  const text = [entry.summary, ...(entry.signals || []), entry.emotional_tone, entry.financial_relevance, ...(entry.should_use_when || [])].join(" ").toLowerCase();
  const hits = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  return Math.max(0, Math.min(1, Number(entry.relevanceScore || 0.45) * 0.35 + (hits / words.length) * 0.55 + recurrenceBoost));
}

export function createMemoryCabinet(cabinetName) {
  const cabinet = getCabinetDefinition(cabinetName);
  if (!cabinet) throw new Error(`Unknown CLARA memory cabinet: ${cabinetName}`);

  function readConsolidatedEntries() {
    const raw = readRawEntries(cabinet.key);
    const consolidated = consolidateEntries(cabinet, raw);
    if (consolidated.length !== raw.length || consolidated.some((entry, index) => entry.pattern_key !== raw[index]?.pattern_key || entry.occurrenceCount !== raw[index]?.occurrenceCount)) {
      return writeEntries(cabinet.key, consolidated);
    }
    return consolidated;
  }

  return {
    cabinet,
    readAll() {
      return readConsolidatedEntries();
    },
    save(input = {}) {
      const entry = normalizeEntry(cabinet, input);
      if (!entry) return null;
      const current = readConsolidatedEntries();
      const mergeIndex = findMergeIndex(current, entry);
      const next = mergeIndex >= 0
        ? current.map((item, index) => index === mergeIndex ? mergeEntries(item, entry) : item)
        : [entry, ...current];
      const saved = writeEntries(cabinet.key, consolidateEntries(cabinet, next));
      return mergeIndex >= 0 ? saved.find((item) => item.id === current[mergeIndex].id) || entry : entry;
    },
    update(id, patch = {}) {
      const current = readConsolidatedEntries();
      const next = current.map((item) => item.id === id ? { ...item, ...patch, id: item.id, createdAt: item.createdAt, updatedAt: now() } : item);
      writeEntries(cabinet.key, consolidateEntries(cabinet, next));
      return next.find((item) => item.id === id) || null;
    },
    remove(id) {
      const current = readConsolidatedEntries();
      const next = current.filter((item) => item.id !== id);
      writeEntries(cabinet.key, next);
      return next.length !== current.length;
    },
    search(query = "", limit = 5) {
      return readConsolidatedEntries()
        .map((item) => ({ ...item, relevanceScore: searchScore(item, query) }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    },
  };
}
