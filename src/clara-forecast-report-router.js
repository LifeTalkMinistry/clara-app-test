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
const SETUP_NOT_ENOUGH_DATA = "Not enough data to generate result";

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

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthLabel(months = 1) {
  const safeMonths = Math.min(Math.max(Math.round(toNumber(months)) || 1, 1), 12);
  return `${safeMonths} month${safeMonths === 1 ? "" : "s"}`;
}

function recordLabel(value = 0) {
  const total = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${total} record${total === 1 ? "" : "s"}`;
}

function getRecordDate(record = {}) {
  const raw = record.date || record.createdAt || record.created_at || record.updatedAt || record.updated_at || record.lastActivityAt || record.last_activity_at || record.targetDate || record.target_date || "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isRecentEnough(date, horizonMonths = 1) {
  if (!date) return false;
  const boundary = new Date();
  boundary.setMonth(boundary.getMonth() - (Math.min(Math.max(Math.round(toNumber(horizonMonths)) || 1, 1), 12)));
  return date >= boundary;
}

function recordsInWindow(records = [], horizonMonths = 1) {
  return toArray(records).filter((record) => isRecentEnough(getRecordDate(record), horizonMonths));
}

function firstText(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    if (clean(value)) return clean(value);
  }
  return "";
}

function isIncomeTransaction(transaction = {}) {
  const type = firstText(transaction, ["type", "transaction_type", "kind"]).toLowerCase();
  return ["income", "add", "cash_in", "deposit", "opening_balance", "credit"].includes(type);
}

function isExpenseTransaction(transaction = {}) {
  const type = firstText(transaction, ["type", "transaction_type", "kind"]).toLowerCase();
  return ["expense", "withdrawal", "debit", "spend", "purchase", "cash_out"].includes(type);
}

function setupConfidenceLabel(value = "") {
  const normalized = clean(value || "weak").toLowerCase();
  if (normalized === "strong") return "Strong";
  if (normalized === "medium" || normalized === "partial" || normalized === "moderate") return "Moderate";
  return "Limited";
}

function setupRecordCounts(snapshot = {}, horizonMonths = 1) {
  const records = snapshot.forecastRecords || {};
  const incomeWindow = recordsInWindow(records.incomes, horizonMonths);
  const transactionIncomeWindow = recordsInWindow(toArray(records.walletTransactions).filter(isIncomeTransaction), horizonMonths);
  const expenseWindow = recordsInWindow(records.expenses, horizonMonths);
  const transactionExpenseWindow = recordsInWindow(toArray(records.walletTransactions).filter(isExpenseTransaction), horizonMonths);

  return {
    incomeRecords: incomeWindow.length ? incomeWindow.length : transactionIncomeWindow.length,
    expenseRecords: expenseWindow.length ? expenseWindow.length : transactionExpenseWindow.length,
    transactionRecords: transactionIncomeWindow.length + transactionExpenseWindow.length,
  };
}

function hasSetupMoneyContext(snapshot = {}) {
  const records = snapshot.forecastRecords || {};
  return toArray(records.wallets).length > 0
    || toArray(records.incomes).length > 0
    || toArray(records.expenses).length > 0
    || toArray(records.walletTransactions).length > 0;
}

function finalizeForecastSetupSlide(report = {}, snapshot = {}, horizonMonths = 1) {
  if (!Array.isArray(report.cards) || !report.cards.length) return report;

  const summary = getClaraForecastHorizonSummary(snapshot);
  const horizon = Math.min(Math.max(Math.round(toNumber(horizonMonths)) || 1, 1), 12);
  const hasUsableSetupData = hasSetupMoneyContext(snapshot) && summary.availableHistoryMonths >= horizon;
  const horizonText = monthLabel(horizon);
  const availableHistoryText = `${summary.availableHistoryMonths} month${summary.availableHistoryMonths === 1 ? "" : "s"}`;
  const counts = setupRecordCounts(snapshot, horizon);
  const setupValue = (value) => (hasUsableSetupData ? value : SETUP_NOT_ENOUGH_DATA);

  return {
    ...report,
    cards: report.cards.map((card, index) => {
      if (index !== 0) return card;
      return {
        ...card,
        eyebrow: "01 / FORECAST SETUP",
        title: "Forecast Setup",
        tone: "neutral",
        hero: setupValue(horizonText),
        body: hasUsableSetupData
          ? "CLARA used your available local money records to build this forecast. More complete history improves forecast confidence."
          : "CLARA needs more saved local money records to build a stronger forecast.",
        stats: [
          { label: "Selected Forecast Horizon", value: setupValue(horizonText) },
          { label: "Available History", value: setupValue(availableHistoryText) },
          { label: "Forecast Basis", value: setupValue(`Last ${horizonText}`) },
          { label: "Forecast Confidence", value: hasUsableSetupData ? setupConfidenceLabel(snapshot.dataCompleteness) : "Limited" },
          { label: "Income Records", value: setupValue(recordLabel(counts.incomeRecords)) },
          { label: "Expense Records", value: setupValue(recordLabel(counts.expenseRecords)) },
          { label: "Transaction Records", value: setupValue(recordLabel(counts.transactionRecords)) },
        ],
      };
    }),
  };
}

function reportSubtitle(report = {}) {
  return clean(report.subtitle).replace(/\s*behavioral forecast$/i, " outlook");
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

function displayStats(card = {}) {
  const stats = Array.isArray(card.stats) ? card.stats : [];
  if (card.final && reportTone(card.tone) === "possibility") {
    return stats.filter((item) => clean(item?.label).toLowerCase() !== "better-future lift");
  }
  return stats;
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
  const report = finalizeForecastSetupSlide(buildClaraForecastReport(snapshot, { horizonMonths }), snapshot, horizonMonths);
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
        <h2>${escapeHtml(reportSubtitle(report))}</h2>
      </header>
      <div class="clara-forecast-report-track" aria-label="Future Money Forecast report slides">
        ${report.cards.map((card) => `
          <article class="${reportCardClass(card)}">
            <p class="clara-forecast-report-eyebrow">${escapeHtml(card.eyebrow)}</p>
            <h3>${escapeHtml(card.title)}</h3>
            ${cardHero(card)}
            <div class="clara-forecast-report-stats">${statRows(displayStats(card))}</div>
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
