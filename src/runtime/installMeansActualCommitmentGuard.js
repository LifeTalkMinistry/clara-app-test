import { fetchCanonicalClaraProfile } from "@/lib/canonical-clara-profile";
import { getSavingsGoals, FINANCE_DATA_UPDATED_EVENT } from "@/lib/financeRepository";
import {
  DEBT_OBLIGATIONS_UPDATED_EVENT,
  getDebtObligations,
} from "@/lib/debtObligationStore";
import { buildDebtObligationScheduleProjection } from "@/lib/financialCardScheduleProjection";
import { getIncomeSources } from "@/lib/incomeHubRepository";
import { getRecurrenceOccurrences } from "@/lib/recurringCashFlowRepository";

const RUNTIME_KEY = "__claraMeansActualCommitmentGuard__";
const MEANS_ROOT_SELECTOR = '[data-clara-orb-means-metric="true"]';
const INCOME_HUB_UPDATED_EVENT = "clara-income-hub-updated";

const moneyNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const todayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
};

const addDaysKey = (dateKey, days) => {
  const match = String(dateKey || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + Number(days || 0));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const endOfMonthKey = () => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(
    end.getDate()
  ).padStart(2, "0")}`;
};

const ownerId = (profile = {}) =>
  String(
    profile?.id ||
      profile?.user_id ||
      profile?.userId ||
      profile?.email ||
      profile?.user?.id ||
      profile?.user?.email ||
      "local-user"
  ).trim();

const normalize = (value) => String(value ?? "").trim().toLowerCase();

const goalDate = (goal = {}) =>
  String(
    goal?.planned_use_date ||
      goal?.plannedUseDate ||
      goal?.due_date ||
      goal?.dueDate ||
      goal?.target_date ||
      goal?.targetDate ||
      ""
  ).slice(0, 10);

const goalMoney = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    return Math.max(0, moneyNumber(value));
  }
  return 0;
};

function goalRemaining(goal = {}) {
  const target = goalMoney(
    goal?.target_amount,
    goal?.targetAmount,
    goal?.goal_amount,
    goal?.goalAmount,
    goal?.target,
    goal?.amount
  );
  const saved = goalMoney(
    goal?.saved_amount,
    goal?.savedAmount,
    goal?.current_amount,
    goal?.currentAmount,
    goal?.saved,
    goal?.progress_amount,
    goal?.progressAmount,
    goal?.amount_saved
  );
  return Math.max(target - saved, 0);
}

function isGoalActive(goal = {}) {
  const status = normalize(goal?.status);
  return !(
    goal?.deletedAt ||
    goal?.deleted_at ||
    goal?.isArchived === true ||
    goal?.is_archived === true ||
    ["deleted", "archived", "cancelled", "canceled"].includes(status)
  );
}

function dueSavingsCarryover(goals = [], today = todayKey()) {
  return (Array.isArray(goals) ? goals : []).reduce((sum, goal) => {
    if (!isGoalActive(goal)) return sum;
    const date = goalDate(goal);
    if (!date || date > today) return sum;
    return sum + goalRemaining(goal);
  }, 0);
}

function savingsOnHorizon(goals = [], horizonDate = "") {
  if (!horizonDate) return 0;
  return (Array.isArray(goals) ? goals : []).reduce((sum, goal) => {
    if (!isGoalActive(goal) || goalDate(goal) !== horizonDate) return sum;
    return sum + goalRemaining(goal);
  }, 0);
}

function debtLastPaidDate(record = {}) {
  return String(
    record?.lastPaidAt ||
      record?.last_paid_at ||
      record?.paidAt ||
      record?.paid_at ||
      ""
  ).slice(0, 10);
}

function dueDebtCarryover(records = [], today = todayKey()) {
  const events = buildDebtObligationScheduleProjection(records);
  const latestDueByDebt = new Map();

  events.forEach((event) => {
    const date = String(event?.date || "").slice(0, 10);
    const debtId = String(event?.debtObligationId || event?.debt_obligation_id || "").trim();
    if (!debtId || !date || date > today) return;
    const current = latestDueByDebt.get(debtId);
    if (!current || date > current.date) latestDueByDebt.set(debtId, { ...event, date });
  });

  const recordMap = new Map(
    (Array.isArray(records) ? records : []).map((record) => [
      String(record?.id || record?.debt_id || record?.debtId || "").trim(),
      record,
    ])
  );

  let total = 0;
  latestDueByDebt.forEach((event, debtId) => {
    const record = recordMap.get(debtId) || {};
    const lastPaid = debtLastPaidDate(record);
    if (lastPaid && lastPaid >= event.date) return;
    total += Math.max(0, moneyNumber(event?.amount));
  });
  return total;
}

function debtOnHorizon(records = [], horizonDate = "") {
  if (!horizonDate) return 0;
  return buildDebtObligationScheduleProjection(records).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    if (date !== horizonDate) return sum;
    return sum + Math.max(0, moneyNumber(event?.amount));
  }, 0);
}

function stableIncomeRecurrence(source = {}) {
  return source?.incomeRecurrence || source?.income_recurrence || null;
}

function resolveHorizonDate(incomeSources = []) {
  const today = todayKey();
  const searchEnd = addDaysKey(today, 62);
  const candidates = [];

  (Array.isArray(incomeSources) ? incomeSources : []).forEach((source) => {
    if (normalize(source?.stability) !== "stable") return;
    if (source?.useForBudgetTiming === false || source?.use_for_budget_timing === false) return;
    const recurrence = stableIncomeRecurrence(source);
    if (!recurrence) return;
    const occurrences = getRecurrenceOccurrences(recurrence, today, searchEnd, { kind: "income" });
    const next = occurrences.find((date) => date > today);
    if (next) candidates.push(next);
  });

  return candidates.sort()[0] || endOfMonthKey();
}

function findValueRow(root, labelText) {
  const candidates = Array.from(root?.querySelectorAll?.("span") || []);
  return candidates.find((row) => {
    const first = row.firstElementChild;
    const strong = row.querySelector?.(":scope > strong");
    return Boolean(
      first &&
        strong &&
        normalize(first.textContent).replace(/↳/g, "").trim() === normalize(labelText)
    );
  });
}

function readRowAmount(root, labelText) {
  const row = findValueRow(root, labelText);
  const strong = row?.querySelector?.(":scope > strong");
  return strong ? moneyNumber(strong.textContent) : 0;
}

function writeRowAmount(root, labelText, amount, { signed = false } = {}) {
  const row = findValueRow(root, labelText);
  const strong = row?.querySelector?.(":scope > strong");
  if (!strong) return;
  const rounded = Math.round(Math.abs(amount));
  const prefix = signed && amount < 0 ? "−" : "";
  strong.textContent = `${prefix}₱${rounded.toLocaleString("en-PH")}`;
  if (labelText === "Room until next payday") {
    strong.style.color = amount >= 0 ? "#67e8c8" : "#ff7f8d";
  }
}

function statusForScore(score) {
  if (score > 100) return "Below your means";
  if (score === 100) return "Within your means";
  if (score >= 0) return "Above your means";
  return "Over your means";
}

function toneForScore(score) {
  if (score > 100) return "#67e8c8";
  if (score === 100) return "#e7eefc";
  if (score >= 0) return "#f4d36a";
  return "#ff7f8d";
}

function patchScore(root, score) {
  const badge = root?.querySelector?.("span > strong");
  if (!badge) return;
  const status = badge.parentElement?.querySelector?.("span > span:last-child");
  const tone = toneForScore(score);
  badge.textContent = String(score);
  badge.style.color = tone;
  badge.style.borderColor = `${tone}33`;
  badge.style.background = `${tone}0d`;
  if (status) status.textContent = statusForScore(score);
}

async function computeAdjustments() {
  const profile = await fetchCanonicalClaraProfile().catch(() => null);
  const localUserId = ownerId(profile || {});
  const [goals, debts, incomeSources] = await Promise.all([
    getSavingsGoals(localUserId).catch(() => []),
    getDebtObligations(localUserId).catch(() => []),
    getIncomeSources(localUserId).catch(() => []),
  ]);
  const today = todayKey();
  const horizonDate = resolveHorizonDate(incomeSources);

  return {
    horizonDate,
    carrySavings: dueSavingsCarryover(goals, today),
    carryDebt: dueDebtCarryover(debts, today),
    boundarySavings: horizonDate > today ? savingsOnHorizon(goals, horizonDate) : 0,
    boundaryDebt: horizonDate > today ? debtOnHorizon(debts, horizonDate) : 0,
  };
}

function installMeansActualCommitmentGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window[RUNTIME_KEY]?.destroy?.();

  let destroyed = false;
  let queued = false;
  let applying = false;
  let adjustment = {
    horizonDate: "",
    carrySavings: 0,
    carryDebt: 0,
    boundarySavings: 0,
    boundaryDebt: 0,
  };

  const apply = () => {
    queued = false;
    if (destroyed || applying) return;
    const root = document.querySelector(MEANS_ROOT_SELECTOR);
    if (!root) return;

    const carry = Math.max(0, adjustment.carrySavings) + Math.max(0, adjustment.carryDebt);
    const boundary = Math.max(0, adjustment.boundarySavings) + Math.max(0, adjustment.boundaryDebt);
    const baseSignature = String(root.dataset.claraMeansRenderSignature || "");
    const signature = `${baseSignature}|actual:${Math.round(adjustment.carryDebt)}:${Math.round(
      adjustment.carrySavings
    )}|boundary:${adjustment.horizonDate}:${Math.round(adjustment.boundaryDebt)}:${Math.round(
      adjustment.boundarySavings
    )}`;
    if (root.dataset.claraActualCommitmentSignature === signature) return;

    applying = true;
    try {
      const moneyInHand = readRowAmount(root, "Money in hand");
      const currentUpcoming = readRowAmount(root, "Upcoming commitments");
      const currentDebt = readRowAmount(root, "Debt / obligations");
      const currentSavings = readRowAmount(root, "Savings goals");

      // The next stable payday is a boundary, not part of the current cash window.
      // Remove commitments scheduled exactly on that payday because the Means score
      // answers whether today's money can carry the user UNTIL that income arrives.
      // Separately carry unresolved due/overdue commitments forward until actual
      // user action proves they were paid or funded.
      const nextUpcoming = Math.max(0, currentUpcoming - boundary + carry);
      const nextDebt = Math.max(
        0,
        currentDebt - Math.max(0, adjustment.boundaryDebt) + Math.max(0, adjustment.carryDebt)
      );
      const nextSavings = Math.max(
        0,
        currentSavings - Math.max(0, adjustment.boundarySavings) + Math.max(0, adjustment.carrySavings)
      );
      const nextRoom = moneyInHand - nextUpcoming;
      const nextScore =
        moneyInHand > 0
          ? Math.round(100 + ((moneyInHand - nextUpcoming) / moneyInHand) * 100)
          : nextUpcoming > 0
            ? -100
            : 100;

      writeRowAmount(root, "Upcoming commitments", nextUpcoming);
      writeRowAmount(root, "Debt / obligations", nextDebt);
      writeRowAmount(root, "Savings goals", nextSavings);
      writeRowAmount(root, "Room until next payday", nextRoom, { signed: true });
      patchScore(root, nextScore);
      root.dataset.claraActualCommitmentSignature = signature;
    } finally {
      applying = false;
    }
  };

  const queueApply = () => {
    if (destroyed || queued) return;
    queued = true;
    window.requestAnimationFrame(apply);
  };

  const refresh = () => {
    if (destroyed) return;
    computeAdjustments()
      .then((next) => {
        if (destroyed) return;
        adjustment = next;
        const root = document.querySelector(MEANS_ROOT_SELECTOR);
        if (root) delete root.dataset.claraActualCommitmentSignature;
        queueApply();
      })
      .catch((error) => console.warn("CLARA actual commitment guard unavailable:", error));
  };

  const observer = new MutationObserver(queueApply);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  [
    FINANCE_DATA_UPDATED_EVENT,
    DEBT_OBLIGATIONS_UPDATED_EVENT,
    INCOME_HUB_UPDATED_EVENT,
    "clara:schedule:create-event",
  ].forEach((eventName) => window.addEventListener(eventName, refresh));

  refresh();

  window[RUNTIME_KEY] = {
    destroy() {
      destroyed = true;
      observer.disconnect();
      [
        FINANCE_DATA_UPDATED_EVENT,
        DEBT_OBLIGATIONS_UPDATED_EVENT,
        INCOME_HUB_UPDATED_EVENT,
        "clara:schedule:create-event",
      ].forEach((eventName) => window.removeEventListener(eventName, refresh));
      window[RUNTIME_KEY] = null;
    },
  };
}

installMeansActualCommitmentGuard();
