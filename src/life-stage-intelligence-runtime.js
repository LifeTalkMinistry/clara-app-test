import {
  buildLifeStageIntelligence,
  readCachedLifeStageIntelligence,
  saveLifeStageIntelligence,
  LIFE_STAGE_SNAPSHOT_KEY,
} from "./lib/lifeStageIntelligenceEngine";

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const runtimeState = {
  lastSignature: "",
  saving: false,
};

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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
    .map((item) => cleanText(item))
    .join("|");
}

async function rebuildLifeStageIntelligence(reason = "life_stage_profile_updated") {
  if (runtimeState.saving) return null;

  const profile = readLifeStageProfile();
  const signature = profileSignature(profile);
  if (!profile || !signature) return null;

  const cached = readCachedLifeStageIntelligence();
  if (runtimeState.lastSignature === signature && cached?.snapshot) return cached;

  runtimeState.saving = true;
  try {
    const intelligence = buildLifeStageIntelligence(profile);
    runtimeState.lastSignature = signature;
    await saveLifeStageIntelligence(intelligence, { reason });
    patchLifeStageSnapshotCards(intelligence);
    return intelligence;
  } finally {
    runtimeState.saving = false;
  }
}

function getLifeStageSnapshotSection() {
  if (typeof document === "undefined") return null;
  const headings = Array.from(document.querySelectorAll("h3"));
  const heading = headings.find((node) => cleanText(node.textContent) === "Life Stage Trend Snapshot");
  return heading?.closest("section") || null;
}

function patchLifeStageSnapshotCards(intelligence = readCachedLifeStageIntelligence()) {
  if (!intelligence?.snapshot?.indicators?.length || typeof document === "undefined") return;

  const section = getLifeStageSnapshotSection();
  if (!section) return;

  const subtitle = section.querySelector("p");
  if (subtitle && cleanText(subtitle.textContent).includes("Swipe")) {
    subtitle.textContent = `${intelligence.snapshot.statusBadge} • ${intelligence.snapshot.confidenceLabel} confidence`;
  }

  const cards = Array.from(section.querySelectorAll("button"));
  intelligence.snapshot.indicators.slice(0, cards.length).forEach((indicator, index) => {
    const card = cards[index];
    if (!card) return;
    const labels = Array.from(card.querySelectorAll("p"));
    if (labels[0]) labels[0].textContent = indicator.label;
    if (labels[1]) labels[1].textContent = `${indicator.value}%`;
    if (labels[2]) {
      labels[2].textContent = indicator.value >= 75 ? "High" : indicator.value >= 55 ? "Moderate" : indicator.value >= 35 ? "Watch" : "Low";
    }
    card.dataset.claraLifeSnapshotLabel = indicator.label;
    card.dataset.claraLifeSnapshotNote = indicator.note;
  });
}

function shouldReactToApplyStageClick(event) {
  const button = event.target?.closest?.("button");
  if (!button) return false;
  return cleanText(button.textContent).includes("Apply stage");
}

function installLifeStageIntelligenceRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIFE_STAGE_INTELLIGENCE_RUNTIME__) return;
  window.__CLARA_LIFE_STAGE_INTELLIGENCE_RUNTIME__ = true;

  document.addEventListener(
    "click",
    (event) => {
      if (!shouldReactToApplyStageClick(event)) return;
      window.setTimeout(() => rebuildLifeStageIntelligence("life_stage_apply_stage"), 220);
    },
    true
  );

  window.addEventListener("clara:life-stage-intelligence-updated", (event) => {
    patchLifeStageSnapshotCards(event.detail);
  });

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => patchLifeStageSnapshotCards());
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.requestAnimationFrame(async () => {
    const cached = safeJsonParse(window.localStorage.getItem(LIFE_STAGE_SNAPSHOT_KEY), null);
    if (cached?.snapshot) {
      runtimeState.lastSignature = profileSignature(readLifeStageProfile());
      patchLifeStageSnapshotCards(cached);
      return;
    }
    await rebuildLifeStageIntelligence("life_stage_initial_runtime_check");
  });
}

try {
  installLifeStageIntelligenceRuntime();
} catch (error) {
  console.warn("CLARA Life Stage Intelligence runtime failed:", error);
}
