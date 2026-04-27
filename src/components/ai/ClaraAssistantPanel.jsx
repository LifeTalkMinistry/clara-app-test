import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const DEBUG_CLARA_CONTEXT = false;
const INITIAL_MESSAGE = "I’m here. Ask me before you act.";
const FALLBACK_REPLY = "Got it. I’ll help you think through that. Tell me what decision you’re about to make, and I’ll help you slow it down before you spend.";
const LOADING_REPLY = "Dashboard data is still loading. Try again in a second.";
const CLOSE_ANIMATION_MS = 190;
const GHOST_CLICK_WINDOW_MS = 520;
const TOUCH_DEDUPE_MS = 700;

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

  .clara-ai-backdrop {
    animation: claraAssistantBackdropIn 180ms ease-out both;
    touch-action: manipulation;
  }

  .clara-ai-backdrop-out {
    animation: claraAssistantBackdropOut 170ms ease-in both;
    pointer-events: auto;
  }

  .clara-ai-menu-shell,
  .clara-ai-chat-shell {
    animation: claraAssistantSheetIn 210ms cubic-bezier(0.2, 0.85, 0.25, 1) both;
    will-change: transform, opacity;
  }

  .clara-ai-menu-shell-out,
  .clara-ai-chat-shell-out {
    animation: claraAssistantSheetOut 170ms ease-in both;
    will-change: transform, opacity;
    pointer-events: none;
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

  .clara-ai-safe-shield {
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: transparent;
    pointer-events: auto;
    touch-action: none;
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
  const ghostClickUntilRef = useRef(0);
  const optionOpenLockRef = useRef("");

  const activeContext = getBestContext(context || {}, latestContextRef.current || {});
  latestContextRef.current = activeContext;

  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(() => [makeMessage("clara", INITIAL_MESSAGE)]);
  const [showFeatureMenu, setShowFeatureMenu] = useState(true);
  const [activeMode, setActiveMode] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);
  const contextStatus = getContextStatus(activeContext);

  useEffect(() => {
    latestContextRef.current = getBestContext(context || {}, latestContextRef.current || {});

    if (DEBUG_CLARA_CONTEXT) {
      console.log("CLARA received latest context:", latestContextRef.current);
    }
  }, [context]);

  useEffect(() => {
    if (!open) return;

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    optionOpenLockRef.current = "";
    ghostClickUntilRef.current = 0;
    lastBackdropTouchAtRef.current = 0;
    lastFeatureTouchSentAtRef.current = 0;
    lastTouchSentAtRef.current = 0;

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
    if (!open || isClosing || showFeatureMenu) return undefined;
    const timer = window.setTimeout(() => inputRef.current?.focus?.(), 120);
    return () => window.clearTimeout(timer);
  }, [open, isClosing, showFeatureMenu]);

  useEffect(() => {
    if (!open || isClosing || showFeatureMenu) return;
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [open, isClosing, showFeatureMenu, messages]);

  const resetTemporaryUiState = () => {
    setDraft("");
    setActiveMode(null);
    optionOpenLockRef.current = "";
    lastTouchSentAtRef.current = 0;
    lastFeatureTouchSentAtRef.current = 0;
    lastBackdropTouchAtRef.current = Date.now();
    ghostClickUntilRef.current = Date.now() + GHOST_CLICK_WINDOW_MS;
  };

  const closeAssistantSafely = (event) => {
    stopAssistantEvent(event);

    if (isClosing) return;

    resetTemporaryUiState();
    setIsClosing(true);

    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
    }

    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      setIsClosing(false);
      setShowFeatureMenu(true);
      onClose?.();
    }, CLOSE_ANIMATION_MS);
  };

  const sendMessageText = (messageText) => {
    const text = String(messageText || "").trim();
    if (!text || isClosing) return;

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

    if (!optionText || isClosing) return;

    if (String(optionText).toLowerCase().includes("before i buy")) {
      setActiveMode("purchase_decision");
    }

    sendMessageText(optionText);
  };

  const handleQuickOptionTouchEnd = (event, option) => {
    stopAssistantEvent(event);
    if (isClosing) return;

    lastTouchSentAtRef.current = Date.now();
    sendQuickOption(option);
  };

  const handleQuickOptionClick = (event, option) => {
    stopAssistantEvent(event);
    if (isClosing || Date.now() < ghostClickUntilRef.current) return;
    if (Date.now() - lastTouchSentAtRef.current < TOUCH_DEDUPE_MS) return;

    sendQuickOption(option);
  };

  const openAssistantWithPrompt = (option) => {
    if (isClosing || Date.now() < ghostClickUntilRef.current) return;

    const optionKey = `${option?.label || "ask"}-${option?.message || "blank"}-${option?.mode || "normal"}`;
    if (optionOpenLockRef.current === optionKey) return;
    optionOpenLockRef.current = optionKey;

    setShowFeatureMenu(false);
    setDraft("");

    if (option?.mode === "purchase_decision") {
      setActiveMode("purchase_decision");
      setMessages((current) => [
        ...current,
        makeMessage("clara", "What are you planning to buy, and how much is it?"),
      ]);
      return;
    }

    setActiveMode(null);

    const prompt = String(option?.message || "").trim();
    if (prompt) {
      sendMessageText(prompt);
    }
  };

  const handleFeatureOptionTouchEnd = (event, option) => {
    stopAssistantEvent(event);
    if (isClosing) return;

    lastFeatureTouchSentAtRef.current = Date.now();
    openAssistantWithPrompt(option);
  };

  const handleFeatureOptionClick = (event, option) => {
    stopAssistantEvent(event);
    if (isClosing || Date.now() < ghostClickUntilRef.current) return;
    if (Date.now() - lastFeatureTouchSentAtRef.current < TOUCH_DEDUPE_MS) return;

    openAssistantWithPrompt(option);
  };

  const handleBackdropPointerDown = (event) => {
    if (event.target !== event.currentTarget) return;

    stopAssistantEvent(event);
    lastBackdropTouchAtRef.current = Date.now();
    closeAssistantSafely(event);
  };

  const handleBackdropClick = (event) => {
    if (event.target !== event.currentTarget) return;

    stopAssistantEvent(event);
    if (Date.now() - lastBackdropTouchAtRef.current < TOUCH_DEDUPE_MS) return;
    closeAssistantSafely(event);
  };

  const handleSubmit = (event) => {
    stopAssistantEvent(event);
    if (isClosing) return;

    const text = draft.trim();
    if (!text) return;

    setDraft("");
    sendMessageText(text);
  };

  if (!open && !isClosing) return null;

  const backdropClassName = `clara-ai-backdrop${isClosing ? " clara-ai-backdrop-out" : ""}`;
  const shellClassName = showFeatureMenu
    ? `clara-ai-menu-shell${isClosing ? " clara-ai-menu-shell-out" : ""}`
    : `clara-ai-chat-shell${isClosing ? " clara-ai-chat-shell-out" : ""}`;

  return (
    <>
      <style>{CLARA_ASSISTANT_ANIMATION_STYLES}</style>

      {isClosing && (
        <div
          aria-hidden="true"
          className="clara-ai-safe-shield"
          onClick={absorbShieldEvent}
          onMouseDown={absorbShieldEvent}
          onPointerDown={absorbShieldEvent}
          onTouchEnd={absorbShieldEvent}
        />
      )}

      <div
        aria-modal="true"
        className={`${backdropClassName} fixed inset-0 z-[99990] flex items-end justify-center bg-black/55 px-4 pb-4 pt-16 text-white sm:items-center sm:p-6`}
        role="dialog"
        onClick={handleBackdropClick}
        onMouseDown={stopAssistantPropagation}
        onPointerDown={handleBackdropPointerDown}
        onTouchEnd={stopAssistantPropagation}
      >
        <section
          className={`${shellClassName} relative w-full max-w-[440px] overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950/92 shadow-[0_24px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:fixed sm:left-1/2 sm:top-1/2`}
          onClick={stopAssistantPropagation}
          onMouseDown={stopAssistantPropagation}
          onPointerDown={stopAssistantPropagation}
          onTouchEnd={stopAssistantPropagation}
        >
          <div className="clara-ai-glow pointer-events-none absolute -left-24 -top-24 h-52 w-52 rounded-full bg-emerald-400/18 blur-3xl" />
          <div className="clara-ai-glow pointer-events-none absolute -bottom-28 -right-24 h-56 w-56 rounded-full bg-cyan-400/14 blur-3xl" />

          {showFeatureMenu ? (
            <div className="relative flex max-h-[82vh] flex-col p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/75">
                    CLARA AI
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                    What do you need help with?
                  </h2>
                  <p className="mt-1 text-sm text-slate-300/80">
                    Choose one assistant mode, or ask CLARA directly.
                  </p>
                </div>

                <button
                  aria-label="Close CLARA AI menu"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/14 active:scale-95"
                  type="button"
                  onClick={closeAssistantSafely}
                  onPointerDown={stopAssistantPropagation}
                  onTouchEnd={stopAssistantPropagation}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-3 overflow-y-auto pr-1">
                {AI_FEATURE_OPTIONS.map((option, index) => (
                  <button
                    key={option.label}
                    className="clara-ai-option group w-full rounded-2xl border border-white/10 bg-white/[0.055] p-4 text-left transition hover:border-emerald-200/30 hover:bg-white/[0.085] active:scale-[0.985]"
                    style={{ animationDelay: `${index * 24}ms` }}
                    type="button"
                    onClick={(event) => handleFeatureOptionClick(event, option)}
                    onPointerDown={stopAssistantPropagation}
                    onTouchEnd={(event) => handleFeatureOptionTouchEnd(event, option)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{option.label}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300/75">{option.description}</p>
                      </div>
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-emerald-200/15 bg-emerald-300/10 text-sm text-emerald-100 transition group-hover:bg-emerald-300/16">
                        →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative flex h-[82vh] max-h-[760px] flex-col sm:h-[680px]">
              <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5 sm:p-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-200/75">
                    CLARA AI
                  </p>
                  <h2 className="mt-2 text-xl font-bold tracking-tight text-white">Ask before you act</h2>
                  <p className="mt-1 text-xs text-slate-300/75">
                    Context: {contextStatus === "connected" ? "connected" : "loading"}
                  </p>
                </div>

                <button
                  aria-label="Close CLARA chat"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/14 active:scale-95"
                  type="button"
                  onClick={closeAssistantSafely}
                  onPointerDown={stopAssistantPropagation}
                  onTouchEnd={stopAssistantPropagation}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg ${
                          isUser
                            ? "bg-emerald-300 text-slate-950"
                            : "border border-white/10 bg-white/[0.065] text-slate-100"
                        }`}
                      >
                        {message.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-white/10 p-4 sm:p-5">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {QUICK_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.09] active:scale-[0.98]"
                      type="button"
                      onClick={(event) => handleQuickOptionClick(event, option)}
                      onPointerDown={stopAssistantPropagation}
                      onTouchEnd={(event) => handleQuickOptionTouchEnd(event, option)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <form className="flex items-center gap-2" onSubmit={handleSubmit}>
                  <input
                    ref={inputRef}
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.065] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400/70 focus:border-emerald-200/35 focus:bg-white/[0.085]"
                    placeholder="Ask CLARA before you act..."
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onPointerDown={stopAssistantPropagation}
                  />
                  <button
                    aria-label="Send message"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-300 text-slate-950 shadow-[0_0_22px_rgba(110,231,183,0.24)] transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!draft.trim() || isClosing}
                    type="submit"
                    onPointerDown={stopAssistantPropagation}
                  >
                    <Send size={17} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
