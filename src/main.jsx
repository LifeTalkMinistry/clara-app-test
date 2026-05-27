import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { installClaraGlobalClickSound } from "@/lib/claraSoundSystem";
import "./clara-memory-bridge";
import "./clara-memory-cabinet-autosave";
import "./clara-me-panel";
import "./clara-talk-pause-bridge";
import "./life-stage-support-card";
import "./life-stage-default-support-card-guard";
import "./life-stage-heart-solution-hint";
import "./life-stage-living-with-partner-signals";
import "./life-stage-working-student-heart-default-guard";
import "./life-stage-living-with-partner-reveal";
import "./life-stage-trend-snapshot";
import "./life-stage-setup-flow-polish";
import "./life-stage-working-student-identity-context";
import "./life-stage-apply-diagnosis";
import "./life-stage-working-student-signal-fit";
import App from "./App.jsx";
import "./index.css";
import "./clara-fab-theme.css";
import "./mobile-responsive.css";
import "./mobile-performance.css";
import "./dashboard-bottom-spacing.css";
import "./life-context-polish.css";
import "./life-stage-hero-polish.css";
import "./life-stage-support-card.css";
import "./life-stage-trend-snapshot.css";
import "./life-stage-trend-snapshot-hide-icon.css";
import "./life-stage-trend-graph-hide.css";
import "./settings-cleanup.css";
import "./settings-priority.css";
import "./settings-support-compose.css";
import "./life-stage-collision.css";
import "./life-stage-action-position.css";
import "./life-stage-setup-scale.css";
import "./life-stage-setup-flow-polish.css";
import "./life-stage-question-compact-mobile.css";
import "./life-stage-progress-indicator-fix.css";
import "./life-stage-story-canonical-working-student.css";
import "./life-stage-story-canonical-young-professional.css";
import "./life-stage-freelance-season-support-fit.css";
import "./life-stage-diagnosis-cleanup.css";
import "./me-adaptive-viewport.css";
import "./me-hero-support-bond.css";
import "./me-support-dock-gap-fix.css";
import "./life-stage-young-professional-overlap-fix.css";

window.CLARA_BILLING = window.CLARA_BILLING || {};

(async () => {
  try {
    const isAndroid =
      /android/i.test(navigator.userAgent) ||
      !!window.Capacitor?.isNativePlatform?.();

    if (isAndroid) {
      setTimeout(async () => {
        try {
          if (window.CLARA_BILLING?.init) {
            await window.CLARA_BILLING.init();
          }
        } catch (error) {
          console.warn("Billing init safely ignored:", error);
        }
      }, 2000);
    }
  } catch (error) {
    console.warn("Billing auto-init failed:", error);
  }
})();

try {
  installClaraGlobalClickSound();
} catch (error) {
  console.warn("CLARA sound system failed to init:", error);
}

const installClaraSupportComposerEnhancer = () => {};

try {
  installClaraSupportComposerEnhancer();
} catch (error) {
  console.warn("CLARA support composer enhancer failed:", error);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <ThemeProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
