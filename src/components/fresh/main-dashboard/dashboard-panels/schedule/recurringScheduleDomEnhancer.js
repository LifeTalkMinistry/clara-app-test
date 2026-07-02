import {
  normalizeRecurrenceRule,
  toLocalDateKey,
} from "@/lib/recurringCashFlowRepository";

const INPUT_CLASS = "w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-fuchsia-300/32";

function cleanText(value) {
  return String(value || "").trim();
}

function cleanMoney(value) {
  const amount = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
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

function createField(label, control, helper = "") {
  const field = document.createElement("label");
  field.className = "block space-y-2";
  const caption = document.createElement("span");
  caption.className = "block text-[10px] font-black uppercase tracking-[.16em] text-white/35";
  caption.textContent = label;
  field.append(caption, control);
  if (helper) {
    const detail = document.createElement("span");
    detail.className = "block text-[10px] font-semibold leading-4 text-white/35";
    detail.textContent = helper;
    field.appendChild(detail);
  }
  return field;
}

function createToggle(label, helper, checked) {
  const field = document.createElement("label");
  field.className = "flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[.025] px-4 py-3";
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
  input.className = "mt-1 h-5 w-5 shrink-0 accent-fuchsia-300";
  field.append(copy, input);
  return { field, input };
}

function setButtonVisualLabel(button, visible, compatibilityText = "") {
  if (!button) return;
  button.replaceChildren();
  const visual = document.createElement("span");
  visual.textContent = visible;
  button.appendChild(visual);
  if (compatibilityText) {
    const hidden = document.createElement("span");
    hidden.className = "sr-only";
    hidden.textContent = compatibilityText;
    button.appendChild(hidden);
  }
}

export function refreshScheduleBillMode(form) {
  if (!form) return;
  const category = form.querySelector("select");
  const isBill = category?.value === "Bill";
  const controls = form.querySelector("[data-schedule-bill-controls]");
  const titleInput = form.querySelector('input[placeholder="Schedule title"], input[placeholder="Bill title"]');
  const recurrence = controls?.querySelector("[data-bill-recurrence]")?.value || "one_time";
  const buttons = [...form.querySelectorAll("button")];
  const impactButton = buttons.find((button) => /calculate money impact|check money impact/i.test(button.textContent || ""));
  const directSave = buttons.find((button) => /save without impact|save recurring bill|save bill/i.test(button.textContent || ""));

  if (controls) controls.hidden = !isBill;
  if (titleInput) titleInput.placeholder = isBill ? "Bill title" : "Schedule title";
  if (impactButton) {
    impactButton.dataset.billImpactTrigger = isBill ? "true" : "false";
    setButtonVisualLabel(
      impactButton,
      isBill ? "Check money impact" : "Calculate money impact",
      isBill ? "Calculate money impact" : ""
    );
  }
  if (directSave) {
    directSave.dataset.billDirectSave = isBill ? "true" : "false";
    directSave.textContent = isBill
      ? recurrence === "one_time" ? "Save bill" : "Save recurring bill"
      : "Save without impact";
  }
}

export function installScheduleBillControls(form) {
  if (!form || form.querySelector("[data-schedule-bill-controls]")) {
    refreshScheduleBillMode(form);
    return;
  }

  const textarea = form.querySelector("textarea");
  if (!textarea) return;
  const insertionPoint = textarea.closest("div.rounded-\[22px\]") || textarea.parentElement;
  const root = document.createElement("div");
  root.dataset.scheduleBillControls = "true";
  root.className = "space-y-3 rounded-[22px] border border-fuchsia-300/12 bg-fuchsia-300/[.025] p-3";

  const amount = createInput("number");
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

  const customDates = createInput("text");
  customDates.placeholder = "2026-07-16, 2026-08-16";
  customDates.dataset.billCustomDates = "true";
  const customField = createField("Custom dates", customDates, "Use YYYY-MM-DD separated by commas.");
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
    refreshScheduleBillMode(form);
  });

  root.append(
    createField("Expected amount", amount),
    createField("Recurrence", recurrence),
    customField,
    createField("Amount type", amountType),
    autoInclude.field
  );
  insertionPoint.before(root);

  const category = form.querySelector("select");
  if (category && category.dataset.billModeBound !== "true") {
    category.dataset.billModeBound = "true";
    category.addEventListener("change", () => refreshScheduleBillMode(form));
  }
  refreshScheduleBillMode(form);
}

export function readScheduleBillDraft(form) {
  if (!form || form.querySelector("select")?.value !== "Bill") return null;
  const titleInput = form.querySelector('input[placeholder="Bill title"], input[placeholder="Schedule title"]');
  const dateInput = form.querySelector('input[type="date"]');
  const timeInput = form.querySelector('input[type="time"]');
  const textarea = form.querySelector("textarea");
  const controls = form.querySelector("[data-schedule-bill-controls]");
  const dueDate = dateInput?.value || toLocalDateKey(new Date());
  const due = new Date(`${dueDate}T12:00:00`);
  const recurrenceType = controls?.querySelector("[data-bill-recurrence]")?.value || "one_time";
  const customDates = String(controls?.querySelector("[data-bill-custom-dates]")?.value || "")
    .split(/[\s,]+/)
    .map((value) => toLocalDateKey(value))
    .filter(Boolean);

  return {
    title: cleanText(titleInput?.value),
    dueDate,
    time: timeInput?.value || "",
    expectedAmount: cleanMoney(controls?.querySelector("[data-bill-expected-amount]")?.value),
    amountType: controls?.querySelector("[data-bill-amount-type]")?.value || "fixed",
    recurrence: normalizeRecurrenceRule({
      type: recurrenceType,
      startDate: dueDate,
      dayOfWeek: due.getDay(),
      dayOfMonth: due.getDate(),
      customDates,
    }, { kind: "bill", fallbackDate: dueDate }),
    autoIncludeInBudget: controls?.querySelector("[data-bill-auto-include]")?.checked === true,
    description: cleanText(textarea?.value),
    createdOrigin: "schedule",
    scheduleBaseDate: dueDate,
  };
}
