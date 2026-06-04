import {
  LOCAL_FINANCE_STORES,
  runLocalFinanceTransaction,
  upsertLocalRecord,
} from "./localFinanceStore";
import { saveClaraLifeProfile } from "./clara-life-profile";

export const CLARA_LIFE_STAGE_DEMO_LOCAL_USER_ID = "clara-demo-user";

const SOURCE = "clara_life_stage_demo_seed";
const PREFIX = "clara_life_stage_demo";
const ACTIVE_KEY = "CLARA_LIFE_STAGE_SAMPLE_ACTIVE_V1";
const SAMPLE_FAMILY = "life_stage_sample";

const SAMPLE_STORES = [
  LOCAL_FINANCE_STORES.wallets,
  LOCAL_FINANCE_STORES.walletTransactions,
  LOCAL_FINANCE_STORES.expenses,
  LOCAL_FINANCE_STORES.budgets,
  LOCAL_FINANCE_STORES.savingsGoals,
  LOCAL_FINANCE_STORES.emergencyFund,
  LOCAL_FINANCE_STORES.aiFinancialMemory,
  LOCAL_FINANCE_STORES.lifeProfile,
];

const nowIso = () => new Date().toISOString();

const dateOnly = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

const currentMonthKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthDate = (day) => {
  const date = new Date();
  date.setDate(Math.max(1, Math.min(day, 28)));
  return dateOnly(date);
};

const monthStart = () => {
  const date = new Date();
  date.setDate(1);
  return dateOnly(date);
};

const monthEnd = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 0);
  return dateOnly(date);
};

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateOnly(date);
};

const at = (date) => `${date}T12:00:00.000Z`;

const id = (stageKey, type, key) => `${PREFIX}_${stageKey}_${type}_${key}`;

const toMoney = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatPeso = (amount) =>
  `₱${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(toMoney(amount))}`;

function sampleBase(stageKey, recordId, createdAt = nowIso()) {
  return {
    id: recordId,
    createdAt,
    created_at: createdAt,
    updatedAt: nowIso(),
    updated_at: nowIso(),
    deletedAt: null,
    deleted_at: null,
    syncStatus: "local_only",
    source: SOURCE,
    demoSeed: true,
    sampleFamily: SAMPLE_FAMILY,
    lifeStageKey: stageKey,
  };
}

function wallet(stageKey, config, order) {
  const recordId = id(stageKey, "wallet", config.key);
  const balance = toMoney(config.balance);

  return {
    ...sampleBase(stageKey, recordId, at(monthDate(order + 1))),
    name: config.name,
    title: config.name,
    label: config.name,
    type: config.type || "wallet",
    wallet_type: config.type || "wallet",
    balance,
    current_balance: balance,
    wallet_balance: balance,
    available_balance: balance,
    starting_balance: balance,
    sort_order: order,
  };
}

function budgetHeader(stageKey, sample) {
  const month = currentMonthKey();
  const amount = toMoney(sample.monthlyIncome);

  return {
    ...sampleBase(stageKey, id(stageKey, "budget", "monthly_header"), at(monthStart())),
    is_plan_header: true,
    plan_type: "monthly_budget",
    type: "monthly_budget",
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    title: `${sample.title} Monthly Plan`,
    name: `${sample.title} Monthly Plan`,
    status: "active",
    is_active: true,
    is_complete: true,
    complete: true,
    plan_is_complete: true,
    declared_amount: amount,
    declared_budget: amount,
    monthly_budget_amount: amount,
    total_declared_budget: amount,
    amount,
    month,
    budget_month: month,
    month_key: month,
    budget_cycle: "monthly",
    cycle_type: "monthly",
    period_type: "monthly",
    cycle_start: monthStart(),
    cycle_end: monthEnd(),
    period_start: monthStart(),
    period_end: monthEnd(),
  };
}

function budget(stageKey, config, order) {
  const month = currentMonthKey();
  const amount = toMoney(config.amount);
  const title = config.title;

  return {
    ...sampleBase(stageKey, id(stageKey, "budget", config.key), at(monthStart())),
    title,
    name: title,
    category: title,
    budget_category: title,
    section_key: config.key,
    status: "active",
    is_active: true,
    amount,
    allocated_amount: amount,
    budget_amount: amount,
    total_budget: amount,
    budget: amount,
    need_type: config.needType || "need",
    month,
    budget_month: month,
    month_key: month,
    sort_order: order,
  };
}

function expense(stageKey, walletIds, config, order) {
  const date = config.date || monthDate(order + 3);
  const walletId = walletIds[config.wallet] || walletIds.primary || Object.values(walletIds)[0];
  const status = config.status || "planned";
  const amount = toMoney(config.amount);

  return {
    ...sampleBase(stageKey, id(stageKey, "expense", config.key), at(date)),
    wallet_id: walletId,
    walletId,
    amount,
    category: config.category,
    budget_category: config.category,
    expense_category: config.category,
    title: config.title,
    name: config.title,
    merchant: config.title,
    date: at(date),
    transaction_date: date,
    created_at: at(date),
    planning_status: status,
    budget_status: status,
    need_type: config.needType || "need",
    unplanned_reason: status === "unplanned" ? config.notes || "Sample unplanned spending pattern" : "",
    notes: config.notes || "Sample transaction",
  };
}

function walletTransactionFromExpense(stageKey, row) {
  return {
    ...sampleBase(stageKey, id(stageKey, "wallet_txn", `for_${row.id}`), row.created_at),
    wallet_id: row.wallet_id,
    walletId: row.wallet_id,
    amount: row.amount,
    type: "expense",
    category: row.category,
    need_type: row.need_type,
    planning_status: row.planning_status,
    unplanned_reason: row.unplanned_reason || "",
    expense_id: row.id,
    title: row.title,
    notes: row.notes,
    created_at: row.created_at,
  };
}

function income(stageKey, walletIds, config, order) {
  const date = config.date || monthDate(order + 1);
  const walletId = walletIds[config.wallet] || walletIds.primary || Object.values(walletIds)[0];
  const amount = toMoney(config.amount);

  return {
    ...sampleBase(stageKey, id(stageKey, "wallet_txn", config.key), at(date)),
    wallet_id: walletId,
    walletId,
    amount,
    type: "income",
    category: "Income",
    source_type: config.sourceType || "income",
    sourceType: config.sourceType || "income",
    title: config.title,
    notes: config.title,
    created_at: at(date),
    date: at(date),
  };
}

function savingsGoal(stageKey, config, order) {
  const saved = toMoney(config.saved);
  const target = toMoney(config.target);

  return {
    ...sampleBase(stageKey, id(stageKey, "savings_goal", config.key), at(monthDate(order + 2))),
    name: config.title,
    title: config.title,
    saved_amount: saved,
    savedAmount: saved,
    saved,
    current_amount: saved,
    target_amount: target,
    targetAmount: target,
    target,
    goal_amount: target,
    target_date: addDays(order * 90 + 120),
    status: "active",
    sort_order: order,
  };
}

function emergencyFund(stageKey, sample, walletIds) {
  const config = sample.emergencyFund || {};
  const linkedWalletKey = config.wallet || "emergency";
  const walletId = walletIds[linkedWalletKey] || walletIds.emergency || walletIds.savings || walletIds.primary;
  const saved = toMoney(config.saved);
  const target = toMoney(config.target);

  return {
    ...sampleBase(stageKey, `emergency_fund:${stageKey}:life_stage_sample`, at(monthDate(1))),
    target_amount: target,
    targetAmount: target,
    saved_amount: saved,
    savedAmount: saved,
    saved,
    current_amount: saved,
    amount: saved,
    monthly_target: toMoney(config.monthlyTarget),
    monthly_survival_expense: toMoney(config.monthlySurvivalExpense),
    monthsCovered: toMoney(config.monthsCovered),
    linkedWalletId: walletId,
    linked_wallet_id: walletId,
    linkedWalletName: config.walletName || "Emergency Wallet",
    linked_wallet_name: config.walletName || "Emergency Wallet",
    status: "active",
  };
}

function memory(stageKey, key, category, summary, spendingImpact, supportStyle) {
  return {
    ...sampleBase(stageKey, id(stageKey, "memory", key), at(monthDate(2))),
    recordKind: "ai_financial_memory",
    category,
    summary,
    spendingImpact,
    supportStyle,
    status: "active",
    userApproved: true,
  };
}

function buildProfile(stageKey, sample) {
  const timestamp = nowIso();
  const memoryNotes = [
    {
      id: `${stageKey}-stage-pressure`,
      category: "Life Stage",
      summary: sample.profile.currentLifeSeason,
      spendingImpact: sample.profile.financialFear,
      supportStyle: sample.profile.coachingStyle,
      status: "active",
      userApproved: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: `${stageKey}-spending-trigger`,
      category: "Spending Trigger",
      summary: sample.profile.spendingTrigger,
      spendingImpact: sample.profile.nonNegotiable,
      supportStyle: "Use the life stage context before approving wants.",
      status: "active",
      userApproved: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];

  return {
    ...sample.profile,
    id: "clara-life-identity-profile",
    source: SOURCE,
    demoSeed: true,
    sampleFamily: SAMPLE_FAMILY,
    lifeStageKey: stageKey,
    memoryNotes,
    personalityQuizAnswers: {
      lifeStage: sample.title,
      incomePattern: sample.incomePattern,
      responsibility: sample.profile.responsibility,
      mainFinancialGoal: sample.profile.currentFocus,
      motivationStyle: sample.profile.coachingStyle,
    },
  };
}

const LIFE_STAGE_SAMPLES = {
  young_professional: {
    title: "Young Professional",
    summary: "First stable income, independence pressure, lifestyle temptation, and early savings discipline.",
    monthlyIncome: 32000,
    incomePattern: "Two payroll cutoffs",
    wallets: [
      { key: "primary", name: "Payroll Wallet", balance: 13500, type: "bank" },
      { key: "daily", name: "Daily Spending Wallet", balance: 2600, type: "cash" },
      { key: "savings", name: "Savings Wallet", balance: 12000, type: "savings" },
      { key: "emergency", name: "Emergency Reserve Wallet", balance: 7000, type: "emergency" },
    ],
    incomes: [
      { key: "salary_1", wallet: "primary", amount: 16000, title: "Salary - first cutoff", sourceType: "salary", date: monthDate(10) },
      { key: "salary_2", wallet: "primary", amount: 16000, title: "Salary - second cutoff", sourceType: "salary", date: monthDate(25) },
    ],
    budgets: [
      { key: "food", title: "Food", amount: 8000 },
      { key: "transportation", title: "Transportation", amount: 3500 },
      { key: "rent_family", title: "Rent / Family Contribution", amount: 6000 },
      { key: "bills", title: "Bills", amount: 4000 },
      { key: "savings", title: "Savings", amount: 5000 },
      { key: "lifestyle", title: "Lifestyle", amount: 2500, needType: "want" },
      { key: "health", title: "Health", amount: 1500 },
      { key: "buffer", title: "Buffer", amount: 1500 },
    ],
    expenses: [
      { key: "rent", wallet: "primary", amount: 6000, category: "Rent / Family Contribution", title: "Monthly home contribution", date: monthDate(3) },
      { key: "food_delivery", wallet: "daily", amount: 420, category: "Food", title: "Food delivery after work", status: "unplanned", needType: "want", notes: "Tired after shift" },
      { key: "coffee", wallet: "daily", amount: 180, category: "Food", title: "Coffee run", status: "unplanned", needType: "want", notes: "Small repeat spending" },
      { key: "internet", wallet: "primary", amount: 1699, category: "Bills", title: "Internet bill" },
      { key: "mrt", wallet: "daily", amount: 120, category: "Transportation", title: "MRT and jeepney" },
      { key: "shopee", wallet: "daily", amount: 799, category: "Lifestyle", title: "Shopee checkout", status: "unplanned", needType: "want", notes: "Payday reward" },
      { key: "savings_transfer", wallet: "savings", amount: 2500, category: "Savings", title: "Savings transfer" },
      { key: "medicine", wallet: "primary", amount: 380, category: "Health", title: "Medicine" },
    ],
    goals: [
      { key: "laptop", title: "Laptop Upgrade", saved: 12500, target: 45000 },
      { key: "travel", title: "Local Travel Fund", saved: 6000, target: 25000 },
    ],
    emergencyFund: { wallet: "emergency", walletName: "Emergency Reserve Wallet", saved: 7000, target: 50000, monthlyTarget: 3000, monthlySurvivalExpense: 18000, monthsCovered: 0.4 },
    profile: {
      personality: "Independent but still building discipline",
      status: "Young Professional",
      age: "23-30",
      dependents: "Mostly self, occasional family support",
      responsibility: "Rent/contribution, food, transport, bills, savings",
      incomeRhythm: "Two payroll cutoffs",
      coachingStyle: "Direct but encouraging",
      currentFocus: "Build savings and avoid payday lifestyle creep",
      topValues: "Independence, growth, stability",
      meaningfulGoal: "Enjoy life without losing financial control",
      financialFear: "Running out before the next cutoff because of small wants",
      spendingTrigger: "Payday confidence, fatigue, food delivery, online shopping",
      nonNegotiable: "Emergency money and savings should not be used for lifestyle wants",
      identityStatement: "I am learning to enjoy income responsibly.",
      currentLifeSeason: "First stable income with growing independence and lifestyle pressure.",
      emotionalState: "Motivated, proud, but tempted after payday",
      replacementActivity: "Delay checkout, eat prepared food, or use a small planned reward.",
    },
  },

  working_student: {
    title: "Working Student",
    summary: "Limited time, school costs, part-time income, allowance pressure, and burnout risk.",
    monthlyIncome: 17000,
    incomePattern: "Part-time pay plus allowance",
    wallets: [
      { key: "primary", name: "Part-time Pay Wallet", balance: 5200, type: "bank" },
      { key: "daily", name: "Campus Cash / GCash", balance: 1400, type: "cash" },
      { key: "savings", name: "School Buffer Wallet", balance: 3200, type: "savings" },
      { key: "emergency", name: "Emergency Pocket", balance: 1800, type: "emergency" },
    ],
    incomes: [
      { key: "part_time_1", wallet: "primary", amount: 6000, title: "Part-time pay", sourceType: "part_time", date: monthDate(8) },
      { key: "part_time_2", wallet: "primary", amount: 6000, title: "Part-time pay", sourceType: "part_time", date: monthDate(23) },
      { key: "allowance", wallet: "daily", amount: 5000, title: "Family allowance", sourceType: "allowance", date: monthDate(1) },
    ],
    budgets: [
      { key: "school", title: "Tuition / School", amount: 4500 },
      { key: "food", title: "Food", amount: 3500 },
      { key: "transportation", title: "Transportation", amount: 2500 },
      { key: "data", title: "Mobile / Data", amount: 1000 },
      { key: "home", title: "Family / Home", amount: 2000 },
      { key: "savings", title: "Savings", amount: 1500 },
      { key: "projects", title: "School Projects", amount: 1500 },
      { key: "buffer", title: "Buffer", amount: 500 },
    ],
    expenses: [
      { key: "school_materials", wallet: "primary", amount: 1250, category: "School Projects", title: "Printed modules and supplies" },
      { key: "tuition", wallet: "primary", amount: 3500, category: "Tuition / School", title: "Tuition installment" },
      { key: "campus_food", wallet: "daily", amount: 180, category: "Food", title: "Campus meal" },
      { key: "jeep", wallet: "daily", amount: 90, category: "Transportation", title: "Jeepney fare" },
      { key: "data_load", wallet: "daily", amount: 299, category: "Mobile / Data", title: "Mobile data promo" },
      { key: "milktea", wallet: "daily", amount: 150, category: "Food", title: "Milk tea after exam", status: "unplanned", needType: "want", notes: "Reward spending during stress" },
      { key: "home_share", wallet: "primary", amount: 1200, category: "Family / Home", title: "Home contribution" },
      { key: "reviewer", wallet: "primary", amount: 500, category: "School Projects", title: "Reviewer fee" },
    ],
    goals: [
      { key: "graduation", title: "Graduation Fund", saved: 3000, target: 18000 },
      { key: "laptop_repair", title: "Laptop Repair", saved: 1200, target: 8000 },
    ],
    emergencyFund: { wallet: "emergency", walletName: "Emergency Pocket", saved: 1800, target: 15000, monthlyTarget: 1000, monthlySurvivalExpense: 9000, monthsCovered: 0.2 },
    profile: {
      personality: "Time-pressured learner",
      status: "Working Student",
      age: "18-25",
      dependents: "Mostly self, with family/home contribution",
      responsibility: "School costs, food, transport, data, and home support",
      incomeRhythm: "Part-time pay plus family allowance",
      coachingStyle: "Gentle, realistic, and energy-aware",
      currentFocus: "Stay enrolled, avoid burnout, and protect school money",
      topValues: "Education, endurance, family, future stability",
      meaningfulGoal: "Finish school while staying financially functional",
      financialFear: "Missing school payments or running out during exam weeks",
      spendingTrigger: "Stress rewards, convenience meals, lack of sleep, project deadlines",
      nonNegotiable: "Tuition, school projects, transport, and data must be protected first",
      identityStatement: "I am building my future while carrying today’s responsibilities.",
      currentLifeSeason: "Balancing classes, work shifts, limited money, and low energy.",
      emotionalState: "Determined but often tired",
      replacementActivity: "Choose packed food, schedule project costs, and protect rest.",
    },
  },

  living_with_partner: {
    title: "Living With Partner",
    summary: "Shared bills, emotional pressure, unclear boundaries, and future planning together.",
    monthlyIncome: 52000,
    incomePattern: "Two incomes with shared expenses",
    wallets: [
      { key: "primary", name: "Shared Bills Wallet", balance: 18500, type: "bank" },
      { key: "daily", name: "Personal Spending Wallet", balance: 4200, type: "cash" },
      { key: "savings", name: "Shared Goals Wallet", balance: 18000, type: "savings" },
      { key: "emergency", name: "Couple Emergency Wallet", balance: 12000, type: "emergency" },
    ],
    incomes: [
      { key: "user_salary", wallet: "primary", amount: 26000, title: "User salary share", sourceType: "salary", date: monthDate(10) },
      { key: "partner_share", wallet: "primary", amount: 26000, title: "Partner share", sourceType: "partner_share", date: monthDate(15) },
    ],
    budgets: [
      { key: "rent", title: "Rent", amount: 14000 },
      { key: "groceries", title: "Groceries", amount: 9000 },
      { key: "utilities", title: "Utilities", amount: 5500 },
      { key: "transportation", title: "Transportation", amount: 5000 },
      { key: "shared_savings", title: "Shared Savings", amount: 7000 },
      { key: "family_support", title: "Family Support", amount: 3000 },
      { key: "date_leisure", title: "Date / Leisure", amount: 3500, needType: "want" },
      { key: "buffer", title: "Buffer", amount: 5000 },
    ],
    expenses: [
      { key: "rent", wallet: "primary", amount: 14000, category: "Rent", title: "Apartment rent" },
      { key: "groceries", wallet: "primary", amount: 3400, category: "Groceries", title: "Grocery run" },
      { key: "electricity", wallet: "primary", amount: 2800, category: "Utilities", title: "Electricity bill" },
      { key: "water", wallet: "primary", amount: 550, category: "Utilities", title: "Water bill" },
      { key: "date_night", wallet: "daily", amount: 1200, category: "Date / Leisure", title: "Date night", status: "unplanned", needType: "want", notes: "Spending to keep peace after a stressful week" },
      { key: "partner_gift", wallet: "daily", amount: 900, category: "Date / Leisure", title: "Small gift", status: "unplanned", needType: "want", notes: "Emotional spending" },
      { key: "shared_savings", wallet: "savings", amount: 3500, category: "Shared Savings", title: "Shared savings transfer" },
      { key: "family_help", wallet: "primary", amount: 1500, category: "Family Support", title: "Family support" },
    ],
    goals: [
      { key: "move_in_buffer", title: "Home Upgrade Fund", saved: 16000, target: 65000 },
      { key: "wedding_future", title: "Future Planning Fund", saved: 9000, target: 100000 },
    ],
    emergencyFund: { wallet: "emergency", walletName: "Couple Emergency Wallet", saved: 12000, target: 80000, monthlyTarget: 4500, monthlySurvivalExpense: 30000, monthsCovered: 0.4 },
    profile: {
      personality: "Shared-life planner",
      status: "Living With Partner",
      age: "24-35",
      dependents: "Self and partner household",
      responsibility: "Shared rent, bills, groceries, boundaries, and future goals",
      incomeRhythm: "Two incomes with shared expense timing",
      coachingStyle: "Balanced, respectful, and boundary-aware",
      currentFocus: "Clarify shared money rules and protect future plans",
      topValues: "Partnership, peace, fairness, security",
      meaningfulGoal: "Build a stable home without money resentment",
      financialFear: "Unclear boundaries causing conflict or hidden overspending",
      spendingTrigger: "Avoiding conflict, guilt, date pressure, family involvement",
      nonNegotiable: "Rent, utilities, groceries, emergency, and agreed savings first",
      identityStatement: "We can build love and stability with clear money boundaries.",
      currentLifeSeason: "Sharing life expenses while still learning financial boundaries together.",
      emotionalState: "Hopeful but sensitive to money conversations",
      replacementActivity: "Discuss the purchase, check shared priorities, and choose a lower-cost compromise.",
    },
  },

  family_household: {
    title: "Family Household",
    summary: "Multiple dependents, grocery pressure, school costs, health needs, and long-term security.",
    monthlyIncome: 60000,
    incomePattern: "Main salary plus side income",
    wallets: [
      { key: "primary", name: "Household Wallet", balance: 22500, type: "bank" },
      { key: "daily", name: "Family Cash Wallet", balance: 5200, type: "cash" },
      { key: "savings", name: "Family Savings Wallet", balance: 26000, type: "savings" },
      { key: "emergency", name: "Family Emergency Wallet", balance: 18000, type: "emergency" },
    ],
    incomes: [
      { key: "main_salary", wallet: "primary", amount: 45000, title: "Main salary", sourceType: "salary", date: monthDate(10) },
      { key: "side_income", wallet: "primary", amount: 15000, title: "Side income", sourceType: "side_income", date: monthDate(20) },
    ],
    budgets: [
      { key: "groceries", title: "Groceries", amount: 15000 },
      { key: "rent_mortgage", title: "Rent / Mortgage", amount: 13000 },
      { key: "utilities", title: "Utilities", amount: 6500 },
      { key: "school_children", title: "School / Children", amount: 8000 },
      { key: "transportation", title: "Transportation", amount: 5000 },
      { key: "health", title: "Health / Medicine", amount: 4000 },
      { key: "savings_emergency", title: "Savings / Emergency", amount: 5000 },
      { key: "family_support", title: "Family Support", amount: 3500 },
    ],
    expenses: [
      { key: "rent", wallet: "primary", amount: 13000, category: "Rent / Mortgage", title: "House payment" },
      { key: "grocery_1", wallet: "primary", amount: 5200, category: "Groceries", title: "Weekly groceries" },
      { key: "school", wallet: "primary", amount: 3500, category: "School / Children", title: "School payment" },
      { key: "electricity", wallet: "primary", amount: 3900, category: "Utilities", title: "Electricity bill" },
      { key: "medicine", wallet: "daily", amount: 850, category: "Health / Medicine", title: "Medicine" },
      { key: "kids_snacks", wallet: "daily", amount: 600, category: "Groceries", title: "Kids snacks", status: "unplanned", needType: "want", notes: "Extra grocery creep" },
      { key: "gas", wallet: "primary", amount: 1800, category: "Transportation", title: "Fuel" },
      { key: "emergency_transfer", wallet: "emergency", amount: 2500, category: "Savings / Emergency", title: "Emergency transfer" },
    ],
    goals: [
      { key: "school_year", title: "Next School Year Fund", saved: 18000, target: 70000 },
      { key: "family_appliance", title: "Appliance Replacement", saved: 8000, target: 30000 },
    ],
    emergencyFund: { wallet: "emergency", walletName: "Family Emergency Wallet", saved: 18000, target: 120000, monthlyTarget: 6000, monthlySurvivalExpense: 42000, monthsCovered: 0.43 },
    profile: {
      personality: "Household protector",
      status: "Family Household",
      age: "28-45",
      dependents: "Family household with children/dependents",
      responsibility: "Food, housing, school, bills, health, transport, and savings",
      incomeRhythm: "Main salary plus side income",
      coachingStyle: "Protective, practical, and family-first",
      currentFocus: "Keep household stable while building emergency security",
      topValues: "Family stability, protection, provision, consistency",
      meaningfulGoal: "Make the household feel secure even when expenses rise",
      financialFear: "One emergency or school payment disrupting the whole month",
      spendingTrigger: "Family requests, grocery creep, school surprises, health needs",
      nonNegotiable: "Food, housing, school, medicine, utilities, and emergency protection first",
      identityStatement: "I protect my family by making calmer money decisions.",
      currentLifeSeason: "Managing a household where every peso affects multiple people.",
      emotionalState: "Responsible but often stretched",
      replacementActivity: "Plan bulk purchases, separate school money, and pause on non-urgent wants.",
    },
  },

  single_parent: {
    title: "Single Parent",
    summary: "Essential load, child-first spending, emergency vulnerability, and energy drain.",
    monthlyIncome: 30000,
    incomePattern: "Salary with occasional support",
    wallets: [
      { key: "primary", name: "Parent Payroll Wallet", balance: 9800, type: "bank" },
      { key: "daily", name: "Daily Family Cash", balance: 1800, type: "cash" },
      { key: "savings", name: "Child Priority Wallet", balance: 6200, type: "savings" },
      { key: "emergency", name: "Safety Net Wallet", balance: 3500, type: "emergency" },
    ],
    incomes: [
      { key: "salary", wallet: "primary", amount: 26000, title: "Monthly salary", sourceType: "salary", date: monthDate(10) },
      { key: "support", wallet: "primary", amount: 4000, title: "Occasional support", sourceType: "support", date: monthDate(18) },
    ],
    budgets: [
      { key: "rent", title: "Rent", amount: 7500 },
      { key: "groceries", title: "Groceries", amount: 6500 },
      { key: "child", title: "Child School / Needs", amount: 5500 },
      { key: "utilities", title: "Utilities", amount: 3000 },
      { key: "transportation", title: "Transportation", amount: 2500 },
      { key: "health", title: "Health", amount: 2000 },
      { key: "savings", title: "Savings / Emergency", amount: 2000 },
      { key: "buffer", title: "Buffer", amount: 1000 },
    ],
    expenses: [
      { key: "rent", wallet: "primary", amount: 7500, category: "Rent", title: "Monthly rent" },
      { key: "groceries", wallet: "primary", amount: 2800, category: "Groceries", title: "Groceries" },
      { key: "school", wallet: "primary", amount: 2500, category: "Child School / Needs", title: "School supplies" },
      { key: "child_snacks", wallet: "daily", amount: 450, category: "Child School / Needs", title: "Child snacks", status: "unplanned", notes: "Small child-related extra" },
      { key: "electric", wallet: "primary", amount: 1800, category: "Utilities", title: "Electricity bill" },
      { key: "transport", wallet: "daily", amount: 120, category: "Transportation", title: "Commute" },
      { key: "medicine", wallet: "primary", amount: 750, category: "Health", title: "Medicine" },
      { key: "emergency_save", wallet: "emergency", amount: 1000, category: "Savings / Emergency", title: "Emergency saving" },
    ],
    goals: [
      { key: "child_school", title: "Child School Fund", saved: 5200, target: 35000 },
      { key: "rent_buffer", title: "One-Month Rent Buffer", saved: 2500, target: 7500 },
    ],
    emergencyFund: { wallet: "emergency", walletName: "Safety Net Wallet", saved: 3500, target: 60000, monthlyTarget: 2500, monthlySurvivalExpense: 22000, monthsCovered: 0.16 },
    profile: {
      personality: "Child-first protector",
      status: "Single Parent",
      age: "25-45",
      dependents: "Child/children",
      responsibility: "Rent, food, child needs, school, health, transport, emergency",
      incomeRhythm: "Salary with occasional support",
      coachingStyle: "Gentle, protective, and clear",
      currentFocus: "Protect essentials and slowly build a safety net",
      topValues: "Child security, peace, protection, resilience",
      meaningfulGoal: "Create stability for my child even with one main income",
      financialFear: "An emergency affecting rent, food, or child needs",
      spendingTrigger: "Guilt spending for child, exhaustion, emergency stress",
      nonNegotiable: "Child essentials, rent, food, health, and safety net first",
      identityStatement: "I protect my child by protecting our money priorities.",
      currentLifeSeason: "Carrying the household and child needs with limited backup.",
      emotionalState: "Strong but tired",
      replacementActivity: "Choose child needs from the plan, not from guilt or panic.",
    },
  },

  full_time_earner: {
    title: "Full-Time Earner",
    summary: "Stable salary, fixed responsibilities, family contribution, debt pressure, and routine fatigue.",
    monthlyIncome: 25000,
    incomePattern: "Two salary cutoffs",
    wallets: [
      { key: "primary", name: "Salary Wallet", balance: 8200, type: "bank" },
      { key: "daily", name: "Daily Cash", balance: 1600, type: "cash" },
      { key: "savings", name: "Savings Wallet", balance: 5000, type: "savings" },
      { key: "emergency", name: "Emergency Wallet", balance: 2800, type: "emergency" },
    ],
    incomes: [
      { key: "salary_1", wallet: "primary", amount: 12500, title: "Salary - first cutoff", sourceType: "salary", date: monthDate(10) },
      { key: "salary_2", wallet: "primary", amount: 12500, title: "Salary - second cutoff", sourceType: "salary", date: monthDate(25) },
    ],
    budgets: [
      { key: "food", title: "Food", amount: 6000 },
      { key: "transportation", title: "Transportation", amount: 3500 },
      { key: "bills", title: "Bills", amount: 4500 },
      { key: "family", title: "Family Contribution", amount: 4000 },
      { key: "savings", title: "Savings", amount: 3000 },
      { key: "debt", title: "Debt / Installment", amount: 2000 },
      { key: "lifestyle", title: "Lifestyle", amount: 1500, needType: "want" },
      { key: "buffer", title: "Buffer", amount: 500 },
    ],
    expenses: [
      { key: "family", wallet: "primary", amount: 4000, category: "Family Contribution", title: "Family contribution" },
      { key: "food", wallet: "daily", amount: 220, category: "Food", title: "Lunch at work" },
      { key: "commute", wallet: "daily", amount: 130, category: "Transportation", title: "Commute" },
      { key: "phone", wallet: "primary", amount: 1499, category: "Debt / Installment", title: "Phone installment" },
      { key: "electric", wallet: "primary", amount: 2100, category: "Bills", title: "Electricity share" },
      { key: "snacks", wallet: "daily", amount: 260, category: "Food", title: "Work snacks", status: "unplanned", needType: "want", notes: "Routine fatigue spending" },
      { key: "streaming", wallet: "primary", amount: 349, category: "Lifestyle", title: "Streaming subscription", needType: "want" },
      { key: "savings", wallet: "savings", amount: 1500, category: "Savings", title: "Savings transfer" },
    ],
    goals: [
      { key: "phone_payoff", title: "Finish Installment Early", saved: 2500, target: 12000 },
      { key: "emergency_goal", title: "Emergency Fund Booster", saved: 2800, target: 30000 },
    ],
    emergencyFund: { wallet: "emergency", walletName: "Emergency Wallet", saved: 2800, target: 30000, monthlyTarget: 2000, monthlySurvivalExpense: 17000, monthsCovered: 0.16 },
    profile: {
      personality: "Stable earner under routine pressure",
      status: "Full-Time Earner",
      age: "22-40",
      dependents: "Self plus family contribution",
      responsibility: "Food, transport, bills, family support, debt, savings",
      incomeRhythm: "Two salary cutoffs",
      coachingStyle: "Simple, direct, and practical",
      currentFocus: "Control routine spending and build savings from stable income",
      topValues: "Stability, responsibility, progress",
      meaningfulGoal: "Make salary last without constant shortage",
      financialFear: "Salary disappearing because fixed costs and small leaks pile up",
      spendingTrigger: "Routine fatigue, small food leaks, payday confidence",
      nonNegotiable: "Bills, family contribution, debt, and savings before lifestyle",
      identityStatement: "I use my stable income to build stability, not just survive the month.",
      currentLifeSeason: "Stable work income with repeating bills and responsibility pressure.",
      emotionalState: "Functional but sometimes tired of the routine",
      replacementActivity: "Pack food, cap small rewards, and check fixed costs first.",
    },
  },

  freelance_gig_worker: {
    title: "Freelance / Gig Worker",
    summary: "Variable income, cash-flow gaps, client delays, tool costs, taxes, and freedom pressure.",
    monthlyIncome: 38000,
    incomePattern: "Irregular project/client payments",
    wallets: [
      { key: "primary", name: "Client Payments Wallet", balance: 16400, type: "bank" },
      { key: "daily", name: "Daily Cash / GCash", balance: 3300, type: "cash" },
      { key: "savings", name: "Tax & Buffer Wallet", balance: 11500, type: "savings" },
      { key: "emergency", name: "No-Client Emergency Wallet", balance: 9000, type: "emergency" },
    ],
    incomes: [
      { key: "client_a", wallet: "primary", amount: 15000, title: "Client A payment", sourceType: "client", date: monthDate(5) },
      { key: "client_b", wallet: "primary", amount: 8000, title: "Client B milestone", sourceType: "client", date: monthDate(12) },
      { key: "client_c", wallet: "primary", amount: 12000, title: "Project payout", sourceType: "client", date: monthDate(19) },
      { key: "small_gig", wallet: "daily", amount: 3000, title: "Small gig cash", sourceType: "gig", date: monthDate(24) },
    ],
    budgets: [
      { key: "tools", title: "Business / Work Tools", amount: 5000 },
      { key: "rent", title: "Rent / Contribution", amount: 7000 },
      { key: "food", title: "Food", amount: 7000 },
      { key: "transport", title: "Transportation", amount: 3000 },
      { key: "tax_buffer", title: "Taxes / Buffer", amount: 6000 },
      { key: "savings", title: "Savings", amount: 5000 },
      { key: "subscriptions", title: "Subscriptions", amount: 2000 },
      { key: "lifestyle", title: "Lifestyle", amount: 3000, needType: "want" },
    ],
    expenses: [
      { key: "rent", wallet: "primary", amount: 7000, category: "Rent / Contribution", title: "Rent contribution" },
      { key: "software", wallet: "primary", amount: 1200, category: "Subscriptions", title: "Design software" },
      { key: "coworking", wallet: "daily", amount: 650, category: "Business / Work Tools", title: "Coworking day pass", status: "unplanned", notes: "Needed because home was noisy" },
      { key: "groceries", wallet: "primary", amount: 2500, category: "Food", title: "Groceries" },
      { key: "client_meeting", wallet: "daily", amount: 420, category: "Food", title: "Client meeting coffee" },
      { key: "tax_buffer", wallet: "savings", amount: 3000, category: "Taxes / Buffer", title: "Tax buffer set aside" },
      { key: "ride", wallet: "daily", amount: 260, category: "Transportation", title: "Ride to meeting" },
      { key: "online_course", wallet: "primary", amount: 1200, category: "Business / Work Tools", title: "Online course", needType: "want" },
    ],
    goals: [
      { key: "three_month_buffer", title: "Three-Month Buffer", saved: 12000, target: 90000 },
      { key: "equipment", title: "New Work Equipment", saved: 8000, target: 55000 },
    ],
    emergencyFund: { wallet: "emergency", walletName: "No-Client Emergency Wallet", saved: 9000, target: 90000, monthlyTarget: 5000, monthlySurvivalExpense: 25000, monthsCovered: 0.36 },
    profile: {
      personality: "Freedom-seeking but cash-flow sensitive",
      status: "Freelance / Gig Worker",
      age: "22-40",
      dependents: "Mostly self, possible family contribution",
      responsibility: "Rent, food, client work tools, taxes, subscriptions, buffer",
      incomeRhythm: "Irregular client payments",
      coachingStyle: "Cash-flow focused and calm",
      currentFocus: "Protect income gaps and separate taxes from spendable money",
      topValues: "Freedom, creativity, stability, flexibility",
      meaningfulGoal: "Enjoy freelance freedom without cash-flow panic",
      financialFear: "Client delays causing bills or rent pressure",
      spendingTrigger: "Big payout confidence, work stress, tools disguised as needs",
      nonNegotiable: "Tax buffer, rent, food, emergency, and work-critical tools first",
      identityStatement: "I build freedom by protecting my cash flow.",
      currentLifeSeason: "Variable income with flexible work but unstable payment timing.",
      emotionalState: "Creative and hopeful, but cash-flow anxious",
      replacementActivity: "Hold spending until client payment clears and separate tax money first.",
    },
  },

  business_builder: {
    title: "Business Builder",
    summary: "Revenue pressure, reinvestment decisions, inventory, ads, operations, and scale risk.",
    monthlyIncome: 70000,
    incomePattern: "Business revenue batches",
    wallets: [
      { key: "primary", name: "Business Operating Wallet", balance: 28500, type: "business" },
      { key: "daily", name: "Owner Allowance Wallet", balance: 6500, type: "cash" },
      { key: "savings", name: "Reinvestment Wallet", balance: 22000, type: "savings" },
      { key: "emergency", name: "Business Buffer Wallet", balance: 15000, type: "emergency" },
    ],
    incomes: [
      { key: "revenue_1", wallet: "primary", amount: 40000, title: "Business sales batch", sourceType: "business_revenue", date: monthDate(7) },
      { key: "revenue_2", wallet: "primary", amount: 30000, title: "Business sales batch", sourceType: "business_revenue", date: monthDate(21) },
    ],
    budgets: [
      { key: "inventory", title: "Inventory / Supplies", amount: 20000 },
      { key: "staff", title: "Staff / Help", amount: 8000 },
      { key: "ads", title: "Ads / Marketing", amount: 7000 },
      { key: "operations", title: "Operations / Utilities", amount: 6000 },
      { key: "owner_allowance", title: "Personal Allowance", amount: 12000 },
      { key: "buffer", title: "Emergency / Buffer", amount: 6000 },
      { key: "reinvestment", title: "Reinvestment", amount: 8000 },
      { key: "family_home", title: "Family / Home", amount: 3000 },
    ],
    expenses: [
      { key: "inventory", wallet: "primary", amount: 12000, category: "Inventory / Supplies", title: "Inventory restock" },
      { key: "ads", wallet: "primary", amount: 3500, category: "Ads / Marketing", title: "Facebook ads" },
      { key: "helper", wallet: "primary", amount: 4000, category: "Staff / Help", title: "Part-time helper" },
      { key: "packaging", wallet: "primary", amount: 1800, category: "Inventory / Supplies", title: "Packaging supplies" },
      { key: "owner_allowance", wallet: "daily", amount: 5000, category: "Personal Allowance", title: "Owner allowance" },
      { key: "rush_supplier", wallet: "primary", amount: 3200, category: "Inventory / Supplies", title: "Rush supplier order", status: "unplanned", notes: "Urgent order to avoid stockout" },
      { key: "buffer", wallet: "emergency", amount: 3000, category: "Emergency / Buffer", title: "Business buffer transfer" },
      { key: "home", wallet: "daily", amount: 1500, category: "Family / Home", title: "Home contribution" },
    ],
    goals: [
      { key: "inventory_scale", title: "Next Inventory Batch", saved: 20000, target: 80000 },
      { key: "equipment", title: "Business Equipment", saved: 10000, target: 60000 },
    ],
    emergencyFund: { wallet: "emergency", walletName: "Business Buffer Wallet", saved: 15000, target: 120000, monthlyTarget: 8000, monthlySurvivalExpense: 45000, monthsCovered: 0.33 },
    profile: {
      personality: "Builder under reinvestment pressure",
      status: "Business Builder",
      age: "23-45",
      dependents: "Business, self, and possible family/home support",
      responsibility: "Inventory, ads, helpers, operations, owner allowance, reinvestment",
      incomeRhythm: "Business revenue batches",
      coachingStyle: "Strategic, firm, and cash-flow aware",
      currentFocus: "Separate business money from personal money and protect operating cash",
      topValues: "Growth, discipline, ownership, stability",
      meaningfulGoal: "Grow the business without starving personal stability",
      financialFear: "Reinvesting too aggressively and losing operating buffer",
      spendingTrigger: "Sales momentum, urgency, fear of missing growth, supplier pressure",
      nonNegotiable: "Operating cash, inventory plan, owner allowance limit, and buffer first",
      identityStatement: "I build the business by protecting cash flow before excitement.",
      currentLifeSeason: "Growing a business where every decision affects both cash and future scale.",
      emotionalState: "Driven, excited, and sometimes overloaded",
      replacementActivity: "Check operating cash and next 14 days before reinvesting.",
    },
  },
};

export function getClaraLifeStageSampleOptions() {
  return Object.entries(LIFE_STAGE_SAMPLES).map(([key, sample]) => ({
    key,
    title: sample.title,
    summary: sample.summary,
    monthlyIncome: sample.monthlyIncome,
    incomeLabel: formatPeso(sample.monthlyIncome),
    incomePattern: sample.incomePattern,
  }));
}

function resolveSample(stageKey) {
  return LIFE_STAGE_SAMPLES[stageKey] || LIFE_STAGE_SAMPLES.young_professional;
}

function isLifeStageSampleRecord(record) {
  const recordId = String(record?.id || "");
  return Boolean(
    record &&
      (record.source === SOURCE ||
        record.sampleFamily === SAMPLE_FAMILY ||
        record.demoSeed === true && recordId.startsWith(PREFIX))
  );
}

async function removeExistingLifeStageSample(localUserId) {
  await runLocalFinanceTransaction(SAMPLE_STORES, localUserId, async (tx) => {
    for (const storeName of SAMPLE_STORES) {
      const rows = await tx.getAllForUser(storeName, true);
      for (const row of rows || []) {
        if (isLifeStageSampleRecord(row)) {
          tx.store(storeName).delete(row.id);
        }
      }
    }
  });
}

function buildLifeStageSample(stageKey) {
  const sample = resolveSample(stageKey);
  const walletRows = sample.wallets.map((row, index) => wallet(stageKey, row, index + 1));
  const walletIds = walletRows.reduce((map, row) => {
    const match = sample.wallets.find((walletConfig) => walletConfig.name === row.name);
    if (match?.key) map[match.key] = row.id;
    return map;
  }, {});

  const expenseRows = sample.expenses.map((row, index) => expense(stageKey, walletIds, row, index));
  const transactionRows = [
    ...sample.incomes.map((row, index) => income(stageKey, walletIds, row, index)),
    ...expenseRows.map((row) => walletTransactionFromExpense(stageKey, row)),
  ];
  const budgetRows = [
    budgetHeader(stageKey, sample),
    ...sample.budgets.map((row, index) => budget(stageKey, row, index + 1)),
  ];
  const savingsGoalRows = sample.goals.map((row, index) => savingsGoal(stageKey, row, index + 1));
  const emergencyFundRow = emergencyFund(stageKey, sample, walletIds);
  const memoryRows = [
    memory(stageKey, "stage_context", "Life Stage", sample.summary, sample.profile.financialFear, sample.profile.coachingStyle),
    memory(stageKey, "protected_priority", "Protection", sample.profile.nonNegotiable, "Spending should respect stage-specific protected priorities.", "Check protected priorities first."),
    memory(stageKey, "trigger", "Spending Trigger", sample.profile.spendingTrigger, "This trigger can distort purchase decisions.", "Pause before wants and compare to budget."),
  ];
  const profile = buildProfile(stageKey, sample);

  return {
    stageKey,
    title: sample.title,
    wallets: walletRows,
    transactions: transactionRows,
    expenses: expenseRows,
    budgets: budgetRows,
    savingsGoals: savingsGoalRows,
    emergencyFund: emergencyFundRow,
    memories: memoryRows,
    profile,
  };
}

async function upsertRows(storeName, rows, localUserId) {
  for (const row of rows) {
    await upsertLocalRecord(storeName, row, localUserId);
  }
}

function writeActiveState(result) {
  if (typeof window === "undefined" || !window.localStorage) return;

  window.localStorage.setItem(
    ACTIVE_KEY,
    JSON.stringify({
      active: true,
      stageKey: result.stageKey,
      title: result.title,
      localUserId: result.localUserId,
      activatedAt: nowIso(),
    })
  );
}

function dispatchFinanceRefreshEvents(detail) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent("clara-life-stage-sample-data-loaded", { detail }));
  window.dispatchEvent(new Event("clara-finance-updated"));
  window.dispatchEvent(new Event("clara-wallets-updated"));
  window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
  window.dispatchEvent(new Event("clara-settings-updated"));
}

export async function activateClaraLifeStageSampleData({ stageKey = "young_professional" } = {}) {
  const localUserId = CLARA_LIFE_STAGE_DEMO_LOCAL_USER_ID;
  const sample = buildLifeStageSample(stageKey);

  await removeExistingLifeStageSample(localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.wallets, sample.wallets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.walletTransactions, sample.transactions, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.expenses, sample.expenses, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.budgets, sample.budgets, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.savingsGoals, sample.savingsGoals, localUserId);
  await upsertLocalRecord(LOCAL_FINANCE_STORES.emergencyFund, sample.emergencyFund, localUserId);
  await upsertRows(LOCAL_FINANCE_STORES.aiFinancialMemory, sample.memories, localUserId);

  await saveClaraLifeProfile(
    { id: localUserId, email: "demo@clara.local" },
    sample.profile
  );

  const result = {
    mode: "life_stage_sample",
    stageKey: sample.stageKey,
    title: sample.title,
    localUserId,
    wallets: sample.wallets.length,
    expenses: sample.expenses.length,
    budgets: sample.budgets.length,
    savingsGoals: sample.savingsGoals.length,
    memories: sample.memories.length,
  };

  writeActiveState(result);
  dispatchFinanceRefreshEvents(result);

  return result;
}

export function getActiveClaraLifeStageSampleState() {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    return JSON.parse(window.localStorage.getItem(ACTIVE_KEY) || "null");
  } catch {
    return null;
  }
}
