import {
  CheckCircle2,
  Loader2,
  Plus,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import {
  FINANCE_ITEM_HIERARCHY_TONES,
} from "@/components/financial-carousel/shared/financeItemHierarchy";
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
  toDebtNumber,
  upsertDebtObligation,
} from "@/lib/debtObligationStore";

const fieldClass =
  "w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-3 py-2.5 text-sm font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] transition placeholder:text-white/30 focus:border-cyan-300/30 focus:ring-2 focus:ring-cyan-300/10";

const expandButtonClass =
  "border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

const DEBT_GLOW_LAYERS = [
  "pointer-events-none absolute -left-[132px] -top-[148px] z-[1] h-[270px] w-[270px] rounded-full bg-cyan-400/[0.07] blur-[78px]",
  "pointer-events-none absolute -right-[132px] -top-[72px] z-[1] h-[270px] w-[270px] rounded-full bg-sky-500/[0.08] blur-[86px]",
  "pointer-events-none absolute bottom-[-210px] right-[-130px] z-[1] h-[310px] w-[310px] rounded-full bg-purple-700/[0.14] blur-[92px]",
  "pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(circle_at_12%_0%,rgba(103,232,249,0.105),transparent_31%),radial-gradient(circle_at_86%_98%,rgba(124,58,237,0.16),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.012)_36%,rgba(0,0,0,0.18)_100%)]",
  "pointer-events-none absolute inset-x-0 top-0 z-[3] h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.06),rgba(255,255,255,0.012)_42%,transparent)]",
  "pointer-events-none absolute inset-0 z-[3] rounded-[inherit] ring-1 ring-inset ring-white/[0.055]",
];

function MiniLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-white/42">
      {children}
    </label>
  );
}

const compactCurrency = (value) => fmt(Number(value) || 0);

const emptyForm = () => ({
  id: "",
  title: "",
  debtType: "installment",
  totalDebt: "",
  monthlyDebt: "",
  interestRate: "",
  dueDate: "",
});

const formFromRecord = (record) => ({
  id: record?.id || "",
  title: getDebtTitle(record),
  debtType: record?.debtType || record?.type || "installment",
  totalDebt: String(getObligationBalance(record) || ""),
  monthlyDebt: String(getObligationMonthly(record) || ""),
  interestRate: String(getObligationInterest(record) || ""),
  dueDate: record?.dueDate || record?.due_date || "",
});

function DebtHeader({ statusLabel, tone }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/18 bg-white/[0.065] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_0_16px_rgba(0,255,220,0.08)] backdrop-blur-sm">
        <ShieldAlert className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-white">Debt / Obligations</p>
            <p className="mt-0.5 text-[11px] font-medium text-white/76">Track what you owe.</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone.status}`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function DebtSummaryStats({ totalDebt, monthlyDebt, debtRatio, riskLevel, activeDebtCount, hasActiveDebt, tone }) {
  const pressureClass = debtRatio >= 50 ? "text-rose-200" : debtRatio >= 30 ? "text-amber-200" : "text-emerald-200";
  const statusClass = riskLevel === "Debt free" ? "text-emerald-200" : riskLevel === "Moderate" ? "text-amber-200" : riskLevel === "Risk" ? "text-rose-200" : "text-cyan-200";
  const summaryTiles = [
    { label: "Monthly", value: compactCurrency(monthlyDebt) },
    { label: "Pressure", value: `${debtRatio.toFixed(0)}%`, valueClassName: pressureClass },
    { label: activeDebtCount > 0 ? "Accounts" : "Status", value: activeDebtCount > 0 ? String(activeDebtCount) : riskLevel, valueClassName: statusClass },
  ];

  return (
    <>
      <div className="mb-3">
        <p className={`text-[32px] font-bold leading-none tracking-[-0.045em] ${tone.value}`}>{compactCurrency(totalDebt)}</p>
        <p className="mt-2 text-sm font-semibold leading-tight text-white/76">
          {hasActiveDebt ? `Total active obligations${activeDebtCount > 0 ? ` (${activeDebtCount})` : ""}.` : "No active debt recorded."}
        </p>
      </div>
      <div className="mb-1 overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm">
        <div className="grid grid-cols-3 divide-x divide-white/[0.055]">
          {summaryTiles.map((tile) => (
            <div key={tile.label} className="relative px-2.5 py-2.5 text-center">
              <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent" />
              <p className={`truncate text-[13px] font-black leading-none tracking-[-0.03em] ${tile.valueClassName || "text-white/88"}`}>{tile.value}</p>
              <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ExpandButtonRow({ expanded, onToggleDetails }) {
  return (
    <div className="shrink-0 border-t border-white/[0.035] pt-3">
      <FinanceCardExpandButton
        detailKey="debtObligations"
        expanded={expanded}
        onToggleDetails={onToggleDetails}
        collapsedLabel="View debt details"
        expandedLabel="Hide debt details"
        className={expandButtonClass}
      />
    </div>
  );
}

export default function ObligationDebt({ item = null, expanded = false, onToggleDetails }) {
  const { user } = useAuth();
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { state, computed, handlers } = useDebtCardLogic({ item, expanded, onToggleDetails });
  const { isExpanded, debtObligations = [], activeDebtCount, savingDebt } = state;
  const {
    tone,
    totalDebt,
    monthlyDebt,
    debtRatio,
    riskLevel,
    statusLabel,
    payoffMonths,
  } = computed;
  const { handleToggleDetails, reloadDebtObligations } = handlers;

  const localUserId = String(user?.id || user?.email || "local-user");
  const saveLoading = saving || savingDebt;
  const actionLoading = saveLoading || deleting;
  const hasActiveDebt = totalDebt > 0;
  const totalPositiveDebt = debtObligations.reduce(
    (sum, record) => sum + Math.max(getObligationBalance(record), 0),
    0
  );

  const payoffEstimateText = useMemo(() => {
    if (!hasActiveDebt || payoffMonths <= 0) return "Add monthly payments to estimate payoff time.";
    if (payoffMonths <= 1) return "Estimated payoff: less than 1 month.";
    return `Estimated payoff: around ${payoffMonths} months.`;
  }, [hasActiveDebt, payoffMonths]);

  const openCreateForm = () => {
    setNotice("");
    setDeleteConfirmOpen(false);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEditForm = (record) => {
    setNotice("");
    setDeleteConfirmOpen(false);
    setForm(formFromRecord(record));
    setFormOpen(true);
  };

  const closeForm = () => {
    setDeleteConfirmOpen(false);
    setFormOpen(false);
    setForm(emptyForm());
  };

  const notifyDebtChanged = (records = []) => {
    if (typeof window === "undefined") return;
    const nextTotalDebt = records.reduce((sum, record) => sum + getObligationBalance(record), 0);
    const nextMonthlyDebt = records.reduce((sum, record) => sum + getObligationMonthly(record), 0);

    window.dispatchEvent(
      new CustomEvent("clara:debt-obligations-updated", {
        detail: {
          localUserId,
          totalDebt: nextTotalDebt,
          monthlyDebt: nextMonthlyDebt,
          activeDebtCount: records.length,
        },
      })
    );
  };

  const saveObligation = async () => {
    const title = String(form.title || "").trim();
    const balance = toDebtNumber(form.totalDebt);
    const monthly = toDebtNumber(form.monthlyDebt);

    if (!title) return setNotice("Name this obligation first.");
    if (balance <= 0 && monthly <= 0) return setNotice("Enter at least the balance or monthly payment first.");

    setSaving(true);
    setNotice("");

    try {
      await upsertDebtObligation(localUserId, {
        id: form.id || undefined,
        title,
        debtType: form.debtType || "installment",
        totalDebt: balance,
        monthlyDebt: monthly,
        interestRate: toDebtNumber(form.interestRate),
        dueDate: form.dueDate || "",
      });

      const refreshed = await reloadDebtObligations();
      notifyDebtChanged(refreshed || []);
      setNotice("");
      closeForm();
    } catch (error) {
      console.error("Unable to save obligation:", error);
      setNotice(error?.message || "Unable to save obligation.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrentObligation = async () => {
    const obligationId = String(form.id || "").trim();
    if (!obligationId) return;

    setDeleting(true);
    setNotice("");

    try {
      await deleteDebtObligation(localUserId, obligationId);
      const refreshed = await reloadDebtObligations();
      notifyDebtChanged(refreshed || []);
      closeForm();
    } catch (error) {
      console.error("Unable to delete obligation:", error);
      setNotice(error?.message || "Unable to delete obligation.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <FinanceCardShell
      cardKey="debtObligations"
      expanded={isExpanded}
      ringClass="shadow-[0_0_24px_rgba(34,211,238,0.08),0_0_46px_rgba(88,28,135,0.07)]"
      roundedClass="rounded-3xl"
      glowLayerClassNames={DEBT_GLOW_LAYERS}
      surfaceClassName="!border-white/[0.075] !bg-[linear-gradient(135deg,rgba(4,28,43,0.90),rgba(5,12,36,0.955)_44%,rgba(22,9,57,0.93))]"
      shadowClass="shadow-[0_26px_70px_rgba(0,0,0,0.48),0_0_26px_rgba(34,211,238,0.045),0_0_56px_rgba(88,28,135,0.11)]"
    >
      {!isExpanded ? (
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.48]">
            <div className="absolute -left-20 top-[-58px] h-40 w-40 rounded-full bg-cyan-400/[0.065] blur-3xl" />
            <div className="absolute bottom-[-104px] right-[-82px] h-48 w-48 rounded-full bg-violet-500/[0.10] blur-3xl" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.024),transparent_30%,rgba(0,0,0,0.16)_100%)]" />
          </div>
          <div className="relative flex min-h-0 flex-col gap-4">
            <div className="min-h-0 rounded-[28px] border border-white/[0.035] bg-black/[0.055] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] backdrop-blur-[2px]">
              <DebtHeader statusLabel={statusLabel} tone={tone} />
              <div className="mt-3 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,255,255,0.014),rgba(255,255,255,0.004)_40%,rgba(0,0,0,0.10)_100%)] p-3">
                <DebtSummaryStats
                  totalDebt={totalDebt}
                  monthlyDebt={monthlyDebt}
                  debtRatio={debtRatio}
                  riskLevel={riskLevel}
                  activeDebtCount={activeDebtCount}
                  hasActiveDebt={hasActiveDebt}
                  tone={tone}
                />
              </div>
            </div>
            <ExpandButtonRow expanded={false} onToggleDetails={handleToggleDetails} />
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
          <div className="pointer-events-none absolute inset-0 opacity-[0.42]">
            <div className="absolute -left-24 top-[-70px] h-48 w-48 rounded-full bg-cyan-400/[0.06] blur-3xl" />
            <div className="absolute bottom-[-130px] right-[-110px] h-60 w-60 rounded-full bg-violet-500/[0.10] blur-3xl" />
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col gap-4">
            <div className="shrink-0">
              <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${tone.value}`}>{compactCurrency(totalDebt)}</p>
            </div>
            <ExpandButtonRow expanded={true} onToggleDetails={handleToggleDetails} />

            <div className="min-h-0 flex-1 overflow-hidden pt-1">
              <FinanceCardExpandedPanel className="h-full space-y-3 overflow-y-auto pr-1">
                <div className="relative overflow-hidden rounded-[20px] border border-cyan-300/12 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.09),transparent_38%),linear-gradient(145deg,rgba(8,20,38,0.97),rgba(8,13,31,0.985))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_26px_rgba(0,0,0,0.20),0_0_18px_rgba(14,165,233,0.035)]">
                  <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/35 to-transparent" />
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/46">Debt pressure</p>
                  <p className={`mt-2 text-[17px] font-black leading-snug ${riskLevel === "Risk" ? "text-rose-200" : riskLevel === "Moderate" ? "text-amber-200" : riskLevel === "Debt free" ? "text-emerald-200" : "text-white/92"}`}>{riskLevel}</p>
                  <p className="mt-3 text-[12.5px] font-semibold leading-6 text-white/68">{payoffEstimateText}</p>
                </div>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={openCreateForm}
                  className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-3 py-3 text-sm font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)] transition hover:bg-emerald-400/[0.13] disabled:opacity-45"
                >
                  <Plus className="h-4 w-4" /> New Obligation
                </button>

                {formOpen ? (
                  <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} rail={false} glow={false} className="p-3.5">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-white/92">{form.id ? "Edit obligation" : "Add obligation"}</p>
                        <p className="text-[11px] font-semibold text-white/45">Name it like Home Credit or Credit Card.</p>
                      </div>
                      <button type="button" onClick={closeForm} disabled={actionLoading} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.045] text-white/65 transition hover:bg-white/[0.08] disabled:opacity-45" aria-label="Close obligation form">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <MiniLabel htmlFor="debt-title">Name</MiniLabel>
                        <input id="debt-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Home Credit" className={fieldClass} />
                      </div>
                      <div>
                        <MiniLabel htmlFor="debt-type">Type</MiniLabel>
                        <select id="debt-type" value={form.debtType} onChange={(event) => setForm((current) => ({ ...current, debtType: event.target.value }))} className={fieldClass}>
                          {DEBT_TYPES.map((type) => <option key={type.value} value={type.value} className="bg-slate-950 text-white">{type.label}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <MiniLabel htmlFor="total-debt">Balance</MiniLabel>
                          <input id="total-debt" type="number" inputMode="decimal" min="0" value={form.totalDebt} onChange={(event) => setForm((current) => ({ ...current, totalDebt: event.target.value }))} placeholder="0" className={fieldClass} />
                        </div>
                        <div>
                          <MiniLabel htmlFor="monthly-debt">Monthly</MiniLabel>
                          <input id="monthly-debt" type="number" inputMode="decimal" min="0" value={form.monthlyDebt} onChange={(event) => setForm((current) => ({ ...current, monthlyDebt: event.target.value }))} placeholder="0" className={fieldClass} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <MiniLabel htmlFor="debt-interest">Interest %</MiniLabel>
                          <input id="debt-interest" type="number" inputMode="decimal" min="0" value={form.interestRate} onChange={(event) => setForm((current) => ({ ...current, interestRate: event.target.value }))} placeholder="Optional" className={fieldClass} />
                        </div>
                        <div>
                          <MiniLabel htmlFor="debt-due-date">Due date</MiniLabel>
                          <input id="debt-due-date" type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className={fieldClass} />
                        </div>
                      </div>
                    </div>

                    {notice ? <p className="mt-3 text-[11px] font-semibold leading-5 text-white/58">{notice}</p> : null}
                    <button type="button" onClick={saveObligation} disabled={actionLoading} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-3 py-2.5 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/[0.13] disabled:opacity-45">
                      {saveLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {saveLoading ? "Saving..." : form.id ? "Update Obligation" : "Save Obligation"}
                    </button>

                    {form.id ? (
                      <div className="mt-2.5">
                        {!deleteConfirmOpen ? (
                          <button
                            type="button"
                            onClick={() => {
                              setNotice("");
                              setDeleteConfirmOpen(true);
                            }}
                            disabled={actionLoading}
                            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/18 bg-rose-400/[0.07] px-3 py-2.5 text-sm font-black text-rose-200 transition hover:bg-rose-400/[0.12] disabled:opacity-45"
                          >
                            <Trash2 className="h-4 w-4" /> Delete Obligation
                          </button>
                        ) : (
                          <div role="alertdialog" aria-labelledby="delete-obligation-title" className="rounded-2xl border border-rose-300/16 bg-rose-500/[0.07] p-3.5">
                            <p id="delete-obligation-title" className="text-sm font-black text-rose-100">
                              Delete {String(form.title || "this obligation").trim()}?
                            </p>
                            <p className="mt-1.5 text-[11px] font-semibold leading-5 text-white/55">
                              This obligation and its saved balance information will be removed. This cannot be undone.
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmOpen(false)}
                                disabled={actionLoading}
                                className="min-h-[40px] rounded-xl border border-white/[0.08] bg-white/[0.045] px-3 py-2 text-xs font-black text-white/72 transition hover:bg-white/[0.08] disabled:opacity-45"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={deleteCurrentObligation}
                                disabled={actionLoading}
                                className="flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-rose-300/20 bg-rose-400/[0.12] px-3 py-2 text-xs font-black text-rose-100 transition hover:bg-rose-400/[0.18] disabled:opacity-45"
                              >
                                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                {deleting ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </PremiumFinanceItemSurface>
                ) : null}

                <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} rail={false} glow={false}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Current setup</span>
                    <span className={`text-[11px] font-black ${riskLevel === "Debt free" ? "text-emerald-200" : riskLevel === "Moderate" ? "text-amber-200" : riskLevel === "Risk" ? "text-rose-200" : "text-cyan-200"}`}>{riskLevel}</span>
                  </div>
                  <div className="mt-2 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                    <PremiumFinanceInfoRow label="Monthly pressure" value={compactCurrency(monthlyDebt)} />
                    <PremiumFinanceInfoRow label="Debt ratio" value={`${debtRatio.toFixed(0)}%`} valueClassName={debtRatio > 40 ? "text-rose-200" : debtRatio >= 20 ? "text-amber-200" : "text-emerald-200"} />
                  </div>
                </PremiumFinanceItemSurface>

                <div className="space-y-2.5">
                  {debtObligations.length ? debtObligations.map((record, index) => (
                    <DebtObligationItem
                      key={record.id || record.debt_obligation_id || `${getDebtTitle(record)}-${index}`}
                      record={record}
                      totalPositiveDebt={totalPositiveDebt}
                      onEdit={openEditForm}
                    />
                  )) : (
                    <PremiumFinanceItemSurface tone={FINANCE_ITEM_HIERARCHY_TONES.neutral} glow={false} className="p-4 text-center">
                      <p className="text-sm font-black text-white/90">No obligations yet</p>
                      <p className="mt-1 text-[11px] font-semibold leading-5 text-white/50">Add installments, loans, cards, or personal balances one by one.</p>
                    </PremiumFinanceItemSurface>
                  )}
                </div>

                <div aria-hidden="true" className="h-5 shrink-0" />
              </FinanceCardExpandedPanel>
            </div>
          </div>
        </div>
      )}
    </FinanceCardShell>
  );
}
