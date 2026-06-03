import { LOCAL_FINANCE_STORES, upsertLocalRecord } from "./localFinanceStore";
import { saveClaraLifeProfile } from "./clara-life-profile";
import { upsertDebtObligation } from "./debtObligationStore";

const SOURCE = "clara_sample_demo_seed";
const PREFIX = "clara_sample_max";
const SCHEDULE_KEY_PREFIX = "clara_schedule_events_v2";

const n = () => new Date().toISOString();
const id = (type, key) => `${PREFIX}_${type}_${key}`;
const localUserIdFor = (user) => String(user?.id || user?.email || "local-user").trim() || "local-user";
const scheduleKeyFor = (user) => `${SCHEDULE_KEY_PREFIX}_${String(user?.id || user?.email || "guest").trim() || "guest"}`;

function dateOnly(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateOnly(date);
}

function monthKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthDate(day) {
  const date = new Date();
  date.setDate(Math.min(day, 28));
  return dateOnly(date);
}

function monthStart() {
  const date = new Date();
  date.setDate(1);
  return dateOnly(date);
}

function monthEnd() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1, 0);
  return dateOnly(date);
}

function at(date) {
  return `${date}T12:00:00.000Z`;
}

function base(recordId, createdAt = n()) {
  return {
    id: recordId,
    createdAt,
    created_at: createdAt,
    updatedAt: n(),
    updated_at: n(),
    deletedAt: null,
    deleted_at: null,
    syncStatus: "local_only",
    source: SOURCE,
    demoSeed: true,
  };
}

function wallet(key, name, balance, type, order) {
  return {
    ...base(id("wallet", key), at(monthDate(order + 1))),
    name,
    title: name,
    label: name,
    type,
    wallet_type: type,
    balance,
    current_balance: balance,
    wallet_balance: balance,
    available_balance: balance,
    starting_balance: balance,
    sort_order: order,
  };
}

function budgetHeader() {
  const month = monthKey();
  return {
    ...base(id("budget", "monthly_header"), at(monthStart())),
    is_plan_header: true,
    plan_type: "monthly_budget",
    type: "monthly_budget",
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    title: "Monthly Spending Plan",
    name: "Monthly Spending Plan",
    status: "active",
    is_active: true,
    is_complete: true,
    complete: true,
    plan_is_complete: true,
    declared_amount: 32000,
    declared_budget: 32000,
    monthly_budget_amount: 32000,
    total_declared_budget: 32000,
    amount: 32000,
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

function budget(key, title, amount, order, needType = "need") {
  const month = monthKey();
  return {
    ...base(id("budget", key), at(monthStart())),
    title,
    name: title,
    category: title,
    budget_category: title,
    section_key: key,
    status: "active",
    is_active: true,
    amount,
    allocated_amount: amount,
    budget_amount: amount,
    total_budget: amount,
    budget: amount,
    need_type: needType,
    month,
    budget_month: month,
    month_key: month,
    sort_order: order,
  };
}

function expense({ key, walletId, amount, category, title, date, status = "planned", needType = "need", notes = "Demo transaction" }) {
  return {
    ...base(id("expense", key), at(date)),
    wallet_id: walletId,
    amount,
    category,
    budget_category: category,
    expense_category: category,
    title,
    name: title,
    merchant: title,
    date: at(date),
    created_at: at(date),
    planning_status: status,
    budget_status: status,
    need_type: needType,
    unplanned_reason: status === "unplanned" ? notes : "",
    notes,
  };
}

function txnFromExpense(row) {
  return {
    ...base(id("wallet_txn", `for_${row.id}`), row.created_at),
    wallet_id: row.wallet_id,
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

function income(key, walletId, amount, title, date) {
  return {
    ...base(id("wallet_txn", key), at(date)),
    wallet_id: walletId,
    amount,
    type: "income",
    category: "Income",
    source_type: "salary",
    title,
    notes: title,
    created_at: at(date),
  };
}

function goal(key, name, saved, target, order) {
  return {
    ...base(id("savings_goal", key), at(monthDate(order + 2))),
    name,
    title: name,
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

function memory(key, category, summary, spendingImpact, supportStyle) {
  return {
    ...base(id("memory", key), at(monthDate(2))),
    recordKind: "ai_financial_memory",
    category,
    summary,
    spendingImpact,
    supportStyle,
    status: "active",
    userApproved: true,
  };
}

function schedule(key, title, days, time, type, amount, note) {
  return { id: id("schedule", key), title, date: addDays(days), time, type, amount, estimatedImpact: amount, cost: amount, note, description: note, source: SOURCE, demoSeed: true };
}

function buildSample() {
  const payroll = id("wallet", "payroll");
  const daily = id("wallet", "daily");
  const savings = id("wallet", "savings");
  const emergency = id("wallet", "emergency");

  const wallets = [
    wallet("payroll", "Payroll Wallet", 12500, "bank", 1),
    wallet("daily", "Daily Spending Wallet", 2800, "cash", 2),
    wallet("savings", "Savings Wallet", 8000, "savings", 3),
    wallet("emergency", "Emergency Reserve Wallet", 5000, "emergency", 4),
  ];

  const expenses = [
    expense({ key: "foodpanda", walletId: daily, amount: 420, category: "Food", title: "Food Panda", date: monthDate(3), status: "unplanned", needType: "want", notes: "Stress food after night shift" }),
    expense({ key: "grab", walletId: daily, amount: 180, category: "Transportation", title: "Grab", date: monthDate(4) }),
    expense({ key: "coffee", walletId: daily, amount: 180, category: "Food", title: "Coffee", date: monthDate(5), status: "unplanned", needType: "want", notes: "Tired after shift" }),
    expense({ key: "internet", walletId: payroll, amount: 1699, category: "Bills", title: "Internet Bill", date: monthDate(6) }),
    expense({ key: "netflix", walletId: payroll, amount: 549, category: "Entertainment", title: "Netflix", date: monthDate(7), needType: "want" }),
    expense({ key: "jollibee", walletId: daily, amount: 215, category: "Food", title: "Jollibee", date: monthDate(9), status: "unplanned", needType: "want", notes: "Convenience food before work" }),
    expense({ key: "gas", walletId: payroll, amount: 1000, category: "Transportation", title: "Gas", date: monthDate(10) }),
    expense({ key: "motorcycle_savings", walletId: savings, amount: 2000, category: "Savings", title: "Motorcycle Savings", date: monthDate(11) }),
    expense({ key: "shopee", walletId: daily, amount: 699, category: "Miscellaneous", title: "Shopee", date: monthDate(12), status: "unplanned", needType: "want", notes: "Payday impulse purchase" }),
    expense({ key: "mercury", walletId: payroll, amount: 350, category: "Health", title: "Mercury Drug", date: monthDate(13) }),
  ];

  return {
    wallets,
    expenses,
    transactions: [income("salary_1", payroll, 16000, "BPO Payroll - first cutoff", monthDate(10)), income("salary_2", payroll, 16000, "BPO Payroll - second cutoff", monthDate(25)), ...expenses.map(txnFromExpense)],
    budgets: [budgetHeader(), budget("food", "Food", 8000, 1), budget("transportation", "Transportation", 3500, 2), budget("bills", "Bills", 7000, 3), budget("savings", "Savings", 5000, 4), budget("entertainment", "Entertainment", 2500, 5, "want"), budget("miscellaneous", "Miscellaneous", 6000, 6, "want")],
    goals: [goal("motorcycle", "Motorcycle Fund", 22000, 120000, 1), goal("japan", "Japan Trip", 10000, 80000, 2), goal("laptop", "New Laptop", 12500, 45000, 3)],
    emergencyFund: { ...base("emergency_fund:sample_max", at(monthDate(1))), target_amount: 50000, targetAmount: 50000, saved_amount: 15000, savedAmount: 15000, saved: 15000, current_amount: 15000, amount: 15000, monthly_target: 3000, monthly_survival_expense: 18000, monthsCovered: 0.8, linkedWalletId: emergency, linked_wallet_id: emergency, linkedWalletName: "Emergency Reserve Wallet", linked_wallet_name: "Emergency Reserve Wallet", status: "active" },
    memories: [
      memory("payday", "Spending Pattern", "Max usually overspends within 48 hours after payday.", "Payday confidence can trigger impulse purchases.", "Direct reminder before checkout."),
      memory("night_shift", "Emotional Spending", "Max often orders food during tiring night shifts.", "Low energy increases food delivery spending.", "Suggest cheaper food or rest alternatives."),
      memory("motorcycle", "Protected Goal", "Max is saving for a motorcycle.", "Convenience spending can slow the motorcycle fund.", "Compare wants against the motorcycle goal."),
      memory("style", "Preference", "Max responds better to direct and practical coaching.", "Soft advice may be ignored during impulse moments.", "Keep guidance short and action-focused."),
    ],
    scheduleEvents: [schedule("work", "Work Shift", 0, "9:00 PM - 6:00 AM", "Work", 0, "Night shift BPO schedule."), schedule("dentist", "Dentist Appointment", 1, "3:00 PM", "Health", 1500, "Prepare dental cost."), schedule("dinner", "Team Dinner", 3, "7:00 PM", "Social", 800, "Possible team dinner spending pressure."), schedule("motorcycle_viewing", "Motorcycle Viewing", 4, "2:00 PM", "Goal", 0, "Do not decide impulsively."), schedule("rent", "Rent Contribution Due", 6, "10:00 AM", "Bill", 4500, "Monthly family or house contribution.")],
    profile: {
      personality: "Convenience spender",
      status: "BPO Call Center Agent",
      age: "26",
      dependents: "Self, family support when needed",
      responsibility: "Bills, food, savings, and occasional family support",
      incomeRhythm: "Every 10 and 25 cutoff",
      coachingStyle: "Direct and practical",
      currentFocus: "Build emergency fund and save for a motorcycle",
      topValues: "Stability, independence, discipline, family support",
      meaningfulGoal: "Own a motorcycle while keeping emergency fund protected",
      financialFear: "Running out before payday because of small unplanned spending",
      spendingTrigger: "Stress, tiredness after night shift, payday confidence, food cravings",
      nonNegotiable: "Emergency fund and motorcycle savings should not be touched for wants",
      identityStatement: "I am learning to pause before spending and protect my future self.",
      currentLifeSeason: "26-year-old Filipino BPO young professional on night shift",
      emotionalState: "Motivated but tempted by convenience spending after tiring shifts",
      replacementActivity: "Rest, home-prepped food, short walk, basketball, or content creation instead of checkout",
      memoryNotes: [],
      personalityQuizAnswers: { incomePattern: "Every cutoff", livingSituation: "With family", responsibilities: "Rent/Bills", workType: "BPO/Call center", mainFinancialGoal: "Emergency fund", motivationStyle: "Direct honesty", wallets: "Multiple", budgets: "Strict budget", emergencyFund: "Partly built", debt: "Small debt", paydayCycle: "Every 10 and 25" },
    },
    debts: [{ id: id("debt", "phone_installment"), title: "Phone Installment", lender: "Device Plan", debtType: "installment", totalDebt: 12000, monthlyDebt: 1500, interestRate: 0, dueDate: addDays(8), notes: "Demo small monthly obligation." }],
  };
}

async function upsertMany(store, records, localUserId) {
  for (const record of records) await upsertLocalRecord(store, record, localUserId);
}

function saveSchedule(user, events) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const key = scheduleKeyFor(user);
  let existing = [];
  try { existing = JSON.parse(window.localStorage.getItem(key) || "[]"); } catch { existing = []; }
  const sampleIds = new Set(events.map((event) => event.id));
  window.localStorage.setItem(key, JSON.stringify([...(Array.isArray(existing) ? existing : []).filter((event) => !sampleIds.has(event?.id)), ...events]));
}

export async function activateClaraSampleUserData({ user = null } = {}) {
  const localUserId = localUserIdFor(user);
  const sample = buildSample();

  await upsertMany(LOCAL_FINANCE_STORES.wallets, sample.wallets, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.walletTransactions, sample.transactions, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.expenses, sample.expenses, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.budgets, sample.budgets, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.savingsGoals, sample.goals, localUserId);
  await upsertLocalRecord(LOCAL_FINANCE_STORES.emergencyFund, sample.emergencyFund, localUserId);
  await upsertMany(LOCAL_FINANCE_STORES.aiFinancialMemory, sample.memories, localUserId);
  for (const debt of sample.debts) await upsertDebtObligation(localUserId, debt);
  await saveClaraLifeProfile(user, sample.profile);
  saveSchedule(user, sample.scheduleEvents);

  return { localUserId, wallets: sample.wallets.length, expenses: sample.expenses.length, budgets: sample.budgets.length, savingsGoals: sample.goals.length, scheduleEvents: sample.scheduleEvents.length, memories: sample.memories.length };
}
