const NEEDS = "Not enough data to generate result";
const NO_LEAK = "No major leak detected";

const clean = (value = "") => String(value || "").replace(/\s+/g, " ").trim();
const moneyNumber = (value = "") => Number(clean(value).replace(/[^0-9.-]/g, "")) || 0;
const toArray = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

function money(value = 0) {
  return `₱${moneyNumber(value).toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

function cardBy(title, eyebrow = "") {
  return Array.from(document.querySelectorAll(".clara-forecast-report-card")).find((card) => {
    const cardTitle = clean(card.querySelector("h3")?.textContent);
    const cardEyebrow = clean(card.querySelector(".clara-forecast-report-eyebrow")?.textContent);
    return cardTitle === title && (!eyebrow || cardEyebrow === eyebrow);
  });
}

function rowValue(card, label) {
  const target = clean(label).toLowerCase();
  const row = Array.from(card?.querySelectorAll?.(".clara-forecast-report-stat-row") || []).find((item) => {
    return clean(item.querySelector("span")?.textContent).toLowerCase() === target;
  });
  return clean(row?.querySelector("strong")?.textContent);
}

function setHero(card, value) {
  const heroes = Array.from(card.querySelectorAll(".clara-forecast-report-hero"));
  const hero = heroes[0] || document.createElement("div");
  hero.className = "clara-forecast-report-hero";
  hero.textContent = value;
  heroes.slice(1).forEach((node) => node.remove());
  if (!hero.isConnected) card.querySelector("h3")?.after(hero);
}

function setRows(card, rows) {
  const wrap = card.querySelector(".clara-forecast-report-stats");
  if (!wrap) return;
  wrap.replaceChildren(...rows.map(([label, value]) => {
    const row = document.createElement("div");
    const left = document.createElement("span");
    const right = document.createElement("strong");
    row.className = "clara-forecast-report-stat-row";
    left.textContent = label;
    right.textContent = value;
    row.append(left, right);
    return row;
  }));
}

function firstNumber(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== "") return moneyNumber(value);
  }
  return 0;
}

function getRecordDate(record = {}) {
  const raw = record.date || record.createdAt || record.created_at || record.updatedAt || record.updated_at || record.lastActivityAt || record.last_activity_at || record.targetDate || record.target_date || "";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function selectedHorizonMonths() {
  const state = window.__CLARA_FORECAST_REPORT_ROUTER_STATE__ || {};
  return Math.min(Math.max(Math.round(Number(state.selectedHorizonMonths)) || 1, 1), 12);
}

function isRecentEnough(date, horizonMonths = 1) {
  if (!date) return false;
  const boundary = new Date();
  boundary.setMonth(boundary.getMonth() - horizonMonths);
  return date >= boundary;
}

function recordsInWindow(records = [], horizonMonths = 1) {
  return toArray(records).filter((record) => isRecentEnough(getRecordDate(record), horizonMonths));
}

function firstText(source = {}, keys = []) {
  for (const key of keys) {
    const value = source?.[key];
    if (clean(value)) return clean(value);
  }
  return "";
}

function isExpenseTransaction(transaction = {}) {
  const type = firstText(transaction, ["type", "transaction_type", "kind"]).toLowerCase();
  return ["expense", "withdrawal", "debit", "spend", "purchase", "cash_out"].includes(type);
}

function getExpenseAmount(expense = {}) {
  return firstNumber(expense, ["amount", "total", "value"]);
}

function snapshotRecords() {
  const snapshot = window.__CLARA_LAST_FORECAST_PHASE_ONE_SNAPSHOT__ || window.__CLARA_FORECAST_REPORT_ROUTER_STATE__?.snapshot || {};
  return snapshot.forecastRecords || {};
}

function emergencySaved(emergencyFund = {}) {
  return firstNumber(emergencyFund, ["savedAmount", "saved_amount", "saved", "currentAmount", "current_amount", "amount", "balance"]);
}

function emergencyTarget(emergencyFund = {}) {
  return firstNumber(emergencyFund, ["targetAmount", "target_amount", "target", "goal_amount"]);
}

function goalSaved(goal = {}) {
  return firstNumber(goal, ["savedAmount", "saved_amount", "saved", "current_amount", "currentAmount", "amount", "balance"]);
}

function goalTarget(goal = {}) {
  return firstNumber(goal, ["targetAmount", "target_amount", "target", "goal_amount"]);
}

function compactCategory(value = "") {
  const category = clean(value)
    .replace(/^likely leak:\s*/i, "")
    .replace(/\s+leak$/i, "")
    .trim();
  const normalized = category.toLowerCase();
  if (!category || normalized.includes("not enough data") || normalized.includes("no major") || normalized.includes("not fixed")) return "";
  return category.length > 22 ? `${category.slice(0, 19).trim()}…` : category;
}

function leakCategory(slideThree, slideFour) {
  return compactCategory(rowValue(slideThree, "Biggest Overspending Category"))
    || compactCategory(rowValue(slideFour, "Biggest Cost Driver"))
    || compactCategory(slideThree?.querySelector(".clara-forecast-report-hero")?.textContent);
}

function leakAmount(slideFour, slideFive, slideNine) {
  const candidates = [
    rowValue(slideFour, "Forecasted Leak Cost"),
    rowValue(slideFive, "Leak Cost Carried Forward"),
    rowValue(slideFive, "Money Not Redirected"),
    rowValue(slideNine, "Highest Impact Change"),
    slideNine?.querySelector(".clara-forecast-report-hero")?.textContent,
  ];
  return moneyNumber(candidates.find((value) => moneyNumber(value) > 0));
}

function goodHabitsToProtect() {
  const records = snapshotRecords();
  const hasIncome = toArray(records.incomes).length > 0 || toArray(records.incomeSources).length > 0;
  const emergencyFund = records.emergencyFund || null;
  const hasEmergency = emergencySaved(emergencyFund || {}) > 0 || emergencyTarget(emergencyFund || {}) > 0;
  const savingsGoals = toArray(records.savingsGoals);
  const hasSavings = savingsGoals.length > 0 || savingsGoals.some((goal) => goalSaved(goal) > 0 || goalTarget(goal) > 0);
  const hasBudget = toArray(records.budgets).length > 0;

  if (hasIncome && (hasSavings || hasEmergency)) return "Income + savings";
  if (hasBudget && hasEmergency) return "Budget + protection";
  if (hasIncome) return "Income";
  if (hasSavings || hasEmergency) return "Savings";
  return NEEDS;
}

function redirectTo() {
  const records = snapshotRecords();
  const emergencyFund = records.emergencyFund || null;
  const saved = emergencySaved(emergencyFund || {});
  const target = emergencyTarget(emergencyFund || {});
  const savingsGoals = toArray(records.savingsGoals);
  const hasSavingsGoal = savingsGoals.length > 0 || savingsGoals.some((goal) => goalSaved(goal) > 0 || goalTarget(goal) > 0);

  if (target > 0 && saved < target) return "Emergency fund";
  if (hasSavingsGoal) return "Savings goal";
  if (toArray(records.debtObligations).length > 0) return "Debt";
  return "Emergency + savings";
}

function actionDifficulty(amount = 0) {
  if (amount <= 0) return "Manageable";
  const records = snapshotRecords();
  const horizon = selectedHorizonMonths();
  const expenses = recordsInWindow(records.expenses, horizon);
  const transactionExpenses = recordsInWindow(toArray(records.walletTransactions).filter(isExpenseTransaction), horizon);
  const expensesToUse = expenses.length ? expenses : transactionExpenses;
  const totalExpenses = expensesToUse.reduce((total, expense) => total + getExpenseAmount(expense), 0);
  return totalExpenses > 0 && amount / totalExpenses >= 0.3 ? "Needs discipline" : "Manageable";
}

function bodyCopy(goodHabits, category, amount) {
  const hasEnoughData = goodHabits !== NEEDS || Boolean(category) || amount > 0;
  return hasEnoughData
    ? "The better future does not require changing everything. CLARA starts by protecting what works and fixing the biggest leak first."
    : "CLARA needs more local records before it can recommend the highest-impact adjustment.";
}

function finalizeSlideNine() {
  const slide = cardBy("Keep the Good, Fix the Bad", "09 / POSSIBILITY PLAN");
  if (!slide || slide.dataset.slideNineFinal === "true") return;

  const slideThree = cardBy("Risky Habits CLARA Found", "03 / REALITY CHECK");
  const slideFour = cardBy("Cost of These Habits", "04 / REALITY CHECK");
  const slideFive = cardBy("If Nothing Changes", "05 / BAD FUTURE PROJECTION");
  const category = leakCategory(slideThree, slideFour);
  const amount = leakAmount(slideFour, slideFive, slide);
  const recover = amount > 0 ? `Recover ${money(amount)}` : "Build more history";
  const goodHabits = goodHabitsToProtect();

  slide.classList.add("clara-forecast-slide-nine-final");
  setHero(slide, amount > 0 ? recover : "No major leak to fix");
  setRows(slide, [
    ["Good Habits to Protect", goodHabits],
    ["Main Leak to Fix", category || NO_LEAK],
    ["Recommended Focus", category ? `Reduce ${category}` : "Track spending first"],
    ["Redirect To", redirectTo()],
    ["Highest Impact Change", recover],
    ["Action Difficulty", actionDifficulty(amount)],
    ["Next Step", category ? `Set ${category} limit` : "Track 7 days"],
  ]);

  const body = slide.querySelector(".clara-forecast-report-body");
  if (body) body.textContent = bodyCopy(goodHabits, category, amount);

  slide.dataset.slideNineFinal = "true";
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FORECAST_SLIDE_NINE_FINAL__) return;
  window.__CLARA_FORECAST_SLIDE_NINE_FINAL__ = true;
  const run = () => requestAnimationFrame(finalizeSlideNine);
  new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener("click", run, true);
  run();
}

install();