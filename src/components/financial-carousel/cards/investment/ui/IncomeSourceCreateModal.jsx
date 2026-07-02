import { useEffect, useMemo, useRef } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
  updateIncomeSource,
} from "@/lib/incomeHubRepository";
import {
  normalizeRecurrenceRule,
  syncIncomeTimingFromSource,
  toLocalDateKey,
} from "@/lib/recurringCashFlowRepository";
import IncomeSourceCreateModalBase from "./IncomeSourceCreateModalBase";

const INPUT_CLASS = "w-full rounded-2xl border border-white/10 bg-[#0b1128] px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-300/32";

function createField(label, control) {
  const wrapper = document.createElement("label");
  wrapper.className = "block space-y-2";
  const caption = document.createElement("span");
  caption.className = "block text-[11px] font-black uppercase tracking-[0.14em] text-white/48";
  caption.textContent = label;
  wrapper.append(caption, control);
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

function createToggle(label, helper, checked = false) {
  const wrapper = document.createElement("label");
  wrapper.className = "flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3";
  const text = document.createElement("span");
  text.className = "min-w-0";
  const title = document.createElement("span");
  title.className = "block text-sm font-bold text-white/88";
  title.textContent = label;
  const detail = document.createElement("span");
  detail.className = "mt-1 block text-[11px] font-semibold leading-4 text-white/44";
  detail.textContent = helper;
  text.append(title, detail);
  const input = createInput("checkbox");
  input.checked = checked;
  input.className = "mt-1 h-5 w-5 shrink-0 accent-emerald-400";
  wrapper.append(text, input);
  return { wrapper, input };
}

function recurrenceFromSource(source) {
  return normalizeRecurrenceRule(source?.incomeRecurrence || source?.income_recurrence || {}, {
    kind: "income",
    fallbackDate: source?.expectedStartDate || source?.expected_start_date || new Date(),
  });
}

function installTimingControls(container, source, firstBudgetTimingDefault) {
  if (!container || container.querySelector("[data-income-timing-controls]")) return null;

  const recurrence = recurrenceFromSource(source);
  const enabled = source?.usualIncomeDateEnabled === true || source?.usual_income_date_enabled === true;
  const useForBudgetTiming = enabled
    ? source?.useForBudgetTiming === true || source?.use_for_budget_timing === true
    : firstBudgetTimingDefault;

  const root = document.createElement("div");
  root.dataset.incomeTimingControls = "true";
  root.className = "space-y-3";

  const enabledToggle = createToggle(
    "Set usual income date",
    "Optional. CLARA will remember when this source is normally expected.",
    enabled
  );
  const details = document.createElement("div");
  details.className = "space-y-3 rounded-[22px] border border-white/10 bg-white/[0.025] p-3";

  const recurrenceType = createSelect([
    ["weekly", "Weekly"],
    ["biweekly", "Every two weeks"],
    ["twice_monthly", "Twice a month"],
    ["monthly", "Monthly"],
    ["custom", "Custom dates"],
  ], recurrence.type || "monthly");
  recurrenceType.dataset.incomeRecurrenceType = "true";

  const dynamic = document.createElement("div");
  dynamic.className = "space-y-3";
  dynamic.dataset.incomeTimingDynamic = "true";

  const budgetToggle = createToggle(
    "Use this income for budget timing",
    "CLARA can measure the current cycle and days until the next expected income.",
    useForBudgetTiming
  );
  budgetToggle.input.dataset.useForBudgetTiming = "true";

  details.append(createField("Usual timing", recurrenceType), dynamic, budgetToggle.wrapper);
  root.append(enabledToggle.wrapper, details);
  container.appendChild(root);

  const renderDynamic = () => {
    dynamic.replaceChildren();
    const type = recurrenceType.value;

    if (type === "weekly") {
      const weekday = createSelect([
        ["0", "Sunday"], ["1", "Monday"], ["2", "Tuesday"], ["3", "Wednesday"],
        ["4", "Thursday"], ["5", "Friday"], ["6", "Saturday"],
      ], String(recurrence.dayOfWeek ?? new Date().getDay()));
      weekday.dataset.incomeWeekday = "true";
      dynamic.append(createField("Weekday", weekday));
    } else if (type === "biweekly") {
      const startDate = createInput("date", recurrence.startDate || toLocalDateKey(new Date()));
      startDate.dataset.incomeStartDate = "true";
      dynamic.append(createField("Starting date", startDate));
    } else if (type === "twice_monthly") {
      const grid = document.createElement("div");
      grid.className = "grid grid-cols-2 gap-3";
      const first = createInput("number", String(recurrence.days?.[0] || 15));
      first.min = "1";
      first.max = "31";
      first.dataset.incomeFirstDay = "true";
      const second = createInput("number", String(recurrence.days?.[1] || 30));
      second.min = "1";
      second.max = "31";
      second.dataset.incomeSecondDay = "true";
      grid.append(createField("First day", first), createField("Second day", second));
      dynamic.append(grid);
    } else if (type === "monthly") {
      const day = createInput("number", String(recurrence.dayOfMonth || 30));
      day.min = "1";
      day.max = "31";
      day.dataset.incomeMonthlyDay = "true";
      dynamic.append(createField("Calendar day", day));
    } else {
      const custom = createInput("text", (recurrence.customDates || []).join(", "));
      custom.placeholder = "2026-07-15, 2026-07-30";
      custom.dataset.incomeCustomDates = "true";
      dynamic.append(createField("Custom dates (YYYY-MM-DD)", custom));
    }
  };

  const syncVisibility = () => {
    details.hidden = !enabledToggle.input.checked;
  };

  enabledToggle.input.dataset.incomeTimingEnabled = "true";
  enabledToggle.input.addEventListener("change", syncVisibility);
  recurrenceType.addEventListener("change", renderDynamic);
  renderDynamic();
  syncVisibility();
  return root;
}

function readTimingDraft(form) {
  const root = form?.querySelector("[data-income-timing-controls]");
  if (!root) return null;
  const enabled = root.querySelector("[data-income-timing-enabled]")?.checked === true;
  const type = root.querySelector("[data-income-recurrence-type]")?.value || "monthly";
  const customDates = String(root.querySelector("[data-income-custom-dates]")?.value || "")
    .split(/[\s,]+/)
    .map(toLocalDateKey)
    .filter(Boolean);
  const recurrence = normalizeRecurrenceRule({
    type,
    startDate: root.querySelector("[data-income-start-date]")?.value || toLocalDateKey(new Date()),
    dayOfWeek: Number(root.querySelector("[data-income-weekday]")?.value || 0),
    dayOfMonth: Number(root.querySelector("[data-income-monthly-day]")?.value || 30),
    days: [
      Number(root.querySelector("[data-income-first-day]")?.value || 15),
      Number(root.querySelector("[data-income-second-day]")?.value || 30),
    ],
    customDates,
  }, { kind: "income" });

  return {
    enabled,
    recurrence: enabled ? recurrence : null,
    useForBudgetTiming: enabled && root.querySelector("[data-use-for-budget-timing]")?.checked === true,
  };
}

export default function IncomeSourceCreateModal(props) {
  const { user } = useAuth();
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!props.open || typeof document === "undefined") return undefined;
    let cancelled = false;
    let firstBudgetTimingDefault = false;

    getIncomeSources(localUserId).then((sources) => {
      firstBudgetTimingDefault = !(sources || []).some((item) =>
        (item?.usualIncomeDateEnabled === true || item?.usual_income_date_enabled === true) &&
        (item?.useForBudgetTiming === true || item?.use_for_budget_timing === true)
      );
    }).catch(() => {});

    const enhance = () => {
      if (cancelled) return;
      const heading = [...document.querySelectorAll("h3")].find((node) => /income source/i.test(node.textContent || ""));
      const form = heading?.closest("form");
      const scroller = form?.querySelector(".overflow-y-auto");
      if (!form || !scroller) return;
      installTimingControls(scroller, props.source, firstBudgetTimingDefault);
      if (form.dataset.incomeTimingSubmitBound === "true") return;
      form.dataset.incomeTimingSubmitBound = "true";

      form.addEventListener("submit", () => {
        if (syncingRef.current) return;
        const draft = readTimingDraft(form);
        const sourceName = form.querySelector('input[type="text"]')?.value?.trim();
        if (!draft || !sourceName) return;

        const persist = async (attempt = 0) => {
          const sources = await getIncomeSources(localUserId);
          const saved = props.source?.id
            ? sources.find((item) => String(item.id) === String(props.source.id))
            : sources.find((item) => String(item.name || "").trim().toLowerCase() === sourceName.toLowerCase());
          if (!saved && attempt < 8) {
            window.setTimeout(() => persist(attempt + 1), 120);
            return;
          }
          if (!saved) return;

          syncingRef.current = true;
          try {
            const updated = await updateIncomeSource(localUserId, saved.id, {
              usualIncomeDateEnabled: draft.enabled,
              usual_income_date_enabled: draft.enabled,
              incomeRecurrence: draft.recurrence,
              income_recurrence: draft.recurrence,
              useForBudgetTiming: draft.useForBudgetTiming,
              use_for_budget_timing: draft.useForBudgetTiming,
            });
            syncIncomeTimingFromSource(localUserId, updated || { ...saved, ...draft });
          } finally {
            syncingRef.current = false;
          }
        };

        window.setTimeout(() => persist(), 0);
      }, true);
    };

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    enhance();

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [localUserId, props.open, props.source]);

  return <IncomeSourceCreateModalBase {...props} />;
}
