import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Plus, Send } from "lucide-react";
import { generateClaraLocalReply } from "@/lib/clara-local-brain";
import {
  generateClaraGeminiReply,
  hasGeminiConfig,
} from "@/lib/clara-gemini-client";
import { readLatestClaraLifeProfileOnDevice } from "@/lib/clara-life-profile";
import { addExpense as repoAddExpense } from "@/lib/financeRepository";

const SINGLE_TAP_DELAY = 240;
const DOUBLE_TAP_WINDOW = 280;
const CLARA_LONG_PRESS_DELAY = 560;
const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const CLARA_MONEY_CHAT_REQUEST_EVENT = "clara:money-card-chat-request";
const CLARA_THINKING_REPLY = "Reading your finance cards...";
const CLARA_LOGGING_REPLY = "Logging your expense...";
const CLARA_WELCOME_PROMPT = "What are you thinking of buying?";

const CLARA_FEATURE_PROMPTS = {
  "Budget Plan":
    "Review my current Budget Plan like CLARA. Use my real budget context, categories, spending pace, remaining money, unplanned spending, and risks. Tell me the main concern I need to solve right now. Keep it short, conversational, and decision-focused.",
  Wallets:
    "Review my current Wallets like CLARA. Use my real wallet balances, total available money, wallet transaction movement, and money location. Give me a mini financial reality check so I immediately understand where my money is sitting, which wallet needs attention, and what I should be careful about next. Do not ask a random purchase question. Keep it short, conversational, and decision-focused.",
};

function makeClaraMessage(role, text) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
  };
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[₱,]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeWalletCandidate(value) {
  return normalizeMatchText(value)
    .replace(/\b(walet|walllet|wallett)\b/g, "wallet")
    .replace(/\b(pls|please|po|lang|na|naman|use|using|from|via|with)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeOnlyExpenseVerb(value = "") {
  return /^(i\s+)?(bought|spent|paid|purchased|ordered|got|had|logged|log|recorded|record)$/i.test(
    String(value || "").trim()
  );
}

function getWalletName(wallet = {}) {
  return String(
    wallet.name ||
      wallet.wallet_name ||
      wallet.title ||
      wallet.label ||
      wallet.type ||
      "Wallet"
  ).trim();
}

function getWalletVisibleBalance(wallet = {}) {
  return safeNumber(
    wallet.derived_balance ??
      wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance
  );
}

function getLocalUserIdFromWallets(wallets = []) {
  const wallet = safeArray(wallets).find(Boolean) || {};
  return String(
    wallet.localUserId ||
      wallet.local_user_id ||
      wallet.user_id ||
      wallet.userId ||
      wallet.owner_id ||
      "local-user"
  ).trim() || "local-user";
}

function findWalletByName(wallets = [], name = "") {
  const safeWallets = safeArray(wallets);
  const normalizedName = normalizeWalletCandidate(name);
  if (!normalizedName) return null;

  const normalizedTokens = normalizedName.split(" ").filter(Boolean);

  return (
    safeWallets.find((wallet) => normalizeWalletCandidate(getWalletName(wallet)) === normalizedName) ||
    safeWallets.find((wallet) => normalizeWalletCandidate(getWalletName(wallet)).includes(normalizedName)) ||
    safeWallets.find((wallet) => normalizedName.includes(normalizeWalletCandidate(getWalletName(wallet)))) ||
    safeWallets.find((wallet) => {
      const walletName = normalizeWalletCandidate(getWalletName(wallet));
      const walletTokens = walletName.split(" ").filter(Boolean);
      return walletTokens.length > 0 && walletTokens.every((token) => normalizedTokens.includes(token));
    }) ||
    null
  );
}

function guessExpenseCategory(item = "") {
  const text = normalizeMatchText(item);

  if (/buko|juice|milk ?tea|coffee|tea|drink|food|meal|snack|rice|lunch|dinner|breakfast/.test(text)) {
    return "Food";
  }

  if (/grab|jeep|bus|taxi|fare|gas|fuel|transport/.test(text)) {
    return "Transportation";
  }

  if (/grocery|groceries|market|vegetable|meat/.test(text)) {
    return "Groceries";
  }

  if (/bill|electric|water|internet|rent|load|subscription/.test(text)) {
    return "Bills";
  }

  return "AI Logged Expense";
}

function parseExpenseLogCommand(text = "", wallets = []) {
  const rawText = String(text || "").trim();
  if (!rawText) return null;

  const intentPattern = /\b(i\s+)?(bought|spent|paid|purchased|ordered|got|had|logged|log|recorded|record)\b/i;
  if (!intentPattern.test(rawText)) return null;

  const amountMatch = rawText.match(/(?:₱|php\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:pesos?|php)?/i);
  if (!amountMatch) return null;

  const amount = Number(String(amountMatch[1] || "").replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const beforeAmount = rawText.slice(0, amountMatch.index).trim();
  let item = beforeAmount
    .replace(/^\s*i\s+/i, "")
    .replace(/^(bought|spent|paid|purchased|ordered|got|had|logged|log|recorded|record)\s+/i, "")
    .replace(/^(for|on)\s+/i, "")
    .trim();

  if (!item && /\b(on|for)\b/i.test(rawText)) {
    const afterFor = rawText.match(/\b(?:on|for)\s+(.+?)\s+(?:₱|php\s*)?\d/i);
    item = String(afterFor?.[1] || "").trim();
  }

  const afterAmount = rawText
    .slice(amountMatch.index + amountMatch[0].length)
    .replace(/\b(?:using|from|via|with)\s+.+$/i, "")
    .replace(/^(for|on)\s+/i, "")
    .trim();

  if (!item || looksLikeOnlyExpenseVerb(item)) {
    item = afterAmount || item;
  }

  item = item || "Expense";

  const walletMatch = rawText.match(/\b(?:using|from|via|with)\s+(.+?)\s*$/i);
  const walletName = String(walletMatch?.[1] || "")
    .replace(/[.!?]+$/g, "")
    .trim();

  const wallet = walletName ? findWalletByName(wallets, walletName) : null;

  if (!walletName) {
    return {
      ok: false,
      reason: "wallet_missing",
      rawText,
      item,
      amount,
      wallet: null,
      walletName: "",
      requestedWalletName: "",
      category: guessExpenseCategory(item),
    };
  }

  if (!wallet) {
    return {
      ok: false,
      reason: "wallet_not_found",
      rawText,
      item,
      amount,
      wallet: null,
      walletName,
      requestedWalletName: walletName,
      category: guessExpenseCategory(item),
    };
  }

  return {
    ok: true,
    rawText,
    item,
    amount,
    wallet,
    walletName: getWalletName(wallet),
    requestedWalletName: walletName,
    category: guessExpenseCategory(item),
  };
}

function getBudgetRows(monthlyBudgetPlan) {
  if (Array.isArray(monthlyBudgetPlan?.categories)) return monthlyBudgetPlan.categories;
  if (Array.isArray(monthlyBudgetPlan?.categoryRows)) return monthlyBudgetPlan.categoryRows;
  if (Array.isArray(monthlyBudgetPlan?.items)) return monthlyBudgetPlan.items;
  return [];
}

function getBudgetRowName(row = {}) {
  return String(
    row.name ||
      row.category ||
      row.category_name ||
      row.label ||
      row.title ||
      row.budget_name ||
      ""
  ).trim();
}

function getBudgetRowAllocated(row = {}) {
  return safeNumber(
    row.allocated ??
      row.allocated_amount ??
      row.amount ??
      row.limit ??
      row.total ??
      row.budget
  );
}

function extractExplicitReason(text = "") {
  const raw = String(text || "").trim();
  const match = raw.match(/\b(?:because|bec|cause|since|kasi|dahil|due to|needed because)\b\s+(.+)$/i);

  return String(match?.[1] || "")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function hasUnexpectedSignal(text = "") {
  return /\b(unexpected|unexpectedly|emergency|urgent|bigla|biglaan|medicine|meds|hospital|clinic|doctor|repair|broken|accident)\b/i.test(
    String(text || "")
  );
}

function matchExpenseToBudget(command = {}, monthlyBudgetPlan = null) {
  const rows = getBudgetRows(monthlyBudgetPlan).filter((row) => getBudgetRowName(row));
  const hasRows = rows.length > 0;
  const itemText = normalizeMatchText(command.item);
  const categoryText = normalizeMatchText(command.category);

  const matchedRow = rows.find((row) => {
    const rowText = normalizeMatchText(getBudgetRowName(row));
    if (!rowText) return false;

    return (
      rowText === categoryText ||
      rowText === itemText ||
      rowText.includes(categoryText) ||
      categoryText.includes(rowText) ||
      itemText.includes(rowText) ||
      rowText.includes(itemText)
    );
  });

  return {
    hasBudgetList: hasRows,
    row: matchedRow || null,
    name: matchedRow ? getBudgetRowName(matchedRow) : "",
  };
}

function classifyExpenseAgainstBudget(command = {}, monthlyBudgetPlan = null) {
  const budgetMatch = matchExpenseToBudget(command, monthlyBudgetPlan);
  const explicitReason = extractExplicitReason(command.rawText);
  const unexpected = hasUnexpectedSignal(command.rawText);

  if (budgetMatch.row) {
    return {
      planningStatus: "planned",
      category: budgetMatch.name || command.category,
      budgetCategory: budgetMatch.name,
      budgetMatched: true,
      requiresReason: false,
      reason: null,
    };
  }

  if (!budgetMatch.hasBudgetList) {
    return {
      planningStatus: "unplanned",
      category: command.category || "Unplanned Spending",
      budgetCategory: null,
      budgetMatched: false,
      requiresReason: false,
      reason: "No active budget category was matched when CLARA logged this expense.",
    };
  }

  if (explicitReason || unexpected) {
    return {
      planningStatus: "unplanned",
      category: "Unplanned Spending",
      budgetCategory: null,
      budgetMatched: false,
      requiresReason: false,
      reason:
        explicitReason ||
        `Unexpected expense detected from CLARA chat: ${command.rawText}`,
    };
  }

  return {
    planningStatus: "unplanned",
    category: "Unplanned Spending",
    budgetCategory: null,
    budgetMatched: false,
    requiresReason: true,
    reason: "",
  };
}

function isYesConfirmation(text = "") {
  const clean = normalizeMatchText(text);
  return (
    /^(yes|y|yeah|yep|yeh|yup|ok|okay|sure|please|go ahead|confirm|confirmed)/i.test(
      String(text || "").trim()
    ) ||
    clean.includes("log it") ||
    clean.includes("log there") ||
    clean.includes("put it there") ||
    clean.includes("save it")
  );
}

function isNoConfirmation(text = "") {
  const clean = normalizeMatchText(text);
  return (
    /^(no|n|nope|nah|noh|not there|do not|dont|don't|wrong)/i.test(
      String(text || "").trim()
    ) ||
    clean.includes("unplanned") ||
    clean.includes("not budget") ||
    clean.includes("dont log there") ||
    clean.includes("do not log there")
  );
}

function formatWalletChoices(wallets = []) {
  const names = safeArray(wallets)
    .map((wallet) => getWalletName(wallet))
    .filter(Boolean)
    .slice(0, 5);

  return names.length ? names.join(", ") : "No wallets are visible right now";
}

function detectBehaviorFromReason(reason = "", command = {}) {
  const text = normalizeMatchText(`${reason} ${command.item || ""}`);

  if (/stress|stressed|tired|pagod|bad day|burnout|pressure/.test(text)) {
    return { behaviorTag: "stress_spending", emotionalTrigger: "stress_or_fatigue" };
  }

  if (/thirst|thirsty|uhaw|hungry|gutom|skipped|craving/.test(text)) {
    return { behaviorTag: "body_need_or_craving", emotionalTrigger: "hunger_or_thirst" };
  }

  if (/reward|deserve|treat|celebrate|comfort/.test(text)) {
    return { behaviorTag: "reward_spending", emotionalTrigger: "comfort_or_reward" };
  }

  if (/sale|discount|promo|limited|deal/.test(text)) {
    return { behaviorTag: "promo_trigger", emotionalTrigger: "urgency_or_discount" };
  }

  if (/friend|friends|family|peer|hiya|nakakahiya|invited/.test(text)) {
    return { behaviorTag: "social_spending", emotionalTrigger: "social_pressure" };
  }

  if (/emergency|urgent|medicine|doctor|hospital|repair|broken|accident/.test(text)) {
    return { behaviorTag: "unexpected_need", emotionalTrigger: "urgent_need" };
  }

  return { behaviorTag: "unplanned_decision", emotionalTrigger: "unspecified_trigger" };
}

function isContextQuestion(text) {
  return /what exact financial|currently see|what can you see|how much money|money do i currently have|total expense|spent this month|financial information|card data/i.test(
    String(text || "")
  );
}

function isPurchaseQuestion(text) {
  return /(?:₱|php\s*)?\d/i.test(String(text || "")) || /buy|spend|purchase|afford/i.test(String(text || ""));
}

function buildClaraInlineContext({
  walletMoney,
  thisMonthSpent,
  monthlyBudgetPlan,
  savingsGoals,
  totalSavingsSaved,
  totalSavingsTarget,
  primarySavingsGoal,
  survivalExpense,
  wallets,
  walletPreviewTransactions,
}) {
  const budgetRows = getBudgetRows(monthlyBudgetPlan);
  const goalRows = safeArray(savingsGoals).length
    ? safeArray(savingsGoals)
    : primarySavingsGoal
      ? [primarySavingsGoal]
      : [];

  return {
    availableMoney: safeNumber(walletMoney),
    totalAvailableMoney: safeNumber(walletMoney),
    totalMoneyLeft: safeNumber(walletMoney),
    moneyLeftThisMonth: safeNumber(walletMoney),
    walletMoney: safeNumber(walletMoney),
    totalWalletBalance: safeNumber(walletMoney),

    monthlySpent: safeNumber(thisMonthSpent),
    thisMonthSpent: safeNumber(thisMonthSpent),
    totalExpensesThisMonth: safeNumber(thisMonthSpent),

    budgets: budgetRows,
    budgetAllocated: safeNumber(
      monthlyBudgetPlan?.allocated ??
        monthlyBudgetPlan?.totalAllocated ??
        monthlyBudgetPlan?.allocated_total
    ),
    budgetSpent: safeNumber(
      monthlyBudgetPlan?.spent ??
        monthlyBudgetPlan?.totalSpent ??
        monthlyBudgetPlan?.spent_total ??
        thisMonthSpent
    ),
    budgetRemaining: safeNumber(
      monthlyBudgetPlan?.remaining ??
        monthlyBudgetPlan?.totalRemaining ??
        monthlyBudgetPlan?.unallocated_balance ??
        walletMoney
    ),

    savingsGoals: goalRows,
    totalSavingsSaved: safeNumber(totalSavingsSaved),
    totalSavingsTarget: safeNumber(totalSavingsTarget),
    savingsSaved: safeNumber(totalSavingsSaved),
    savingsTarget: safeNumber(totalSavingsTarget),

    survivalExpense: safeNumber(survivalExpense),
    emergencyFund: {
      target: safeNumber(survivalExpense),
      target_amount: safeNumber(survivalExpense),
    },

    wallets: safeArray(wallets),
    walletTransactions: safeArray(walletPreviewTransactions),
  };
}

function buildClaraInlineFallback(text, { walletMoney = 0, thisMonthSpent = 0, fmt }) {
  const cleanText = String(text || "").trim();
  const hasAmount = /(?:₱|php\s*)?\d/i.test(cleanText);
  const moneyLeftText = fmt(walletMoney || 0);
  const spentText = fmt(thisMonthSpent || 0);

  if (!cleanText) {
    return "Tell me what you want to buy and the price, then I’ll help you pause before spending.";
  }

  if (isContextQuestion(cleanText)) {
    return `I can currently see ${moneyLeftText} money left and ${spentText} total expense this month from your dashboard cards.`;
  }

  if (!hasAmount) {
    return `I can see ${moneyLeftText} money left and ${spentText} already spent this month. Add a price only if this is a purchase decision.`;
  }

  return `Pause first. You have ${moneyLeftText} left and ${spentText} already spent this month. Buy only if it is planned, needed, and still worth it tomorrow.`;
}

function extractPurchaseAmount(text) {
  const matches = String(text || "")
    .replace(/,/g, "")
    .match(/(?:₱|php\s*)?\d+(?:\.\d{1,2})?/gi);

  if (!matches?.length) return null;

  const amounts = matches
    .map((match) => Number(match.replace(/php/gi, "").replace(/₱/g, "").trim()))
    .filter((amount) => Number.isFinite(amount) && amount > 0);

  return amounts.length ? Math.max(...amounts) : null;
}

function hasActiveBudgetPlan(context = {}) {
  const allocated = safeNumber(context?.budgetAllocated, 0);
  const rows = safeArray(context?.budgets);

  return (
    allocated > 0 ||
    rows.some((row) =>
      safeNumber(
        row?.allocated ?? row?.total ?? row?.limit ?? row?.amount ?? row?.allocated_amount,
        0
      ) > 0
    )
  );
}

function buildPremiumPurchaseReply(text, { claraFinanceContext = {}, fmt }) {
  const amount = extractPurchaseAmount(text);
  if (!amount) return null;

  const available = safeNumber(
    claraFinanceContext?.availableMoney ??
      claraFinanceContext?.walletMoney ??
      claraFinanceContext?.totalMoneyLeft ??
      claraFinanceContext?.totalWalletBalance,
    0
  );
  const activeBudget = hasActiveBudgetPlan(claraFinanceContext);
  const budgetRemaining = activeBudget
    ? safeNumber(claraFinanceContext?.budgetRemaining, 0)
    : null;

  const amountText = fmt(amount);
  const availableText = fmt(available);
  const budgetText = budgetRemaining !== null ? fmt(budgetRemaining) : null;

  if (available <= 0) {
    return `Not recommended. I can’t confirm available money right now, so don’t treat ${amountText} as safe yet. Refresh your wallet first.`;
  }

  if (amount > available) {
    return `Not recommended. ${amountText} is higher than your visible money left of ${availableText}. Delay it or lower the cost.`;
  }

  const share = amount / available;

  if (!activeBudget) {
    if (share >= 0.75) {
      return `Not recommended. You have ${availableText} money left, but ${amountText} would use almost all of it. No active budget plan is loaded yet, so delay this and set a spending plan first.`;
    }

    if (share >= 0.03) {
      return `Okay only if planned. You have ${availableText} money left and no active budget plan yet, so ${amountText} deserves a pause. Buy it only if it was already planned, then log it right away.`;
    }

    return `Okay, but keep it intentional. You have ${availableText} money left and no active budget plan yet. ${amountText} is affordable, but log it after buying so small spending doesn’t disappear unnoticed.`;
  }

  if (budgetRemaining !== null && amount > budgetRemaining) {
    return `Better delay. You have ${availableText} money left, but only ${budgetText} remains in your active budget. Rebalance first or reduce the cost.`;
  }

  if (share >= 0.75) {
    return `Not recommended. ${amountText} would use most of your ${availableText} money left. Delay this unless it is urgent and already planned.`;
  }

  if (share >= 0.12) {
    return `Okay only if planned. ${amountText} is affordable, but it is still noticeable against your ${availableText} money left. Buy it only if it fits your active budget and current priorities.`;
  }

  return `Safe, but still intentional. ${amountText} fits within your ${availableText} money left and active budget. Log it after buying.`;
}

function polishClaraReply(reply, text, options) {
  if (isPurchaseQuestion(text)) {
    return buildPremiumPurchaseReply(text, options) || reply;
  }

  return reply;
}

export default function DashboardMoneySummary({
  dashboardScale = {},
  selectedDashboardTheme = {},
  themeIsLight = false,
  themeSoftTextClass = "text-white/55",
  themePrimaryTextClass = "text-white",
  moneySummaryVisible = true,
  toggleMoneySummaryVisibility,
  moneyLeftSummaryHandlers = {},
  handleMoneyLeftOrbClick,
  startMoneyLeftOrbLongPress,
  endMoneyLeftOrbLongPress,
  stopMoneyLeftOrbEvent,
  walletMoney = 0,
  thisMonthSpent = 0,
  fmt = (value) => String(value ?? 0),

  monthlyBudgetPlan = null,
  savingsGoals = [],
  totalSavingsSaved = 0,
  totalSavingsTarget = 0,
  primarySavingsGoal = null,
  survivalExpense = 0,
  wallets = [],
  walletPreviewTransactions = [],
}) {
  const tapTimerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const lastTapAtRef = useRef(0);
  const claraTriggeredRef = useRef(false);
  const claraInputRef = useRef(null);
  const geminiReadyRef = useRef(hasGeminiConfig());

  const claraFinanceContext = useMemo(
    () =>
      buildClaraInlineContext({
        walletMoney,
        thisMonthSpent,
        monthlyBudgetPlan,
        savingsGoals,
        totalSavingsSaved,
        totalSavingsTarget,
        primarySavingsGoal,
        survivalExpense,
        wallets,
        walletPreviewTransactions,
      }),
    [
      monthlyBudgetPlan,
      primarySavingsGoal,
      savingsGoals,
      survivalExpense,
      thisMonthSpent,
      totalSavingsSaved,
      totalSavingsTarget,
      walletMoney,
      walletPreviewTransactions,
      wallets,
    ]
  );

  const [claraMode, setClaraMode] = useState(false);
  const [claraDraft, setClaraDraft] = useState("");
  const [pendingExpenseReview, setPendingExpenseReview] = useState(null);
  const [pendingExpenseDraft, setPendingExpenseDraft] = useState(null);
  const [pendingBudgetConfirmation, setPendingBudgetConfirmation] = useState(null);
  const [pendingFinalExpenseConfirmation, setPendingFinalExpenseConfirmation] = useState(null);
  const [claraMessages, setClaraMessages] = useState(() => [
    makeClaraMessage("clara", CLARA_WELCOME_PROMPT),
  ]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(CLARA_MONEY_CHAT_EVENT, {
        detail: {
          active: claraMode,
          messages: claraMessages,
        },
      })
    );
  }, [claraMode, claraMessages]);

  const clearTapTimer = useCallback(() => {
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }, []);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const stopOrbEvent = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      event?.nativeEvent?.stopImmediatePropagation?.();
      stopMoneyLeftOrbEvent?.(event);
    },
    [stopMoneyLeftOrbEvent]
  );

  const openManualLog = useCallback(
    (event) => {
      if (typeof handleMoneyLeftOrbClick === "function") {
        handleMoneyLeftOrbClick(event);
        return;
      }

      if (typeof moneyLeftSummaryHandlers?.openManualExpenseFromMoneyLeft === "function") {
        moneyLeftSummaryHandlers.openManualExpenseFromMoneyLeft(event);
      }
    },
    [handleMoneyLeftOrbClick, moneyLeftSummaryHandlers]
  );

  const openTransactionHub = useCallback(
    (event) => {
      moneyLeftSummaryHandlers?.openTransactionHubFromMoneyLeft?.(event);
    },
    [moneyLeftSummaryHandlers]
  );

  const openClaraInline = useCallback(() => {
    clearTapTimer();
    claraTriggeredRef.current = true;
    endMoneyLeftOrbLongPress?.();
    setClaraMode(true);
    setPendingExpenseReview(null);
    setPendingExpenseDraft(null);
    setPendingBudgetConfirmation(null);
    setPendingFinalExpenseConfirmation(null);
    setClaraMessages([makeClaraMessage("clara", CLARA_WELCOME_PROMPT)]);

    window.setTimeout(() => {
      claraInputRef.current?.focus?.();
    }, 120);
  }, [clearTapTimer, endMoneyLeftOrbLongPress]);

  const closeClaraInline = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearTapTimer();
      clearLongPressTimer();
      claraTriggeredRef.current = false;
      setClaraMode(false);
      setClaraDraft("");
      setPendingExpenseReview(null);
      setPendingExpenseDraft(null);
      setPendingBudgetConfirmation(null);
      setPendingFinalExpenseConfirmation(null);
      setClaraMessages([makeClaraMessage("clara", CLARA_WELCOME_PROMPT)]);
    },
    [clearLongPressTimer, clearTapTimer, stopOrbEvent]
  );

  const handleOrbPointerDown = useCallback(
    (event) => {
      stopOrbEvent(event);
      claraTriggeredRef.current = false;
      clearLongPressTimer();
      startMoneyLeftOrbLongPress?.(event);

      longPressTimerRef.current = setTimeout(() => {
        openClaraInline();
      }, CLARA_LONG_PRESS_DELAY);
    },
    [clearLongPressTimer, openClaraInline, startMoneyLeftOrbLongPress, stopOrbEvent]
  );

  const handleOrbPointerUp = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearLongPressTimer();
      endMoneyLeftOrbLongPress?.(event);

      if (claraTriggeredRef.current || claraMode) {
        claraTriggeredRef.current = false;
        return;
      }

      const now = Date.now();
      const previousTapAt = lastTapAtRef.current || 0;

      if (previousTapAt && now - previousTapAt <= DOUBLE_TAP_WINDOW) {
        lastTapAtRef.current = 0;
        clearTapTimer();
        openTransactionHub(event);
        return;
      }

      lastTapAtRef.current = now;
      clearTapTimer();
      tapTimerRef.current = setTimeout(() => {
        lastTapAtRef.current = 0;
        openManualLog(event);
      }, SINGLE_TAP_DELAY);
    },
    [
      claraMode,
      clearLongPressTimer,
      clearTapTimer,
      endMoneyLeftOrbLongPress,
      openManualLog,
      openTransactionHub,
      stopOrbEvent,
    ]
  );

  const handleOrbCancel = useCallback(
    (event) => {
      stopOrbEvent(event);
      clearLongPressTimer();
      endMoneyLeftOrbLongPress?.(event);
      claraTriggeredRef.current = false;
    },
    [clearLongPressTimer, endMoneyLeftOrbLongPress, stopOrbEvent]
  );

  const handleOrbClick = useCallback(
    (event) => {
      stopOrbEvent(event);
    },
    [stopOrbEvent]
  );

  const replaceClaraMessage = useCallback((messageId, text) => {
    setClaraMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, text } : message
      )
    );
  }, []);

  const appendUserAndPendingMessage = useCallback((text, pendingMessage) => {
    setClaraMode(true);

    setClaraMessages((current) => {
      const cleanedCurrent = current.filter(
        (message) => String(message?.text || "").trim() !== CLARA_WELCOME_PROMPT
      );

      return [
        ...cleanedCurrent,
        makeClaraMessage("user", text),
        pendingMessage,
      ];
    });

    setClaraDraft("");
  }, []);

  const logExpenseFromChat = useCallback(
    async (command, budgetReview = null) => {
      if (!command?.ok) {
        if (command?.reason === "wallet_not_found") {
          return command.walletName
            ? `I found the expense amount, but I couldn’t find “${command.walletName}” in your wallets. Please use the exact wallet name so I can log it safely.`
            : "I can log that, but tell me which wallet to use first.";
        }

        return "I can log expenses now, but I need the item, amount, and wallet name.";
      }

      const review = budgetReview || classifyExpenseAgainstBudget(command, monthlyBudgetPlan);

      if (review.requiresReason) {
        throw new Error("CLARA expense reason is required before logging.");
      }

      const walletBalance = getWalletVisibleBalance(command.wallet);
      if (walletBalance < command.amount) {
        return `${command.walletName} only has ${fmt(walletBalance)} available, so I didn’t log the ${fmt(command.amount)} ${command.item} expense. Choose another wallet or add money first.`;
      }

      const nowIso = new Date().toISOString();
      const localUserId = getLocalUserIdFromWallets(wallets);
      const isPlanned = review.planningStatus === "planned";
      const reason = isPlanned ? null : review.reason || `Outside budget list: ${command.rawText}`;
      const behavior = isPlanned ? {} : detectBehaviorFromReason(reason, command);

      await repoAddExpense(localUserId, {
        amount: command.amount,
        wallet_id: command.wallet.id,
        category: review.category || command.category,
        budget_category: review.budgetCategory || null,
        budget_category_name: review.budgetCategory || null,
        budget_list_match: Boolean(review.budgetMatched),
        need_type: "other",
        planning_status: review.planningStatus,
        unplanned_reason: reason,
        unexpected_reason: isPlanned ? null : reason,
        behavior_reason: reason,
        behavior_tag: behavior.behaviorTag || null,
        emotional_trigger: behavior.emotionalTrigger || null,
        notes: command.item,
        source_type: "CLARA Chat Expense Log",
        date: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        user_id: command.wallet.user_id || null,
        user_email: command.wallet.user_email || command.wallet.email || null,
        created_by: command.wallet.created_by || command.wallet.user_email || null,
      });

      window.dispatchEvent(new CustomEvent("clara-expenses-updated"));
      window.dispatchEvent(new CustomEvent("clara-wallets-updated"));
      window.dispatchEvent(new CustomEvent("clara-wallet-transactions-updated"));
      window.dispatchEvent(new CustomEvent("clara-finance-updated"));

      const nextBalance = Math.max(walletBalance - command.amount, 0);

      return {
        saved: true,
        nextBalance,
        isPlanned,
        reason,
      };
    },
    [fmt, monthlyBudgetPlan, wallets]
  );

  const resolveClaraReply = useCallback(
    async (text) => {
      const cleanText = String(text || "").trim();
      const featurePrompt = CLARA_FEATURE_PROMPTS[cleanText];
      const purchaseMode = !featurePrompt && isPurchaseQuestion(cleanText);
      const aiMessage = featurePrompt || (purchaseMode ? `Before I buy this: ${cleanText}` : cleanText);

      let liveLifeProfile = null;
      try {
        liveLifeProfile = await readLatestClaraLifeProfileOnDevice();
        console.log("CLARA live Life Profile loaded:", liveLifeProfile);
      } catch (error) {
        console.warn("CLARA live Life Profile not available:", error);
      }

      const claraConversationContext = liveLifeProfile
        ? { ...claraFinanceContext, lifeProfile: liveLifeProfile }
        : claraFinanceContext;

      let localReply = buildClaraInlineFallback(cleanText, {
        walletMoney,
        thisMonthSpent,
        fmt,
      });

      if (!isContextQuestion(cleanText)) {
        try {
          localReply = generateClaraLocalReply(aiMessage, claraConversationContext);
        } catch (error) {
          console.warn("CLARA local fallback used:", error);
        }
      }

      const polishOptions = { claraFinanceContext: claraConversationContext, fmt };
      const polishedLocalReply = polishClaraReply(localReply, cleanText, polishOptions);

      try {
        console.log("Calling Gemini...");

        const geminiReply = await generateClaraGeminiReply({
          message: aiMessage,
          context: claraConversationContext,
          mode: featurePrompt ? "feature_review" : purchaseMode ? "purchase_decision" : "money_context_check",
          conversationHistory: claraMessages,
        });

        console.log("Gemini success");
        return geminiReply;
      } catch (error) {
        console.error("Gemini failed:", error);
        console.log("Gemini failed");
        return polishedLocalReply;
      }
    },
    [claraFinanceContext, claraMessages, fmt, thisMonthSpent, walletMoney]
  );

  const resolveExpenseFlowReply = useCallback(
    async (flowContext = {}) => {
      const command = flowContext.command || {};
      const review = flowContext.review || {};
      const amountText = command.amount ? fmt(command.amount) : "the amount";
      const itemText = command.item || "the item";
      const walletText = command.walletName || command.requestedWalletName || "";
      const budgetText = review.budgetCategory || review.category || "";
      const visibleWallets = flowContext.visibleWallets || formatWalletChoices(wallets);

      const flowPrompt = `You are CLARA, a warm Filipino-friendly personal money coach inside an expense logging chat.

IMPORTANT:
You fully manage the conversation wording.
Do not sound like a static template.
Do not say "I can see..." unless it sounds natural.
Acknowledge what the user bought in a human way when helpful.
If the item is a drink or food, you may naturally say it sounds refreshing or nice, but do not overdo it.
Ask only the next required question.
Keep it short: 1-2 sentences.
Understand user typos and casual replies.
Do not invent a wallet, amount, category, or reason.
Do not log the expense yourself in the text unless the step is done_saved.

CURRENT STEP:
${flowContext.step}

KNOWN EXPENSE DATA:
Item: ${itemText}
Amount: ${amountText}
Wallet: ${walletText || "not chosen yet"}
Closest budget/category: ${budgetText || "none yet"}
Planning status: ${review.planningStatus || "not decided yet"}
Reason if any: ${review.reason || "none yet"}
Visible wallets: ${visibleWallets}
User's last reply: ${flowContext.userReply || ""}

WHAT TO DO BY STEP:
- ask_wallet: acknowledge the purchase naturally and ask which wallet was used.
- wallet_not_found: politely say that wallet did not match and ask which visible wallet to use.
- budget_match_confirmation: say the item seems closest to the budget/category and ask if it should be logged there.
- ask_unplanned_reason: say you'll treat it as unplanned and ask the reason.
- ask_unplanned_reason_after_budget_rejection: acknowledge their correction, say you'll mark it unplanned, then ask why.
- final_confirmation: summarize the expense naturally and ask if you should log it now.
- clarify_budget_confirmation: ask them to choose budget/category or unplanned.
- clarify_final_confirmation: ask if they want to log it now or cancel.
- cancel_log: confirm you did not log it.
- save_failed: say you understood it but saving failed.
- done_saved: confirm it was logged.

Reply as CLARA only.`;

      try {
        return await generateClaraGeminiReply({
          message: flowPrompt,
          context: claraFinanceContext,
          mode: "expense_logging_flow",
          conversationHistory: claraMessages,
        });
      } catch (error) {
        console.warn("CLARA Gemini expense-flow reply failed:", error);
        return "I’m having trouble with my AI reply right now. Please try again in a moment.";
      }
    },
    [claraFinanceContext, claraMessages, fmt, wallets]
  );

  const replaceWithExpenseFlowReply = useCallback(
    (messageId, flowContext = {}) => {
      resolveExpenseFlowReply(flowContext).then((reply) => {
        replaceClaraMessage(messageId, reply);
      });
    },
    [replaceClaraMessage, resolveExpenseFlowReply]
  );

  const submitClaraPrompt = useCallback(
    (rawText) => {
      const text = String(rawText || "").trim();
      if (!text) return;

      const askFinalConfirmation = (command, review, sourceMessageId = null) => {
        setPendingFinalExpenseConfirmation({ command, review });
        setPendingExpenseDraft(null);
        setPendingExpenseReview(null);
        setPendingBudgetConfirmation(null);

        if (sourceMessageId) {
          replaceWithExpenseFlowReply(sourceMessageId, {
            step: "final_confirmation",
            command,
            review,
          });
          return;
        }

        const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);
        appendUserAndPendingMessage(text, pendingMessage);
        replaceWithExpenseFlowReply(pendingMessage.id, {
          step: "final_confirmation",
          command,
          review,
        });
      };

      const continueWithCompletedCommand = (command, pendingMessageId) => {
        const budgetReview = command.ok
          ? classifyExpenseAgainstBudget(command, monthlyBudgetPlan)
          : null;

        if (budgetReview?.budgetMatched && budgetReview?.budgetCategory) {
          setPendingBudgetConfirmation({ command, review: budgetReview });
          setPendingExpenseDraft(null);
          setPendingExpenseReview(null);
          setPendingFinalExpenseConfirmation(null);
          replaceWithExpenseFlowReply(
            pendingMessageId,
            {
              step: "budget_match_confirmation",
              command,
              review: budgetReview,
            }
          );
          return;
        }

        if (budgetReview?.requiresReason) {
          setPendingExpenseReview({ command, budgetReview });
          setPendingExpenseDraft(null);
          setPendingBudgetConfirmation(null);
          setPendingFinalExpenseConfirmation(null);
          replaceWithExpenseFlowReply(
            pendingMessageId,
            {
              step: "ask_unplanned_reason",
              command,
              review: budgetReview,
            }
          );
          return;
        }

        askFinalConfirmation(command, budgetReview, pendingMessageId);
      };

      if (pendingFinalExpenseConfirmation) {
        if (isYesConfirmation(text)) {
          const pendingMessage = makeClaraMessage("clara", CLARA_LOGGING_REPLY);
          appendUserAndPendingMessage(text, pendingMessage);

          const { command, review } = pendingFinalExpenseConfirmation;
          setPendingFinalExpenseConfirmation(null);

          logExpenseFromChat(command, review)
            .then(() => {
              replaceWithExpenseFlowReply(pendingMessage.id, {
                step: "done_saved",
                command,
                review,
              });
            })
            .catch((error) => {
              console.warn("CLARA chat expense log failed:", error);
              replaceWithExpenseFlowReply(
                pendingMessage.id,
                {
                  step: "save_failed",
                  error: String(error?.message || error),
                }
              );
            });
          return;
        }

        if (isNoConfirmation(text)) {
          const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);
          appendUserAndPendingMessage(text, pendingMessage);
          replaceWithExpenseFlowReply(
            pendingMessage.id,
            {
              step: "cancel_log",
              userReply: text,
              pending: pendingFinalExpenseConfirmation,
            }
          );
          setPendingFinalExpenseConfirmation(null);
          return;
        }

        const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);
        appendUserAndPendingMessage(text, pendingMessage);
        replaceWithExpenseFlowReply(
          pendingMessage.id,
          {
            step: "clarify_final_confirmation",
            userReply: text,
            pending: pendingFinalExpenseConfirmation,
          }
        );
        return;
      }

      if (pendingExpenseDraft) {
        const wallet = findWalletByName(wallets, text);
        const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);
        appendUserAndPendingMessage(text, pendingMessage);

        if (!wallet) {
          replaceWithExpenseFlowReply(
            pendingMessage.id,
            {
              step: "wallet_not_found",
              userReply: text,
              visibleWallets: formatWalletChoices(wallets),
            }
          );
          return;
        }

        const completedCommand = {
          ...pendingExpenseDraft,
          ok: true,
          reason: null,
          wallet,
          walletName: getWalletName(wallet),
          requestedWalletName: getWalletName(wallet),
        };

        setPendingExpenseDraft(null);
        continueWithCompletedCommand(completedCommand, pendingMessage.id);
        return;
      }

      if (pendingBudgetConfirmation) {
        if (
          isYesConfirmation(text) ||
          normalizeMatchText(text).includes(normalizeMatchText(pendingBudgetConfirmation.review?.budgetCategory))
        ) {
          const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);
          appendUserAndPendingMessage(text, pendingMessage);

          const confirmedReview = {
            ...pendingBudgetConfirmation.review,
            planningStatus: "planned",
            budgetMatched: true,
            requiresReason: false,
            reason: null,
          };
          const pendingCommand = pendingBudgetConfirmation.command;

          setPendingBudgetConfirmation(null);
          setPendingExpenseReview(null);
          askFinalConfirmation(pendingCommand, confirmedReview, pendingMessage.id);
          return;
        }

        if (isNoConfirmation(text)) {
          const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);

          appendUserAndPendingMessage(text, pendingMessage);
          replaceWithExpenseFlowReply(
            pendingMessage.id,
            {
              step: "ask_unplanned_reason_after_budget_rejection",
              command: pendingBudgetConfirmation.command,
              review: pendingBudgetConfirmation.review,
              userReply: text,
            }
          );

          setPendingExpenseReview({
            command: pendingBudgetConfirmation.command,
            budgetReview: {
              ...pendingBudgetConfirmation.review,
              planningStatus: "unplanned",
              category: "Unplanned Spending",
              budgetCategory: null,
              budgetMatched: false,
              requiresReason: true,
              reason: "",
            },
          });
          setPendingBudgetConfirmation(null);

          return;
        }

        const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);
        appendUserAndPendingMessage(text, pendingMessage);
        replaceWithExpenseFlowReply(
          pendingMessage.id,
          {
            step: "clarify_budget_confirmation",
            command: pendingBudgetConfirmation.command,
            review: pendingBudgetConfirmation.review,
            userReply: text,
          }
        );
        return;
      }

      const expenseCommand = parseExpenseLogCommand(text, wallets);

      if (pendingExpenseReview && !expenseCommand) {
        const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);
        appendUserAndPendingMessage(text, pendingMessage);

        const reason = text.replace(/[.!?]+$/g, "").trim();
        const reviewWithReason = {
          ...pendingExpenseReview.budgetReview,
          planningStatus: "unplanned",
          category: "Unplanned Spending",
          budgetMatched: false,
          requiresReason: false,
          reason,
        };
        const pendingCommand = pendingExpenseReview.command;

        setPendingExpenseReview(null);
        askFinalConfirmation(pendingCommand, reviewWithReason, pendingMessage.id);
        return;
      }

      const pendingMessage = makeClaraMessage("clara", CLARA_THINKING_REPLY);

      appendUserAndPendingMessage(text, pendingMessage);

      if (expenseCommand) {
        if (expenseCommand.reason === "wallet_missing" || expenseCommand.reason === "wallet_not_found") {
          setPendingExpenseDraft(expenseCommand);
          setPendingExpenseReview(null);
          setPendingBudgetConfirmation(null);
          setPendingFinalExpenseConfirmation(null);
          replaceWithExpenseFlowReply(
            pendingMessage.id,
            {
              step: expenseCommand.reason === "wallet_not_found" ? "wallet_not_found" : "ask_wallet",
              command: expenseCommand,
              visibleWallets: formatWalletChoices(wallets),
            }
          );
          return;
        }

        continueWithCompletedCommand(expenseCommand, pendingMessage.id);
        return;
      }

      setPendingExpenseReview(null);
      setPendingExpenseDraft(null);
      setPendingBudgetConfirmation(null);
      setPendingFinalExpenseConfirmation(null);

      resolveClaraReply(text).then((reply) => {
        replaceClaraMessage(pendingMessage.id, reply);
      });
    },
    [
      appendUserAndPendingMessage,
      fmt,
      logExpenseFromChat,
      monthlyBudgetPlan,
      pendingBudgetConfirmation,
      pendingExpenseDraft,
      pendingExpenseReview,
      pendingFinalExpenseConfirmation,
      replaceClaraMessage,
      replaceWithExpenseFlowReply,
      resolveClaraReply,
      wallets,
    ]
  );

  const handleClaraSubmit = useCallback(
    (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();

      submitClaraPrompt(claraDraft);
    },
    [claraDraft, submitClaraPrompt]
  );

  useEffect(() => {
    const handleFeaturePromptRequest = (event) => {
      const detail = event?.detail || {};
      const prompt = String(detail.prompt || detail.feature || "").trim();

      if (!prompt) return;

      submitClaraPrompt(prompt);
    };

    window.addEventListener(CLARA_MONEY_CHAT_REQUEST_EVENT, handleFeaturePromptRequest);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_REQUEST_EVENT, handleFeaturePromptRequest);
    };
  }, [submitClaraPrompt]);

  useEffect(() => {
    return () => {
      clearTapTimer();
      clearLongPressTimer();
    };
  }, [clearLongPressTimer, clearTapTimer]);

  useEffect(() => {
    if (!claraMode) return undefined;

    const timer = window.setTimeout(() => claraInputRef.current?.focus?.(), 120);
    return () => window.clearTimeout(timer);
  }, [claraMode]);

  const bubbleSurface = {
    background:
      "radial-gradient(circle at -18% -30%, rgba(20,184,166,0.30) 0%, rgba(20,184,166,0.14) 25%, rgba(20,184,166,0.04) 42%, transparent 58%), radial-gradient(circle at 77% 118%, rgba(99,102,241,0.22), rgba(79,70,229,0.14) 34%, rgba(88,28,135,0.08) 50%, transparent 68%), linear-gradient(135deg, rgba(6,48,66,0.98), rgba(7,20,48,0.96) 48%, rgba(37,13,74,0.96))",
  };

  const moneyCellSurface = {
    background:
      "radial-gradient(circle at -34% -55%, rgba(45,212,191,0.20), transparent 58%), linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
  };

  const expenseCellSurface = {
    background:
      "radial-gradient(circle at 105% 122%, rgba(99,102,241,0.18), transparent 56%), linear-gradient(135deg, rgba(255,255,255,0.026), rgba(255,255,255,0.012))",
  };

  if (claraMode) {
    return (
      <div
        className={`relative mt-2 overflow-hidden border ${
          dashboardScale.summaryGrid || "rounded-[26px]"
        }`}
        style={{
          ...bubbleSurface,
          borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.24)",
          boxShadow: themeIsLight
            ? "0 18px 44px rgba(15,23,42,0.10)"
            : "0 20px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        <div className="pointer-events-none absolute -left-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-48 w-48 rounded-full bg-indigo-400/12 blur-3xl" />

        <div
          className={`relative z-10 flex flex-col justify-center ${
            dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
          }`}
        >
          <form
            onSubmit={handleClaraSubmit}
            className="flex items-center gap-2 rounded-[22px] border border-white/14 bg-slate-950/52 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          >
            <input
              ref={claraInputRef}
              value={claraDraft}
              onChange={(event) => setClaraDraft(event.target.value)}
              className="min-w-0 flex-1 bg-transparent px-2.5 text-[13px] font-medium text-white outline-none placeholder:text-slate-400/70"
              placeholder="Item + price, e.g. shoes ₱1,200"
              inputMode="text"
            />
            <button
              type="submit"
              disabled={!claraDraft.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-300 text-slate-950 shadow-[0_0_22px_rgba(110,231,183,0.22)] transition disabled:opacity-45 active:scale-95"
              aria-label="Send to CLARA"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative mt-2 grid cursor-default select-none grid-cols-2 overflow-hidden border ${
        dashboardScale.summaryGrid || "rounded-[26px]"
      }`}
      style={{
        ...bubbleSurface,
        borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.22)",
        boxShadow: themeIsLight
          ? "0 18px 44px rgba(15,23,42,0.10)"
          : "0 20px 58px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.10)",
      }}
    >
      <button
        type="button"
        data-clara-summary-privacy-toggle="true"
        onClick={toggleMoneySummaryVisibility}
        className="absolute right-2.5 top-2.5 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-cyan-100/15 bg-white/[0.075] text-white/65 transition hover:bg-white/[0.12] active:scale-95"
        aria-label={
          moneySummaryVisible
            ? "Hide financial summary amounts"
            : "Show financial summary amounts"
        }
      >
        {moneySummaryVisible ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>

      <div
        data-clara-summary-card="money-left"
        className={`relative isolate overflow-hidden ${
          dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
        }`}
        style={moneyCellSurface}
      >
        <div className="absolute inset-y-0 right-0 z-50 flex w-[88px] items-center justify-center pr-3">
          <button
            type="button"
            data-clara-manual-expense-orb="true"
            onClick={handleOrbClick}
            onDoubleClick={handleOrbClick}
            onPointerDown={handleOrbPointerDown}
            onPointerUp={handleOrbPointerUp}
            onPointerCancel={handleOrbCancel}
            onPointerLeave={handleOrbCancel}
            onContextMenu={handleOrbClick}
            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-cyan-100/20 bg-white/[0.09] text-white transition hover:bg-white/[0.14] active:scale-95"
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            aria-label="Tap to log expense, double tap for Transaction Hub, long press to ask CLARA"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="relative z-10 flex min-h-full min-w-0 flex-col justify-center pr-24">
          <p
            className={`uppercase ${
              dashboardScale.summaryLabel || "text-[11px] tracking-[0.22em]"
            } ${themeSoftTextClass}`}
          >
            Money Left
          </p>
          <h2
            className={`font-bold leading-none ${
              dashboardScale.summaryAmount || "mt-2.5 text-[clamp(32px,8.4vw,37px)]"
            } ${themePrimaryTextClass}`}
          >
            {moneySummaryVisible ? fmt(walletMoney) : "₱••••••"}
          </h2>
        </div>
      </div>

      <div
        data-clara-summary-card="total-expense"
        className={`relative isolate overflow-hidden border-l ${
          dashboardScale.summaryCell || "min-h-[110px] p-[clamp(14px,3.6vw,17px)]"
        }`}
        style={{
          ...expenseCellSurface,
          borderColor: selectedDashboardTheme?.tokens?.border || "rgba(103,232,249,0.16)",
        }}
      >
        <div className="relative z-10 flex min-h-full min-w-0 flex-col justify-center">
          <p
            className={`uppercase ${
              dashboardScale.summaryLabel || "text-[11px] tracking-[0.22em]"
            } ${themeSoftTextClass}`}
          >
            Total Expense
          </p>
          <h2
            className={`font-bold leading-none ${
              dashboardScale.summaryAmount || "mt-2.5 text-[clamp(32px,8.4vw,37px)]"
            } ${themePrimaryTextClass}`}
          >
            {moneySummaryVisible ? fmt(thisMonthSpent) : "₱•••••"}
          </h2>
        </div>
      </div>
    </div>
  );
}
