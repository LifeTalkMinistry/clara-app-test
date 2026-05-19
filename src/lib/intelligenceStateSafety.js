export const INTELLIGENCE_SAFETY_META_KEY = "clara_intelligence_safety_meta_v1";

export const SNAPSHOT_AUTHORITY = {
  fallback: 10,
  local: 35,
  predictive: 55,
  enriched: 72,
  stable: 88,
};

const DEFAULT_MIN_COMMIT_INTERVAL_MS = 12_000;
const MIN_COMPLETE_SNAPSHOT_SCORE = 68;
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
  "lastHydrationAt",
  "lastMeaningfulUpdateAt",
  "lastObservationAt",
  "lastPredictionAt",
  "lastEnrichmentAt",
  "hydrationTimestamp",
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

function cleanText(value, max = 240) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function profileSignature(value = {}) {
  const answers = value.answers || value.rawProfile || {};
  return [
    value.stage || value.snapshot?.stage,
    answers.setup,
    answers.rhythm,
    answers.workload,
    answers.pressure,
    answers.coping,
    answers.goal,
  ]
    .map((item) => cleanText(item, 160))
    .join("|");
}

function isFallbackSnapshot(value = {}) {
  const snapshot = value.snapshot || value;
  const source = String(value.worldEnrichment?.source || snapshot.worldContext?.sourceFreshness || snapshot.enrichmentStatus || "").toLowerCase();
  return source.includes("fallback") || source.includes("local fallback") || source.includes("local-only");
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

export function getSnapshotCompletenessScore(value = {}) {
  const snapshot = value.snapshot || value;
  if (!snapshot || typeof snapshot !== "object") return 0;

  let score = 0;
  if (snapshot.title || snapshot.archetype) score += 10;
  if (snapshot.summary && cleanText(snapshot.summary).length > 40) score += 14;
  if (snapshot.metrics && Object.keys(snapshot.metrics).length >= 5) score += 20;
  if (Array.isArray(snapshot.indicators) && snapshot.indicators.length >= 3) score += 26;
  if (Array.isArray(snapshot.riskFlags) && snapshot.riskFlags.length) score += 8;
  if (Array.isArray(snapshot.strengths) && snapshot.strengths.length) score += 8;
  if (snapshot.firstAction || snapshot.protectionPriority) score += 8;
  if (value.behaviorProfile?.interpretedTags?.length) score += 6;

  return Math.max(0, Math.min(100, score));
}

export function getSnapshotAuthority(value = {}) {
  if (!value) return { level: 0, label: "missing" };
  const snapshot = value.snapshot || value;
  const meta = value.uiSnapshotMetadata || snapshot.uiSnapshotMetadata || {};
  if (Number(meta.authorityLevel) > 0) {
    return { level: Number(meta.authorityLevel), label: meta.authorityLabel || "metadata" };
  }

  const completeness = getSnapshotCompletenessScore(value);

  if (isFallbackSnapshot(value)) {
    return { level: SNAPSHOT_AUTHORITY.fallback, label: "fallback" };
  }

  if (snapshot.worldContext || value.worldEnrichment || snapshot.enrichmentStatus === "world-aware") {
    return { level: SNAPSHOT_AUTHORITY.enriched, label: "enriched" };
  }

  if (snapshot.predictiveDecision || value.predictiveDecision || snapshot.pressureForecast || snapshot.predictiveWatch?.length) {
    return { level: SNAPSHOT_AUTHORITY.predictive, label: "predictive" };
  }

  if (completeness >= MIN_COMPLETE_SNAPSHOT_SCORE) {
    return { level: SNAPSHOT_AUTHORITY.stable, label: "stable" };
  }

  return { level: SNAPSHOT_AUTHORITY.local, label: "local" };
}

function mergeFallbackMetadata(previous = {}, incoming = {}) {
  const previousSnapshot = previous.snapshot || {};
  const incomingSnapshot = incoming.snapshot || {};
  const timestamp = nowIso();

  return {
    ...previous,
    worldEnrichment: incoming.worldEnrichment || previous.worldEnrichment,
    nextRefreshReason: incoming.nextRefreshReason || previous.nextRefreshReason,
    enrichedAt: incoming.enrichedAt || previous.enrichedAt,
    behaviorProfile: {
      ...(previous.behaviorProfile || {}),
      worldContextUpdatedAt: incoming.behaviorProfile?.worldContextUpdatedAt || previous.behaviorProfile?.worldContextUpdatedAt,
    },
    snapshot: {
      ...previousSnapshot,
      worldContext: incomingSnapshot.worldContext || previousSnapshot.worldContext,
      confidenceNotes: incomingSnapshot.confidenceNotes || previousSnapshot.confidenceNotes,
      enrichmentStatus: incomingSnapshot.enrichmentStatus || "local fallback",
      sourceFreshness: incomingSnapshot.sourceFreshness || previousSnapshot.sourceFreshness,
      worldUpdatedAt: incomingSnapshot.worldUpdatedAt || previousSnapshot.worldUpdatedAt,
      staleAfter: incomingSnapshot.staleAfter || previousSnapshot.staleAfter,
      fallbackNote:
        incomingSnapshot.worldContext?.currentlyAffectingYou?.[0]?.why ||
        incomingSnapshot.fallbackNote ||
        previousSnapshot.fallbackNote ||
        "World enrichment is temporarily unavailable; CLARA is preserving the stable local snapshot.",
      updatedAt: previousSnapshot.updatedAt || timestamp,
    },
  };
}

export function selectAuthoritativeSnapshot(previousValue, nextValue, options = {}) {
  if (!nextValue) {
    return { value: previousValue, accepted: false, reason: "missing_next" };
  }

  if (!previousValue || options.force) {
    return { value: nextValue, accepted: true, reason: options.force ? "forced" : "first_snapshot" };
  }

  const previousCompleteness = getSnapshotCompletenessScore(previousValue);
  const nextCompleteness = getSnapshotCompletenessScore(nextValue);
  const previousAuthority = getSnapshotAuthority(previousValue);
  const nextAuthority = getSnapshotAuthority(nextValue);
  const previousSignature = profileSignature(previousValue);
  const nextSignature = profileSignature(nextValue);
  const profileChanged = Boolean(nextSignature && previousSignature && nextSignature !== previousSignature);

  if (profileChanged) {
    return { value: nextValue, accepted: true, reason: "profile_changed", previousAuthority, nextAuthority, previousCompleteness, nextCompleteness };
  }

  const previousComplete = previousCompleteness >= MIN_COMPLETE_SNAPSHOT_SCORE;
  const nextComplete = nextCompleteness >= MIN_COMPLETE_SNAPSHOT_SCORE;
  const incomingIsLower = nextAuthority.level < previousAuthority.level;
  const incomingIsFallback = nextAuthority.label === "fallback" || isFallbackSnapshot(nextValue);

  if (incomingIsFallback && previousComplete) {
    return {
      value: mergeFallbackMetadata(previousValue, nextValue),
      accepted: false,
      partialMerged: true,
      reason: "fallback_metadata_only",
      previousAuthority,
      nextAuthority,
      previousCompleteness,
      nextCompleteness,
    };
  }

  if (incomingIsLower && previousComplete && !options.allowAuthorityDowngrade) {
    return {
      value: previousValue,
      accepted: false,
      reason: "authority_downgrade_rejected",
      previousAuthority,
      nextAuthority,
      previousCompleteness,
      nextCompleteness,
    };
  }

  if (!nextComplete && previousComplete && !options.allowIncompleteSnapshot) {
    return {
      value: previousValue,
      accepted: false,
      reason: "incomplete_snapshot_rejected",
      previousAuthority,
      nextAuthority,
      previousCompleteness,
      nextCompleteness,
    };
  }

  return {
    value: nextValue,
    accepted: true,
    reason: nextAuthority.level > previousAuthority.level ? "authority_upgrade" : "compatible_snapshot_update",
    previousAuthority,
    nextAuthority,
    previousCompleteness,
    nextCompleteness,
  };
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
  const authority = getSnapshotAuthority(value);
  const completenessScore = getSnapshotCompletenessScore(value);
  meta[layerKey] = {
    ...previous,
    hash: options.hash || stableIntelligenceHash(value),
    version,
    generation: Number(previous.generation || 0) + 1,
    authorityLevel: authority.level,
    authorityLabel: authority.label,
    completenessScore,
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
  const authority = getSnapshotAuthority(record);
  const completenessScore = getSnapshotCompletenessScore(record);
  const version = Number(options.version || meta.version || existingUiMeta.version || record.version || 0);

  const uiSnapshotMetadata = {
    ...existingUiMeta,
    version,
    generation: Number(meta.generation || existingUiMeta.generation || 0),
    layerKey,
    authorityLevel: meta.authorityLevel || authority.level,
    authorityLabel: meta.authorityLabel || authority.label,
    completenessScore: meta.completenessScore || completenessScore,
    hydrationSource: options.hydrationSource || options.reason || existingUiMeta.hydrationSource || "local",
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
  const authoritySelection = options.skipAuthoritySelection
    ? { value: nextValue, accepted: true, reason: "authority_skipped" }
    : selectAuthoritativeSnapshot(previousValue, nextValue, options);

  const candidate = authoritySelection.value || nextValue;
  const decision = shouldCommitIntelligenceLayer(layerKey, previousValue, candidate, options);
  if (!decision.shouldCommit) {
    return {
      committed: false,
      decision: { ...decision, authoritySelection },
      value: previousValue || candidate,
    };
  }

  const meta = recordIntelligenceCommit(layerKey, candidate, {
    hash: decision.hash,
    reason: options.reason || authoritySelection.reason || decision.reason,
    version: options.version,
  });

  return {
    committed: true,
    decision: { ...decision, authoritySelection },
    meta,
    value: withSnapshotMetadata(candidate, layerKey, {
      ...options,
      version: meta.version,
      reason: authoritySelection.reason || decision.reason,
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
