import {
  LOCAL_FINANCE_STORES,
  getLocalRecordsByUser,
  hardDeleteLocalRecord,
  upsertLocalRecord,
} from "./localFinanceStore";
import { CLARA_LIFE_PROFILE_ID, saveClaraLifeProfile } from "./clara-life-profile";
import { DEBT_OBLIGATION_STORE, upsertDebtObligation } from "./debtObligationStore";

const SOURCE = "clara_sample_demo_seed";
const PREFIX = "clara_sample_max";
const SCHEDULE_KEY_PREFIX = "clara_schedule_events_v2";
const USER_CONTEXT_STORY_KEY = "CLARA_USER_CONTEXT_STORY_V1";
const SAMPLE_ACTIVE_KEY = "CLARA_SAMPLE_MAX_ACTIVE_V1";
const SAMPLE_BACKUP_KEY = "CLARA_SAMPLE_MAX_REAL_BACKUP_V1";

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
  return { id: recordId, createdAt, created_at: createdAt, updatedAt: n(), updated_at: n(), deletedAt: null, deleted_at: null, syncStatus: "local_only", source: SOURCE, demoSeed: true };
}

function wallet(key, name, balance, type, order) {
  return { ...base(id("wallet", key), at(monthDate(order + 1))), name, title: name, label: name, type, wallet_type: type, balance, current_balance: balance, wallet_balance: balance, available_balance: balance, starting_balance: balance, sort_order: order };
}

function budgetHeader() {
  const month = monthKey();
  return { ...base(id("budget", "monthly_header"), at(monthStart())), is_plan_header: true, plan_type: "monthly_budget", type: "monthly_budget", category: "__monthly_budget__", budget_category: "__monthly_budget__", title: "Monthly Spending Plan", name: "Monthly Spending Plan", status: "active", is_active: true, is_complete: true, complete: true, plan_is_complete: true, declared_amount: 32000, declared_budget: 32000, monthly_budget_amount: 32000, total_declared_budget: 32000, amount: 32000, month, budget_month: month, month_key: month, budget_cycle: "monthly", cycle_type: "monthly", period_type: "monthly", cycle_start: monthStart(), cycle_end: monthEnd(), period_start: monthStart(), period_end: monthEnd() };
}

function budget(key, title, amount, order, needType = "need") {
  const month = monthKey();
  return { ...base(id("budget", key), at(monthStart())), title, name: title, category: title, budget_category: title, section_key: key, status: "active", is_active: true, amount, allocated_amount: amount, budget_amount: amount, total_budget: amount, budget: amount, need_type: needType, month, budget_month: month, month_key: month, sort_order: order };
}

function expense({ key, walletId, amount, category, title, date, status = "planned", needType = "need", notes = "Demo transaction" }) {
  return { ...base(id("expense", key), at(date)), wallet_id: walletId, amount, category, budget_category: category, expense_category: category, title, name: title, merchant: title, date: at(date), created_at: at(date), planning_status: status, budget_status: status, need_type: needType, unplanned_reason: status === "unplanned" ? notes : "", notes };
}

function txnFromExpense(row) {
  return { ...base(id("wallet_txn", `for_${row.id}`), row.created_at), wallet_id: row.wallet_id, amount: row.amount, type: "expense", category: row.category, need_type: row.need_type, planning_status: row.planning_status, unplanned_reason: row.unplanned_reason || "", expense_id: row.id, title: row.title, notes: row.notes, created_at: row.created_at };
}

function income(key, walletId, amount, title, date) {
  return { ...base(id("wallet_txn", key), at(date)), wallet_id: walletId, amount, type: "income", category: "Income", source_type: "salary", title, notes: title, created_at: at(date) };
}

function goal(key, name, saved, target, order) {
  return { ...base(id("savings_goal", key), at(monthDate(order + 2))), name, title: name, saved_amount: saved, savedAmount: saved, saved, current_amount: saved, target_amount: target, targetAmount: target, target, goal_amount: target, target_date: addDays(order * 90 + 120), status: "active", sort_order: order };
}

function memory(key, category, summary, spendingImpact, supportStyle) {
  return { ...base(id("memory", key), at(monthDate(2))), recordKind: "ai_financial_memory", category, summary, spendingImpact, supportStyle, status: "active", userApproved: true };
}

function schedule(key, title, days, time, type, amount, note) {
  return { id: id("schedule", key), title, date: addDays(days), time, type, amount, estimatedImpact: amount, cost: amount, note, description: note, source: SOURCE, demoSeed: true };
}

function memorySection(title, bullets) {
  return { id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), title, type: "fixed", bullets, createdAt: at(monthDate(1)), updatedAt: n() };
}

function buildMemoryBank() {
  const sections = [
    memorySection("Identity", ["User is Max, a 26-year-old Filipino young professional.", "User identifies as someone learning to pause before spending.", "User wants CLARA to treat him as a person building discipline, not just a tracker user.", "User values independence, stability, family support, and personal growth."]),
    memorySection("Work", ["User works in a BPO call center environment.", "User works long night shifts that can lead to exhaustion.", "User has a cutoff-based income rhythm around the tenth and twenty-fifth of the month.", "Work stress often lowers the user's resistance to convenience spending.", "User tends to need direct money guidance after tiring shifts."]),
    memorySection("Money", ["User is actively building a pause-before-spending habit.", "User wants stronger discipline around food and convenience spending.", "User is saving toward a motorcycle while protecting emergency money.", "User has a tendency to feel confident after payday and loosen spending rules.", "User prefers budgeting advice that separates real wallet money from planned budget room.", "User wants CLARA to warn before treating wants as needs.", "User has a small installment obligation that should stay visible in decisions."]),
    memorySection("Emotional", ["User is motivated but can be tempted by comfort purchases after exhausting shifts.", "User may use food or small purchases as a quick reward when tired.", "User responds better to calm correction than guilt-based reminders.", "User can feel proud when spending improves, so CLARA should reinforce progress.", "User may get frustrated when advice sounds generic or robotic."]),
    memorySection("Health", ["Night shift work can affect the user's energy and food decisions.", "User benefits from protecting rest before making purchase decisions.", "User is an average basketball player and may respond well to active alternatives.", "Fatigue is a meaningful signal before food delivery or checkout behavior."]),
    memorySection("Routine", ["User has a night-shift work rhythm.", "Payday periods are higher-risk windows for impulse spending.", "After-shift hours are a common risk window for convenience food.", "User benefits from short check-ins before work and before checkout.", "User has schedule commitments that may affect same-week spending decisions."]),
    memorySection("Relationships", ["User may support family when needed.", "Social meals can create spending pressure for the user.", "User benefits from reminders that social spending should still fit the plan.", "User wants advice that respects family responsibility without letting it erase personal goals."]),
    memorySection("Home", ["User has recurring household or family contribution responsibilities.", "Home-related bills should be protected before entertainment spending.", "User benefits from seeing household responsibility as a fixed priority."]),
    memorySection("Food", ["Food delivery is one of the user's main spending leak areas.", "Convenience food is more tempting during low-energy periods.", "User is working on replacing impulse food purchases with planned meals or cheaper alternatives.", "Coffee and quick meals can become frequent small leaks.", "User needs food advice that is practical, not shame-based."]),
    memorySection("Lifestyle", ["User enjoys small rewards but wants them controlled by the budget.", "Shopping apps can trigger impulse purchases after payday.", "User wants CLARA to compare lifestyle spending against longer-term goals.", "Entertainment is allowed when planned, but should not borrow from protected money."]),
    memorySection("Growth", ["User is practicing better financial discipline through repeated small decisions.", "User wants progress to feel visible and encouraging.", "User is learning to ask CLARA before spending instead of after regretting it.", "User responds well when CLARA explains the lesson behind the decision.", "User is building identity around being intentional with money."]),
    memorySection("Decision Style", ["User often asks affordability questions before buying.", "User needs CLARA to consider wallet, budget, schedule, goals, and obligations together.", "User prefers a clear recommendation before explanation.", "User dislikes static or canned answers and expects context-aware reasoning.", "If the user's message is vague, CLARA should ask one clarifying question instead of guessing."]),
    memorySection("Support Style", ["User responds best to direct and practical coaching.", "User does not want over-explaining during quick decisions.", "User prefers short, natural mobile-chat replies.", "User wants CLARA to sound like a real money companion, not a support bot.", "User appreciates encouragement when there is real progress."]),
    memorySection("Triggers", ["Payday confidence can lower the user's spending guard.", "Tiredness after night shift can trigger food delivery or small rewards.", "Stress can make convenience spending feel justified.", "Social invitations can pressure the user to spend outside the plan.", "Shopping app browsing can turn into unplanned checkout behavior."]),
    memorySection("Protection", ["Emergency fund should be treated as protected money, not free cash.", "Motorcycle savings should be protected from convenience spending.", "Bills, household contribution, and debt obligations should be checked before wants.", "CLARA should protect the user from confusing budget room with actual wallet safety.", "CLARA should ask before spending when a purchase may touch protected goals."]),
  ];

  return { id: "clara-user-context-story", type: "user_context_story", schemaVersion: 8, sections, createdAt: at(monthDate(1)), updatedAt: n(), sectionCount: sections.length, bulletCount: sections.reduce((total, section) => total + section.bullets.length, 0), source: "clara_user_context_story", demoSeed: true };
}

function buildSample() {
  const payroll = id("wallet", "payroll");
  const daily = id("wallet", "daily");
  const savings = id("wallet", "savings");
  const emergency = id("wallet", "emergency");
  const memoryBank = buildMemoryBank();
  const wallets = [wallet("payroll", "Payroll Wallet", 12500, "bank", 1), wallet("daily", "Daily Spending Wallet", 2800, "cash", 2), wallet("savings", "Savings Wallet", 8000, "savings", 3), wallet("emergency", "Emergency Reserve Wallet", 5000, "emergency", 4)];
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
      memory("payday_window", "Trigger", "Max has a payday risk window where small rewards can become unplanned purchases.", "Payday confidence can weaken budget discipline.", "Ask before checkout during payday week."),
      memory("food_boundary", "Food", "Max needs practical alternatives before ordering convenience food.", "Food cravings can become repeated small leaks.", "Offer one cheaper replacement option."),
      memory("budget_wallet_confusion", "Decision Style", "Max needs wallet safety and budget room explained separately.", "Confusing the two can make a purchase feel safer than it is.", "Show the direct recommendation first."),
      memory("emergency_protection", "Protection", "Max wants emergency money treated as protected.", "Counting protected money as free cash can create false confidence.", "Do not include emergency money in normal spendable advice."),
    ],
    memoryBank,
    scheduleEvents: [schedule("work", "Work Shift", 0, "9:00 PM - 6:00 AM", "Work", 0, "Night shift BPO schedule."), schedule("dentist", "Dentist Appointment", 1, "3:00 PM", "Health", 1500, "Prepare dental cost."), schedule("dinner", "Team Dinner", 3, "7:00 PM", "Social", 800, "Possible team dinner spending pressure."), schedule("motorcycle_viewing", "Motorcycle Viewing", 4, "2:00 PM", "Goal", 0, "Do not decide impulsively."), schedule("rent", "Rent Contribution Due", 6, "10:00 AM", "Bill", 4500, "Monthly family or house contribution.")],
    profile: { personality: "Convenience spender", status: "BPO Call Center Agent", age: "26", dependents: "Self, family support when needed", responsibility: "Bills, food, savings, and occasional family support", incomeRhythm: "Every 10 and 25 cutoff", coachingStyle: "Direct and practical", currentFocus: "Build emergency fund and save for a motorcycle", topValues: "Stability, independence, discipline, family support", meaningfulGoal: "Own a motorcycle while keeping emergency fund protected", financialFear: "Running out before payday because of small unplanned spending", spendingTrigger: "Stress, tiredness after night shift, payday confidence, food cravings", nonNegotiable: "Emergency fund and motorcycle savings should not be touched for wants", identityStatement: "I am learning to pause before spending and protect my future self.", currentLifeSeason: "26-year-old Filipino BPO young professional on night shift", emotionalState: "Motivated but tempted by convenience spending after tiring shifts", replacementActivity: "Rest, home-prepped food, short walk, basketball, or content creation instead of checkout", memoryNotes: memoryBank.sections.map((section) => ({ id: section.id, category: section.title, bullets: section.bullets, summary: section.bullets.join(" "), status: "active", userApproved: true, createdAt: section.createdAt, updatedAt: section.updatedAt })), personalityQuizAnswers: { incomePattern: "Every cutoff", livingSituation: "With family", responsibilities: "Rent/Bills", workType: "BPO/Call center", mainFinancialGoal: "Emergency fund", motivationStyle: "Direct honesty", wallets: "Multiple", budgets: "Strict budget", emergencyFund: "Partly built", debt: "Small debt", paydayCycle: "Every 10 and 25" } },
    debts: [{ id: id("debt", "phone_installment"), title: "Phone Installment", lender: "Device Plan", debtType: "installment", totalDebt: 12000, monthlyDebt: 1500, interestRate: 0, dueDate: addDays(8), notes: "Demo small monthly obligation." }],
  };
}

async function upsertMany(store, records, localUserId) {
  for (const record of records) await upsertLocalRecord(store, record, localUserId);
}

function readJsonStorage(key) {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try { return JSON.parse(window.localStorage.getItem(key) || "null"); } catch { return null; }
}

function saveSchedule(user, events) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const key = scheduleKeyFor(user);
  let existing = [];
  try { existing = JSON.parse(window.localStorage.getItem(key) || "[]"); } catch { existing = []; }
  const sampleIds = new Set(events.map((event) => event.id));
  window.localStorage.setItem(key, JSON.stringify([...(Array.isArray(existing) ? existing : []).filter((event) => !sampleIds.has(event?.id)), ...events]));
}

function saveMemoryBank(memoryBank) {
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(USER_CONTEXT_STORY_KEY, JSON.stringify(memoryBank));
  window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: memoryBank }));
}

function getSampleActiveState() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  return readJsonStorage(SAMPLE_ACTIVE_KEY);
}

export function isClaraSampleUserDataActive() {
  return Boolean(getSampleActiveState()?.active);
}

async function backupRealDataBeforeSample(user, localUserId) {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (isClaraSampleUserDataActive() || window.localStorage.getItem(SAMPLE_BACKUP_KEY)) return;

  const lifeProfileRecords = await getLocalRecordsByUser(LOCAL_FINANCE_STORES.lifeProfile, { localUserId, includeDeleted: true });
  const scheduleKey = scheduleKeyFor(user);
  const backup = { createdAt: n(), localUserId, scheduleKey, scheduleRaw: window.localStorage.getItem(scheduleKey), memoryStoryRaw: window.localStorage.getItem(USER_CONTEXT_STORY_KEY), lifeProfileRecords: Array.isArray(lifeProfileRecords) ? lifeProfileRecords : [] };
  window.localStorage.setItem(SAMPLE_BACKUP_KEY, JSON.stringify(backup));
}

async function removeSampleFinanceRecords(localUserId) {
  const sample = buildSample();
  const deleteJobs = [
    ...sample.wallets.map((record) => [LOCAL_FINANCE_STORES.wallets, record.id]),
    ...sample.transactions.map((record) => [LOCAL_FINANCE_STORES.walletTransactions, record.id]),
    ...sample.expenses.map((record) => [LOCAL_FINANCE_STORES.expenses, record.id]),
    ...sample.budgets.map((record) => [LOCAL_FINANCE_STORES.budgets, record.id]),
    ...sample.goals.map((record) => [LOCAL_FINANCE_STORES.savingsGoals, record.id]),
    [LOCAL_FINANCE_STORES.emergencyFund, sample.emergencyFund.id],
    ...sample.memories.map((record) => [LOCAL_FINANCE_STORES.aiFinancialMemory, record.id]),
    ...sample.debts.map((record) => [DEBT_OBLIGATION_STORE, record.id]),
  ];

  for (const [store, recordId] of deleteJobs) {
    await hardDeleteLocalRecord(store, recordId, localUserId);
  }
}

function restoreScheduleFromBackup(user, backup) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const key = backup?.scheduleKey || scheduleKeyFor(user);
  if (typeof backup?.scheduleRaw === "string") window.localStorage.setItem(key, backup.scheduleRaw);
  else window.localStorage.removeItem(key);
}

function restoreMemoryBankFromBackup(backup) {
  if (typeof window === "undefined" || !window.localStorage) return;
  if (typeof backup?.memoryStoryRaw === "string") {
    window.localStorage.setItem(USER_CONTEXT_STORY_KEY, backup.memoryStoryRaw);
    window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: readJsonStorage(USER_CONTEXT_STORY_KEY) }));
  } else {
    window.localStorage.removeItem(USER_CONTEXT_STORY_KEY);
    window.dispatchEvent(new CustomEvent("clara-user-context-story-updated", { detail: null }));
  }
}

async function restoreLifeProfileFromBackup(backup, localUserId) {
  const records = Array.isArray(backup?.lifeProfileRecords) ? backup.lifeProfileRecords : [];
  if (records.length) {
    for (const record of records) await upsertLocalRecord(LOCAL_FINANCE_STORES.lifeProfile, record, localUserId);
    return;
  }
  await hardDeleteLocalRecord(LOCAL_FINANCE_STORES.lifeProfile, CLARA_LIFE_PROFILE_ID, localUserId);
}

export async function activateClaraSampleUserData({ user = null } = {}) {
  const localUserId = localUserIdFor(user);
  const sample = buildSample();

  await backupRealDataBeforeSample(user, localUserId);
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
  saveMemoryBank(sample.memoryBank);

  if (typeof window !== "undefined" && window.localStorage) window.localStorage.setItem(SAMPLE_ACTIVE_KEY, JSON.stringify({ active: true, localUserId, activatedAt: n() }));

  return { mode: "sample", localUserId, wallets: sample.wallets.length, expenses: sample.expenses.length, budgets: sample.budgets.length, savingsGoals: sample.goals.length, scheduleEvents: sample.scheduleEvents.length, memories: sample.memories.length, memoryBankSections: sample.memoryBank.sectionCount, memoryBankBullets: sample.memoryBank.bulletCount };
}

export async function restoreClaraRealUserData({ user = null } = {}) {
  const localUserId = localUserIdFor(user);
  const backup = readJsonStorage(SAMPLE_BACKUP_KEY) || null;

  await removeSampleFinanceRecords(localUserId);
  restoreScheduleFromBackup(user, backup);
  restoreMemoryBankFromBackup(backup);
  await restoreLifeProfileFromBackup(backup, localUserId);

  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(SAMPLE_ACTIVE_KEY);
    window.localStorage.removeItem(SAMPLE_BACKUP_KEY);
  }

  return { mode: "real", localUserId };
}

export async function toggleClaraSampleUserData({ user = null } = {}) {
  if (isClaraSampleUserDataActive()) return restoreClaraRealUserData({ user });
  return activateClaraSampleUserData({ user });
}
