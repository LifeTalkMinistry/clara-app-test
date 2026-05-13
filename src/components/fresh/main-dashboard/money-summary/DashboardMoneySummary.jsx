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
  const normalizedName = normalizeMatchText(name);
  if (!normalizedName) return null;

  return (
    safeWallets.find((wallet) => normalizeMatchText(getWalletName(wallet)) === normalizedName) ||
    safeWallets.find((wallet) => normalizeMatchText(getWalletName(wallet)).includes(normalizedName)) ||
    safeWallets.find((wallet) => normalizedName.includes(normalizeMatchText(getWalletName(wallet)))) ||
    null
  );
}

function guessExpenseCategory(item = "") {
  const text = normalizeMatchText(item);

  if (/milk ?tea|coffee|tea|drink|food|meal|snack|rice|lunch|dinner|breakfast/.test(text)) {
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

  const walletMatch = rawText.match(/\b(?:using|from|via|with)\s+(.+?)\s*$/i);
  const walletName = String(walletMatch?.[1] || "")
    .replace(/[.!?]+$/g, "")
    .trim();

  const wallet = walletName ? findWalletByName(wallets, walletName) : null;
  const fallbackWallet = !wallet && safeArray(wallets).length === 1 ? safeArray(wallets)[0] : null;
  const selectedWallet = wallet || fallbackWallet;

  if (!selectedWallet) {
    return {
      ok: false,
      reason: "wallet_not_found",
      rawText,
      amount,
      walletName,
    };
  }

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

  item = item || "Expense";

  return {
    ok: true,
    rawText,
    item,
    amount,
    wallet: selectedWallet,
    walletName: getWalletName(selectedWallet),
    category: guessExpenseCategory(item),
  };
}

function getBudgetRows(monthlyBudgetPlan) {
  if (Array.isArray(monthlyBudgetPlan?.categories)) return monthlyBudgetPlan.categories;
  if (Array.isArray(monthlyBudgetPlan?.categoryRows)) return monthlyBudgetPlan.categoryRows;
  if (Array.isArray(monthlyBudgetPlan?.items)) return monthlyBudgetPlan.items;
  return [];
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

  const logExpenseFromChat = useCallback(
    async (command) => {
      if (!command?.ok) {
        if (command?.reason === "wallet_not_found") {
          return command.walletName
            ? `I found the expense amount, but I couldn’t find “${command.walletName}” in your wallets. Please use the exact wallet name so I can log it safely.`
            : "I can log that, but tell me which wallet to use first.";
        }

        return "I can log expenses now, but I need the item, amount, and wallet name.";
      }

      const walletBalance = getWalletVisibleBalance(command.wallet);
      if (walletBalance < command.amount) {
        return `${command.walletName} only has ${fmt(walletBalance)} available, so I didn’t log the ${fmt(command.amount)} ${command.item} expense. Choose another wallet or add money first.`;
      }

      const nowIso = new Date().toISOString();
      const localUserId = getLocalUserIdFromWallets(wallets);

      await repoAddExpense(localUserId, {
        amount: command.amount,
        wallet_id: command.wallet.id,
        category: command.category,
        need_type: "other",
        planning_status: "unplanned",
        unplanned_reason: `Logged through CLARA chat: ${command.rawText}`,
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
      return `Logged ✅ ${fmt(command.amount)} for ${command.item} from ${command.walletName}. That wallet should now be around ${fmt(nextBalance)}. Small spends count too, so good job recording it right away.`;
    },
    [fmt, wallets]
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

  const submitClaraPrompt = useCallback(
    (rawText) => {
      const text = String(rawText || "").trim();
      if (!text) return;

      const expenseCommand = parseExpenseLogCommand(text, wallets);
      const pendingMessage = makeClaraMessage(
        "clara",
        expenseCommand ? CLARA_LOGGING_REPLY : CLARA_THINKING_REPLY
      );

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

      if (expenseCommand) {
        logExpenseFromChat(expenseCommand)
          .then((reply) => replaceClaraMessage(pendingMessage.id, reply))
          .catch((error) => {
            console.warn("CLARA chat expense log failed:", error);
            replaceClaraMessage(
              pendingMessage.id,
              "I understood the expense, but I couldn’t save it yet. Please try again or use the manual expense button."
            );
          });
        return;
      }

      resolveClaraReply(text).then((reply) => {
        replaceClaraMessage(pendingMessage.id, reply);
      });
    },
    [logExpenseFromChat, replaceClaraMessage, resolveClaraReply, wallets]
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
