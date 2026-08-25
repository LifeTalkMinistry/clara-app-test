import { fetchCanonicalClaraProfile } from "@/lib/canonical-clara-profile";
import { getSavingsGoals, FINANCE_DATA_UPDATED_EVENT } from "@/lib/financeRepository";
import {
  DEBT_OBLIGATIONS_UPDATED_EVENT,
  getDebtObligations,
} from "@/lib/debtObligationStore";
import { buildDebtObligationScheduleProjection } from "@/lib/financialCardScheduleProjection";

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

function dueSavingsCarryover(goals = [], today = todayKey()) {
  return (Array.isArray(goals) ? goals : []).reduce((sum, goal) => {
    const status = normalize(goal?.status);
    const inactive = Boolean(
      goal?.deletedAt ||
        goal?.deleted_at ||
        goal?.isArchived === true ||
        goal?.is_archived === true ||
        ["deleted", "archived", "cancelled", "canceled"].includes(status)
    );
    if (inactive) return sum;

    const date = goalDate(goal);
    if (!date || date > today) return sum;

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

    return sum + Math.max(target - saved, 0);
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

async function computeCarryover() {
  const profile = await fetchCanonicalClaraProfile().catch(() => null);
  const localUserId = ownerId(profile || {});
  const [goals, debts] = await Promise.all([
    getSavingsGoals(localUserId).catch(() => []),
    getDebtObligations(localUserId).catch(() => []),
  ]);
  const today = todayKey();
  return {
    savings: dueSavingsCarryover(goals, today),
    debt: dueDebtCarryover(debts, today),
  };
}

function installMeansActualCommitmentGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window[RUNTIME_KEY]?.destroy?.();

  let destroyed = false;
  let queued = false;
  let applying = false;
  let carryover = { savings: 0, debt: 0 };

  const apply = () => {
    queued = false;
    if (destroyed || applying) return;
    const root = document.querySelector(MEANS_ROOT_SELECTOR);
    if (!root) return;

    const carry = Math.max(0, carryover.savings) + Math.max(0, carryover.debt);
    const baseSignature = String(root.dataset.claraMeansRenderSignature || "");
    const signature = `${baseSignature}|actual:${Math.round(carryover.debt)}:${Math.round(carryover.savings)}`;
    if (root.dataset.claraActualCommitmentSignature === signature) return;

    applying = true;
    try {
      const moneyInHand = readRowAmount(root, "Money in hand");
      const currentUpcoming = readRowAmount(root, "Upcoming commitments");
      const currentDebt = readRowAmount(root, "Debt / obligations");
      const currentSavings = readRowAmount(root, "Savings goals");

      // The base Means runtime intentionally excludes dates <= today. Add only
      // due/overdue amounts that are still unresolved by actual user action.
      const nextUpcoming = currentUpcoming + carry;
      const nextDebt = currentDebt + Math.max(0, carryover.debt);
      const nextSavings = currentSavings + Math.max(0, carryover.savings);
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
    computeCarryover()
      .then((next) => {
        if (destroyed) return;
        carryover = next;
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
