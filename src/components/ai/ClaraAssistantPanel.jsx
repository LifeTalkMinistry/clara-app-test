import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const DEBUG_CLARA_CONTEXT = false;
const INITIAL_MESSAGE = "I’m here. Ask me before you act.";
const FALLBACK_REPLY = "Got it. I’ll help you think through that.";

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

function getNumber(...values) {
  for (const value of values) {
    if (!hasValue(value)) continue;

    const cleaned = String(value).replace(/[₱,\s]/g, "");
    const number = Number(cleaned);

    if (Number.isFinite(number)) return number;
  }

  return null;
}

function getText(...values) {
  for (const value of values) {
    if (hasValue(value)) return String(value).trim();
  }

  return "";
}

function formatMoney(value) {
  const number = getNumber(value);
  if (number === null) return null;

  return `₱${number.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function getMoneyLeft(context = {}) {
  return getNumber(
    context?.totalMoneyLeft,
    context?.moneyLeftThisMonth,
    context?.walletMoney,
    context?.totalWalletBalance
  );
}

function getMonthlySpent(context = {}) {
  return getNumber(
    context?.totalExpensesThisMonth,
    context?.thisMonthSpent,
    context?.monthlyExpenses,
    context?.monthlySpent
  );
}

function getWalletName(wallet) {
  return getText(wallet?.name, wallet?.wallet_name, wallet?.title, "Wallet");
}

function getWalletBalance(wallet) {
  return getNumber(
    wallet?.balance,
    wallet?.current_balance,
    wallet?.wallet_balance,
    wallet?.available_balance,
    wallet?.amount
  );
}

function getWalletSummary(context = {}) {
  const wallets = Array.isArray(context?.wallets) ? context.wallets : [];

  if (wallets.length === 0) {
    return "I don’t see wallet details loaded yet.";
  }

  const readableBalances = wallets
    .map((wallet) => getWalletBalance(wallet))
    .filter((balance) => balance !== null);

  const fallbackTotal = readableBalances.reduce((sum, balance) => sum + balance, 0);
  const totalWalletBalance = getNumber(
    context?.totalWalletBalance,
    context?.walletMoney,
    context?.totalMoneyLeft,
    context?.moneyLeftThisMonth,
    readableBalances.length ? fallbackTotal : null
  );

  const topWallets = wallets
    .slice(0, 3)
    .map((wallet) => {
      const name = getWalletName(wallet);
      const balance = getWalletBalance(wallet);
      const formattedBalance = balance !== null ? formatMoney(balance) : null;
      return formattedBalance ? `${name} (${formattedBalance})` : name;
    })
    .filter(Boolean);

  const totalText = totalWalletBalance !== null ? formatMoney(totalWalletBalance) : null;
  const balanceSentence = totalText ? ` Your total wallet balance is ${totalText}.` : "";
  const walletSentence = topWallets.length
    ? ` Your main wallets include ${topWallets.join(", ")}.`
    : "";

  return `You have ${wallets.length} wallet${wallets.length === 1 ? "" : "s"} loaded.${balanceSentence}${walletSentence}`.trim();
}

function getEmergencySummary(context = {}) {
  const emergencyFund = context?.emergencyFund;
  const hasEmergencySection = Boolean(emergencyFund) || hasValue(context?.survivalExpense);

  if (!hasEmergencySection) {
    return "I need your emergency fund section before I can answer that clearly.";
  }

  if (emergencyFund?.summary) return emergencyFund.summary;

  const monthsCovered = getNumber(emergencyFund?.monthsCovered, emergencyFund?.months);
  const currentAmount = getNumber(
    emergencyFund?.currentAmount,
    emergencyFund?.saved,
    emergencyFund?.current,
    emergencyFund?.amount,
    emergencyFund?.progress,
    emergencyFund?.saved_amount,
    context?.emergencyFundSaved
  );
  const targetAmount = getNumber(
    emergencyFund?.targetAmount,
    emergencyFund?.target,
    emergencyFund?.goal,
    emergencyFund?.goal_amount,
    context?.survivalExpense,
    context?.emergencyFundTarget
  );
  const percentage = getNumber(
    emergencyFund?.percentage,
    emergencyFund?.percent,
    emergencyFund?.progressPercent
  );

  const current = currentAmount !== null ? formatMoney(currentAmount) : null;
  const target = targetAmount !== null ? formatMoney(targetAmount) : null;

  if (current && target && monthsCovered !== null) {
    return `Your emergency fund is at ${current} out of ${target}, covering about ${monthsCovered} month${monthsCovered === 1 ? "" : "s"}.`;
  }

  if (current && target) return `Your emergency fund is at ${current} out of ${target}.`;
  if (current) return `Your emergency fund currently has ${current}.`;
  if (target) return `Your emergency fund target is ${target}.`;
  if (percentage !== null) return `Your emergency fund progress is around ${percentage.toFixed(0)}%.`;
  if (monthsCovered !== null) return `Your emergency fund covers about ${monthsCovered} month${monthsCovered === 1 ? "" : "s"}.`;

  return "I can see your emergency fund section, but I need the fund amount fields to explain it clearly.";
}

function getSavingsSummary(context = {}) {
  const savings = context?.savings;
  const hasSavingsSection = Boolean(savings) || hasValue(context?.totalSavingsSaved) || hasValue(context?.totalSavingsTarget);

  if (!hasSavingsSection) return "I need your savings section before I can answer that clearly.";
  if (savings?.summary) return savings.summary;

  const savedAmount = getNumber(savings?.saved, savings?.current, context?.totalSavingsSaved);
  const targetAmount = getNumber(savings?.target, savings?.goal, context?.totalSavingsTarget);

  const saved = savedAmount !== null ? formatMoney(savedAmount) : null;
  const target = targetAmount !== null ? formatMoney(targetAmount) : null;

  if (saved && target) return `Your savings progress is ${saved} out of ${target}.`;
  if (saved) return `Your saved amount is ${saved}.`;
  if (target) return `Your savings target is ${target}.`;

  return "I can see the savings section, but the detailed values are not complete yet.";
}

function getBudgetSummary(context = {}) {
  const budget = context?.budget;
  const hasBudgetSection = Boolean(budget) || hasValue(context?.budgetAllocated) || hasValue(context?.budgetSpent);

  if (!hasBudgetSection) return "I need your budget section before I can answer that clearly.";
  if (budget?.summary) return budget.summary;

  const allocatedAmount = getNumber(budget?.allocated, budget?.total, context?.budgetAllocated);
  const spentAmount = getNumber(budget?.spent, budget?.used, context?.budgetSpent);

  const allocated = allocatedAmount !== null ? formatMoney(allocatedAmount) : null;
  const spent = spentAmount !== null ? formatMoney(spentAmount) : null;

  if (allocated && spent) return `Your current budget context shows ${spent} spent out of ${allocated} allocated.`;
  if (allocated) return `Your current budget allocation is ${allocated}.`;
  if (spent) return `Your current budget spending is ${spent}.`;

  return "I can see the budget section, but the detailed values are not complete yet.";
}

function getLocalReply(question, context = {}) {
  const text = String(question || "").toLowerCase();

  const moneyLeft = getMoneyLeft(context);
  const monthlySpent = getMonthlySpent(context);

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
    if (monthlySpent === null) {
      return "I need your monthly spending value before I can answer that clearly.";
    }

    if (monthlySpent === 0) {
      return "You haven’t logged spending this month yet.";
    }

    return `You’ve spent ${formatMoney(monthlySpent)} this month so far.`;
  }

  if (asksWatch) {
    const spent = monthlySpent !== null ? formatMoney(monthlySpent) : null;
    const left = moneyLeft !== null ? formatMoney(moneyLeft) : null;

    if (spent && left) return `Today, watch impulse spending. You have ${left} left and ${spent} spent this month.`;
    if (left) return `Today, protect your remaining ${left}. Pause before non-essential spending.`;
    if (spent) return `Today, be mindful: you’ve already spent ${spent} this month.`;

    return "I need your money-left or monthly spending value before I can answer that clearly.";
  }

  if (asksMoneyLeft) {
    if (moneyLeft !== null) {
      return `You currently have ${formatMoney(moneyLeft)} available.`;
    }

    return "I need your money-left value before I can answer that clearly.";
  }

  return FALLBACK_REPLY;
}

function getContextStatus(context = {}) {
  const wallets = Array.isArray(context?.wallets) ? context.wallets : [];
  const connected =
    getMoneyLeft(context) !== null ||
    getMonthlySpent(context) !== null ||
    wallets.length > 0;

  return connected ? "connected" : "missing";
}

export default function ClaraAssistantPanel({ open, onClose, context = {} }) {
  if (DEBUG_CLARA_CONTEXT) {
    console.log("CLARA received context:", context);
  }

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(() => [makeMessage("clara", INITIAL_MESSAGE)]);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const contextStatus = getContextStatus(context);

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
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
              Context status: {contextStatus}
            </p>
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
