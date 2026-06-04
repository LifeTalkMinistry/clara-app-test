import { supabase } from "@/lib/supabaseClient";

const EXPENSES_TABLE = "expenses";
const WALLETS_TABLE = "wallets";
const TXN_TABLE = "wallet_transactions";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  const amount = toNumber(value);
  return `₱${amount.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getPHDateString(value = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(value);
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

function normalizeDisplayItem(value = "") {
  const raw = clean(value)
    .replace(/^i\s*(?:want|wanna|would like|like|need|plan|am planning|was thinking)\s*(?:to)?\s*buy\s+/i, "")
    .replace(/^buy\s+/i, "")
    .replace(/\bphonee+\b/gi, "phone")
    .replace(/\bseconf\b/gi, "second")
    .trim();

  const lower = raw.toLowerCase();
  if (/phone/.test(lower) && /(second|2nd|secondhand|second hand|used|pre[-\s]?owned)/.test(lower)) return "a second-hand phone";
  return raw || clean(value) || "this purchase";
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

function getFinalCard() {
  return Array.from(document.querySelectorAll("[data-clara-buy-check-report] article")).find((article) =>
    clean(article.textContent).includes("08 / FINAL SUMMARY")
  );
}

function getFinalDecision() {
  return clean(getFinalCard()?.querySelector("h3")?.textContent || "");
}

function buildExpensePrefillFromBuyCheck(explanation = "") {
  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__ || {};
  const purchase = context.purchaseSummary || {};
  const finance = context.financeContext || {};
  const price = toNumber(purchase.price);
  const wallet = chooseExpenseWallet(context);
  const budget = finance.matchingBudget;
  const remaining = toNumber(budget?.remaining);
  const category = normalizeCategory(purchase.inferredCategory || purchase.item);
  const originalReason = clean(purchase.reason);
  const finalExplanation = clean(explanation) || originalReason || "User chose to continue after Buy Check.";
  const isOverBudget = budget ? price > remaining : true;
  const planningStatus = isOverBudget ? "unplanned" : "planned";
  const unplannedReason = planningStatus === "unplanned"
    ? isUnexpectedNecessary(`${originalReason} ${finalExplanation}`)
      ? `Unexpected necessary expense — ${finalExplanation}`
      : `Outside budget allocation — ${finalExplanation}`
    : "";

  return {
    source: "buy_check",
    amount: price,
    category,
    wallet_id: wallet?.id ? String(wallet.id) : "",
    wallet_name: wallet?.name || "Selected wallet",
    wallet_balance: toNumber(wallet?.balance),
    notes: `${normalizeDisplayItem(purchase.item)}${finalExplanation ? ` — ${finalExplanation}` : ""}`,
    need_type: normalizeNeedType(`${originalReason} ${finalExplanation}`, category),
    planning_status: planningStatus,
    unplanned_reason: unplannedReason,
    user_explanation: finalExplanation,
    buy_check_decision: getFinalDecision(),
    purchase,
  };
}

function buildReviewRows(payload = {}) {
  const rows = [
    ["Amount", money(payload.amount)],
    ["Category", clean(payload.category).replace(/^./, (letter) => letter.toUpperCase())],
    ["Wallet", payload.wallet_name || "Selected wallet"],
    ["Type", payload.need_type === "need" ? "Need" : payload.need_type === "savings" ? "Savings" : "Want"],
    ["Planning", payload.planning_status === "unplanned" ? "Unplanned" : "Planned"],
  ];

  return rows.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function closeBuyCheckOverlay() {
  try {
    document.querySelector("[data-clara-buy-check-decision-panel]")?.remove();
    document.querySelector("[data-clara-buy-check-close-board]")?.click?.();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  } catch {
    // keep navigation working even if the overlay close handler is unavailable
  }
}

function navigateToDashboard() {
  try {
    if (window.location.hash !== "#/dashboard") {
      window.location.hash = "/dashboard";
    }
  } catch {
    // ignore hash navigation failures
  }
}

function showExpenseLoggedToast(payload = {}) {
  document.querySelector("[data-clara-buy-check-success-toast]")?.remove();

  const toast = document.createElement("div");
  toast.dataset.claraBuyCheckSuccessToast = "true";
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

  const item = normalizeDisplayItem(payload.purchase?.item || payload.notes || "expense");
  toast.innerHTML = `
    <div style="font-size:13px;font-weight:950;line-height:1.25;color:rgba(167,243,208,.96);">Expense logged successfully</div>
    <div style="margin-top:4px;font-size:12px;font-weight:750;line-height:1.35;color:rgba(226,232,240,.74);">${money(payload.amount)} for ${item} has been added to your transactions.</div>
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

function completeExpenseLogFlow(payload = {}) {
  try {
    sessionStorage.setItem("clara_last_expense_logged_toast", JSON.stringify({
      amount: payload.amount,
      notes: payload.notes,
      purchase: payload.purchase,
      created_at: new Date().toISOString(),
    }));
  } catch {
    // ignore session storage failures
  }

  closeBuyCheckOverlay();
  navigateToDashboard();

  window.setTimeout(() => showExpenseLoggedToast(payload), 360);
}

async function logBuyCheckExpense(payload, statusNode) {
  if (!payload?.amount || payload.amount <= 0) throw new Error("Missing Buy Check amount.");
  if (!payload?.wallet_id) throw new Error("No spendable wallet was found for this expense.");

  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user?.email && !user?.id) throw new Error("User not found.");

  const createdAt = new Date().toISOString();
  const expenseId = generateId();
  const walletBalance = toNumber(payload.wallet_balance);

  if (payload.amount > walletBalance) throw new Error("Not enough wallet balance for this expense.");

  const expense = {
    id: expenseId,
    amount: payload.amount,
    category: payload.category,
    wallet_id: String(payload.wallet_id),
    date: getPHDateString(),
    notes: payload.notes || "Buy Check purchase",
    need_type: payload.need_type || "need",
    planning_status: payload.planning_status || "planned",
    unplanned_reason: payload.planning_status === "unplanned" ? payload.unplanned_reason || payload.user_explanation : null,
    created_by: user.email ?? "",
    user_email: user.email ?? "",
    user_id: user.id ?? "",
    created_at: createdAt,
    updated_at: createdAt,
  };

  const { error: expenseError } = await supabase.from(EXPENSES_TABLE).insert([expense]);
  if (expenseError) throw expenseError;

  const transaction = {
    id: generateId(),
    wallet_id: String(payload.wallet_id),
    amount: payload.amount,
    type: "expense",
    category: payload.category,
    need_type: payload.need_type || "need",
    planning_status: payload.planning_status || "planned",
    unplanned_reason: payload.planning_status === "unplanned" ? payload.unplanned_reason || payload.user_explanation : null,
    expense_id: expenseId,
    notes: payload.notes || "Buy Check purchase",
    created_at: createdAt,
    updated_at: createdAt,
    created_by: user.email ?? "",
    user_email: user.email ?? "",
    user_id: user.id ?? "",
  };

  const { error: transactionError } = await supabase.from(TXN_TABLE).insert([transaction]);
  if (transactionError) throw transactionError;

  const nextBalance = walletBalance - payload.amount;
  const { error: walletError } = await supabase
    .from(WALLETS_TABLE)
    .update({ balance: nextBalance, updated_at: createdAt })
    .eq("id", payload.wallet_id);
  if (walletError) throw walletError;

  try {
    const existing = JSON.parse(localStorage.getItem("clara_buy_check_buy_explanations") || "[]");
    existing.unshift({ ...payload, created_at: createdAt });
    localStorage.setItem("clara_buy_check_buy_explanations", JSON.stringify(existing.slice(0, 30)));
  } catch {
    // ignore local explanation storage failures
  }

  ["clara-expenses-updated", "clara-finance-updated", "clara-wallets-updated", "clara-wallet-transactions-updated"].forEach((name) => window.dispatchEvent(new Event(name)));
  if (statusNode) statusNode.textContent = "Expense logged successfully.";
}

function showDecisionExplanation(choice = "buy") {
  document.querySelector("[data-clara-buy-check-decision-panel]")?.remove();

  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__ || {};
  const purchase = context.purchaseSummary || {};
  const decision = getFinalDecision() || "this recommendation";
  const isBuy = choice === "buy";
  const item = normalizeDisplayItem(purchase.item || "this purchase");
  const payload = isBuy ? buildExpensePrefillFromBuyCheck("") : null;

  const panel = document.createElement("div");
  panel.dataset.claraBuyCheckDecisionPanel = choice;
  panel.className = "clara-buy-check-decision-panel";
  panel.innerHTML = `
    <div class="clara-buy-check-decision-card">
      <p class="clara-buy-check-decision-title">${isBuy ? "Before I log this expense..." : "Help me understand your decision."}</p>
      <p class="clara-buy-check-decision-copy">
        ${isBuy
          ? `You chose to buy <strong>${item}</strong>. Tell me why, so I can attach your explanation to the transaction${payload?.planning_status === "unplanned" ? " as the unplanned-spending reason" : " note"}.`
          : `I suggested <strong>${decision}</strong> for <strong>${item}</strong>, but you chose not to buy. Tell me why, so I can remember this decision pattern.`}
      </p>
      <textarea class="clara-buy-check-decision-input" rows="3" placeholder="Example: It is for work, my current one is broken, I decided to save first, or it is not urgent anymore."></textarea>
      ${isBuy ? `<div class="clara-buy-check-expense-preview">${buildReviewRows(payload)}</div>` : ""}
      <p class="clara-buy-check-decision-status" aria-live="polite"></p>
      <div class="clara-buy-check-decision-actions">
        <button type="button" data-clara-buy-check-decision-save="true">${isBuy ? "Log expense" : "Save reflection"}</button>
        <button type="button" data-clara-buy-check-decision-close="true">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.querySelector("textarea")?.focus();
}

function saveNotBuyReflection(panel) {
  const input = panel.querySelector(".clara-buy-check-decision-input");
  const reflection = clean(input?.value || "");
  const status = panel.querySelector(".clara-buy-check-decision-status");

  if (!reflection) {
    if (status) status.textContent = "Please add a short reason first.";
    return;
  }

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
    // ignore local reflection storage failures
  }

  window.dispatchEvent(new CustomEvent("clara:buy-check-decision-memory", { detail: payload }));
  if (status) status.textContent = "Reflection saved.";
  window.setTimeout(() => panel.remove(), 450);
}

async function saveBuyExplanationAndLog(panel) {
  const input = panel.querySelector(".clara-buy-check-decision-input");
  const status = panel.querySelector(".clara-buy-check-decision-status");
  const explanation = clean(input?.value || "");

  if (!explanation) {
    if (status) status.textContent = "Please explain why you will buy this first.";
    return;
  }

  const saveButton = panel.querySelector("[data-clara-buy-check-decision-save]");
  if (saveButton) saveButton.disabled = true;
  if (status) status.textContent = "Logging expense...";

  try {
    const payload = buildExpensePrefillFromBuyCheck(explanation);
    await logBuyCheckExpense(payload, status);
    completeExpenseLogFlow(payload);
  } catch (error) {
    console.error("[CLARA Buy Check] Failed to log expense", error);
    if (status) status.textContent = error?.message || "Could not log expense.";
    if (saveButton) saveButton.disabled = false;
  }
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

  document.addEventListener("pointerup", (event) => {
    const willBuyButton = event.target?.closest?.("[data-clara-buy-check-will-buy]");
    const notBuyButton = event.target?.closest?.("[data-clara-buy-check-not-buy]");
    if (!willBuyButton && !notBuyButton) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    showDecisionExplanation(willBuyButton ? "buy" : "not_buy");
  }, true);

  document.addEventListener("click", (event) => {
    const willBuyButton = event.target?.closest?.("[data-clara-buy-check-will-buy]");
    if (willBuyButton) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      showDecisionExplanation("buy");
      return;
    }

    const notBuyButton = event.target?.closest?.("[data-clara-buy-check-not-buy]");
    if (notBuyButton) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      showDecisionExplanation("not_buy");
      return;
    }

    const panel = event.target?.closest?.("[data-clara-buy-check-decision-panel]");
    if (event.target?.closest?.("[data-clara-buy-check-decision-close]")) {
      panel?.remove();
      return;
    }
    if (event.target?.closest?.("[data-clara-buy-check-decision-save]")) {
      if (!panel) return;
      if (panel.dataset.claraBuyCheckDecisionPanel === "buy") {
        saveBuyExplanationAndLog(panel);
      } else {
        saveNotBuyReflection(panel);
      }
    }
  }, true);
}

installBuyCheckReportFocusMode();
