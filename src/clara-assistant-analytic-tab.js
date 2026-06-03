const ANALYTIC_LABEL = "Analytic";
const SMART_ACTIONS_LABEL = "Smart Actions";
const FORECAST_LABEL = "Forecast";
const CORE_FEATURES_LABEL = "Core Features";
const ANALYTIC_ACTION_MATCHERS = ["Spending Checkup", "Checkup"];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getAssistantShell() {
  return Array.from(document.querySelectorAll(".fixed")).find((shell) => {
    const text = clean(shell.textContent);
    return (
      (text.includes(FORECAST_LABEL) || text.includes(CORE_FEATURES_LABEL)) &&
      (text.includes(SMART_ACTIONS_LABEL) || text.includes(ANALYTIC_LABEL))
    );
  });
}

function getAssistantButtons() {
  const shell = getAssistantShell();
  if (!shell) return [];
  return Array.from(shell.querySelectorAll("button"));
}

function isSmartActionsTabButton(button) {
  if (!button) return false;

  const label = clean(button.textContent);
  if (![SMART_ACTIONS_LABEL, ANALYTIC_LABEL].includes(label)) return false;

  const shell = getAssistantShell();
  if (!shell || !shell.contains(button)) return false;

  const rowText = clean(button.parentElement?.textContent || "");
  return (
    (rowText.includes(FORECAST_LABEL) || rowText.includes(CORE_FEATURES_LABEL)) &&
    (rowText.includes(SMART_ACTIONS_LABEL) || rowText.includes(ANALYTIC_LABEL))
  );
}

function findAnalyticActionButton() {
  return getAssistantButtons().find((button) => {
    const text = clean(button.innerText || button.textContent);
    return ANALYTIC_ACTION_MATCHERS.some((matcher) => text.includes(matcher)) &&
      (text.includes("spending") || text.includes("leak") || text.includes("patterns"));
  }) || getAssistantButtons().find((button) => {
    const text = clean(button.innerText || button.textContent);
    return ANALYTIC_ACTION_MATCHERS.some((matcher) => text.includes(matcher));
  }) || null;
}

function relabelAnalyticTab() {
  getAssistantButtons().forEach((button) => {
    if (!isSmartActionsTabButton(button)) return;
    if (clean(button.textContent) === ANALYTIC_LABEL && button.dataset.claraAnalyticTab === "true") return;

    button.textContent = ANALYTIC_LABEL;
    button.dataset.claraAnalyticTab = "true";
    button.setAttribute("aria-label", "Open CLARA Analytic");
    button.setAttribute("title", "Analytic");
  });
}

function submitAnalyticFallback() {
  const shell = getAssistantShell();
  const input = shell?.querySelector("input, textarea");
  const form = input?.closest("form");
  const submitButton = form?.querySelector('button[type="submit"], button[aria-label*="Send"]');
  if (!input || !form) return;

  const nextValue = "Run my Spending Checkup. Analyze my biggest spending leaks, patterns, unplanned spending, and what I should fix first.";
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value");
  descriptor?.set?.call(input, nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));

  window.setTimeout(() => {
    if (typeof form.requestSubmit === "function") form.requestSubmit();
    else submitButton?.click?.();
  }, 30);
}

function openAnalyticMode() {
  const activeAnalyticTab = getAssistantButtons().find((button) =>
    button.dataset?.claraAnalyticTab === "true" || clean(button.textContent) === ANALYTIC_LABEL
  );

  if (activeAnalyticTab?.dataset?.claraProgrammaticOpenSmart !== "true") {
    activeAnalyticTab.dataset.claraProgrammaticOpenSmart = "true";
    activeAnalyticTab.click();
    window.setTimeout(() => {
      delete activeAnalyticTab.dataset.claraProgrammaticOpenSmart;
    }, 180);
  }

  window.setTimeout(() => {
    const analyticButton = findAnalyticActionButton();
    if (analyticButton) analyticButton.click();
    else submitAnalyticFallback();
  }, 90);
}

function installAnalyticClickCapture() {
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button) return;

    const isAnalyticTab = button.dataset?.claraAnalyticTab === "true" || clean(button.textContent) === ANALYTIC_LABEL;
    if (!isAnalyticTab || !getAssistantShell()?.contains(button)) return;

    if (button.dataset?.claraProgrammaticOpenSmart === "true") return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openAnalyticMode();
  }, true);
}

function installAnalyticObserver() {
  const observer = new MutationObserver(() => relabelAnalyticTab());
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  relabelAnalyticTab();
}

function installClaraAssistantAnalyticTab() {
  if (typeof window === "undefined" || window.__CLARA_ASSISTANT_ANALYTIC_TAB_INSTALLED__) return;
  window.__CLARA_ASSISTANT_ANALYTIC_TAB_INSTALLED__ = true;
  installAnalyticClickCapture();
  installAnalyticObserver();
}

installClaraAssistantAnalyticTab();
