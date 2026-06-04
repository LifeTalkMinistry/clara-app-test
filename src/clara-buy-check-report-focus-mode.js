import { supabase } from "@/lib/supabaseClient";
import { addExpense as repoAddExpense } from "@/lib/financeRepository";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function getWalletId(wallet = {}) {
  return clean(wallet.id ?? wallet.wallet_id ?? wallet.walletId ?? wallet.key ?? wallet.uuid ?? "");
}

function getWalletName(wallet = {}) {
  return clean(wallet.name || wallet.wallet_name || wallet.title || wallet.label || "Wallet");
}

function getWalletBalance(wallet = {}) {
  return toNumber(wallet.balance ?? wallet.current_balance ?? wallet.wallet_balance ?? wallet.available_balance ?? wallet.starting_balance ?? 0);
}

function getWalletOptions(context = {}) {
  const finance = context.financeContext || {};
  const rawWallets = [
    ...(Array.isArray(finance.wallets) ? finance.wallets : []),
    ...(Array.isArray(finance.spendableWallets) ? finance.spendableWallets : []),
    ...(Array.isArray(finance.protectedWallets) ? finance.protectedWallets : []),
  ];

  const seen = new Set();

  return rawWallets
    .map((wallet) => {
      const id = getWalletId(wallet);
      const name = getWalletName(wallet);
      const key = id || name.toLowerCase();
      if (!key || seen.has(key)) return null;
      seen.add(key);
      return {
        ...wallet,
        id,
        name,
        balanceNumber: getWalletBalance(wallet),
      };
    })
    .filter(Boolean);
}

function chooseExpenseWallet(context = {}, preferredWalletId = "") {
  const price = toNumber(context.purchaseSummary?.price);
  const wallets = getWalletOptions(context);
  const preferred = wallets.find((wallet) => wallet.id && wallet.id === preferredWalletId);

  if (preferred) return preferred;

  const candidates = wallets.filter((wallet) => wallet.id && (!price || wallet.balanceNumber >= price));

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

async function getBuyCheckLocalUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    return String(user?.id || user?.email || "clara-demo-user").trim() || "clara-demo-user";
  } catch {
    return "clara-demo-user";
  }
}

function buildExpensePrefillFromBuyCheck(explanation = "", preferredWalletId = "") {
  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__ || {};
  const purchase = context.purchaseSummary || {};
  const finance = context.financeContext || {};
  const price = toNumber(purchase.price);
  const wallet = chooseExpenseWallet(context, preferredWalletId);
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
    wallet_balance: wallet?.balanceNumber ?? getWalletBalance(wallet),
    notes: `${normalizeDisplayItem(purchase.item)}${finalExplanation ? ` — ${finalExplanation}` : ""}`,
    need_type: normalizeNeedType(`${originalReason} ${finalExplanation}`, category),
    planning_status: planningStatus,
    unplanned_reason: unplannedReason,
    user_explanation: finalExplanation,
    buy_check_decision: getFinalDecision(),
    purchase,
  };
}

function walletHasEnough(wallet = {}, amount = 0) {
  return Boolean(wallet.id) && getWalletBalance(wallet) >= toNumber(amount);
}

function buildWalletOptionsHtml(selectedWalletId = "", amount = 0) {
  const context = window.__CLARA_LAST_BUY_CHECK_CONTEXT__ || {};
  const wallets = getWalletOptions(context);

  if (!wallets.length) {
    return `<div class="clara-buy-check-wallet-empty">No wallets found.</div>`;
  }

  return wallets.map((wallet) => {
    const enough = walletHasEnough(wallet, amount);
    const selected = wallet.id && wallet.id === selectedWalletId;
    return `
      <button
        type="button"
        class="clara-buy-check-wallet-option${selected ? " is-selected" : ""}${!enough ? " is-disabled" : ""}"
        data-clara-buy-check-wallet-option="true"
        data-wallet-id="${escapeHtml(wallet.id)}"
        ${!enough ? "disabled" : ""}
      >
        <span>
          <strong>${escapeHtml(wallet.name)}</strong>
          <small>${enough ? "Available" : "Not enough balance"}</small>
        </span>
        <b>${money(wallet.balanceNumber)}</b>
      </button>
    `;
  }).join("");
}

function buildReviewRows(payload = {}) {
  const selectedWalletId = clean(payload.wallet_id);
  const enough = payload.amount > 0 && payload.wallet_id && payload.amount <= toNumber(payload.wallet_balance);
  const rows = [
    ["Amount", money(payload.amount)],
    ["Category", clean(payload.category).replace(/^./, (letter) => letter.toUpperCase())],
    ["Type", payload.need_type === "need" ? "Need" : payload.need_type === "savings" ? "Savings" : "Want"],
    ["Planning", payload.planning_status === "unplanned" ? "Unplanned" : "Planned"],
  ];

  return `
    ${rows.map(([label, value]) => `<div class="clara-buy-check-preview-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
    <div class="clara-buy-check-preview-row clara-buy-check-wallet-row">
      <span>Pay from</span>
      <button type="button" class="clara-buy-check-wallet-trigger${!enough ? " is-warning" : ""}" data-clara-buy-check-wallet-toggle="true">
        <strong>${escapeHtml(payload.wallet_name || "Choose wallet")}</strong>
        <small>${money(payload.wallet_balance)}</small>
        <b aria-hidden="true">⌄</b>
      </button>
    </div>
    <div class="clara-buy-check-wallet-menu" data-clara-buy-check-wallet-menu="true" hidden>
      ${buildWalletOptionsHtml(selectedWalletId, payload.amount)}
    </div>
  `;
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

  const localUserId = await getBuyCheckLocalUserId();
  const createdAt = new Date().toISOString();
  const walletBalance = toNumber(payload.wallet_balance);

  if (payload.amount > walletBalance) throw new Error("Not enough wallet balance for this expense.");

  await repoAddExpense(localUserId, {
    id: generateId(),
    amount: payload.amount,
    category: payload.category,
    wallet_id: String(payload.wallet_id),
    date: getPHDateString(),
    notes: payload.notes || "Buy Check purchase",
    need_type: payload.need_type || "need",
    planning_status: payload.planning_status || "planned",
    unplanned_reason: payload.planning_status === "unplanned" ? payload.unplanned_reason || payload.user_explanation : null,
    created_at: createdAt,
    updated_at: createdAt,
    source: "local",
    syncStatus: "local_only",
  });

  try {
    const existing = JSON.parse(localStorage.getItem("clara_buy_check_buy_explanations") || "[]");
    existing.unshift({ ...payload, created_at: createdAt });
    localStorage.setItem("clara_buy_check_buy_explanations", JSON.stringify(existing.slice(0, 30)));
  } catch {
    // ignore local explanation storage failures
  }

  [
    "clara-expenses-updated",
    "clara-finance-updated",
    "clara-wallets-updated",
    "clara-wallet-transactions-updated",
    "clara-local-finance-updated",
  ].forEach((name) => window.dispatchEvent(new Event(name)));

  if (statusNode) statusNode.textContent = "Expense logged successfully.";
}

function updateBuyPanelValidation(panel, { preserveStatus = false } = {}) {
  if (!panel || panel.dataset.claraBuyCheckDecisionPanel !== "buy") return null;

  const input = panel.querySelector(".clara-buy-check-decision-input");
  const preview = panel.querySelector(".clara-buy-check-expense-preview");
  const status = panel.querySelector(".clara-buy-check-decision-status");
  const saveButton = panel.querySelector("[data-clara-buy-check-decision-save]");
  const explanation = clean(input?.value || "");
  const selectedWalletId = clean(panel.dataset.claraBuyCheckSelectedWalletId || "");
  const payload = buildExpensePrefillFromBuyCheck(explanation, selectedWalletId);
  const enoughBalance = Boolean(payload.wallet_id) && payload.amount > 0 && payload.amount <= toNumber(payload.wallet_balance);
  const canLog = Boolean(explanation) && payload.amount > 0 && Boolean(payload.wallet_id) && enoughBalance;

  panel.dataset.claraBuyCheckSelectedWalletId = payload.wallet_id || "";

  if (preview) {
    const menuWasOpen = Boolean(preview.querySelector("[data-clara-buy-check-wallet-menu]:not([hidden])"));
    preview.innerHTML = buildReviewRows(payload);
    const nextMenu = preview.querySelector("[data-clara-buy-check-wallet-menu]");
    if (menuWasOpen && nextMenu) nextMenu.hidden = false;
  }

  if (saveButton) saveButton.disabled = !canLog;

  if (status && !preserveStatus) {
    if (!payload.wallet_id) {
      status.textContent = "Choose a wallet before logging this expense.";
    } else if (!enoughBalance) {
      status.textContent = "Not enough wallet balance for this expense.";
    } else if (!explanation) {
      status.textContent = "Add a short explanation before logging.";
    } else {
      status.textContent = "";
    }
  }

  return { payload, canLog, enoughBalance };
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
  if (isBuy) panel.dataset.claraBuyCheckSelectedWalletId = payload?.wallet_id || "";
  panel.className = "clara-buy-check-decision-panel";
  panel.innerHTML = `
    <div class="clara-buy-check-decision-card">
      <p class="clara-buy-check-decision-title">${isBuy ? "Before I log this expense..." : "Help me understand your decision."}</p>
      <p class="clara-buy-check-decision-copy">
        ${isBuy
          ? `You chose to buy <strong>${escapeHtml(item)}</strong>. Tell me why, so I can attach your explanation to the transaction${payload?.planning_status === "unplanned" ? " as the unplanned-spending reason" : " note"}.`
          : `I suggested <strong>${escapeHtml(decision)}</strong> for <strong>${escapeHtml(item)}</strong>, but you chose not to buy. Tell me why, so I can remember this decision pattern.`}
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

  if (isBuy) updateBuyPanelValidation(panel);
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
    updateBuyPanelValidation(panel, { preserveStatus: true });
    return;
  }

  const validation = updateBuyPanelValidation(panel);
  if (!validation?.canLog) return;

  const saveButton = panel.querySelector("[data-clara-buy-check-decision-save]");
  if (saveButton) saveButton.disabled = true;
  if (status) status.textContent = "Logging expense...";

  try {
    const payload = buildExpensePrefillFromBuyCheck(explanation, panel.dataset.claraBuyCheckSelectedWalletId || "");
    await logBuyCheckExpense(payload, status);
    completeExpenseLogFlow(payload);
  } catch (error) {
    console.error("[CLARA Buy Check] Failed to log expense", error);
    if (status) status.textContent = error?.message || "Could not log expense.";
    updateBuyPanelValidation(panel, { preserveStatus: true });
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

  document.addEventListener("input", (event) => {
    const panel = event.target?.closest?.("[data-clara-buy-check-decision-panel='buy']");
    if (!panel || !event.target?.matches?.(".clara-buy-check-decision-input")) return;
    updateBuyPanelValidation(panel);
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

    const walletToggle = event.target?.closest?.("[data-clara-buy-check-wallet-toggle]");
    if (walletToggle && panel?.dataset.claraBuyCheckDecisionPanel === "buy") {
      event.preventDefault();
      event.stopPropagation();
      const menu = panel.querySelector("[data-clara-buy-check-wallet-menu]");
      if (menu) menu.hidden = !menu.hidden;
      return;
    }

    const walletOption = event.target?.closest?.("[data-clara-buy-check-wallet-option]");
    if (walletOption && panel?.dataset.claraBuyCheckDecisionPanel === "buy") {
      event.preventDefault();
      event.stopPropagation();
      if (walletOption.disabled || walletOption.classList.contains("is-disabled")) return;
      panel.dataset.claraBuyCheckSelectedWalletId = clean(walletOption.dataset.walletId || "");
      updateBuyPanelValidation(panel);
      return;
    }

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
