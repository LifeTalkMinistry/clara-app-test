const ANALYTICS_STAT_ROW_SELECTOR = ".clara-analytics-report-overlay .clara-forecast-report-stat-row";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function updateLongStatRow(row) {
  if (!row) return;

  const label = clean(row.querySelector("span")?.textContent);
  const value = clean(row.querySelector("strong")?.textContent);
  const isLong = label.length > 22 || value.length > 34;

  row.classList.toggle("is-long", isLong);
}

function updateLongStatRows(root = document) {
  root.querySelectorAll?.(ANALYTICS_STAT_ROW_SELECTOR).forEach(updateLongStatRow);
}

function installClaraAnalyticsLongStatRowGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_ANALYTICS_LONG_STAT_ROW_GUARD_INSTALLED__) return;
  window.__CLARA_ANALYTICS_LONG_STAT_ROW_GUARD_INSTALLED__ = true;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes?.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches?.(ANALYTICS_STAT_ROW_SELECTOR)) updateLongStatRow(node);
        updateLongStatRows(node);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.requestAnimationFrame(() => updateLongStatRows(document));
}

installClaraAnalyticsLongStatRowGuard();
