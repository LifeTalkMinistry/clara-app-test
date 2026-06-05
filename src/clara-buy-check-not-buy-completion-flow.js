function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getFinalDecision() {
  return clean(
    Array.from(document.querySelectorAll("[data-clara-buy-check-report] article"))
      .find((article) => clean(article.textContent).includes("08 / FINAL SUMMARY"))
      ?.querySelector("h3")
      ?.textContent || ""
  );
}

function closeBuyCheckOverlay() {
  try {
    document.querySelector("[data-clara-buy-check-decision-panel]")?.remove();
    document.querySelector("[data-clara-buy-check-close-board]")?.click?.();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  } catch {
    // Keep dashboard return working even if the overlay close handler is unavailable.
  }
}

function navigateToDashboard() {
  try {
    if (window.location.hash !== "#/dashboard") {
      window.location.hash = "/dashboard";
    }
  } catch {
    // Ignore hash navigation failures.
  }
}

function showNotBuyReflectionToast() {
  document.querySelector("[data-clara-buy-check-not-buy-toast]")?.remove();

  const toast = document.createElement("div");
  toast.dataset.claraBuyCheckNotBuyToast = "true";
  toast.style.cssText = `
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 22px);
    z-index: 10000;
    width: min(calc(100vw - 32px), 360px);
    transform: translate(-50%, 14px);
    opacity: 0;
    border: 1px solid rgba(110, 231, 183, 0.22);
    border-radius: 22px;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(6, 12, 24, 0.96));
    color: rgba(255, 255, 255, 0.94);
    padding: 13px 15px;
    box-shadow: 0 18px 52px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255,255,255,0.08);
    backdrop-filter: blur(18px);
    transition: opacity 220ms ease, transform 220ms ease;
    pointer-events: none;
  `;

  toast.innerHTML = `
    <div style="font-size:13px;font-weight:950;line-height:1.25;color:rgba(167,243,208,.96);">Reflection saved</div>
    <div style="margin-top:4px;font-size:12px;font-weight:750;line-height:1.35;color:rgba(226,232,240,.74);">Your decision not to buy has been remembered by CLARA.</div>
  `;

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";
  });

  window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, 14px)";
    window.setTimeout(() => toast.remove(), 240);
  }, 2800);
}

function completeNotBuyReflectionFlow(payload = {}) {
  try {
    sessionStorage.setItem("clara_last_not_buy_reflection_toast", JSON.stringify({
      reflection: payload.reflection,
      purchase: payload.purchase,
      created_at: new Date().toISOString(),
    }));
  } catch {
    // Ignore session storage failures.
  }

  closeBuyCheckOverlay();
  navigateToDashboard();

  window.setTimeout(() => showNotBuyReflectionToast(payload), 360);
}

function saveNotBuyReflectionAndComplete(panel) {
  const input = panel.querySelector(".clara-buy-check-decision-input");
  const reflection = clean(input?.value || "");
  const status = panel.querySelector(".clara-buy-check-decision-status");

  if (!reflection) {
    if (status) status.textContent = "Please add a short reason first.";
    return;
  }

  const saveButton = panel.querySelector("[data-clara-buy-check-decision-save]");
  if (saveButton) saveButton.disabled = true;

  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__ || {};
  const payload = {
    source: "buy_check_not_buy",
    clara_recommendation: getFinalDecision(),
    user_action: "not_buy",
    reflection,
    purchase: context.purchaseSummary || null,
    created_at: new Date().toISOString(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem("clara_buy_check_not_buy_reflections") || "[]");
    existing.unshift(payload);
    localStorage.setItem("clara_buy_check_not_buy_reflections", JSON.stringify(existing.slice(0, 30)));
  } catch {
    // Ignore local reflection storage failures.
  }

  window.dispatchEvent(new CustomEvent("clara:buy-check-decision-memory", { detail: payload }));
  if (status) status.textContent = "Reflection saved.";

  window.setTimeout(() => {
    panel.remove();
    completeNotBuyReflectionFlow(payload);
  }, 250);
}

function installNotBuyCompletionFlow() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_BUY_CHECK_NOT_BUY_COMPLETION_FIX_INSTALLED__) return;
  window.__CLARA_BUY_CHECK_NOT_BUY_COMPLETION_FIX_INSTALLED__ = true;

  window.addEventListener("click", (event) => {
    const saveButton = event.target?.closest?.("[data-clara-buy-check-decision-save]");
    const panel = event.target?.closest?.("[data-clara-buy-check-decision-panel='not_buy']");

    if (!saveButton || !panel) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    saveNotBuyReflectionAndComplete(panel);
  }, true);
}

installNotBuyCompletionFlow();