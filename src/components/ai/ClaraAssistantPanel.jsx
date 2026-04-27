import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const DEBUG_CLARA_CONTEXT = false;
const INITIAL_MESSAGE = "I’m here. Ask me before you act.";
const FALLBACK_REPLY = "Got it. I’ll help you think through that. Tell me what decision you’re about to make, and I’ll help you slow it down before you spend.";
const LOADING_REPLY = "Dashboard data is still loading. Try again in a second.";

const QUICK_OPTIONS = [
  { label: "Check my spending", message: "Check my spending" },
  { label: "Check my wallets", message: "Check my wallets" },
  { label: "Available money", message: "How much money do I have left?" },
  { label: "Before I buy this", message: "Before I buy this" },
  { label: "What should I watch today?", message: "What should I watch today?" },
  { label: "Budget check", message: "Budget check" },
  { label: "Savings check", message: "Savings check" },
  { label: "Emergency fund", message: "Emergency fund" },
];

function makeMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function stopAssistantEvent(event) {
  if (!event) return;
  event.preventDefault?.();
  event.stopPropagation?.();

  if (event.nativeEvent) {
    event.nativeEvent.stopImmediatePropagation?.();
    event.nativeEvent.preventDefault?.();
    event.nativeEvent.stopPropagation?.();
  }
}

function stopAssistantPropagation(event) {
  if (!event) return;
  event.stopPropagation?.();
  event.nativeEvent?.stopPropagation?.();
}

function absorbShieldEvent(event) {
  if (!event) return;
  event.preventDefault?.();
  event.stopPropagation?.();
  event.nativeEvent?.stopImmediatePropagation?.();
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
    context?.totalAvailableMoney,
    context?.totalMoneyLeft,
    context?.moneyLeftThisMonth,
    context?.walletMoney,
    context?.totalWalletBalance
  );
}

function getMonthlySpent(context = {}) {
  return getNumber(
    context?.monthlySpent,
    context?.totalExpensesThisMonth,
    context?.thisMonthSpent,
    context?.monthlyExpenses
  );
}

function getWallets(context = {}) {
  return Array.isArray(context?.wallets) ? context.wallets : [];
}

function hasUsableContext(context = {}) {
  return getMoneyLeft(context) !== null || getMonthlySpent(context) !== null || getWallets(context).length > 0;
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

function getAvailabilityTone(moneyLeft) {
  if (moneyLeft === null) return "";
  if (moneyLeft <= 0) return "You’re in a tight zone, so pause any non-essential spending until this is clearer.";
  if (moneyLeft < 1000) return "That’s a thin buffer, so protect it and avoid small leaks today.";
  if (moneyLeft < 5000) return "You still have room, but small daily leaks can shrink it quickly.";
  return "You’re not in danger right now, but keep watching small daily leaks.";
}

function getSpendingTone(monthlySpent, moneyLeft) {
  if (monthlySpent === null) return "";
  if (monthlySpent === 0) return "That’s a clean start. Keep it intentional before the first spend lands.";
  if (moneyLeft !== null && moneyLeft > monthlySpent) {
    return "Your available money is still higher than what you’ve spent, so the focus is control, not panic.";
  }
  if (moneyLeft !== null && moneyLeft <= monthlySpent) {
    return "Your spending is catching up to your available money, so today is a good day to tighten wants.";
  }
  return "Keep checking whether today’s spending supports your real priorities.";
}

function getWalletSummary(context = {}) {
  const wallets = getWallets(context);

  if (wallets.length === 0) {
    return hasUsableContext(context) ? "I don’t see wallet details loaded yet." : LOADING_REPLY;
  }

  const readableBalances = wallets
    .map((wallet) => getWalletBalance(wallet))
    .filter((balance) => balance !== null);

  const fallbackTotal = readableBalances.reduce((sum, balance) => sum + balance, 0);
  const totalWalletBalance = getNumber(
    context?.totalWalletBalance,
    context?.walletMoney,
    context?.totalAvailableMoney,
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
  const guidanceSentence = totalWalletBalance !== null
    ? ` ${getAvailabilityTone(totalWalletBalance)}`
    : " Keep your main spending wallet visible so you can decide faster before buying.";

  return `You have ${wallets.length} wallet${wallets.length === 1 ? "" : "s"} loaded.${balanceSentence}${walletSentence}${guidanceSentence}`.trim();
}

function getEmergencySummary(context = {}) {
  const emergencyFund = context?.emergencyFund;
  const hasEmergencySection = Boolean(emergencyFund) || hasValue(context?.survivalExpense);

  if (!hasEmergencySection) {
    return hasUsableContext(context) ? "I need your emergency fund section before I can answer that clearly." : LOADING_REPLY;
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
    return `Your emergency fund is at ${current} out of ${target}, covering about ${monthsCovered} month${monthsCovered === 1 ? "" : "s"}. That’s your safety layer, so protect it from wants and use it only for real emergencies.`;
  }

  if (current && target) return `Your emergency fund is at ${current} out of ${target}. Keep building this before increasing lifestyle spending.`;
  if (current) return `Your emergency fund currently has ${current}. Treat that as protection money, not extra spending money.`;
  if (target) return `Your emergency fund target is ${target}. The next smart move is to keep small, consistent deposits going.`;
  if (percentage !== null) return `Your emergency fund progress is around ${percentage.toFixed(0)}%. Keep protecting this section before adding new wants.`;
  if (monthsCovered !== null) return `Your emergency fund covers about ${monthsCovered} month${monthsCovered === 1 ? "" : "s"}. That gives you breathing room, but it still needs protection.`;

  return "I can see your emergency fund section, but I need clearer fund values before I can explain it confidently.";
}

function getSavingsSummary(context = {}) {
  const savings = context?.savings;
  const hasSavingsSection = Boolean(savings) || hasValue(context?.totalSavingsSaved) || hasValue(context?.totalSavingsTarget);

  if (!hasSavingsSection) return hasUsableContext(context) ? "I need your savings section before I can answer that clearly." : LOADING_REPLY;
  if (savings?.summary) return savings.summary;

  const savedAmount = getNumber(savings?.saved, savings?.current, context?.totalSavingsSaved);
  const targetAmount = getNumber(savings?.target, savings?.goal, context?.totalSavingsTarget);

  const saved = savedAmount !== null ? formatMoney(savedAmount) : null;
  const target = targetAmount !== null ? formatMoney(targetAmount) : null;

  if (saved && target) return `Your savings progress is ${saved} out of ${target}. Keep this moving slowly and consistently; the goal is momentum, not pressure.`;
  if (saved) return `Your saved amount is ${saved}. That’s progress worth protecting from impulse spending.`;
  if (target) return `Your savings target is ${target}. Break it into smaller checkpoints so it feels easier to reach.`;

  return "I can see your savings section, but the detailed savings values are not complete yet.";
}

function getBudgetSummary(context = {}) {
  const budget = context?.budget;
  const hasBudgetSection = Boolean(budget) || hasValue(context?.budgetAllocated) || hasValue(context?.budgetSpent);

  if (!hasBudgetSection) return hasUsableContext(context) ? "I need your budget section before I can answer that clearly." : LOADING_REPLY;
  if (budget?.summary) return budget.summary;

  const allocatedAmount = getNumber(budget?.allocated, budget?.total, context?.budgetAllocated);
  const spentAmount = getNumber(budget?.spent, budget?.used, context?.budgetSpent);

  const allocated = allocatedAmount !== null ? formatMoney(allocatedAmount) : null;
  const spent = spentAmount !== null ? formatMoney(spentAmount) : null;

  if (allocated && spent) return `Your current budget context shows ${spent} spent out of ${allocated} allocated. Use the budget as a boundary, not a punishment.`;
  if (allocated) return `Your current budget allocation is ${allocated}. Before spending, check which category this decision belongs to.`;
  if (spent) return `Your current budget spending is ${spent}. The next step is to compare it against your declared limits.`;

  return "I can see your budget section, but I need clearer budget values before I can explain it confidently.";
}

function getLocalReply(question, context = {}) {
  const text = String(question || "").toLowerCase();

  const moneyLeft = getMoneyLeft(context);
  const monthlySpent = getMonthlySpent(context);
  const contextReady = hasUsableContext(context);

  const asksBeforeBuy =
    text.includes("before i buy") ||
    text.includes("before buying") ||
    text.includes("before i purchase") ||
    text.includes("should i buy");
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

  if (asksBeforeBuy) {
    return "What are you planning to buy, and how much will it cost?";
  }

  if (asksWallet) return getWalletSummary(context);
  if (asksEmergency) return getEmergencySummary(context);
  if (asksSavings) return getSavingsSummary(context);
  if (asksBudget) return getBudgetSummary(context);

  if (asksSpending) {
    if (monthlySpent === null) {
      return contextReady ? "I need your monthly spending value before I can answer that clearly." : LOADING_REPLY;
    }

    if (monthlySpent === 0) {
      const leftText = moneyLeft !== null ? ` You still have ${formatMoney(moneyLeft)} available, so keep the first spend intentional.` : "";
      return `You haven’t logged spending this month yet.${leftText}`;
    }

    const spentText = formatMoney(monthlySpent);
    const leftText = moneyLeft !== null ? ` You still have ${formatMoney(moneyLeft)} available.` : "";
    const tone = getSpendingTone(monthlySpent, moneyLeft);
    return `You’ve spent ${spentText} this month so far.${leftText} ${tone}`.trim();
  }

  if (asksWatch) {
    const spent = monthlySpent !== null ? formatMoney(monthlySpent) : null;
    const left = moneyLeft !== null ? formatMoney(moneyLeft) : null;

    if (spent && left) return `Today, watch small unplanned spending. You have ${left} available and ${spent} spent this month. Your available money is still healthy, but daily leaks can quietly weaken your month.`;
    if (left) return `Today, protect your remaining ${left}. Pause before non-essential spending and keep your main wallet clean.`;
    if (spent) return `Today, be mindful: you’ve already spent ${spent} this month. The safest move is to slow down wants and protect essentials.`;

    return contextReady ? "I need your money-left or monthly spending value before I can answer that clearly." : LOADING_REPLY;
  }

  if (asksMoneyLeft) {
    if (moneyLeft !== null) {
      const amount = formatMoney(moneyLeft);
      const spentText = monthlySpent !== null ? ` You’ve spent ${formatMoney(monthlySpent)} this month so far.` : "";
      return `You currently have ${amount} available.${spentText} ${getAvailabilityTone(moneyLeft)}`.trim();
    }

    return contextReady ? "I need your money-left value before I can answer that clearly." : LOADING_REPLY;
  }

  return FALLBACK_REPLY;
}

function getContextStatus(context = {}) {
  return hasUsableContext(context) ? "connected" : "loading";
}

function getBestContext(currentContext = {}, latestContext = {}) {
  if (hasUsableContext(currentContext)) return currentContext;
  if (hasUsableContext(latestContext)) return latestContext;
  return currentContext || latestContext || {};
}

export default function ClaraAssistantPanel({ open, onClose, context = {} }) {
  const latestContextRef = useRef(context || {});
  const lastTouchSentAtRef = useRef(0);

  const activeContext = getBestContext(context || {}, latestContextRef.current || {});
  latestContextRef.current = activeContext;

  useEffect(() => {
    latestContextRef.current = getBestContext(context || {}, latestContextRef.current || {});

    if (DEBUG_CLARA_CONTEXT) {
      console.log("CLARA received latest context:", latestContextRef.current);
    }
  }, [context]);

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(() => [makeMessage("clara", INITIAL_MESSAGE)]);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const contextStatus = getContextStatus(activeContext);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus?.(), 120);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [open, messages]);

  const sendMessageText = (messageText) => {
    const text = String(messageText || "").trim();
    if (!text) return;

    const currentContext = getBestContext(context || {}, latestContextRef.current || {});
    latestContextRef.current = currentContext;

    setMessages((current) => [
      ...current,
      makeMessage("user", text),
      makeMessage("clara", getLocalReply(text, currentContext)),
    ]);
  };

  const sendQuickOption = (option) => {
    const optionText =
      typeof option === "string" ? option : option?.message || option?.label || option?.text || "";

    if (!optionText) return;
    sendMessageText(optionText);
  };

  const handleQuickOptionTouchEnd = (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    lastTouchSentAtRef.current = Date.now();
    sendQuickOption(option);
  };

  const handleQuickOptionClick = (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();

    if (Date.now() - lastTouchSentAtRef.current < 700) return;

    sendQuickOption(option);
  };

  const handleCloseClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    onClose?.();
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (!text) return;

    sendMessageText(text);
    setDraft("");
  };

  const handleSubmit = (event) => {
    stopAssistantEvent(event);
    sendDraft();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    stopAssistantEvent(event);
    sendDraft();
  };

  if (!open) return null;

  if (!hasUsableContext(activeContext)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 z-0 bg-black/45 backdrop-blur-sm"
        onClick={absorbShieldEvent}
        onPointerDown={absorbShieldEvent}
        onTouchStart={absorbShieldEvent}
      />

      <section
        className="pointer-events-auto absolute bottom-[calc(12px+env(safe-area-inset-bottom))] left-3 right-3 z-10 mx-auto flex h-[78dvh] w-auto max-w-md flex-col overflow-hidden rounded-[30px] border border-cyan-200/10 bg-[#06111f] text-white shadow-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-[680px] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2"
        onClick={stopAssistantPropagation}
        onPointerDown={stopAssistantPropagation}
        onTouchStart={stopAssistantPropagation}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#081827] px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-tight text-white">CLARA</h2>
            <p className="text-xs font-medium text-cyan-100/70">Ask before you act</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-white/35">
              Context status: {contextStatus}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCloseClick}
            onPointerDown={(event) => event.stopPropagation()}
            onTouchStart={(event) => event.stopPropagation()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 active:scale-95"
            aria-label="Close CLARA assistant"
          >
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

        <div className="relative z-[1] shrink-0 border-t border-white/10 bg-[#06111f] px-3 pt-3">
          <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {QUICK_OPTIONS.map((option) => (
              <button
                key={option?.label || option}
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchEnd={(event) => handleQuickOptionTouchEnd(event, option)}
                onClick={(event) => handleQuickOptionClick(event, option)}
                className="shrink-0 rounded-full border border-cyan-200/10 bg-white/[0.07] px-3 py-2 text-[11px] font-medium text-white/80 transition active:scale-95"
              >
                {option?.label || option}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="shrink-0 bg-[#06111f] px-3 pb-3 pt-0">
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
