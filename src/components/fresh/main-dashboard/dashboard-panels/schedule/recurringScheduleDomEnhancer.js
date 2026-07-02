import {
  normalizeRecurrenceRule,
  toLocalDateKey,
} from "@/lib/recurringCashFlowRepository";

const INPUT_CLASS = "w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-fuchsia-300/32";
const NOTE_CLASS = "w-full resize-none rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-fuchsia-300/32";

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
  caption.className = "block text-[10px] font-black uppercase tracking-[.16em] text-white/42";
  caption.textContent = label;
  field.append(caption, control);
  if (helper) {
    const detail = document.createElement("span");
    detail.className = "block text-[10px] font-semibold leading-4 text-white/38";
    detail.textContent = helper;
    field.appendChild(detail);
  }
  return field;
}

function createToggle(label, helper, checked) {
  const field = document.createElement("label");
  field.className = "flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-fuchsia-300/14 bg-fuchsia-300/[.045] px-4 py-3";
  const copy = document.createElement("span");
  copy.className = "min-w-0";
  const title = document.createElement("span");
  title.className = "block text-sm font-black text-white/88";
  title.textContent = label;
  const detail = document.createElement("span");
  detail.className = "mt-1 block text-[10px] font-semibold leading-4 text-white/42";
  detail.textContent = helper;
  copy.append(title, detail);
  const input = createInput("checkbox");
  input.checked = checked;
  input.className = "mt-1 h-5 w-5 shrink-0 accent-fuchsia-300";
  field.append(copy, input);
  return { field, input };
}

function getNativeValueSetter(element) {
  if (!element) return null;
  const prototype = Object.getPrototypeOf(element);
  return Object.getOwnPropertyDescriptor(prototype, "value")?.set || null;
}

function updateControlledValue(element, value) {
  if (!element) return;
  const nextValue = String(value ?? "");
  const setter = getNativeValueSetter(element);
  if (setter) setter.call(element, nextValue);
  else element.value = nextValue;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function findCategorySelect(form) {
  return [...form.querySelectorAll("select")].find((select) =>
    !select.closest("[data-schedule-bill-controls]") &&
    [...select.options].some((option) => option.value === "Bill")
  ) || null;
}

function findGenericRows(form) {
  const titleInput = form.querySelector('input[placeholder="Schedule title"], input[placeholder="Bill title"]');
  const dateInput = [...form.querySelectorAll('input[type="date"]')].find(
    (input) => !input.closest("[data-schedule-bill-controls]")
  );
  const timeInput = [...form.querySelectorAll('input[type="time"]')].find(
    (input) => !input.closest("[data-schedule-bill-controls]")
  );
  const category = findCategorySelect(form);
  const textarea = [...form.querySelectorAll("textarea")].find(
    (input) => !input.closest("[data-schedule-bill-controls]")
  );

  return {
    titleInput,
    dateInput,
    timeInput,
    category,
    textarea,
    titleRow: titleInput,
    dateRow: dateInput?.closest("div.grid") || dateInput?.parentElement,
    categoryRow: category?.closest("div.grid") || category?.parentElement,
    descriptionRow: textarea?.closest("div.rounded-\[22px\]") || textarea?.parentElement,
  };
}

function setGenericVisibility(form, hidden) {
  const rows = findGenericRows(form);
  [rows.titleRow, rows.dateRow, rows.categoryRow, rows.descriptionRow]
    .filter(Boolean)
    .forEach((node) => {
      node.hidden = hidden;
      node.dataset.billGenericHidden = hidden ? "true" : "false";
    });
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

function updateBillHeader(form, isBill) {
  const dialog = form.closest('[role="dialog"]');
  const heading = dialog?.querySelector("h3");
  const eyebrow = heading?.parentElement?.querySelector("p");
  let helper = dialog?.querySelector("[data-bill-modal-helper]");

  if (heading && !heading.dataset.defaultScheduleHeading) {
    heading.dataset.defaultScheduleHeading = heading.textContent || "Add schedule";
  }
  if (eyebrow && !eyebrow.dataset.defaultScheduleEyebrow) {
    eyebrow.dataset.defaultScheduleEyebrow = eyebrow.textContent || "Schedule";
  }

  if (!helper && heading?.parentElement) {
    helper = document.createElement("p");
    helper.dataset.billModalHelper = "true";
    helper.className = "mt-1 max-w-[310px] text-xs font-semibold leading-5 text-white/48";
    helper.textContent = "Set the due pattern once so CLARA can prepare the right budget cycle.";
    heading.after(helper);
  }

  if (heading) heading.textContent = isBill ? "Add bill" : heading.dataset.defaultScheduleHeading || "Add schedule";
  if (eyebrow) eyebrow.textContent = isBill ? "Bill setup" : eyebrow.dataset.defaultScheduleEyebrow || "Schedule";
  if (helper) helper.hidden = !isBill;

  const card = form.parentElement;
  if (card) {
    card.classList.toggle("max-h-[92svh]", isBill);
    card.classList.toggle("overflow-y-auto", isBill);
  }
}

function syncBillMirrors(form) {
  const controls = form.querySelector("[data-schedule-bill-controls]");
  if (!controls) return;
  const generic = findGenericRows(form);
  const pairs = [
    [controls.querySelector("[data-bill-title-mirror]"), generic.titleInput],
    [controls.querySelector("[data-bill-date-mirror]"), generic.dateInput],
    [controls.querySelector("[data-bill-time-mirror]"), generic.timeInput],
    [controls.querySelector("[data-bill-note-mirror]"), generic.textarea],
    [controls.querySelector("[data-bill-type-mirror]"), generic.category],
  ];

  pairs.forEach(([mirror, original]) => {
    if (!mirror || !original || document.activeElement === mirror) return;
    if (mirror.value !== original.value) mirror.value = original.value;
  });
}

function bindMirror(mirror, original, form) {
  if (!mirror || !original) return;
  mirror.value = original.value || mirror.value || "";
  const sync = () => {
    updateControlledValue(original, mirror.value);
    window.setTimeout(() => refreshScheduleBillMode(form), 0);
  };
  mirror.addEventListener("input", sync);
  mirror.addEventListener("change", sync);
}

export function refreshScheduleBillMode(form) {
  if (!form) return;
  const category = findCategorySelect(form);
  const isBill = category?.value === "Bill";
  const controls = form.querySelector("[data-schedule-bill-controls]");
  const recurrence = controls?.querySelector("[data-bill-recurrence]")?.value || "one_time";
  const buttons = [...form.querySelectorAll("button")];
  const impactButton = buttons.find((button) => /calculate money impact|check money impact/i.test(button.textContent || ""));
  const directSave = buttons.find((button) => /save without impact|save recurring bill|save bill/i.test(button.textContent || ""));

  if (controls) controls.hidden = !isBill;
  setGenericVisibility(form, isBill);
  updateBillHeader(form, isBill);
  syncBillMirrors(form);

  if (impactButton) {
    impactButton.dataset.billImpactTrigger = isBill ? "true" : "false";
    impactButton.classList.toggle("border-fuchsia-300/26", isBill);
    impactButton.classList.toggle("bg-fuchsia-300/[.12]", isBill);
    setButtonVisualLabel(
      impactButton,
      isBill ? "Check budget impact" : "Calculate money impact",
      isBill ? "Calculate money impact" : ""
    );
  }

  if (directSave) {
    directSave.dataset.billDirectSave = isBill ? "true" : "false";
    directSave.classList.toggle("text-white/80", isBill);
    directSave.classList.toggle("bg-white/[.06]", isBill);
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

  const generic = findGenericRows(form);
  if (!generic.textarea || !generic.titleInput || !generic.dateInput || !generic.category) return;
  const insertionPoint = generic.descriptionRow || generic.textarea.parentElement;

  const root = document.createElement("section");
  root.dataset.scheduleBillControls = "true";
  root.className = "space-y-4 rounded-[26px] border border-fuchsia-300/18 bg-[radial-gradient(circle_at_top_right,rgba(217,70,239,.14),transparent_38%),linear-gradient(145deg,rgba(10,27,55,.98),rgba(25,14,58,.98))] p-4 shadow-[0_18px_50px_rgba(0,0,0,.28)]";

  const intro = document.createElement("div");
  intro.className = "rounded-[22px] border border-fuchsia-300/14 bg-fuchsia-300/[.055] px-4 py-3";
  const badge = document.createElement("p");
  badge.className = "text-[10px] font-black uppercase tracking-[.18em] text-fuchsia-100/68";
  badge.textContent = "Financial schedule";
  const introTitle = document.createElement("h4");
  introTitle.className = "mt-1 text-lg font-black tracking-[-.025em] text-white";
  introTitle.textContent = "Set the bill once. CLARA prepares for it.";
  const introCopy = document.createElement("p");
  introCopy.className = "mt-1 text-[11px] font-semibold leading-5 text-white/46";
  introCopy.textContent = "The due date and recurrence determine when this bill enters your active budget.";
  intro.append(badge, introTitle, introCopy);

  const title = createInput("text", generic.titleInput.value);
  title.placeholder = "Electricity, rent, internet, loan...";
  title.dataset.billTitleMirror = "true";

  const dueDate = createInput("date", generic.dateInput.value || toLocalDateKey(new Date()));
  dueDate.dataset.billDateMirror = "true";

  const reminderTime = createInput("time", generic.timeInput?.value || "");
  reminderTime.dataset.billTimeMirror = "true";

  const amount = createInput("number");
  amount.min = "0";
  amount.step = "0.01";
  amount.placeholder = "0";
  amount.inputMode = "decimal";
  amount.dataset.billExpectedAmount = "true";

  const recurrence = createSelect([
    ["one_time", "One-time"],
    ["weekly", "Weekly"],
    ["biweekly", "Every two weeks"],
    ["monthly", "Monthly"],
    ["custom", "Custom dates"],
  ], "monthly");
  recurrence.dataset.billRecurrence = "true";

  const customDates = createInput("text");
  customDates.placeholder = "2026-07-16, 2026-08-16";
  customDates.dataset.billCustomDates = "true";
  const customField = createField("Custom dates", customDates, "Use YYYY-MM-DD separated by commas.");
  customField.hidden = true;

  const amountType = createSelect([
    ["fixed", "Fixed amount"],
    ["variable", "May change"],
  ], "fixed");
  amountType.dataset.billAmountType = "true";

  const typeMirror = createSelect(
    [...generic.category.options].map((option) => [option.value, option.textContent || option.value]),
    "Bill"
  );
  typeMirror.dataset.billTypeMirror = "true";

  const note = document.createElement("textarea");
  note.rows = 2;
  note.value = generic.textarea.value || "";
  note.placeholder = "Optional note about this bill...";
  note.className = NOTE_CLASS;
  note.dataset.billNoteMirror = "true";

  const autoInclude = createToggle(
    "Automatically include in my budget",
    "CLARA adds each applicable occurrence once when its due date falls inside the active budget cycle.",
    true
  );
  autoInclude.input.dataset.billAutoInclude = "true";
  autoInclude.input.dataset.manuallyChanged = "false";
  autoInclude.input.addEventListener("change", () => {
    autoInclude.input.dataset.manuallyChanged = "true";
  });

  const dateGrid = document.createElement("div");
  dateGrid.className = "grid grid-cols-2 gap-3";
  dateGrid.append(
    createField("Due date", dueDate),
    createField("Reminder time", reminderTime, "Optional")
  );

  const amountGrid = document.createElement("div");
  amountGrid.className = "grid grid-cols-2 gap-3";
  amountGrid.append(
    createField("Expected amount", amount),
    createField("Repeats", recurrence)
  );

  const behaviorGrid = document.createElement("div");
  behaviorGrid.className = "grid grid-cols-2 gap-3";
  behaviorGrid.append(
    createField("Amount type", amountType),
    createField("Schedule type", typeMirror, "Change this to return to the normal schedule form.")
  );

  recurrence.addEventListener("change", () => {
    customField.hidden = recurrence.value !== "custom";
    if (autoInclude.input.dataset.manuallyChanged !== "true") {
      autoInclude.input.checked = recurrence.value !== "one_time";
    }
    refreshScheduleBillMode(form);
  });

  root.append(
    intro,
    createField("Bill name", title),
    dateGrid,
    amountGrid,
    customField,
    behaviorGrid,
    autoInclude.field,
    createField("Note", note, "Optional. Keep this focused on the bill itself.")
  );
  insertionPoint.before(root);

  bindMirror(title, generic.titleInput, form);
  bindMirror(dueDate, generic.dateInput, form);
  bindMirror(reminderTime, generic.timeInput, form);
  bindMirror(note, generic.textarea, form);
  bindMirror(typeMirror, generic.category, form);

  if (generic.category.dataset.billModeBound !== "true") {
    generic.category.dataset.billModeBound = "true";
    generic.category.addEventListener("change", () => refreshScheduleBillMode(form));
  }

  refreshScheduleBillMode(form);
}

export function readScheduleBillDraft(form) {
  const category = findCategorySelect(form);
  if (!form || category?.value !== "Bill") return null;
  const generic = findGenericRows(form);
  const controls = form.querySelector("[data-schedule-bill-controls]");
  const dueDate = generic.dateInput?.value || controls?.querySelector("[data-bill-date-mirror]")?.value || toLocalDateKey(new Date());
  const due = new Date(`${dueDate}T12:00:00`);
  const recurrenceType = controls?.querySelector("[data-bill-recurrence]")?.value || "one_time";
  const customDates = String(controls?.querySelector("[data-bill-custom-dates]")?.value || "")
    .split(/[\s,]+/)
    .map((value) => toLocalDateKey(value))
    .filter(Boolean);

  return {
    title: cleanText(generic.titleInput?.value || controls?.querySelector("[data-bill-title-mirror]")?.value),
    dueDate,
    time: generic.timeInput?.value || controls?.querySelector("[data-bill-time-mirror]")?.value || "",
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
    description: cleanText(generic.textarea?.value || controls?.querySelector("[data-bill-note-mirror]")?.value),
    createdOrigin: "schedule",
    scheduleBaseDate: dueDate,
  };
}
