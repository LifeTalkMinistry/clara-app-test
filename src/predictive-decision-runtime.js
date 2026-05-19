import {
  readCachedPredictiveDecision,
  runPredictiveDecisionAnalysis,
} from "./lib/predictiveDecisionEngine";

const RUNTIME_KEY = "__CLARA_PREDICTIVE_DECISION_RUNTIME__";
const MIN_ANALYSIS_INTERVAL_MS = 60_000;
const DEBOUNCE_MS = 3_000;

const PREDICTION_EVENTS = [
  "clara:behavior-pattern-updated",
  "clara:life-stage-intelligence-updated",
  "clara-expenses-updated",
  "clara-wallet-transactions-updated",
  "clara-finance-updated",
  "clara-budgets-updated",
  "clara-savings-updated",
  "clara-emergency-fund-updated",
];

const runtimeState = {
  timer: null,
  running: false,
  lastRunAt: 0,
  pendingReason: "startup",
};

function cleanText(value, max = 260) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function getLifeSnapshotSection() {
  if (typeof document === "undefined") return null;
  const heading = Array.from(document.querySelectorAll("h3")).find(
    (node) => cleanText(node.textContent) === "Life Stage Trend Snapshot"
  );
  return heading?.closest("section") || null;
}

function levelLabel(value) {
  const numeric = Number(value || 0);
  if (numeric >= 75) return "High";
  if (numeric >= 55) return "Moderate";
  if (numeric >= 35) return "Watch";
  return "Learning";
}

function renderPredictionPanel(snapshot = readCachedPredictiveDecision()) {
  if (typeof document === "undefined") return;
  const section = getLifeSnapshotSection();
  if (!section) return;

  let panel = section.querySelector("[data-clara-predictive-decision-panel='true']");
  if (!snapshot?.forecast) {
    if (panel) panel.remove();
    return;
  }

  if (!panel) {
    panel = document.createElement("div");
    panel.dataset.claraPredictiveDecisionPanel = "true";
    panel.className = "mt-3 rounded-[20px] border border-amber-100/10 bg-amber-300/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]";
    section.appendChild(panel);
  }

  const top = snapshot.predictions?.[0];
  const second = snapshot.predictions?.[1];
  const confidence = snapshot.confidenceLayers?.predictionConfidence || 0.28;

  panel.innerHTML = `
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <p class="text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/52">Predictive decision layer</p>
        <h4 class="mt-1 text-[13px] font-black text-white/90">${cleanText(top?.title || snapshot.forecast.title || "CLARA is building your forecast", 90)}</h4>
        <p class="mt-1 text-[11px] font-semibold leading-5 text-white/56">${cleanText(top?.forecast || snapshot.forecast.summary || "CLARA is learning where your behavior may lead before pressure fully appears.", 300)}</p>
      </div>
      <span class="shrink-0 rounded-full border border-amber-100/12 bg-amber-200/8 px-2.5 py-1 text-[9px] font-black text-amber-50/76">${cleanText(snapshot.predictionTrajectory?.direction || "learning", 24)}</span>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-2">
      <div class="rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2">
        <p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Probability</p>
        <p class="mt-1 text-[16px] font-black text-white/84">${top?.probability || 0}%</p>
        <p class="text-[9px] font-bold text-white/38">${levelLabel(top?.probability || 0)}</p>
      </div>
      <div class="rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2">
        <p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Confidence</p>
        <p class="mt-1 text-[16px] font-black text-white/84">${Math.round(confidence * 100)}%</p>
        <p class="text-[9px] font-bold text-white/38">${top?.confidenceLabel || "Learning"}</p>
      </div>
    </div>
    ${top?.basis?.length ? `
      <div class="mt-2 rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2">
        <p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Why CLARA predicts this</p>
        <p class="mt-1 text-[11px] font-semibold leading-5 text-white/58">${cleanText(top.basis.slice(0, 3).join(" • "), 260)}</p>
      </div>
    ` : ""}
    ${top?.decisionGuidance || second?.decisionGuidance ? `
      <div class="mt-2 rounded-[15px] border border-white/[0.055] bg-white/[0.025] px-3 py-2">
        <p class="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Before you spend</p>
        <p class="mt-1 text-[11px] font-semibold leading-5 text-white/58">${cleanText(top?.decisionGuidance || second?.decisionGuidance, 220)}</p>
      </div>
    ` : ""}
  `;
}

async function runQueuedPrediction() {
  if (runtimeState.running) return;

  const elapsed = Date.now() - runtimeState.lastRunAt;
  if (elapsed < MIN_ANALYSIS_INTERVAL_MS && runtimeState.lastRunAt > 0) {
    schedulePrediction("cooldown_retry", MIN_ANALYSIS_INTERVAL_MS - elapsed + 700);
    return;
  }

  runtimeState.running = true;
  try {
    const result = await runPredictiveDecisionAnalysis({ reason: runtimeState.pendingReason });
    runtimeState.lastRunAt = Date.now();
    renderPredictionPanel(result?.predictionSnapshot);
  } catch (error) {
    console.warn("CLARA predictive decision runtime skipped:", error);
  } finally {
    runtimeState.running = false;
  }
}

function schedulePrediction(reason = "prediction_event", delay = DEBOUNCE_MS) {
  runtimeState.pendingReason = reason;
  window.clearTimeout(runtimeState.timer);
  runtimeState.timer = window.setTimeout(runQueuedPrediction, delay);
}

function installPredictiveDecisionRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  PREDICTION_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, () => schedulePrediction(eventName));
  });

  window.addEventListener("clara:prediction-updated", (event) => {
    renderPredictionPanel(event.detail);
  });

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame(() => renderPredictionPanel());
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.requestAnimationFrame(() => {
    renderPredictionPanel();
    schedulePrediction("startup", 5_000);
  });
}

try {
  installPredictiveDecisionRuntime();
} catch (error) {
  console.warn("CLARA predictive decision runtime failed:", error);
}
