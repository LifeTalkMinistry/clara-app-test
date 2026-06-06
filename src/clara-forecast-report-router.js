import { supabase } from "@/lib/supabaseClient";
import { getClaraEffectiveFinanceContext } from "@/lib/clara-effective-finance-context";
import { buildClaraForecastPhaseOneSnapshot } from "@/lib/clara-forecast-phase-one-snapshot";
import { buildClaraForecastReport } from "./clara-forecast-report-builder";

const STATE_KEY = "__CLARA_FORECAST_REPORT_ROUTER_STATE__";
const FALLBACK_USER_ID = "local-user";
const OPEN_EVENT = "clara:open-forecast-report";
const READY_EVENT = "clara:forecast-phase-one-ready";
const ACTION_SELECTOR = "[data-clara-open-forecast-report='true']";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getState() {
  window[STATE_KEY] = window[STATE_KEY] || { snapshot: null, busy: false };
  return window[STATE_KEY];
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return text.includes("Forecast snapshot") || text.includes("Future Money Forecast") || text.includes("Smart Actions");
  }) || null;
}

function getAssistantMain() {
  const shell = getAssistantShell();
  return shell?.querySelector("main") || null;
}

function findForecastReadyBubble() {
  const shell = getAssistantShell();
  if (!shell) return null;

  return Array.from(shell.querySelectorAll("div")).find((node) => {
    const text = clean(node.textContent);
    return text.includes("Forecast snapshot ready") || text.includes("Forecast snapshot needs more records");
  }) || null;
}

function setGlobalSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return;
  const state = getState();
  state.snapshot = snapshot;
  window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__ = snapshot;
  window.dispatchEvent(new CustomEvent(READY_EVENT, { detail: { snapshot } }));
}

async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

async function prepareSharedSnapshot() {
  const state = getState();
  if (state.snapshot || window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__) {
    state.snapshot = state.snapshot || window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__;
    return state.snapshot;
  }
  if (state.busy) return null;

  state.busy = true;
  try {
    const user = await getCurrentUser();
    const localUserId = clean(user?.id || user?.email || FALLBACK_USER_ID) || FALLBACK_USER_ID;
    const effectiveContext = await getClaraEffectiveFinanceContext(localUserId, { user, messages: [] });
    const forecastSnapshot = buildClaraForecastPhaseOneSnapshot(effectiveContext, {});
    setGlobalSnapshot(forecastSnapshot);
    return forecastSnapshot;
  } catch (error) {
    console.warn("[CLARA Forecast Report] Shared snapshot was not ready.", error);
    return null;
  } finally {
    state.busy = false;
  }
}

function buildActionButton() {
  const wrap = document.createElement("div");
  wrap.className = "clara-forecast-report-inline-action";
  wrap.dataset.claraForecastReportInlineAction = "true";
  wrap.innerHTML = `<button type="button" ${ACTION_SELECTOR.replace("[", "").replace("]", "")} aria-label="View Forecast Report">View Forecast Report</button>`;
  return wrap;
}

function ensureInlineAction() {
  const bubble = findForecastReadyBubble();
  if (!bubble || bubble.querySelector("[data-clara-forecast-report-inline-action='true']") || document.querySelector(ACTION_SELECTOR)) return;
  bubble.appendChild(buildActionButton());
}

function missingDataHtml(items = []) {
  if (!items.length) return `<p class="clara-forecast-report-missing-empty">No major missing data detected.</p>`;
  return `<ul class="clara-forecast-report-missing-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function statRows(stats = []) {
  return stats.map((item) => `
    <div class="clara-forecast-report-stat-row">
      <span>${escapeHtml(item.label)}</span>
      <strong>${escapeHtml(item.value)}</strong>
    </div>
  `).join("");
}

function renderReport(snapshot) {
  const report = buildClaraForecastReport(snapshot);
  closeReport();

  const overlay = document.createElement("section");
  overlay.className = "clara-forecast-report-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.dataset.claraForecastReportOverlay = "true";
  overlay.innerHTML = `
    <div class="clara-forecast-report-bg" aria-hidden="true"></div>
    <div class="clara-forecast-report-shell">
      <button type="button" class="clara-forecast-report-close" data-clara-forecast-report-close="true" aria-label="Close Forecast Report">×</button>
      <header class="clara-forecast-report-header">
        <p>${escapeHtml(report.title)}</p>
        <h2>${escapeHtml(report.subtitle)}</h2>
      </header>
      <div class="clara-forecast-report-track" aria-label="Future Money Forecast report slides">
        ${report.cards.map((card) => `
          <article class="clara-forecast-report-card ${card.final ? `is-final is-${card.tone || "ready"}` : ""}">
            <p class="clara-forecast-report-eyebrow">${escapeHtml(card.eyebrow)}</p>
            <h3>${escapeHtml(card.title)}</h3>
            <div class="clara-forecast-report-stats">${statRows(card.stats)}</div>
            <p class="clara-forecast-report-body">${escapeHtml(card.body)}</p>
            ${card.final ? `<div class="clara-forecast-report-missing"><p>Missing data list</p>${missingDataHtml(card.missingData)}</div>` : ""}
          </article>
        `).join("")}
      </div>
      <div class="clara-forecast-report-dots" aria-hidden="true">
        ${report.cards.map((_, index) => `<span class="${index === 0 ? "is-active" : ""}"></span>`).join("")}
      </div>
      <footer class="clara-forecast-report-footer">
        <button type="button" data-clara-forecast-report-close="true">Close</button>
        <button type="button" data-clara-forecast-report-back="true">Back to Forecast</button>
      </footer>
    </div>`;

  document.body.appendChild(overlay);
}

function closeReport() {
  document.querySelectorAll("[data-clara-forecast-report-overlay='true']").forEach((node) => node.remove());
}

async function openForecastReport() {
  const snapshot = window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__ || getState().snapshot || await prepareSharedSnapshot();
  if (!snapshot) return;
  renderReport(snapshot);
}

function installReadyListener() {
  window.addEventListener(READY_EVENT, (event) => {
    const snapshot = event.detail?.snapshot;
    if (snapshot) getState().snapshot = snapshot;
    window.setTimeout(ensureInlineAction, 60);
  });
}

function installActionClickListener() {
  document.addEventListener("click", (event) => {
    const action = event.target?.closest?.(ACTION_SELECTOR);
    if (action) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      window.dispatchEvent(new Event(OPEN_EVENT));
      return;
    }

    if (event.target?.closest?.("[data-clara-forecast-report-close]")) {
      event.preventDefault();
      closeReport();
      return;
    }

    if (event.target?.closest?.("[data-clara-forecast-report-back]")) {
      event.preventDefault();
      closeReport();
      getAssistantMain()?.scrollTo?.({ top: 0, behavior: "smooth" });
    }
  }, true);
}

function installOpenListener() {
  window.addEventListener(OPEN_EVENT, openForecastReport);
}

function installObserver() {
  const observer = new MutationObserver(() => {
    if (findForecastReadyBubble()) {
      prepareSharedSnapshot().then(() => ensureInlineAction());
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.setTimeout(() => {
    if (findForecastReadyBubble()) prepareSharedSnapshot().then(() => ensureInlineAction());
  }, 900);
}

function installClaraForecastReportRouter() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FORECAST_REPORT_ROUTER_INSTALLED__) return;
  window.__CLARA_FORECAST_REPORT_ROUTER_INSTALLED__ = true;
  installReadyListener();
  installOpenListener();
  installActionClickListener();
  installObserver();
}

installClaraForecastReportRouter();
