import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { installClaraGlobalClickSound } from "@/lib/claraSoundSystem";
import App from "./App.jsx";
import "./index.css";
import "./clara-fab-theme.css";
import "./mobile-responsive.css";
import "./mobile-performance.css";
import "./dashboard-bottom-spacing.css";
import "./life-context-polish.css";
import "./settings-cleanup.css";
import "./settings-priority.css";
import "./settings-support-compose.css";

// --- SAFE BILLING INIT (non-blocking, crash-proof) ---
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

// --- GLOBAL CLICK SOUND ---
try {
  installClaraGlobalClickSound();
} catch (error) {
  console.warn("CLARA sound system failed to init:", error);
}

// --- HELP & FEEDBACK COMPOSER ENHANCER ---
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

  const buildRefinedMessage = (topic, message) => {
    const cleanTopic = clean(topic) || "General concern";
    const cleanMessage = clean(message);

    if (!cleanMessage) return "";

    return [
      "Hello CLARA Team,",
      "",
      `Topic: ${cleanTopic}`,
      "",
      "I would like to share the following concern or feedback:",
      cleanMessage,
      "",
      "Please review this when possible. Thank you.",
    ].join("\n");
  };

  const copyText = async (value) => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const temporaryTextArea = document.createElement("textarea");
    temporaryTextArea.value = value;
    temporaryTextArea.setAttribute("readonly", "true");
    temporaryTextArea.style.position = "fixed";
    temporaryTextArea.style.opacity = "0";
    document.body.appendChild(temporaryTextArea);
    temporaryTextArea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(temporaryTextArea);
    return copied;
  };

  const enhancePage = () => {
    const heading = Array.from(document.querySelectorAll("h2")).find((node) => {
      const text = clean(node.textContent);
      return text === "Help & support" || text === "Help & feedback";
    });

    const page = heading?.closest(".space-y-4");
    const select = page?.querySelector("select");
    const textarea = page?.querySelector("textarea");

    if (!page || !heading || !select || !textarea) return;

    const subtitle = heading.parentElement?.querySelector("p");
    heading.textContent = "Help & feedback";
    if (subtitle) {
      subtitle.textContent = "Compose your concern or feedback, then let CLARA refine it before you email us.";
    }

    const topicLabel = select.closest("label")?.querySelector("span");
    const messageLabel = textarea.closest("label")?.querySelector("span");
    if (topicLabel) topicLabel.textContent = "Feedback type";
    if (messageLabel) messageLabel.textContent = "Compose message";
    textarea.placeholder = "Describe your concern, idea, issue, or feedback...";

    if (select.dataset.claraTopicsReady !== "true") {
      const previousValue = select.value;
      select.innerHTML = topics.map((topic) => `<option>${topic}</option>`).join("");
      select.value = topics.includes(previousValue) ? previousValue : "Feedback & ideas";
      select.dataset.claraTopicsReady = "true";
    }

    const oldSendButton = Array.from(page.querySelectorAll("button")).find((button) =>
      clean(button.textContent).includes("Send CLARA support message")
    );

    if (oldSendButton) oldSendButton.style.display = "none";

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
        <button type="button" data-clara-support-refine>Refine with CLARA AI</button>
        <button type="button" data-clara-support-copy disabled>Copy refined message</button>
      </div>
      <div class="clara-support-refined-box" hidden>
        <p>Refined message</p>
        <textarea readonly data-clara-support-output></textarea>
        <a data-clara-support-email href="mailto:${supportEmail}">Open email app</a>
      </div>
      <p class="clara-support-helper">Write your concern first. CLARA will clean it into a professional email-ready message.</p>
    `;

    const insertTarget = oldSendButton || textarea.closest("label");
    insertTarget?.insertAdjacentElement("afterend", panel);

    const refineButton = panel.querySelector("[data-clara-support-refine]");
    const copyButton = panel.querySelector("[data-clara-support-copy]");
    const outputWrap = panel.querySelector(".clara-support-refined-box");
    const output = panel.querySelector("[data-clara-support-output]");
    const emailLink = panel.querySelector("[data-clara-support-email]");
    const helper = panel.querySelector(".clara-support-helper");

    refineButton?.addEventListener("click", () => {
      const refined = buildRefinedMessage(select.value, textarea.value);

      if (!refined) {
        helper.textContent = "Write your concern or feedback first, then CLARA can refine it.";
        textarea.focus();
        return;
      }

      output.value = refined;
      outputWrap.hidden = false;
      copyButton.disabled = false;
      emailLink.href = `mailto:${supportEmail}?subject=${encodeURIComponent(`CLARA ${select.value}`)}&body=${encodeURIComponent(refined)}`;
      helper.textContent = "Message refined. Copy it or open your email app to send it to CLARA support.";
    });

    copyButton?.addEventListener("click", async () => {
      const value = clean(output.value);
      if (!value) return;

      try {
        await copyText(output.value);
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