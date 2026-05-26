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
import "./life-stage-heart-solution-hint";
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

  const polishSupportPage = () => {
    const page = getSupportPage();
    if (!page || page.dataset.claraSupportComposeReady === "true") return;
    page.dataset.claraSupportComposeReady = "true";

    const textarea = page.querySelector("textarea");
    const select = page.querySelector("select");
    const sendButton = Array.from(page.querySelectorAll("button")).find((button) => clean(button.textContent).toLowerCase().includes("send"));
    if (!textarea || !select || !sendButton) return;

    const preview = document.createElement("div");
    preview.className = "clara-support-preview";
    preview.innerHTML = `
      <p class="clara-support-preview-label">Email preview</p>
      <div class="clara-support-preview-body">Write your concern above and CLARA will format it into a clear support email.</div>
    `;
    textarea.parentElement?.insertAdjacentElement("afterend", preview);

    const previewBody = preview.querySelector(".clara-support-preview-body");
    const updatePreview = () => {
      const draft = refineDraft(select.value, textarea.value);
      previewBody.textContent = draft || "Write your concern above and CLARA will format it into a clear support email.";
    };

    textarea.addEventListener("input", updatePreview);
    select.addEventListener("change", updatePreview);

    sendButton.addEventListener("click", (event) => {
      const draft = refineDraft(select.value, textarea.value);
      if (!draft) return;
      event.preventDefault();
      window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(`CLARA Support - ${clean(select.value) || "Concern"}`)}&body=${encodeURIComponent(draft)}`;
    }, true);
  };

  const observer = new MutationObserver(polishSupportPage);
  observer.observe(document.body, { childList: true, subtree: true });
  polishSupportPage();
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
