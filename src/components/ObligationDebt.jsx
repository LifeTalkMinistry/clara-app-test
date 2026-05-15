import {
  Brain,
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  ShieldAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import FinanceCardShell from "@/components/financial-carousel/shared/FinanceCardShell";
import FinanceCardExpandButton from "@/components/financial-carousel/shared/FinanceCardExpandButton";
import FinanceCardExpandedPanel from "@/components/financial-carousel/shared/FinanceCardExpandedPanel";
import useDebtCardLogic, {
  DEBT_TYPES,
  fmt,
  getDebtTypeLabel,
} from "@/components/financial-carousel/cards/debt/logic/useDebtCardLogic";
import {
  getDebtTitle,
  toDebtNumber,
  upsertDebtObligation,
} from "@/lib/debtObligationStore";

const fieldClass =
  "w-full rounded-2xl border border-white/[0.07] bg-black/[0.18] px-3 py-2.5 text-sm font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] transition placeholder:text-white/30 focus:border-cyan-300/30 focus:ring-2 focus:ring-cyan-300/10";

const premiumActionClass =
  "border-white/[0.045] bg-black/[0.105] text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.026),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]";

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

const compactCurrency = (value) => {
  const safe = Number(value) || 0;
  if (safe >= 1000000) return `₱${(safe / 1000000).toFixed(1)}M`;
  if (safe >= 1000) return `₱${(safe / 1000).toFixed(1)}K`;
  return fmt(safe);
};

const getBalance = (record) => toDebtNumber(record?.totalDebt ?? record?.balance ?? record?.amount ?? 0);
const getMonthly = (record) => toDebtNumber(record?.monthlyDebt ?? record?.monthlyPayment ?? record?.monthly_payment ?? 0);
const getInterest = (record) => toDebtNumber(record?.interestRate ?? record?.interest_rate ?? record?.interest ?? 0);

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
  totalDebt: String(getBalance(record) || ""),
  monthlyDebt: String(getMonthly(record) || ""),
  interestRate: String(getInterest(record) || ""),
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
            <p className="text-base font-semibold tracking-tight text-white">
              Debt / Obligations
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-white/76">
              Track what you owe.
            </p>
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
    {
      label: "Pressure",
      value: `${debtRatio.toFixed(0)}%`,
      valueClassName: pressureClass,
    },
    {
      label: activeDebtCount > 0 ? "Accounts" : "Status",
      value: activeDebtCount > 0 ? String(activeDebtCount) : riskLevel,
      valueClassName: statusClass,
    },
  ];

  return (
    <>
      <div className="mb-3">
        <p className={`text-[32px] font-bold leading-none tracking-[-0.045em] ${tone.value}`}>
          {compactCurrency(totalDebt)}
        </p>
        <p className="mt-2 text-sm font-semibold leading-tight text-white/76">
          {hasActiveDebt
            ? `Total active obligations${activeDebtCount > 0 ? ` (${activeDebtCount})` : ""}.`
            : "No active debt recorded."}
        </p>
      </div>

      <div className="mb-1 overflow-hidden rounded-[22px] border border-white/[0.055] bg-black/[0.105] shadow-[inset_0_1px_0_rgba(255,255,255,0.035),0_12px_26px_rgba(0,0,0,0.12)] backdrop-blur-sm">
        <div className="grid grid-cols-3 divide-x divide-white/[0.055]">
          {summaryTiles.map((tile) => (
            <div key={tile.label} className="relative px-2.5 py-2.5 text-center">
              <div className="pointer-events-none absolute inset-x-2 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.055] to-transparent" />
              <p
                className={`truncate text-[13px] font-black leading-none tracking-[-0.03em] ${
                  tile.valueClassName || "text-white/88"
                }`}
              >
                {tile.value}
              </p>
              <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/34">
                {tile.label}
              </p>
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
  const { handleAskClara, handleToggleDetails, reloadDebtObligations } = handlers;

  const localUserId = String(user?.id || user?.email || "local-user");
  const actionLoading = saving || savingDebt;
  const hasActiveDebt = totalDebt > 0;

  const payoffEstimateText = useMemo(() => {
    if (!hasActiveDebt || payoffMonths <= 0) return "Add monthly payments to estimate payoff time.";
    if (payoffMonths <= 1) return "Estimated payoff: less than 1 month.";
    return `Estimated payoff: around ${payoffMonths} months.`;
  }, [hasActiveDebt, payoffMonths]);

  const openCreateForm = () => {
    setNotice("");
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEditForm = (record) => {
    setNotice("");
    setForm(formFromRecord(record));
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setForm(emptyForm());
  };

  const notifyDebtChanged = (records = []) => {
    if (typeof window === "undefined") return;
    const nextTotalDebt = records.reduce((sum, record) => sum + getBalance(record), 0);
    const nextMonthlyDebt = records.reduce((sum, record) => sum + getMonthly(record), 0);

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
    if (balance <= 0 && monthly <= 0) {
      return setNotice("Enter at least the balance or monthly payment first.");
    }

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

      setNotice(form.id ? "Obligation updated." : "New obligation added.");
      closeForm();
    } catch (error) {
      console.error("Unable to save obligation:", error);
      setNotice(error?.message || "Unable to save obligation.");
    } finally {
      setSaving(false);
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
              <p className={`text-[34px] font-black leading-none tracking-[-0.045em] ${tone.value}`}>
                {compactCurrency(totalDebt)}
              </p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-white/68">
                {hasActiveDebt
                  ? `Total active obligations${activeDebtCount > 0 ? ` (${activeDebtCount})` : ""}.`
                  : "No active debt recorded."}
              </p>
            </div>

            <ExpandButtonRow expanded={true} onToggleDetails={handleToggleDetails} />

            <div className="min-h-0 flex-1 overflow-hidden pt-1">
              <FinanceCardExpandedPanel className="h-full space-y-3 overflow-y-auto pr-1">
                <div className="relative overflow-hidden rounded-2xl border border-cyan-300/12 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_42%),rgba(14,165,233,0.055)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_0_18px_rgba(14,165,233,0.035)]">
                  <div className="pointer-events-none absolute -right-10 -top-14 h-28 w-28 rounded-full bg-cyan-300/[0.06] blur-2xl" />
                  <p className="relative text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/46">
                    Debt pressure
                  </p>
                  <p className="relative mt-2 text-[17px] font-black leading-snug text-white/92">
                    {riskLevel}
                  </p>
                  <p className="relative mt-3 text-[12.5px] font-semibold leading-6 text-white/68">
                    {payoffEstimateText}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1.5">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={openCreateForm}
                    className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-3 py-3 text-sm font-black text-emerald-200 shadow-[0_0_18px_rgba(52,211,153,0.08)] transition hover:bg-emerald-400/[0.13] disabled:opacity-45"
                  >
                    <Plus className="h-4 w-4" />
                    New Obligation
                  </button>

                  <button
                    type="button"
                    onClick={handleAskClara}
                    className="flex min-h-[46px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.09] px-3 py-3 text-sm font-black text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)] transition hover:bg-cyan-400/[0.13]"
                  >
                    <Brain className="h-4 w-4" />
                    Ask CLARA
                  </button>
                </div>

                {formOpen ? (
                  <div className="rounded-2xl border border-white/[0.045] bg-black/[0.105] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-black text-white/92">
                          {form.id ? "Edit obligation" : "Add obligation"}
                        </p>
                        <p className="text-[11px] font-semibold text-white/45">
                          Name it like Home Credit or Credit Card.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeForm}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.045] bg-black/[0.10] text-white/65 transition hover:bg-white/[0.04]"
                        aria-label="Close obligation form"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <MiniLabel htmlFor="debt-title">Name</MiniLabel>
                        <input
                          id="debt-title"
                          value={form.title}
                          onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                          placeholder="Example: Home Credit"
                          className={fieldClass}
                        />
                      </div>

                      <div>
                        <MiniLabel htmlFor="debt-type">Type</MiniLabel>
                        <select
                          id="debt-type"
                          value={form.debtType}
                          onChange={(event) => setForm((current) => ({ ...current, debtType: event.target.value }))}
                          className={fieldClass}
                        >
                          {DEBT_TYPES.map((type) => (
                            <option key={type.value} value={type.value} className="bg-slate-950 text-white">
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div>
                          <MiniLabel htmlFor="total-debt">Balance</MiniLabel>
                          <input
                            id="total-debt"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={form.totalDebt}
                            onChange={(event) => setForm((current) => ({ ...current, totalDebt: event.target.value }))}
                            placeholder="0"
                            className={fieldClass}
                          />
                        </div>

                        <div>
                          <MiniLabel htmlFor="monthly-debt">Monthly</MiniLabel>
                          <input
                            id="monthly-debt"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            value={form.monthlyDebt}
                            onChange={(event) => setForm((current) => ({ ...current, monthlyDebt: event.target.value }))}
                            placeholder="0"
                            className={fieldClass}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={saveObligation}
                      disabled={actionLoading}
                      className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.09] px-3 py-2.5 text-sm font-black text-emerald-200 transition hover:bg-emerald-400/[0.13] disabled:opacity-45"
                    >
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {actionLoading ? "Saving..." : form.id ? "Update Obligation" : "Save Obligation"}
                    </button>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-white/[0.045] bg-black/[0.105] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                      Current setup
                    </span>
                    <span className={`text-[11px] font-black ${riskLevel === "Debt free" ? "text-emerald-200" : riskLevel === "Moderate" ? "text-amber-200" : riskLevel === "Risk" ? "text-rose-200" : "text-cyan-200"}`}>
                      {riskLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-[12px] font-semibold text-white/58">
                    <div className="rounded-xl border border-white/[0.045] bg-black/[0.10] px-3 py-3">
                      <p className="text-white/34">Monthly pressure</p>
                      <p className="mt-1.5 text-sm font-black text-white/84">{compactCurrency(monthlyDebt)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.045] bg-black/[0.10] px-3 py-3">
                      <p className="text-white/34">Debt ratio</p>
                      <p className="mt-1.5 text-sm font-black text-white/84">{debtRatio.toFixed(0)}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {debtObligations.length ? debtObligations.map((record) => {
                    const balance = getBalance(record);
                    const monthly = getMonthly(record);
                    const interest = getInterest(record);
                    const months = monthly > 0 && balance > 0 ? Math.ceil(balance / monthly) : 0;

                    return (
                      <div key={record.id} className="rounded-2xl border border-white/[0.045] bg-black/[0.105] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white/90">
                              {getDebtTitle(record)}
                            </p>

                            <p className="mt-1 text-[11px] font-semibold text-white/48">
                              {getDebtTypeLabel(record.debtType || record.type)}
                              {record.dueDate || record.due_date ? ` • Due ${record.dueDate || record.due_date}` : ""}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => openEditForm(record)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.045] bg-black/[0.10] text-white/70 transition hover:bg-white/[0.04]"
                            aria-label="Edit obligation"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-white/[0.045] bg-black/[0.10] px-3 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/34">
                              Balance
                            </p>

                            <p className="mt-1 text-sm font-black text-white/84">
                              {fmt(balance)}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/[0.045] bg-black/[0.10] px-3 py-2">
                            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/34">
                              Monthly
                            </p>

                            <p className="mt-1 text-sm font-black text-cyan-100">
                              {fmt(monthly)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/50">
                          {interest > 0 ? <span>{interest}% interest</span> : null}
                          {months > 0 ? <span>• around {months} months left</span> : null}
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="rounded-2xl border border-dashed border-white/[0.07] bg-black/[0.105] p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.026)]">
                      <p className="text-sm font-black text-white/90">No obligations yet</p>
                      <p className="mt-1 text-[11px] font-semibold leading-5 text-white/50">
                        Add installments, loans, cards, or personal balances one by one.
                      </p>
                    </div>
                  )}
                </div>

                {notice ? (
                  <p className="text-[11px] font-semibold leading-5 text-white/58">
                    {notice}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={handleAskClara}
                  className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${premiumActionClass}`}
                >
                  <Brain className="h-4 w-4" />
                  Review with CLARA
                </button>

                <div aria-hidden="true" className="h-5 shrink-0" />
              </FinanceCardExpandedPanel>
            </div>
          </div>
        </div>
      )}
    </FinanceCardShell>
  );
}
