import React from "react";
import { createRoot } from "react-dom/client";
import ClaraOrbPage from "../../src/components/community/ClaraOrbPage";
import ClaraTutorialOrbIntro from "../../src/pages/onboarding/ClaraTutorialOrbIntro";
import "../../src/index.css";
import "../../src/runtime/installClaraOrbGreeting";
import "../../src/runtime/installClaraOrbIdleLife";

function setHarnessState(name) {
  document.documentElement.dataset[name] = "true";
}

function ProductionOrbSpecimen() {
  return (
    <div
      className="clara-community-root"
      data-community-view="orb"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        minHeight: "100dvh",
        overflow: "hidden",
        background: "#010217",
      }}
      data-clara-production-orb-specimen="true"
    >
      <style>{`
        [data-clara-production-orb-specimen="true"] > .clara-community-orb-view {
          min-height: 100dvh;
          width: 100%;
          flex: 1 1 auto;
        }
      `}</style>
      <ClaraOrbPage onActivate={() => setHarnessState("productionActivated")} />
    </div>
  );
}

function TutorialOrbSpecimen() {
  return (
    <ClaraTutorialOrbIntro
      onBack={() => setHarnessState("backRequested")}
      onContinue={() => setHarnessState("continueRequested")}
      onSkip={() => setHarnessState("skipRequested")}
    />
  );
}

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") === "production" ? "production" : "tutorial";

createRoot(document.getElementById("root")).render(
  mode === "production" ? <ProductionOrbSpecimen /> : <TutorialOrbSpecimen />
);
