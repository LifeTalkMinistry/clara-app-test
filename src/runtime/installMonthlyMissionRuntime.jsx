import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import MonthlyMissionBoard, {
  MONTHLY_ENTRY_ID,
} from "@/components/challenges/MonthlyMissionBoard.jsx";

const CHALLENGE_PROGRESS_KEY = "clara-challenge-progress-v1";
const MONTHLY_HOST_ID = "clara-monthly-mission-runtime-host";
const MONTHLY_HIDDEN_ATTR = "data-clara-monthly-legacy-hidden";
const MONTHLY_PROGRESS_EVENT = "clara:monthly-mission-progress-updated";
const MONTHLY_ACTIVITY_EVENT = "clara:monthly-mission-activity";
const EXPENSE_UPDATED_EVENT = "clara-expenses-updated";
const PH_TIME_ZONE = "Asia/Manila";
const EXPENSE_INTENT_WINDOW_MS = 20_000;

let monthlyRoot = null;
let mountQueued = false;
let pendingExpenseSaveAt = 0;

function safeStorage() {
  try {
    return window?.localStorage || null;
  } catch {
    return null;
  }
}

function readProgress() {
  try {
    const raw = safeStorage()?.getItem(CHALLENGE_PROGRESS_KEY) || "{}";
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeProgress(progress) {
  try {
    safeStorage()?.setItem(CHALLENGE_PROGRESS_KEY, JSON.stringify(progress || {}));
  } catch {
    // Monthly Mission tracking must never block the normal CLARA experience.
  }
}

function manilaDateKey(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const map = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${map.year}-${map.month}-${map.day}`;
}

function currentMonthKey() {
  return manilaDateKey().slice(0, 7);
}

function notifyProgressUpdated() {
  window.dispatchEvent(new Event(MONTHLY_PROGRESS_EVENT));
}

function recordExpenseDay(dayKey = manilaDateKey()) {
  const safeDay = String(dayKey || "").slice(0, 10);
  const monthKey = currentMonthKey();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDay) || !safeDay.startsWith(`${monthKey}-`)) {
    return false;
  }

  const progress = readProgress();
  const entry = progress?.[MONTHLY_ENTRY_ID];
  if (!entry?.joinedAt || entry?.monthKey !== monthKey) return false;

  const joinedDay = manilaDateKey(new Date(entry.joinedAt));
  if (safeDay < joinedDay) return false;

  const existingDays = Array.isArray(entry.checkIns) ? entry.checkIns : [];
  if (existingDays.includes(safeDay)) return false;

  const nextDays = [...existingDays, safeDay].sort();
  writeProgress({
    ...progress,
    [MONTHLY_ENTRY_ID]: {
      ...entry,
      checkIns: nextDays,
      completedAt:
        nextDays.length >= 20
          ? entry.completedAt || new Date().toISOString()
          : null,
    },
  });
  notifyProgressUpdated();
  return true;
}

function MonthlyMissionRuntime() {
  const [progress, setProgress] = useState(readProgress);

  useEffect(() => {
    writeProgress(progress);
  }, [progress]);

  useEffect(() => {
    const sync = () => setProgress(readProgress());
    window.addEventListener(MONTHLY_PROGRESS_EVENT, sync);
    window.addEventListener("pageshow", sync);
    return () => {
      window.removeEventListener(MONTHLY_PROGRESS_EVENT, sync);
      window.removeEventListener("pageshow", sync);
    };
  }, []);

  return React.createElement(MonthlyMissionBoard, { progress, setProgress });
}

function findLegacyMonthlySection() {
  const challengeView = document.querySelector(".clara-community-challenges-view");
  if (!challengeView) return null;

  return (
    Array.from(challengeView.querySelectorAll("section")).find((section) => {
      if (section.closest(`#${MONTHLY_HOST_ID}`)) return false;
      const text = String(section.textContent || "");
      return (
        text.includes("Save Something Every Week") ||
        (text.includes("Monthly challenge") && text.includes("Join Challenge"))
      );
    }) || null
  );
}

function restoreLegacyMonthlySections() {
  document.querySelectorAll(`[${MONTHLY_HIDDEN_ATTR}="true"]`).forEach((section) => {
    section.style.display = section.dataset.claraMonthlyPreviousDisplay || "";
    delete section.dataset.claraMonthlyPreviousDisplay;
    section.removeAttribute(MONTHLY_HIDDEN_ATTR);
  });
}

function removeMonthlyHost() {
  const host = document.getElementById(MONTHLY_HOST_ID);
  if (host) {
    try {
      monthlyRoot?.unmount();
    } catch {
      // React may already have removed the runtime host during a tab transition.
    }
    host.remove();
  }
  monthlyRoot = null;
  restoreLegacyMonthlySections();
}

function syncMonthlyMount() {
  mountQueued = false;
  const monthlySection = findLegacyMonthlySection();

  if (!monthlySection) {
    removeMonthlyHost();
    return;
  }

  document.querySelectorAll(`[${MONTHLY_HIDDEN_ATTR}="true"]`).forEach((section) => {
    if (section !== monthlySection) {
      section.style.display = section.dataset.claraMonthlyPreviousDisplay || "";
      delete section.dataset.claraMonthlyPreviousDisplay;
      section.removeAttribute(MONTHLY_HIDDEN_ATTR);
    }
  });

  if (monthlySection.getAttribute(MONTHLY_HIDDEN_ATTR) !== "true") {
    monthlySection.dataset.claraMonthlyPreviousDisplay = monthlySection.style.display || "";
    monthlySection.style.display = "none";
    monthlySection.setAttribute(MONTHLY_HIDDEN_ATTR, "true");
  }

  let host = document.getElementById(MONTHLY_HOST_ID);
  if (host && host.previousElementSibling !== monthlySection) {
    removeMonthlyHost();
    host = null;
    monthlySection.dataset.claraMonthlyPreviousDisplay = monthlySection.style.display || "";
    monthlySection.style.display = "none";
    monthlySection.setAttribute(MONTHLY_HIDDEN_ATTR, "true");
  }

  if (!host) {
    host = document.createElement("div");
    host.id = MONTHLY_HOST_ID;
    host.className = "clara-monthly-mission-runtime-host space-y-4";
    monthlySection.insertAdjacentElement("afterend", host);
    monthlyRoot = createRoot(host);
    monthlyRoot.render(React.createElement(MonthlyMissionRuntime));
  }
}

function queueMonthlyMount() {
  if (mountQueued) return;
  mountQueued = true;
  window.requestAnimationFrame(syncMonthlyMount);
}

function captureExpenseIntent(event) {
  const button = event.target?.closest?.("button");
  if (!button) return;
  const label = String(button.textContent || "").replace(/\s+/g, " ").trim();

  if (label === "Add Expense") {
    pendingExpenseSaveAt = Date.now();
    return;
  }

  if (label === "Add Funds" || label === "Transfer Money") {
    pendingExpenseSaveAt = 0;
  }
}

function handleExpenseUpdated() {
  if (!pendingExpenseSaveAt) return;
  const elapsed = Date.now() - pendingExpenseSaveAt;
  pendingExpenseSaveAt = 0;
  if (elapsed < 0 || elapsed > EXPENSE_INTENT_WINDOW_MS) return;
  recordExpenseDay();
}

function handleExplicitMonthlyActivity(event) {
  if (event?.detail?.type !== "expense_logged") return;
  recordExpenseDay(event?.detail?.dayKey || manilaDateKey());
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const observer = new MutationObserver(queueMonthlyMount);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("click", captureExpenseIntent, true);
  document.addEventListener("click", queueMonthlyMount, true);
  window.addEventListener("hashchange", queueMonthlyMount);
  window.addEventListener(EXPENSE_UPDATED_EVENT, handleExpenseUpdated);
  window.addEventListener(MONTHLY_ACTIVITY_EVENT, handleExplicitMonthlyActivity);
  window.setTimeout(queueMonthlyMount, 0);
}
