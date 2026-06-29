import {
  buildContextPackage,
  clean,
  money,
  safeList,
  safeRecord,
  toNumber,
} from "@/lib/clara-buy-check-budget-intelligence";
import {
  generateClaraGeminiReply,
  hasGeminiConfig,
} from "@/lib/clara-gemini-client";

function localDecision(pkg) {
  const price = toNumber(pkg.purchase.price);
  const spendable = toNumber(pkg.finance.spendableTotal);
  const budget = pkg.finance.matchingBudget;
  const assessment = pkg.finance.budgetAssessment;
  const remaining = toNumber(budget?.remaining);

  if (!spendable || price > spendable || assessment.status === "wallet_shortfall") {
    return {
      decision: "WAIT",
      risk: "High",
      saferMove: `Your spendable wallets are short by ${money(Math.max(0, price - spendable))}. Do not use protected money to complete this purchase.`,
    };
  }

  if (assessment.status === "partial" || assessment.status === "exhausted") {
    return {
      decision: "WAIT",
      risk: "High",
      saferMove: budget?.remaining > 0
        ? `Keep the purchase at or below ${money(budget.remaining)}, or wait until the budget is replenished.`
        : "Wait until a valid budget has money available again.",
    };
  }

  if (assessment.status === "no_match") {
    return {
      decision: "PAUSE",
      risk: price > spendable * 0.25 ? "High" : "Medium",
      saferMove: "Create or assign a budget for this purchase before spending.",
    };
  }

  const utilization = remaining > 0 ? price / remaining : 1;
  const risk = utilization >= 0.75 || price > spendable * 0.25 ? "Medium" : "Low";
  return {
    decision: risk === "Medium" ? "BUY WITH CAP" : "BUY",
    risk,
    saferMove:
      risk === "Medium"
        ? `The purchase is covered, but it uses a large part of the ${budget.title} budget. Do not exceed ${money(price)}.`
        : `This is covered by the ${budget.title} budget. Log it immediately so the remaining amount stays accurate.`,
  };
}

function parseDiagnosis(reply = "", fallback) {
  const decision = String(reply).match(/Decision:\s*(BUY WITH CAP|BUY|REDUCE|WAIT|PAUSE)/i)?.[1];
  const risk = String(reply).match(/Risk:\s*(Low|Medium|High)/i)?.[1];
  const saferMove = String(reply).match(/Safer move:\s*([^\n]+)/i)?.[1];
  return {
    decision: clean(decision || fallback.decision).toUpperCase(),
    risk: clean(risk || fallback.risk),
    saferMove: clean(saferMove || fallback.saferMove),
  };
}

function enforceBudgetGuard(result, fallback, pkg) {
  const status = pkg.finance.budgetAssessment?.status;
  const unsafeApproval = ["BUY", "BUY WITH CAP"].includes(result.decision) && status !== "full";
  return unsafeApproval ? fallback : result;
}

function savedValue(value) {
  const record = safeRecord(value);
  return toNumber(
    record.savedAmount ?? record.saved_amount ?? record.current_amount ?? record.saved ?? record.amount ?? record.balance ?? 0,
  );
}

function targetValue(value) {
  const record = safeRecord(value);
  return toNumber(record.targetAmount ?? record.target_amount ?? record.goal_amount ?? record.target ?? 0);
}

export function buildBuyCheckBudgetCardCopy(pkg) {
  const price = toNumber(pkg.purchase.price);
  const budget = pkg.finance.matchingBudget;
  const assessment = pkg.finance.budgetAssessment || {};

  if (assessment.status === "full" && budget) {
    return {
      title: `${budget.title} budget`,
      stat: money(budget.remaining),
      body: `This purchase is covered. You have ${money(budget.remaining)} available in this ${budget.flexible ? "flexible " : ""}budget, and ${money(budget.remainingAfter)} will remain after buying.`,
      note: budget.flexible
        ? `CLARA checked the specific category first, then used this flexible budget as the safe match.`
        : "CLARA matched the purchase directly to this budget and used its active tracking period.",
    };
  }

  if (assessment.status === "wallet_shortfall" && budget) {
    return {
      title: `${budget.title} budget`,
      stat: money(budget.remaining),
      body: `The budget can cover ${money(price)}, but your spendable wallets are short by ${money(assessment.walletShortfall)}.`,
      note: "The budget is available, but the actual wallet balance cannot safely carry the purchase.",
    };
  }

  if ((assessment.status === "partial" || assessment.status === "exhausted") && budget) {
    return {
      title: `${budget.title} budget`,
      stat: money(budget.remaining),
      body: budget.remaining > 0
        ? `Only ${money(budget.remaining)} remains, so this ${money(price)} purchase is ${money(assessment.shortfall)} over budget.`
        : `This budget is already fully used, so the entire ${money(price)} purchase is outside the current plan.`,
      note: assessment.flexibleBudgetCount > 0
        ? "CLARA also checked available flexible budgets, but none could fully cover the purchase."
        : "No other matched budget could fully cover the purchase.",
    };
  }

  return {
    title: "Budget check",
    stat: "No safe match",
    body: `CLARA checked ${assessment.scannedBudgetCount || 0} active budget${assessment.scannedBudgetCount === 1 ? "" : "s"}, including flexible names, but found no budget that safely covers this purchase.`,
    note: "Create or assign a budget before spending so this decision can be measured properly.",
  };
}

function buildReportCards(pkg, diagnosis) {
  const price = toNumber(pkg.purchase.price);
  const spendable = toNumber(pkg.finance.spendableTotal);
  const budget = pkg.finance.matchingBudget;
  const budgetCard = buildBuyCheckBudgetCardCopy(pkg);
  const goal = pkg.finance.savingsGoals?.[0] || null;
  const emergency = pkg.finance.emergencyFund;
  const event = pkg.schedule?.[0];
  const eventText = event
    ? clean(`${event.title || event.name || event.type || "Upcoming event"} ${event.date || ""} ${event.time || ""}`)
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
      ...budgetCard,
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
      body: `A ${money(price)} purchase would leave about ${money(spendable - price)} in spendable wallets${budget ? ` and ${money(Math.max(0, budget.remaining - price))} in the matched budget` : ""}.`,
      note: `Safer move: ${diagnosis.saferMove}`,
      final: true,
    },
  ];
}

export async function diagnoseBuyCheck(flow, context) {
  const pkg = buildContextPackage(flow, context);
  const fallback = localDecision(pkg);
  let reply = "";

  if (hasGeminiConfig()) {
    try {
      reply = await generateClaraGeminiReply({
        message: `You are CLARA running a Buy Check. Use the real context below. Do not ask another question.\n\nBudget rules:\n- The budget assessment already scanned every active budget.\n- It tried the specific category first and then flexible budgets such as Random Expenses, Excess Expenses, Miscellaneous, Other, or Spending Allowance.\n- Never approve a purchase when budgetAssessment.status is partial, exhausted, wallet_shortfall, or no_match.\n- When status is full, clearly mention the matched budget and the amount left after purchase.\n\nRequired format:\nDecision: BUY | BUY WITH CAP | REDUCE | WAIT | PAUSE\nRisk: Low | Medium | High\nSafer move: one clear action\n\nContext:\n${JSON.stringify(pkg, null, 2)}`,
        context: pkg,
        mode: "buy_check_budget_intelligence_v5",
        conversationHistory: safeList(flow.messages).map((entry) => ({
          role: entry.role === "clara" ? "assistant" : entry.role,
          text: clean(entry.text),
        })),
      });
    } catch (error) {
      console.warn("[CLARA Buy Check] Gemini diagnosis fallback used.", error);
    }
  }

  const parsed = parseDiagnosis(reply, fallback);
  const result = enforceBudgetGuard(parsed, fallback, pkg);
  return { ...result, contextPackage: pkg, cards: buildReportCards(pkg, result) };
}
