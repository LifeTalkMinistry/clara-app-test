import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import {
  INCOME_SOURCE_CATEGORIES,
  INCOME_SOURCE_STABILITY,
  appendIncomeSourceActivity,
  getIncomeHubLocalUserId,
  getIncomeSources,
  upsertIncomeSource,
} from "@/lib/incomeHubRepository";
import {
  normalizeRecurrenceRule,
  syncIncomeTimingFromSource,
  toLocalDateKey,
} from "@/lib/recurringCashFlowRepository";

const DEFAULT_CATEGORY = INCOME_SOURCE_CATEGORIES.includes("Salary")
  ? "Salary"
  : INCOME_SOURCE_CATEGORIES[0] || "Other Income";
const DEFAULT_STABILITY = INCOME_SOURCE_STABILITY.includes("Stable")
  ? "Stable"
  : INCOME_SOURCE_STABILITY[0] || "Irregular";
const todayKey = () => toLocalDateKey(new Date());

const recurrenceFromSource = (source) =>
  normalizeRecurrenceRule(source?.incomeRecurrence || source?.income_recurrence || {}, {
    kind: "income",
    fallbackDate: source?.expectedStartDate || source?.expected_start_date || new Date(),
  });

const createEmptyForm = () => ({
  name: "",
  category: DEFAULT_CATEGORY,
  stability: DEFAULT_STABILITY,
  usualIncomeDateEnabled: false,
  recurrenceType: "monthly",
  dayOfWeek: String(new Date().getDay()),
  startDate: todayKey(),
  firstDay: "15",
  secondDay: "30",
  dayOfMonth: "30",
  customDates: "",
  useForBudgetTiming: false,
});

const createFormFromSource = (source) => {
  const recurrence = recurrenceFromSource(source);
  const enabled = source?.usualIncomeDateEnabled === true || source?.usual_income_date_enabled === true;

  return {
    name: source?.name || "",
    category: INCOME_SOURCE_CATEGORIES.includes(source?.category) ? source.category : DEFAULT_CATEGORY,
    stability: INCOME_SOURCE_STABILITY.includes(source?.stability) ? source.stability : DEFAULT_STABILITY,
    usualIncomeDateEnabled: enabled,
    recurrenceType: recurrence.type || "monthly",
    dayOfWeek: String(recurrence.dayOfWeek ?? new Date().getDay()),
    startDate: recurrence.startDate || todayKey(),
    firstDay: String(recurrence.days?.[0] || 15),
    secondDay: String(recurrence.days?.[1] || 30),
    dayOfMonth: String(recurrence.dayOfMonth || 30),
    customDates: (recurrence.customDates || []).join(", "),
    useForBudgetTiming:
      enabled && (source?.useForBudgetTiming === true || source?.use_for_budget_timing === true),
  };
};

const buildRecurrence = (form) => {
  if (!form.usualIncomeDateEnabled) return null;

  const customDates = String(form.customDates || "")
    .split(/[\s,]+/)
    .map(toLocalDateKey)
    .filter(Boolean);

  return normalizeRecurrenceRule(
    {
      type: form.recurrenceType,
      startDate: form.startDate || todayKey(),
      dayOfWeek: Number(form.dayOfWeek || 0),
      dayOfMonth: Number(form.dayOfMonth || 30),
      days: [Number(form.firstDay || 15), Number(form.secondDay || 30)],
      customDates,
    },
    { kind: "income", fallbackDate: form.startDate || new Date() }
  );
};

function TimingToggle({ checked, onChange, title, helper, disabled = false }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white/88">{title}</span>
        <span className="mt-1 block text-[11px] font-semibold leading-4 text-white/44">{helper}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="mt-1 h-5 w-5 shrink-0 accent-emerald-400"
      />
    </label>
  );
}

export default function IncomeSourceCreateModalBase({ open = false, source = null, onClose }) {
  const { user } = useAuth();
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const timingTouchedRef = useRef(false);
  const isEditing = Boolean(source?.id);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    timingTouchedRef.current = false;
    setForm(isEditing ? createFormFromSource(source) : createEmptyForm());
    setError("");

    if (!isEditing) {
      getIncomeSources(localUserId)
        .then((sources) => {
          if (cancelled || timingTouchedRef.current) return;
          const alreadyHasBudgetTiming = (sources || []).some(
            (item) =>
              (item?.usualIncomeDateEnabled === true || item?.usual_income_date_enabled === true) &&
              (item?.useForBudgetTiming === true || item?.use_for_budget_timing === true)
          );
          setForm((current) => ({ ...current, useForBudgetTiming: !alreadyHasBudgetTiming }));
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [isEditing, localUserId, open, source]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) onClose?.();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open, saving]);

  const closeModal = () => {
    if (saving) return;
    setForm(createEmptyForm());
    setError("");
    onClose?.();
  };

  const saveSource = async () => {
    const sourceName = form.name.trim();
    if (!sourceName) {
      setError("Source name is required.");
      return;
    }

    const timestamp = new Date().toISOString();
    const recurrence = buildRecurrence(form);
    const activityLog = appendIncomeSourceActivity(source || {}, {
      type: isEditing ? "source_updated" : "source_created",
      sourceName,
      createdAt: timestamp,
    });

    try {
      setSaving(true);
      setError("");

      const saved = await upsertIncomeSource(localUserId, {
        ...(source || {}),
        id: source?.id,
        name: sourceName,
        category: form.category || DEFAULT_CATEGORY,
        stability: form.stability || DEFAULT_STABILITY,
        totalMoneyIn: source?.totalMoneyIn ?? source?.total_money_in ?? 0,
        total_money_in: source?.total_money_in ?? source?.totalMoneyIn ?? 0,
        totalMoneyOut: source?.totalMoneyOut ?? source?.total_money_out ?? 0,
        total_money_out: source?.total_money_out ?? source?.totalMoneyOut ?? 0,
        currentBalance: source?.currentBalance ?? source?.current_balance ?? 0,
        current_balance: source?.current_balance ?? source?.currentBalance ?? 0,
        usualIncomeDateEnabled: form.usualIncomeDateEnabled,
        usual_income_date_enabled: form.usualIncomeDateEnabled,
        incomeRecurrence: recurrence,
        income_recurrence: recurrence,
        useForBudgetTiming: form.usualIncomeDateEnabled && form.useForBudgetTiming,
        use_for_budget_timing: form.usualIncomeDateEnabled && form.useForBudgetTiming,
        incomeActivityLog: activityLog,
        income_activity_log: activityLog,
        lastActivityAt: isEditing ? source?.lastActivityAt || source?.last_activity_at || timestamp : timestamp,
        last_activity_at: isEditing ? source?.last_activity_at || source?.lastActivityAt || timestamp : timestamp,
        createdAt: source?.createdAt || source?.created_at,
        created_at: source?.created_at || source?.createdAt,
      });

      try {
        syncIncomeTimingFromSource(localUserId, saved);
      } catch (timingError) {
        console.warn("CLARA income timing sync warning:", timingError);
      }

      setForm(createEmptyForm());
      onClose?.();
    } catch (saveError) {
      console.error("CLARA income source save error:", saveError);
      setError(isEditing ? "Unable to update source. Please try again." : "Unable to create source. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[120] flex min-h-[100svh] items-start justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_20%,rgba(15,23,42,0.42),rgba(2,6,23,0.72)_54%,rgba(2,6,23,0.86))] px-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-0 backdrop-blur-[16px]"
      onClick={closeModal}
    >
      <div
        className="relative z-[200] flex max-h-[calc(100svh-1.25rem)] w-full max-w-[402px] overflow-visible rounded-[34px] border border-cyan-100/[0.18] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.14),transparent_42%),linear-gradient(135deg,rgba(5,44,62,0.99),rgba(7,20,48,0.995)_48%,rgba(38,16,77,0.995))] shadow-[0_28px_90px_rgba(0,0,0,0.62),0_0_0_1px_rgba(255,255,255,0.08),0_0_54px_rgba(34,211,238,0.12)]"
        onClick={(event) => event.stopPropagation()}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            saveSource();
          }}
          className="flex max-h-[calc(100svh-1.25rem)] min-h-0 w-full flex-col overflow-visible"
        >
          <div className="shrink-0 border-b border-white/10 bg-white/[0.035] px-5 py-3.5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[28px] font-black tracking-[-0.04em] text-white">
                  {isEditing ? "Edit income source" : "Create income source"}
                </h3>
                <p className="mt-1 max-w-[270px] text-[13px] font-semibold leading-5 text-white/64">
                  {isEditing ? "Update where this money comes from." : "Add a new place where money comes from."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="mt-1 shrink-0 rounded-full border border-white/15 bg-white/[0.075] p-3 text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative z-[220] min-h-0 max-h-[calc(100svh-10rem)] space-y-3 overflow-y-auto overflow-x-visible overscroll-contain px-5 py-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FinanceField label="Source name" helper={error}>
              <input
                type="text"
                value={form.name}
                onChange={(event) => {
                  setForm((prev) => ({ ...prev, name: event.target.value }));
                  if (error) setError("");
                }}
                placeholder="Salary, Online Selling, Freelance, Allowance"
                className={financeInputClassName}
                autoFocus
              />
            </FinanceField>

            <FinanceField label="Category">
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className={financeInputClassName}
              >
                {INCOME_SOURCE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </FinanceField>

            <FinanceField label="Stability">
              <select
                value={form.stability}
                onChange={(event) => setForm((prev) => ({ ...prev, stability: event.target.value }))}
                className={financeInputClassName}
              >
                {INCOME_SOURCE_STABILITY.map((stability) => (
                  <option key={stability} value={stability}>{stability}</option>
                ))}
              </select>
            </FinanceField>

            <TimingToggle
              checked={form.usualIncomeDateEnabled}
              onChange={(checked) => {
                timingTouchedRef.current = true;
                setForm((prev) => ({ ...prev, usualIncomeDateEnabled: checked }));
              }}
              title="Set usual income date"
              helper="Optional. CLARA will remember when this source is normally expected."
              disabled={saving}
            />

            {form.usualIncomeDateEnabled ? (
              <div className="space-y-3 rounded-[22px] border border-white/10 bg-white/[0.025] p-3">
                <FinanceField label="Usual timing">
                  <select
                    value={form.recurrenceType}
                    onChange={(event) => setForm((prev) => ({ ...prev, recurrenceType: event.target.value }))}
                    className={financeInputClassName}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Every two weeks</option>
                    <option value="twice_monthly">Twice a month</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom dates</option>
                  </select>
                </FinanceField>

                {form.recurrenceType === "weekly" ? (
                  <FinanceField label="Weekday">
                    <select value={form.dayOfWeek} onChange={(event) => setForm((prev) => ({ ...prev, dayOfWeek: event.target.value }))} className={financeInputClassName}>
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => (
                        <option key={day} value={String(index)}>{day}</option>
                      ))}
                    </select>
                  </FinanceField>
                ) : null}

                {form.recurrenceType === "biweekly" ? (
                  <FinanceField label="Starting date">
                    <input type="date" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} className={financeInputClassName} />
                  </FinanceField>
                ) : null}

                {form.recurrenceType === "twice_monthly" ? (
                  <div className="grid grid-cols-2 gap-3">
                    <FinanceField label="First day">
                      <input type="number" min="1" max="31" value={form.firstDay} onChange={(event) => setForm((prev) => ({ ...prev, firstDay: event.target.value }))} className={financeInputClassName} />
                    </FinanceField>
                    <FinanceField label="Second day">
                      <input type="number" min="1" max="31" value={form.secondDay} onChange={(event) => setForm((prev) => ({ ...prev, secondDay: event.target.value }))} className={financeInputClassName} />
                    </FinanceField>
                  </div>
                ) : null}

                {form.recurrenceType === "monthly" ? (
                  <FinanceField label="Calendar day">
                    <input type="number" min="1" max="31" value={form.dayOfMonth} onChange={(event) => setForm((prev) => ({ ...prev, dayOfMonth: event.target.value }))} className={financeInputClassName} />
                  </FinanceField>
                ) : null}

                {form.recurrenceType === "custom" ? (
                  <FinanceField label="Custom dates" helper="Use YYYY-MM-DD, separated by commas.">
                    <input type="text" value={form.customDates} onChange={(event) => setForm((prev) => ({ ...prev, customDates: event.target.value }))} placeholder="2026-07-15, 2026-07-30" className={financeInputClassName} />
                  </FinanceField>
                ) : null}

                <TimingToggle
                  checked={form.useForBudgetTiming}
                  onChange={(checked) => {
                    timingTouchedRef.current = true;
                    setForm((prev) => ({ ...prev, useForBudgetTiming: checked }));
                  }}
                  title="Use this income for budget timing"
                  helper="CLARA can measure the current cycle and days until the next expected income."
                  disabled={saving}
                />
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-white/10 bg-[#071120]/92 px-5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl">
            <div className="grid grid-cols-[0.82fr_1.18fr] gap-2.5">
              <button type="button" onClick={closeModal} disabled={saving} className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/76 transition hover:bg-white/[0.10] hover:text-white disabled:cursor-not-allowed disabled:opacity-55">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)] transition disabled:cursor-not-allowed disabled:opacity-55">
                {saving ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save Source" : "Create Source"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
