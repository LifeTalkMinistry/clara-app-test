import { supabase } from "@/lib/supabaseClient";
import { getClaraEffectiveFinanceContext } from "@/lib/clara-effective-finance-context";
import { buildClaraForecastPhaseOneSnapshot } from "@/lib/clara-forecast-phase-one-snapshot";
import {
  buildClaraForecastReport,
  canBuildClaraForecast,
  getClaraForecastHorizonSummary,
} from "./clara-forecast-report-builder";

const STATE_KEY = "__CLARA_FORECAST_REPORT_ROUTER_STATE__";
const FALLBACK_USER_ID = "local-user";
const OPEN_EVENT = "clara:open-forecast-report";
const READY_EVENT = "clara:forecast-phase-one-ready";
const ACTION_SELECTOR = "[data-clara-open-forecast-report='true']";
const HORIZON_SELECTOR = "[data-clara-forecast-horizon]";

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
  window[STATE_KEY] = window[STATE_KEY] || { snapshot: null, effectiveContext: null, busy: false, selectedHorizonMonths: 1 };
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

function enrichSnapshotWithRecords(snapshot = {}, effectiveContext = {}) {
  if (!snapshot || typeof snapshot !== "object") return snapshot;
  const enriched = {
    ...snapshot,
    forecastRecords: {
      ...(snapshot.forecastRecords || {}),
      wallets: effectiveContext.wallets || snapshot.forecastRecords?.wallets || [],
      incomes: effectiveContext.incomes || snapshot.forecastRecords?.incomes || [],
      incomeSources: effectiveContext.incomeSources || snapshot.forecastRecords?.incomeSources || [],
      expenses: effectiveContext.expenses || snapshot.forecastRecords?.expenses || [],
      walletTransactions: effectiveContext.walletTransactions || snapshot.forecastRecords?.walletTransactions || [],
      transfers: effectiveContext.transfers || snapshot.forecastRecords?.transfers || [],
      budgets: effectiveContext.budgets || snapshot.forecastRecords?.budgets || [],
      savingsGoals: effectiveContext.savingsGoals || snapshot.forecastRecords?.savingsGoals || [],
      debtObligations: effectiveContext.debtObligations || snapshot.forecastRecords?.debtObligations || [],
      emergencyFund: effectiveContext.emergencyFund || snapshot.forecastRecords?.emergencyFund || null,
    },
  };
  return enriched;
}

function setGlobalSnapshot(snapshot, effectiveContext = null) {
  if (!snapshot || typeof snapshot !== "object") return;
  const state = getState();
  const enriched = enrichSnapshotWithRecords(snapshot, effectiveContext || state.effectiveContext || {});
  state.snapshot = enriched;
  if (effectiveContext) state.effectiveContext = effectiveContext;
  window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__ = enriched;
  window.dispatchEvent(new CustomEvent(READY_EVENT, { detail: { snapshot: enriched } }));
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
    state.snapshot = enrichSnapshotWithRecords(state.snapshot || window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__, state.effectiveContext || {});
    window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__ = state.snapshot;
    return state.snapshot;
  }
  if (state.busy) return null;

  state.busy = true;
  try {
    const user = await getCurrentUser();
    const localUserId = clean(user?.id || user?.email || FALLBACK_USER_ID) || FALLBACK_USER_ID;
    const effectiveContext = await getClaraEffectiveFinanceContext(localUserId, { user, messages: [] });
    const forecastSnapshot = buildClaraForecastPhaseOneSnapshot(effectiveContext, {});
    setGlobalSnapshot(forecastSnapshot, effectiveContext);
    return getState().snapshot;
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
  wrap.innerHTML = `<button type="button" data-clara-open-forecast-report="true" aria-label="View Forecast Report">View Forecast Report</button>`;
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

function horizonGrid(snapshot = {}) {
  const summary = getClaraForecastHorizonSummary(snapshot);
  const allowed = new Set(summary.eligibleMonths || []);
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const isAllowed = allowed.has(month);
    const label = `${month}M`;
    return `<button type="button" data-clara-forecast-horizon="${month}" class="${isAllowed ? "is-available" : "is-locked"}" ${isAllowed ? "" : "aria-disabled=\"true\""}>
      <strong>${label}</strong>
      <span>${isAllowed ? "Available" : "Need history"}</span>
    </button>`;
  }).join("");
}

function renderHorizonPicker(snapshot) {
  closeReport();
  const summary = getClaraForecastHorizonSummary(snapshot);
  const overlay = document.createElement("section");
  overlay.className = "clara-forecast-report-overlay clara-forecast-horizon-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.dataset.claraForecastReportOverlay = "true";
  overlay.innerHTML = `
    <div class="clara-forecast-report-bg" aria-hidden="true"></div>
    <div class="clara-forecast-report-shell clara-forecast-horizon-shell">
      <button type="button" class="clara-forecast-report-close" data-clara-forecast-report-close="true" aria-label="Close Forecast Report">×</button>
      <header class="clara-forecast-report-header clara-forecast-horizon-header">
        <p>FUTURE MONEY FORECAST</p>
        <h2>Choose one timeframe</h2>
      </header>
      <section class="clara-forecast-horizon-card">
        <p class="clara-forecast-report-eyebrow">FORECAST HORIZON</p>
        <h3>How far ahead should CLARA look?</h3>
        <p class="clara-forecast-report-body">CLARA will use the same number of past months as the basis for the forecast. Example: 3 months selected uses the last 3 months of behavior.</p>
        <div class="clara-forecast-horizon-summary">
          <div><span>Usable history</span><strong>${summary.availableHistoryMonths} month${summary.availableHistoryMonths === 1 ? "" : "s"}</strong></div>
          <div><span>Forecast rule</span><strong>Cannot exceed history</strong></div>
        </div>
        <div class="clara-forecast-horizon-grid">${horizonGrid(snapshot)}</div>
        ${!summary.hasAnyEligibleHorizon ? `<div class="clara-forecast-horizon-warning">CLARA needs at least 1 month of financial activity before forecasting.</div>` : ""}
      </section>
    </div>`;
  document.body.appendChild(overlay);
}

function renderReport(snapshot, horizonMonths = 1) {
  const report = buildClaraForecastReport(snapshot, { horizonMonths });
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
            ${card.final ? `<div class="clara-forecast-report-missing"><p>${report.type === "readiness" ? "Missing data list" : "Final note"}</p>${missingDataHtml(card.missingData)}</div>` : ""}
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
  renderHorizonPicker(snapshot);
}

function openSelectedHorizon(months = 1) {
  const state = getState();
  const snapshot = window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__ || state.snapshot;
  if (!snapshot) return;
  const horizon = Number(months) || 1;
  state.selectedHorizonMonths = horizon;
  const eligibility = canBuildClaraForecast(snapshot, horizon);
  renderReport(snapshot, { valueOf: () => eligibility.horizon }.valueOf());
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

    const horizonButton = event.target?.closest?.(HORIZON_SELECTOR);
    if (horizonButton) {
      event.preventDefault();
      const month = Number(horizonButton.getAttribute("data-clara-forecast-horizon"));
      openSelectedHorizon(month);
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
