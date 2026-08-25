import { buildBudgetMetadata } from "./clara-buy-check-budget-engine.js";
import { isSavingsGoalActive } from "./savingsGoalLifecycle.js";

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const normalize = (value = "") => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const toNumber = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    return Math.max(0, toNumber(value));
  }
  return 0;
}

function matchingBudget(name, id, budgets, required = 0) {
  const direct = id ? budgets.find((budget) => budget.id === id && budget.preRemaining >= required) : null;
  if (direct) return { matched: true, confidence: "high", budgetId: direct.id, budgetTitle: direct.title, matchType: "direct_id" };
  const text = normalize(name);
  const match = budgets.find((budget) => {
    const budgetText = normalize(`${budget.title} ${budget.family}`);
    return budget.preRemaining >= required && (budgetText.includes(text) || text.includes(budgetText) || [...text.split(" ")].some((token) => token.length >= 4 && budgetText.includes(token)));
  });
  return match
    ? { matched: true, confidence: "medium", budgetId: match.id, budgetTitle: match.title, matchType: "normalized_title" }
    : { matched: false, confidence: "none", budgetId: "", budgetTitle: "", matchType: "none" };
}

function emergencyFundSnapshot(context = {}, budgets = []) {
  const fund = context.emergencyFund && typeof context.emergencyFund === "object" ? context.emergencyFund : null;
  if (!fund) return { configured: false, savedAmount: 0, targetAmount: 0, targetComplete: false, monthlyCommitment: 0, contributionCompletedThisCycle: false, contributionBudgeted: false, stillRequiredThisCycle: 0, wouldBeAffected: false, wouldRequireWithdrawal: false };
  const savedAmount = firstNumber(fund.saved, fund.current, fund.currentAmount, fund.current_amount, fund.amount, fund.saved_amount, fund.balance, fund.protectedAmount, fund.protected_amount);
  const targetAmount = firstNumber(fund.target, fund.targetAmount, fund.target_amount, fund.goal, fund.goalAmount, fund.goal_amount);
  const monthlyCommitment = firstNumber(fund.monthlyCommitment, fund.monthly_commitment, fund.monthlyContribution, fund.monthly_contribution, fund.commitmentAmount, fund.commitment_amount);
  const contributed = firstNumber(fund.contributedThisMonth, fund.contributed_this_month, fund.currentCycleContribution, fund.current_cycle_contribution, fund.monthlyProgress, fund.monthly_progress);
  const targetComplete = targetAmount > 0 && savedAmount >= targetAmount;
  const stillRequiredThisCycle = targetComplete ? 0 : Math.max(0, monthlyCommitment - contributed);
  const budget = matchingBudget("Emergency Fund", clean(fund.budgetId || fund.budget_id), budgets, stillRequiredThisCycle);
  return {
    configured: true,
    savedAmount,
    targetAmount,
    targetComplete,
    monthlyCommitment,
    contributedThisCycle: contributed,
    contributionCompletedThisCycle: targetComplete || monthlyCommitment === 0 || contributed >= monthlyCommitment,
    contributionBudgeted: budget.matched,
    budgetProtection: budget,
    stillRequiredThisCycle,
    wouldBeAffected: false,
    wouldRequireWithdrawal: false,
  };
}

function savingsGoalSnapshot(goal = {}, budgets = [], index = 0) {
  const name = clean(goal.name || goal.title || goal.label || `Savings goal ${index + 1}`);
  const savedAmount = firstNumber(goal.saved, goal.current, goal.currentAmount, goal.current_amount, goal.saved_amount, goal.balance, goal.amount);
  const targetAmount = firstNumber(goal.target, goal.targetAmount, goal.target_amount, goal.goal_amount, goal.goalAmount, goal.required_amount);
  const monthlyCommitment = firstNumber(goal.monthlyCommitment, goal.monthly_commitment, goal.monthlyContribution, goal.monthly_contribution, goal.commitmentAmount, goal.commitment_amount);
  const contributed = firstNumber(goal.contributedThisMonth, goal.contributed_this_month, goal.currentCycleContribution, goal.current_cycle_contribution, goal.monthlyProgress, goal.monthly_progress);
  const targetComplete = targetAmount > 0 && savedAmount >= targetAmount;
  const stillRequiredThisCycle = targetComplete ? 0 : Math.max(0, monthlyCommitment - contributed);
  const budget = matchingBudget(name, clean(goal.budgetId || goal.budget_id), budgets, stillRequiredThisCycle);
  return {
    id: clean(goal.id || `goal:${index}:${name}`),
    name,
    savedAmount,
    targetAmount,
    targetDate: clean(goal.targetDate || goal.target_date || goal.deadline),
    priority: clean(goal.priority || goal.priorityLevel || goal.priority_level || "normal").toLowerCase(),
    targetComplete,
    monthlyCommitment,
    contributedThisCycle: contributed,
    contributionCompletedThisCycle: targetComplete || monthlyCommitment === 0 || contributed >= monthlyCommitment,
    contributionBudgeted: budget.matched,
    budgetProtection: budget,
    stillRequiredThisCycle,
  };
}

function analyzeGoalProtection(context = {}, options = {}) {
  const budgets = buildBudgetMetadata(Array.isArray(context.budgets) ? context.budgets : [], "other", options.now ? new Date(options.now) : new Date());
  const emergencyFund = emergencyFundSnapshot(context, budgets);
  const records = (Array.isArray(context.savingsGoals) ? context.savingsGoals : [])
    .filter(isSavingsGoalActive)
    .map((goal, index) => savingsGoalSnapshot(goal, budgets, index));
  const protectedCommitmentThisCycle = records.reduce((sum, goal) => sum + goal.stillRequiredThisCycle, 0);
  const contributionAlreadyBudgeted = records.filter((goal) => goal.contributionBudgeted).reduce((sum, goal) => sum + goal.stillRequiredThisCycle, 0);
  const stillRequiredThisCycle = protectedCommitmentThisCycle;
  const highestPriorityGoal = [...records].filter((goal) => !goal.targetComplete).sort((left, right) => {
    const rank = { critical: 4, high: 3, normal: 2, low: 1 };
    return (rank[right.priority] || 2) - (rank[left.priority] || 2) || right.stillRequiredThisCycle - left.stillRequiredThisCycle;
  })[0] || null;
  const safeAfterPurchase = Number(options.safeAfterPurchase);
  const affected = Number.isFinite(safeAfterPurchase) && safeAfterPurchase < 0;
  emergencyFund.wouldBeAffected = affected && emergencyFund.stillRequiredThisCycle > 0;
  return {
    emergencyFund,
    savingsGoals: {
      records,
      activeCount: records.filter((goal) => !goal.targetComplete).length,
      protectedCommitmentThisCycle,
      contributionAlreadyBudgeted,
      stillRequiredThisCycle,
      highestPriorityGoal,
      delayedGoals: affected ? records.filter((goal) => goal.stillRequiredThisCycle > 0) : [],
      wouldRequireWithdrawal: false,
      wouldBeAffected: affected && stillRequiredThisCycle > 0,
    },
  };
}

export { analyzeGoalProtection, emergencyFundSnapshot, savingsGoalSnapshot };
