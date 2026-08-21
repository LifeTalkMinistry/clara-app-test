import "./installClaraOrbChatHandoff";
import "./installClaraOrbCommandChatRouting";
import "./installClaraBuyCheckKeyboardGuard";
import "./installClaraOrbViewportOwnershipGuard";
import { fetchCanonicalClaraProfile, resolveCanonicalFirstName } from "@/lib/canonical-clara-profile";
import {
  FINANCE_DATA_UPDATED_EVENT,
  getExpenses,
  getWalletTransactions,
} from "@/lib/financeRepository";
import {
  CLARA_MONEY_ROUTINE_UPDATED_EVENT,
  getClaraMoneyScheduleStorageKey,
  readClaraMoneyRoutine,
} from "@/lib/clara-money-schedule-repository";
import {
  INCOME_TRANSACTION_TYPES,
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

function futureRoutineAmount(user) {
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
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let total = 0;

  while (cursor <= end) {
    total += byWeekday.get(cursor.getDay()) || 0;
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function futureScheduledAmount(user) {
  const today = localDateKey();
  const monthEnd = endOfCurrentMonthKey();

  return parseScheduleEvents(user).reduce((sum, event) => {
    const date = String(event?.date || "").slice(0, 10);
    const direction = String(event?.direction || "out").trim().toLowerCase();
    const amount = Number(String(event?.amount ?? "0").replace(/[₱,\s]/g, ""));
    if (!date || date <= today || date > monthEnd) return sum;
    if (direction !== "out" || event?.affectsMoney === false) return sum;
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
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

async function buildMeansSnapshot(profile = {}) {
  const owner = getOwnerIdentity(profile);
  const [expenses, walletTransactions] = await Promise.all([
    getExpenses(owner).catch(() => []),
    getWalletTransactions(owner).catch(() => []),
  ]);
  const currentMonthKey = getPHMonthKey();

  const spent = (Array.isArray(expenses) ? expenses : []).reduce((sum, expense) => {
    const date = getTransactionDate(expense);
    if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;
    return sum + Math.abs(Number(expense?.amount || 0));
  }, 0);

  const income = (Array.isArray(walletTransactions) ? walletTransactions : []).reduce(
    (sum, transaction) => {
      const type = normalizeLower(transaction?.type || transaction?.transaction_type);
      if (!INCOME_TRANSACTION_TYPES.has(type)) return sum;
      const date = getTransactionDate(transaction);
      if (!date || getPHMonthKey(date) !== currentMonthKey) return sum;
      return sum + firstValidNumber(transaction?.amount);
    },
    0
  );

  if (!(income > 0)) return null;

  const routineUpcoming = futureRoutineAmount(owner);
  const scheduledUpcoming = futureScheduledAmount(owner);
  const upcoming = routineUpcoming + scheduledUpcoming;
  const projectedSpending = spent + upcoming;
  const projectedRoom = income - projectedSpending;
  const score = Math.round(100 + ((income - projectedSpending) / income) * 100);

  return {
    score,
    income,
    spent,
    upcoming,
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

function ensureMeansMetric(label, snapshot, onToggle) {
  const composition = label?.closest?.(ORB_COMPOSITION_SELECTOR);
  const idleCopy = composition?.querySelector?.(ORB_IDLE_COPY_SELECTOR);
  if (!idleCopy) return null;

  let root = idleCopy.querySelector(`[${MEANS_METRIC_ATTR}="true"]`);
  if (!snapshot) {
    root?.remove();
    return null;
  }

  if (!root) {
    root = document.createElement("button");
    root.type = "button";
    root.setAttribute(MEANS_METRIC_ATTR, "true");
    root.setAttribute("aria-expanded", "false");
    root.style.display = "block";
    root.style.width = "100%";
    root.style.margin = "7px auto 0";
    root.style.padding = "0";
    root.style.border = "0";
    root.style.background = "transparent";
    root.style.color = "inherit";
    root.style.textAlign = "center";
    root.style.cursor = "pointer";
    root.style.WebkitTapHighlightColor = "transparent";
    root.addEventListener("click", onToggle);

    const tapCopy = idleCopy.querySelector("p");
    if (tapCopy) idleCopy.insertBefore(root, tapCopy);
    else idleCopy.appendChild(root);
  }

  const expanded = root.getAttribute("aria-expanded") === "true";
  const renderSignature = [
    snapshot.score,
    Math.round(snapshot.income),
    Math.round(snapshot.spent),
    Math.round(snapshot.upcoming),
    Math.round(snapshot.projectedRoom),
    expanded ? 1 : 0,
  ].join(":");
  if (root.dataset.claraMeansRenderSignature === renderSignature) return root;
  root.dataset.claraMeansRenderSignature = renderSignature;

  const tone = metricTone(snapshot.score);
  root.innerHTML = `
    <span style="display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:800;line-height:1.25;letter-spacing:.005em;color:rgba(255,255,255,.48)">
      <strong style="font-size:12px;color:${tone};font-weight:900">${snapshot.score}</strong>
      <span style="opacity:.5">·</span>
      <span>${statusForScore(snapshot.score)}</span>
      <span style="font-size:9px;opacity:.42;transform:${expanded ? "rotate(180deg)" : "none"};transition:transform 160ms ease">⌄</span>
    </span>
    <span style="display:block;margin-top:3px;font-size:9px;font-weight:650;line-height:1.25;letter-spacing:.01em;color:rgba(255,255,255,.26)">Upcoming commitments included</span>
    <span data-clara-means-expanded="true" style="display:${expanded ? "block" : "none"};width:min(300px,78vw);margin:8px auto 1px;padding:10px 12px;border:1px solid rgba(126,160,214,.10);border-radius:14px;background:rgba(6,16,38,.42);box-shadow:0 8px 24px rgba(0,0,0,.10);backdrop-filter:blur(8px);text-align:left">
      <span style="display:flex;justify-content:space-between;gap:16px;font-size:10px;color:rgba(255,255,255,.38)"><span>Income this month</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.income)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.38)"><span>Already spent</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.spent)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;font-size:10px;color:rgba(255,255,255,.38)"><span>Upcoming commitments</span><strong style="color:rgba(255,255,255,.72)">${money(snapshot.upcoming)}</strong></span>
      <span style="display:flex;justify-content:space-between;gap:16px;margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.06);font-size:10px;color:rgba(255,255,255,.42)"><span>Projected room</span><strong style="color:${snapshot.projectedRoom >= 0 ? "#67e8c8" : "#ff7f8d"}">${snapshot.projectedRoom >= 0 ? "" : "−"}${money(Math.abs(snapshot.projectedRoom))}</strong></span>
      <span style="display:block;margin-top:7px;font-size:8.5px;font-weight:700;color:rgba(255,255,255,.22);text-align:center">100 = living within your means</span>
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
    if (activeLabel && meansSnapshot) ensureMeansMetric(activeLabel, meansSnapshot, toggleMeansMetric);
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
  window.addEventListener(CLARA_MONEY_ROUTINE_UPDATED_EVENT, handleFinanceRefresh);
  window.addEventListener("clara:schedule:create-event", handleFinanceRefresh);
  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      destroyed = true;
      observer.disconnect();
      window.removeEventListener(FINANCE_DATA_UPDATED_EVENT, handleFinanceRefresh);
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
