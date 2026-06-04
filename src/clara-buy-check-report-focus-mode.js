function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCategory(value = "") {
  const text = clean(value).toLowerCase();
  if (/food|meal|coffee|snack|grocery/.test(text)) return "food";
  if (/transport|fare|gas|grab|jeep|bus|taxi/.test(text)) return "transport";
  if (/bill|utility|utilities|internet|rent/.test(text)) return "utilities";
  if (/health|medical|medicine|wellness|fitness/.test(text)) return "health";
  if (/school|study|education/.test(text)) return "education";
  if (/shoe|phone|shopping|clothes|bag|gadget|lazada|shopee/.test(text)) return "shopping";
  return "other";
}

function normalizeNeedType(reason = "", category = "") {
  const text = `${reason} ${category}`.toLowerCase();
  if (/health|medical|medicine|doctor|work|job|school|study|replacement|replace|broken|repair|lost/.test(text)) return "need";
  if (/savings|goal|invest/.test(text)) return "savings";
  return "want";
}

function chooseExpenseWallet(context = {}) {
  const price = toNumber(context.purchaseSummary?.price);
  const wallets = Array.isArray(context.financeContext?.spendableWallets)
    ? context.financeContext.spendableWallets
    : [];

  const candidates = wallets
    .map((wallet) => ({ ...wallet, balanceNumber: toNumber(wallet.balance) }))
    .filter((wallet) => wallet.id && wallet.balanceNumber >= price);

  const priority = (wallet = {}) => {
    const name = clean(wallet.name).toLowerCase();
    if (/daily|spending|cash|main/.test(name)) return 0;
    if (/payroll|salary/.test(name)) return 1;
    return 2;
  };

  return candidates.sort((a, b) => priority(a) - priority(b) || b.balanceNumber - a.balanceNumber)[0] || wallets[0] || null;
}

function isUnexpectedNecessary(reason = "") {
  return /health|medical|medicine|doctor|work|job|school|study|replacement|replace|broken|repair|lost|urgent|emergency/i.test(reason);
}

function buildExpensePrefillFromBuyCheck() {
  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__ || {};
  const purchase = context.purchaseSummary || {};
  const finance = context.financeContext || {};
  const price = toNumber(purchase.price);
  const wallet = chooseExpenseWallet(context);
  const budget = finance.matchingBudget;
  const remaining = toNumber(budget?.remaining);
  const category = normalizeCategory(purchase.inferredCategory || purchase.item);
  const reason = clean(purchase.reason);
  const isOverBudget = budget ? price > remaining : true;
  const planningStatus = isOverBudget ? "unplanned" : "planned";
  const unplannedReason = planningStatus === "unplanned"
    ? isUnexpectedNecessary(reason)
      ? `Unexpected necessary expense — ${reason || "Buy Check approved by user"}`
      : `Outside budget allocation — ${reason || "Buy Check approved by user"}`
    : "";

  return {
    source: "buy_check",
    actionType: "expense",
    amount: price ? String(price) : "",
    category,
    wallet_id: wallet?.id ? String(wallet.id) : "",
    notes: clean(purchase.item) || "Buy Check purchase",
    need_type: normalizeNeedType(reason, category),
    planning_status: planningStatus,
    unplanned_reason: unplannedReason,
    buy_check_decision: clean(document.querySelector("[data-clara-buy-check-report] article:has([data-clara-buy-final-static-actions]) h3")?.textContent || ""),
  };
}

function openPrefilledExpense() {
  const detail = buildExpensePrefillFromBuyCheck();
  try {
    sessionStorage.setItem("clara_buy_check_expense_prefill", JSON.stringify(detail));
  } catch {
    // ignore storage limits
  }

  window.dispatchEvent(new CustomEvent("clara:open-buy-check-expense", { detail }));
}

function showNotBuyQuestion() {
  if (document.querySelector("[data-clara-buy-check-not-buy-panel]")) return;

  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__ || {};
  const decision = clean(document.querySelector("[data-clara-buy-check-report] article:has([data-clara-buy-final-static-actions]) h3")?.textContent || "this recommendation");
  const item = clean(context.purchaseSummary?.item || "this purchase");

  const panel = document.createElement("div");
  panel.dataset.claraBuyCheckNotBuyPanel = "true";
  panel.className = "clara-buy-check-not-buy-panel";
  panel.innerHTML = `
    <div class="clara-buy-check-not-buy-card">
      <p class="clara-buy-check-not-buy-title">Help me understand your decision.</p>
      <p class="clara-buy-check-not-buy-copy">I suggested <strong>${decision}</strong> for <strong>${item}</strong>, but you chose not to buy. What made you decide that?</p>
      <textarea class="clara-buy-check-not-buy-input" rows="3" placeholder="Example: I changed my mind, I want to save first, or I realized it is not urgent."></textarea>
      <div class="clara-buy-check-not-buy-actions">
        <button type="button" data-clara-buy-check-not-buy-save="true">Save reflection</button>
        <button type="button" data-clara-buy-check-not-buy-close="true">Skip</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
}

function saveNotBuyReflection(panel) {
  const input = panel.querySelector(".clara-buy-check-not-buy-input");
  const reflection = clean(input?.value || "");
  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__ || {};
  const payload = {
    source: "buy_check_not_buy",
    reflection,
    purchase: context.purchaseSummary || null,
    created_at: new Date().toISOString(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem("clara_buy_check_not_buy_reflections") || "[]");
    existing.unshift(payload);
    localStorage.setItem("clara_buy_check_not_buy_reflections", JSON.stringify(existing.slice(0, 30)));
  } catch {
    // ignore local reflection storage failures
  }

  panel.remove();
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
    <button type="button" class="clara-buy-check-final-choice clara-buy-check-final-choice-buy" data-clara-buy-check-will-buy="true">Will buy</button>
    <button type="button" class="clara-buy-check-final-choice clara-buy-check-final-choice-wait" data-clara-buy-check-not-buy="true">Not buy</button>
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

  document.addEventListener("click", (event) => {
    const willBuyButton = event.target?.closest?.("[data-clara-buy-check-will-buy]");
    if (willBuyButton) {
      event.preventDefault();
      event.stopPropagation();
      openPrefilledExpense();
      return;
    }

    const notBuyButton = event.target?.closest?.("[data-clara-buy-check-not-buy]");
    if (notBuyButton) {
      event.preventDefault();
      event.stopPropagation();
      showNotBuyQuestion();
      return;
    }

    const panel = event.target?.closest?.("[data-clara-buy-check-not-buy-panel]");
    if (event.target?.closest?.("[data-clara-buy-check-not-buy-close]")) {
      panel?.remove();
      return;
    }
    if (event.target?.closest?.("[data-clara-buy-check-not-buy-save]")) {
      if (panel) saveNotBuyReflection(panel);
    }
  }, true);
}

installBuyCheckReportFocusMode();
