import "./installClaraOrbChatHandoff";
import "./installClaraOrbCommandChatRouting";
import "./installClaraBuyCheckKeyboardGuard";
import "./installClaraOrbViewportOwnershipGuard";
import { fetchCanonicalClaraProfile, resolveCanonicalFirstName } from "@/lib/canonical-clara-profile";
import {
  FINANCE_DATA_UPDATED_EVENT,
  getExpenses,
  getSavingsGoals,
  getWallets,
} from "@/lib/financeRepository";
import {
  getIncomeSourceActivityLog,
  getIncomeSources,
} from "@/lib/incomeHubRepository";
import {
  DEBT_OBLIGATIONS_UPDATED_EVENT,
  getDebtObligations,
} from "@/lib/debtObligationStore";
import {
  DEBT_OBLIGATION_SCHEDULE_SOURCE,
  buildDebtObligationScheduleProjection,
} from "@/lib/financialCardScheduleProjection";
import { getRecurrenceOccurrences } from "@/lib/recurringCashFlowRepository";
import {
  CLARA_MONEY_ROUTINE_UPDATED_EVENT,
  getClaraMoneyScheduleStorageKey,
  readClaraMoneyRoutine,
} from "@/lib/clara-money-schedule-repository";
import {
  firstValidNumber,
  getPHMonthKey,
  getTransactionDate,
  normalizeLower,
} from "@/utils/dashboard/dashboardHelpers";

const RUNTIME_KEY = "__claraOrbGreetingRuntime__";
const PRODUCTION_GREETING_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-visual-offset] > div:first-child > p';
const TUTORIAL_GREETING_SELECTOR =
  '[data-clara-tutorial-orb-intro="true"] [data-clara-orb-visual-offset] > div:first-child > p';
const TUTORIAL_ROOT_SELECTOR = '[data-clara-tutorial-orb-intro="true"]';
const ORB_COMPOSITION_SELECTOR = '[data-clara-orb-composition="true"]';
const ORB_LAUNCHER_SELECTOR = '[data-clara-orb-launcher="true"]';
const ORB_IDLE_COPY_SELECTOR = ".clara-orb-idle-copy";
const MEANS_METRIC_ATTR = "data-clara-orb-means-metric";
const MEANS_PLACEHOLDER_ATTR = "data-clara-orb-means-placeholder";
const INCOME_HUB_UPDATED_EVENT = "clara-income-hub-updated";
const INCOME_HUB_CASH_IN_TYPE = "add_money";
const SAVINGS_GOAL_SCHEDULE_SOURCE = "savings_goal_card_projection";

function resolveGreetingLabel() {
  return (
    document.querySelector(TUTORIAL_GREETING_SELECTOR) ||
    document.querySelector(PRODUCTION_GREETING_SELECTOR)
  );
}

function resolveTutorialIdentity(label) {
  const tutorialRoot = label?.closest?.(TUTORIAL_ROOT_SELECTOR);
  if (!tutorialRoot) return null;

  return {
    firstName: String(tutorialRoot.dataset.claraTutorialOrbName || "").trim(),
  };
}

function isOrbCommandModeVisible(label) {
  const composition = label?.closest?.(ORB_COMPOSITION_SELECTOR);
  const launcher = composition?.querySelector?.(ORB_LAUNCHER_SELECTOR);
  return launcher?.dataset?.orbCommandVisible === "true";
}

function clearGreetingPresentation(label) {
  if (!label) return;

  delete label.dataset.claraOrbUserGreeting;
  delete label.dataset.claraOrbGreetingScope;
  label.style.fontSize = "";
  label.style.fontWeight = "";
  label.style.lineHeight = "";
  label.style.letterSpacing = "";
  label.style.textTransform = "";
  label.style.color = "";
}

function money(value) {
  const amount = Number(value || 0);
  return `₱${Math.max(0, amount).toLocaleString("en-PH", {
    maximumFractionDigits: 0,
  })}`;
}

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function endOfCurrentMonthKey() {
  const now = new Date();
  return localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function addLocalDaysKey(dateKey, days) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + Number(days || 0));
  return localDateKey(date);
}

function formatHorizonDate(dateKey) {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "the end of this month";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function parseScheduleEvents(user) {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const key = getClaraMoneyScheduleStorageKey(user);
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function futureRoutineAmount(user, horizonEnd = endOfCurrentMonthKey()) {
  const routine = readClaraMoneyRoutine(user);
  if (!routine || routine.active === false || !Array.isArray(routine.days)) return 0;

  const byWeekday = new Map(
    routine.days.map((day) => [
      Number(day?.weekdayIndex ?? day?.weekday_index),
      Math.max(0, Number(day?.totalCentavos ?? day?.total_centavos ?? 0)) / 100,
    ])
  );

  const now = new Date();
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const horizonMatch = String(horizonEnd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const end = horizonMatch
    ? new Date(Number(horizonMatch[1]), Number(horizonMatch[2]) - 1, Number(horizonMatch[3]))
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let total = 0;

  while (cursor <= end) {
    total += byWeekday.get(cursor.getDay()) || 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function futureScheduledAmount(user, horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return parseScheduleEvents(user).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
    const source = normalizeLower(event?.source);
    const savingsGoalProjection =
      source === SAVINGS_GOAL_SCHEDULE_SOURCE || event?.savingsGoalId || event?.savings_goal_id;
    const debtProjection =
      source === DEBT_OBLIGATION_SCHEDULE_SOURCE ||
      event?.debtObligationId ||
      event?.debt_obligation_id;
    if (!date || date <= today || date > horizonEnd) return sum;
    if (
      direction !== "out" ||
      event?.affectsMoney === false ||
      savingsGoalProjection ||
      debtProjection
    ) {
      return sum;
    }
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}

function futureDebtObligationAmount(records = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return buildDebtObligationScheduleProjection(records).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
    if (!date || date <= today || date > horizonEnd) return sum;
    if (direction !== "out") return sum;
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);
}

function savingsGoalDate(goal = {}) {
  return String(
    goal?.planned_use_date ||
      goal?.plannedUseDate ||
      goal?.due_date ||
      goal?.dueDate ||
      goal?.target_date ||
      goal?.targetDate ||
      ""
  ).slice(0, 10);
}

function savingsGoalMoney(...values) {
  for (const value of values) {
    const amount = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
    if (Number.isFinite(amount)) return Math.max(0, amount);
  }
  return 0;
}

function futureSavingsGoalAmount(goals = [], horizonEnd = endOfCurrentMonthKey()) {
  const today = localDateKey();

  return (Array.isArray(goals) ? goals : []).reduce((sum, goal) => {
    const status = normalizeLower(goal?.status);
    const inactive = Boolean(
      goal?.deletedAt ||
        goal?.deleted_at ||
        goal?.isArchived === true ||
        goal?.is_archived === true ||
        ["deleted", "archived", "cancelled", "canceled"].includes(status)
    );
    if (inactive) return sum;

    const date = savingsGoalDate(goal);
    if (!date || date <= today || date > horizonEnd) return sum;

    const target = savingsGoalMoney(
      goal?.target_amount,
      goal?.targetAmount,
      goal?.goal_amount,
      goal?.goalAmount,
      goal?.target,
      goal?.amount
    );
    const saved = savingsGoalMoney(
      goal?.saved_amount,
      goal?.savedAmount,
      goal?.current_amount,
      goal?.currentAmount,
      goal?.saved,
      goal?.progress_amount,
      goal?.progressAmount,
      goal?.amount_saved
    );

    return sum + Math.max(target - saved, 0);
  }, 0);
}

function getOwnerIdentity(profile = {}) {
  return (
    profile?.id ||
    profile?.user_id ||
    profile?.userId ||
    profile?.email ||
    profile?.user?.id ||
    profile?.user?.email ||
    "local-user"
  );
}

function walletBalance(wallet = {}) {
  return Math.max(
    0,
    firstValidNumber(
      wallet?.balance,
      wallet?.current_balance,
      wallet?.wallet_balance,
      wallet?.available_balance,
      wallet?.starting_balance
    )
  );
}

function isMoneyLentWallet(wallet = {}) {
  const type = normalizeLower(wallet?.type || wallet?.wallet_type || wallet?.walletType);
  return ["money_lent", "money-lent", "lent", "receivable"].includes(type);
}

function currentAvailableMoney(wallets = []) {
  return (Array.isArray(wallets) ? wallets : []).reduce(
    (sum, wallet) => (isMoneyLentWallet(wallet) ? sum : sum + walletBalance(wallet)),
    0
  );
}

function currentMoneyLentUnavailable(wallets = []) {
  return (Array.isArray(wallets) ? wallets : []).reduce(
    (sum, wallet) => (isMoneyLentWallet(wallet) ? sum + walletBalance(wallet) : sum),
    0
  );
}

function stableIncomeMinimum(source = {}) {
  return Math.max(
    0,
    firstValidNumber(
      source?.minimumStableIncome,
      source?.minimum_stable_income,
      source?.minimumExpectedIncome,
      source?.minimum_expected_income,
      source?.expectedAmount,
      source?.expected_amount,
      source?.recurringAmount,
      source?.recurring_amount,
      source?.monthlyAmount,
      source?.monthly_amount
    )
  );
}

function stableIncomeRecurrence(source = {}) {
  return source?.incomeRecurrence || source?.income_recurrence || null;
}

function resolveMeansHorizonDate(incomeSources = []) {
  const today = localDateKey();
  const searchEnd = addLocalDaysKey(today, 62);
  const candidates = [];

  (Array.isArray(incomeSources) ? incomeSources : []).forEach((source) => {
    if (normalizeLower(source?.stability) !== "stable") return;
    if (source?.useForBudgetTiming === false || source?.use_for_budget_timing === false) return;
    const recurrence = stableIncomeRecurrence(source);
    if (!recurrence) return;

    const occurrences = getRecurrenceOccurrences(recurrence, today, searchEnd, {
      kind: "income",
    });
    const next = occurrences.find((date) => date >= today);
    if (next) candidates.push(next);
  });

  return candidates.sort()[0] || endOfCurrentMonthKey();
}

function parseMonthKey(monthKey) {
  const match = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isInteger(year) || monthIndex < 0 || monthIndex > 11) return null;
  return { year, monthIndex };
}

function countWeekdayInMonth(year, monthIndex, dayOfWeek) {
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return 0;
  const end = new Date(year, monthIndex + 1, 0).getDate();
  let count = 0;
  for (let day = 1; day <= end; day += 1) {
    if (new Date(year, monthIndex, day).getDay() === dayOfWeek) count += 1;
  }
  return count;
}

function countBiweeklyInMonth(year, monthIndex, startDate) {
  const anchor = new Date(`${String(startDate || "").slice(0, 10)}T00:00:00`);
  if (Number.isNaN(anchor.getTime())) return 0;

  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
  const stepMs = 14 * 24 * 60 * 60 * 1000;
  let cursor = new Date(anchor);

  while (cursor > monthStart) cursor = new Date(cursor.getTime() - stepMs);
  while (cursor < monthStart) cursor = new Date(cursor.getTime() + stepMs);

  let count = 0;
  while (cursor <= monthEnd) {
    count += 1;
    cursor = new Date(cursor.getTime() + stepMs);
  }
  return count;
}

function projectedStableIncomeForMonth(source, currentMonthKey) {
  if (normalizeLower(source?.stability) !== "stable") return 0;

  const minimum = stableIncomeMinimum(source);
  const recurrence = stableIncomeRecurrence(source);
  const month = parseMonthKey(currentMonthKey);
  if (!(minimum > 0) || !recurrence || !month) return 0;

  const type = normalizeLower(recurrence?.type || recurrence?.recurrence || recurrence?.frequency);
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  let paydays = 0;

  if (type === "weekly") {
    paydays = countWeekdayInMonth(
      month.year,
      month.monthIndex,
      Number(recurrence?.dayOfWeek ?? recurrence?.day_of_week)
    );
  } else if (type === "biweekly") {
    paydays = countBiweeklyInMonth(
      month.year,
      month.monthIndex,
      recurrence?.startDate || recurrence?.start_date
    );
  } else if (type === "twice_monthly") {
    const days = Array.isArray(recurrence?.days) ? recurrence.days : [];
    const todayDay =
      currentMonthKey === getPHMonthKey()
        ? Number(
            new Intl.DateTimeFormat("en-PH", {
              timeZone: "Asia/Manila",
              day: "numeric",
            }).format(new Date())
          )
        : 1;
    paydays = [...new Set(days.map(Number))].filter(
      (day) =>
        Number.isInteger(day) &&
        day >= 1 &&
        day <= daysInMonth &&
        day >= todayDay
    ).length;
  } else if (type === "monthly") {
    paydays = 1;
  }

  return minimum * paydays;
}

function currentMonthIncomeFromSources(incomeSources, currentMonthKey) {
  return (Array.isArray(incomeSources) ? incomeSources : []).reduce((sourceSum, source) => {
    const actualIncome = getIncomeSourceActivityLog(source).reduce((activitySum, activity) => {
      if (normalizeLower(activity?.type) !== INCOME_HUB_CASH_IN_TYPE) return activitySum;
      const date = getTransactionDate(activity);
      if (!date || getPHMonthKey(date) !== currentMonthKey) return activitySum;
      return activitySum + Math.max(0, firstValidNumber(activity?.amount));
    }, 0);

    const reliableExpectedIncome = projectedStableIncomeForMonth(source, currentMonthKey);

    return sourceSum + Math.max(actualIncome, reliableExpectedIncome);
  }, 0);
}

async function buildMeansSnapshot(profile = {}) {
  const owner = getOwnerIdentity(profile);
  const [expenses, incomeSources, savingsGoals, debtObligations, wallets] = await Promise.all([
    getExpenses(owner).catch(() => []),
    getIncomeSources(owner).catch(() => []),
    getSavingsGoals(owner).catch(() => []),
    getDebtObligations(owner).catch(() => []),
    getWallets(owner).catch(() => []),
  ]);
  const currentMonthKey = getPHMonthKey();

  const spent = (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
    const date = getTransactionDate(expense);
    if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;
    return sum + Math.abs(Number(expense?.amount || 0));
  }, 0);

  const income = currentMonthIncomeFromSources(incomeSources, currentMonthKey);
  const availableNow = currentAvailableMoney(wallets);
  const moneyLentUnavailable = currentMoneyLentUnavailable(wallets);
  if (!(income > 0) && !(availableNow > 0) && !(moneyLentUnavailable > 0)) return null;

  const horizonDate = resolveMeansHorizonDate(incomeSources);
  const routineUpcoming = futureRoutineAmount(owner, horizonDate);
  const scheduledUpcoming = futureScheduledAmount(owner, horizonDate);
  const savingsGoalUpcoming = futureSavingsGoalAmount(savingsGoals, horizonDate);
  const debtUpcoming = futureDebtObligationAmount(debtObligations, horizonDate);
  const upcoming = routineUpcoming + scheduledUpcoming + savingsGoalUpcoming + debtUpcoming;

  const projectedSpending = upcoming;
  const projectedRoom = availableNow - upcoming;
  const score =
    availableNow > 0
      ? Math.round(100 + ((availableNow - upcoming) / availableNow) * 100)
      : upcoming > 0
        ? -100
        : 100;

  return {
    score,
    income,
    spent,
    upcoming,
    savingsGoalUpcoming,
    debtUpcoming,
    horizonDate,
    availableNow,
    moneyLentUnavailable,
    projectedSpending,
    projectedRoom,
  };
}

function statusForScore(score) {
  if (score > 100) return "Below your means";
  if (score === 100) return "Within your means";
  if (score >= 0) return "Above your means";
  return "Over your means";
}

function metricTone(score) {
  if (score > 100) return "#67e8c8";
  if (score === 100) return "#e7eefc";
  if (score >= 0) return "#f4d36a";
  return "#ff7f8d";
}

function ensureMeansPlaceholder(idleCopy) {
  const placeholder = idleCopy?.querySelector?.(`[${MEANS_PLACEHOLDER_ATTR}="true"]`);
  if (!placeholder || placeholder.dataset.claraMeansPremiumPlaceholder === "true") {
    return placeholder;
  }

  placeholder.dataset.claraMeansPremiumPlaceholder = "true";
  placeholder.style.marginTop = "9px";
  placeholder.style.fontSize = "initial";
  placeholder.style.fontWeight = "initial";
  placeholder.style.letterSpacing = "initial";
  placeholder.style.color = "inherit";
  placeholder.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 11px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
      <strong style="display:inline-grid;place-items:center;min-width:27px;height:23px;padding:0 6px;border:1px solid rgba(255,255,255,.07);border-radius:999px;background:rgba(255,255,255,.035);font-size:11px;font-weight:900;line-height:1;color:rgba(255,255,255,.58)">—</strong>
      <span style="font-size:8px;font-weight:900;line-height:1;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.34)">Means score</span>
    </span>
  `;

  return placeholder;
}

function ensureMeansMetric(label, snapshot, onToggle) {
  const composition = label?.closest?.(ORB_COMPOSITION_SELECTOR);
  const idleCopy = composition?.querySelector?.(ORB_IDLE_COPY_SELECTOR);
  if (!idleCopy) return null;

  const tapCopy = idleCopy.querySelector("p");
  if (tapCopy) tapCopy.style.display = "none";
  ensureMeansPlaceholder(idleCopy);

  let root = idleCopy.querySelector(`[${MEANS_METRIC_ATTR}="true"]`);

  if (!root) {
    root = document.createElement("button");
    root.type = "button";
    root.setAttribute(MEANS_METRIC_ATTR, "true");
    root.setAttribute("aria-expanded", "false");
    root.style.display = "block";
    root.style.width = "100%";
    root.style.margin = "9px auto 0";
    root.style.padding = "0";
    root.style.border = "0";
    root.style.background = "transparent";
    root.style.color = "inherit";
    root.style.textAlign = "center";
    root.style.cursor = "pointer";
    root.style.WebkitTapHighlightColor = "transparent";
    root.addEventListener("click", onToggle);
    idleCopy.appendChild(root);
  }

  const expanded = root.getAttribute("aria-expanded") === "true";
  const renderSignature = snapshot
    ? [
        "ready",
        snapshot.score,
        Math.round(snapshot.income),
        Math.round(snapshot.spent),
        Math.round(snapshot.upcoming),
        Math.round(snapshot.savingsGoalUpcoming || 0),
        Math.round(snapshot.debtUpcoming || 0),
        Math.round(snapshot.availableNow || 0),
        Math.round(snapshot.moneyLentUnavailable || 0),
        snapshot.horizonDate || "",
        Math.round(snapshot.projectedRoom),
        expanded ? 1 : 0,
      ].join(":")
    : `waiting:${expanded ? 1 : 0}`;
  if (root.dataset.claraMeansRenderSignature === renderSignature) return root;
  root.dataset.claraMeansRenderSignature = renderSignature;

  if (!snapshot) {
    root.setAttribute(
      "aria-label",
      expanded
        ? "Means Score details. No monthly income detected yet."
        : "Means Score. No monthly income detected yet. Tap for details."
    );
    root.innerHTML = `
      <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 10px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
        <strong style="display:inline-grid;place-items:center;min-width:29px;height:23px;padding:0 6px;border:1px solid rgba(255,255,255,.07);border-radius:999px;background:rgba(255,255,255,.035);font-size:11px;font-weight:900;line-height:1;color:rgba(255,255,255,.58)">—</strong>
        <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1">
          <span style="font-size:7px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.26)">Means score</span>
          <span style="font-size:9px;font-weight:800;letter-spacing:-.01em;color:rgba(255,255,255,.52)">Waiting for income</span>
        </span>
        <span style="margin-left:1px;font-size:9px;line-height:1;color:rgba(255,255,255,.25);transform:${expanded ? "rotate(180deg)" : "none"};transition:transform 160ms ease">⌄</span>
      </span>
      <span data-clara-means-expanded="true" style="display:${expanded ? "block" : "none"};width:min(300px,78vw);margin:10px auto 1px;padding:12px;border:1px solid rgba(112,157,229,.13);border-radius:15px;background:linear-gradient(180deg,rgba(9,21,50,.72),rgba(4,11,31,.66));box-shadow:0 14px 34px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.025);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);text-align:left">
        <strong style="display:block;font-size:10px;font-weight:900;letter-spacing:-.01em;color:rgba(255,255,255,.76)">No monthly income detected yet.</strong>
        <span style="display:block;margin-top:5px;font-size:9.5px;font-weight:650;line-height:1.5;color:rgba(255,255,255,.40)">Once income is recorded, CLARA will calculate your score from what you have already spent plus upcoming Money Schedule, Debt / Obligations, and Savings Goal commitments.</span>
        <span style="display:block;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.06);font-size:8.5px;font-weight:700;color:rgba(255,255,255,.22);text-align:center">100 = living within your means</span>
      </span>
    `;
    return root;
  }

  const tone = metricTone(snapshot.score);
  root.setAttribute(
    "aria-label",
    `Means Score ${snapshot.score}. ${statusForScore(snapshot.score)}. ${expanded ? "Tap to collapse details." : "Tap for details."}`
  );
  root.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:31px;padding:4px 10px 4px 5px;border:1px solid rgba(103,157,255,.14);border-radius:999px;background:linear-gradient(180deg,rgba(13,28,62,.68),rgba(4,10,31,.74));box-shadow:0 10px 28px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.035),0 0 20px rgba(46,110,255,.055);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
      <strong style="display:inline-grid;place-items:center;min-width:29px;height:23px;padding:0 6px;border:1px solid ${tone}33;border-radius:999px;background:${tone}0d;box-shadow:inset 0 1px 0 rgba(255,255,255,.035),0 0 14px ${tone}12;font-size:11px;font-weight:900;line-height:1;color:${tone}">${snapshot.score}</strong>
      <span style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1">
        <span style="font-size:7px;font-weight:900;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.26)">Means score</span>
        <span style="font-size:9px;font-weight:800;letter-spacing:-.01em;color:rgba(255,255,255,.62)">${statusForScore(snapshot.score)}</span>
      </span>
      <span style="margin-left:1px;font-size:9px;line-height:1;color:rgba(255,255,255,.25);transform:${expanded ? "rotate(180deg)" : "none"};transition:transform 160ms ease">⌄</span>
    </span>
    <span data-clara-means-expanded="true" style="display:${expanded ? "block" : "none"};width:min(300px,78vw);margin:10px auto 1px;padding:11px 12px;border:1px solid rgba(112,157,229,.13);border-radius:15px;background:linear-gradient(180deg,rgba(9,21,50,.72),rgba(4,11,31,.66));box-shadow:0 14px 34px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.025);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);text-align:left">
      <span style="display:flex;justify-content:space-between;gap:16px;font-size:10px;color:rgba(255,255,255,.38)"><span>Income this month</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.income)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.50)"><span>Available now</span><strong style="color:rgba(255,255,255,.86)">${money(snapshot.availableNow)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.38)"><span>Already spent</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.spent)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05);font-size:10px;color:rgba(255,255,255,.44)"><span>Upcoming commitments</span><strong style="color:rgba(255,255,255,.78)">${money(snapshot.upcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Debt / obligations</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.debtUpcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:4px;padding-left:9px;font-size:9.5px;color:rgba(255,255,255,.31)"><span>↳ Savings goals</span><strong style="color:rgba(255,255,255,.58)">${money(snapshot.savingsGoalUpcoming)}</strong></span>
      ${snapshot.moneyLentUnavailable > 0 ? `<span style="display:flex;justify-content:space-between;gap:16px;margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.05);font-size:9.5px;color:rgba(255,255,255,.30)"><span>Money lent · not available</span><strong style="color:rgba(255,255,255,.50)">${money(snapshot.moneyLentUnavailable)}</strong></span>` : ""}
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.07);font-size:10px;color:rgba(255,255,255,.48)"><span>Room until next payday</span><strong style="color:${snapshot.projectedRoom >= 0 ? "#67e8c8" : "#ff7f8d"}">${snapshot.projectedRoom >= 0 ? "" : "−"}${money(Math.abs(snapshot.projectedRoom))}</strong></span>
      <span style="display:block;margin-top:8px;font-size:8.5px;font-weight:650;line-height:1.45;color:rgba(255,255,255,.30);text-align:center">This score uses the money currently available in your wallets and checks whether it can carry you through ${formatHorizonDate(snapshot.horizonDate)}, your next stable payday. Future salary is not treated as available before it arrives.</span>
      <span style="display:block;margin-top:4px;font-size:8.5px;font-weight:700;color:rgba(255,255,255,.22);text-align:center">100 = living within your means</span>
    </span>
  `;

  return root;
}

function installClaraOrbGreeting() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window[RUNTIME_KEY]?.destroy?.();
  let queued = false;
  let activeLabel = null;
  let firstName = "";
  let loaded = false;
  let request = null;
  let destroyed = false;
  let canonicalProfile = null;
  let meansSnapshot = null;
  let meansRequest = null;

  const toggleMeansMetric = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const root = event.currentTarget;
    const nextExpanded = root.getAttribute("aria-expanded") !== "true";
    root.setAttribute("aria-expanded", nextExpanded ? "true" : "false");
    if (activeLabel) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);
    if (!meansSnapshot) refreshMeans();
  };

  const refreshMeans = () => {
    if (!canonicalProfile || meansRequest || destroyed) return;
    meansRequest = buildMeansSnapshot(canonicalProfile)
      .then((snapshot) => {
        if (destroyed) return;
        meansSnapshot = snapshot;
        if (activeLabel) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);
      })
      .catch((error) => {
        if (destroyed) return;
        console.warn("CLARA Orb Means Score unavailable:", error);
        meansSnapshot = null;
        if (activeLabel) ensureMeansMetric(activeLabel, null, toggleMeansMetric);
      })
      .finally(() => {
        meansRequest = null;
      });
  };

  const render = () => {
    const label = resolveGreetingLabel();
    if (!label) {
      activeLabel = null;
      firstName = "";
      loaded = false;
      return null;
    }

    if (label !== activeLabel) {
      activeLabel = label;
      const tutorialIdentity = resolveTutorialIdentity(label);
      firstName = tutorialIdentity?.firstName || "";
      loaded = Boolean(tutorialIdentity);
    }

    if (isOrbCommandModeVisible(label)) {
      clearGreetingPresentation(label);
      return null;
    }

    const nextText = firstName ? `Hi ${firstName}!` : "Hi!";
    if (label.textContent !== nextText) label.textContent = nextText;
    label.dataset.claraOrbUserGreeting = "true";
    label.dataset.claraOrbGreetingScope = resolveTutorialIdentity(label) ? "tutorial" : "production";
    label.style.fontSize = "18px";
    label.style.fontWeight = "900";
    label.style.lineHeight = "1.1";
    label.style.letterSpacing = "-0.02em";
    label.style.textTransform = "none";
    label.style.color = "rgba(255, 255, 255, 0.96)";

    if (!resolveTutorialIdentity(label)) {
      ensureMeansMetric(label, meansSnapshot, toggleMeansMetric);
    }
    return label;
  };

  const load = () => {
    if (!activeLabel || loaded || request) return;
    const requestedLabel = activeLabel;
    request = fetchCanonicalClaraProfile()
      .then((profile) => {
        if (destroyed || activeLabel !== requestedLabel) return;
        canonicalProfile = profile || null;
        firstName = resolveCanonicalFirstName(profile);
        loaded = true;
        render();
        refreshMeans();
      })
      .catch((error) => {
        if (destroyed || activeLabel !== requestedLabel) return;
        console.warn("CLARA Orb canonical profile greeting unavailable:", error);
        loaded = true;
        render();
      })
      .finally(() => {
        request = null;
      });
  };

  const sync = () => {
    queued = false;
    if (render()) load();
  };

  const queueSync = () => {
    if (queued || destroyed) return;
    queued = true;
    window.requestAnimationFrame(sync);
  };

  const handleFinanceRefresh = () => {
    meansSnapshot = null;
    refreshMeans();
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-orb-command-visible"],
  });
  window.addEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(INCOME_HUB_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(DEBT_OBLIGATIONS_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener("clara:schedule:create-event", handleFinanceRefresh);
  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      destroyed = true;
      observer.disconnect();
      window.removeEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(INCOME_HUB_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(DEBT_OBLIGATIONS_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);
      window.removeEventListener("clara:schedule:create-event", handleFinanceRefresh);
      clearGreetingPresentation(activeLabel);
      activeLabel = null;
      request = null;
      meansRequest = null;
      canonicalProfile = null;
      meansSnapshot = null;
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbGreeting();