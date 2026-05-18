export const MEMORY_KEY = "clara_behavioral_memory_v1";

export const DRAWERS = [
  { id: "core", level: 1, title: "Core Identity", subtitle: "Life situation, pressure, responsibilities, and goals.", fields: [["Income pattern", "incomePattern"], ["Living situation", "livingSituation"], ["Responsibilities", "responsibilities"], ["Work type", "workType"], ["Relationship status", "relationshipStatus"], ["Dependents", "dependents"], ["Current financial pressure", "currentFinancialPressure"], ["Survival pressure level", "survivalPressureLevel"], ["Main financial goal", "mainFinancialGoal"], ["Current emotional state trend", "emotionalStateTrend"]] },
  { id: "behavior", level: 2, title: "Behavioral Spending Profile", subtitle: "Emotional habits, fears, and pressure triggers.", fields: [["Emotional triggers", "emotionalTriggers"], ["Stress spending habits", "stressSpendingHabits"], ["Reward system", "rewardSystem"], ["Common impulsive purchases", "commonImpulsivePurchases"], ["Biggest spending weakness", "biggestSpendingWeakness"], ["Coping mechanisms", "copingMechanisms"], ["Motivation style", "motivationStyle"], ["Financial fear", "financialFear"], ["Guilt patterns", "guiltPatterns"], ["Social pressure triggers", "socialPressureTriggers"]] },
  { id: "life", level: 3, title: "Life Pattern Intelligence", subtitle: "Routine, sleep, energy, environment, and burnout signals.", fields: [["Schedule and routine", "scheduleRoutine"], ["Sleep pattern", "sleepPattern"], ["Work exhaustion", "workExhaustion"], ["Social environment", "socialEnvironment"], ["Relationship conflicts", "relationshipConflicts"], ["Hobby patterns", "hobbyPatterns"], ["Energy level trends", "energyLevelTrends"], ["Burnout indicators", "burnoutIndicators"]] },
  { id: "money", level: 4, title: "Financial Infrastructure", subtitle: "Wallets, budgets, goals, obligations, and payday rhythm.", fields: [["Wallets", "wallets"], ["Budgets", "budgets"], ["Emergency fund", "emergencyFund"], ["Savings goals", "savingsGoals"], ["Recurring expenses", "recurringExpenses"], ["Debt", "debt"], ["Subscriptions", "subscriptions"], ["Transfers", "transfers"], ["Payday cycle", "paydayCycle"]] },
];

export const DRAWER_TONE = {
  core: "grounded life context",
  behavior: "behavioral and emotional spending context",
  life: "routine, energy, and burnout context",
  money: "practical money system context",
};

export const FIELD_SUGGESTIONS = {
  incomePattern: "stable monthly, every cutoff, project-based, or changing",
  livingSituation: "alone, with family, renting, shared place, or with partner",
  responsibilities: "family, rent/bills, food, debt, or self only",
  workType: "BPO/call center, office work, freelance, student, or business",
  relationshipStatus: "single, in a relationship, complicated, healing, or family conflict",
  dependents: "no dependents, parents, child/kids, sibling, partner, or someone else",
  currentFinancialPressure: "rent, food, debt, monthly bills, or low savings",
  survivalPressureLevel: "light, manageable, tight, really heavy, or changing",
  mainFinancialGoal: "emergency fund, save more, pay debt, control spending, or increase income",
  emotionalStateTrend: "confident, stressed, tempted, unclear, or slightly leaking",
};

export function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}
