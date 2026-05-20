const RUNTIME_KEY = "__CLARA_LIFE_STAGE_PRESENTATION_HIERARCHY_RUNTIME__";
const SNAPSHOT_KEY = "clara_life_stage_snapshot_v1";

const state = {
  timer: null,
  lastRunAt: 0,
};

function cleanText(value, max = 320) {
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

function getLifeStageSnapshotSection() {
  if (typeof document === "undefined") return null;
  const heading = Array.from(document.querySelectorAll("h3")).find(
    (node) => cleanText(node.textContent) === "Life Stage Trend Snapshot"
  );
  return heading?.closest("section") || null;
}

function getSnapshotHeader(section) {
  return section?.querySelector("h3")?.parentElement || null;
}

function getCarousel(section) {
  return Array.from(section?.querySelectorAll("div") || []).find((node) => {
    const className = String(node.className || "");
    return className.includes("snap-x") && className.includes("overflow-x-auto");
  });
}

function hasFallbackTone(node) {
  const text = cleanText(node?.textContent || "").toLowerCase();
  return (
    text.includes("local-only") ||
    text.includes("local only") ||
    text.includes("fallback") ||
    text.includes("gemini unavailable") ||
    text.includes("offline-safe") ||
    text.includes("refreshing current context") ||
    text.includes("local snapshot")
  );
}

function getContextLabel(section) {
  const cached = readCachedSnapshot();
  const status = cleanText(cached?.snapshot?.enrichmentStatus || "").toLowerCase();
  const worldPanel = section.querySelector("[data-clara-life-world-panel='true']");

  if (status.includes("world-aware")) return "World context synced";
  if (status.includes("refreshing")) return "Refreshing quietly";
  if (hasFallbackTone(worldPanel) || status.includes("fallback")) return "Local intelligence active";
  return "Adaptive insight active";
}

function ensureContextChip(section) {
  const header = getSnapshotHeader(section);
  if (!header) return null;

  let chip = section.querySelector("[data-clara-context-status-chip='true']");
  if (!chip) {
    chip = document.createElement("div");
    chip.dataset.claraContextStatusChip = "true";
    chip.className = "mt-2 inline-flex w-fit rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/42";
    header.appendChild(chip);
  }

  const nextLabel = getContextLabel(section);
  if (chip.textContent !== nextLabel) chip.textContent = nextLabel;
  return chip;
}

function demoteSystemContext(section) {
  const worldPanel = section.querySelector("[data-clara-life-world-panel='true']");
  ensureContextChip(section);

  if (!worldPanel) return;

  worldPanel.dataset.claraPresentationRole = "context-metadata";
  worldPanel.dataset.claraPresentationDemoted = "true";
  worldPanel.setAttribute("aria-hidden", "true");
  worldPanel.hidden = true;
  worldPanel.style.display = "none";
}

function markPanel(panel, role, priority) {
  if (!panel) return;
  panel.dataset.claraPresentationRole = role;
  panel.dataset.claraPresentationPriority = String(priority);
  panel.classList.add("clara-presentation-card-stable");
}

function insertAfter(reference, node) {
  if (!reference || !node || reference === node) return;
  reference.insertAdjacentElement("afterend", node);
}

function enforcePanelOrder(section) {
  const header = getSnapshotHeader(section);
  const carousel = getCarousel(section);
  const behaviorPanel = section.querySelector("[data-clara-behavior-observation-panel='true']");
  const predictionPanel = section.querySelector("[data-clara-predictive-decision-panel='true']");

  markPanel(behaviorPanel, "observed-behavior", 1);
  markPanel(predictionPanel, "predictive-watch", 2);
  if (carousel) {
    carousel.dataset.claraPresentationRole = "financial-stability";
    carousel.dataset.claraPresentationPriority = "3";
  }

  if (behaviorPanel && header && behaviorPanel.previousElementSibling !== header) {
    insertAfter(header, behaviorPanel);
  }

  if (predictionPanel) {
    if (behaviorPanel) {
      if (predictionPanel.previousElementSibling !== behaviorPanel) insertAfter(behaviorPanel, predictionPanel);
    } else if (header && predictionPanel.previousElementSibling !== header) {
      insertAfter(header, predictionPanel);
    }
  }

  if (carousel) {
    const desiredPrevious = predictionPanel || behaviorPanel || header;
    if (desiredPrevious && carousel.previousElementSibling !== desiredPrevious) {
      insertAfter(desiredPrevious, carousel);
    }
  }
}

function softenTechnicalCopy(section) {
  const chip = ensureContextChip(section);
  if (chip && /local-only|fallback|gemini/i.test(chip.textContent || "")) {
    chip.textContent = "Local intelligence active";
  }

  const behaviorPanel = section.querySelector("[data-clara-behavior-observation-panel='true']");
  const behaviorTitle = behaviorPanel?.querySelector("h4");
  if (behaviorTitle && /clara is learning your rhythm/i.test(behaviorTitle.textContent || "")) {
    behaviorTitle.textContent = "Behavioral insight active";
  }

  const predictionPanel = section.querySelector("[data-clara-predictive-decision-panel='true']");
  const predictionTitle = predictionPanel?.querySelector("h4");
  if (predictionTitle && /clara is building your forecast/i.test(predictionTitle.textContent || "")) {
    predictionTitle.textContent = "Predictive watch active";
  }
}

function enforcePresentationHierarchy() {
  const section = getLifeStageSnapshotSection();
  if (!section) return;

  section.dataset.claraPresentationHierarchy = "behavior-first";
  demoteSystemContext(section);
  enforcePanelOrder(section);
  softenTechnicalCopy(section);
  state.lastRunAt = Date.now();
}

function schedule(reason = "presentation_update", delay = 180) {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(() => {
    window.requestAnimationFrame(enforcePresentationHierarchy);
  }, delay);
}

function installPresentationHierarchyRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  [
    "clara:intelligence-updated",
    "clara:life-stage-intelligence-updated",
    "clara:behavior-pattern-updated",
    "clara:prediction-updated",
  ].forEach((eventName) => {
    window.addEventListener(eventName, () => schedule(eventName, 220));
  });

  window.addEventListener("hashchange", () => schedule("route_change", 260));
  document.addEventListener("click", () => schedule("user_navigation", 320), true);
  window.requestAnimationFrame(enforcePresentationHierarchy);
}

try {
  installPresentationHierarchyRuntime();
} catch (error) {
  console.warn("CLARA presentation hierarchy runtime failed:", error);
}
