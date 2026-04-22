import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Brain, Calculator, Lock, Sparkles, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";

const fmt = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export default function AiInsights() {
  const { user, access, getFeatureAccessMode, planLabel, isPreActivation } = useUserRole();
  const data = useFinancialData(user);
  const aiMode = getFeatureAccessMode("ai");
  const [decisionAmount, setDecisionAmount] = useState("");

  const summary = useMemo(() => {
    const expenses = data.expenses || [];
    const walletTransactions = data.walletTransactions || [];
    const now = new Date();
    const month = now.toISOString().slice(0, 7);

    const monthExpenses = expenses.filter((expense) =>
      String(expense.date || expense.created_at || "").startsWith(month)
    );

    const spent = monthExpenses.reduce((sum, item) => sum + toNumber(item.amount), 0);
    const income = walletTransactions
      .filter((item) => ["income", "add", "cash_in", "deposit"].includes(String(item.type).toLowerCase()))
      .filter((item) => String(item.created_at || item.date || "").startsWith(month))
      .reduce((sum, item) => sum + toNumber(item.amount), 0);

    const categoryTotals = monthExpenses.reduce((acc, expense) => {
      const category = String(expense.category || "other").toLowerCase();
      acc[category] = (acc[category] || 0) + toNumber(expense.amount);
      return acc;
    }, {});

    const topCategory =
      Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0] || null;

    return {
      spent,
      income,
      remaining: income - spent,
      transactionCount: monthExpenses.length,
      topCategory,
      average: monthExpenses.length ? spent / monthExpenses.length : 0,
    };
  }, [data.expenses, data.walletTransactions]);

  const decisionImpact = Math.max(0, toNumber(decisionAmount));
  const projected = summary.remaining - decisionImpact;

  if (!access.ai) {
    return (
      <div className="min-h-full px-4 pb-8 pt-4 md:px-6">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-[#0B1220] p-6 text-white">
          <Lock className="h-9 w-9 text-yellow-200" />
          <h1 className="mt-4 text-2xl font-bold">AI is locked for this tier</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Upgrade to PRO for basic summaries, CORE for advanced behavior insight,
            or Life OS for decision simulations.
          </p>
          <Link to="/enroll" className="mt-5 inline-flex">
            <Button className="rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500">
              View Plans
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 pb-8 pt-4 md:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(7,16,32,0.98),rgba(13,37,51,0.95)_52%,rgba(66,44,17,0.82))] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)] md:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
                <Brain className="h-3.5 w-3.5" />
                {planLabel} AI
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight md:text-4xl">
                CLARA Intelligence
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
                Tier-aware financial guidance generated from your real Supabase
                expenses, wallet transactions, and current access state.
              </p>
            </div>
            {isPreActivation ? (
              <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-xs font-semibold text-yellow-100">
                Preview
              </span>
            ) : null}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-[#0B1220] p-5 text-white">
            <TrendingDown className="h-6 w-6 text-rose-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/45">
              1-month summary
            </p>
            <p className="mt-2 text-2xl font-bold">{fmt(summary.spent)}</p>
            <p className="mt-1 text-sm text-white/55">
              {summary.transactionCount} expenses this month
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0B1220] p-5 text-white">
            <Sparkles className="h-6 w-6 text-emerald-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/45">
              Pattern
            </p>
            <p className="mt-2 text-lg font-bold capitalize">
              {summary.topCategory ? summary.topCategory[0] : "No pattern yet"}
            </p>
            <p className="mt-1 text-sm text-white/55">
              {summary.topCategory
                ? `${fmt(summary.topCategory[1])} is your largest category.`
                : "Log more expenses to unlock patterns."}
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[#0B1220] p-5 text-white">
            <Calculator className="h-6 w-6 text-cyan-200" />
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/45">
              Suggestion
            </p>
            <p className="mt-2 text-sm leading-6 text-white/75">
              {summary.remaining < 0
                ? "Pause non-essential spending and review your largest category first."
                : `You have ${fmt(summary.remaining)} left against this month's added funds.`}
            </p>
          </div>
        </div>

        {(aiMode === "advanced" || aiMode === "life_os") && (
          <section className="rounded-[30px] border border-white/10 bg-[#07111f] p-5 text-white">
            <h2 className="text-xl font-bold">Behavior insight</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">
              Your average expense is {fmt(summary.average)}. CLARA will treat
              purchases above that as decision moments and nudge you to check
              impact before spending.
            </p>
          </section>
        )}

        {aiMode === "life_os" && !isPreActivation && (
          <section className="rounded-[30px] border border-amber-300/20 bg-amber-300/10 p-5 text-white">
            <h2 className="text-xl font-bold">Should I buy this?</h2>
            <p className="mt-2 text-sm text-white/65">
              Enter an amount and CLARA simulates the impact against your month.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="number"
                min="0"
                value={decisionAmount}
                onChange={(event) => setDecisionAmount(event.target.value)}
                placeholder="Amount"
                className="h-12 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 text-white"
              />
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                After purchase: <strong>{fmt(projected)}</strong>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
