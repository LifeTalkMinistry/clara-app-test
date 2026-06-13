const FEATURE_DOCK_SELECTOR = ".clara-feature-dock button";

function normalizeDockAnalyticLabel(root = document) {
  root.querySelectorAll?.(FEATURE_DOCK_SELECTOR).forEach((button) => {
    const label = button.dataset?.claraDockLabel;
    const role = button.dataset?.claraFeatureDockRole;
    const isAnalyticButton = label === "Insight" || button.dataset?.claraAnalyticTab === "true" || role === "insight";

    if (!isAnalyticButton) return;

    button.dataset.claraDockLabel = "Analytic";
    button.setAttribute("aria-label", "Open CLARA Analytic");
    button.setAttribute("title", "Analytic");
  });
}

function installClaraFeatureDockAnalyticLabel() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FEATURE_DOCK_ANALYTIC_LABEL_INSTALLED__) return;
  window.__CLARA_FEATURE_DOCK_ANALYTIC_LABEL_INSTALLED__ = true;

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes?.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches?.(FEATURE_DOCK_SELECTOR)) normalizeDockAnalyticLabel(node.parentElement || document);
        normalizeDockAnalyticLabel(node);
      });
    });

    window.requestAnimationFrame?.(() => normalizeDockAnalyticLabel(document));
  });

  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  normalizeDockAnalyticLabel(document);
  window.requestAnimationFrame?.(() => normalizeDockAnalyticLabel(document));
  window.setTimeout(() => normalizeDockAnalyticLabel(document), 120);
}

installClaraFeatureDockAnalyticLabel();

export {};
