import {
  buildLifeStageIntelligence,
  readCachedLifeStageIntelligence,
  saveLifeStageIntelligence,
  LIFE_STAGE_SNAPSHOT_KEY,
} from "./lib/lifeStageIntelligenceEngine";
import {
  enrichLifeStageWithGemini,
  shouldRefreshLifeStageEnrichment,
} from "./lib/lifeStageGeminiEnrichment";
import {
  getClaraIntelligenceOrchestrator,
  INTELLIGENCE_EVENTS,
} from "./lib/claraIntelligenceOrchestrator";

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const RUNTIME_KEY = "__CLARA_LIFE_STAGE_INTELLIGENCE_RUNTIME__";

const runtimeState = {
  lastSignature: "",
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

function readLifeStageProfile() {
  if (typeof window === "undefined") return null;
  return safeJsonParse(window.localStorage.getItem(LIFE_STAGE_KEY), null);
}

function profileSignature(profile) {
  if (!profile) return "";
  return [
    profile.stage,
    profile.setup,
    profile.rhythm,
    profile.workload,
    profile.pressure,
    profile.coping,
    profile.goal,
  ]
    .map((item) => cleanText(item, 160))
    .join("|");
}

async function runWorldEnrichment(intelligence, reason = "life_stage_world_context_refresh", options = {}) {
  if (!intelligence?.snapshot) return intelligence;
  if (!shouldRefreshLifeStageEnrichment(intelligence, options)) return intelligence;

  patchLifeStageSnapshotCards({
    ...intelligence,
    snapshot: {
      ...(intelligence.snapshot || {}),
      enrichmentStatus: "refreshing world context",
    },
  });

  const enriched = await enrichLifeStageWithGemini(intelligence, {
    reason,
    allowFallback: true,
    force: Boolean(options.force),
  });
  patchLifeStageSnapshotCards(enriched);
  return enriched;
}

async function rebuildLifeStageIntelligence(reason = "life_stage_profile_updated", options = {}) {
  const profile = readLifeStageProfile();
  const signature = profileSignature(profile);
  if (!profile || !signature) return null;

  const cached = readCachedLifeStageIntelligence();
  if (runtimeState.lastSignature === signature && cached?.snapshot && !options.forceLocalRebuild) {
    patchLifeStageSnapshotCards(cached);
    return cached;
  }

  const intelligence = buildLifeStageIntelligence(profile);
  runtimeState.lastSignature = signature;
  await saveLifeStageIntelligence(intelligence, { reason });
  patchLifeStageSnapshotCards(intelligence);
  return intelligence;
}

function getLifeStageSnapshotSection() {
  if (typeof document === "undefined") return null;
  const headings = Array.from(document.querySelectorAll("h3"));
  const heading = headings.find((node) => cleanText(node.textContent) === "Life Stage Trend Snapshot");
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

function ensureWorldInsightPanel(section, intelligence) {
  const snapshot = intelligence?.snapshot || {};
  const world = snapshot.worldContext;
  const predictive = snapshot.predictiveInsights || [];
  const adaptive = snapshot.adaptiveActions || [];

  let panel = section.querySelector("[data-clara-life-world-panel='true']");

  if (!world && !predictive.length && !adaptive.length && snapshot.enrichmentStatus !== "refreshing world context") {
    if (panel) panel.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement("div");
    panel.dataset.claraLifeWorldPanel = "true";
    panel.className = "mt-3 rounded-[20px] border border-cyan-100/10 bg-cyan-200/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]";
    section.appendChild(panel);
  }

  const affecting = world?.currentlyAffectingYou?.[0];
  const prediction = predictive?.[0];
  const action = adaptive?.[0];
  const isRefreshing = snapshot.enrichmentStatus === "refreshing world context";

  panel.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/44">World-aware layer</p>
        <h4 class="mt-1 text-[13px] font-black text-white/90">${isRefreshing ? "Refreshing current context..." : cleanText(affecting?.label || snapshot.statusBadge || "Currently affecting you")}</h4>
        <p class="mt-1 text-[11px] font-semibold leading-5 text-white/54">${cleanText(affecting?.why || world?.philippinesContext || snapshot.summary || "CLARA is combining your profile with current real-world pressure signals.", 260)}</p>
      </div>
      <span class="shrink-0 rounded-full border border-cyan-100/12 bg-cyan-200/8 px-2.5 py-1 text-[9px] font-black text-cyan-50/72">${cleanText(affecting?.impact || snapshot.enrichmentStatus || "local", 24)}</span>
    </div>
    ${prediction?.risk || action?.title ? `
      <div class="mt-3 grid gap-2">
        ${prediction?.risk ? `<div class="rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2"><p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Predictive watch</p><p class="mt-1 text-[11px] font-semibold leading-5 text-white/58">${cleanText(prediction.risk, 90)} — ${cleanText(prediction.action || prediction.signal, 160)}</p></div>` : ""}
        ${action?.title ? `<div class="rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2"><p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Adaptive action</p><p class="mt-1 text-[11px] font-semibold leading-5 text-white/58">${cleanText(action.title, 90)}: ${cleanText(action.action, 160)}</p></div>` : ""}
      </div>
    ` : ""}
  `;
}

export function patchLifeStageSnapshotCards(intelligence = readCachedLifeStageIntelligence()) {
  if (!intelligence?.snapshot?.indicators?.length || typeof document === "undefined") return;

  const section = getLifeStageSnapshotSection();
  if (!section) return;

  const subtitle = section.querySelector("p");
  if (subtitle) {
    const status = intelligence.snapshot.enrichmentStatus === "refreshing world context"
      ? "Refreshing world context"
      : intelligence.snapshot.enrichmentStatus === "world-aware"
        ? "World-aware snapshot"
        : intelligence.snapshot.enrichmentStatus === "local fallback"
          ? "Offline-safe snapshot"
          : intelligence.snapshot.statusBadge;
    subtitle.textContent = `${status} • ${intelligence.snapshot.confidenceLabel || "Learning"} confidence`;
  }

  const cards = Array.from(section.querySelectorAll("button"));
  intelligence.snapshot.indicators.slice(0, cards.length).forEach((indicator, index) => {
    const card = cards[index];
    if (!card) return;
    const labels = Array.from(card.querySelectorAll("p"));
    if (labels[0]) labels[0].textContent = indicator.label;
    if (labels[1]) labels[1].textContent = `${indicator.value}%`;
    if (labels[2]) {
      labels[2].textContent = getLevelLabel(indicator.value, /stability|potential/i.test(indicator.label));
    }
    card.dataset.claraLifeSnapshotLabel = indicator.label;
    card.dataset.claraLifeSnapshotNote = indicator.note;
  });

  ensureWorldInsightPanel(section, intelligence);
}

function shouldReactToApplyStageClick(event) {
  const button = event.target?.closest?.("button");
  if (!button) return false;
  return cleanText(button.textContent).includes("Apply stage");
}

function installLifeStageIntelligenceRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  const orchestrator = getClaraIntelligenceOrchestrator().install();

  orchestrator.registerJob(
    "rebuildLifeStageSnapshot",
    async ({ reason, options }) => {
      const intelligence = await rebuildLifeStageIntelligence(reason, options || {});
      if (intelligence?.snapshot) {
        orchestrator.enqueue("enrichLifeStageWorldContext", "life_stage_snapshot_ready", { debounceMs: 500 });
      }
      return intelligence;
    },
    {
      label: "Life Stage snapshot rebuild",
      debounceMs: 900,
      cooldownMs: 20_000,
      dirtyFlag: "life_stage_snapshot",
    }
  );

  orchestrator.registerJob(
    "enrichLifeStageWorldContext",
    async ({ reason, options }) => {
      const cached = readCachedLifeStageIntelligence();
      return runWorldEnrichment(cached, reason, options || {});
    },
    {
      label: "Life Stage world enrichment",
      debounceMs: 2500,
      cooldownMs: 15 * 60_000,
      dirtyFlag: "world_enrichment",
    }
  );

  orchestrator.registerJob(
    "hydrateLifeSnapshot",
    async () => {
      patchLifeStageSnapshotCards();
      return readCachedLifeStageIntelligence();
    },
    {
      label: "Hydrate Life Snapshot",
      debounceMs: 250,
      cooldownMs: 1500,
      dirtyFlag: "life_snapshot_hydration",
    }
  );

  document.addEventListener(
    "click",
    (event) => {
      if (!shouldReactToApplyStageClick(event)) return;
      window.setTimeout(() => {
        orchestrator.enqueue("rebuildLifeStageSnapshot", "life_stage_apply_stage", {
          forceLocalRebuild: true,
          debounceMs: 200,
        });
      }, 220);
    },
    true
  );

  window.addEventListener("clara:life-stage-intelligence-updated", (event) => {
    patchLifeStageSnapshotCards(event.detail);
    orchestrator.emit(INTELLIGENCE_EVENTS.UPDATED, {
      jobKey: "legacy_life_stage_updated",
      reason: "legacy_event_bridge",
      result: event.detail,
    });
  });

  window.addEventListener(INTELLIGENCE_EVENTS.UPDATED, (event) => {
    if (event.detail?.result?.snapshot) patchLifeStageSnapshotCards(event.detail.result);
  });

  window.requestAnimationFrame(() => {
    const cached = safeJsonParse(window.localStorage.getItem(LIFE_STAGE_SNAPSHOT_KEY), null);
    if (cached?.snapshot) {
      runtimeState.lastSignature = profileSignature(readLifeStageProfile());
      patchLifeStageSnapshotCards(cached);
      orchestrator.enqueue("enrichLifeStageWorldContext", "startup_stale_check", { debounceMs: 1200 });
      return;
    }
    orchestrator.enqueue("rebuildLifeStageSnapshot", "startup_initial_check", { debounceMs: 1500 });
  });
}

try {
  installLifeStageIntelligenceRuntime();
} catch (error) {
  console.warn("CLARA Life Stage Intelligence runtime failed:", error);
}
