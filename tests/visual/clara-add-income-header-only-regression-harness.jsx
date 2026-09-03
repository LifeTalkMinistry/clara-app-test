import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import "../../src/clara-universal-background.css";
import "../../src/clara-ai-overlay-soft-anchor.css";

const params = new URLSearchParams(window.location.search);
const seedExisting = params.get("seed") === "existing";
const standalone = params.get("mode") === "standalone";

const user = {
  id: "add-income-regression-user",
  email: "add-income-regression@example.test",
  firstName: "Max",
  name: "Max Regression",
};

async function resetLocalFinance() {
  window.localStorage.clear();
  await new Promise((resolve) => {
    const request = window.indexedDB.deleteDatabase("clara_local_finance");
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

await resetLocalFinance();
window.__claraPwaFreshnessRuntime__ = true;

const { upsertIncomeSource } = await import("../../src/lib/incomeHubRepository.js");
if (seedExisting) {
  await upsertIncomeSource(user.id, {
    id: "income-source-regression-primary",
    name: "Primary Salary",
    category: "Salary",
    stability: "Stable",
    stableMinimum: 15000,
    stable_minimum: 15000,
    currentBalance: 0,
    current_balance: 0,
  });
}

await import("../../src/runtime/installClaraOrbGreeting.js");
const { default: ClaraFinancialContextSetupCoordinator } = await import(
  "../../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx"
);
const { default: ClaraAddIncomeOverlayV2 } = await import(
  "../../src/components/fresh/main-dashboard/assistant/ClaraAddIncomeOverlayV2.jsx"
);

const incomeSetupState = {
  version: 1,
  status: "in_progress",
  currentStep: "income_hub",
  outcomes: {
    incomeHub: null,
    wallet: null,
    moneySchedule: null,
    obligations: null,
  },
  completedAt: null,
  migration: { reason: null },
};

window.__claraAddIncomeRegression = {
  setupState: incomeSetupState,
  closedStandalone: false,
};

function StandaloneHarness() {
  const [active, setActive] = useState(true);
  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-[#06111f] text-white">
      {active ? (
        <ClaraAddIncomeOverlayV2
          isActive
          user={user}
          claraAssistantContext={{ wallets: [] }}
          onClose={() => {
            window.__claraAddIncomeRegression.closedStandalone = true;
            setActive(false);
          }}
        />
      ) : (
        <button type="button" onClick={() => setActive(true)}>Reopen Add Income</button>
      )}
    </div>
  );
}

function SetupHarness() {
  const [state, setState] = useState(incomeSetupState);
  return (
    <div
      className="clara-community-root fixed inset-0 flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white"
      data-community-view="orb"
      data-clara-financial-context-gated="true"
    >
      <ClaraFinancialContextSetupCoordinator
        user={user}
        initialState={state}
        onStateChange={(nextState) => {
          window.__claraAddIncomeRegression.setupState = nextState;
          setState(nextState);
        }}
      />
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  standalone ? <StandaloneHarness /> : <SetupHarness />
);
