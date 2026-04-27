import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const DEBUG_CLARA_CONTEXT = false;
const INITIAL_MESSAGE = "I’m here. Ask me before you act.";
const FALLBACK_REPLY = "Got it. I’ll help you think through that.";
const MISSING_CONTEXT_REPLY = "I need more dashboard data before I can answer that clearly.";

function makeMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function hasFiniteNumber(value) {
  return hasValue(value) && Number.isFinite(Number(value));
}

function firstKnownValue(...values) {
  return values.find((value) => hasValue(value));
}

function firstKnownNumber(...values) {
  return values.find((value) => hasFiniteNumber(value));
}

function formatMoney(value) {
  if (!hasFiniteNumber(value)) return null;
  const number = Number(value);
  return `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function getWalletName(wallet) {
  return String(
    firstKnownValue(wallet?.name, wallet?.wallet_name, wallet?.title, "Wallet")
  ).trim();
}

function getWalletBalance(wallet) {
  return firstKnownNumber(
    wallet?.balance,
    wallet?.current_balance,
    wallet?.amount,
    wallet?.available_balance,
    wallet?.wallet_balance
  );
}

function getWalletSummary(context = {}) {
  const wallets = Array.isArray(context?.wallets) ? context.wallets : [];
  if (wallets.length === 0) {
    return "I don’t see wallet details yet, but that can also mean no wallets are loaded in this dashboard view.";
  }

  const totalWalletBalance = firstKnownNumber(
    context?.totalWalletBalance,
    context?.walletMoney,
    context?.totalMoneyLeft,
    context?.moneyLeftThisMonth,
    wallets.reduce((sum, wallet) => sum + Number(getWalletBalance(wallet) || 0), 0)
  );

  const topWallets = wallets
    .slice(0, 3)
    .map((wallet) => {
      const name = getWalletName(wallet);
      const balance = formatMoney(getWalletBalance(wallet));
      return balance ? `${name} (${balance})` : name;
    })
    .filter(Boolean);

  const totalText = formatMoney(totalWalletBalance);
  const walletCountText = `You have ${wallets.length} wallet${wallets.length === 1 ? "" : "s"} loaded.`;
  const balanceText = totalText ? ` Your total wallet balance is ${totalText}.` : "";
  const namesText = topWallets.length
    ? ` Your main wallets include ${topWallets.join(", ")}.`
    : "";

  return `${walletCountText}${balanceText}${namesText}`.trim();
}

function getEmergencySummary(context = {}) {
  const emergencyFund = context?.emergencyFund;

  if (!emergencyFund && !hasValue(context?.survivalExpense)) {
    return MISSING_CONTEXT_REPLY;
  }

  if (emergencyFund?.summary) return emergencyFund.summary;

  const monthsCovered = firstKnownNumber(
    emergencyFund?.monthsCovered,
    emergencyFund?.months
  );
  const currentValue = firstKnownNumber(
    emergencyFund?.currentAmount,
    emergencyFund?.saved,
    emergencyFund?.current,
    emergencyFund?.amount,
    emergencyFund?.progress,
    emergencyFund?.saved_amount,
    context?.emergencyFundSaved
  );
  const targetValue = firstKnownNumber(
    emergencyFund?.targetAmount,
    emergencyFund?.target,
    emergencyFund?.goal,
    emergencyFund?.goal_amount,
    context?.survivalExpense,
    context?.emergencyFundTarget
  );
  const percentageValue = firstKnownNumber(
    emergencyFund?.percentage,
    emergencyFund?.percent,
    emergencyFund?.progressPercent
  );

  const current = formatMoney(currentValue);
  const target = formatMoney(targetValue);
  const percentage = hasFiniteNumber(percentageValue)
    ? `${Number(percentageValue).toFixed(0)}%`
    : null;

  if (current && target && hasFiniteNumber(monthsCovered)) {
    return `Your emergency fund is at ${current} out of ${target}, covering about ${Number(monthsCovered)} month${Number(monthsCovered) === 1 ? "" : "s"}.`;
  }

  if (current && target) return `Your emergency fund is at ${current} out of ${target}.`;
  if (current) return `Your emergency fund currently has ${current}.`;
  if (target) return `Your emergency fund target is ${target}.`;
  if (percentage) return `Your emergency fund progress is around ${percentage}.`;
  if (hasFiniteNumber(monthsCovered)) {
    return `Your emergency fund covers about ${Number(monthsCovered)} month${Number(monthsCovered) === 1 ? "" : "s"}.`;
  }

  return "I can see your emergency fund section, but I need the fund amount fields to explain it clearly.";
}

function getSavingsSummary(context = {}) {
  const savings = context?.savings;
  if (!savings && !hasValue(context?.totalSavingsSaved) && !hasValue(context?.totalSavingsTarget)) {
    return MISSING_CONTEXT_REPLY;
  }

  if (savings?.summary) return savings.summary;

  const savedValue = firstKnownNumber(savings?.saved, savings?.current, context?.totalSavingsSaved);
  const targetValue = firstKnownNumber(savings?.target, savings?.goal, context?.totalSavingsTarget);
  const saved = formatMoney(savedValue);
  const target = formatMoney(targetValue);

  if (saved && target) return `Your savings progress is ${saved} out of ${target}.`;
  if (saved) return `Your saved amount is ${saved}.`;
  if (target) return `Your savings target is ${target}.`;
  return "I can see the savings section, but the detailed values are not complete yet.";
}

function getBudgetSummary(context = {}) {
  const budget = context?.budget;
  if (!budget && !hasValue(context?.budgetAllocated) && !hasValue(context?.budgetSpent)) {
    return MISSING_CONTEXT_REPLY;
  }

  if (budget?.summary) return budget.summary;

  const allocatedValue = firstKnownNumber(budget?.allocated, budget?.total, context?.budgetAllocated);
  const spentValue = firstKnownNumber(budget?.spent, budget?.used, context?.budgetSpent);
  const allocated = formatMoney(allocatedValue);
  const spent = formatMoney(spentValue);

  if (allocated && spent) return `Your current budget context shows ${spent} spent out of ${allocated} allocated.`;
  if (allocated) return `Your current budget allocation is ${allocated}.`;
  if (spent) return `Your current budget spending is ${spent}.`;
  return "I can see the budget section, but the detailed values are not complete yet.";
}

function getLocalReply(question, context = {}) {
  const text = String(question || "").toLowerCase();

  const totalMoneyLeft = firstKnownNumber(
    context?.totalMoneyLeft,
    context?.moneyLeftThisMonth,
    context?.walletMoney,
    context?.totalWalletBalance
  );

  const totalExpensesThisMonth = firstKnownNumber(
    context?.totalExpensesThisMonth,
    context?.thisMonthSpent,
    context?.monthlyExpenses,
    context?.monthlySpent
  );

  const asksWallet = text.includes("wallet");
  const asksEmergency = text.includes("emergency");
  const asksSavings = text.includes("saving") || text.includes("savings") || text.includes("goal");
  const asksBudget = text.includes("budget");
  const asksSpending = text.includes("spend") || text.includes("spent") || text.includes("expense");
  const asksWatch = text.includes("watch") || text.includes("careful") || text.includes("today");
  const asksMoneyLeft =
    text.includes("money") ||
    text.includes("left") ||
    text.includes("balance") ||
    text.includes("available");

  if (asksWallet) return getWalletSummary(context);
  if (asksEmergency) return getEmergencySummary(context);
  if (asksSavings) return getSavingsSummary(context);
  if (asksBudget) return getBudgetSummary(context);

  if (asksSpending) {
    const amount = formatMoney(totalExpensesThisMonth);
    if (!amount) return MISSING_CONTEXT_REPLY;
    const numeric = Number(totalExpensesThisMonth);
    if (numeric === 0) return "You haven’t logged spending this month yet.";
    return `You’ve spent ${amount} this month so far.`;
  }

  if (asksWatch) {
    const spent = formatMoney(totalExpensesThisMonth);
    const left = formatMoney(totalMoneyLeft);
    if (spent && left) return `Today, watch impulse spending. You have ${left} left and ${spent} spent this month.`;
    if (left) return `Today, protect your remaining ${left}. Pause before non-essential spending.`;
    return MISSING_CONTEXT_REPLY;
  }

  if (asksMoneyLeft) {
    const amount = formatMoney(totalMoneyLeft);
    return amount ? `You currently have ${amount} available.` : MISSING_CONTEXT_REPLY;
  }

  return FALLBACK_REPLY;
}

export default function ClaraAssistantPanel({ open, onClose, context = {} }) {
  if (DEBUG_CLARA_CONTEXT) {
    console.log("CLARA received context:", context);
  }

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(() => [makeMessage("clara", INITIAL_MESSAGE)]);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus?.(), 120);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [open, messages]);

  const sendDraft = () => {
    const text = draft.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      makeMessage("user", text),
      makeMessage("clara", getLocalReply(text, context)),
    ]);
    setDraft("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendDraft();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendDraft();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-md sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close CLARA assistant overlay" />

      <section className="relative z-[1] flex h-[78dvh] w-full max-w-md flex-col overflow-hidden rounded-[30px] border border-cyan-200/10 bg-[#06111f] text-white shadow-2xl sm:h-[680px]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#081827] px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-white">CLARA</h2>
            <p className="text-xs font-medium text-cyan-100/70">Ask before you act</p>
          </div>

          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 active:scale-95" aria-label="Close CLARA assistant">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-[22px] px-4 py-3 text-sm leading-6 ${isUser ? "rounded-br-md bg-cyan-300 text-slate-950" : "rounded-bl-md border border-white/10 bg-white/10 text-white/90"}`}>
                  {message.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/10 bg-[#06111f] px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
          <div className="flex items-end gap-2 rounded-[24px] border border-white/10 bg-white/10 p-2">
            <textarea ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} rows={1} placeholder="Ask CLARA before you act…" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/35" aria-label="Ask CLARA before you act" />

            <button type="submit" disabled={!draft.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35" aria-label="Send message">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
