import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { ThemeProvider } from "@/theme/ThemeProvider";
import ClaraAiEnvironmentBridge from "@/components/fresh/main-dashboard/assistant/ClaraAiEnvironmentBridge";
import BudgetMasterclassRuntime from "@/components/community/BudgetMasterclassRuntime";
import { installClaraGlobalClickSound } from "@/lib/claraSoundSystem";
import { installNativeNotificationListeners } from "@/lib/notifications/nativePushNotifications";
import { startLocalEntitlementLifecycle } from "@/lib/local-entitlement-lifecycle";
import { installDailyTipFlipSound } from "./runtime/installDailyTipFlipSound";
import { installLearningHubOpenSound } from "./runtime/installLearningHubOpenSound";
import { installMoneyVisibilitySound } from "./runtime/installMoneyVisibilitySound";
import { installFinancialCarouselSwipeSound } from "./runtime/installFinancialCarouselSwipeSound";
import { installCommunityVideoAutoplay } from "./runtime/installCommunityVideoAutoplay";
import { installCommunityProfileEditShortcut } from "./runtime/installCommunityProfileEditShortcut";
import { installCommunityNotificationRuntime } from "./runtime/installCommunityNotificationRuntime";
import { installClaraBackgroundRuntimeGuard } from "./runtime/installClaraBackgroundRuntimeGuard";
import { installClaraHomeBrandCompletion } from "./runtime/installClaraHomeBrandCompletion";
import { installClaraOrbLaunchTransition } from "./runtime/installClaraOrbLaunchTransition";
import { installBudgetSetupCopyCleanup } from "./runtime/installBudgetSetupCopyCleanup";
import { installClaraGuideDemoPatches } from "./runtime/installClaraGuideDemoPatches";
import {
  clearClaraGuideFeatureClasses,
  installClaraGuideCarouselStep,
} from "./runtime/installClaraGuideCarouselStep";
import { installClaraGuideScheduleRuntime } from "./runtime/claraGuideScheduleRuntime";
import "./runtime/installClaraRuntimePatches";
import "./runtime/installWeeklyMoneyCheckReconciliation";
import "./runtime/installManualExpenseKeyboardGuard";
import "./runtime/installCommunityViewerCommentsRuntime";
import "./runtime/installBudgetRecentReuse";
import "./runtime/installBudgetDocumentationHeaderCleanup";
import "./runtime/installQuickActionsBudgetSetupNoticeCleanup";
import "./runtime/installProfileUnderConstructionModal";
import "./index.css";
import "./support-orb-position.css";
import "./messages-back-to-community-label.css";
import "./messages-inbox-refine.css";
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
import "./clara-unified-shell-theme.css";
import "./clara-feature-theme-pass.css";
import "./clara-home-premium-theme.css";
import "./clara-home-daily-tip-official.css";
import "./clara-no-bubble-effects.css";
import "./clara-home-learning-rail-official.css";
import "./clara-home-finance-card-system.css";
import "./clara-home-finance-card-containment-fix.css";
import "./clara-home-money-left-official.css";
import "./clara-universal-background.css";
import "./clara-home-responsive-spacing.css";
import "./clara-home-brand-completion.css";
import "./community-top-nav-geometry-lock.css";
import "./community-profile-official-brand.css";
import "./clara-budget-plan-official.css";
import "./clara-budget-timeframe-heading.css";
import "./clara-quick-actions-safe-footer.css";
import "./clara-onboarding-country-spacing.css";
import "./budget-masterclass-readability.css";
import "./budget-masterclass-followup-premium.css";
import "./clara-tutorial-juan-character.css";

const App = React.lazy(() => import("./App.jsx"));

function StartupScreen({ message = "Opening CLARA..." }) {
  return (
    <div className="theme-page-shell min-h-screen flex items-center justify-center text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/15 border-t-emerald-400" />
        <p className="text-sm text-white/75">{message}</p>
      </div>
    </div>
  );
}

class StartupErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[CLARA Startup] application render failed", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="theme-page-shell min-h-screen flex items-center justify-center px-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-center shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">CLARA startup</p>
          <h1 className="mt-3 text-2xl font-bold">CLARA could not finish opening.</h1>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Reload the latest version. Your saved local financial data will not be deleted.
          </p>
          <button
            type="button"
            className="mt-6 h-12 w-full rounded-2xl bg-emerald-400 font-bold text-slate-950"
            onClick={() => window.location.reload()}
          >
            Reload CLARA
          </button>
        </div>
      </div>
    );
  }
}

function RootApplication() {
  return (
    <Suspense fallback={<StartupScreen message="Opening CLARA..." />}>
      <App />
    </Suspense>
  );
}

try {
  installClaraBackgroundRuntimeGuard();
} catch (error) {
  console.warn("CLARA background runtime guard failed to init:", error);
}

try {
  installClaraHomeBrandCompletion();
} catch (error) {
  console.warn("CLARA Home brand completion failed to init:", error);
}

try {
  installClaraOrbLaunchTransition();
} catch (error) {
  console.warn("CLARA Orb launch transition failed to init:", error);
}

try {
  installBudgetSetupCopyCleanup();
} catch (error) {
  console.warn("CLARA Budget Setup copy cleanup failed to init:", error);
}

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
  installCommunityVideoAutoplay();
} catch (error) {
  console.warn("Community video autoplay failed to init:", error);
}

try {
  installCommunityProfileEditShortcut();
} catch (error) {
  console.warn("Community profile edit shortcut failed to init:", error);
}

try {
  installCommunityNotificationRuntime();
} catch (error) {
  console.warn("Community notification runtime failed to init:", error);
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
    <StartupErrorBoundary>
      <QueryClientProvider client={queryClientInstance}>
        <AuthProvider>
          <ThemeProvider>
            <HashRouter>
              <RootApplication />
              <BudgetMasterclassRuntime />
              <ClaraAiEnvironmentBridge />
            </HashRouter>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StartupErrorBoundary>
  </React.StrictMode>,
);
