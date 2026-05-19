import {
  readCachedBehavioralObservation,
  runBehavioralObservationAnalysis,
} from "./lib/behavioralObservationEngine";

const RUNTIME_KEY = "__CLARA_BEHAVIORAL_OBSERVATION_RUNTIME__";
const MIN_ANALYSIS_INTERVAL_MS = 45_000;
const DEBOUNCE_MS = 2_500;

const FINANCE_EVENTS = [
  "clara-expenses-updated",
  "clara-wallet-transactions-updated",
  "clara-finance-updated",
  "clara-budgets-updated",
  "clara-savings-updated",
  "clara-emergency-fund-updated",
  "clara:life-stage-intelligence-updated",
];

const runtimeState = {
  timer: null,
  running: false,
  lastRunAt: 0,
  pendingReason: "startup",
};

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getLifeSnapshotSection() {
  if (typeof document === "undefined") return null;
  const heading = Array.from(document.querySelectorAll("h3")).find(
    (node) => cleanText(node.textContent) === "Life Stage Trend Snapshot"
  );
  return heading?.closest("section") || null;
}

function labelLevel(value, positive = true) {
  const numeric = Number(value || 0);
  if (positive) {
    if (numeric >= 75) return "Strong";
    if (numeric >= 55) return "Building";
    if (numeric >= 35) return "Watch";
    return "Low";
  }
  if (numeric >= 75) return "High";
  if (numeric >= 55) return "Moderate";
  if (numeric >= 35) return "Watch";
  return "Low";
}

function renderObservationPanel(snapshot = readCachedBehavioralObservation()) {
  if (typeof document === "undefined") return;
  const section = getLifeSnapshotSection();
  if (!section) return;

  let panel = section.querySelector("[data-clara-behavior-observation-panel='true']");

  if (!snapshot?.metrics) {
    if (panel) panel.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement("div");
    panel.dataset.claraBehaviorObservationPanel = "true";
    panel.className = "mt-3 rounded-[20px] border border-violet-100/10 bg-violet-300/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]";
    section.appendChild(panel);
  }

  const observation = snapshot.observations?.[0];
  const positive = observation?.severity === "positive";
  const metrics = snapshot.metrics || {};
  const trajectory = snapshot.riskTrajectory || {};

  panel.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-[9px] font-black uppercase tracking-[0.16em] text-violet-100/48">Observed behavior layer</p>
        <h4 class="mt-1 text-[13px] font-black text-white/90">${cleanText(observation?.title || "CLARA is learning your rhythm")}</h4>
        <p class="mt-1 text-[11px] font-semibold leading-5 text-white/54">${cleanText(observation?.summary || snapshot.summary || "CLARA is beginning to observe spending rhythm, stability, recovery, and pressure patterns.", 290)}</p>
      </div>
      <span class="shrink-0 rounded-full border border-violet-100/12 bg-violet-200/8 px-2.5 py-1 text-[9px] font-black text-violet-50/72">${cleanText(trajectory.direction || "learning", 24)}</span>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <div class="rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2">
        <p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Consistency</p>
        <p class="mt-1 text-[16px] font-black text-white/84">${metrics.consistencyScore || 0}%</p>
        <p class="text-[9px] font-bold text-white/38">${labelLevel(metrics.consistencyScore, true)}</p>
      </div>
      <div class="rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2">
        <p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Stress signal</p>
        <p class="mt-1 text-[16px] font-black text-white/84">${metrics.financialStressIndex || 0}%</p>
        <p class="text-[9px] font-bold text-white/38">${labelLevel(metrics.financialStressIndex, false)}</p>
      </div>
    </div>
    ${observation?.action ? `
      <div class="mt-2 rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2">
        <p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Adaptive suggestion</p>
        <p class="mt-1 text-[11px] font-semibold leading-5 text-white/58">${cleanText(observation.action, 180)}</p>
      </div>
    ` : ""}
  `;

  const subtitle = section.querySelector("p");
  if (subtitle && snapshot?.metrics?.observedBehaviorConfidence) {
    const observed = Math.round(snapshot.metrics.observedBehaviorConfidence || 0);
    if (!cleanText(subtitle.textContent).includes("Observed")) {
      subtitle.textContent = `${cleanText(subtitle.textContent)} • Observed ${observed}%`;
    }
  }
}

async function runQueuedAnalysis() {
  if (runtimeState.running) return;

  const elapsed = Date.now() - runtimeState.lastRunAt;
  if (elapsed < MIN_ANALYSIS_INTERVAL_MS && runtimeState.lastRunAt > 0) {
    scheduleObservation("cooldown_retry", MIN_ANALYSIS_INTERVAL_MS - elapsed + 500);
    return;
  }

  runtimeState.running = true;
  try {
    const result = await runBehavioralObservationAnalysis({ reason: runtimeState.pendingReason });
    runtimeState.lastRunAt = Date.now();
    renderObservationPanel(result?.observationSnapshot);
  } catch (error) {
    console.warn("CLARA behavioral observation runtime skipped:", error);
  } finally {
    runtimeState.running = false;
  }
}

function scheduleObservation(reason = "finance_event", delay = DEBOUNCE_MS) {
  runtimeState.pendingReason = reason;
  window.clearTimeout(runtimeState.timer);
  runtimeState.timer = window.setTimeout(runQueuedAnalysis, delay);
}

function installBehavioralObservationRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  FINANCE_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, () => scheduleObservation(eventName));
  });

  window.addEventListener("clara:behavior-pattern-updated", (event) => {
    renderObservationPanel(event.detail);
  });

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => renderObservationPanel());
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.requestAnimationFrame(() => {
    renderObservationPanel();
    scheduleObservation("startup", 4_000);
  });
}

try {
  installBehavioralObservationRuntime();
} catch (error) {
  console.warn("CLARA behavioral observation runtime failed:", error);
}
