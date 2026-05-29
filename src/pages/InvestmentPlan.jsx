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
};

const emptyFlowForm = {
  amount: "",
  walletId: "",
  date: getTodayDate(),
  notes: "",
};

const getSourceMoneyIn = (source) => toIncomeHubNumber(source?.totalMoneyIn ?? source?.total_money_in);
const getSourceMoneyOut = (source) => toIncomeHubNumber(source?.totalMoneyOut ?? source?.total_money_out);
const getSourceNet = (source) =>
  toIncomeHubNumber(source?.currentBalance ?? source?.current_balance ?? getSourceMoneyIn(source) - getSourceMoneyOut(source));

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
      <p className={`mt-1 truncate text-sm font-black leading-5 ${toneClass}`}>{value}</p>
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
  const [activeFlow, setActiveFlow] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);

  const wallets = useMemo(() => (Array.isArray(financial.wallets) ? financial.wallets : []), [financial.wallets]);

  const walletOptions = useMemo(
    () => wallets.map((wallet) => ({ value: String(wallet.id), label: getWalletName(wallet) })),
    [wallets]
  );

  const totals = useMemo(() => {
    const totalIn = sources.reduce((sum, source) => sum + getSourceMoneyIn(source), 0);
    const totalOut = sources.reduce((sum, source) => sum + getSourceMoneyOut(source), 0);
    const net = sources.reduce((sum, source) => sum + getSourceNet(source), 0);
    const topSource = [...sources].sort((a, b) => getSourceMoneyIn(b) - getSourceMoneyIn(a))[0] || null;

    return { totalIn, totalOut, net, topSource };
  }, [sources]);

  const loadSources = async () => {
    setLoadingSources(true);

    try {
      const records = await getIncomeSources(localUserId);
      setSources(records);
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

  const resetFlowForm = () => {
    setFlowForm({ ...emptyFlowForm, date: getTodayDate() });
    setActiveFlow(null);
  };

  const startCreateSource = () => {
    setSourceForm(emptySourceForm);
    setEditingSource(null);
    setShowSourceForm(true);
    setActiveFlow(null);
    setConfirmDeleteId(null);
    setFeedback(null);
  };

  const startEditSource = (source) => {
    setEditingSource(source);
    setSourceForm({
      name: source.name || "",
      category: source.category || "Other Income",
      stability: source.stability || "Irregular",
    });
    setShowSourceForm(true);
    setActiveFlow(null);
    setConfirmDeleteId(null);
    setFeedback(null);
  };

  const startFlow = (source, type) => {
    setActiveFlow({ sourceId: source.id, type });
    setFlowForm({ ...emptyFlowForm, date: getTodayDate() });
    setShowSourceForm(false);
    setConfirmDeleteId(null);
    setFeedback(null);
  };

  const saveSource = async () => {
    const name = sourceForm.name.trim();

    if (!name) {
      setFeedback({ tone: "amber", message: "Add a source name first, like Salary, Online Selling, Freelance, or Allowance." });
      return;
    }

    setSaving(true);

    try {
      await upsertIncomeSource(localUserId, {
        ...(editingSource || {}),
        id: editingSource?.id,
        name,
        category: sourceForm.category,
        stability: sourceForm.stability,
      });

      await loadSources();
      resetSourceForm();
      setFeedback({ tone: "cyan", message: editingSource ? "Income source updated." : "Income source created. You can now add money from it." });
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
      if (activeFlow?.sourceId === sourceId) resetFlowForm();
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
    const selectedSource = sources.find((source) => String(source.id) === String(activeFlow?.sourceId));
    const flowType = activeFlow?.type || "money_in";

    if (!selectedSource) {
      setFeedback({ tone: "amber", message: "Choose an income source first." });
      return;
    }

    if (amount <= 0) {
      setFeedback({ tone: "amber", message: "Enter an amount greater than zero." });
      return;
    }

    if (flowType === "money_in" && !flowForm.walletId) {
      setFeedback({ tone: "amber", message: "Choose which wallet receives this money." });
      return;
    }

    setSaving(true);

    try {
      const currentIn = getSourceMoneyIn(selectedSource);
      const currentOut = getSourceMoneyOut(selectedSource);
      const nextIn = flowType === "money_in" ? currentIn + amount : currentIn;
      const nextOut = flowType === "money_out" ? currentOut + amount : currentOut;
      const nextBalance = nextIn - nextOut;

      await upsertIncomeSource(localUserId, {
        ...selectedSource,
        totalMoneyIn: nextIn,
        totalMoneyOut: nextOut,
        currentBalance: nextBalance,
        lastActivityAt: new Date().toISOString(),
      });

      if (flowType === "money_in" && typeof financial.addIncome === "function") {
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
      resetFlowForm();
      setFeedback({
        tone: flowType === "money_in" ? "emerald" : "cyan",
        message: flowType === "money_in" ? "Money added from source and sent to wallet." : "Source cost recorded.",
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

  const renderSourceForm = () => (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/15 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div>
        <FieldLabel htmlFor="source-name">Source name</FieldLabel>
        <input
          id="source-name"
          value={sourceForm.name}
          onChange={(event) => setSourceForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Salary, Online Selling, Freelance, Allowance"
          className={controlClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <FieldLabel htmlFor="source-category">Category</FieldLabel>
          <SelectField
            id="source-category"
            value={sourceForm.category}
            onChange={(value) => setSourceForm((prev) => ({ ...prev, category: value }))}
            options={INCOME_SOURCE_CATEGORIES}
            placeholder=""
          />
        </div>
        <div>
          <FieldLabel htmlFor="source-stability">Stability</FieldLabel>
          <SelectField
            id="source-stability"
            value={sourceForm.stability}
            onChange={(value) => setSourceForm((prev) => ({ ...prev, stability: value }))}
            options={INCOME_SOURCE_STABILITY}
            placeholder=""
          />
        </div>
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
          {editingSource ? "Save Source" : "Create Source"}
        </button>
      </div>
    </div>
  );

  const renderFlowForm = (source) => {
    const isMoneyIn = activeFlow?.type === "money_in";

    return (
      <div className="mt-3 space-y-3 rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <p className="text-xs font-black text-white">
          {isMoneyIn ? "Add Money" : "Add Cost"} • {source.name}
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <FieldLabel htmlFor={`flow-amount-${source.id}`}>Amount</FieldLabel>
            <input
              id={`flow-amount-${source.id}`}
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
            <FieldLabel htmlFor={`flow-date-${source.id}`}>Date</FieldLabel>
            <input
              id={`flow-date-${source.id}`}
              type="date"
              value={flowForm.date}
              onChange={(event) => setFlowForm((prev) => ({ ...prev, date: event.target.value }))}
              className={controlClass}
            />
          </div>
        </div>

        {isMoneyIn ? (
          <div>
            <FieldLabel htmlFor={`flow-wallet-${source.id}`}>Send to wallet</FieldLabel>
            <SelectField
              id={`flow-wallet-${source.id}`}
              value={flowForm.walletId}
              onChange={(value) => setFlowForm((prev) => ({ ...prev, walletId: value }))}
              options={walletOptions}
              placeholder="Choose wallet"
            />
            {wallets.length === 0 ? <p className="mt-2 text-[11px] font-semibold text-amber-200">Create a wallet first before adding money.</p> : null}
          </div>
        ) : null}

        <div>
          <FieldLabel htmlFor={`flow-notes-${source.id}`}>Notes</FieldLabel>
          <input
            id={`flow-notes-${source.id}`}
            value={flowForm.notes}
            onChange={(event) => setFlowForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder={isMoneyIn ? "Example: payday, client payment" : "Example: inventory, materials, subscription"}
            className={controlClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={resetFlowForm}
            className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-white/72"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={saveFlow}
            disabled={saving || (isMoneyIn && wallets.length === 0)}
            className="flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 disabled:opacity-55"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
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

        <section className="relative overflow-hidden rounded-[1.85rem] border border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_46%),rgba(255,255,255,0.045)] p-4 shadow-[0_22px_60px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          <div className="relative flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/60">Income Hub</p>
              <h1 className="mt-1 text-2xl font-black leading-none tracking-[-0.05em] text-white">Income Sources</h1>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/64">Create every place where money comes from.</p>
            </div>
            <button
              type="button"
              onClick={startCreateSource}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              aria-label="Create income source"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          {sources.length > 0 ? (
            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <StatTile label="Money in" value={fmt(totals.totalIn)} tone="emerald" />
              <StatTile label="Money out" value={fmt(totals.totalOut)} tone="rose" />
              <StatTile label="Net" value={fmt(totals.net)} tone={totals.net >= 0 ? "white" : "rose"} />
            </div>
          ) : null}
        </section>

        <section className="mt-4 rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
          {loadingSources ? (
            <div className="rounded-2xl border border-white/10 bg-black/15 p-4 text-sm font-bold text-white/56">Loading income sources…</div>
          ) : showSourceForm ? (
            renderSourceForm()
          ) : sources.length === 0 ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-4">
                <p className="text-sm font-black text-white">No income source yet.</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/58">Start with your salary, business, allowance, or side hustle.</p>
              </div>

              <button
                type="button"
                onClick={startCreateSource}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:bg-cyan-400/15"
              >
                <Plus className="h-4 w-4" />
                Create Income Source
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source) => {
                const isActiveFlow = activeFlow?.sourceId === source.id;
                const sourceMoneyIn = getSourceMoneyIn(source);
                const sourceMoneyOut = getSourceMoneyOut(source);
                const sourceNet = getSourceNet(source);

                return (
                  <div key={source.id} className="rounded-2xl border border-white/10 bg-black/15 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{source.name}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-white/44">
                          {source.category} • {source.stability}
                        </p>
                      </div>
                      <p className={`shrink-0 text-sm font-black ${sourceNet >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{fmt(sourceNet)}</p>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <StatTile label="Money in" value={fmt(sourceMoneyIn)} tone="emerald" />
                      <StatTile label="Money out" value={fmt(sourceMoneyOut)} tone="rose" />
                      <StatTile label="Net" value={fmt(sourceNet)} tone={sourceNet >= 0 ? "white" : "rose"} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => startFlow(source, "money_in")}
                        className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2.5 text-xs font-black text-emerald-100"
                      >
                        Add Money
                      </button>
                      <button
                        type="button"
                        onClick={() => startFlow(source, "money_out")}
                        className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2.5 text-xs font-black text-rose-100"
                      >
                        Add Cost
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => startEditSource(source)}
                        className="flex min-h-[38px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/76"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(source.id)}
                        className="flex min-h-[38px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/76"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>

                    {isActiveFlow ? renderFlowForm(source) : null}

                    {confirmDeleteId === source.id ? (
                      <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3">
                        <p className="text-xs font-black text-rose-100">Delete this income source?</p>
                        <p className="mt-1 text-[11px] font-semibold text-white/58">This removes it from Income Hub tracking.</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs font-black text-white/70"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSource(source.id)}
                            disabled={saving}
                            className="rounded-xl border border-rose-300/25 bg-rose-400/15 px-3 py-2 text-xs font-black text-rose-100 disabled:opacity-55"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
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

          {sources.length > 0 ? (
            <button
              type="button"
              onClick={openClara}
              className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm font-black text-white/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/35"
            >
              <Brain className="h-4 w-4" />
              Ask CLARA About Income
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
}
