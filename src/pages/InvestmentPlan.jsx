import { ArrowLeft, Brain, CheckCircle2, Pencil, Plus, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";
import {
  INCOME_SOURCE_CATEGORIES,
  INCOME_SOURCE_STABILITY,
  deleteIncomeSource,
  getIncomeHubLocalUserId,
  getIncomeSources,
  toIncomeHubNumber,
  upsertIncomeSource,
} from "@/lib/incomeHubRepository";

const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value) || 0);

const getTodayDate = () => new Date().toISOString().split("T")[0];

const controlClass =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-3 text-sm font-bold text-white outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition placeholder:text-white/38 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/15";

const emptySourceForm = {
  name: "",
  category: "Salary",
  stability: "Stable",
  notes: "",
};

const emptyFlowForm = {
  sourceId: "",
  type: "money_in",
  amount: "",
  walletId: "",
  date: getTodayDate(),
  notes: "",
};

function FieldLabel({ children, htmlFor }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-white/52">
      {children}
    </label>
  );
}

function SelectField({ id, value, onChange, options, placeholder = "Select" }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={`${controlClass} appearance-none pr-9 backdrop-blur-xl`}
    >
      {placeholder ? (
        <option value="" className="bg-slate-950 text-white">
          {placeholder}
        </option>
      ) : null}
      {options.map((option) => (
        <option key={option.value || option} value={option.value || option} className="bg-slate-950 text-white">
          {option.label || option}
        </option>
      ))}
    </select>
  );
}

function StatTile({ label, value, tone = "white" }) {
  const toneClass = {
    emerald: "text-emerald-200",
    rose: "text-rose-200",
    cyan: "text-cyan-100",
    white: "text-white",
  }[tone];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/42">{label}</p>
      <p className={`mt-1 text-sm font-black leading-5 ${toneClass}`}>{value}</p>
    </div>
  );
}

function getWalletName(wallet) {
  return wallet?.name || wallet?.wallet_name || wallet?.title || "Wallet";
}

export default function InvestmentPlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const financial = useFinancialData(user);
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);

  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(true);
  const [sourceForm, setSourceForm] = useState(emptySourceForm);
  const [flowForm, setFlowForm] = useState(emptyFlowForm);
  const [editingSource, setEditingSource] = useState(null);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const wallets = useMemo(() => (Array.isArray(financial.wallets) ? financial.wallets : []), [financial.wallets]);

  const sourceOptions = useMemo(
    () => sources.map((source) => ({ value: source.id, label: source.name })),
    [sources]
  );

  const walletOptions = useMemo(
    () => wallets.map((wallet) => ({ value: String(wallet.id), label: getWalletName(wallet) })),
    [wallets]
  );

  const totals = useMemo(() => {
    const totalIn = sources.reduce((sum, source) => sum + toIncomeHubNumber(source.totalMoneyIn ?? source.total_money_in), 0);
    const totalOut = sources.reduce((sum, source) => sum + toIncomeHubNumber(source.totalMoneyOut ?? source.total_money_out), 0);
    const net = sources.reduce((sum, source) => sum + toIncomeHubNumber(source.currentBalance ?? source.current_balance), 0);
    const topSource = [...sources].sort(
      (a, b) => toIncomeHubNumber(b.currentBalance ?? b.current_balance) - toIncomeHubNumber(a.currentBalance ?? a.current_balance)
    )[0];

    return { totalIn, totalOut, net, topSource };
  }, [sources]);

  const loadSources = async () => {
    setLoadingSources(true);
    try {
      const records = await getIncomeSources(localUserId);
      setSources(records);
      if (!flowForm.sourceId && records?.[0]?.id) {
        setFlowForm((prev) => ({ ...prev, sourceId: records[0].id }));
      }
    } catch (error) {
      console.error("CLARA income hub load error:", error);
      setFeedback({ tone: "rose", message: "CLARA could not load your income sources yet." });
    } finally {
      setLoadingSources(false);
    }
  };

  useEffect(() => {
    loadSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localUserId]);

  const refreshFinance = async () => {
    if (typeof financial.refreshData === "function") {
      await financial.refreshData();
    }

    window.dispatchEvent(new Event("clara-finance-updated"));
    window.dispatchEvent(new Event("clara-wallets-updated"));
    window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
  };

  const resetSourceForm = () => {
    setSourceForm(emptySourceForm);
    setEditingSource(null);
    setShowSourceForm(false);
  };

  const startEditSource = (source) => {
    setEditingSource(source);
    setSourceForm({
      name: source.name || "",
      category: source.category || "Other Income",
      stability: source.stability || "Irregular",
      notes: source.notes || "",
    });
    setShowSourceForm(true);
    setFeedback(null);
  };

  const saveSource = async () => {
    const name = sourceForm.name.trim();

    if (!name) {
      setFeedback({ tone: "amber", message: "Add a clear source name first, like Salary, Online Selling, or Freelance." });
      return;
    }

    setSaving(true);

    try {
      const saved = await upsertIncomeSource(localUserId, {
        ...(editingSource || {}),
        id: editingSource?.id,
        name,
        category: sourceForm.category,
        stability: sourceForm.stability,
        notes: sourceForm.notes.trim(),
      });

      await loadSources();
      setFlowForm((prev) => ({ ...prev, sourceId: prev.sourceId || saved.id }));
      resetSourceForm();
      setFeedback({ tone: "cyan", message: editingSource ? "Income source updated." : "Income source added." });
    } catch (error) {
      console.error("CLARA income source save error:", error);
      setFeedback({ tone: "rose", message: "CLARA could not save this income source yet." });
    } finally {
      setSaving(false);
    }
  };

  const deleteSource = async (sourceId) => {
    if (!sourceId) return;

    setSaving(true);

    try {
      await deleteIncomeSource(localUserId, sourceId);
      await loadSources();
      setConfirmDeleteId(null);
      if (flowForm.sourceId === sourceId) {
        setFlowForm((prev) => ({ ...prev, sourceId: "" }));
      }
      setFeedback({ tone: "cyan", message: "Income source deleted." });
    } catch (error) {
      console.error("CLARA income source delete error:", error);
      setFeedback({ tone: "rose", message: "CLARA could not delete this income source yet." });
    } finally {
      setSaving(false);
    }
  };

  const saveFlow = async () => {
    const amount = toIncomeHubNumber(flowForm.amount);
    const selectedSource = sources.find((source) => String(source.id) === String(flowForm.sourceId));

    if (!selectedSource) {
      setFeedback({ tone: "amber", message: "Choose an income source first." });
      return;
    }

    if (amount <= 0) {
      setFeedback({ tone: "amber", message: "Enter an amount greater than zero." });
      return;
    }

    if (flowForm.type === "money_in" && !flowForm.walletId) {
      setFeedback({ tone: "amber", message: "Choose which wallet receives this money." });
      return;
    }

    setSaving(true);

    try {
      const currentIn = toIncomeHubNumber(selectedSource.totalMoneyIn ?? selectedSource.total_money_in);
      const currentOut = toIncomeHubNumber(selectedSource.totalMoneyOut ?? selectedSource.total_money_out);
      const nextIn = flowForm.type === "money_in" ? currentIn + amount : currentIn;
      const nextOut = flowForm.type === "money_out" ? currentOut + amount : currentOut;
      const nextBalance = nextIn - nextOut;

      await upsertIncomeSource(localUserId, {
        ...selectedSource,
        totalMoneyIn: nextIn,
        totalMoneyOut: nextOut,
        currentBalance: nextBalance,
        lastActivityAt: new Date().toISOString(),
      });

      if (flowForm.type === "money_in" && typeof financial.addIncome === "function") {
        await financial.addIncome({
          amount,
          wallet_id: flowForm.walletId,
          walletId: flowForm.walletId,
          source_type: selectedSource.name,
          source: selectedSource.name,
          notes: flowForm.notes.trim() || selectedSource.name,
          date: flowForm.date,
          transaction_date: flowForm.date,
          type: "income",
          income_source_id: selectedSource.id,
          incomeSourceId: selectedSource.id,
        });
        await refreshFinance();
      }

      await loadSources();
      setFlowForm((prev) => ({ ...emptyFlowForm, sourceId: prev.sourceId, walletId: prev.walletId, date: getTodayDate() }));
      setFeedback({
        tone: flowForm.type === "money_in" ? "emerald" : "cyan",
        message:
          flowForm.type === "money_in"
            ? "Money in recorded and sent to wallet."
            : "Money out recorded as source cost.",
      });
    } catch (error) {
      console.error("CLARA income flow save error:", error);
      setFeedback({ tone: "rose", message: "CLARA could not record this income flow yet." });
    } finally {
      setSaving(false);
    }
  };

  const openClara = () => {
    window.dispatchEvent(
      new CustomEvent("clara:open-ai-chat", {
        detail: {
          source: "income-hub-page",
          prompt: `Review my Income Hub as a behavioral money coach. I have ${sources.length} income sources. Total money in is ${fmt(totals.totalIn)}, money out or source cost is ${fmt(totals.totalOut)}, and net income source balance is ${fmt(totals.net)}. My top source is ${totals.topSource?.name || "not set"}. Help me understand income dependency, stability, and what source I should protect or grow next.`,
          incomeHubContext: {
            sourceCount: sources.length,
            totalMoneyIn: totals.totalIn,
            totalMoneyOut: totals.totalOut,
            netIncomeSourceBalance: totals.net,
            topSource: totals.topSource || null,
            sources,
          },
        },
      })
    );
  };

  return (
    <div className="theme-page-shell min-h-[100dvh] overflow-y-auto text-white">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-4 pb-[calc(env(safe-area-inset-bottom,0px)+28px)] pt-[calc(env(safe-area-inset-top,0px)+14px)]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/78 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <section className="relative overflow-hidden rounded-[1.85rem] border border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.18),transparent_46%),rgba(255,255,255,0.045)] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-100">
              <WalletCards className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/60">Income Hub</p>
              <h1 className="mt-1 text-2xl font-black leading-none tracking-[-0.05em] text-white">Where your money comes from.</h1>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/64">
                Add salary, business, side hustle, allowance, or freelance sources before money enters your wallets.
              </p>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <StatTile label="Sources" value={sources.length} tone="cyan" />
            <StatTile label="Money in" value={fmt(totals.totalIn)} tone="emerald" />
            <StatTile label="Net" value={fmt(totals.net)} tone={totals.net >= 0 ? "white" : "rose"} />
          </div>
        </section>

        <section className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/46">Income sources</p>
              <p className="mt-1 text-xs font-semibold text-white/58">Create every place where money comes from.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSourceForm((value) => !value);
                setEditingSource(null);
                setSourceForm(emptySourceForm);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {showSourceForm ? (
            <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3">
              <div>
                <FieldLabel htmlFor="source-name">Source name</FieldLabel>
                <input
                  id="source-name"
                  value={sourceForm.name}
                  onChange={(event) => setSourceForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Example: UnifyCX Salary, Online Selling, Freelance"
                  className={controlClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <FieldLabel htmlFor="source-category">Category</FieldLabel>
                  <SelectField id="source-category" value={sourceForm.category} onChange={(value) => setSourceForm((prev) => ({ ...prev, category: value }))} options={INCOME_SOURCE_CATEGORIES} placeholder="" />
                </div>
                <div>
                  <FieldLabel htmlFor="source-stability">Stability</FieldLabel>
                  <SelectField id="source-stability" value={sourceForm.stability} onChange={(value) => setSourceForm((prev) => ({ ...prev, stability: value }))} options={INCOME_SOURCE_STABILITY} placeholder="" />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="source-notes">Notes</FieldLabel>
                <input
                  id="source-notes"
                  value={sourceForm.notes}
                  onChange={(event) => setSourceForm((prev) => ({ ...prev, notes: event.target.value }))}
                  placeholder="Optional details"
                  className={controlClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={resetSourceForm}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-white/72"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveSource}
                  disabled={saving}
                  className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 disabled:opacity-55"
                >
                  {editingSource ? "Update Source" : "Add Source"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-2.5">
            {loadingSources ? (
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm font-bold text-white/56">Loading income sources…</div>
            ) : sources.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-sm font-black text-white">No income source yet.</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/58">Start with your salary, business, allowance, or side hustle.</p>
              </div>
            ) : (
              sources.map((source) => (
                <div key={source.id} className="rounded-2xl border border-white/10 bg-black/15 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{source.name}</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-white/44">
                        {source.category} • {source.stability}
                      </p>
                    </div>
                    <p className={`shrink-0 text-sm font-black ${toIncomeHubNumber(source.currentBalance ?? source.current_balance) >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                      {fmt(source.currentBalance ?? source.current_balance)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <StatTile label="In" value={fmt(source.totalMoneyIn ?? source.total_money_in)} tone="emerald" />
                    <StatTile label="Out" value={fmt(source.totalMoneyOut ?? source.total_money_out)} tone="rose" />
                    <StatTile label="Net" value={fmt(source.currentBalance ?? source.current_balance)} tone="white" />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => startEditSource(source)}
                      className="flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(source.id)}
                      className="flex min-h-[40px] items-center justify-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-xs font-black text-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>

                  {confirmDeleteId === source.id ? (
                    <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3">
                      <p className="text-xs font-black text-rose-100">Delete this income source?</p>
                      <p className="mt-1 text-[11px] font-semibold text-white/58">This removes it from Income Hub tracking.</p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/70">
                          Cancel
                        </button>
                        <button type="button" onClick={() => deleteSource(source.id)} disabled={saving} className="rounded-xl border border-rose-300/25 bg-rose-400/15 px-3 py-2 text-xs font-black text-rose-100 disabled:opacity-55">
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-4 space-y-3.5 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/46">Money flow</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/58">Record money in from a source, then send it to a wallet. Record money out as source cost.</p>
          </div>

          <div>
            <FieldLabel htmlFor="flow-source">Income source</FieldLabel>
            <SelectField id="flow-source" value={flowForm.sourceId} onChange={(value) => setFlowForm((prev) => ({ ...prev, sourceId: value }))} options={sourceOptions} placeholder="Choose source" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setFlowForm((prev) => ({ ...prev, type: "money_in" }))}
              className={`rounded-2xl border px-4 py-3 text-sm font-black ${flowForm.type === "money_in" ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100" : "border-white/10 bg-black/15 text-white/58"}`}
            >
              Money In
            </button>
            <button
              type="button"
              onClick={() => setFlowForm((prev) => ({ ...prev, type: "money_out" }))}
              className={`rounded-2xl border px-4 py-3 text-sm font-black ${flowForm.type === "money_out" ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-white/10 bg-black/15 text-white/58"}`}
            >
              Money Out
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <FieldLabel htmlFor="flow-amount">Amount</FieldLabel>
              <input
                id="flow-amount"
                type="number"
                inputMode="decimal"
                min="0"
                value={flowForm.amount}
                onChange={(event) => setFlowForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder="0"
                className={controlClass}
              />
            </div>
            <div>
              <FieldLabel htmlFor="flow-date">Date</FieldLabel>
              <input
                id="flow-date"
                type="date"
                value={flowForm.date}
                onChange={(event) => setFlowForm((prev) => ({ ...prev, date: event.target.value }))}
                className={controlClass}
              />
            </div>
          </div>

          {flowForm.type === "money_in" ? (
            <div>
              <FieldLabel htmlFor="flow-wallet">Send to wallet</FieldLabel>
              <SelectField id="flow-wallet" value={flowForm.walletId} onChange={(value) => setFlowForm((prev) => ({ ...prev, walletId: value }))} options={walletOptions} placeholder="Choose wallet" />
              {wallets.length === 0 ? <p className="mt-2 text-[11px] font-semibold text-amber-200">Create a wallet first before recording money in.</p> : null}
            </div>
          ) : null}

          <div>
            <FieldLabel htmlFor="flow-notes">Notes</FieldLabel>
            <input
              id="flow-notes"
              value={flowForm.notes}
              onChange={(event) => setFlowForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder={flowForm.type === "money_in" ? "Example: payday, client payment" : "Example: inventory, materials, subscription"}
              className={controlClass}
            />
          </div>

          <button
            type="button"
            onClick={saveFlow}
            disabled={saving || sources.length === 0 || (flowForm.type === "money_in" && wallets.length === 0)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-55"
          >
            <CheckCircle2 className="h-4 w-4" />
            {flowForm.type === "money_in" ? "Record Money In" : "Record Money Out"}
          </button>
        </section>

        <section className="mt-3.5 grid gap-3">
          {feedback ? (
            <div
              className={`rounded-2xl border px-4 py-3 text-[12px] font-bold leading-5 ${
                feedback.tone === "emerald"
                  ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
                  : feedback.tone === "rose"
                    ? "border-rose-300/20 bg-rose-400/10 text-rose-100"
                    : feedback.tone === "amber"
                      ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
                      : "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <button
            type="button"
            onClick={openClara}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
          >
            <Brain className="h-4 w-4" />
            Ask CLARA About My Income
          </button>
        </section>
      </div>
    </div>
  );
}
