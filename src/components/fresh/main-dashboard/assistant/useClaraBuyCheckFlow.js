import { useCallback, useMemo, useState } from "react";
import {
  generateClaraGeminiReply,
  hasGeminiConfig,
} from "@/lib/clara-gemini-client";

const EMPTY_DIAGNOSIS = null;

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function normalize(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function makeMessage(role, text) {
  return {
    id: `buy-check-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text: clean(text),
  };
}

function createInitialState(sessionId = "") {
  return {
    sessionId,
    step: "item",
    item: "",
    price: 0,
    reason: "",
    planningStatus: null,
    budgetCoverage: null,
    confirmation: null,
    diagnosis: EMPTY_DIAGNOSIS,
    busy: false,
    done: false,
    messages: [],
  };
}

function extractPrice(value = "") {
  const match = clean(value).match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  return match ? toNumber(match[1]) : 0;
}

function inferCategory(item = "") {
  const text = normalize(item);
  if (/food|meal|coffee|milk tea|snack|restaurant|delivery|grocery|groceries/.test(text)) return "Food";
  if (/jeep|bus|taxi|grab|angkas|moveit|gas|fare|transport/.test(text)) return "Transportation";
  if (/rent|electric|water|internet|wifi|bill|load|subscription/.test(text)) return "Bills";
  if (/medicine|doctor|hospital|vitamin|health|checkup/.test(text)) return "Health";
  if (/shoe|shoes|sneaker|shirt|clothes|bag|watch|gadget|phone|shopping|lazada|shopee/.test(text)) return "Shopping";
  return "Lifestyle";
}

function getWalletName(wallet = {}) {
  return clean(
    wallet.name ||
      wallet.wallet_name ||
      wallet.title ||
      wallet.label ||
      wallet.type ||
      "Wallet",
  );
}

function getWalletBalance(wallet = {}) {
  return toNumber(
    wallet.derived_balance ??
      wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance ??
      0,
  );
}

function isProtectedWallet(wallet = {}) {
  const text = normalize(`${getWalletName(wallet)} ${wallet.type || ""}`);
  return /emergency|reserve|saving|goal/.test(text);
}

function getBudgetTitle(budget = {}) {
  return clean(
    budget.title ||
      budget.category ||
      budget.name ||
      budget.label ||
      budget.budget_category ||
      "",
  );
}

function getBudgetLimit(budget = {}) {
  return toNumber(
    budget.limit ??
      budget.amount ??
      budget.budget_amount ??
      budget.allocated ??
      budget.allocated_amount ??
      budget.monthly_amount ??
      budget.total_budget ??
      budget.budget ??
      budget.cap ??
      0,
  );
}

function getExpenseAmount(expense = {}) {
  return toNumber(expense.amount ?? expense.total ?? expense.value ?? 0);
}

function getExpenseCategory(expense = {}) {
  return clean(
    expense.category ||
      expense.category_name ||
      expense.budget_category ||
      expense.expense_category ||
      expense.tag ||
      "",
  );
}

function getExpenseDate(expense = {}) {
  const date = new Date(
    expense.date || expense.created_at || expense.createdAt || expense.updatedAt || 0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function findBudget(budgets = [], category = "") {
  const key = normalize(category);
  const exact = budgets.find((budget) => normalize(getBudgetTitle(budget)) === key);
  if (exact) return exact;

  const aliases = {
    shopping: ["shopping", "miscellaneous", "lifestyle", "entertainment"],
    lifestyle: ["lifestyle", "miscellaneous", "entertainment"],
    health: ["health", "medical", "miscellaneous"],
    bills: ["bills", "utilities", "subscriptions"],
    transportation: ["transportation", "transport", "fare"],
    food: ["food", "groceries", "dining"],
  }[key] || [];

  return budgets.find((budget) => aliases.includes(normalize(getBudgetTitle(budget)))) || null;
}

function getMonthCategorySpend(expenses = [], category = "") {
  const categoryKey = normalize(category);
  const now = new Date();

  return expenses.reduce((sum, expense) => {
    const date = getExpenseDate(expense);
    if (
      !date ||
      date.getFullYear() !== now.getFullYear() ||
      date.getMonth() !== now.getMonth()
    ) {
      return sum;
    }

    const expenseKey = normalize(getExpenseCategory(expense));
    const matches =
      expenseKey === categoryKey ||
      (categoryKey === "shopping" &&
        ["miscellaneous", "lifestyle", "entertainment"].includes(expenseKey));

    return matches ? sum + getExpenseAmount(expense) : sum;
  }, 0);
}

function scanBudgetCoverage(item, price, assistantContext = {}) {
  const category = inferCategory(item);
  const wallets = Array.isArray(assistantContext.wallets) ? assistantContext.wallets : [];
  const budgets = Array.isArray(assistantContext.budgets) ? assistantContext.budgets : [];
  const expenses = Array.isArray(assistantContext.expenses) ? assistantContext.expenses : [];
  const budget = findBudget(budgets, category);
  const limit = getBudgetLimit(budget);
  const spent = getMonthCategorySpend(expenses, category);
  const remaining = Math.max(0, limit - spent);
  const spendableWalletTotal = wallets
    .filter((wallet) => !isProtectedWallet(wallet))
    .reduce((sum, wallet) => sum + getWalletBalance(wallet), 0);

  if (!budget || limit <= 0 || price <= 0) return null;
  if (remaining < price || spendableWalletTotal < price) return null;

  return {
    category,
    budgetTitle: getBudgetTitle(budget) || category,
    limit,
    spent,
    remaining,
    purchaseAmount: price,
    remainingAfter: Math.max(0, remaining - price),
    spendableWalletTotal,
  };
}

function getScheduleItems(context = {}) {
  const raw =
    context.scheduleContext ||
    context.schedule ||
    context.upcomingSchedule ||
    context.dashboardCardsLiveSnapshot?.schedule ||
    [];

  if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 8);

  return [
    ...(Array.isArray(raw?.upcomingEvents) ? raw.upcomingEvents : []),
    ...(Array.isArray(raw?.moneyImpactEvents) ? raw.moneyImpactEvents : []),
  ]
    .filter(Boolean)
    .slice(0, 8);
}

function getMemorySummary(context = {}) {
  const memory =
    context.memoryContext ||
    context.fullMemoryContext ||
    context.claraMemoryContext ||
    context.aiFinancialMemory ||
    null;

  if (!memory) return "No strong saved spending pattern was available for this check.";
  if (typeof memory === "string") return clean(memory).slice(0, 360);

  const cabinets = Array.isArray(memory.memoryCabinets) ? memory.memoryCabinets : [];
  const records = cabinets.flatMap((cabinet) =>
    Array.isArray(cabinet.records) ? cabinet.records : [],
  );
  const notes = Array.isArray(memory.profileMemoryNotes) ? memory.profileMemoryNotes : [];
  const candidates = [...records, ...notes];
  const preferred = candidates.find((record) =>
    /payday|impulse|shopping|trigger|spending|discipline|emergency|goal/i.test(
      `${record?.summary || ""} ${(record?.signals || []).join?.(" ") || ""}`,
    ),
  );
  const selected = preferred || candidates[0];

  return clean(
    selected?.summary ||
      (Array.isArray(selected?.signals) ? selected.signals.join(" ") : "") ||
      "No strong saved spending pattern was available for this check.",
  ).slice(0, 360);
}

function buildContextPackage(flow, assistantContext = {}) {
  const wallets = Array.isArray(assistantContext.wallets) ? assistantContext.wallets : [];
  const budgets = Array.isArray(assistantContext.budgets) ? assistantContext.budgets : [];
  const expenses = Array.isArray(assistantContext.expenses) ? assistantContext.expenses : [];
  const savingsGoals = Array.isArray(assistantContext.savingsGoals)
    ? assistantContext.savingsGoals
    : [];
  const category = inferCategory(flow.item);
  const matchingBudget = findBudget(budgets, category);
  const budgetLimit = getBudgetLimit(matchingBudget);
  const categorySpent = getMonthCategorySpend(expenses, category);
  const spendableWallets = wallets.filter((wallet) => !isProtectedWallet(wallet));
  const protectedWallets = wallets.filter(isProtectedWallet);
  const totalSpendableWalletBalance = spendableWallets.reduce(
    (sum, wallet) => sum + getWalletBalance(wallet),
    0,
  );

  return {
    purchaseSummary: {
      item: flow.item,
      price: flow.price,
      reason: flow.reason,
      planningStatus: flow.planningStatus,
      inferredCategory: category,
    },
    financeContext: {
      spendableWallets: spendableWallets.map((wallet) => ({
        name: getWalletName(wallet),
        balance: getWalletBalance(wallet),
      })),
      protectedWallets: protectedWallets.map((wallet) => ({
        name: getWalletName(wallet),
        balance: getWalletBalance(wallet),
      })),
      totalSpendableWalletBalance,
      matchingBudget: matchingBudget
        ? {
            title: getBudgetTitle(matchingBudget),
            limit: budgetLimit,
            spentThisMonth: categorySpent,
            remaining: Math.max(0, budgetLimit - categorySpent),
          }
        : null,
      savingsGoals: savingsGoals.slice(0, 5),
      emergencyFund: assistantContext.emergencyFund || null,
      recentExpenses: expenses.slice(-30),
    },
    scheduleContext: getScheduleItems(assistantContext),
    mePageContext:
      assistantContext.meProfileContext ||
      assistantContext.lifeProfile ||
      assistantContext.user?.user_metadata ||
      null,
    memorySummary: getMemorySummary(assistantContext),
  };
}

function localDecision(contextPackage) {
  const price = toNumber(contextPackage.purchaseSummary.price);
  const spendable = toNumber(
    contextPackage.financeContext.totalSpendableWalletBalance,
  );
  const budget = contextPackage.financeContext.matchingBudget;
  const remaining = toNumber(budget?.remaining);

  const risk =
    !spendable || price > spendable || (budget && price > remaining)
      ? "High"
      : (budget && remaining > 0 && price >= remaining * 0.75) ||
          price > spendable * 0.25
        ? "Medium"
        : "Low";

  const decision = risk === "High" ? "WAIT" : risk === "Medium" ? "BUY WITH CAP" : "BUY";
  const saferMove =
    risk === "High"
      ? budget
        ? `Wait first or choose an option below ${money(remaining)}.`
        : "Wait first or choose a cheaper option before spending."
      : risk === "Medium"
        ? `Do not spend more than ${money(price)}, and protect the rest of your current plan.`
        : "Buy only if it still matches your priority, then log the expense right away.";

  return { decision, risk, saferMove };
}

function extractDiagnosis(reply = "", fallback) {
  const decisionMatch = String(reply).match(
    /Decision:\s*(BUY WITH CAP|BUY|REDUCE|WAIT|PAUSE)/i,
  );
  const riskMatch = String(reply).match(/Risk:\s*(Low|Medium|High)/i);
  const saferMoveMatch = String(reply).match(/Safer move:\s*([^\n]+)/i);

  return {
    decision: clean(decisionMatch?.[1] || fallback.decision).toUpperCase(),
    risk: clean(riskMatch?.[1] || fallback.risk),
    saferMove: clean(saferMoveMatch?.[1] || fallback.saferMove),
  };
}

function firstGoal(contextPackage) {
  return contextPackage.financeContext.savingsGoals?.[0] || null;
}

function goalName(goal = {}) {
  return clean(goal.name || goal.title || goal.goal_name || "Savings goal");
}

function goalSaved(goal = {}) {
  return toNumber(goal.savedAmount ?? goal.saved_amount ?? goal.current_amount ?? goal.saved ?? 0);
}

function goalTarget(goal = {}) {
  return toNumber(goal.targetAmount ?? goal.target_amount ?? goal.goal_amount ?? goal.target ?? 0);
}

function emergencySaved(emergency = {}) {
  return toNumber(
    emergency.savedAmount ??
      emergency.saved_amount ??
      emergency.current_amount ??
      emergency.amount ??
      emergency.balance ??
      0,
  );
}

function emergencyTarget(emergency = {}) {
  return toNumber(
    emergency.targetAmount ??
      emergency.target_amount ??
      emergency.goal_amount ??
      emergency.target ??
      0,
  );
}

function scheduleSummary(contextPackage) {
  const event = contextPackage.scheduleContext?.[0];
  if (!event) return "No upcoming money-impact schedule was loaded for this check.";
  const title = clean(event.title || event.name || event.type || "Upcoming event");
  const timing = clean([event.date, event.time].filter(Boolean).join(" • "));
  const amount = toNumber(event.amount || event.cost || event.estimatedImpact || 0);
  return `${title}${timing ? ` • ${timing}` : ""}${amount ? ` • ${money(amount)}` : ""}`;
}

function buildReportCards(contextPackage, diagnosis) {
  const { purchaseSummary, financeContext } = contextPackage;
  const price = toNumber(purchaseSummary.price);
  const spendable = toNumber(financeContext.totalSpendableWalletBalance);
  const budget = financeContext.matchingBudget;
  const remaining = toNumber(budget?.remaining);
  const goal = firstGoal(contextPackage);
  const emergency = financeContext.emergencyFund;

  return [
    {
      eyebrow: "01 / PURCHASE",
      title: purchaseSummary.item,
      stat: money(price),
      body: `Reason: ${purchaseSummary.reason || "Already covered by the current plan"}. Category: ${purchaseSummary.inferredCategory}.`,
      note: "What you want to buy and why it matters.",
    },
    {
      eyebrow: "02 / WALLET",
      title: "Spendable money",
      stat: money(spendable),
      body: `After this purchase, your spendable wallet total would be about ${money(
        spendable - price,
      )}. Protected wallets were excluded from available spending money.`,
      note: "Can your available money carry the purchase safely?",
    },
    {
      eyebrow: "03 / BUDGET",
      title: budget ? `${budget.title} budget` : "Budget check",
      stat: budget ? money(remaining) : "No match",
      body: budget
        ? `This category currently has ${money(remaining)} remaining and would have ${money(
            remaining - price,
          )} left after the purchase.`
        : `No exact ${purchaseSummary.inferredCategory} budget was found, so CLARA treated the purchase cautiously.`,
      note: "Does the purchase fit the plan already in place?",
    },
    {
      eyebrow: "04 / GOALS",
      title: goal ? goalName(goal) : "Savings goals",
      stat: goal ? money(goalSaved(goal)) : "None",
      body: goal
        ? `${goalName(goal)} currently has ${money(goalSaved(goal))} saved toward ${money(
            goalTarget(goal),
          )}. Keep that progress protected.`
        : "No active savings goal was loaded for this check.",
      note: "Will this purchase slow down an important goal?",
    },
    {
      eyebrow: "05 / EMERGENCY",
      title: "Emergency fund",
      stat: emergency ? money(emergencySaved(emergency)) : "None",
      body: emergency
        ? `Your emergency fund is ${money(emergencySaved(emergency))} out of ${money(
            emergencyTarget(emergency),
          )}. It should remain protected from non-urgent spending.`
        : "No emergency-fund record was loaded for this check.",
      note: "Protected money should not fund an ordinary purchase.",
    },
    {
      eyebrow: "06 / TIMING & PATTERN",
      title: "Context check",
      stat: contextPackage.scheduleContext?.length ? "Schedule loaded" : "No schedule",
      body: `${scheduleSummary(contextPackage)} Pattern signal: ${contextPackage.memorySummary}`,
      note: "Timing, identity, and previous behavior affect the decision.",
    },
    {
      eyebrow: "07 / FINAL DECISION",
      title: diagnosis.decision,
      stat: `Risk: ${diagnosis.risk}`,
      body: `A ${money(price)} purchase would leave about ${money(
        spendable - price,
      )} in spendable wallets${budget ? ` and ${money(remaining - price)} in the matched budget` : ""}.`,
      note: `Safer move: ${diagnosis.saferMove}`,
      final: true,
    },
  ];
}

async function runDiagnosis(flow, assistantContext) {
  const contextPackage = buildContextPackage(flow, assistantContext);
  const fallback = localDecision(contextPackage);
  let reply = "";

  if (hasGeminiConfig()) {
    const prompt = `You are CLARA, a personal money coach running a Buy Check.

Decide whether the user should BUY, BUY WITH CAP, REDUCE, WAIT, or PAUSE.
Use the real wallet, budget, goals, emergency fund, schedule, Me profile, and memory context below.
Do not ask another question. Keep the decision direct.

Required format:
Decision: BUY | BUY WITH CAP | REDUCE | WAIT | PAUSE
Risk: Low | Medium | High
Safer move: one clear action

Context:
${JSON.stringify(contextPackage, null, 2)}`;

    try {
      reply = await generateClaraGeminiReply({
        message: prompt,
        context: contextPackage,
        mode: "buy_check_react_owned_diagnosis",
        conversationHistory: flow.messages.map((message) => ({
          role: message.role === "clara" ? "assistant" : message.role,
          text: message.text,
        })),
      });
    } catch (error) {
      console.warn("[CLARA Buy Check] React-owned diagnosis used fallback.", error);
    }
  }

  const diagnosis = extractDiagnosis(reply, fallback);
  return {
    ...diagnosis,
    contextPackage,
    cards: buildReportCards(contextPackage, diagnosis),
  };
}

function buildConfirmationText({ item, price, reason, planningStatus, budgetCoverage }) {
  if (planningStatus === "planned" && budgetCoverage) {
    return `This appears covered by your ${budgetCoverage.budgetTitle} budget. You’re considering ${item} for ${money(
      price,
    )}. The budget currently has ${money(
      budgetCoverage.remaining,
    )} available and would have ${money(
      budgetCoverage.remainingAfter,
    )} left. Did I get that right before I run the full Buy Check?`;
  }

  return `You’re considering ${item} for ${money(price)} because ${
    reason || "you want to check whether it is a responsible purchase"
  }. Did I get that right before I run the full Buy Check?`;
}

export default function useClaraBuyCheckFlow({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => createInitialState());

  const startSession = useCallback((sessionId = "") => {
    setState(createInitialState(sessionId || `buy-check-${Date.now()}`));
  }, []);

  const clearSession = useCallback(() => {
    setState(createInitialState());
  }, []);

  const submitAnswer = useCallback(
    (rawAnswer = "") => {
      const answer = clean(rawAnswer);
      if (!answer) return false;

      let accepted = false;

      setState((current) => {
        if (current.busy || current.done || current.step === "confirm" || current.step === "diagnosis") {
          return current;
        }

        accepted = true;
        const userMessage = makeMessage("user", answer);

        if (current.step === "item") {
          return {
            ...current,
            item: answer,
            step: "price",
            messages: [
              ...current.messages,
              userMessage,
              makeMessage("clara", `How much does ${answer} cost? Type the amount only. Example: ₱3,500`),
            ],
          };
        }

        if (current.step === "price") {
          const price = extractPrice(answer);
          if (!price) {
            return {
              ...current,
              messages: [
                ...current.messages,
                userMessage,
                makeMessage("clara", "Please type the price clearly so I can check it properly. Example: ₱3,500"),
              ],
            };
          }

          const coverage = scanBudgetCoverage(current.item, price, assistantContext);
          if (coverage) {
            const reason = `Already covered by the ${coverage.budgetTitle} budget`;
            const confirmation = {
              item: current.item,
              price,
              reason,
              planningStatus: "planned",
              budgetCoverage: coverage,
            };

            return {
              ...current,
              price,
              reason,
              planningStatus: "planned",
              budgetCoverage: coverage,
              confirmation,
              step: "confirm",
              messages: [
                ...current.messages,
                userMessage,
                makeMessage("clara", buildConfirmationText(confirmation)),
              ],
            };
          }

          return {
            ...current,
            price,
            planningStatus: "unplanned",
            step: "reason",
            messages: [
              ...current.messages,
              userMessage,
              makeMessage(
                "clara",
                "Why do you want to buy it? You can say replacement, work need, reward, health, hobby, or simply that you want it.",
              ),
            ],
          };
        }

        if (current.step === "reason") {
          const confirmation = {
            item: current.item,
            price: current.price,
            reason: answer,
            planningStatus: current.planningStatus || "unplanned",
            budgetCoverage: current.budgetCoverage,
          };

          return {
            ...current,
            reason: answer,
            confirmation,
            step: "confirm",
            messages: [
              ...current.messages,
              userMessage,
              makeMessage("clara", buildConfirmationText(confirmation)),
            ],
          };
        }

        return current;
      });

      return accepted;
    },
    [assistantContext],
  );

  const editAnswers = useCallback(() => {
    setState((current) => {
      if (current.step !== "confirm" || current.busy) return current;

      return {
        ...createInitialState(current.sessionId),
        messages: [
          ...current.messages,
          makeMessage("user", "Edit answers"),
          makeMessage("clara", "No problem. What do you want to buy?"),
        ],
      };
    });
  }, []);

  const confirm = useCallback(async () => {
    let snapshot = null;
    let checkingMessageId = "";

    setState((current) => {
      if (current.step !== "confirm" || current.busy || !current.confirmation) return current;
      snapshot = current;
      const checkingMessage = makeMessage(
        "clara",
        "Got it. I’m checking your wallet, budget, goals, emergency fund, schedule, Me profile, and memory now.",
      );
      checkingMessageId = checkingMessage.id;

      return {
        ...current,
        step: "diagnosis",
        busy: true,
        messages: [
          ...current.messages,
          makeMessage("user", "Continue"),
          checkingMessage,
        ],
      };
    });

    if (!snapshot) return;

    try {
      const diagnosis = await runDiagnosis(snapshot, assistantContext);
      setState((current) => ({
        ...current,
        step: "complete",
        busy: false,
        done: true,
        diagnosis,
        messages: current.messages.map((message) =>
          message.id === checkingMessageId
            ? { ...message, text: "Your Buy Check report is ready." }
            : message,
        ),
      }));
    } catch (error) {
      console.warn("[CLARA Buy Check] React-owned diagnosis failed.", error);
      setState((current) => ({
        ...current,
        step: "complete",
        busy: false,
        done: true,
        diagnosis: {
          decision: "PAUSE",
          risk: "Medium",
          saferMove: "Try again later or check your wallet and budget manually before buying.",
          cards: [
            {
              eyebrow: "FINAL DECISION",
              title: "PAUSE",
              stat: "Risk: Medium",
              body: "CLARA could not complete the full context check right now.",
              note: "Safer move: Do not rush the purchase while the diagnosis is incomplete.",
              final: true,
            },
          ],
        },
        messages: current.messages.map((message) =>
          message.id === checkingMessageId
            ? { ...message, text: "I couldn’t complete the full context check, so the safest decision is to pause." }
            : message,
        ),
      }));
    }
  }, [assistantContext]);

  const checkAnother = useCallback(() => {
    setState((current) => createInitialState(`buy-check-${Date.now()}-${current.sessionId || "next"}`));
  }, []);

  return useMemo(
    () => ({
      state,
      messages: state.messages,
      startSession,
      clearSession,
      submitAnswer,
      confirm,
      editAnswers,
      checkAnother,
    }),
    [
      checkAnother,
      clearSession,
      confirm,
      editAnswers,
      startSession,
      state,
      submitAnswer,
    ],
  );
}
