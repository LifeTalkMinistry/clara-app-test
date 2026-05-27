import { getCabinetDefinition } from "./cabinet-registry";

const PREFIX = "CLARA_MEMORY_CABINET_V1";
const LIMIT = 80;

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function now() {
  return new Date().toISOString();
}

function keyFor(cabinetKey) {
  return `${PREFIX}:${cabinetKey}`;
}

function readEntries(cabinetKey) {
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
    .slice(0, LIMIT);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(keyFor(cabinetKey), JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("clara-memory-cabinet-updated", { detail: { cabinetKey } }));
    } catch {}
  }

  return next;
}

function normalizeEntry(cabinet, input = {}) {
  const summary = clean(input.summary || input.text || input.content || input.value);
  if (!summary) return null;

  return {
    id: clean(input.id) || `${cabinet.key}-${Date.now()}`,
    cabinet: cabinet.name,
    cabinetKey: cabinet.key,
    summary,
    signals: Array.isArray(input.signals) ? input.signals.map(clean).filter(Boolean) : [],
    emotional_tone: clean(input.emotional_tone || input.emotionalTone),
    financial_relevance: clean(input.financial_relevance || input.financialRelevance),
    should_use_when: Array.isArray(input.should_use_when) ? input.should_use_when.map(clean).filter(Boolean) : [],
    createdAt: clean(input.createdAt) || now(),
    updatedAt: now(),
    relevanceScore: Math.max(0, Math.min(1, Number(input.relevanceScore ?? input.score ?? 0.65))),
    source: clean(input.source) || "clara_memory_cabinet",
  };
}

function searchScore(entry, query) {
  const words = clean(query).toLowerCase().split(/\s+/).filter((word) => word.length >= 3);
  if (!words.length) return Number(entry.relevanceScore || 0.45);
  const text = [entry.summary, ...(entry.signals || []), entry.emotional_tone, entry.financial_relevance, ...(entry.should_use_when || [])].join(" ").toLowerCase();
  const hits = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  return Math.max(0, Math.min(1, Number(entry.relevanceScore || 0.45) * 0.35 + (hits / words.length) * 0.65));
}

export function createMemoryCabinet(cabinetName) {
  const cabinet = getCabinetDefinition(cabinetName);
  if (!cabinet) throw new Error(`Unknown CLARA memory cabinet: ${cabinetName}`);

  return {
    cabinet,
    readAll() {
      return readEntries(cabinet.key);
    },
    save(input = {}) {
      const entry = normalizeEntry(cabinet, input);
      if (!entry) return null;
      const current = readEntries(cabinet.key);
      writeEntries(cabinet.key, [entry, ...current]);
      return entry;
    },
    search(query = "", limit = 5) {
      return readEntries(cabinet.key)
        .map((item) => ({ ...item, relevanceScore: searchScore(item, query) }))
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
    },
  };
}
