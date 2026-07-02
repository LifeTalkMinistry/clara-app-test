import React, { useEffect, useMemo, useRef } from "react";
import { askGeminiForUnderstanding } from "@/lib/ai-command/gemini-service";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import {
  getBudgetTotal,
  getPHMonthKey,
  getWalletDisplayBalance,
  normalizeLower,
} from "@/utils/dashboard/dashboardHelpers";
import {
  getBillOccurrencesForRange,
  getExpectedIncomeWindow,
  getRecurringBills,
  getRecurringCashFlowOwnerId,
  normalizeRecurrenceRule,
  RECURRING_CASH_FLOW_UPDATED_EVENT,
  toLocalDateKey,
  upsertRecurringBill,
} from "@/lib/recurringCashFlowRepository";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

const SCHEDULE_CREATE_EVENT = "clara:schedule:create-event";
const INPUT_CLASS = "w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanMoney(value) {
  const amount = Number(String(value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function sentenceCase(value) {
  const clean = cleanText(value);
  if (!clean) return "";
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}`.replace(/([.!?])?$/, ".");
}

function localRefineEventDescription(form) {
  const raw = `${form.note || form.title || ""}`
    .replace(/[₱$]?\s*\d+(?:,\d{3})*(?:\.\d+)?/g, "")
    .replace(/\b(maybe|probably|around|estimate|estimated|budget|cost|costs|expense|expenses|spend|spending)\b/gi, "")
    .replace(/\b(food|snacks|coffee|fare|gas|transport|transportation|contribution|offering|entrance fee|fee|payment)\b/gi, "")
    .replace(/\s+(and|or)\s*$/i, "")
    .replace(/[,.]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const fallback = form.title || form.type || "Personal schedule";
  return sentenceCase(raw || fallback);
}

function getNativeValueSetter(element) {
  const prototype = Object.getPrototypeOf(element);
  return Object.getOwnPropertyDescriptor(prototype, "value")?.set;
}

function updateControlledTextarea(textarea, value) {
  if (!textarea || !value) return;

  const setter = getNativeValueSetter(textarea);
  if (setter) setter.call(textarea, value);
  else textarea.value = value;

  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

function sanitizeAiNote(value) {
  return cleanText(value)
    .replace(/^refined\s*(description|schedule)?\s*:\s*/i, "")
    .replace(/^description\s*:\s*/i, "")
    .replace(/^note\s*:\s*/i, "")
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
}

function readScheduleForm(root) {
  const dialog = root.querySelector('[role="dialog"]');
  const textarea = dialog?.querySelector("textarea");
  const titleInput = dialog?.querySelector('input[placeholder="Schedule title"], input[placeholder="Bill title"]');
  const dateInput = dialog?.querySelector('input[type="date"]');
  const timeInput = dialog?.querySelector('input[type="time"]');
  const typeSelect = dialog?.querySelector("select");

  return {
    textarea,
    title: titleInput?.value || "",
    date: dateInput?.value || "",
    time: timeInput?.value || "",
    type: typeSelect?.value || "",
    note: textarea?.value || "",
  };
}

async function refineWithExistingClaraBrain(form) {
  const result = await askGeminiForUnderstanding({
    text: `Refine this CLARA schedule description only. Return the refined description in assistantMessage as one clean natural sentence. Do not calculate money impact. Do not save anything. Do not add advice. Do not invent costs or details. Do not include a label.\n\nSchedule form:\n${JSON.stringify({
      title: form.title,
      date: form.date,
      time: form.time,
      type: form.type,
      note: form.note,
    })}`,
    session: {
      history: [],
      currentCommand: {
        screen: "schedule",
        action: "refine_description_only",
      },
    },
    financeSnapshot: {},
  });

  return sanitizeAiNote(result?.assistantMessage);
}

function createField(label, control, helper = "") {
  const wrapper = document.createElement("label");
  wrapper.className = "block space-y-2";
  const caption = document.createElement("span");
  caption.className = "block text-[10px] font-black uppercase tracking-[.16em] text-white/35";
  caption.textContent = label;
  wrapper.append(caption, control);
  if (helper) {
    const detail = document.createElement("span");
    detail.className = "block text-[10px] font-semibold leading-4 text-white/35";
    detail.textContent = helper;
    wrapper.appendChild(detail);
  }
  return wrapper;
}

function createInput(type, value = "") {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.className = INPUT_CLASS;
  return input;
}

function createSelect(options, value) {
  const select = document.createElement("select");
  select.className = INPUT_CLASS;
  options.forEach(([optionValue, label]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = value;
  return select;
}

function createToggle(label, helper, checked) {
  const wrapper = document.createElement("label");
  wrapper.className = "flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3";
  const copy = document.createElement("span");
  copy.className = "min-w-0";
  const title = document.createElement("span");
  title.className = "block text-sm font-bold text-white/82";
  title.textContent = label;
  const detail = document.createElement("span");
  detail.className = "mt-1 block text-[10px] font-semibold leading-4 text-white/38";
  detail.textContent = helper;
  copy.append(title, detail);
  const input = createInput("checkbox");
  input.checked = checked;
  input.className = "mt-1 h-5 w-5 shrink-0 accent-cyan-300";
  wrapper.append(copy, input);
  return { wrapper, input };
}

function installBillControls(form) {
  if (!form || form.querySelector("[data-schedule-bill-controls]")) return;
  const descriptionBox = form.querySelector("textarea")?.closest("div.rounded-\[22px\]");
  if (!descriptionBox) return;

  const root = document.createElement("div");
  root.dataset.scheduleBillControls = "true";
  root.className = "space-y-3 rounded-[22px] border border-fuchsia-300/12 bg-fuchsia-300/[.025] p-3";

  const amount = createInput("number", "");
  amount.min = "0";
  amount.step = "0.01";
  amount.placeholder = "0";
  amount.dataset.billExpectedAmount = "true";

  const recurrence = createSelect([
    ["one_time", "One-time"],
    ["weekly", "Weekly"],
    ["biweekly", "Every two weeks"],
    ["monthly", "Monthly"],
    ["custom", "Custom"],
  ], "monthly");
  recurrence.dataset.billRecurrence = "true";

  const amountType = createSelect([
    ["fixed", "Fixed"],
    ["variable", "May change"],
  ], "fixed");
  amountType.dataset.billAmountType = "true";

  const customDates = createInput("text", "");
  customDates.placeholder = "2026-07-16, 2026-08-16";
  customDates.dataset.billCustomDates = "true";
  const customField = createField("Custom dates", customDates, "Use YYYY-MM-DD separated by commas.");
  customField.dataset.billCustomField = "true";
  customField.hidden = true;

  const autoInclude = createToggle(
    "Automatically include in my budget",
    "CLARA will add this bill to applicable budget periods before its due date.",
    true
  );
  autoInclude.input.dataset.billAutoInclude = "true";
  autoInclude.input.dataset.manuallyChanged = "false";
  autoInclude.input.addEventListener("change", () => {
    autoInclude.input.dataset.manuallyChanged = "true";
  });

  recurrence.addEventListener("change", () => {
    customField.hidden = recurrence.value !== "custom";
    if (autoInclude.input.dataset.manuallyChanged !== "true") {
      autoInclude.input.checked = recurrence.value !== "one_time";
    }
    updateBillActionLabels(form);
  });

  root.append(
    createField("Expected amount", amount),
    createField("Recurrence", recurrence),
    customField,
    createField("Amount type", amountType),
    autoInclude.wrapper
  );
  descriptionBox.before(root);
}

function updateBillActionLabels(form) {
  if (!form) return;
  const typeSelect = form.querySelector("select");
  const isBill = typeSelect?.value === "Bill";
  const controls = form.querySelector("[data-schedule-bill-controls]");
  const title = form.querySelector('input[placeholder="Schedule title"], input[placeholder="Bill title"]');
  const buttons = [...form.querySelectorAll("button")];
  const impactButton = buttons.find((button) => /calculate money impact|check money impact/i.test(button.textContent || ""));
  const saveButton = buttons.find((button) => /save without impact|save recurring bill|save bill/i.test(button.textContent || ""));

  if (controls) controls.hidden = !isBill;
  if (title) title.placeholder = isBill ? "Bill title" : "Schedule title";
  if (impactButton) impactButton.textContent = isBill ? "Check money impact" : "Calculate money impact";
  if (saveButton) {
    const recurrence = controls?.querySelector("[data-bill-recurrence]")?.value;
    saveButton.textContent = isBill
      ? recurrence && recurrence !== "one_time" ? "Save recurring bill" : "Save bill"
      : "Save without impact";
  }
}

function readBillDraft(form) {
  if (!form || form.querySelector("select")?.value !== "Bill") return null;
  const base = readScheduleForm(form);
  const root = form.querySelector("[data-schedule-bill-controls]");
  const recurrenceType = root?.querySelector("[data-bill-recurrence]")?.value || "one_time";
  const customDates = String(root?.querySelector("[data-bill-custom-dates]")?.value || "")
    .split(/[\s,]+/)
    .map(toLocalDateKey)
    .filter(Boolean);
  const dueDate = base.date || toLocalDateKey(new Date());
  const due = new Date(`${dueDate}T12:00:00`);
  const recurrence = normalizeRecurrenceRule({
    type: recurrenceType,
    startDate: dueDate,
    dayOfWeek: due.getDay(),
    dayOfMonth: due.getDate(),
    customDates,
  }, { kind: "bill", fallbackDate: dueDate });

  return {
    title: cleanText(base.title),
    dueDate,
    expectedAmount: cleanMoney(root?.querySelector("[data-bill-expected-amount]")?.value),
    amountType: root?.querySelector("[data-bill-amount-type]")?.value || "fixed",
    recurrence,
    autoIncludeInBudget: root?.querySelector("[data-bill-auto-include]")?.checked === true,
    description: cleanText(base.note),
    createdOrigin: "schedule",
    scheduleBaseDate: dueDate,
  };
}

function dispatchScheduleOccurrences(ownerId, bill, { excludeDate = "" } = {}) {
  if (typeof window === "undefined" || !bill?.id) return;
  const today = toLocalDateKey(new Date());
  const occurrences = getBillOccurrencesForRange(ownerId, today, toLocalDateKey(new Date(new Date().getFullYear() + 2, new Date().getMonth(), new Date().getDate())));
  occurrences
    .filter((occurrence) => String(occurrence.id) === String(bill.id))
    .filter((occurrence) => occurrence.occurrenceDueDate !== excludeDate)
    .forEach((occurrence) => {
      window.dispatchEvent(new CustomEvent(SCHEDULE_CREATE_EVENT, {
        detail: {
          id: `recurring-schedule-${occurrence.id}-${occurrence.occurrenceDueDate}`,
          title: occurrence.title,
          date: occurrence.occurrenceDueDate,
          time: "",
          type: "Bill",
          amount: occurrence.expectedAmount,
          note: occurrence.description || `${occurrence.amountType === "variable" ? "Estimated" : "Recurring"} bill.`,
          impactBreakdown: [],
        },
      }));
    });
}

function syncAllBillsToSchedule(ownerId) {
  getRecurringBills(ownerId).forEach((bill) => {
    dispatchScheduleOccurrences(ownerId, bill, { excludeDate: bill.scheduleBaseDate || bill.schedule_base_date || "" });
  });
}

function formatMoney(value) {
  return `₱${Number(value || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function installImpactContext(dialog, draft, financial, ownerId) {
  if (!dialog || !draft || dialog.querySelector("[data-bill-impact-context]")) return;
  const heading = [...dialog.querySelectorAll("h3")].find((node) => /calculate money impact/i.test(node.textContent || ""));
  if (!heading) return;
  heading.textContent = "Check money impact";

  const wallets = Array.isArray(financial?.wallets) ? financial.wallets : [];
  const budgets = Array.isArray(financial?.budgets) ? financial.budgets : [];
  const spendable = wallets.reduce((sum, wallet) => sum + Math.max(0, getWalletDisplayBalance(wallet)), 0);
  const currentMonth = getPHMonthKey();
  const budgetAllocated = budgets
    .filter((budget) => {
      const month = String(budget?.month || budget?.budget_month || budget?.month_key || currentMonth);
      const header = budget?.is_plan_header === true || budget?.plan_type === "monthly_budget";
      return !header && month === currentMonth && budget?.is_active !== false;
    })
    .reduce((sum, budget) => sum + Math.max(0, getBudgetTotal(budget)), 0);
  const nextIncome = getExpectedIncomeWindow(ownerId, new Date());
  const dueBeforeIncome = nextIncome.nextExpectedDate
    ? draft.dueDate < nextIncome.nextExpectedDate
    : null;
  const afterBill = spendable - draft.expectedAmount;

  const card = document.createElement("div");
  card.dataset.billImpactContext = "true";
  card.className = "mx-4 mt-3 rounded-[22px] border border-fuchsia-300/14 bg-fuchsia-300/[.045] px-4 py-3 text-xs font-semibold leading-5 text-white/60";
  const rows = [
    ["Expected bill", formatMoney(draft.expectedAmount)],
    ["Spendable now", formatMoney(spendable)],
    ["Current allocations", formatMoney(budgetAllocated)],
    ["After this bill", formatMoney(afterBill)],
    ["Next expected income", nextIncome.nextExpectedDate || "Not configured"],
    ["Timing", dueBeforeIncome === null ? "Income timing unavailable" : dueBeforeIncome ? "Due before next income" : "Due after next income"],
  ];
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "flex items-center justify-between gap-3 py-0.5";
    const left = document.createElement("span");
    left.textContent = label;
    const right = document.createElement("strong");
    right.className = afterBill < 0 && label === "After this bill" ? "text-rose-200" : "text-white/82";
    right.textContent = value;
    row.append(left, right);
    card.appendChild(row);
  });
  const header = heading.closest("div.border-b");
  header?.after(card);
}

export default function DashboardSchedulePanel() {
  const rootRef = useRef(null);
  const pendingBillRef = useRef(null);
  const { user } = useUserRole() || {};
  const ownerId = useMemo(() => getRecurringCashFlowOwnerId(user), [user]);
  const financial = useFinancialData(user);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let isRefining = false;

    const handleRefineClick = async (clickEvent) => {
      const button = clickEvent.target?.closest?.("button");
      if (!button || !root.contains(button)) return;

      const label = cleanText(button.textContent).toLowerCase();
      const isRefineButton = label.includes("refine with clara") || label.includes("clara thinking");
      if (!isRefineButton) return;

      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      clickEvent.stopImmediatePropagation?.();

      if (isRefining) return;

      const form = readScheduleForm(root);
      if (!form.textarea || (!cleanText(form.note) && !cleanText(form.title))) return;

      const originalText = button.textContent;
      isRefining = true;
      button.disabled = true;
      button.textContent = "CLARA THINKING";
      button.classList.add("cursor-wait", "opacity-70");

      try {
        const aiNote = await refineWithExistingClaraBrain(form);
        const fallbackNote = localRefineEventDescription(form);
        const refinedNote = sanitizeAiNote(aiNote || fallbackNote);

        if (refinedNote && refinedNote !== form.note) {
          updateControlledTextarea(form.textarea, refinedNote);
        }
      } catch (error) {
        console.warn("[CLARA Schedule] AI description refinement fell back locally:", error);

        const fallbackNote = localRefineEventDescription(form);
        if (fallbackNote && fallbackNote !== form.note) {
          updateControlledTextarea(form.textarea, fallbackNote);
        }
      } finally {
        isRefining = false;
        button.disabled = false;
        button.textContent = cleanText(originalText) || "Refine with CLARA";
        button.classList.remove("cursor-wait", "opacity-70");
      }
    };

    const persistPendingBill = (amountOverride = 0) => {
      const draft = pendingBillRef.current;
      if (!draft?.title) return;
      const saved = upsertRecurringBill(ownerId, {
        ...draft,
        expectedAmount: draft.expectedAmount || amountOverride,
      });
      dispatchScheduleOccurrences(ownerId, saved, { excludeDate: draft.scheduleBaseDate });
      pendingBillRef.current = null;
    };

    const handleBillClick = (event) => {
      const button = event.target?.closest?.("button");
      if (!button || !root.contains(button)) return;
      const label = cleanText(button.textContent).toLowerCase();
      const form = button.closest("form");

      if (form && (/check money impact|calculate money impact/.test(label))) {
        const draft = readBillDraft(form);
        if (draft) pendingBillRef.current = draft;
        return;
      }

      if (form && (/save recurring bill|save bill|save without impact/.test(label))) {
        const draft = readBillDraft(form);
        if (!draft) return;
        pendingBillRef.current = draft;
        persistPendingBill();
        return;
      }

      if (/save schedule with/.test(label) && pendingBillRef.current) {
        const amount = cleanMoney(label);
        persistPendingBill(amount);
      }
    };

    const enhanceBillMode = () => {
      const dialogs = [...root.querySelectorAll('[role="dialog"]')];
      dialogs.forEach((dialog) => {
        const form = dialog.querySelector("form");
        if (form) {
          installBillControls(form);
          const typeSelect = form.querySelector("select");
          if (typeSelect && typeSelect.dataset.billModeBound !== "true") {
            typeSelect.dataset.billModeBound = "true";
            typeSelect.addEventListener("change", () => updateBillActionLabels(form));
          }
          updateBillActionLabels(form);
        }
        installImpactContext(dialog, pendingBillRef.current, financial, ownerId);
      });
    };

    root.addEventListener("click", handleRefineClick, true);
    root.addEventListener("click", handleBillClick, true);
    const observer = new MutationObserver(enhanceBillMode);
    observer.observe(root, { childList: true, subtree: true });
    enhanceBillMode();
    window.setTimeout(() => syncAllBillsToSchedule(ownerId), 0);

    const handleRecurringUpdate = (event) => {
      if (event?.detail?.ownerId && String(event.detail.ownerId) !== String(ownerId)) return;
      window.setTimeout(() => syncAllBillsToSchedule(ownerId), 0);
    };
    window.addEventListener(RECURRING_CASH_FLOW_UPDATED_EVENT, handleRecurringUpdate);

    return () => {
      root.removeEventListener("click", handleRefineClick, true);
      root.removeEventListener("click", handleBillClick, true);
      window.removeEventListener(RECURRING_CASH_FLOW_UPDATED_EVENT, handleRecurringUpdate);
      observer.disconnect();
    };
  }, [financial, ownerId]);

  return React.createElement(
    "div",
    {
      ref: rootRef,
      className: "contents",
    },
    React.createElement(OriginalDashboardSchedulePanel)
  );
}
