import { getBudgets } from "@/lib/financeRepository";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import {
  isDebtCommitment,
  isDerivedBudgetHeader,
  normalizeBudgetText,
  rowAmount,
  rowTitle,
} from "@/lib/clara-derived-budget";

const STYLE_ID = "clara-budget-recent-reuse-style";
const BUTTON_MARKER = "data-clara-use-recent-budget";
const LOADING_MARKER = "data-clara-use-recent-loading";

const normalize = (value) => String(value || "").replace(/\s+/g, " ").trim();
const timeValue = (row = {}) => {
  const value = row.updated_at || row.updatedAt || row.created_at || row.createdAt || row.cycle_start || 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

function isBudgetHeader(row = {}) {
  return Boolean(
    row?.is_plan_header === true ||
      row?.plan_type === "monthly_budget" ||
      normalizeBudgetText(row?.category) === "monthly budget" ||
      normalizeBudgetText(row?.budget_category) === "monthly budget" ||
      normalizeBudgetText(row?.type) === "monthly budget",
  );
}

function isInactive(row = {}) {
  const status = normalizeBudgetText(row?.status);
  return Boolean(
    row?.is_active === false ||
      row?.active === false ||
      ["inactive", "archived", "deleted", "closed", "reset"].includes(status),
  );
}

function isCompletedHeader(row = {}) {
  if (!isBudgetHeader(row) || isInactive(row) || !isDerivedBudgetHeader(row)) return false;
  return Boolean(
    row?.is_complete === true ||
      row?.complete === true ||
      normalizeBudgetText(row?.status) === "active",
  );
}

function currentDraftId() {
  try {
    const draft = JSON.parse(window.localStorage.getItem("clara_budget_setup_draft_v2") || "null");
    return String(draft?.draftId || draft?.setup_draft_id || "").trim();
  } catch {
    return "";
  }
}

function getRecentRegularItems(rows = []) {
  const draftId = currentDraftId();
  const headers = (Array.isArray(rows) ? rows : [])
    .filter(isCompletedHeader)
    .filter((row) => String(row?.setup_draft_id || "").trim() !== draftId)
    .sort((a, b) => timeValue(b) - timeValue(a));

  const header = headers[0];
  const setupDraftId = String(header?.setup_draft_id || "").trim();
  if (!header || !setupDraftId) return [];

  return (Array.isArray(rows) ? rows : [])
    .filter((row) => !isBudgetHeader(row) && !isInactive(row))
    .filter((row) => String(row?.setup_draft_id || "").trim() === setupDraftId)
    .filter((row) => !isDebtCommitment(row))
    .map((row) => ({
      title: rowTitle(row),
      amount: Math.max(0, rowAmount(row)),
      order: Number(row?.sort_order ?? row?.display_order ?? row?.position ?? 9999),
    }))
    .filter((item) => item.title && item.amount > 0)
    .sort((a, b) => a.order - b.order);
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #root button[${BUTTON_MARKER}="true"] {
      min-height: 2.85rem !important;
      border: 1px solid rgba(96,165,250,0.26) !important;
      border-radius: 1rem !important;
      background: linear-gradient(145deg, rgba(18,63,126,0.88), rgba(10,39,85,0.96)) !important;
      color: rgba(239,246,255,0.88) !important;
      font-size: 0.76rem !important;
      font-weight: 850 !important;
      line-height: 1 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.07) !important;
      transition: transform 120ms ease, border-color 120ms ease, background 120ms ease !important;
    }

    #root button[${BUTTON_MARKER}="true"]:active {
      transform: scale(0.985);
    }

    #root button[${BUTTON_MARKER}="true"][${LOADING_MARKER}="true"] {
      opacity: 0.68 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

function setNativeInputValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(
    input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    "value",
  );
  descriptor?.set?.call(input, String(value));
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function getStepOneSection(root) {
  return Array.from(root.querySelectorAll("section")).find((section) => {
    const add = Array.from(section.querySelectorAll("button")).find((button) =>
      ["Add item", "Update item"].includes(normalize(button.textContent)),
    );
    return Boolean(add);
  });
}

function getCurrentTitles(section) {
  const heading = Array.from(section.querySelectorAll("p")).find(
    (node) => normalize(node.textContent).toLowerCase() === "your budget items",
  );
  const container = heading?.parentElement;
  if (!container) return new Set();

  const result = new Set();
  Array.from(container.querySelectorAll("p")).forEach((node) => {
    const text = normalize(node.textContent);
    if (!text || text.toLowerCase() === "your budget items") return;
    if (/^₱/.test(text)) return;
    result.add(normalizeBudgetText(text));
  });
  return result;
}

async function addRecentItems(root, recentItems, button) {
  if (!recentItems.length || button.getAttribute(LOADING_MARKER) === "true") return;

  const initialSection = getStepOneSection(root);
  if (!initialSection) return;
  const existingTitles = getCurrentTitles(initialSection);
  const missing = recentItems.filter((item) => !existingTitles.has(normalizeBudgetText(item.title)));

  if (!missing.length) {
    const original = button.textContent;
    button.textContent = "Already added";
    window.setTimeout(() => {
      if (button.isConnected) button.textContent = original;
    }, 1200);
    return;
  }

  if (existingTitles.size > 0) {
    const confirmed = window.confirm(
      "Add the missing items from your most recent budget? Your current items will stay.",
    );
    if (!confirmed) return;
  }

  button.setAttribute(LOADING_MARKER, "true");
  button.textContent = "Copying…";

  try {
    for (const item of missing) {
      const section = getStepOneSection(root);
      if (!section) break;

      const nameInput = section.querySelector('input[placeholder="Example: Food"]');
      const amountInput = section.querySelector('input[placeholder="Planned amount"]');
      const addButton = Array.from(section.querySelectorAll("button")).find(
        (candidate) => normalize(candidate.textContent) === "Add item",
      );
      if (!nameInput || !amountInput || !addButton) break;

      setNativeInputValue(nameInput, item.title);
      setNativeInputValue(amountInput, item.amount);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const latestSection = getStepOneSection(root);
      const latestAdd = Array.from(latestSection?.querySelectorAll("button") || []).find(
        (candidate) => normalize(candidate.textContent) === "Add item",
      );
      latestAdd?.click();
      await new Promise((resolve) => window.setTimeout(resolve, 90));
    }

    button.textContent = "Recent budget added";
    window.setTimeout(() => {
      if (button.isConnected) button.textContent = "↺ Use recent";
    }, 1300);
  } finally {
    button.removeAttribute(LOADING_MARKER);
  }
}

let recentItemsPromise = null;
async function loadRecentItems() {
  if (recentItemsPromise) return recentItemsPromise;
  recentItemsPromise = (async () => {
    try {
      const localUserId = getEffectiveDemoFinanceLocalUserId();
      const rows = await getBudgets(localUserId, { includeDeleted: false });
      return getRecentRegularItems(rows);
    } catch (error) {
      console.warn("CLARA could not load the recent budget template:", error);
      return [];
    }
  })();
  return recentItemsPromise;
}

async function renderRecentButton(root) {
  const section = getStepOneSection(root);
  if (!section) return;

  const addButton = Array.from(section.querySelectorAll("button")).find(
    (button) => normalize(button.textContent) === "Add item",
  );
  const actionRow = addButton?.parentElement;
  if (!addButton || !actionRow || !actionRow.classList.contains("grid")) return;

  if (actionRow.querySelector(`button[${BUTTON_MARKER}="true"]`)) return;

  const recentItems = await loadRecentItems();
  if (!recentItems.length || !actionRow.isConnected) return;

  const firstCell = actionRow.firstElementChild;
  if (firstCell?.tagName === "BUTTON") return;

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(BUTTON_MARKER, "true");
  button.textContent = "↺ Use recent";
  button.setAttribute("aria-label", "Use items from your most recent budget");
  button.addEventListener("click", () => addRecentItems(root, recentItems, button));

  if (firstCell) firstCell.replaceWith(button);
  else actionRow.prepend(button);
}

function start() {
  installStyles();
  const root = document.getElementById("root");
  if (!root) return;

  let scheduled = false;
  const run = () => {
    scheduled = false;
    renderRecentButton(root);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  };

  run();
  const observer = new MutationObserver(schedule);
  observer.observe(root, { childList: true, subtree: true });

  ["clara-budgets-updated", "clara-finance-updated", "clara-local-finance-updated"].forEach((eventName) => {
    window.addEventListener(eventName, () => {
      recentItemsPromise = null;
      schedule();
    });
  });
}

if (typeof window !== "undefined" && !window.__claraBudgetRecentReuseInstalled) {
  window.__claraBudgetRecentReuseInstalled = true;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
