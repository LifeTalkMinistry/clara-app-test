import {
  buildClaraAnalyticsReport,
  canBuildClaraAnalytics,
  getClaraAnalyticsWindowSummary,
} from "./clara-analytics-report-builder";

const STATE_KEY = "__CLARA_ANALYTICS_REPORT_ROUTER_STATE__";
const OPEN_EVENT = "clara:open-analytics-report";
const READY_EVENT = "clara:analytics-phase-one-ready";
const ACTION_SELECTOR = "[data-clara-open-analytics-report='true']";
const WINDOW_SELECTOR = "[data-clara-analytics-window]";
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

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
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
  return Array.isArray(card.stats) ? card.stats : [];
}

function getState() {
  window[STATE_KEY] = window[STATE_KEY] || { snapshot: null, selectedAnalysisMonths: 1 };
  return window[STATE_KEY];
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return text.includes("Analytic") || text.includes("Current Money Analytic") || text.includes("Smart Actions");
  }) || null;
}

function getAssistantMain() {
  const shell = getAssistantShell();
  return shell?.querySelector("main") || null;
}

function findAnalyticsReadyBubble() {
  const shell = getAssistantShell();
  if (!shell) return null;

  return Array.from(shell.querySelectorAll("div")).find((node) => {
    const text = clean(node.textContent);
    return text.includes("Analytic snapshot ready") || text.includes("Analytic snapshot needs more records");
  }) || null;
}

function buildActionButton() {
  const wrap = document.createElement("div");
  wrap.className = "clara-forecast-report-inline-action";
  wrap.dataset.claraAnalyticsReportInlineAction = "true";
  wrap.innerHTML = `<button type="button" data-clara-open-analytics-report="true" aria-label="View Analytic Report">View Analytic Report</button>`;
  return wrap;
}

function ensureInlineAction() {
  const bubble = findAnalyticsReadyBubble();
  if (!bubble || bubble.querySelector("[data-clara-analytics-report-inline-action='true']") || document.querySelector(ACTION_SELECTOR)) return;
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
    ? `<button type="button" class="clara-forecast-report-final-cta" data-clara-analytics-report-close="true">${escapeHtml(card.ctaLabel)}</button>`
    : "";
  return `${readinessBlock}${cta}`;
}

function windowGrid(snapshot = {}) {
  const summary = getClaraAnalyticsWindowSummary(snapshot);
  const allowed = new Set(summary.eligibleMonths || []);
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const isAllowed = allowed.has(month);
    return `<button type="button" data-clara-analytics-window="${month}" class="${isAllowed ? "is-available" : "is-locked"}" ${isAllowed ? "" : "aria-disabled=\"true\""}>
      <strong>${month}M</strong>
      <span>${isAllowed ? "Available" : "Need history"}</span>
    </button>`;
  }).join("");
}

function renderWindowPicker(snapshot) {
  closeReport();
  const summary = getClaraAnalyticsWindowSummary(snapshot);
  const historyLabel = `${summary.availableHistoryMonths} active month${summary.availableHistoryMonths === 1 ? "" : "s"}`;
  const overlay = document.createElement("section");
  overlay.className = "clara-forecast-report-overlay clara-forecast-horizon-overlay clara-analytics-window-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.dataset.claraAnalyticsReportOverlay = "true";
  overlay.innerHTML = `
    <div class="clara-forecast-report-bg" aria-hidden="true"></div>
    <div class="clara-forecast-report-shell clara-forecast-horizon-shell">
      <header class="clara-forecast-report-header clara-forecast-horizon-header">
        <p>CURRENT MONEY ANALYTIC</p>
        <h2>Choose analysis window</h2>
      </header>
      <section class="clara-forecast-horizon-card" aria-label="Choose analysis window">
        <p class="clara-forecast-horizon-helper">Select how many recent months CLARA should analyze using your active usable records.</p>
        <div class="clara-forecast-horizon-grid">${windowGrid(snapshot)}</div>
        <p class="clara-forecast-horizon-footer-note">Available history: ${historyLabel} · Analysis cannot exceed active history</p>
        ${!summary.hasAnyEligibleWindow ? `<div class="clara-forecast-horizon-warning">CLARA needs at least 1 active month of financial activity before analysis.</div>` : ""}
      </section>
    </div>`;
  document.body.appendChild(overlay);
}

function traceTypeForLabel(label = "") {
  const normalized = clean(label).toLowerCase();
  if (normalized.includes("actual") || normalized.includes("current")) return "ACTUAL";
  if (normalized.includes("diagnosis") || normalized.includes("pressure") || normalized.includes("alignment")) return "CALCULATED";
  if (normalized.includes("action") || normalized.includes("signal")) return "INFERRED";
  if (normalized.includes("not enough")) return "FALLBACK";
  return "ACTUAL";
}

function synchronizeAuditSlideTrace(report = {}) {
  if (!report.audit || !Array.isArray(report.cards)) return report;
  const slideTrace = {};
  report.cards.forEach((card, index) => {
    const key = `slide${index + 1}`;
    const rows = [];
    if (card.hero) {
      rows.push({ label: "Hero", value: card.hero, type: traceTypeForLabel(card.hero), formula: "Final analytics report object before render", source: key, riskLevel: card.tone || "neutral" });
    }
    toArray(card.stats).forEach((item) => {
      rows.push({ label: item.label, value: item.value, type: traceTypeForLabel(item.label), formula: "Final analytics report object before render", source: key, riskLevel: card.tone || "neutral" });
    });
    slideTrace[key] = rows;
  });
  return { ...report, audit: { ...report.audit, slideTrace: { ...(report.audit.slideTrace || {}), ...slideTrace } } };
}

function syncAnalyticsReportProgress(overlay) {
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

    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === currentIndex));
    const finalSlideActive = cards[currentIndex]?.classList.contains("is-final") || false;
    overlay.classList.toggle("is-final-slide-active", finalSlideActive);
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

function renderReport(snapshot, analysisMonths = 1) {
  const report = synchronizeAuditSlideTrace(buildClaraAnalyticsReport(snapshot, { analysisMonths }));
  window.__CLARA_LAST_ANALYTICS_AUDIT__ = report.audit || null;
  closeReport();

  const overlay = document.createElement("section");
  overlay.className = "clara-forecast-report-overlay clara-analytics-report-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.dataset.claraAnalyticsReportOverlay = "true";
  overlay.innerHTML = `
    <div class="clara-forecast-report-bg" aria-hidden="true"></div>
    <div class="clara-forecast-report-shell">
      <header class="clara-forecast-report-header clara-forecast-active-header">
        <p>${escapeHtml(report.title)}</p>
        <h2>${escapeHtml(report.subtitle)}</h2>
      </header>
      <div class="clara-forecast-report-track" aria-label="Current Money Analytic report slides">
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
    </div>`;

  document.body.appendChild(overlay);
  syncAnalyticsReportProgress(overlay);
}

function closeReport() {
  document.querySelectorAll("[data-clara-analytics-report-overlay='true']").forEach((node) => node.remove());
}

async function openAnalyticsReport() {
  const state = getState();
  const snapshot = window.__CLARA_LAST_ANALYTICS_PHASE_ONE_SNAPSHOT__ || state.snapshot || window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__;
  if (!snapshot) return;
  state.snapshot = snapshot;
  const summary = getClaraAnalyticsWindowSummary(snapshot);
  if (!summary.hasAnyEligibleWindow) {
    renderReport(snapshot, 1);
    return;
  }
  renderWindowPicker(snapshot);
}

function openSelectedWindow(months = 1) {
  const state = getState();
  const snapshot = window.__CLARA_LAST_ANALYTICS_PHASE_ONE_SNAPSHOT__ || state.snapshot || window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__;
  if (!snapshot) return;
  const analysisMonths = Number(months) || 1;
  state.selectedAnalysisMonths = analysisMonths;
  const eligibility = canBuildClaraAnalytics(snapshot, analysisMonths);
  renderReport(snapshot, eligibility.analysisMonths);
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

    const windowButton = event.target?.closest?.(WINDOW_SELECTOR);
    if (windowButton) {
      event.preventDefault();
      if (windowButton.getAttribute("aria-disabled") === "true") return;
      openSelectedWindow(Number(windowButton.getAttribute("data-clara-analytics-window")));
      return;
    }

    if (event.target?.closest?.("[data-clara-analytics-report-close]")) {
      event.preventDefault();
      closeReport();
      return;
    }

    if (event.target?.closest?.("[data-clara-analytics-report-back]")) {
      event.preventDefault();
      closeReport();
      getAssistantMain()?.scrollTo?.({ top: 0, behavior: "smooth" });
    }
  }, true);
}

function installOpenListener() {
  window.addEventListener(OPEN_EVENT, openAnalyticsReport);
}

function installObserver() {
  const observer = new MutationObserver(() => {
    if (findAnalyticsReadyBubble()) ensureInlineAction();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  window.setTimeout(() => {
    if (findAnalyticsReadyBubble()) ensureInlineAction();
  }, 900);
}

function installClaraAnalyticsReportRouter() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_ANALYTICS_REPORT_ROUTER_INSTALLED__) return;
  window.__CLARA_ANALYTICS_REPORT_ROUTER_INSTALLED__ = true;
  installReadyListener();
  installOpenListener();
  installActionClickListener();
  installObserver();
}

installClaraAnalyticsReportRouter();
