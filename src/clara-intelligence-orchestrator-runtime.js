import {
  installClaraIntelligenceOrchestrator,
  getClaraIntelligenceOrchestrator,
} from "./lib/claraIntelligenceOrchestrator";

const RUNTIME_KEY = "__CLARA_INTELLIGENCE_ORCHESTRATOR_RUNTIME__";

const FINANCE_EVENTS = [
  "clara-expenses-updated",
  "clara-wallet-transactions-updated",
  "clara-finance-updated",
  "clara-budgets-updated",
  "clara-savings-updated",
  "clara-emergency-fund-updated",
];

function installRuntimeBridge() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[RUNTIME_KEY]) return;
  window[RUNTIME_KEY] = true;

  const orchestrator = installClaraIntelligenceOrchestrator();

  FINANCE_EVENTS.forEach((eventName) => {
    window.addEventListener(eventName, () => {
      orchestrator.enqueue("runBehaviorObservation", eventName, { debounceMs: 2800 });
      orchestrator.enqueue("runPredictiveDecision", eventName, { debounceMs: 4200 });
      orchestrator.markDirty("finance_behavior", eventName);
    });
  });

  window.addEventListener("online", () => {
    const cached = getClaraIntelligenceOrchestrator().getRemoteSyncState();
    if (!cached.disabled) {
      orchestrator.enqueue("enrichLifeStageWorldContext", "browser_online", { debounceMs: 5000 });
    }
  });

  window.addEventListener("offline", () => {
    orchestrator.markDirty("offline_mode", "browser_offline");
  });

  window.requestAnimationFrame(() => {
    orchestrator.enqueueMany(
      ["hydrateLifeSnapshot", "hydrateBehaviorPanel", "hydratePredictionPanel"],
      "initial_hydration",
      { debounceMs: 150 }
    );
  });
}

try {
  installRuntimeBridge();
} catch (error) {
  console.warn("CLARA intelligence orchestrator runtime bridge failed:", error);
}
