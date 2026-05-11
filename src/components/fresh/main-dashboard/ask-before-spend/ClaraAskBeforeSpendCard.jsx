import { useMemo, useState } from "react";
import { Send, ShieldCheck, Sparkles } from "lucide-react";
import {
  CLARA_DECISION_STYLES,
  evaluateClaraPurchaseDecision,
  formatPeso,
  getDefaultCoachState,
  safeNumber,
} from "@/lib/claraAskBeforeSpend";

function getMoneyLeft({ monthlyBudgetPlan, walletMoney }) {
  return safeNumber(
    monthlyBudgetPlan?.remaining ??
      monthlyBudgetPlan?.totalRemaining ??
      walletMoney?.moneyLeft ??
      walletMoney?.available ??
      walletMoney?.balance ??
      walletMoney?.total ??
      0
  );
}

function getBudgetCategories(monthlyBudgetPlan) {
  if (Array.isArray(monthlyBudgetPlan?.categories)) return monthlyBudgetPlan.categories;
  if (Array.isArray(monthlyBudgetPlan?.categoryRows)) return monthlyBudgetPlan.categoryRows;
  return [];
}

export default function ClaraAskBeforeSpendCard({
  monthlyBudgetPlan = null,
  walletMoney = null,
  thisMonthSpent = 0,
  loading = false,
  onQuickExpense,
}) {
  const [prompt, setPrompt] = useState("");
  const [decision, setDecision] = useState(null);

  const financeContext = useMemo(
    () => ({
      budgets: getBudgetCategories(monthlyBudgetPlan),
      budgetSummaries: monthlyBudgetPlan,
      expenses: [],
      moneyLeft: getMoneyLeft({ monthlyBudgetPlan, walletMoney }),
      moneyLeftThisMonth: getMoneyLeft({ monthlyBudgetPlan, walletMoney }),
      currentMonthExpenses: safeNumber(monthlyBudgetPlan?.spent ?? monthlyBudgetPlan?.totalSpent ?? thisMonthSpent),
      thisMonthSpent: safeNumber(monthlyBudgetPlan?.spent ?? monthlyBudgetPlan?.totalSpent ?? thisMonthSpent),
      loading,
    }),
    [loading, monthlyBudgetPlan, thisMonthSpent, walletMoney]
  );

  const activeDecision = decision || getDefaultCoachState(financeContext);
  const style = CLARA_DECISION_STYLES[activeDecision.status] || CLARA_DECISION_STYLES.idle;
  const canAsk = prompt.trim().length > 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    setDecision(evaluateClaraPurchaseDecision(prompt, financeContext));
  };

  return (
    <section
      className={`mb-3 overflow-hidden rounded-[28px] border ${style.ring} bg-[#06111f]/92 shadow-[0_22px_68px_rgba(0,0,0,0.34)] backdrop-blur-2xl transition duration-300 active:scale-[0.99]`}
    >
      <div className="relative p-4">
        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${style.glow}`} />
        <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-violet-400/14 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white/68">
              <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
              Ask before you spend
            </div>

            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${style.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              {activeDecision.label}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[auto,1fr] gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-200/15 bg-cyan-300/10 text-cyan-100 shadow-[0_12px_36px_rgba(34,211,238,0.12)]">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="text-lg font-black tracking-[-0.035em] text-white">
                {activeDecision.headline}
              </h3>
              <p className="mt-1.5 text-sm font-semibold leading-snug text-white/68">
                {activeDecision.body}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">
              Next best action
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-white/82">
              {activeDecision.nextAction}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {activeDecision.reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1 text-[11px] font-bold text-white/62"
                >
                  {reason}
                </span>
              ))}
              <span className="rounded-full border border-cyan-200/10 bg-cyan-300/[0.07] px-3 py-1 text-[11px] font-bold text-cyan-50/70">
                Left: {formatPeso(financeContext.moneyLeft)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-3">
            <div className="flex items-center gap-2 rounded-[23px] border border-white/12 bg-[#050b17]/78 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
              <input
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Coffee ₱180, shoes ₱1,200..."
                className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35"
              />
              <button
                type="submit"
                disabled={!canAsk}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-200/15 bg-cyan-300/18 text-cyan-50 transition duration-200 hover:bg-cyan-300/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Ask CLARA before spending"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDecision(evaluateClaraPurchaseDecision("coffee ₱180", financeContext))}
              className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-2.5 text-xs font-bold text-white/68 transition duration-200 hover:bg-white/[0.08] active:scale-[0.98]"
            >
              Test coffee ₱180
            </button>
            <button
              type="button"
              onClick={onQuickExpense}
              className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2.5 text-xs font-bold text-emerald-50/78 transition duration-200 hover:bg-emerald-400/15 active:scale-[0.98]"
            >
              Log after buying
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
