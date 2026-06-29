import { useCallback, useMemo, useState } from "react";
import {
  generateClaraGeminiReply,
  hasGeminiConfig,
} from "@/lib/clara-gemini-client";

const isRecord = (value) => Boolean(value && typeof value === "object");
const safeRecord = (value) => (isRecord(value) ? value : {});
const safeList = (value) => (Array.isArray(value) ? value.filter(isRecord) : []);

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  return `₱${toNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function normalize(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function createMessage(role, text) {
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
    diagnosis: null,
    busy: false,
    done: false,
    messages: [],
  };
}

function parsePrice(value = "") {
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

function walletName(value) {
  const wallet = safeRecord(value);
  return clean(
    wallet.name || wallet.wallet_name || wallet.title || wallet.label || wallet.type || "Wallet",
  );
}

function walletBalance(value) {
  const wallet = safeRecord(value);
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

function isProtectedWallet(value) {
  const wallet = safeRecord(value);
  return /emergency|reserve|saving|goal/.test(
    normalize(`${walletName(wallet)} ${wallet.type || ""}`),
  );
}

function budgetTitle(value) {
  const budget = safeRecord(value);
  return clean(
    budget.title || budget.category || budget.name || budget.label || budget.budget_category || "",
  );
}

function budgetLimit(value) {
  const budget = safeRecord(value);
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

function findBudget(rawBudgets, category = "") {
  const budgets = safeList(rawBudgets);
  const key = normalize(category);
  const exact = budgets.find((budget) => normalize(budgetTitle(budget)) === key);
  if (exact) return exact;

  const aliases = {
    shopping: ["shopping", "miscellaneous", "lifestyle", "entertainment"],
    lifestyle: ["lifestyle", "miscellaneous", "entertainment"],
    health: ["health", "medical", "miscellaneous"],
    bills: ["bills", "utilities", "subscriptions"],
    transportation: ["transportation", "transport", "fare"],
    food: ["food", "groceries", "dining"],
  }[key] || [];

  return budgets.find((budget) => aliases.includes(normalize(budgetTitle(budget)))) || null;
}

function expenseDate(value) {
  const expense = safeRecord(value);
  const date = new Date(
    expense.date || expense.created_at || expense.createdAt || expense.updatedAt || 0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function categorySpend(rawExpenses, category = "") {
  const expenses = safeList(rawExpenses);
  const key = normalize(category);
  const now = new Date();

  return expenses.reduce((sum, expense) => {
    const date = expenseDate(expense);
    if (!date || date.getFullYear() !== now.getFullYear() || date.getMonth() !== now.getMonth()) {
      return sum;
    }

    const expenseKey = normalize(
      expense.category ||
        expense.category_name ||
        expense.budget_category ||
        expense.expense_category ||
        expense.tag ||
        "",
    );
    const matches =
      expenseKey === key ||
      (key === "shopping" && ["miscellaneous", "lifestyle", "entertainment"].includes(expenseKey));

    return matches
      ? sum + toNumber(expense.amount ?? expense.total ?? expense.value ?? 0)
      : sum;
  }, 0);
}

function scanBudgetCoverage(item, price, contextValue) {
  const context = safeRecord(contextValue);
  const category = inferCategory(item);
  const budget = findBudget(context.budgets, category);

  // No matching budget is a normal Buy Check condition, not an error.
  if (!budget) return null;

  const limit = budgetLimit(budget);
  if (limit <= 0 || price <= 0) return null;

  const spent = categorySpend(context.expenses, category);
  const remaining = Math.max(0, limit - spent);
  const spendable = safeList(context.wallets)
    .filter((wallet) => !isProtectedWallet(wallet))
    .reduce((sum, wallet) => sum + walletBalance(wallet), 0);

  if (remaining < price || spendable < price) return null;

  return {
    category,
    budgetTitle: budgetTitle(budget) || category,
    remaining,
    remainingAfter: Math.max(0, remaining - price),
    spendable,
  };
}

function scheduleItems(contextValue) {
  const context = safeRecord(contextValue);
  const raw =
    context.scheduleContext ||
    context.schedule ||
    context.upcomingSchedule ||
    safeRecord(context.dashboardCardsLiveSnapshot).schedule ||
    [];

  if (Array.isArray(raw)) return raw.filter(Boolean).slice(0, 8);
  const schedule = safeRecord(raw);
  return [
    ...(Array.isArray(schedule.upcomingEvents) ? schedule.upcomingEvents : []),
    ...(Array.isArray(schedule.moneyImpactEvents) ? schedule.moneyImpactEvents : []),
  ]
    .filter(Boolean)
    .slice(0, 8);
}

function memorySummary(contextValue) {
  const context = safeRecord(contextValue);
  const source =
    context.memoryContext ||
    context.fullMemoryContext ||
    context.claraMemoryContext ||
    context.aiFinancialMemory ||
    null;

  if (!source) return "No strong saved spending pattern was available.";
  if (typeof source === "string") return clean(source).slice(0, 280);

  const memory = safeRecord(source);
  const records = safeList(memory.memoryCabinets).flatMap((cabinet) => safeList(cabinet.records));
  const notes = safeList(memory.profileMemoryNotes);
  const candidates = [...records, ...notes];
  const selected =
    candidates.find((record) =>
      /payday|impulse|shopping|trigger|spending|discipline|emergency|goal/i.test(
        `${record.summary || ""} ${Array.isArray(record.signals) ? record.signals.join(" ") : ""}`,
      ),
    ) || candidates[0];

  return clean(
    selected?.summary ||
      (Array.isArray(selected?.signals) ? selected.signals.join(" ") : "") ||
      "No strong saved spending pattern was available.",
  ).slice(0, 280);
}

function buildContextPackage(flowValue, contextValue) {
  const flow = safeRecord(flowValue);
  const context = safeRecord(contextValue);
  const wallets = safeList(context.wallets);
  const budgets = safeList(context.budgets);
  const expenses = safeList(context.expenses);
  const savingsGoals = safeList(context.savingsGoals);
  const category = inferCategory(flow.item);
  const budget = findBudget(budgets, category);
  const limit = budget ? budgetLimit(budget) : 0;
  const spent = categorySpend(expenses, category);
  const spendableWallets = wallets.filter((wallet) => !isProtectedWallet(wallet));
  const protectedWallets = wallets.filter(isProtectedWallet);
  const spendableTotal = spendableWallets.reduce(
    (sum, wallet) => sum + walletBalance(wallet),
    0,
  );

  return {
    purchase: {
      item: clean(flow.item),
      price: toNumber(flow.price),
      reason: clean(flow.reason),
      planningStatus: flow.planningStatus || null,
      category,
    },
    finance: {
      spendableWallets: spendableWallets.map((wallet) => ({
        name: walletName(wallet),
        balance: walletBalance(wallet),
      })),
      protectedWallets: protectedWallets.map((wallet) => ({
        name: walletName(wallet),
        balance: walletBalance(wallet),
      })),
      spendableTotal,
      matchingBudget: budget
        ? {
            title: budgetTitle(budget) || category,
            limit,
            spent,
            remaining: Math.max(0, limit - spent),
          }
        : null,
      savingsGoals: savingsGoals.slice(0, 4),
      emergencyFund: isRecord(context.emergencyFund) ? context.emergencyFund : null,
    },
    schedule: scheduleItems(context),
    meProfile:
      context.meProfileContext ||
      context.lifeProfile ||
      safeRecord(context.user).user_metadata ||
      null,
    memory: memorySummary(context),
  };
}

function localDecision(pkg) {
  const price = toNumber(pkg.purchase.price);
  const spendable = toNumber(pkg.finance.spendableTotal);
  const budget = pkg.finance.matchingBudget;
  const remaining = toNumber(budget?.remaining);
  const risk =
    !spendable || price > spendable || (budget && price > remaining)
      ? "High"
      : price > spendable * 0.25 || (budget && price >= remaining * 0.75)
        ? "Medium"
        : "Low";

  return {
    decision: risk === "High" ? "WAIT" : risk === "Medium" ? "BUY WITH CAP" : "BUY",
    risk,
    saferMove:
      risk === "High"
        ? "Wait first or choose a cheaper option before spending."
        : risk === "Medium"
          ? `Keep the purchase at or below ${money(price)} and protect the rest of your plan.`
          : "Buy only if it still matches your priority, then log it immediately.",
  };
}

function parseDiagnosis(reply = "", fallback) {
  const decision = String(reply).match(
    /Decision:\s*(BUY WITH CAP|BUY|REDUCE|WAIT|PAUSE)/i,
  )?.[1];
  const risk = String(reply).match(/Risk:\s*(Low|Medium|High)/i)?.[1];
  const saferMove = String(reply).match(/Safer move:\s*([^\n]+)/i)?.[1];

  return {
    decision: clean(decision || fallback.decision).toUpperCase(),
    risk: clean(risk || fallback.risk),
    saferMove: clean(saferMove || fallback.saferMove),
  };
}

function savedValue(value) {
  const record = safeRecord(value);
  return toNumber(
    record.savedAmount ?? record.saved_amount ?? record.current_amount ?? record.saved ?? record.amount ?? record.balance ?? 0,
  );
}

function targetValue(value) {
  const record = safeRecord(value);
  return toNumber(
    record.targetAmount ?? record.target_amount ?? record.goal_amount ?? record.target ?? 0,
  );
}

function buildReportCards(pkg, diagnosis) {
  const price = toNumber(pkg.purchase.price);
  const spendable = toNumber(pkg.finance.spendableTotal);
  const budget = pkg.finance.matchingBudget;
  const remaining = toNumber(budget?.remaining);
  const goal = pkg.finance.savingsGoals?.[0] || null;
  const emergency = pkg.finance.emergencyFund;
  const event = pkg.schedule?.[0];
  const eventText = event
    ? clean(
        `${event.title || event.name || event.type || "Upcoming event"} ${event.date || ""} ${event.time || ""}`,
      )
    : "No money-impact schedule was loaded.";

  return [
    {
      eyebrow: "01 / PURCHASE",
      title: pkg.purchase.item,
      stat: money(price),
      body: `Reason: ${pkg.purchase.reason || "No reason recorded"}. Category: ${pkg.purchase.category}.`,
      note: "What you want to buy and why it matters.",
    },
    {
      eyebrow: "02 / WALLET",
      title: "Spendable money",
      stat: money(spendable),
      body: `After this purchase, spendable wallets would have about ${money(spendable - price)}. Protected wallets were excluded.`,
      note: "Can available money carry the purchase safely?",
    },
    {
      eyebrow: "03 / BUDGET",
      title: budget ? `${budget.title} budget` : "Budget check",
      stat: budget ? money(remaining) : "No match",
      body: budget
        ? `The matched budget would have ${money(remaining - price)} left after this purchase.`
        : `No exact ${pkg.purchase.category} budget was found.`,
      note: "Does the purchase fit the current plan?",
    },
    {
      eyebrow: "04 / PROTECTION",
      title: goal?.name || goal?.title || "Goals and emergency fund",
      stat: goal ? money(savedValue(goal)) : emergency ? money(savedValue(emergency)) : "No record",
      body: goal
        ? `This goal has ${money(savedValue(goal))} saved toward ${money(targetValue(goal))}.`
        : emergency
          ? `Emergency fund: ${money(savedValue(emergency))} of ${money(targetValue(emergency))}.`
          : "No active savings or emergency record was loaded.",
      note: "Protected progress should not fund ordinary spending.",
    },
    {
      eyebrow: "05 / TIMING & PATTERN",
      title: "Context check",
      stat: pkg.schedule?.length ? "Schedule loaded" : "No schedule",
      body: `${eventText} Pattern signal: ${pkg.memory}`,
      note: "Timing and previous behavior affect the decision.",
    },
    {
      eyebrow: "06 / FINAL DECISION",
      title: diagnosis.decision,
      stat: `Risk: ${diagnosis.risk}`,
      body: `A ${money(price)} purchase would leave about ${money(spendable - price)} in spendable wallets${budget ? ` and ${money(remaining - price)} in the matched budget` : ""}.`,
      note: `Safer move: ${diagnosis.saferMove}`,
      final: true,
    },
  ];
}

async function diagnose(flow, context) {
  const pkg = buildContextPackage(flow, context);
  const fallback = localDecision(pkg);
  let reply = "";

  if (hasGeminiConfig()) {
    try {
      reply = await generateClaraGeminiReply({
        message: `You are CLARA running a Buy Check. Use the real context below. Do not ask another question.\n\nRequired format:\nDecision: BUY | BUY WITH CAP | REDUCE | WAIT | PAUSE\nRisk: Low | Medium | High\nSafer move: one clear action\n\nContext:\n${JSON.stringify(pkg, null, 2)}`,
        context: pkg,
        mode: "buy_check_react_owned_diagnosis",
        conversationHistory: safeList(flow.messages).map((entry) => ({
          role: entry.role === "clara" ? "assistant" : entry.role,
          text: clean(entry.text),
        })),
      });
    } catch (error) {
      console.warn("[CLARA Buy Check] Gemini diagnosis fallback used.", error);
    }
  }

  const result = parseDiagnosis(reply, fallback);
  return { ...result, contextPackage: pkg, cards: buildReportCards(pkg, result) };
}

function confirmationText(flow) {
  if (flow.planningStatus === "planned" && flow.budgetCoverage) {
    return `This appears covered by your ${flow.budgetCoverage.budgetTitle} budget. You’re considering ${flow.item} for ${money(flow.price)}. The budget has ${money(flow.budgetCoverage.remaining)} available and would have ${money(flow.budgetCoverage.remainingAfter)} left. Did I get that right before I run the full Buy Check?`;
  }

  return `You’re considering ${flow.item} for ${money(flow.price)} because ${flow.reason}. Did I get that right before I run the full Buy Check?`;
}

function recoveryState(current, userMessage, error) {
  console.warn("[CLARA Buy Check] Answer transition recovered safely.", error);
  return {
    ...current,
    busy: false,
    step: current.step === "price" ? "reason" : current.step,
    messages: [
      ...current.messages,
      userMessage,
      createMessage(
        "clara",
        current.step === "price"
          ? "I couldn’t match that purchase to a budget, but we can continue. Why do you want to buy it?"
          : "Something in your saved money data could not be read, but your Buy Check is still open. Please try that answer again.",
      ),
    ],
  };
}

export default function useClaraBuyCheckFlowV3({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => createInitialState());

  const startSession = useCallback((sessionId = "") => {
    setState(createInitialState(sessionId || `buy-check-${Date.now()}`));
  }, []);

  const clearSession = useCallback(() => setState(createInitialState()), []);

  const submitAnswer = useCallback(
    (raw = "") => {
      const answer = clean(raw);
      if (!answer) return false;

      setState((current) => {
        if (
          current.busy ||
          current.done ||
          current.step === "confirm" ||
          current.step === "diagnosis"
        ) {
          return current;
        }

        const userMessage = createMessage("user", answer);

        try {
          if (current.step === "item") {
            return {
              ...current,
              item: answer,
              step: "price",
              messages: [
                ...current.messages,
                userMessage,
                createMessage(
                  "clara",
                  `How much does ${answer} cost? Type the amount only. Example: ₱3,500`,
                ),
              ],
            };
          }

          if (current.step === "price") {
            const price = parsePrice(answer);
            if (!price) {
              return {
                ...current,
                messages: [
                  ...current.messages,
                  userMessage,
                  createMessage("clara", "Please type the price clearly. Example: ₱3,500"),
                ],
              };
            }

            const coverage = scanBudgetCoverage(current.item, price, assistantContext);
            if (coverage) {
              const next = {
                ...current,
                price,
                reason: `Already covered by the ${coverage.budgetTitle} budget`,
                planningStatus: "planned",
                budgetCoverage: coverage,
                step: "confirm",
              };
              next.confirmation = {
                item: next.item,
                price: next.price,
                reason: next.reason,
                planningStatus: next.planningStatus,
              };
              next.messages = [
                ...current.messages,
                userMessage,
                createMessage("clara", confirmationText(next)),
              ];
              return next;
            }

            return {
              ...current,
              price,
              planningStatus: "unplanned",
              budgetCoverage: null,
              step: "reason",
              messages: [
                ...current.messages,
                userMessage,
                createMessage(
                  "clara",
                  "Why do you want to buy it? You can say replacement, work need, reward, health, hobby, or simply that you want it.",
                ),
              ],
            };
          }

          if (current.step === "reason") {
            const next = {
              ...current,
              reason: answer,
              step: "confirm",
            };
            next.confirmation = {
              item: next.item,
              price: next.price,
              reason: next.reason,
              planningStatus: next.planningStatus,
            };
            next.messages = [
              ...current.messages,
              userMessage,
              createMessage("clara", confirmationText(next)),
            ];
            return next;
          }

          return current;
        } catch (error) {
          return recoveryState(current, userMessage, error);
        }
      });

      return true;
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
          createMessage("user", "Edit answers"),
          createMessage("clara", "No problem. What do you want to buy?"),
        ],
      };
    });
  }, []);

  const confirm = useCallback(async () => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return;

    const snapshot = state;
    const checking = createMessage(
      "clara",
      "Got it. I’m checking your wallet, budget, goals, emergency fund, schedule, Me profile, and memory now.",
    );

    setState({
      ...snapshot,
      step: "diagnosis",
      busy: true,
      messages: [
        ...snapshot.messages,
        createMessage("user", "Continue"),
        checking,
      ],
    });

    try {
      const result = await diagnose(snapshot, assistantContext);
      setState((current) => {
        if (current.sessionId !== snapshot.sessionId) return current;
        return {
          ...current,
          step: "complete",
          busy: false,
          done: true,
          diagnosis: result,
          messages: current.messages.map((entry) =>
            entry.id === checking.id
              ? { ...entry, text: "Your Buy Check report is ready." }
              : entry,
          ),
        };
      });
    } catch (error) {
      console.warn("[CLARA Buy Check] Diagnosis failed safely.", error);
      setState((current) => {
        if (current.sessionId !== snapshot.sessionId) return current;
        return {
          ...current,
          step: "complete",
          busy: false,
          done: true,
          diagnosis: {
            decision: "PAUSE",
            risk: "Medium",
            saferMove: "Check your wallet and budget manually before buying.",
            cards: [
              {
                eyebrow: "FINAL DECISION",
                title: "PAUSE",
                stat: "Risk: Medium",
                body: "CLARA could not complete the full context check right now.",
                note: "Safer move: Do not rush the purchase.",
                final: true,
              },
            ],
          },
          messages: current.messages.map((entry) =>
            entry.id === checking.id
              ? {
                  ...entry,
                  text: "I couldn’t complete the full context check, so the safest decision is to pause.",
                }
              : entry,
          ),
        };
      });
    }
  }, [assistantContext, state]);

  const checkAnother = useCallback(() => {
    setState(
      createInitialState(`buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    );
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
