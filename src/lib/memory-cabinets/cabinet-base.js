import { getCabinetDefinition } from "./cabinet-registry";

const PREFIX = "CLARA_MEMORY_CABINET_V1";
const DOCUMENT_TYPE = "cabinet_bullet_document";
const SCHEMA_VERSION = 3;
const MAX_BULLETS = 12;
const MAX_SIGNALS = 20;
const BULLET_SIMILARITY_THRESHOLD = 0.5;

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

function writeDocument(cabinetKey, documentEntry) {
  const next = documentEntry?.summary ? [documentEntry] : [];

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
    "tend", "tends", "feel", "feeling", "indicating", "identified", "habit", "linked", "frequently", "recurring", "pattern", "often", "usually",
  ]);

  return clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9ñáéíóúü\s]/gi, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !stopWords.has(word));
}

function similarity(left = "", right = "") {
  const a = new Set(normalizeWords(left));
  const b = new Set(normalizeWords(right));
  if (!a.size || !b.size) return 0;

  const shared = [...a].filter((word) => b.has(word)).length;
  return shared / Math.min(a.size, b.size);
}

function signature(value = "") {
  return [...new Set(normalizeWords(value))].sort().slice(0, 14).join("-");
}

function strengthLabel(count = 1) {
  if (count >= 8) return "strong";
  if (count >= 4) return "repeated";
  if (count >= 2) return "emerging";
  return "new";
}

function normalizeBullet(value = "") {
  return clean(value)
    .replace(/^[•\-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .trim();
}

function bulletsFromText(value = "") {
  const text = String(value || "").trim();
  if (!text) return [];

  const lines = text
    .split(/\n+/)
    .map(normalizeBullet)
    .filter(Boolean);

  if (lines.length > 1) return lines;

  return [normalizeBullet(text)].filter(Boolean);
}

function bulletsFromEntry(entry = {}) {
  const directBullets = makeList(entry.document_bullets || entry.documentBullets || entry.bullets);
  if (directBullets.length) return directBullets.map(normalizeBullet).filter(Boolean);
  return bulletsFromText(entry.summary || entry.text || entry.content || entry.value);
}

function mergeBullets(existingBullets = [], incomingBullets = []) {
  return [...existingBullets, ...incomingBullets]
    .map(normalizeBullet)
    .filter(Boolean)
    .reduce((bullets, bullet) => {
      const duplicateIndex = bullets.findIndex((item) => signature(item) === signature(bullet) || similarity(item, bullet) >= BULLET_SIMILARITY_THRESHOLD);

      if (duplicateIndex < 0) return [...bullets, bullet];

      return bullets.map((item, index) => {
        if (index !== duplicateIndex) return item;
        return bullet.length > item.length ? bullet : item;
      });
    }, [])
    .slice(0, MAX_BULLETS);
}

function uniqueList(...lists) {
  return [...new Set(lists.flat().map(clean).filter(Boolean))].slice(0, MAX_SIGNALS);
}

function sortIso(values = []) {
  return values.filter(Boolean).sort();
}

function normalizeLegacyEntry(cabinet, entry = {}) {
  const bullets = bulletsFromEntry(entry);
  if (!bullets.length) return null;

  const timestamp = now();
  const occurrenceCount = Math.max(1, Number(entry.occurrenceCount || entry.reinforcementCount || 1));

  return {
    id: clean(entry.id) || `${cabinet.key}-${Date.now()}`,
    cabinet: cabinet.name,
    cabinetKey: cabinet.key,
    type: clean(entry.type),
    schemaVersion: Number(entry.schemaVersion || 1),
    document_bullets: bullets,
    summary: bullets.map((bullet) => `- ${bullet}`).join("\n"),
    signals: makeList(entry.signals),
    emotional_tone: clean(entry.emotional_tone || entry.emotionalTone),
    financial_relevance: clean(entry.financial_relevance || entry.financialRelevance),
    should_use_when: makeList(entry.should_use_when || entry.shouldUseWhen),
    createdAt: clean(entry.createdAt) || timestamp,
    firstSeenAt: clean(entry.firstSeenAt || entry.createdAt) || timestamp,
    lastSeenAt: clean(entry.lastSeenAt || entry.updatedAt) || timestamp,
    updatedAt: clean(entry.updatedAt) || timestamp,
    occurrenceCount,
    patternStrength: clean(entry.patternStrength) || strengthLabel(occurrenceCount),
    relevanceScore: Math.max(0, Math.min(1, Number(entry.relevanceScore ?? entry.score ?? 0.65))),
    source: clean(entry.source) || "clara_memory_cabinet",
  };
}

function buildDocument(cabinet, entries = []) {
  const normalized = (Array.isArray(entries) ? entries : [])
    .map((entry) => normalizeLegacyEntry(cabinet, entry))
    .filter(Boolean);

  if (!normalized.length) return null;

  const existingDocument = normalized.find((entry) => entry.type === DOCUMENT_TYPE) || normalized[0];
  const allBullets = normalized.flatMap((entry) => entry.document_bullets || []);
  const bullets = mergeBullets([], allBullets);
  const occurrenceCount = normalized.reduce((sum, entry) => sum + Math.max(1, Number(entry.occurrenceCount || 1)), 0);
  const firstSeen = sortIso(normalized.flatMap((entry) => [entry.firstSeenAt, entry.createdAt]))[0] || now();
  const lastSeen = sortIso(normalized.flatMap((entry) => [entry.lastSeenAt, entry.updatedAt])).slice(-1)[0] || now();
  const summary = bullets.map((bullet) => `- ${bullet}`).join("\n");

  return {
    id: existingDocument.id || `${cabinet.key}-document`,
    cabinet: cabinet.name,
    cabinetKey: cabinet.key,
    type: DOCUMENT_TYPE,
    schemaVersion: SCHEMA_VERSION,
    summary,
    document_bullets: bullets,
    signals: uniqueList(...normalized.map((entry) => entry.signals || [])),
    emotional_tone: normalized.find((entry) => entry.emotional_tone)?.emotional_tone || "",
    financial_relevance: normalized.find((entry) => entry.financial_relevance)?.financial_relevance || "",
    should_use_when: uniqueList(...normalized.map((entry) => entry.should_use_when || [])),
    createdAt: existingDocument.createdAt || firstSeen,
    firstSeenAt: firstSeen,
    lastSeenAt: lastSeen,
    updatedAt: now(),
    occurrenceCount,
    patternStrength: strengthLabel(occurrenceCount),
    relevanceScore: Math.max(...normalized.map((entry) => Number(entry.relevanceScore || 0.65)), 0.65),
    source: "clara_living_cabinet_document",
    mergedFromSimilarMemory: normalized.length > 1,
  };
}

function mergeDocumentWithInput(cabinet, documentEntry, input = {}) {
  const incoming = normalizeLegacyEntry(cabinet, input);
  if (!incoming) return documentEntry;

  const current = documentEntry || buildDocument(cabinet, []);
  const currentBullets = current?.document_bullets || [];
  const bullets = mergeBullets(currentBullets, incoming.document_bullets || []);
  const occurrenceCount = Math.max(0, Number(current?.occurrenceCount || 0)) + Math.max(1, Number(incoming.occurrenceCount || 1));
  const summary = bullets.map((bullet) => `- ${bullet}`).join("\n");

  return {
    id: current?.id || `${cabinet.key}-document`,
    cabinet: cabinet.name,
    cabinetKey: cabinet.key,
    type: DOCUMENT_TYPE,
    schemaVersion: SCHEMA_VERSION,
    summary,
    document_bullets: bullets,
    signals: uniqueList(current?.signals || [], incoming.signals || []),
    emotional_tone: incoming.emotional_tone || current?.emotional_tone || "",
    financial_relevance: incoming.financial_relevance || current?.financial_relevance || "",
    should_use_when: uniqueList(current?.should_use_when || [], incoming.should_use_when || []),
    createdAt: current?.createdAt || incoming.createdAt || now(),
    firstSeenAt: sortIso([current?.firstSeenAt, current?.createdAt, incoming.firstSeenAt, incoming.createdAt])[0] || now(),
    lastSeenAt: sortIso([current?.lastSeenAt, current?.updatedAt, incoming.lastSeenAt, incoming.updatedAt]).slice(-1)[0] || now(),
    updatedAt: now(),
    occurrenceCount,
    patternStrength: strengthLabel(occurrenceCount),
    relevanceScore: Math.min(1, Math.max(Number(current?.relevanceScore || 0.65), Number(incoming.relevanceScore || 0.65)) + 0.03),
    source: "clara_living_cabinet_document",
    mergedFromSimilarMemory: true,
  };
}

function scoreDocument(documentEntry = {}, query = "") {
  const words = normalizeWords(query);
  const recurrenceBoost = Math.min(0.2, Math.max(0, Number(documentEntry.occurrenceCount || 1) - 1) * 0.025);
  if (!words.length) return Math.min(1, Number(documentEntry.relevanceScore || 0.45) + recurrenceBoost);

  const text = [documentEntry.summary, ...(documentEntry.signals || []), documentEntry.emotional_tone, documentEntry.financial_relevance, ...(documentEntry.should_use_when || [])].join(" ").toLowerCase();
  const hits = words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0);
  return Math.max(0, Math.min(1, Number(documentEntry.relevanceScore || 0.45) * 0.35 + (hits / words.length) * 0.55 + recurrenceBoost));
}

export function createMemoryCabinet(cabinetName) {
  const cabinet = getCabinetDefinition(cabinetName);
  if (!cabinet) throw new Error(`Unknown CLARA memory cabinet: ${cabinetName}`);

  function readDocument() {
    const raw = readRawEntries(cabinet.key);
    const documentEntry = buildDocument(cabinet, raw);

    if (!documentEntry) return null;

    const shouldMigrate = raw.length !== 1 || raw[0]?.type !== DOCUMENT_TYPE || raw[0]?.schemaVersion !== SCHEMA_VERSION || raw[0]?.summary !== documentEntry.summary;
    if (shouldMigrate) {
      writeDocument(cabinet.key, documentEntry);
    }

    return documentEntry;
  }

  return {
    cabinet,
    readAll() {
      const documentEntry = readDocument();
      return documentEntry ? [documentEntry] : [];
    },
    save(input = {}) {
      const current = readDocument();
      const next = mergeDocumentWithInput(cabinet, current, input);
      if (!next) return null;
      writeDocument(cabinet.key, next);
      return next;
    },
    update(id, patch = {}) {
      const current = readDocument();
      if (!current || current.id !== id) return null;
      const next = buildDocument(cabinet, [{ ...current, ...patch, id: current.id, createdAt: current.createdAt, updatedAt: now() }]);
      writeDocument(cabinet.key, next);
      return next;
    },
    remove(id) {
      const current = readDocument();
      if (!current || current.id !== id) return false;
      writeDocument(cabinet.key, null);
      return true;
    },
    search(query = "", limit = 5) {
      const documentEntry = readDocument();
      if (!documentEntry) return [];
      const scored = { ...documentEntry, relevanceScore: scoreDocument(documentEntry, query) };
      return scored.relevanceScore > 0.08 || !query ? [scored].slice(0, limit) : [];
    },
  };
}
