import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const DEBUG_CLARA_CONTEXT = false;
const INITIAL_MESSAGE = "I’m here. Ask me before you act.";
const FALLBACK_REPLY = "Got it. I’ll help you think through that. Tell me what decision you’re about to make, and I’ll help you slow it down before you spend.";
const LOADING_REPLY = "Dashboard data is still loading. Try again in a second.";

const QUICK_OPTIONS = [
  {
    label: "Check my spending",
    message: "Check my spending",
  },
  {
    label: "Check my wallets",
    message: "Check my wallets",
  },
  {
    label: "Available money",
    message: "How much money do I have left?",
  },
  {
    label: "Before I buy this",
    message: "Before I buy this",
  },
  {
    label: "What should I watch today?",
    message: "What should I watch today?",
  },
  {
    label: "Budget check",
    message: "Budget check",
  },
  {
    label: "Savings check",
    message: "Savings check",
  },
  {
    label: "Emergency fund",
    message: "Emergency fund",
  },
];

const AI_FEATURE_OPTIONS = [
  {
    label: "Predict My Future",
    description: "Forecast where your money is going.",
    message: "Predict my future",
  },
  {
    label: "Check My Spending",
    description: "Understand this month’s spending.",
    message: "Check my spending",
  },
  {
    label: "Savings Check",
    description: "See if my savings are on track.",
    message: "Savings check",
  },
  {
    label: "Budget Check",
    description: "Review my budget health.",
    message: "Budget check",
  },
  {
    label: "Before I Buy This",
    description: "Help me decide before spending.",
    message: "",
    mode: "purchase_decision",
  },
  {
    label: "Wallet Health",
    description: "Review my wallet balances.",
    message: "Wallet health",
  },
  {
    label: "Emergency Fund",
    description: "Check my survival buffer.",
    message: "Emergency fund",
  },
  {
    label: "Ask CLARA",
    description: "Open normal chat.",
    message: "",
  },
];


const CLARA_ASSISTANT_ANIMATION_STYLES = `
  @keyframes claraAssistantBackdropIn {
    from {
      opacity: 0;
      backdrop-filter: blur(0px);
      -webkit-backdrop-filter: blur(0px);
    }
    to {
      opacity: 1;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
  }

  @keyframes claraAssistantSheetIn {
    from {
      opacity: 0;
      transform: translate3d(0, 18px, 0) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes claraAssistantSheetInDesktop {
    from {
      opacity: 0;
      transform: translate3d(-50%, calc(-50% + 18px), 0) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translate3d(-50%, -50%, 0) scale(1);
    }
  }

  @keyframes claraAssistantOptionIn {
    from {
      opacity: 0;
      transform: translate3d(0, 10px, 0) scale(0.985);
    }
    to {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes claraAssistantGlowPulse {
    0%, 100% {
      opacity: 0.72;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.04);
    }
  }

  @keyframes claraAssistantBackdropOut {
    from {
      opacity: 1;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }
    to {
      opacity: 0;
      backdrop-filter: blur(0px);
      -webkit-backdrop-filter: blur(0px);
    }
  }

  @keyframes claraAssistantSheetOut {
    from {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
    to {
      opacity: 0;
      transform: translate3d(0, 16px, 0) scale(0.985);
    }
  }

  @keyframes claraAssistantSheetOutDesktop {
    from {
      opacity: 1;
      transform: translate3d(-50%, -50%, 0) scale(1);
    }
    to {
      opacity: 0;
      transform: translate3d(-50%, calc(-50% + 16px), 0) scale(0.985);
    }
  }

  .clara-ai-backdrop {
    animation: claraAssistantBackdropIn 180ms ease-out both;
  }

  .clara-ai-backdrop-out {
    animation: claraAssistantBackdropOut 170ms ease-in both;
  }

  .clara-ai-menu-shell {
    animation: claraAssistantSheetIn 220ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
    will-change: transform, opacity;
  }

  .clara-ai-chat-shell {
    animation: claraAssistantSheetIn 200ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
    will-change: transform, opacity;
  }

  .clara-ai-menu-shell-out,
  .clara-ai-chat-shell-out {
    animation: claraAssistantSheetOut 170ms ease-in both;
    will-change: transform, opacity;
  }

  .clara-ai-option {
    animation: claraAssistantOptionIn 240ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
    will-change: transform, opacity;
    transform-origin: center;
  }

  .clara-ai-glow {
    animation: claraAssistantGlowPulse 3.8s ease-in-out infinite;
    will-change: transform, opacity;
  }

  @media (min-width: 640px) {
    .clara-ai-menu-shell,
    .clara-ai-chat-shell {
      animation-name: claraAssistantSheetInDesktop;
    }

    .clara-ai-menu-shell-out,
    .clara-ai-chat-shell-out {
      animation-name: claraAssistantSheetOutDesktop;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .clara-ai-backdrop,
    .clara-ai-backdrop-out,
    .clara-ai-menu-shell,
    .clara-ai-menu-shell-out,
    .clara-ai-chat-shell,
    .clara-ai-chat-shell-out,
    .clara-ai-option,
    .clara-ai-glow {
      animation: none !important;
      will-change: auto !important;
    }
  }
`;

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
  const moneyLeft = getMoneyLeft(context);
  const survivalExpense = getNumber(context?.survivalExpense);
  const hasEmergencySection = Boolean(emergencyFund) || survivalExpense !== null || hasValue(context?.emergencyFundSaved) || hasValue(context?.emergencyFundTarget);

  if (!hasEmergencySection) {
    if (moneyLeft !== null) {
      return `I don’t see a dedicated emergency fund loaded here. Based only on available money, you have ${formatMoney(moneyLeft)} visible, so treat that as a cash buffer — not guaranteed emergency savings.`;
    }
    return hasUsableContext(context) ? "I don’t see emergency fund details loaded yet." : LOADING_REPLY;
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
    context?.emergencyFundTarget,
    context?.survivalExpense
  );
  const percentage = getNumber(
    emergencyFund?.percentage,
    emergencyFund?.percent,
    emergencyFund?.progressPercent
  );

  const current = currentAmount !== null ? formatMoney(currentAmount) : null;
  const target = targetAmount !== null ? formatMoney(targetAmount) : null;

  if (current && target && monthsCovered !== null) {
    return `Your emergency fund shows ${current} out of ${target}, covering about ${monthsCovered} month${monthsCovered === 1 ? "" : "s"}. Keep this protected from wants.`;
  }

  if (current && target) return `Your emergency fund shows ${current} out of ${target}. Keep building this before increasing lifestyle spending.`;
  if (current) return `Your emergency fund currently shows ${current}. Treat that as protection money, not extra spending money.`;
  if (target) return `Your survival buffer target appears to be ${target}. I don’t see the saved amount clearly yet, so I won’t overstate your emergency savings.`;
  if (percentage !== null) return `Your emergency fund progress is around ${percentage.toFixed(0)}%. Keep protecting this layer first.`;
  if (monthsCovered !== null) return `Your emergency fund covers about ${monthsCovered} month${monthsCovered === 1 ? "" : "s"}. That gives breathing room, but keep it protected.`;
  if (moneyLeft !== null) return `I see limited emergency fund details. Based only on available money, you have ${formatMoney(moneyLeft)} visible, so use that carefully as a buffer.`;

  return "I can see the emergency section, but the details are limited right now.";
}

function getSavingsSummary(context = {}) {
  const savings = context?.savings;
  const hasSavingsSection = Boolean(savings) || hasValue(context?.totalSavingsSaved) || hasValue(context?.totalSavingsTarget);

  if (!hasSavingsSection) {
    return "I don’t see savings progress yet, but that can simply mean no savings goal is loaded in this dashboard view.";
  }

  if (savings?.summary) return savings.summary;

  const savedAmount = getNumber(savings?.saved, savings?.current, savings?.saved_amount, context?.totalSavingsSaved);
  const targetAmount = getNumber(savings?.target, savings?.goal, savings?.target_amount, context?.totalSavingsTarget);

  const saved = savedAmount !== null ? formatMoney(savedAmount) : null;
  const target = targetAmount !== null ? formatMoney(targetAmount) : null;

  if (savedAmount !== null && targetAmount !== null) {
    const remaining = Math.max(targetAmount - savedAmount, 0);
    const percent = targetAmount > 0 ? Math.min((savedAmount / targetAmount) * 100, 100) : null;
    const progressText = percent !== null ? ` That’s about ${percent.toFixed(0)}% complete.` : "";
    return `Your savings progress is ${saved} out of ${target}.${progressText} Keep it consistent; small deposits still count.`;
  }

  if (savedAmount !== null) return `Your saved amount is ${saved}. That’s progress worth protecting from impulse spending.`;
  if (targetAmount !== null) return `Your savings target is ${target}. I don’t see saved progress yet, so start with a small first deposit.`;

  return "I don’t see savings progress yet, but that can simply mean no savings goal is loaded in this dashboard view.";
}

function getBudgetSummary(context = {}) {
  const budget = context?.budget;
  const hasBudgetSection = Boolean(budget) || hasValue(context?.budgetAllocated) || hasValue(context?.budgetSpent) || hasValue(context?.budgetRemaining);

  if (!hasBudgetSection) return "I don’t see a budget loaded in this dashboard view yet. That’s okay — use your available money as the temporary boundary for now.";
  if (budget?.summary) return budget.summary;

  const allocatedAmount = getNumber(budget?.allocated, budget?.total, budget?.allocated_amount, context?.budgetAllocated);
  const spentAmount = getNumber(budget?.spent, budget?.used, budget?.spent_amount, context?.budgetSpent);
  const explicitRemaining = getNumber(budget?.remaining, budget?.remaining_amount, context?.budgetRemaining);
  const remainingAmount = explicitRemaining !== null
    ? explicitRemaining
    : allocatedAmount !== null && spentAmount !== null
      ? Math.max(allocatedAmount - spentAmount, 0)
      : null;

  const allocated = allocatedAmount !== null ? formatMoney(allocatedAmount) : null;
  const spent = spentAmount !== null ? formatMoney(spentAmount) : null;
  const remaining = remainingAmount !== null ? formatMoney(remainingAmount) : null;

  if (allocated && spent && remaining) {
    const pressure = remainingAmount <= 0
      ? "You’re at or beyond the safe budget line, so pause wants first."
      : remainingAmount < allocatedAmount * 0.2
        ? "You still have room, but the margin is getting thin."
        : "Your budget still has breathing room, but keep spending intentional.";
    return `Budget check: ${spent} spent out of ${allocated}, with ${remaining} remaining. ${pressure}`;
  }

  if (allocated && spent) return `Budget check: ${spent} spent out of ${allocated}. Use that as your boundary before adding new wants.`;
  if (allocated) return `Your current budget allocation is ${allocated}. Before spending, check which category this decision belongs to.`;
  if (spent) return `Your current budget spending is ${spent}. The next step is to compare it against your declared limit.`;
  if (remaining) return `Your budget remaining shows ${remaining}. Keep this protected for the rest of the period.`;

  return "I can see a budget section, but the values are limited right now.";
}

function getForecastSummary(context = {}) {
  const moneyLeft = getMoneyLeft(context);
  const monthlySpent = getMonthlySpent(context);
  const walletCount = getWallets(context).length;
  const savings = getNumber(context?.savings?.saved, context?.savings?.current, context?.totalSavingsSaved);
  const budgetSpent = getNumber(context?.budget?.spent, context?.budget?.used, context?.budgetSpent);
  const emergencySaved = getNumber(context?.emergencyFund?.saved, context?.emergencyFund?.currentAmount, context?.emergencyFundSaved);

  if (moneyLeft === null && monthlySpent === null && walletCount === 0) {
    return LOADING_REPLY;
  }

  const parts = [];
  if (moneyLeft !== null) parts.push(`available money: ${formatMoney(moneyLeft)}`);
  if (monthlySpent !== null) parts.push(`month spending: ${formatMoney(monthlySpent)}`);
  if (walletCount > 0) parts.push(`${walletCount} wallet${walletCount === 1 ? "" : "s"}`);
  if (savings !== null) parts.push(`savings: ${formatMoney(savings)}`);
  if (budgetSpent !== null) parts.push(`budget spent: ${formatMoney(budgetSpent)}`);
  if (emergencySaved !== null) parts.push(`emergency fund: ${formatMoney(emergencySaved)}`);

  const risk = moneyLeft !== null && monthlySpent !== null && monthlySpent > moneyLeft
    ? "spending may overtake your remaining money if nothing changes"
    : moneyLeft !== null && moneyLeft < 1000
      ? "your buffer is thin, so small leaks matter"
      : "you still have room, but consistency will decide the outcome";

  return `Based on your current money and spending pattern, here’s what may happen if nothing changes: ${risk}. I’m only forecasting from this dashboard — ${parts.join(", ")}.`;
}

function getPurchaseDecisionReply(question, context = {}) {
  const moneyLeft = getMoneyLeft(context);
  const monthlySpent = getMonthlySpent(context);
  const priceMatch = String(question || "").replace(/,/g, "").match(/(?:₱|php\s*)?(\d+(?:\.\d{1,2})?)/i);
  const price = priceMatch ? Number(priceMatch[1]) : null;

  const priceText = price !== null ? ` This looks around ${formatMoney(price)}.` : "";
  const leftText = moneyLeft !== null ? ` You still have ${formatMoney(moneyLeft)} available.` : "";
  const spentText = monthlySpent !== null ? ` You’ve already spent ${formatMoney(monthlySpent)} this month.` : "";

  if (price !== null && moneyLeft !== null && price > moneyLeft) {
    return `I’d pause this purchase.${priceText}${leftText}${spentText} It may put pressure on your current money unless it’s truly urgent.`;
  }

  if (price !== null && moneyLeft !== null && price > moneyLeft * 0.15) {
    return `This is a noticeable spend.${priceText}${leftText}${spentText} If it’s a need, it may be okay. If it’s a want, wait and protect your budget first.`;
  }

  return `If this is a need, it may be okay. If it’s a want, pause first.${priceText}${leftText}${spentText} Protect your budget before buying.`.trim();
}

function getLocalReply(question, context = {}) {
  const text = String(question || "").toLowerCase();

  const moneyLeft = getMoneyLeft(context);
  const monthlySpent = getMonthlySpent(context);
  const contextReady = hasUsableContext(context);

  const asksForecast = text.includes("predict my future") || text.includes("financial future") || text.includes("forecast");
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

  if (asksForecast) return getForecastSummary(context);

  if (asksBeforeBuy) {
    return "What are you planning to buy, and how much is it?";
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
  const lastFeatureTouchSentAtRef = useRef(0);
  const lastBackdropTouchAtRef = useRef(0);
  const closeTimeoutRef = useRef(null);

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
  const [showFeatureMenu, setShowFeatureMenu] = useState(true);
  const [activeMode, setActiveMode] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const contextStatus = getContextStatus(activeContext);

  useEffect(() => {
    if (!open) return;

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsClosing(false);
    setShowFeatureMenu(true);
    setActiveMode(null);
    setMessages([makeMessage("clara", INITIAL_MESSAGE)]);
    setDraft("");
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open || showFeatureMenu) return;
    const timer = setTimeout(() => inputRef.current?.focus?.(), 120);
    return () => clearTimeout(timer);
  }, [open, showFeatureMenu]);

  useEffect(() => {
    if (!open || showFeatureMenu) return;
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [open, showFeatureMenu, messages]);

  const sendMessageText = (messageText) => {
    const text = String(messageText || "").trim();
    if (!text) return;

    const currentContext = getBestContext(context || {}, latestContextRef.current || {});
    latestContextRef.current = currentContext;

    const reply = activeMode === "purchase_decision"
      ? getPurchaseDecisionReply(text, currentContext)
      : getLocalReply(text, currentContext);

    setMessages((current) => [
      ...current,
      makeMessage("user", text),
      makeMessage("clara", reply),
    ]);

    if (activeMode === "purchase_decision") {
      setActiveMode(null);
    }
  };

  const sendQuickOption = (option) => {
    const optionText =
      typeof option === "string" ? option : option?.message || option?.label || option?.text || "";

    if (!optionText) return;

    if (String(optionText).toLowerCase().includes("before i buy")) {
      setActiveMode("purchase_decision");
    }

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

  const openAssistantWithPrompt = (option) => {
    if (isClosing) return;

    setShowFeatureMenu(false);

    if (option?.mode === "purchase_decision") {
      setActiveMode("purchase_decision");
      setMessages((current) => [
        ...current,
        makeMessage("clara", "What are you planning to buy, and how much is it?"),
      ]);
      return;
    }

    const prompt = String(option?.message || "").trim();
    if (prompt) {
      sendMessageText(prompt);
    }
  };

  const handleFeatureOptionTouchEnd = (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    if (isClosing) return;
    lastFeatureTouchSentAtRef.current = Date.now();
    openAssistantWithPrompt(option);
  };

  const handleFeatureOptionClick = (event, option) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();

    if (isClosing) return;
    if (Date.now() - lastFeatureTouchSentAtRef.current < 700) return;

    openAssistantWithPrompt(option);
  };

  const requestClose = () => {
    if (isClosing) return;

    setIsClosing(true);

    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      setIsClosing(false);
      setShowFeatureMenu(true);
      setActiveMode(null);
      setMessages([makeMessage("clara", INITIAL_MESSAGE)]);
      setDraft("");
      onClose?.();
    }, 180);
  };

  const handleCloseClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    requestClose();
  };

  const handleMenuBackdropTouchStart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();
    lastBackdropTouchAtRef.current = Date.now();
    requestClose();
  };

  const handleMenuBackdropClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent?.stopImmediatePropagation?.();

    if (Date.now() - lastBackdropTouchAtRef.current < 700) return;

    requestClose();
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

  if (showFeatureMenu) {
    return (
      <div className="fixed inset-0 z-[9999]">
        <style>{CLARA_ASSISTANT_ANIMATION_STYLES}</style>

        <div
          className={`${isClosing ? "clara-ai-backdrop-out" : "clara-ai-backdrop"} absolute inset-0 z-0 bg-black/50 backdrop-blur-md`}
          onClick={handleMenuBackdropClick}
          onPointerDown={absorbShieldEvent}
          onTouchStart={handleMenuBackdropTouchStart}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] mx-auto h-[58dvh] max-w-lg overflow-hidden">
          <div className="clara-ai-glow absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="clara-ai-glow absolute bottom-24 left-[18%] h-40 w-40 rounded-full bg-emerald-300/15 blur-3xl" />
          <div className="clara-ai-glow absolute bottom-20 right-[12%] h-44 w-44 rounded-full bg-sky-400/10 blur-3xl" />
        </div>

        <section
          className={`${isClosing ? "clara-ai-menu-shell-out" : "clara-ai-menu-shell"} pointer-events-auto absolute bottom-[calc(12px+env(safe-area-inset-bottom))] left-3 right-3 z-10 mx-auto max-h-[82dvh] w-auto max-w-md overflow-hidden rounded-[30px] border border-cyan-200/10 bg-[#06111f]/95 text-white shadow-[0_24px_80px_rgba(8,145,178,0.24)] backdrop-blur-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2`}
          onClick={stopAssistantPropagation}
          onPointerDown={stopAssistantPropagation}
          onTouchStart={stopAssistantPropagation}
        >
          <div className="relative overflow-hidden border-b border-white/10 bg-[#081827]/90 px-4 py-4">
            <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-cyan-300/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-14 h-36 w-36 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-200/30 to-transparent" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/45">
                  Long press mode
                </p>
                <h2 className="mt-1 text-xl font-bold leading-tight text-white">CLARA AI</h2>
                <p className="mt-1 text-sm font-medium text-cyan-100/70">
                  What do you need help with?
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseClick}
                onPointerDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 transition active:scale-90 active:bg-white/15"
                aria-label="Close CLARA AI menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[calc(82dvh-116px)] space-y-2 overflow-y-auto px-3 py-3">
            {AI_FEATURE_OPTIONS.map((option, index) => (
              <button
                key={option.label}
                style={{ animationDelay: `${70 + index * 34}ms` }}
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                onTouchEnd={(event) => handleFeatureOptionTouchEnd(event, option)}
                onClick={(event) => handleFeatureOptionClick(event, option)}
                className="clara-ai-option group flex w-full items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-white/[0.055] px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition duration-150 hover:bg-white/[0.08] active:translate-y-[1px] active:scale-[0.985] active:border-cyan-200/20 active:bg-cyan-200/[0.08]"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{option.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-white/55">
                    {option.description}
                  </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cyan-200/10 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(103,232,249,0.08)] transition duration-150 group-hover:bg-cyan-300/15 group-active:scale-90 group-active:bg-cyan-300/20">
                  <Send className="h-3.5 w-3.5" />
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      <style>{CLARA_ASSISTANT_ANIMATION_STYLES}</style>

      <div
        className={`${isClosing ? "clara-ai-backdrop-out" : "clara-ai-backdrop"} absolute inset-0 z-0 bg-black/45 backdrop-blur-sm`}
        onClick={absorbShieldEvent}
        onPointerDown={absorbShieldEvent}
        onTouchStart={absorbShieldEvent}
      />

      <section
        className={`${isClosing ? "clara-ai-chat-shell-out" : "clara-ai-chat-shell"} pointer-events-auto absolute bottom-[calc(12px+env(safe-area-inset-bottom))] left-3 right-3 z-10 mx-auto flex h-[78dvh] w-auto max-w-md flex-col overflow-hidden rounded-[30px] border border-cyan-200/10 bg-[#06111f] text-white shadow-2xl sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:h-[680px] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2`}
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/75 transition active:scale-90 active:bg-white/15"
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
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask CLARA before you act…"
              className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/35"
              aria-label="Ask CLARA before you act"
            />

            <button
              type="submit"
              disabled={!draft.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-slate-950 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
