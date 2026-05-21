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
import "./life-stage-trend-graph-hide.css";
import "./settings-cleanup.css";
import "./settings-priority.css";
import "./settings-support-compose.css";
import "./life-stage-collision.css";
import "./life-stage-action-position.css";
import "./life-stage-setup-scale.css";
import "./life-stage-setup-flow-polish.css";
import "./life-stage-question-compact-mobile.css";
import "./me-adaptive-viewport.css";
import "./me-adaptive-composition-correction.css";

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