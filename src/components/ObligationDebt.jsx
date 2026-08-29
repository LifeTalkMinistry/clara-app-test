import { CheckCircle2, Loader2, Plus, ShieldAlert, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import { FINANCE_ITEM_HIERARCHY_TONES } from "@/components/financial-carousel/shared/financeItemHierarchy";
import {
  PremiumFinanceInfoRow,
  PremiumFinanceItemSurface,
} from "@/components/financial-carousel/shared/PremiumFinanceItemSurface";
import useDebtCardLogic, {
  DEBT_TYPES,
  fmt,
} from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";
import DebtObligationItem, {
  getObligationBalance,
  getObligationInterest,
  getObligationMonthly,
} from "@/components/financial-carousel/cards/debt/ui/DebtObligationItem";
import {
  deleteDebtObligation,
  getDebtTitle,
  markDebtOccurrencePaid,
  toDebtNumber,
  upsertDebtObligation,
} from "@/lib/debtObligationStore";
import { getEffectiveDemoFinanceLocalUserId } from "@/lib/demo/activeDemoProfile";
import {
  getDebtDueDay,
  getDebtObligationMode,
  isActiveDebtObligation,
} from "@/lib/debtObligationMath";

const fieldClass =
  "w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-3 py-2.5 text-sm font-bold text-white outline-none placeholder:text-white/30 focus:border-cyan-300/30 focus:ring-2 focus:ring-cyan-300/10";
const buttonClass =
  "border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";
const glowLayers = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-400/[0.07] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-sky-500/[0.08] blur-[86px]",
  "pointer-events-none absolute bottom-[-210px] right-[-130px] z-[1] h-[310px] w-[310px] rounded-full bg-purple-700/[0.14] blur-[92px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(0,0,0,0.18))]",
];

const emptyForm = () => ({
  id: "",
  title: "",
  debtType: "installment",
  obligationMode: "balance",
  totalDebt: "",
  monthlyDebt: "",
  interestRate: "",
  dueDay: "",
});

const formFromRecord = (record = {}) => ({
  id: record.id || "",
  title: getDebtTitle(record),
  debtType: record.debtType || record.type || "installment",
  obligationMode: getDebtObligationMode(record),
  totalDebt: String(getObligationBalance(record) || ""),
  monthlyDebt: String(getObligationMonthly(record) || ""),
  interestRate: String(getObligationInterest(record) || ""),
  dueDay: String(getDebtDueDay(record) || ""),
});

function Label({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
      {children}
    </label>
  );
}

function ExpandRow({ expanded, onToggle }) {
  return (
    <div className="shrink-0 border-t border-white/[0.035] pt-3">
      <FinanceCardExpandButton
        detailKey="debtObligations"
        expanded={expanded}
        onToggleDetails={onToggle}
        collapsedLabel="View debt details"
        expandedLabel="Hide debt details"
        className={buttonClass}
      />
    </div>
  );
}

function RiskText({ riskLevel }) {
  const className =
    riskLevel === "Risk"
      ? "text-rose-200"
      : riskLevel === "Moderate"
        ? "text-amber-200"
        : riskLevel === "Debt free"
          ? "text-emerald-200"
          : "text-cyan-100";
  return <span className={`font-black ${className}`}>{riskLevel}</span>;
}

export default function ObligationDebt({ item = null, user = null, expanded = false, onToggleDetails }) {
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState("");
  const { state, computed, handlers } = useDebtCardLogic({ item, user, expanded, onToggleDetails });
  const { isExpanded, debtObligations = [], activeDebtCount, savingDebt } = state;
  const { tone, totalDebt, monthlyDebt, debtRatio, riskLevel, statusLabel, payoffMonths } = computed;
  const { handleToggleDetails, reloadDebtObligations } = handlers;
  const localUserId = getEffectiveDemoFinanceLocalUserId(
    String(user?.id || user?.email || "local-user")
  );
  const activeRecords = debtObligations.filter(isActiveDebtObligation);
  const actionLoading = saving || deleting || savingDebt;
  const hasBalanceDebt = activeRecords.some((record) => getDebtObligationMode(record) === "balance");
  const totalPositiveDebt = activeRecords.reduce(
    (sum, record) => sum + Math.max(
      getDebtObligationMode(record) === "balance"
        ? getObligationBalance(record)
        : getObligationMonthly(record),
      0
    ),
    0
  );
  const pressureClass = debtRatio > 40 ? "text-rose-200" : debtRatio >= 20 ? "text-amber-200" : "text-emerald-200";
  const payoffText = useMemo(() => {
    if (!activeRecords.length) return "Add an obligation to start tracking debt pressure.";
    if (!hasBalanceDebt) return "Recurring obligations continue monthly and do not have a payoff date.";
    if (payoffMonths === Number.POSITIVE_INFINITY) return "The current payment does not cover the estimated interest.";
    if (payoffMonths <= 0) return "Add monthly payments to estimate payoff time.";
    return `Interest-aware payoff estimate: around ${payoffMonths} month${payoffMonths === 1 ? "" : "s"}.`;
  }, [activeRecords.length, hasBalanceDebt, payoffMonths]);

  const closeForm = () => {
    setForm(emptyForm());
    setFormOpen(false);
    setConfirmDelete(false);
    setNotice("");
  };

  const notifyChanged = (records = []) => {
    if (typeof window === "undefined") return;
    const active = records.filter(isActiveDebtObligation);
    window.dispatchEvent(new CustomEvent("clara:debt-obligations-updated", {
      detail: {
        localUserId,
        totalDebt: active.reduce((sum, record) => sum + getObligationBalance(record), 0),
        monthlyDebt: active.reduce((sum, record) => sum + getObligationMonthly(record), 0),
        activeDebtCount: active.length,
      },
    }));
  };

  const saveObligation = async () => {
    const title = String(form.title || "").trim();
    const mode = form.obligationMode === "recurring" ? "recurring" : "balance";
    const balance = toDebtNumber(form.totalDebt);
    const monthly = toDebtNumber(form.monthlyDebt);
    const dueDay = Number(form.dueDay || 0);
    if (!title) return setNotice("Name this obligation first.");
    if (mode === "balance" && balance <= 0) return setNotice("Enter the remaining balance for this payoff debt.");
    if (monthly <= 0) return setNotice("Enter the monthly payment for this obligation.");
    if (dueDay && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) return setNotice("Due day must be from 1 to 31.");
    setSaving(true);
    setNotice("");
    try {
      await upsertDebtObligation(localUserId, {
        id: form.id || undefined,
        title,
        debtType: form.debtType,
        obligationMode: mode,
        totalDebt: mode === "recurring" ? 0 : balance,
        monthlyDebt: monthly,
        interestRate: mode === "recurring" ? 0 : toDebtNumber(form.interestRate),
        dueDay: dueDay || null,
        dueDate: "",
        status: "active",
      });
      const records = await reloadDebtObligations();
      notifyChanged(records || []);
      closeForm();
    } catch (error) {
      setNotice(error?.message || "Unable to save obligation.");
    } finally {
      setSaving(false);
    }
  };

  const markOccurrencePaid = async (record, dueDate) => {
    const id = String(record?.id || "").trim();
    if (!id || !dueDate) return;
    setMarkingPaidId(id);
    setNotice("");
    try {
      await markDebtOccurrencePaid(localUserId, id, {
        dueDate,
        amount: getObligationMonthly(record),
      });
      const records = await reloadDebtObligations();
      notifyChanged(records || []);
    } catch (error) {
      setNotice(error?.message || "Unable to record this payment.");
    } finally {
      setMarkingPaidId("");
    }
  };

  const removeObligation = async () => {
    if (!form.id) return;
    setDeleting(true);
    try {
      await deleteDebtObligation(localUserId, form.id);
      const records = await reloadDebtObligations();
      notifyChanged(records || []);
      closeForm();
    } catch (error) {
      setNotice(error?.message || "Unable to delete obligation.");
    } finally {
      setDeleting(false);
    }
  };

  const formPanel = formOpen ? (
    <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} rail={false} glow={false} className="p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-black text-white/92">{form.id ? "Edit obligation" : "Add obligation"}</p>
          <p className="text-[11px] text-white/45">Choose a payoff balance or an ongoing monthly commitment.</p>
        </div>
        <button
          type="button"
          onClick={closeForm}
          disabled={actionLoading}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.045] text-white/65"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2.5">
        <div>
          <Label htmlFor="debt-title">Name</Label>
          <input
            id="debt-title"
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className={fieldClass}
            placeholder="Example: Home Credit"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Label htmlFor="obligation-mode">Setup</Label>
            <select
              id="obligation-mode"
              value={form.obligationMode}
              onChange={(event) => setForm((current) => ({ ...current, obligationMode: event.target.value }))}
              className={fieldClass}
            >
              <option value="balance" className="bg-slate-950">Payoff debt</option>
              <option value="recurring" className="bg-slate-950">Recurring monthly</option>
            </select>
          </div>
          <div>
            <Label htmlFor="debt-type">Type</Label>
            <select
              id="debt-type"
              value={form.debtType}
              onChange={(event) => setForm((current) => ({ ...current, debtType: event.target.value }))}
              className={fieldClass}
            >
              {DEBT_TYPES.map((type) => (
                <option key={type.value} value={type.value} className="bg-slate-950">{type.label}</option>
              ))}
            </select>
          </div>
        </div>

        {form.obligationMode === "balance" ? (
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label htmlFor="total-debt">Remaining balance</Label>
              <input
                id="total-debt"
                type="number"
                min="0"
                inputMode="decimal"
                value={form.totalDebt}
                onChange={(event) => setForm((current) => ({ ...current, totalDebt: event.target.value }))}
                className={fieldClass}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="debt-interest">Annual interest %</Label>
              <input
                id="debt-interest"
                type="number"
                min="0"
                inputMode="decimal"
                value={form.interestRate}
                onChange={(event) => setForm((current) => ({ ...current, interestRate: event.target.value }))}
                className={fieldClass}
                placeholder="Optional"
              />
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <Label htmlFor="monthly-debt">Monthly payment</Label>
            <input
              id="monthly-debt"
              type="number"
              min="0"
              inputMode="decimal"
              value={form.monthlyDebt}
              onChange={(event) => setForm((current) => ({ ...current, monthlyDebt: event.target.value }))}
              className={fieldClass}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="debt-due-day">Due day</Label>
            <input
              id="debt-due-day"
              type="number"
              min="1"
              max="31"
              inputMode="numeric"
              value={form.dueDay}
              onChange={(event) => setForm((current) => ({ ...current, dueDay: event.target.value }))}
              className={fieldClass}
              placeholder="1–31"
            />
          </div>
        </div>
      </div>

      {notice ? <p className="mt-3 text-[11px] font-semibold text-white/58">{notice}</p> : null}

      <button
        type="button"
        onClick={saveObligation}
        disabled={actionLoading}
        className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] text-sm font-black text-emerald-200 disabled:opacity-45"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {saving ? "Saving..." : form.id ? "Update Obligation" : "Save Obligation"}
      </button>

      {form.id ? (
        !confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={actionLoading}
            className="mt-2.5 flex min-h-[42px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/18 bg-rose-400/[0.07] text-sm font-black text-rose-200"
          >
            <Trash2 className="h-4 w-4" /> Delete Obligation
          </button>
        ) : (
          <div className="mt-2.5 rounded-2xl border border-rose-300/16 bg-rose-500/[0.07] p-3">
            <p className="text-sm font-black text-rose-100">Delete {form.title || "this obligation"}?</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-white/[0.08] bg-white/[0.045] py-2 text-xs font-black text-white/72"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={removeObligation}
                disabled={actionLoading}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-400/[0.12] py-2 text-xs font-black text-rose-100"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Delete
              </button>
            </div>
          </div>
        )
      ) : null}
    </PremiumFinanceItemSurface>
  ) : null;

  return (
    <FinanceCardShell
      cardKey="debtObligations"
      expanded={isExpanded}
      roundedClass="rounded-3xl"
      glowLayerClassNames={glowLayers}
      surfaceClassName="!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(22,9,57,0.93))]"
      shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_56px_rgba(88,28,135,0.11)]"
    >
      {!isExpanded ? (
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <div className="rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-4 backdrop-blur-sm">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200/18 bg-white/[0.065] text-cyan-100">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-white">Debt / Obligations</p>
                      <p className="text-[11px] text-white/70">Track what you owe.</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone.status}`}>{statusLabel}</span>
                  </div>
                </div>
              </div>
              <p className={`text-[32px] font-bold leading-none tracking-[-0.045em] ${tone.value}`}>{fmt(totalDebt)}</p>
              <p className="mt-2 text-sm font-semibold text-white/72">
                {activeRecords.length ? `Active obligations (${activeDebtCount}).` : "No active debt recorded."}
              </p>
              <div className="mt-4 grid grid-cols-3 divide-x divide-white/[0.055] overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105]">
                <div className="p-2.5 text-center">
                  <p className="text-[13px] font-black text-white/88">{fmt(monthlyDebt)}</p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-white/34">Monthly</p>
                </div>
                <div className="p-2.5 text-center">
                  <p className={`text-[13px] font-black ${pressureClass}`}>{debtRatio.toFixed(0)}%</p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-white/34">Pressure</p>
                </div>
                <div className="p-2.5 text-center">
                  <p className="text-[13px] font-black text-white/88">{activeDebtCount || "Clear"}</p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-white/34">Accounts</p>
                </div>
              </div>
            </div>
            <ExpandRow expanded={false} onToggle={handleToggleDetails} />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
          <p className={`shrink-0 text-[34px] font-black leading-none tracking-[-0.045em] ${tone.value}`}>{fmt(totalDebt)}</p>
          <div className="mt-4"><ExpandRow expanded onToggle={handleToggleDetails} /></div>
          <div className="mt-4 min-h-0 flex-1 overflow-hidden">
            <FinanceCardExpandedPanel className="h-full space-y-3 overflow-y-auto pr-1">
              <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} rail={false} glow={false}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Debt pressure</span>
                  <RiskText riskLevel={riskLevel} />
                </div>
                <p className="mt-3 text-[12px] font-semibold leading-6 text-white/62">{payoffText}</p>
              </PremiumFinanceItemSurface>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setForm(emptyForm());
                  setFormOpen(true);
                  setConfirmDelete(false);
                  setNotice("");
                }}
                className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-3 py-3 text-sm font-black text-emerald-200 disabled:opacity-45"
              >
                <Plus className="h-4 w-4" /> New Obligation
              </button>

              {formOpen && !form.id ? formPanel : null}

              <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} rail={false} glow={false}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Current setup</span>
                  <RiskText riskLevel={riskLevel} />
                </div>
                <div className="mt-2 border-t border-white/[0.06]">
                  <PremiumFinanceInfoRow label="Monthly pressure" value={fmt(monthlyDebt)} />
                  <PremiumFinanceInfoRow label="Debt ratio" value={`${debtRatio.toFixed(0)}%`} valueClassName={pressureClass} />
                </div>
              </PremiumFinanceItemSurface>

              <div className="space-y-2.5">
                {activeRecords.length ? (
                  activeRecords.map((record, index) => {
                    const recordKey = record.id || `${getDebtTitle(record)}-${index}`;
                    const isEditingRecord =
                      formOpen &&
                      Boolean(form.id) &&
                      String(form.id) === String(record.id || "");

                    if (isEditingRecord) {
                      return <div key={recordKey}>{formPanel}</div>;
                    }

                    return (
                      <DebtObligationItem
                        key={recordKey}
                        record={record}
                        totalPositiveDebt={totalPositiveDebt}
                        onEdit={(selected) => {
                          setForm(formFromRecord(selected));
                          setFormOpen(true);
                          setConfirmDelete(false);
                          setNotice("");
                        }}
                      />
                    );
                  })
                ) : (
                  <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} glow={false} className="p-4 text-center">
                    <p className="text-sm font-black text-white/90">No obligations yet</p>
                    <p className="mt-1 text-[11px] text-white/50">Add debts or recurring commitments one by one.</p>
                  </PremiumFinanceItemSurface>
                )}
              </div>
              <div aria-hidden="true" className="h-5" />
            </FinanceCardExpandedPanel>
          </div>
        </div>
      )}
    </FinanceCardShell>
  );
}
