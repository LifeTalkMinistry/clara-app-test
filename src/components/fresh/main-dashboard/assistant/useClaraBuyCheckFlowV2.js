import { useCallback, useMemo, useState } from "react";
import {
  generateClaraGeminiReply,
  hasGeminiConfig,
} from "@/lib/clara-gemini-client";

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function number(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value = 0) {
  return `₱${(Number(value) || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function norm(value = "") {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function message(role, text) {
  return {
    id: `buy-check-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text: clean(text),
  };
}

function initialState(sessionId = "") {
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
  return match ? number(match[1]) : 0;
}

function inferCategory(item = "") {
  const text = norm(item);
  if (/food|meal|coffee|milk tea|snack|restaurant|delivery|grocery|groceries/.test(text)) return "Food";
  if (/jeep|bus|taxi|grab|angkas|moveit|gas|fare|transport/.test(text)) return "Transportation";
  if (/rent|electric|water|internet|wifi|bill|load|subscription/.test(text)) return "Bills";
  if (/medicine|doctor|hospital|vitamin|health|checkup/.test(text)) return "Health";
  if (/shoe|shoes|sneaker|shirt|clothes|bag|watch|gadget|phone|shopping|lazada|shopee/.test(text)) return "Shopping";
  return "Lifestyle";
}

function walletName(wallet = {}) {
  return clean(
    wallet.name ||
      wallet.wallet_name ||
      wallet.title ||
      wallet.label ||
      wallet.type ||
      "Wallet",
  );
}

function walletBalance(wallet = {}) {
  return number(
    wallet.derived_balance ??
      wallet.balance ??
      wallet.current_balance ??
      wallet.wallet_balance ??
      wallet.available_balance ??
      wallet.starting_balance ??
      0,
  );
}

function protectedWallet(wallet = {}) {
  return /emergency|reserve|saving|goal/.test(
    norm(`${walletName(wallet)} ${wallet.type || ""}`),
  );
}

function budgetTitle(budget = {}) {
  return clean(
    budget.title ||
      budget.category ||
      budget.name ||
      budget.label ||
      budget.budget_category ||
      "",
  );
}

function budgetLimit(budget = {}) {
  return number(
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

function findBudget(budgets = [], category = "") {
  const key = norm(category);
  const exact = budgets.find((budget) => norm(budgetTitle(budget)) === key);
  if (exact) return exact;

  const aliases = {
    shopping: ["shopping", "miscellaneous", "lifestyle", "entertainment"],
    lifestyle: ["lifestyle", "miscellaneous", "entertainment"],
    health: ["health", "medical", "miscellaneous"],
    bills: ["bills", "utilities", "subscriptions"],
    transportation: ["transportation", "transport", "fare"],
    food: ["food", "groceries", "dining"],
  }[key] || [];

  return budgets.find((budget) => aliases.includes(norm(budgetTitle(budget)))) || null;
}

function expenseDate(expense = {}) {
  const value = new Date(
    expense.date || expense.created_at || expense.createdAt || expense.updatedAt || 0,
  );
  return Number.isNaN(value.getTime()) ? null : value;
}

function categorySpend(expenses = [], category = "") {
  const key = norm(category);
  const now = new Date();

  return expenses.reduce((sum, expense) => {
    const date = expenseDate(expense);
    if (
      !date ||
      date.getFullYear() !== now.getFullYear() ||
      date.getMonth() !== now.getMonth()
    ) {
      return sum;
    }

    const expenseKey = norm(
      expense.category ||
        expense.category_name ||
        expense.budget_category ||
        expense.expense_category ||
        expense.tag ||
        "",
    );
    const matches =
      expenseKey === key ||
      (key === "shopping" &&
        ["miscellaneous", "lifestyle", "entertainment"].includes(expenseKey));

    return matches
      ? sum + number(expense.amount ?? expense.total ?? expense.value ?? 0)
      : sum;
  }, 0);
}

function budgetCoverage(item, price, context = {}) {
  const category = inferCategory(item);
  const wallets = Array.isArray(context.wallets) ? context.wallets : [];
  const budgets = Array.isArray(context.budgets) ? context.budgets : [];
  const expenses = Array.isArray(context.expenses) ? context.expenses : [];
  const budget = findBudget(budgets, category);
  const limit = budgetLimit(budget);
  const spent = categorySpend(expenses, category);
  const remaining = Math.max(0, limit - spent);
  const spendable = wallets
    .filter((wallet) => !protectedWallet(wallet))
    .reduce((sum, wallet) => sum + walletBalance(wallet), 0);

  if (!budget || limit <= 0 || price <= 0 || remaining < price || spendable < price) {
    return null;
  }

  return {
    category,
    budgetTitle: budgetTitle(budget) || category,
    remaining,
    remainingAfter: Math.max(0, remaining - price),
    spendable,
  };
}

function scheduleItems(context = {}) {
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

function memorySummary(context = {}) {
  const source =
    context.memoryContext ||
    context.fullMemoryContext ||
    context.claraMemoryContext ||
    context.aiFinancialMemory ||
    null;

  if (!source) return "No strong saved spending pattern was available.";
  if (typeof source === "string") return clean(source).slice(0, 280);

  const cabinets = Array.isArray(source.memoryCabinets) ? source.memoryCabinets : [];
  const records = cabinets.flatMap((cabinet) =>
    Array.isArray(cabinet.records) ? cabinet.records : [],
  );
  const notes = Array.isArray(source.profileMemoryNotes)
    ? source.profileMemoryNotes
    : [];
  const candidates = [...records, ...notes];
  const selected =
    candidates.find((record) =>
      /payday|impulse|shopping|trigger|spending|discipline|emergency|goal/i.test(
        `${record?.summary || ""} ${
          Array.isArray(record?.signals) ? record.signals.join(" ") : ""
        }`,
      ),
    ) || candidates[0];

  return clean(
    selected?.summary ||
      (Array.isArray(selected?.signals) ? selected.signals.join(" ") : "") ||
      "No strong saved spending pattern was available.",
  ).slice(0, 280);
}

function contextPackage(flow, context = {}) {
  const wallets = Array.isArray(context.wallets) ? context.wallets : [];
  const budgets = Array.isArray(context.budgets) ? context.budgets : [];
  const expenses = Array.isArray(context.expenses) ? context.expenses : [];
  const savingsGoals = Array.isArray(context.savingsGoals)
    ? context.savingsGoals
    : [];
  const category = inferCategory(flow.item);
  const budget = findBudget(budgets, category);
  const limit = budgetLimit(budget);
  const spent = categorySpend(expenses, category);
  const spendableWallets = wallets.filter((wallet) => !protectedWallet(wallet));
  const protectedWallets = wallets.filter(protectedWallet);
  const spendableTotal = spendableWallets.reduce(
    (sum, wallet) => sum + walletBalance(wallet),
    0,
  );

  return {
    purchase: {
      item: flow.item,
      price: flow.price,
      reason: flow.reason,
      planningStatus: flow.planningStatus,
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
            title: budgetTitle(budget),
            limit,
            spent,
            remaining: Math.max(0, limit - spent),
          }
        : null,
      savingsGoals: savingsGoals.slice(0, 4),
      emergencyFund: context.emergencyFund || null,
    },
    schedule: scheduleItems(context),
    meProfile:
      context.meProfileContext ||
      context.lifeProfile ||
      context.user?.user_metadata ||
      null,
    memory: memorySummary(context),
  };
}

function localDecision(pkg) {
  const price = number(pkg.purchase.price);
  const spendable = number(pkg.finance.spendableTotal);
  const budget = pkg.finance.matchingBudget;
  const remaining = number(budget?.remaining);
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

function goalValue(goal = {}, type) {
  if (type === "saved") {
    return number(
      goal.savedAmount ?? goal.saved_amount ?? goal.current_amount ?? goal.saved ?? 0,
    );
  }
  return number(
    goal.targetAmount ?? goal.target_amount ?? goal.goal_amount ?? goal.target ?? 0,
  );
}

function emergencyValue(emergency = {}, type) {
  if (type === "saved") {
    return number(
      emergency.savedAmount ??
        emergency.saved_amount ??
        emergency.current_amount ??
        emergency.amount ??
        emergency.balance ??
        0,
    );
  }
  return number(
    emergency.targetAmount ??
      emergency.target_amount ??
      emergency.goal_amount ??
      emergency.target ??
      0,
  );
}

function reportCards(pkg, diagnosis) {
  const price = number(pkg.purchase.price);
  const spendable = number(pkg.finance.spendableTotal);
  const budget = pkg.finance.matchingBudget;
  const remaining = number(budget?.remaining);
  const goal = pkg.finance.savingsGoals?.[0];
  const emergency = pkg.finance.emergencyFund;
  const event = pkg.schedule?.[0];
  const eventText = event
    ? clean(
        `${event.title || event.name || event.type || "Upcoming event"} ${
          event.date || ""
        } ${event.time || ""}`,
      )
    : "No money-impact schedule was loaded.";

  return [
    {
      eyebrow: "01 / PURCHASE",
      title: pkg.purchase.item,
      stat: money(price),
      body: `Reason: ${pkg.purchase.reason}. Category: ${pkg.purchase.category}.`,
      note: "What you want to buy and why it matters.",
    },
    {
      eyebrow: "02 / WALLET",
      title: "Spendable money",
      stat: money(spendable),
      body: `After this purchase, spendable wallets would have about ${money(
        spendable - price,
      )}. Protected wallets were excluded.`,
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
      stat: goal ? money(goalValue(goal, "saved")) : emergency ? money(emergencyValue(emergency, "saved")) : "No record",
      body: goal
        ? `This goal has ${money(goalValue(goal, "saved"))} saved toward ${money(
            goalValue(goal, "target"),
          )}.`
        : emergency
          ? `Emergency fund: ${money(emergencyValue(emergency, "saved"))} of ${money(
              emergencyValue(emergency, "target"),
            )}.`
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
      body: `A ${money(price)} purchase would leave about ${money(
        spendable - price,
      )} in spendable wallets${budget ? ` and ${money(remaining - price)} in the matched budget` : ""}.`,
      note: `Safer move: ${diagnosis.saferMove}`,
      final: true,
    },
  ];
}

async function diagnose(flow, context) {
  const pkg = contextPackage(flow, context);
  const fallback = localDecision(pkg);
  let reply = "";

  if (hasGeminiConfig()) {
    try {
      reply = await generateClaraGeminiReply({
        message: `You are CLARA running a Buy Check. Use the real context below. Do not ask another question.\n\nRequired format:\nDecision: BUY | BUY WITH CAP | REDUCE | WAIT | PAUSE\nRisk: Low | Medium | High\nSafer move: one clear action\n\nContext:\n${JSON.stringify(
          pkg,
          null,
          2,
        )}`,
        context: pkg,
        mode: "buy_check_react_owned_diagnosis",
        conversationHistory: flow.messages.map((entry) => ({
          role: entry.role === "clara" ? "assistant" : entry.role,
          text: entry.text,
        })),
      });
    } catch (error) {
      console.warn("[CLARA Buy Check] Gemini diagnosis fallback used.", error);
    }
  }

  const result = parseDiagnosis(reply, fallback);
  return { ...result, contextPackage: pkg, cards: reportCards(pkg, result) };
}

function confirmationText(flow) {
  if (flow.planningStatus === "planned" && flow.budgetCoverage) {
    return `This appears covered by your ${flow.budgetCoverage.budgetTitle} budget. You’re considering ${flow.item} for ${money(
      flow.price,
    )}. The budget has ${money(flow.budgetCoverage.remaining)} available and would have ${money(
      flow.budgetCoverage.remainingAfter,
    )} left. Did I get that right before I run the full Buy Check?`;
  }

  return `You’re considering ${flow.item} for ${money(flow.price)} because ${
    flow.reason
  }. Did I get that right before I run the full Buy Check?`;
}

export default function useClaraBuyCheckFlowV2({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => initialState());

  const startSession = useCallback((sessionId = "") => {
    setState(initialState(sessionId || `buy-check-${Date.now()}`));
  }, []);

  const clearSession = useCallback(() => setState(initialState()), []);

  const submitAnswer = useCallback(
    (raw = "") => {
      const answer = clean(raw);
      if (!answer) return;

      setState((current) => {
        if (
          current.busy ||
          current.done ||
          current.step === "confirm" ||
          current.step === "diagnosis"
        ) {
          return current;
        }

        const user = message("user", answer);

        if (current.step === "item") {
          return {
            ...current,
            item: answer,
            step: "price",
            messages: [
              ...current.messages,
              user,
              message(
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
                user,
                message(
                  "clara",
                  "Please type the price clearly. Example: ₱3,500",
                ),
              ],
            };
          }

          const coverage = budgetCoverage(current.item, price, assistantContext);
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
              user,
              message("clara", confirmationText(next)),
            ];
            return next;
          }

          return {
            ...current,
            price,
            planningStatus: "unplanned",
            step: "reason",
            messages: [
              ...current.messages,
              user,
              message(
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
            user,
            message("clara", confirmationText(next)),
          ];
          return next;
        }

        return current;
      });
    },
    [assistantContext],
  );

  const editAnswers = useCallback(() => {
    setState((current) => {
      if (current.step !== "confirm" || current.busy) return current;
      return {
        ...initialState(current.sessionId),
        messages: [
          ...current.messages,
          message("user", "Edit answers"),
          message("clara", "No problem. What do you want to buy?"),
        ],
      };
    });
  }, []);

  const confirm = useCallback(async () => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return;

    const snapshot = state;
    const checking = message(
      "clara",
      "Got it. I’m checking your wallet, budget, goals, emergency fund, schedule, Me profile, and memory now.",
    );

    setState({
      ...snapshot,
      step: "diagnosis",
      busy: true,
      messages: [
        ...snapshot.messages,
        message("user", "Continue"),
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
      console.warn("[CLARA Buy Check] Diagnosis failed.", error);
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
    setState(initialState(`buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`));
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
