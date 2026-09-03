import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import "../../src/index.css";
import "../../src/messages-back-to-community-label.css";
import "../../src/clara-financial-context-official.css";
import "../../src/clara-universal-background.css";
import "../../src/clara-ai-overlay-soft-anchor.css";

const params = new URLSearchParams(window.location.search);
const seedExisting = params.get("seed") === "existing";
const standalone = params.get("mode") === "standalone";
const billboardOnly = params.get("mode") === "billboard";
const enablePwaRuntime = params.get("pwa") === "1";

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
if (!enablePwaRuntime) {
  window.__claraPwaFreshnessRuntime__ = true;
}

// Mirror production's global runtime/CSS registry instead of the reduced visual harness.
await import("../../src/runtime/installClaraRuntimePatches.js");

const { upsertIncomeSource } = await import("../../src/lib/incomeHubRepository.js");
const { startFinancialContextSetup } = await import(
  "../../src/lib/financialContextSetupRepository.js"
);

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

const incomeSetupState = await startFinancialContextSetup(user.id);

await import("../../src/runtime/installClaraOrbGreeting.js");
const { default: ClaraFinancialContextSetupCoordinator } = await import(
  "../../src/components/fresh/main-dashboard/assistant/ClaraFinancialContextSetupCoordinator.jsx"
);
const { default: ClaraAddIncomeOverlayV2 } = await import(
  "../../src/components/fresh/main-dashboard/assistant/ClaraAddIncomeOverlayV2.jsx"
);

window.__claraAddIncomeRegression = {
  setupState: incomeSetupState,
  closedStandalone: false,
  enablePwaRuntime,
};

function StandaloneHarness() {
  const [active, setActive] = useState(true);
  return (
    <div className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-[#06111f] text-white">
      {active ? (
        <ClaraAddIncomeOverlayV2
          isActive
          claraAssistantContext={{ user, wallets: [] }}
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
      className="clara-community-root fixed inset-0 z-[80] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white"
      data-community-view="orb"
      data-clara-financial-context-gated="true"
    >
      {/* Community.jsx emits a style element before the gated route content. */}
      <style>{".clara-regression-production-order-marker{}"}</style>
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

function BillboardHarness() {
  return (
    <div className="clara-community-root min-h-[240px] w-full p-4">
      <style>{".clara-regression-production-order-marker{}"}</style>
      <section
        data-clara-learning-hub-section="true"
        className="w-full bg-[#07142b]"
      >
        <div className="h-[180px] w-full">
          <img
            alt="Learning Hub regression surface"
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='360' viewBox='0 0 800 360'%3E%3Crect width='800' height='360' fill='%2307142b'/%3E%3C/svg%3E"
          />
        </div>
      </section>
    </div>
  );
}

function ProductionLayoutHarness({ children }) {
  return (
    <div className="theme-page-shell flex min-h-screen w-full flex-col">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  standalone ? (
    <StandaloneHarness />
  ) : billboardOnly ? (
    <ProductionLayoutHarness><BillboardHarness /></ProductionLayoutHarness>
  ) : (
    <ProductionLayoutHarness><SetupHarness /></ProductionLayoutHarness>
  )
);
