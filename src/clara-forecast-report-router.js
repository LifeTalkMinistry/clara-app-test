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
const REPORT_TONES = new Set(["neutral", "reality", "hope", "possibility"]);

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

function reportTone(value = "neutral") {
  const tone = clean(value).toLowerCase();
  return REPORT_TONES.has(tone) ? tone : "neutral";
}

function reportCardClass(card = {}) {
  const classes = ["clara-forecast-report-card"];
  if (card.final) classes.push("is-final");
  classes.push(`is-${reportTone(card.tone)}`);
  return classes.join(" ");
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
  return {
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

function cardHero(card = {}) {
  if (!card.hero) return "";
  return `<div class="clara-forecast-report-hero">${escapeHtml(card.hero)}</div>`;
}

function finalCardExtras(card = {}, report = {}) {
  if (!card.final) return "";
  const readinessBlock = report.type === "readiness"
    ? `<div class="clara-forecast-report-missing"><p>Missing data list</p>${missingDataHtml(card.missingData)}</div>`
    : "";
  const cta = card.ctaLabel
    ? `<button type="button" class="clara-forecast-report-final-cta" data-clara-forecast-report-close="true">${escapeHtml(card.ctaLabel)}</button>`
    : "";
  return `${readinessBlock}${cta}`;
}

function horizonGrid(snapshot = {}) {
  const summary = getClaraForecastHorizonSummary(snapshot);
  const allowed = new Set(summary.eligibleMonths || []);
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const isAllowed = allowed.has(month);
    return `<button type="button" data-clara-forecast-horizon="${month}" class="${isAllowed ? "is-available" : "is-locked"}" ${isAllowed ? "" : "aria-disabled=\"true\""}>
      <strong>${month}M</strong>
      <span>${isAllowed ? "Available" : "Need history"}</span>
    </button>`;
  }).join("");
}

function renderHorizonPicker(snapshot) {
  closeReport();
  const summary = getClaraForecastHorizonSummary(snapshot);
  const historyLabel = `${summary.availableHistoryMonths} month${summary.availableHistoryMonths === 1 ? "" : "s"}`;
  const overlay = document.createElement("section");
  overlay.className = "clara-forecast-report-overlay clara-forecast-horizon-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.dataset.claraForecastReportOverlay = "true";
  overlay.innerHTML = `
    <div class="clara-forecast-report-bg" aria-hidden="true"></div>
    <div class="clara-forecast-report-shell clara-forecast-horizon-shell">
      <header class="clara-forecast-report-header clara-forecast-horizon-header">
        <p>FUTURE MONEY FORECAST</p>
        <h2>Choose timeframe</h2>
      </header>
      <section class="clara-forecast-horizon-card" aria-label="Choose forecast timeframe">
        <p class="clara-forecast-horizon-helper">Select how many months CLARA should project using your available history.</p>
        <div class="clara-forecast-horizon-grid">${horizonGrid(snapshot)}</div>
        <p class="clara-forecast-horizon-footer-note">Available history: ${historyLabel} · Forecast cannot exceed history</p>
        ${!summary.hasAnyEligibleHorizon ? `<div class="clara-forecast-horizon-warning">CLARA needs at least 1 month of financial activity before forecasting.</div>` : ""}
      </section>
    </div>`;
  document.body.appendChild(overlay);
}

function syncForecastReportProgress(overlay) {
  const track = overlay?.querySelector?.(".clara-forecast-report-track");
  const cards = Array.from(track?.querySelectorAll?.(".clara-forecast-report-card") || []);
  const dots = Array.from(overlay?.querySelectorAll?.(".clara-forecast-report-dots span") || []);
  if (!track || !cards.length || !dots.length) return;

  let ticking = false;
  const updateActiveDot = () => {
    ticking = false;
    const currentIndex = cards.reduce((nearestIndex, card, index) => {
      const currentDistance = Math.abs(card.offsetLeft - track.scrollLeft);
      const nearestDistance = Math.abs(cards[nearestIndex].offsetLeft - track.scrollLeft);
      return currentDistance < nearestDistance ? index : nearestIndex;
    }, 0);

    dots.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
    });
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateActiveDot);
  };

  track.addEventListener("scroll", requestUpdate, { passive: true });
  window.requestAnimationFrame(updateActiveDot);
  window.setTimeout(updateActiveDot, 120);
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
      <header class="clara-forecast-report-header clara-forecast-active-header">
        <p>${escapeHtml(report.title)}</p>
        <h2>${escapeHtml(report.subtitle)}</h2>
      </header>
      <div class="clara-forecast-report-track" aria-label="Future Money Forecast report slides">
        ${report.cards.map((card) => `
          <article class="${reportCardClass(card)}">
            <p class="clara-forecast-report-eyebrow">${escapeHtml(card.eyebrow)}</p>
            <h3>${escapeHtml(card.title)}</h3>
            ${cardHero(card)}
            <div class="clara-forecast-report-stats">${statRows(card.stats)}</div>
            <p class="clara-forecast-report-body">${escapeHtml(card.body)}</p>
            ${finalCardExtras(card, report)}
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
  syncForecastReportProgress(overlay);
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
  renderReport(snapshot, eligibility.horizon);
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
