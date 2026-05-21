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
import "./life-stage-trend-snapshot";
import "./life-stage-setup-flow-polish";
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
import "./settings-cleanup.css";
import "./settings-priority.css";
import "./settings-support-compose.css";
import "./life-stage-collision.css";
import "./life-stage-action-position.css";
import "./life-stage-setup-scale.css";
import "./life-stage-setup-flow-polish.css";
import "./life-stage-question-compact-mobile.css";
import "./me-adaptive-viewport.css";

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
        return { page: current, heading };
      }
      current = current.parentElement;
    }

    return { page: null, heading: null };
  };

  const enhancePage = () => {
    const { page, heading } = getSupportPage();
    const select = page?.querySelector("select");
    const textarea = page?.querySelector("textarea");
    if (!page || !heading || !select || !textarea) return;

    heading.textContent = "Help & feedback";
    const subtitle = heading.parentElement?.querySelector("p");
    if (subtitle) {
      subtitle.textContent = "Compose your concern or feedback, then let CLARA refine it before you email us.";
    }

    const topicLabel = select.closest("label")?.querySelector("span");
    const messageLabel = textarea.closest("label")?.querySelector("span");
    if (topicLabel) topicLabel.textContent = "Feedback type";
    if (messageLabel) messageLabel.textContent = "Compose message";
    textarea.placeholder = "Describe your concern, idea, issue, or feedback...";
    textarea.disabled = false;

    if (select.dataset.claraTopicsReady !== "true") {
      const previousValue = select.value;
      select.innerHTML = topics.map((topic) => `<option>${topic}</option>`).join("");
      select.value = topics.includes(previousValue) ? previousValue : "Feedback & ideas";
      select.dataset.claraTopicsReady = "true";
    }

    const oldButton = Array.from(page.querySelectorAll("button")).find((button) =>
      clean(button.textContent).includes("Send CLARA support message") ||
      clean(button.textContent).includes("Sending to CLARA support")
    );
    if (oldButton) oldButton.style.display = "none";

    Array.from(page.querySelectorAll("p")).forEach((paragraph) => {
      if (clean(paragraph.textContent).includes("All admin accounts")) {
        paragraph.style.display = "none";
      }
    });

    if (page.querySelector("[data-clara-support-composer='true']")) return;

    const panel = document.createElement("div");
    panel.dataset.claraSupportComposer = "true";
    panel.className = "clara-support-compose-panel";
    panel.innerHTML = `
      <div class="clara-support-compose-actions">
        <button type="button" data-clara-support-refine>Refine Message</button>
        <button type="button" data-clara-support-copy disabled>Copy</button>
      </div>
      <div class="clara-support-refined-box" hidden>
        <p>Refined message</p>
        <textarea readonly data-clara-support-output></textarea>
        <a data-clara-support-email href="mailto:${supportEmail}">Open email app</a>
      </div>
      <p class="clara-support-helper">Copy the refined message, then paste it into the support email below.</p>
    `;

    (oldButton || textarea.closest("label"))?.insertAdjacentElement("afterend", panel);

    const refineButton = panel.querySelector("[data-clara-support-refine]");
    const copyButton = panel.querySelector("[data-clara-support-copy]");
    const outputWrap = panel.querySelector(".clara-support-refined-box");
    const output = panel.querySelector("[data-clara-support-output]");
    const emailLink = panel.querySelector("[data-clara-support-email]");
    const helper = panel.querySelector(".clara-support-helper");

    refineButton?.addEventListener("click", () => {
      const refined = refineDraft(select.value, textarea.value);
      if (!refined) {
        helper.textContent = "Write your concern or feedback first, then click Refine Message.";
        textarea.focus();
        return;
      }
      output.value = refined;
      outputWrap.hidden = false;
      copyButton.disabled = false;
      emailLink.href = `mailto:${supportEmail}?subject=${encodeURIComponent(`CLARA ${select.value}`)}&body=${encodeURIComponent(refined)}`;
      helper.textContent = "Message refined. Copy it, then paste it into the support email below.";
    });

    copyButton?.addEventListener("click", async () => {
      if (!clean(output.value)) return;
      try {
        await navigator.clipboard.writeText(output.value);
        helper.textContent = "Copied. Paste it into your email and send it to CLARA support.";
      } catch (error) {
        output.focus();
        output.select();
        helper.textContent = "Copy was blocked. Select the refined message manually.";
      }
    });
  };

  const observer = new MutationObserver(() => window.requestAnimationFrame(enhancePage));
  window.requestAnimationFrame(enhancePage);
  observer.observe(document.body, { childList: true, subtree: true });
};

try {
  installClaraSupportComposerEnhancer();
} catch (error) {
  console.warn("CLARA support composer enhancer failed:", error);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" was not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <HashRouter>
            <App />
          </HashRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);