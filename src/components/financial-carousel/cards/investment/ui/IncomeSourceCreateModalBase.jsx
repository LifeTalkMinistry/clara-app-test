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
  getIncomeSourceMasterCycleConfig,
  isIncomeSourceMasterPayCycle,
  setIncomeSourceAsMasterPayCycle,
} from "@/lib/clara-master-pay-cycle-repository";
import {
  normalizeRecurrenceRule,
  toLocalDateKey,
} from "@/lib/recurringCashFlowRepository";
import { syncStableIncomeTimingSource } from "@/lib/stableIncomeTimingAuthority";

const DEFAULT_CATEGORY = INCOME_SOURCE_CATEGORIES.includes("Salary")
  ? "Salary"
  : INCOME_SOURCE_CATEGORIES[0] || "Other Income";
const DEFAULT_STABILITY = INCOME_SOURCE_STABILITY.includes("Stable")
  ? "Stable"
  : INCOME_SOURCE_STABILITY[0] || "Irregular";
const todayKey = () => toLocalDateKey(new Date());
const isStableIncome = (value) => String(value || "").trim().toLowerCase() === "stable";
const cleanPositiveMoney = (value) => {
  const number = Number(String(value ?? "").replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

const recurrenceFromSource = (source) =>
  normalizeRecurrenceRule(source?.incomeRecurrence || source?.income_recurrence || {}, {
    kind: "income",
    fallbackDate: source?.expectedStartDate || source?.expected_start_date || new Date(),
  });

const createEmptyForm = () => ({
  name: "",
  category: DEFAULT_CATEGORY,
  stability: DEFAULT_STABILITY,
  minimumStableIncome: "",
  usualIncomeDateEnabled: isStableIncome(DEFAULT_STABILITY),
  recurrenceType: "monthly",
  dayOfWeek: String(new Date().getDay()),
  startDate: todayKey(),
  firstDay: "15",
  secondDay: "30",
  dayOfMonth: "30",
  customDates: "",
  useForBudgetTiming: isStableIncome(DEFAULT_STABILITY),
  isMasterPayCycle: false,
  masterCycleMode: "income_schedule",
  customCycleStart: todayKey(),
  customCycleEnd: "",
});

const createFormFromSource = (source) => {
  const recurrence = recurrenceFromSource(source);
  const stable = isStableIncome(source?.stability);
  const enabled = source?.usualIncomeDateEnabled === true || source?.usual_income_date_enabled === true;
  const minimumStableIncome = cleanPositiveMoney(
    source?.minimumStableIncome ??
      source?.minimum_stable_income ??
      source?.minimumExpectedIncome ??
      source?.minimum_expected_income ??
      source?.expectedAmount ??
      source?.expected_amount
  );
  const masterConfig = getIncomeSourceMasterCycleConfig(source);

  return {
    name: source?.name || "",
    category: INCOME_SOURCE_CATEGORIES.includes(source?.category) ? source.category : DEFAULT_CATEGORY,
    stability: INCOME_SOURCE_STABILITY.includes(source?.stability) ? source.stability : DEFAULT_STABILITY,
    minimumStableIncome: minimumStableIncome > 0 ? String(minimumStableIncome) : "",
    usualIncomeDateEnabled: stable || enabled,
    recurrenceType: recurrence.type || "monthly",
    dayOfWeek: String(recurrence.dayOfWeek ?? new Date().getDay()),
    startDate: recurrence.startDate || todayKey(),
    firstDay: String(recurrence.days?.[0] || 15),
    secondDay: String(recurrence.days?.[1] || 30),
    dayOfMonth: String(recurrence.dayOfMonth || 30),
    customDates: (recurrence.customDates || []).join(", "),
    useForBudgetTiming:
      stable ||
      (enabled && (source?.useForBudgetTiming === true || source?.use_for_budget_timing === true)),
    isMasterPayCycle: isIncomeSourceMasterPayCycle(source),
    masterCycleMode: masterConfig.mode,
    customCycleStart: masterConfig.start || todayKey(),
    customCycleEnd: masterConfig.end || "",
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

function sameRecurrence(left, right) {
  return JSON.stringify(left || null) === JSON.stringify(right || null);
}

export default function IncomeSourceCreateModalBase({ open = false, source = null, onClose }) {
  const { user } = useAuth();
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stableIncomeError, setStableIncomeError] = useState("");
  const [impactConfirmation, setImpactConfirmation] = useState(null);
  const timingTouchedRef = useRef(false);
  const isEditing = Boolean(source?.id);
  const stable = isStableIncome(form.stability);
  const sourceIsCurrentMaster = Boolean(isEditing && isIncomeSourceMasterPayCycle(source));

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    timingTouchedRef.current = false;
    setForm(isEditing ? createFormFromSource(source) : createEmptyForm());
    setError("");
    setStableIncomeError("");
    setImpactConfirmation(null);

    getIncomeSources(localUserId)
      .then((sources) => {
        if (cancelled) return;
        const activeSources = Array.isArray(sources) ? sources : [];
        if (!isEditing && !timingTouchedRef.current) {
          const alreadyHasBudgetTiming = activeSources.some(
            (item) =>
              (item?.usualIncomeDateEnabled === true || item?.usual_income_date_enabled === true) &&
              (item?.useForBudgetTiming === true || item?.use_for_budget_timing === true)
          );
          const alreadyHasMaster = activeSources.some(isIncomeSourceMasterPayCycle);
          setForm((current) => ({
            ...current,
            useForBudgetTiming: isStableIncome(current.stability) ? true : !alreadyHasBudgetTiming,
            isMasterPayCycle: !alreadyHasMaster,
          }));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [isEditing, localUserId, open, source]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return undefined;
    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) {
        if (impactConfirmation) setImpactConfirmation(null);
        else onClose?.();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [impactConfirmation, onClose, open, saving]);

  const closeModal = () => {
    if (saving) return;
    setForm(createEmptyForm());
    setError("");
    setStableIncomeError("");
    setImpactConfirmation(null);
    onClose?.();
  };

  const validateMasterCycle = (recurrence) => {
    if (!form.isMasterPayCycle) return true;
    if (form.masterCycleMode === "custom") {
      const start = toLocalDateKey(form.customCycleStart);
      const end = toLocalDateKey(form.customCycleEnd);
      if (!start || !end || start >= end) {
        setError("Choose a valid custom cycle start and end date. The end date must be after the start date.");
        return false;
      }
      return true;
    }
    if (!recurrence) {
      setError("The Master Pay Cycle needs either a usual income schedule or a custom cycle.");
      return false;
    }
    return true;
  };

  const saveSource = async (confirmedImpact = false) => {
    const sourceName = form.name.trim();
    if (!sourceName) {
      setError("Source name is required.");
      return;
    }

    const minimumStableIncome = stable ? cleanPositiveMoney(form.minimumStableIncome) : 0;
    if (stable && minimumStableIncome <= 0) {
      setStableIncomeError("Enter the lowest amount you can reliably expect on each scheduled payday.");
      return;
    }

    if (stable && !form.usualIncomeDateEnabled) {
      setStableIncomeError("Stable income needs a usual income date so CLARA can schedule it.");
      return;
    }

    const recurrence = buildRecurrence(form);
    if (!validateMasterCycle(recurrence)) return;

    let sources = [];
    try {
      sources = await getIncomeSources(localUserId);
    } catch {
      sources = [];
    }

    const currentMaster = (sources || []).find(isIncomeSourceMasterPayCycle) || null;
    const proposedMasterChange = Boolean(
      form.isMasterPayCycle &&
      currentMaster &&
      String(currentMaster.id) !== String(source?.id || "")
    );
    const currentConfig = sourceIsCurrentMaster ? getIncomeSourceMasterCycleConfig(source) : null;
    const customChanged = Boolean(
      sourceIsCurrentMaster &&
      (currentConfig?.mode !== form.masterCycleMode ||
        (form.masterCycleMode === "custom" &&
          (currentConfig?.start !== toLocalDateKey(form.customCycleStart) ||
            currentConfig?.end !== toLocalDateKey(form.customCycleEnd))))
    );
    const recurrenceChanged = Boolean(
      sourceIsCurrentMaster &&
      form.masterCycleMode === "income_schedule" &&
      !sameRecurrence(recurrenceFromSource(source), recurrence)
    );

    if (!confirmedImpact && (proposedMasterChange || customChanged || recurrenceChanged)) {
      setImpactConfirmation({
        currentMasterName: currentMaster?.name || source?.name || "Current Master",
        proposedMasterName: sourceName,
      });
      return;
    }

    const timestamp = new Date().toISOString();
    const activityLog = appendIncomeSourceActivity(source || {}, {
      type: isEditing ? "source_updated" : "source_created",
      sourceName,
      createdAt: timestamp,
    });

    try {
      setSaving(true);
      setError("");
      setStableIncomeError("");
      setImpactConfirmation(null);

      const keepExistingMaster = sourceIsCurrentMaster;
      const saved = await upsertIncomeSource(localUserId, {
        ...(source || {}),
        id: source?.id,
        name: sourceName,
        category: form.category || DEFAULT_CATEGORY,
        stability: form.stability || DEFAULT_STABILITY,
        minimumStableIncome: stable ? minimumStableIncome : null,
        minimum_stable_income: stable ? minimumStableIncome : null,
        minimumExpectedIncome: stable ? minimumStableIncome : null,
        minimum_expected_income: stable ? minimumStableIncome : null,
        expectedAmount: stable ? minimumStableIncome : null,
        expected_amount: stable ? minimumStableIncome : null,
        totalMoneyIn: source?.totalMoneyIn ?? source?.total_money_in ?? 0,
        total_money_in: source?.total_money_in ?? source?.totalMoneyIn ?? 0,
        totalMoneyOut: source?.totalMoneyOut ?? source?.total_money_out ?? 0,
        total_money_out: source?.total_money_out ?? source?.totalMoneyOut ?? 0,
        currentBalance: source?.currentBalance ?? source?.current_balance ?? 0,
        current_balance: source?.current_balance ?? source?.currentBalance ?? 0,
        usualIncomeDateEnabled: stable || form.usualIncomeDateEnabled,
        usual_income_date_enabled: stable || form.usualIncomeDateEnabled,
        incomeRecurrence: recurrence,
        income_recurrence: recurrence,
        useForBudgetTiming: stable || (form.usualIncomeDateEnabled && form.useForBudgetTiming),
        use_for_budget_timing: stable || (form.usualIncomeDateEnabled && form.useForBudgetTiming),
        isMasterPayCycle: keepExistingMaster,
        is_master_pay_cycle: keepExistingMaster,
        masterPayCycle: keepExistingMaster,
        master_pay_cycle: keepExistingMaster,
        isMaster: keepExistingMaster,
        is_master: keepExistingMaster,
        incomeActivityLog: activityLog,
        income_activity_log: activityLog,
        lastActivityAt: isEditing ? source?.lastActivityAt || source?.last_activity_at || timestamp : timestamp,
        last_activity_at: isEditing ? source?.last_activity_at || source?.lastActivityAt || timestamp : timestamp,
        createdAt: source?.createdAt || source?.created_at,
        created_at: source?.created_at || source?.createdAt,
      });

      if (form.isMasterPayCycle) {
        await setIncomeSourceAsMasterPayCycle(localUserId, saved.id, {
          mode: form.masterCycleMode,
          customCycleStart: form.customCycleStart,
          customCycleEnd: form.customCycleEnd,
        });
      }

      try {
        syncStableIncomeTimingSource(localUserId, saved);
      } catch (timingError) {
        console.warn("CLARA income timing sync warning:", timingError);
      }

      setForm(createEmptyForm());
      onClose?.();
    } catch (saveError) {
      console.error("CLARA income source save error:", saveError);
      setError(saveError?.message || (isEditing ? "Unable to update source. Please try again." : "Unable to create source. Please try again."));
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
            saveSource(false);
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
                onChange={(event) => {
                  const nextStability = event.target.value;
                  timingTouchedRef.current = true;
                  setForm((prev) => ({
                    ...prev,
                    stability: nextStability,
                    usualIncomeDateEnabled: isStableIncome(nextStability) ? true : prev.usualIncomeDateEnabled,
                    useForBudgetTiming: isStableIncome(nextStability) ? true : prev.useForBudgetTiming,
                  }));
                  if (!isStableIncome(nextStability)) setStableIncomeError("");
                }}
                className={financeInputClassName}
              >
                {INCOME_SOURCE_STABILITY.map((stability) => (
                  <option key={stability} value={stability}>{stability}</option>
                ))}
              </select>
            </FinanceField>

            {stable ? (
              <FinanceField
                label="Lowest stable income"
                helper={stableIncomeError || "Required. Enter the lowest amount you can reliably expect on each scheduled payday."}
              >
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  value={form.minimumStableIncome}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, minimumStableIncome: event.target.value }));
                    if (stableIncomeError) setStableIncomeError("");
                  }}
                  placeholder="12000"
                  className={financeInputClassName}
                />
              </FinanceField>
            ) : null}

            <TimingToggle
              checked={form.usualIncomeDateEnabled}
              onChange={(checked) => {
                timingTouchedRef.current = true;
                if (stable) return;
                setForm((prev) => ({ ...prev, usualIncomeDateEnabled: checked }));
              }}
              title="Set usual income date"
              helper={stable
                ? "Required for Stable income. CLARA uses this as the expected payday schedule."
                : "Optional. CLARA will remember when this source is normally expected."}
              disabled={saving || stable}
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
                    <input type="text" value={form.customDates} onChange={(event) => setForm((prev) => ({ ...prev, customDates: event.target.value }))} placeholder="2026-09-15, 2026-09-30" className={financeInputClassName} />
                  </FinanceField>
                ) : null}

                <TimingToggle
                  checked={form.useForBudgetTiming}
                  onChange={(checked) => {
                    timingTouchedRef.current = true;
                    if (stable) return;
                    setForm((prev) => ({ ...prev, useForBudgetTiming: checked }));
                  }}
                  title="Use this income for budget timing"
                  helper={stable
                    ? "Required for Stable income so CLARA can measure days until this expected payday."
                    : "CLARA can remember this source's expected timing."}
                  disabled={saving || stable}
                />
              </div>
            ) : null}

            <div className="space-y-3 rounded-[22px] border border-cyan-200/15 bg-cyan-400/[0.045] p-3">
              <TimingToggle
                checked={form.isMasterPayCycle}
                onChange={(checked) => {
                  if (sourceIsCurrentMaster && !checked) return;
                  setForm((prev) => ({ ...prev, isMasterPayCycle: checked }));
                  if (error) setError("");
                }}
                title="Master Pay Cycle"
                helper={sourceIsCurrentMaster
                  ? "This is the active Master. To change it, open another income source and make that source the Master."
                  : "Controls CLARA's active financial timeframe. The income amount itself does not enter the Means Score."}
                disabled={saving || sourceIsCurrentMaster}
              />

              {form.isMasterPayCycle ? (
                <>
                  <FinanceField label="Cycle authority" helper="Choose the dates CLARA should use for the active financial cycle.">
                    <select
                      value={form.masterCycleMode}
                      onChange={(event) => setForm((prev) => ({ ...prev, masterCycleMode: event.target.value }))}
                      className={financeInputClassName}
                    >
                      <option value="income_schedule">Use usual income schedule</option>
                      <option value="custom">Customize Cycle</option>
                    </select>
                  </FinanceField>

                  {form.masterCycleMode === "custom" ? (
                    <div className="grid grid-cols-2 gap-3">
                      <FinanceField label="Cycle start">
                        <input
                          type="date"
                          value={form.customCycleStart}
                          onChange={(event) => setForm((prev) => ({ ...prev, customCycleStart: event.target.value }))}
                          className={financeInputClassName}
                        />
                      </FinanceField>
                      <FinanceField label="Cycle end">
                        <input
                          type="date"
                          value={form.customCycleEnd}
                          min={form.customCycleStart || undefined}
                          onChange={(event) => setForm((prev) => ({ ...prev, customCycleEnd: event.target.value }))}
                          className={financeInputClassName}
                        />
                      </FinanceField>
                    </div>
                  ) : null}

                  <p className="rounded-2xl border border-white/[0.07] bg-black/10 px-3 py-2 text-[11px] font-semibold leading-5 text-white/48">
                    {form.masterCycleMode === "custom"
                      ? "CLARA will repeat this same cycle length for future cycles until you change it."
                      : "CLARA will use the interval between this source's expected paydays as the active cycle."}
                  </p>
                </>
              ) : null}
            </div>
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

        {impactConfirmation ? (
          <div className="absolute inset-0 z-[260] flex items-center justify-center rounded-[34px] bg-[#030712]/88 p-4 backdrop-blur-xl">
            <div className="w-full rounded-[28px] border border-amber-200/20 bg-[linear-gradient(145deg,rgba(40,30,10,0.98),rgba(9,16,35,0.99))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/72">Master Pay Cycle impact</p>
              <h4 className="mt-2 text-xl font-black tracking-[-0.03em] text-white">Change the active financial cycle?</h4>
              <p className="mt-3 text-[13px] font-semibold leading-6 text-white/68">
                Changing the Master Pay Cycle can change the current 100 and Means Score because different planned requirements may fall inside the new cycle. Historical transactions and actual due dates will not be rewritten.
              </p>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/62">
                {impactConfirmation.currentMasterName} → {impactConfirmation.proposedMasterName}
              </div>
              {form.masterCycleMode === "custom" ? (
                <p className="mt-2 text-xs font-semibold text-white/48">New cycle: {form.customCycleStart} → {form.customCycleEnd}</p>
              ) : null}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setImpactConfirmation(null)}
                  disabled={saving}
                  className="rounded-2xl border border-white/15 bg-white/[0.075] px-4 py-3 text-sm font-semibold text-white/76"
                >
                  Keep Current
                </button>
                <button
                  type="button"
                  onClick={() => saveSource(true)}
                  disabled={saving}
                  className="rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-black text-[#201303] shadow-[0_10px_30px_rgba(251,191,36,0.20)]"
                >
                  {saving ? "Saving..." : "Confirm Change"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
