import {
  YOUNG_PROFESSIONAL_DEMO_PROFILE_ID,
  YOUNG_PROFESSIONAL_DEMO_PROFILE_NAME,
  YOUNG_PROFESSIONAL_DEMO_SOURCE,
  YOUNG_PROFESSIONAL_DEMO_SETUP_FAMILY,
} from "./activeDemoProfile";

const MAIN_WALLET_ID = "clara_yp12m_wallet_main";
const SAVINGS_WALLET_ID = "clara_yp12m_wallet_savings";
const EMERGENCY_WALLET_ID = "clara_yp12m_wallet_emergency";
const BUDGETS = [
  ["food", "Food", 6000],
  ["transportation", "Transportation", 2500],
  ["bills", "Bills / Utilities", 2500],
  ["family", "Family Support", 3000],
  ["care", "Personal Care", 1500],
  ["entertainment", "Entertainment", 1500],
  ["savings", "Savings", 2000],
  ["emergency", "Emergency Fund", 1000],
];
const META = {
  isDemo: true,
  is_demo: true,
  demoProfileId: YOUNG_PROFESSIONAL_DEMO_PROFILE_ID,
  demo_profile_id: YOUNG_PROFESSIONAL_DEMO_PROFILE_ID,
  demoProfileName: YOUNG_PROFESSIONAL_DEMO_PROFILE_NAME,
  demo_profile_name: YOUNG_PROFESSIONAL_DEMO_PROFILE_NAME,
  source: YOUNG_PROFESSIONAL_DEMO_SOURCE,
  setupFamily: YOUNG_PROFESSIONAL_DEMO_SETUP_FAMILY,
  setup_family: YOUNG_PROFESSIONAL_DEMO_SETUP_FAMILY,
  syncStatus: "local_only",
};

const peso = (value) => Math.max(0, Math.round(Number(value || 0) / 10) * 10);
const pad = (value) => String(value).padStart(2, "0");
const monthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
const lastDay = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
const iso = (month, day, hour = 12) => new Date(month.getFullYear(), month.getMonth(), Math.min(day, lastDay(month)), hour, 0, 0, 0).toISOString();
const cleanId = (value) => String(value || "record").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const withMeta = (record, localUserId, date) => ({ ...META, ...record, localUserId, createdAt: record.createdAt || date, created_at: record.created_at || date, updatedAt: record.updatedAt || date, updated_at: record.updated_at || date, deletedAt: null, deleted_at: null });

function months(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  return Array.from({ length: 12 }, (_, index) => new Date(end.getFullYear(), end.getMonth() - 11 + index, 1));
}

function random(seed) {
  let state = seed || 17;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function pattern(index) {
  if (index <= 2) return { label: "normal", food: 1, transport: 1, entertainment: 1, savings: 2000, emergency: 1000, planned: 0.78 };
  if (index <= 5) return { label: "overspending", food: 1.2, transport: 1.05, entertainment: 1.45, savings: [700, 500, 1000][index - 3], emergency: 500, planned: 0.58 };
  if (index <= 8) return { label: "recovery", food: 0.96, transport: 0.95, entertainment: 0.72, savings: [2500, 3000, 3500][index - 6], emergency: 1000, planned: 0.82 };
  return { label: "stable", food: 0.9, transport: 0.92, entertainment: 0.65, savings: [3000, 3200, 3500][index - 9] || 3000, emergency: index === 11 ? 1500 : 1000, planned: 0.9 };
}

function amount(rng, min, max, multiplier = 1) {
  return peso((min + (max - min) * rng()) * multiplier);
}

function tx(out, localUserId, payload) {
  const date = payload.created_at || payload.date || new Date().toISOString();
  out.walletTransactions.push(withMeta({ title: payload.title || payload.notes || "Wallet transaction", notes: payload.notes || payload.title || "", date, ...payload, amount: peso(payload.amount), created_at: date }, localUserId, date));
}

function addIncome(out, localUserId, balance, month, day, source, value) {
  const date = iso(month, day, 8);
  tx(out, localUserId, { id: `clara_yp12m_income_${cleanId(source)}_${date.slice(0, 10)}`, wallet_id: MAIN_WALLET_ID, amount: value, type: "income", category: source, tag: source, title: source, notes: source, date, created_at: date, source_type: "income" });
  balance.main += value;
}

function addExpense(out, localUserId, balance, rng, p, month, category, title, min, max, day, index, multiplier = 1, forcedStatus = null) {
  const date = iso(month, day, 12 + (index % 8));
  const key = monthKey(month);
  const id = `clara_yp12m_expense_${cleanId(category)}_${key}_${index}`;
  const status = forcedStatus || (rng() <= p.planned ? "planned" : "unplanned");
  const value = amount(rng, min, max, multiplier);
  const expense = { id, wallet_id: MAIN_WALLET_ID, walletId: MAIN_WALLET_ID, amount: value, title, name: title, category, need_type: "sample", planning_status: status, budget_status: status, status, unplanned_reason: status === "unplanned" ? `Sample ${p.label} behavior` : null, notes: `${category} sample spending`, date, created_at: date };
  out.expenses.push(withMeta(expense, localUserId, date));
  tx(out, localUserId, { ...expense, id: `${id}_wallet_txn`, type: "expense", expense_id: id, source_type: "expense" });
  balance.main -= value;
}

function addTransfer(out, localUserId, balance, month, from, to, value, title, day) {
  const date = iso(month, day, 21);
  const id = `clara_yp12m_transfer_${cleanId(title)}_${date.slice(0, 10)}`;
  out.transfers.push(withMeta({ id, transfer_group_id: id, from_wallet_id: from, to_wallet_id: to, source_wallet_id: from, destination_wallet_id: to, amount: value, title, notes: title, date, created_at: date }, localUserId, date));
  tx(out, localUserId, { id: `${id}_out`, wallet_id: from, related_wallet_id: to, amount: value, type: "transfer_out", transfer_group_id: id, title, notes: title, date, created_at: date, source_type: "transfer" });
  tx(out, localUserId, { id: `${id}_in`, wallet_id: to, related_wallet_id: from, amount: value, type: "transfer_in", transfer_group_id: id, title, notes: title, date, created_at: date, source_type: "transfer" });
  if (from === MAIN_WALLET_ID) balance.main -= value;
  if (to === SAVINGS_WALLET_ID) balance.savings += value;
  if (to === EMERGENCY_WALLET_ID) balance.emergency += value;
}

export function generateYoungProfessionalDemoData({ localUserId = "clara-sample-data-user", now = new Date() } = {}) {
  const out = { wallets: [], incomeSources: [], expenses: [], walletTransactions: [], transfers: [], budgets: [], savingsGoals: [], emergencyFund: [] };
  const balance = { main: 0, savings: 0, emergency: 0 };
  let salaryTotal = 0;
  let sideTotal = 0;
  let savingsTotal = 0;
  let emergencyTotal = 0;
  const list = months(now);

  list.forEach((month, index) => {
    const rng = random(month.getFullYear() * 1000 + month.getMonth() * 37 + index);
    const p = pattern(index);
    addIncome(out, localUserId, balance, month, 15, "BPO Salary", 15000);
    addIncome(out, localUserId, balance, month, 30, "BPO Salary", 15000);
    salaryTotal += 30000;
    if ([1, 2, 4, 6, 8, 9, 11].includes(index)) {
      const side = amount(rng, 1500, 4000, index <= 5 ? 0.92 : 1.05);
      addIncome(out, localUserId, balance, month, 22, "Side Hustle", side);
      sideTotal += side;
    }
    [2, 5, 8, 11, 14, 18, 21, 24, 27].forEach((day, i) => addExpense(out, localUserId, balance, rng, p, month, "Food", i % 2 ? "Coffee and snacks" : "Meal outside", 200, 450, day, i, p.food));
    [3, 6, 10, 13, 17, 21, 25].forEach((day, i) => addExpense(out, localUserId, balance, rng, p, month, "Transportation", i % 2 ? "Ride booking" : "Commute fare", 80, 350, day, i, p.transport));
    addExpense(out, localUserId, balance, rng, p, month, "Bills / Utilities", "Utilities payment", 1500, 2500, 7, 1, 1, "planned");
    addExpense(out, localUserId, balance, rng, p, month, "Subscriptions", index % 3 === 0 ? "Editing app subscription" : "App subscription", index % 3 === 0 ? 580 : 149, index % 3 === 0 ? 580 : 249, 12, 1, 1, "planned");
    addExpense(out, localUserId, balance, rng, p, month, "Family Support", "Family support", 1000, 3000, 16, 1, index <= 5 ? 1.08 : 1, "planned");
    addExpense(out, localUserId, balance, rng, p, month, "Personal Care", "Personal care / grooming", 150, 1200, 19, 1, index <= 5 ? 1.12 : 1);
    addExpense(out, localUserId, balance, rng, p, month, "Entertainment", "Eating out / hangout", 250, 1500, 23, 1, p.entertainment);
    if (index % 2 === 0 || index === 4) addExpense(out, localUserId, balance, rng, p, month, "Health", index === 4 ? "Medicine and checkup" : "Medicine / vitamins", 200, 1500, 24, 1, index === 4 ? 1.2 : 1, index === 4 ? "unplanned" : "planned");
    addExpense(out, localUserId, balance, rng, p, month, "Miscellaneous", "Unplanned small item", 120, 650, 28, 1);
    addTransfer(out, localUserId, balance, month, MAIN_WALLET_ID, SAVINGS_WALLET_ID, p.savings, "Monthly savings deposit", 30);
    savingsTotal += p.savings;
    addTransfer(out, localUserId, balance, month, MAIN_WALLET_ID, EMERGENCY_WALLET_ID, p.emergency, "Emergency fund deposit", 29);
    emergencyTotal += p.emergency;
    if (index === 4) {
      const date = iso(month, 25, 10);
      tx(out, localUserId, { id: `clara_yp12m_emergency_withdrawal_${monthKey(month)}`, wallet_id: EMERGENCY_WALLET_ID, amount: 1800, type: "withdrawal", category: "Health", title: "Emergency medicine withdrawal", notes: "Emergency fund sample withdrawal", date, created_at: date, source_type: "emergency_fund" });
      balance.emergency -= 1800;
    }
    BUDGETS.forEach(([slug, title, value]) => out.budgets.push(withMeta({ id: `clara_yp12m_budget_${monthKey(month)}_${slug}`, title, name: title, category: title, amount: value, limit: value, budget_amount: value, allocated_amount: value, month: monthKey(month), month_key: monthKey(month), budget_month: monthKey(month), type: "category_budget", plan_type: "category_budget", notes: "Sample monthly category budget" }, localUserId, iso(month, 1, 8))));
  });

  const first = iso(list[0], 1, 7);
  const last = iso(list[11], lastDay(list[11]), 23);
  out.wallets.push(
    withMeta({ id: MAIN_WALLET_ID, name: "Main Wallet", title: "Main Wallet", type: "cash_wallet", wallet_type: "cash_wallet", balance: peso(balance.main), current_balance: peso(balance.main), starting_balance: 0, updated_at: last }, localUserId, first),
    withMeta({ id: SAVINGS_WALLET_ID, name: "Savings Wallet", title: "Savings Wallet", type: "savings_wallet", wallet_type: "savings_wallet", balance: peso(balance.savings), current_balance: peso(balance.savings), starting_balance: 0, updated_at: last }, localUserId, first),
    withMeta({ id: EMERGENCY_WALLET_ID, name: "Emergency Fund Wallet", title: "Emergency Fund Wallet", type: "emergency_fund_wallet", wallet_type: "emergency_fund_wallet", balance: peso(balance.emergency), current_balance: peso(balance.emergency), starting_balance: 0, updated_at: last }, localUserId, first)
  );
  out.incomeSources.push(
    withMeta({ id: "clara_yp12m_income_source_bpo_salary", kind: "income_source", recordType: "income_source", name: "BPO Salary", title: "BPO Salary", category: "Salary", stability: "Stable", totalMoneyIn: salaryTotal, total_money_in: salaryTotal, totalMoneyOut: salaryTotal, total_money_out: salaryTotal, currentBalance: 0, current_balance: 0, expectedMonthlyAmount: 30000, expected_monthly_amount: 30000 }, localUserId, first),
    withMeta({ id: "clara_yp12m_income_source_side_hustle", kind: "income_source", recordType: "income_source", name: "Side Hustle", title: "Side Hustle", category: "Side Hustle", stability: "Irregular", totalMoneyIn: sideTotal, total_money_in: sideTotal, totalMoneyOut: sideTotal, total_money_out: sideTotal, currentBalance: 0, current_balance: 0 }, localUserId, first)
  );
  out.savingsGoals.push(withMeta({ id: "clara_yp12m_savings_goal", name: "Starter Savings Goal", title: "Starter Savings Goal", saved_amount: peso(balance.savings), savedAmount: peso(balance.savings), target_amount: 30000, targetAmount: 30000, status: "active", notes: `Demo savings activity total: ${savingsTotal}` }, localUserId, first));
  out.emergencyFund.push(withMeta({ id: "clara_yp12m_emergency_fund", saved_amount: peso(balance.emergency), savedAmount: peso(balance.emergency), target_amount: 30000, targetAmount: 30000, monthly_target: 1000, monthlyTarget: 1000, monthly_survival_expense: 15000, monthlySurvivalExpense: 15000, months_covered: Number((peso(balance.emergency) / 15000).toFixed(2)), monthsCovered: Number((peso(balance.emergency) / 15000).toFixed(2)), linkedWalletId: EMERGENCY_WALLET_ID, linked_wallet_id: EMERGENCY_WALLET_ID, linkedWalletName: "Emergency Fund Wallet", linked_wallet_name: "Emergency Fund Wallet", status: "active", notes: `Demo emergency deposits: ${emergencyTotal}` }, localUserId, first));

  return {
    profile: { id: YOUNG_PROFESSIONAL_DEMO_PROFILE_ID, name: YOUNG_PROFESSIONAL_DEMO_PROFILE_NAME, description: "A realistic 1-year sample profile for a BPO employee with salary income, side hustle income, daily spending, savings, emergency fund activity, and budget behavior.", generatedAt: new Date(now).toISOString(), monthRange: { start: monthKey(list[0]), end: monthKey(list[11]) } },
    records: out,
    summary: { months: 12, wallets: out.wallets.length, incomeSources: out.incomeSources.length, incomeRecords: out.walletTransactions.filter((item) => item.type === "income").length, expenses: out.expenses.length, walletTransactions: out.walletTransactions.length, transfers: out.transfers.length, budgets: out.budgets.length, savingsGoals: out.savingsGoals.length, emergencyFundRecords: out.emergencyFund.length, totalRecords: out.wallets.length + out.incomeSources.length + out.expenses.length + out.walletTransactions.length + out.transfers.length + out.budgets.length + out.savingsGoals.length + out.emergencyFund.length },
  };
}
