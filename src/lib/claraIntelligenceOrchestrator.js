export const INTELLIGENCE_EVENTS = {
  DIRTY: "clara:intelligence-dirty",
  UPDATED: "clara:intelligence-updated",
  HYDRATED: "clara:intelligence-hydrated",
  DEBUG: "clara:intelligence-debug-updated",
};

const ORCHESTRATOR_KEY = "__CLARA_INTELLIGENCE_ORCHESTRATOR__";
const REMOTE_GUARD_KEY = "clara_remote_sync_guard_v1";
const DEFAULT_DEBOUNCE_MS = 1200;
const DEFAULT_COOLDOWN_MS = 30_000;
const REMOTE_DISABLE_MS = 10 * 60_000;
const MAX_EVENT_HISTORY = 35;
const MAX_JOB_HISTORY = 45;
const MAX_MEMORY_WRITES_PER_MINUTE = 8;
const HYDRATION_SCAN_INTERVAL_MS = 2500;
const DEBUG_SAMPLE_MS = 1200;

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value, max = 180) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function readStorage(key, fallback = null) {
  if (typeof window === "undefined") return fallback;
  return safeJsonParse(window.localStorage.getItem(key), fallback);
}

function writeStorage(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function debugEnabled() {
  return typeof window !== "undefined" && window.localStorage?.getItem("clara_debug_intelligence") === "true";
}

function isSupabaseUrl(input) {
  const url = typeof input === "string" ? input : input?.url;
  return /supabase\.co|supabase\.in|supabase\.net/i.test(String(url || ""));
}

function isQuotaFailure(response, bodyText = "") {
  const text = String(bodyText || "").toLowerCase();
  return response?.status === 402 || response?.status === 429 || text.includes("egress") || text.includes("quota") || text.includes("payment required");
}

function hasLifeStageSnapshotSection() {
  if (typeof document === "undefined") return false;
  return Array.from(document.querySelectorAll("h3")).some((node) => cleanText(node.textContent) === "Life Stage Trend Snapshot");
}

function createOrchestrator() {
  const state = {
    installed: false,
    jobs: new Map(),
    queue: new Map(),
    timers: new Map(),
    locks: new Set(),
    cooldownUntil: new Map(),
    dirtyFlags: new Set(),
    lastRunAt: {},
    runCount: {},
    skippedCount: {},
    eventDispatchCount: 0,
    memoryWriteCount: 0,
    memoryWriteWindowStartedAt: Date.now(),
    snapshotRebuildCount: 0,
    hydrateCount: 0,
    lastDebugEmitAt: 0,
    lastHydrationScanAt: 0,
    hydrationTimer: null,
    remoteSync: readStorage(REMOTE_GUARD_KEY, {
      disabledUntil: 0,
      failureCount: 0,
      lastFailureAt: null,
      lastFailureReason: null,
      mode: "online",
    }),
    jobHistory: [],
    eventHistory: [],
    lastError: null,
  };

  function emitDebug(force = false) {
    if (typeof window === "undefined" || !debugEnabled()) return;
    const now = Date.now();
    if (!force && now - state.lastDebugEmitAt < DEBUG_SAMPLE_MS) return;
    state.lastDebugEmitAt = now;
    window.dispatchEvent(new CustomEvent(INTELLIGENCE_EVENTS.DEBUG, { detail: getDebugState() }));
  }

  function pushHistory(collection, item, limit) {
    collection.unshift({ ...item, at: nowIso() });
    collection.splice(limit);
  }

  function emit(type, detail = {}) {
    if (typeof window === "undefined") return;
    state.eventDispatchCount += 1;
    pushHistory(state.eventHistory, { type, jobKey: detail.jobKey, reason: detail.reason }, MAX_EVENT_HISTORY);
    window.dispatchEvent(new CustomEvent(type, { detail: { ...detail, orchestrated: true, at: nowIso() } }));
    emitDebug();
  }

  function markDirty(flag, reason = "dirty") {
    if (!flag) return;
    state.dirtyFlags.add(flag);
    if (debugEnabled()) emit(INTELLIGENCE_EVENTS.DIRTY, { flag, reason });
    else emitDebug();
  }

  function clearDirty(flag) {
    if (!flag) return;
    state.dirtyFlags.delete(flag);
  }

  function registerJob(jobKey, executor, config = {}) {
    if (!jobKey || typeof executor !== "function") return;
    const previous = state.jobs.get(jobKey) || {};
    state.jobs.set(jobKey, {
      ...previous,
      jobKey,
      executor,
      debounceMs: Number(config.debounceMs ?? previous.debounceMs ?? DEFAULT_DEBOUNCE_MS),
      cooldownMs: Number(config.cooldownMs ?? previous.cooldownMs ?? DEFAULT_COOLDOWN_MS),
      priority: Number(config.priority ?? previous.priority ?? 5),
      dirtyFlag: config.dirtyFlag || previous.dirtyFlag || jobKey,
      allowDuringOffline: config.allowDuringOffline ?? previous.allowDuringOffline ?? true,
      label: config.label || previous.label || jobKey,
    });
    emitDebug();
  }

  function shouldSkipForCooldown(jobKey) {
    const until = Number(state.cooldownUntil.get(jobKey) || 0);
    if (Date.now() < until) {
      state.skippedCount[jobKey] = (state.skippedCount[jobKey] || 0) + 1;
      pushHistory(state.jobHistory, { jobKey, status: "skipped_cooldown", waitMs: until - Date.now() }, MAX_JOB_HISTORY);
      emitDebug();
      return true;
    }
    return false;
  }

  async function runJob(jobKey, entry) {
    const job = state.jobs.get(jobKey);
    if (!job) return null;

    if (state.locks.has(jobKey)) {
      state.skippedCount[jobKey] = (state.skippedCount[jobKey] || 0) + 1;
      pushHistory(state.jobHistory, { jobKey, status: "skipped_locked" }, MAX_JOB_HISTORY);
      emitDebug();
      return null;
    }

    if (shouldSkipForCooldown(jobKey)) return null;

    state.locks.add(jobKey);
    clearDirty(job.dirtyFlag);
    const startedAt = Date.now();

    try {
      pushHistory(state.jobHistory, { jobKey, status: "started", reason: entry?.reason }, MAX_JOB_HISTORY);
      emitDebug();
      const result = await job.executor({ reason: entry?.reason || "orchestrated_job", options: entry?.options || {}, jobKey, orchestrator: api });
      state.lastRunAt[jobKey] = nowIso();
      state.runCount[jobKey] = (state.runCount[jobKey] || 0) + 1;
      state.cooldownUntil.set(jobKey, Date.now() + job.cooldownMs);
      if (/lifeStage|snapshot/i.test(jobKey)) state.snapshotRebuildCount += 1;
      if (/hydrate/i.test(jobKey)) state.hydrateCount += 1;
      pushHistory(state.jobHistory, { jobKey, status: "completed", ms: Date.now() - startedAt, reason: entry?.reason }, MAX_JOB_HISTORY);
      emit(INTELLIGENCE_EVENTS.UPDATED, { jobKey, reason: entry?.reason, result, ms: Date.now() - startedAt });
      return result;
    } catch (error) {
      state.lastError = { jobKey, message: error?.message || "Unknown intelligence job failure", at: nowIso() };
      pushHistory(state.jobHistory, { jobKey, status: "failed", error: state.lastError.message }, MAX_JOB_HISTORY);
      if (debugEnabled()) console.warn(`CLARA intelligence job failed: ${jobKey}`, error);
      return null;
    } finally {
      state.locks.delete(jobKey);
      emitDebug();
    }
  }

  function enqueue(jobKey, reason = "queued", options = {}) {
    const job = state.jobs.get(jobKey);
    if (!job) {
      pushHistory(state.jobHistory, { jobKey, status: "missing_job", reason }, MAX_JOB_HISTORY);
      emitDebug();
      return;
    }

    markDirty(job.dirtyFlag, reason);
    const existing = state.queue.get(jobKey) || {};
    state.queue.set(jobKey, { jobKey, reason, options: { ...(existing.options || {}), ...(options || {}) }, enqueuedAt: nowIso() });

    if (state.timers.has(jobKey)) window.clearTimeout(state.timers.get(jobKey));

    const delay = Number(options.debounceMs ?? job.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    const timer = window.setTimeout(() => {
      state.timers.delete(jobKey);
      const entry = state.queue.get(jobKey);
      state.queue.delete(jobKey);
      runJob(jobKey, entry);
    }, delay);

    state.timers.set(jobKey, timer);
    emitDebug();
  }

  function enqueueMany(jobKeys = [], reason = "queued", options = {}) {
    jobKeys.forEach((jobKey) => enqueue(jobKey, reason, options));
  }

  function recordMemoryWrite(label = "memory") {
    const now = Date.now();
    if (now - state.memoryWriteWindowStartedAt > 60_000) {
      state.memoryWriteWindowStartedAt = now;
      state.memoryWriteCount = 0;
    }
    state.memoryWriteCount += 1;
    pushHistory(state.jobHistory, { jobKey: label, status: "memory_write_recorded" }, MAX_JOB_HISTORY);
    emitDebug();
    return state.memoryWriteCount <= MAX_MEMORY_WRITES_PER_MINUTE;
  }

  function getRemoteSyncState() {
    const disabledUntil = Number(state.remoteSync?.disabledUntil || 0);
    return { ...(state.remoteSync || {}), disabled: Date.now() < disabledUntil, disabledForMs: Math.max(0, disabledUntil - Date.now()) };
  }

  function disableRemoteSync(reason = "remote_sync_failure", durationMs = REMOTE_DISABLE_MS) {
    state.remoteSync = { ...(state.remoteSync || {}), mode: "local_first_fallback", disabledUntil: Date.now() + durationMs, failureCount: Number(state.remoteSync?.failureCount || 0) + 1, lastFailureAt: nowIso(), lastFailureReason: cleanText(reason, 220) };
    writeStorage(REMOTE_GUARD_KEY, state.remoteSync);
    emitDebug(true);
  }

  function installRemoteFetchGuard() {
    if (typeof window === "undefined" || typeof window.fetch !== "function") return;
    if (window.__CLARA_REMOTE_SYNC_FETCH_GUARD__) return;
    window.__CLARA_REMOTE_SYNC_FETCH_GUARD__ = true;
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const remote = getRemoteSyncState();
      if (remote.disabled && isSupabaseUrl(input)) {
        return new Response(JSON.stringify({ error: "CLARA remote sync temporarily disabled. Using local-first mode.", reason: remote.lastFailureReason }), { status: 503, headers: { "Content-Type": "application/json", "X-CLARA-Remote-Guard": "suppressed" } });
      }
      const response = await originalFetch(input, init);
      if (isSupabaseUrl(input) && (response.status === 402 || response.status === 429)) {
        let bodyText = "";
        try { bodyText = await response.clone().text(); } catch { bodyText = ""; }
        if (isQuotaFailure(response, bodyText)) disableRemoteSync(`Supabase ${response.status}: ${bodyText || response.statusText}`);
      }
      return response;
    };
  }

  function scheduleHydrationScan(reason = "hydration_scan") {
    if (state.hydrationTimer) window.clearTimeout(state.hydrationTimer);
    state.hydrationTimer = window.setTimeout(() => {
      state.hydrationTimer = null;
      if (!hasLifeStageSnapshotSection()) return;
      const now = Date.now();
      if (now - state.lastHydrationScanAt < HYDRATION_SCAN_INTERVAL_MS) return;
      state.lastHydrationScanAt = now;
      enqueueMany(["hydrateLifeSnapshot", "hydrateBehaviorPanel", "hydratePredictionPanel"], reason, { debounceMs: 300 });
      emit(INTELLIGENCE_EVENTS.HYDRATED, { reason });
    }, 450);
  }

  function installHydrationTriggers() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (window.__CLARA_INTELLIGENCE_HYDRATION_TRIGGERS__) return;
    window.__CLARA_INTELLIGENCE_HYDRATION_TRIGGERS__ = true;
    document.addEventListener("click", () => scheduleHydrationScan("user_navigation"), true);
    window.addEventListener("hashchange", () => scheduleHydrationScan("route_change"));
    window.setInterval(() => scheduleHydrationScan("sampled_hydration"), 5000);
  }

  function install() {
    if (state.installed) return api;
    state.installed = true;
    installRemoteFetchGuard();
    installHydrationTriggers();
    emitDebug(true);
    return api;
  }

  function getDebugState() {
    return {
      installed: state.installed,
      jobs: Array.from(state.jobs.keys()),
      queuedJobs: Array.from(state.queue.keys()),
      activeLocks: Array.from(state.locks),
      dirtyFlags: Array.from(state.dirtyFlags),
      lastRunAt: { ...state.lastRunAt },
      runCount: { ...state.runCount },
      skippedCount: { ...state.skippedCount },
      cooldowns: Object.fromEntries(Array.from(state.cooldownUntil.entries()).map(([key, until]) => [key, Math.max(0, until - Date.now())])),
      eventDispatchCount: state.eventDispatchCount,
      snapshotRebuildCount: state.snapshotRebuildCount,
      hydrateCount: state.hydrateCount,
      memoryWriteCount: state.memoryWriteCount,
      remoteSync: getRemoteSyncState(),
      lastError: state.lastError,
      jobHistory: state.jobHistory.slice(0, 20),
      eventHistory: state.eventHistory.slice(0, 20),
    };
  }

  const api = { install, registerJob, enqueue, enqueueMany, emit, markDirty, clearDirty, recordMemoryWrite, disableRemoteSync, getRemoteSyncState, getDebugState };
  return api;
}

export function getClaraIntelligenceOrchestrator() {
  if (typeof window === "undefined") return createOrchestrator();
  if (!window[ORCHESTRATOR_KEY]) window[ORCHESTRATOR_KEY] = createOrchestrator();
  return window[ORCHESTRATOR_KEY];
}

export function installClaraIntelligenceOrchestrator() {
  return getClaraIntelligenceOrchestrator().install();
}

export function enqueueIntelligenceJob(jobKey, reason, options) {
  return getClaraIntelligenceOrchestrator().enqueue(jobKey, reason, options);
}

export function emitIntelligenceEvent(type, detail) {
  return getClaraIntelligenceOrchestrator().emit(type, detail);
}
