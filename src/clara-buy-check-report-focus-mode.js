function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function addFinalStaticActions() {
  const report = document.querySelector("[data-clara-buy-check-report]");
  if (!report) return;

  const finalCard = Array.from(report.querySelectorAll("article")).find((article) =>
    clean(article.textContent).includes("08 / FINAL SUMMARY")
  );

  if (!finalCard || finalCard.querySelector("[data-clara-buy-final-static-actions]")) return;

  const actions = document.createElement("div");
  actions.dataset.claraBuyFinalStaticActions = "true";
  actions.className = "clara-buy-check-final-static-actions";
  actions.innerHTML = `
    <button type="button" class="clara-buy-check-final-choice clara-buy-check-final-choice-buy">Will buy</button>
    <button type="button" class="clara-buy-check-final-choice clara-buy-check-final-choice-wait">Not buy</button>
  `;

  finalCard.appendChild(actions);
}

function installBuyCheckReportFocusMode() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_REPORT_FOCUS_MODE_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_REPORT_FOCUS_MODE_INSTALLED__ = true;

  const observer = new MutationObserver(() => addFinalStaticActions());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  addFinalStaticActions();
}

installBuyCheckReportFocusMode();
