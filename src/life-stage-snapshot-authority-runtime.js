const SNAPSHOT_KEY = "clara_life_stage_snapshot_v1";
const RUNTIME_KEY = "__CLARA_LIFE_STAGE_SNAPSHOT_AUTHORITY_RUNTIME__";

const AUTHORITY = {
  missing: 0,
  fallback: 10,
  local: 35,
  predictive: 55,
  enriched: 72,
  stable: 88,
};

const state = {
  stableSnapshot: null,
  stableSignature: "",
  renderedGeneration: 0,
  lastPatchAt: 0,
  timer: null,
};

function cleanText(value, max = 260) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function readCachedSnapshot() {
  if (typeof window === "undefined") return null;
  return safeJsonParse(window.localStorage.getItem(SNAPSHOT_KEY), null);
}

function getProfileSignature(value = {}) {
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
    .map((item) => cleanText(item, 120))
    .join("|");
}

function getCompleteness(value = {}) {
  const snapshot = value.snapshot || value;
  if (!snapshot || typeof snapshot !== "object") return 0;
  let score = 0;
  if (snapshot.title || snapshot.archetype) score += 12;
  if (snapshot.summary && cleanText(snapshot.summary).length > 40) score += 16;
  if (snapshot.metrics && Object.keys(snapshot.metrics).length >= 5) score += 22;
  if (Array.isArray(snapshot.indicators) && snapshot.indicators.length >= 3) score += 30;
  if (Array.isArray(snapshot.riskFlags) && snapshot.riskFlags.length) score += 8;
  if (Array.isArray(snapshot.strengths) && snapshot.strengths.length) score += 6;
  if (snapshot.firstAction || snapshot.protectionPriority) score += 6;
  return Math.max(0, Math.min(100, score));
}

function isFallback(value = {}) {
  const snapshot = value.snapshot || value;
  const source = String(value.worldEnrichment?.source || snapshot.enrichmentStatus || snapshot.worldContext?.sourceFreshness || "").toLowerCase();
  return source.includes("fallback") || source.includes("local-only") || source.includes("local fallback");
}

function getAuthority(value = {}) {
  if (!value?.snapshot) return { level: AUTHORITY.missing, label: "missing" };
  const meta = value.uiSnapshotMetadata || value.snapshot?.uiSnapshotMetadata || {};
  if (Number(meta.authorityLevel) > 0) {
    return { level: Number(meta.authorityLevel), label: meta.authorityLabel || "metadata" };
  }
  if (isFallback(value)) return { level: AUTHORITY.fallback, label: "fallback" };
  if (getCompleteness(value) >= 68 && value.snapshot?.worldContext) return { level: AUTHORITY.stable, label: "stable" };
  if (value.snapshot?.worldContext || value.worldEnrichment) return { level: AUTHORITY.enriched, label: "enriched" };
  if (value.snapshot?.predictiveDecision || value.predictiveDecision || value.snapshot?.predictiveWatch?.length) return { level: AUTHORITY.predictive, label: "predictive" };
  if (getCompleteness(value) >= 68) return { level: AUTHORITY.stable, label: "stable" };
  return { level: AUTHORITY.local, label: "local" };
}

function getLifeStageSnapshotSection() {
  if (typeof document === "undefined") return null;
  const heading = Array.from(document.querySelectorAll("h3")).find(
    (node) => cleanText(node.textContent) === "Life Stage Trend Snapshot"
  );
  return heading?.closest("section") || null;
}

function getLevelLabel(value, positive = false) {
  if (positive) {
    if (value >= 75) return "Strong";
    if (value >= 55) return "Building";
    if (value >= 35) return "Fragile";
    return "Low";
  }
  if (value >= 75) return "High";
  if (value >= 55) return "Moderate";
  if (value >= 35) return "Watch";
  return "Low";
}

function rememberStableSnapshot(candidate) {
  if (!candidate?.snapshot?.indicators?.length) return;
  const authority = getAuthority(candidate);
  const signature = getProfileSignature(candidate);
  const currentAuthority = getAuthority(state.stableSnapshot || {});
  const profileChanged = state.stableSignature && signature && state.stableSignature !== signature;

  if (profileChanged || authority.level >= currentAuthority.level || !state.stableSnapshot) {
    state.stableSnapshot = candidate;
    state.stableSignature = signature;
  }
}

function renderFallbackChip(section, incoming) {
  const snapshot = incoming?.snapshot || {};
  let chip = section.querySelector("[data-clara-snapshot-authority-chip='true']");
  if (!isFallback(incoming) && snapshot.enrichmentStatus !== "refreshing world context") {
    if (chip) chip.remove();
    return;
  }

  if (!chip) {
    chip = document.createElement("div");
    chip.dataset.claraSnapshotAuthorityChip = "true";
    chip.className = "mt-2 inline-flex w-fit rounded-full border border-cyan-100/10 bg-cyan-200/[0.055] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-50/58";
    const header = section.querySelector("h3")?.parentElement;
    header?.appendChild(chip);
  }

  chip.textContent = snapshot.enrichmentStatus === "refreshing world context" ? "Refreshing quietly" : "Offline-safe context";
}

function patchCards(authoritative) {
  if (!authoritative?.snapshot?.indicators?.length || typeof document === "undefined") return false;
  const section = getLifeStageSnapshotSection();
  if (!section) return false;

  section.dataset.claraSnapshotAuthorityLevel = String(getAuthority(authoritative).level);
  section.dataset.claraSnapshotAuthorityLabel = getAuthority(authoritative).label;

  const subtitle = section.querySelector("h3")?.parentElement?.querySelector("p");
  if (subtitle) {
    const status = authoritative.snapshot.enrichmentStatus === "world-aware"
      ? "World-aware snapshot"
      : authoritative.snapshot.statusBadge || "Stable snapshot";
    const nextText = `${status} • ${authoritative.snapshot.confidenceLabel || "Learning"} confidence`;
    if (subtitle.textContent !== nextText) subtitle.textContent = nextText;
  }

  const carousel = Array.from(section.querySelectorAll("div")).find((node) => {
    const className = String(node.className || "");
    return className.includes("snap-x") && className.includes("overflow-x-auto");
  });
  const cards = Array.from((carousel || section).querySelectorAll("button"));

  authoritative.snapshot.indicators.slice(0, cards.length).forEach((indicator, index) => {
    const card = cards[index];
    if (!card) return;
    const labels = Array.from(card.querySelectorAll("p"));
    const valueText = `${indicator.value}%`;
    const levelText = getLevelLabel(indicator.value, /stability|potential/i.test(indicator.label));
    if (labels[0] && labels[0].textContent !== indicator.label) labels[0].textContent = indicator.label;
    if (labels[1] && labels[1].textContent !== valueText) labels[1].textContent = valueText;
    if (labels[2] && labels[2].textContent !== levelText) labels[2].textContent = levelText;
    card.dataset.claraLifeSnapshotLabel = indicator.label;
    card.dataset.claraLifeSnapshotNote = indicator.note || "";
  });

  return true;
}

function chooseAuthoritative(incoming) {
  const cached = readCachedSnapshot();
  if (cached?.snapshot?.indicators?.length) rememberStableSnapshot(cached);
  if (incoming?.snapshot?.indicators?.length && !isFallback(incoming)) rememberStableSnapshot(incoming);

  const stable = state.stableSnapshot;
  if (!stable) return incoming || cached;
  if (!incoming) return stable;

  const incomingAuthority = getAuthority(incoming);
  const stableAuthority = getAuthority(stable);
  const sameProfile = getProfileSignature(incoming) === getProfileSignature(stable);

  if (sameProfile && incomingAuthority.level < stableAuthority.level) {
    return stable;
  }

  return incomingAuthority.level >= stableAuthority.level ? incoming : stable;
}

function stabilizeSnapshot(incoming = null) {
  const authoritative = chooseAuthoritative(incoming);
  if (!authoritative?.snapshot) return;

  const patched = patchCards(authoritative);
  const section = getLifeStageSnapshotSection();
  if (patched && section) {
    renderFallbackChip(section, incoming || authoritative);
    state.lastPatchAt = Date.now();
    state.renderedGeneration += 1;
  }
}

function scheduleStabilize(incoming = null, delay = 180) {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(() => {
    window.requestAnimationFrame(() => stabilizeSnapshot(incoming));
  }, delay);
}

function installSnapshotAuthorityRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  rememberStableSnapshot(readCachedSnapshot());

  window.addEventListener("clara:intelligence-updated", (event) => {
    const result = event.detail?.result;
    if (result?.snapshot) scheduleStabilize(result, 220);
  });

  window.addEventListener("clara:life-stage-intelligence-updated", (event) => {
    if (event.detail?.snapshot) scheduleStabilize(event.detail, 220);
  });

  window.addEventListener("hashchange", () => scheduleStabilize(readCachedSnapshot(), 260));
  document.addEventListener("click", () => scheduleStabilize(readCachedSnapshot(), 320), true);

  window.requestAnimationFrame(() => stabilizeSnapshot(readCachedSnapshot()));
}

try {
  installSnapshotAuthorityRuntime();
} catch (error) {
  console.warn("CLARA snapshot authority runtime failed:", error);
}
