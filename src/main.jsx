import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { installClaraGlobalClickSound } from "@/lib/claraSoundSystem";
import "./clara-memory-bridge";
import "./clara-me-panel";
import "./clara-talk-pause-bridge";
import "./life-stage-support-card";
import "./life-stage-signal-card-states";
import "./life-stage-young-professional-signals";
import "./life-stage-living-with-partner-signals";
import "./life-stage-working-student-heart-default-guard";
import "./life-stage-living-with-partner-reveal";
import "./life-stage-trend-snapshot";
import "./life-stage-setup-flow-polish";
import "./life-stage-working-student-identity-context";
import "./life-stage-apply-diagnosis";
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

const installClaraSupportComposerEnhancer = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const supportEmail = "claraprogram2026@gmail.com";
  const topics = [
    "Bug report",
    "Feedback & ideas",
    "Billing concern",
    "Account issue",
    "Feature request",
    "Coaching concern",
    "Other concern",
  ];

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

  const refineDraft = (topic, message) => {
    const cleanMessage = clean(message);
    if (!cleanMessage) return "";
    return [
      "Hello CLARA Team,",
      "",
      `Topic: ${clean(topic) || "General concern"}`,
      "",
      "I would like to share the following concern or feedback:",
      cleanMessage,
      "",
      "Please review this when possible. Thank you.",
    ].join("\n");
  };

  const getSupportPage = () => {
    const heading = Array.from(document.querySelectorAll("h2")).find((node) => {
      const text = clean(node.textContent);
      return text === "Help & support" || text === "Help & feedback";
    });

    let current = heading?.parentElement || null;
    while (current && current !== document.body) {
      if (
        current.classList?.contains("space-y-4") &&
        current.querySelector("select") &&
        current.querySelector("textarea")
      ) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  };

  const enhance = () => {
    const page = getSupportPage();
    if (!page || page.dataset.claraSupportComposerEnhanced === "true") return;
    const select = page.querySelector("select");
    const textarea = page.querySelector("textarea");
    const sendButton = Array.from(page.querySelectorAll("button")).find((button) => /send/i.test(clean(button.textContent)));
    if (!select || !textarea || !sendButton) return;

    page.dataset.claraSupportComposerEnhanced = "true";

    const helper = document.createElement("p");
    helper.className = "text-[10px] leading-relaxed text-slate-400/80 px-1";
    helper.textContent = "CLARA can help refine your message before sending it.";

    const refineButton = document.createElement("button");
    refineButton.type = "button";
    refineButton.className = "rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-[11px] font-semibold text-cyan-100 active:scale-[0.98] transition";
    refineButton.textContent = "Refine message";

    const row = document.createElement("div");
    row.className = "flex items-center justify-between gap-2";
    row.appendChild(helper);
    row.appendChild(refineButton);

    textarea.insertAdjacentElement("afterend", row);

    refineButton.addEventListener("click", () => {
      const refined = refineDraft(select.value, textarea.value);
      if (!refined) return;
      textarea.value = refined;
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
  };

  const observer = new MutationObserver(enhance);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  enhance();
};

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
