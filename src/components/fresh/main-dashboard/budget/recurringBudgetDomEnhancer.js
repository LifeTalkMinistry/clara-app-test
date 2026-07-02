import { toLocalDateKey } from "@/lib/recurringCashFlowRepository";

export const recurringBudgetInputClass = "w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-emerald-300/32";

export function createDefaultRecurringBudgetDraft() {
  return {
    itemType: "category",
    makeRecurringBill: false,
    dueDate: toLocalDateKey(new Date()),
    recurrence: "monthly",
    customDates: "",
    amountType: "fixed",
    autoIncludeInBudget: true,
  };
}

export function recurringBillToDraft(bill) {
  if (!bill) return createDefaultRecurringBudgetDraft();
  const recurrence = bill.recurrence || bill.recurrence_rule || {};
  return {
    itemType: "bill",
    makeRecurringBill: true,
    billId: bill.id,
    dueDate: bill.dueDate || bill.due_date || toLocalDateKey(new Date()),
    recurrence: recurrence.type || "monthly",
    customDates: (recurrence.customDates || recurrence.custom_dates || []).join(", "),
    amountType: bill.amountType || bill.amount_type || "fixed",
    autoIncludeInBudget: bill.autoIncludeInBudget === true || bill.auto_include_in_budget === true,
  };
}

function createField(label, control, helper = "") {
  const wrapper = document.createElement("label");
  wrapper.className = "block space-y-2";
  const caption = document.createElement("span");
  caption.className = "block text-[11px] font-black uppercase tracking-[0.14em] text-white/48";
  caption.textContent = label;
  wrapper.append(caption, control);
  if (helper) {
    const detail = document.createElement("span");
    detail.className = "block text-[10px] font-semibold leading-4 text-white/38";
    detail.textContent = helper;
    wrapper.appendChild(detail);
  }
  return wrapper;
}

function createInput(type, value = "") {
  const input = document.createElement("input");
  input.type = type;
  input.value = value;
  input.className = recurringBudgetInputClass;
  return input;
}

function createSelect(options, value) {
  const select = document.createElement("select");
  select.className = recurringBudgetInputClass;
  options.forEach(([optionValue, label]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    select.appendChild(option);
  });
  select.value = value;
  return select;
}

function createToggle(label, helper, checked = false) {
  const wrapper = document.createElement("label");
  wrapper.className = "flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3";
  const copy = document.createElement("span");
  copy.className = "min-w-0";
  const title = document.createElement("span");
  title.className = "block text-sm font-bold text-white/88";
  title.textContent = label;
  const detail = document.createElement("span");
  detail.className = "mt-1 block text-[10px] font-semibold leading-4 text-white/42";
  detail.textContent = helper;
  copy.append(title, detail);
  const input = createInput("checkbox");
  input.checked = checked;
  input.className = "mt-1 h-5 w-5 shrink-0 accent-emerald-400";
  wrapper.append(copy, input);
  return { wrapper, input };
}

export function installRecurringBudgetControls(group, draftRef) {
  if (!group || group.querySelector("[data-budget-recurring-controls]")) return;

  const initial = { ...createDefaultRecurringBudgetDraft(), ...(draftRef.current || {}) };
  const root = document.createElement("div");
  root.dataset.budgetRecurringControls = "true";
  root.className = "space-y-3 rounded-[22px] border border-emerald-300/12 bg-emerald-300/[0.025] p-3";

  const itemType = createSelect([
    ["category", "Budget category"],
    ["bill", "Bill"],
  ], initial.itemType);
  const recurringToggle = createToggle(
    "Make this a recurring bill",
    "Use the same shared bill record in Schedule and future budgets.",
    initial.makeRecurringBill
  );
  const details = document.createElement("div");
  details.className = "space-y-3";
  const dueDate = createInput("date", initial.dueDate);
  const recurrence = createSelect([
    ["one_time", "One-time"],
    ["weekly", "Weekly"],
    ["biweekly", "Every two weeks"],
    ["monthly", "Monthly"],
    ["custom", "Custom"],
  ], initial.recurrence);
  const customDates = createInput("text", initial.customDates);
  customDates.placeholder = "2026-07-16, 2026-08-16";
  const customDatesField = createField(
    "Custom dates",
    customDates,
    "Use YYYY-MM-DD separated by commas."
  );
  const amountType = createSelect([
    ["fixed", "Fixed"],
    ["variable", "May change"],
  ], initial.amountType);
  const autoInclude = createToggle(
    "Automatically include in future budgets",
    "CLARA adds each applicable occurrence once.",
    initial.autoIncludeInBudget
  );

  details.append(
    createField("Usual due date", dueDate),
    createField("Recurrence", recurrence),
    customDatesField,
    createField("Amount type", amountType),
    autoInclude.wrapper
  );
  root.append(createField("Item type", itemType), recurringToggle.wrapper, details);

  const actionButton = [...group.querySelectorAll("button")].find((button) => /add category|save category|update category/i.test(button.textContent || ""));
  if (actionButton) actionButton.before(root);
  else group.appendChild(root);

  const syncDraft = () => {
    const billSelected = itemType.value === "bill";
    recurringToggle.wrapper.hidden = !billSelected;
    details.hidden = !billSelected || !recurringToggle.input.checked;
    customDatesField.hidden = recurrence.value !== "custom";
    draftRef.current = {
      ...(draftRef.current || {}),
      itemType: itemType.value,
      makeRecurringBill: billSelected && recurringToggle.input.checked,
      dueDate: dueDate.value || toLocalDateKey(new Date()),
      recurrence: recurrence.value,
      customDates: customDates.value,
      amountType: amountType.value,
      autoIncludeInBudget: autoInclude.input.checked,
    };
  };

  [itemType, recurringToggle.input, dueDate, recurrence, customDates, amountType, autoInclude.input].forEach((control) => {
    control.addEventListener("change", syncDraft);
    control.addEventListener("input", syncDraft);
  });
  syncDraft();
}
