import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { installClaraGlobalClickSound } from "@/lib/claraSoundSystem";
import { installNativeNotificationListeners } from "@/lib/notifications/nativePushNotifications";
import { startLocalEntitlementLifecycle } from "@/lib/local-entitlement-lifecycle";
import { installDailyTipFlipSound } from "./runtime/installDailyTipFlipSound";
import { installLearningHubOpenSound } from "./runtime/installLearningHubOpenSound";
import { installMoneyVisibilitySound } from "./runtime/installMoneyVisibilitySound";
import { installFinancialCarouselSwipeSound } from "./runtime/installFinancialCarouselSwipeSound";
import { installMoneyLeftOrbInteractionSound } from "./runtime/installMoneyLeftOrbInteractionSound";
import { installClaraGuideDemoPatches } from "./runtime/installClaraGuideDemoPatches";
import {
  clearClaraGuideFeatureClasses,
  installClaraGuideCarouselStep,
} from "./runtime/installClaraGuideCarouselStep";
import { installClaraGuideSchedulePhaseRedirect } from "./runtime/claraGuideSchedulePhaseRedirect";
import { installClaraGuideScheduleRuntime } from "./runtime/claraGuideScheduleRuntime";
import "./runtime/installClaraRuntimePatches";
import App from "./App.jsx";
import "./index.css";
import "./manual-expense-wallet-step.css";
import "./guide-mode-stacking.css";
import "./guide-mode-finance-spotlight.css";
import "./guide-mode-money-left-spotlight.css";
import "./guide-mode-money-left-orb.css";
import "./guide-mode-me-bubble-spacing.css";
import "./guide-mode-schedule.css";
import "./guide-mode-intro-cleanup.css";
import "./welcome-session-calendar-status.css";
import "./budget-manager-layout-fix.css";
import "./guided-onboarding-bubble.css";

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
  startLocalEntitlementLifecycle();
} catch (error) {
  console.warn("CLARA local entitlement lifecycle failed to init:", error);
}

try {
  installDailyTipFlipSound();
} catch (error) {
  console.warn("Daily Tip flip sound failed to init:", error);
}

try {
  installLearningHubOpenSound();
} catch (error) {
  console.warn("Learning Hub opening sound failed to init:", error);
}

try {
  installMoneyVisibilitySound();
} catch (error) {
  console.warn("Money visibility sound failed to init:", error);
}

try {
  installFinancialCarouselSwipeSound();
} catch (error) {
  console.warn("Financial carousel swipe sound failed to init:", error);
}

try {
  installMoneyLeftOrbInteractionSound();
} catch (error) {
  console.warn("Money Left orb interaction sound failed to init:", error);
}

try {
  installClaraGlobalClickSound();
} catch (error) {
  console.warn("CLARA sound system failed to init:", error);
}

try {
  installClaraGuideDemoPatches();
} catch (error) {
  console.warn("CLARA guide demo patches failed to init:", error);
}

try {
  clearClaraGuideFeatureClasses();
  installClaraGuideCarouselStep();
} catch (error) {
  console.warn("CLARA guide carousel step failed to init:", error);
}

try {
  installClaraGuideSchedulePhaseRedirect();
  installClaraGuideScheduleRuntime();
} catch (error) {
  console.warn("CLARA Schedule Guide runtime failed to init:", error);
}

try {
  installNativeNotificationListeners();
} catch (error) {
  console.warn("CLARA native notification listeners failed to init:", error);
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
  </React.StrictMode>,
);
