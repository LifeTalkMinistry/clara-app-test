import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Loader2,
  Plus,
  ShieldAlert,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "@/context/AuthContext";
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

const tileClass =
  "rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] transition placeholder:text-white/32 focus:border-cyan-300/35 focus:ring-2 focus:ring-cyan-300/10";

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
    monthlyLeftover,
  } = computed;
  const { handleAskClara, handleToggleDetails, reloadDebtObligations } = handlers;

  const localUserId = String(user?.id || user?.email || "local-user");
  const actionLoading = saving || savingDebt;
  const hasActiveDebt = totalDebt > 0;

  const safeMoneyImpactText = useMemo(() => {
    if (monthlyDebt <= 0) return "No monthly obligation pressure detected yet.";
    if (monthlyLeftover <= 0) return "Your obligations currently consume most of your safe monthly money flow.";
    return `This lowers your safe money by ${fmt(monthlyDebt)} every month.`;
  }, [monthlyDebt, monthlyLeftover]);

  const payoffEstimateText = useMemo(() => {
    if (!hasActiveDebt || payoffMonths <= 0) return "Add monthly payments to estimate payoff time.";
    if (payoffMonths <= 1) return "Estimated payoff: less than 1 month.";
    return `Estimated payoff: around ${payoffMonths} months.`;
  }, [hasActiveDebt, payoffMonths]);

  const summaryTiles = [
    { label: "Monthly", value: compactCurrency(monthlyDebt) },
    {
      label: "Pressure",
      value: `${debtRatio.toFixed(0)}%`,
      valueClassName: debtRatio >= 50 ? "text-rose-300" : debtRatio >= 30 ? "text-amber-300" : "text-emerald-300",
    },
    {
      label: activeDebtCount > 0 ? "Accounts" : "Status",
      value: activeDebtCount > 0 ? String(activeDebtCount) : riskLevel,
      valueClassName: riskLevel === "Debt free" ? "text-emerald-300" : riskLevel === "Moderate" ? "text-amber-300" : riskLevel === "Risk" ? "text-rose-300" : "text-cyan-300",
    },
  ];

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
        detail: { localUserId, totalDebt: nextTotalDebt, monthlyDebt: nextMonthlyDebt, activeDebtCount: records.length },
      })
    );
  };

  const saveObligation = async () => {
    const title = String(form.title || "").trim();
    const balance = toDebtNumber(form.totalDebt);
    const monthly = toDebtNumber(form.monthlyDebt);

    if (!title) return setNotice("Name this obligation first, like Home Credit or Credit Card.");
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
    <div className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border text-white shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.08),0_0_48px_rgba(126,34,206,0.10)] transition-all duration-200 ${tone.border}`}>
      <div className="absolute inset-0" style={{ background: tone.background }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_31%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.20),transparent_33%),linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.02)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/16 to-black/30" />
      <div className="pointer-events-none absolute bottom-[-135px] right-[-92px] h-[230px] w-[230px] rounded-full bg-violet-400/[0.09] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4 pb-4">
        <div className="flex shrink-0 flex-col gap-3">
          <div>
            <div className="mb-3 flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${tone.iconShell}`}>
                <ShieldAlert className={`h-4 w-4 ${tone.icon}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight text-white">Debt / Obligations</p>
                    <p className="mt-0.5 text-[11px] font-medium text-white/76">Track what you owe.</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone.status}`}>{statusLabel}</span>
                </div>
              </div>
            </div>

            <div className="mb-2.5">
              <p className={`text-[30px] font-black leading-none tracking-[-0.045em] ${tone.value}`}>{compactCurrency(totalDebt)}</p>
              <p className="mt-2 text-sm font-semibold leading-tight text-white/82">
                {hasActiveDebt ? `Total active obligations${activeDebtCount > 0 ? ` (${activeDebtCount})` : ""}.` : "No active debt recorded."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] font-semibold leading-5 text-white/62">{safeMoneyImpactText}</p>
              <p className="mt-1 text-[11px] font-black tracking-[0.01em] text-cyan-100/92">{payoffEstimateText}</p>
            </div>

            {!isExpanded ? (
              <div className="mt-3 mb-1 grid grid-cols-3 gap-2">
                {summaryTiles.map((tile) => (
                  <div key={tile.label} className={tileClass}>
                    <p className={`truncate text-[13px] font-black leading-none tracking-[-0.025em] ${tile.valueClassName || "text-white/92"}`}>{tile.value}</p>
                    <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/42">{tile.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-white/6 pt-2">
            <button type="button" onClick={handleToggleDetails} className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:bg-white/10" aria-expanded={isExpanded}>
              <span>{isExpanded ? "Hide details" : "Show details"}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isExpanded ? (
          <div className="relative z-20 mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-black/15 p-3.5 pb-5 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={actionLoading} onClick={openCreateForm} className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2.5 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-45"><Plus className="h-4 w-4" />New Obligation</button>
              <button type="button" onClick={handleAskClara} className="flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-3 py-2.5 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15"><Brain className="h-4 w-4" />Ask CLARA</button>
            </div>

            {formOpen ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div><p className="text-sm font-black text-white">{form.id ? "Edit obligation" : "Add obligation"}</p><p className="text-[11px] font-semibold text-white/45">Name it like Home Credit, Credit Card, or Motor Loan.</p></div>
                  <button type="button" onClick={closeForm} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/65" aria-label="Close obligation form"><X className="h-4 w-4" /></button>
                </div>

                <div className="space-y-2.5">
                  <div><MiniLabel htmlFor="debt-title">Name</MiniLabel><input id="debt-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Example: Home Credit" className={fieldClass} /></div>
                  <div><MiniLabel htmlFor="debt-type">Type</MiniLabel><select id="debt-type" value={form.debtType} onChange={(event) => setForm((current) => ({ ...current, debtType: event.target.value }))} className={fieldClass}>{DEBT_TYPES.map((type) => <option key={type.value} value={type.value} className="bg-slate-950 text-white">{type.label}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><MiniLabel htmlFor="total-debt">Balance</MiniLabel><input id="total-debt" type="number" inputMode="decimal" min="0" value={form.totalDebt} onChange={(event) => setForm((current) => ({ ...current, totalDebt: event.target.value }))} placeholder="0" className={fieldClass} /></div>
                    <div><MiniLabel htmlFor="monthly-debt">Monthly</MiniLabel><input id="monthly-debt" type="number" inputMode="decimal" min="0" value={form.monthlyDebt} onChange={(event) => setForm((current) => ({ ...current, monthlyDebt: event.target.value }))} placeholder="0" className={fieldClass} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div><MiniLabel htmlFor="interest-rate">Interest</MiniLabel><input id="interest-rate" type="number" inputMode="decimal" min="0" value={form.interestRate} onChange={(event) => setForm((current) => ({ ...current, interestRate: event.target.value }))} placeholder="Optional" className={fieldClass} /></div>
                    <div><MiniLabel htmlFor="due-date">Due date</MiniLabel><input id="due-date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} placeholder="Example: 15th" className={fieldClass} /></div>
                  </div>
                </div>

                <button type="button" onClick={saveObligation} disabled={actionLoading} className="mt-3 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 px-3 py-2.5 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/15 disabled:opacity-45">
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {actionLoading ? "Saving..." : form.id ? "Update Obligation" : "Save Obligation"}
                </button>
              </div>
            ) : null}

            <div className="space-y-2.5">
              {debtObligations.length ? debtObligations.map((record) => {
                const balance = getBalance(record);
                const monthly = getMonthly(record);
                const interest = getInterest(record);
                const months = monthly > 0 && balance > 0 ? Math.ceil(balance / monthly) : 0;
                return (
                  <div key={record.id} className="rounded-2xl border border-white/10 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-black text-white">{getDebtTitle(record)}</p><p className="mt-1 text-[11px] font-semibold text-white/48">{getDebtTypeLabel(record.debtType || record.type)}{record.dueDate || record.due_date ? ` • Due ${record.dueDate || record.due_date}` : ""}</p></div>
                      <button type="button" onClick={() => openEditForm(record)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10" aria-label="Edit obligation"><Edit3 className="h-3.5 w-3.5" /></button>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/38">Balance</p><p className="mt-1 text-sm font-black text-white">{fmt(balance)}</p></div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/38">Monthly</p><p className="mt-1 text-sm font-black text-cyan-100">{fmt(monthly)}</p></div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white/50">{interest > 0 ? <span>{interest}% interest</span> : null}{months > 0 ? <span>• around {months} months left</span> : null}</div>
                  </div>
                );
              }) : <div className="rounded-2xl border border-dashed border-white/12 bg-black/20 p-4 text-center"><p className="text-sm font-black text-white">No obligations yet</p><p className="mt-1 text-[11px] font-semibold leading-5 text-white/50">Add installments, loans, cards, or personal balances one by one.</p></div>}
            </div>

            {notice ? <p className="text-[11px] font-semibold leading-5 text-white/58">{notice}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
