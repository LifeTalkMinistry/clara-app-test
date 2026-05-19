export const INTELLIGENCE_SAFETY_META_KEY = "clara_intelligence_safety_meta_v1";

const DEFAULT_MIN_COMMIT_INTERVAL_MS = 12_000;
const VOLATILE_KEYS = new Set([
  "updatedAt",
  "updated_at",
  "createdAt",
  "created_at",
  "generatedAt",
  "enrichedAt",
  "worldUpdatedAt",
  "behaviorUpdatedAt",
  "predictiveDecisionUpdatedAt",
  "observedBehaviorUpdatedAt",
  "staleAfter",
  "lastHydratedAt",
  "lastMeaningfulUpdateAt",
  "lastObservationAt",
  "lastPredictionAt",
  "lastEnrichmentAt",
]);

function nowIso() {
  return new Date().toISOString();
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function readMeta() {
  if (typeof window === "undefined") return {};
  return safeJsonParse(window.localStorage.getItem(INTELLIGENCE_SAFETY_META_KEY), {}) || {};
}

function writeMeta(meta) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INTELLIGENCE_SAFETY_META_KEY, JSON.stringify(meta || {}));
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value)
    .filter((key) => !VOLATILE_KEYS.has(key))
    .sort()
    .reduce((acc, key) => {
      const item = value[key];
      if (typeof item === "function" || typeof item === "undefined") return acc;
      if (key === "id" && /^.*_(event|history)_\d+$/i.test(String(item))) return acc;
      acc[key] = sortObject(item);
      return acc;
    }, {});
}

export function stableIntelligenceString(value) {
  return JSON.stringify(sortObject(value || null));
}

export function stableIntelligenceHash(value) {
  const stringValue = stableIntelligenceString(value);
  let hash = 0;
  for (let index = 0; index < stringValue.length; index += 1) {
    hash = (hash << 5) - hash + stringValue.charCodeAt(index);
    hash |= 0;
  }
  return String(hash >>> 0);
}

export function isMeaningfullyEqual(previous, next) {
  if (!previous || !next) return false;
  return stableIntelligenceHash(previous) === stableIntelligenceHash(next);
}

export function getSafetyMeta(layerKey) {
  return readMeta()[layerKey] || null;
}

export function shouldCommitIntelligenceLayer(layerKey, previousValue, nextValue, options = {}) {
  if (!nextValue) return { shouldCommit: false, reason: "missing_next" };
  if (options.force) return { shouldCommit: true, reason: "forced", hash: stableIntelligenceHash(nextValue) };

  const meta = readMeta();
  const previousMeta = meta[layerKey] || {};
  const nextHash = stableIntelligenceHash(nextValue);
  const previousHash = previousMeta.hash || (previousValue ? stableIntelligenceHash(previousValue) : "");
  const unchanged = Boolean(previousHash && previousHash === nextHash);

  if (unchanged) return { shouldCommit: false, reason: "unchanged", hash: nextHash };

  const minInterval = Number(options.minCommitIntervalMs ?? DEFAULT_MIN_COMMIT_INTERVAL_MS);
  const lastCommitAt = Number(previousMeta.lastCommitAt || 0);
  const elapsed = Date.now() - lastCommitAt;

  if (lastCommitAt && elapsed < minInterval && !options.allowFastCommit) {
    return {
      shouldCommit: false,
      reason: "commit_cooldown",
      hash: nextHash,
      waitMs: minInterval - elapsed,
    };
  }

  return { shouldCommit: true, reason: "meaningful_change", hash: nextHash };
}

export function recordIntelligenceCommit(layerKey, value, options = {}) {
  const meta = readMeta();
  const previous = meta[layerKey] || {};
  const version = Number(options.version || previous.version || 0) + 1;
  meta[layerKey] = {
    ...previous,
    hash: options.hash || stableIntelligenceHash(value),
    version,
    lastCommitAt: Date.now(),
    lastMeaningfulUpdateAt: nowIso(),
    lastReason: options.reason || "meaningful_change",
  };
  writeMeta(meta);
  return meta[layerKey];
}

export function withSnapshotMetadata(record = {}, layerKey, options = {}) {
  const meta = getSafetyMeta(layerKey) || {};
  const timestamp = nowIso();
  const existingUiMeta = record.uiSnapshotMetadata || record.snapshot?.uiSnapshotMetadata || {};
  const version = Number(options.version || meta.version || existingUiMeta.version || record.version || 0);

  const uiSnapshotMetadata = {
    ...existingUiMeta,
    version,
    layerKey,
    lastMeaningfulUpdateAt: meta.lastMeaningfulUpdateAt || record.updatedAt || timestamp,
    lastHydrationAt: existingUiMeta.lastHydrationAt || timestamp,
    lastObservationAt: options.observation ? timestamp : existingUiMeta.lastObservationAt,
    lastPredictionAt: options.prediction ? timestamp : existingUiMeta.lastPredictionAt,
    lastEnrichmentAt: options.enrichment ? timestamp : existingUiMeta.lastEnrichmentAt,
    stabilityReason: options.reason || meta.lastReason || "stable",
  };

  if (record.snapshot && typeof record.snapshot === "object") {
    return {
      ...record,
      uiSnapshotMetadata,
      snapshot: {
        ...record.snapshot,
        uiSnapshotMetadata,
      },
    };
  }

  return { ...record, uiSnapshotMetadata };
}

export function maybeCommitIntelligenceLayer(layerKey, previousValue, nextValue, options = {}) {
  const decision = shouldCommitIntelligenceLayer(layerKey, previousValue, nextValue, options);
  if (!decision.shouldCommit) {
    return {
      committed: false,
      decision,
      value: previousValue || nextValue,
    };
  }

  const meta = recordIntelligenceCommit(layerKey, nextValue, {
    hash: decision.hash,
    reason: options.reason || decision.reason,
    version: options.version,
  });

  return {
    committed: true,
    decision,
    meta,
    value: withSnapshotMetadata(nextValue, layerKey, {
      ...options,
      version: meta.version,
      reason: decision.reason,
    }),
  };
}

export function shouldSuppressDebugLogs() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem("clara_debug_intelligence") !== "true";
}

export function safeIntelligenceWarn(...args) {
  if (shouldSuppressDebugLogs()) return;
  console.warn(...args);
}
