import React from "react";
import { createRoot } from "react-dom/client";
import ClaraGuideScheduleOverlay from "@/components/fresh/main-dashboard/guide/ClaraGuideScheduleOverlay";

const PHASE_CHANGE = "clara:guide-schedule-phase-change";
const PHASE_REQUEST = "clara:guide-schedule-phase-request";
const GUIDE_EXIT = "clara:guide-exit";
const STORAGE_PREFIX = "clara_schedule_events_v2";
const LEGACY_STORAGE_KEY = "clara_lifeos_schedule_events_v1";
const ACTIVE_PHASES = new Set([
  "schedule-overview", "agenda-overview", "calendar-overview", "select-date",
  "date-selected", "double-tap-date", "setup-event", "event-saved",
  "open-event-details", "event-details",
]);

let installed = false;
let phase = "inactive";
let guideDateKey = "";
let singleTapAt = 0;
let pendingPhase = "";
let observer = null;
let overlayHost = null;
let overlayRoot = null;
let storageGuard = null;
let clickHandler = null;
let requestHandler = null;

const isScheduleKey = (key) => String(key || "").startsWith(STORAGE_PREFIX) || key === LEGACY_STORAGE_KEY;
const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const buttons = (root = document) => Array.from(root.querySelectorAll?.("button") || []);

function requestPhase(nextPhase) {
  if (!nextPhase || pendingPhase === nextPhase || phase === nextPhase) return;
  pendingPhase = nextPhase;
  window.dispatchEvent(new CustomEvent(PHASE_REQUEST, { detail: { phase: nextPhase } }));
}

function installStorageGuard() {
  if (storageGuard || typeof Storage === "undefined") return;
  const proto = Storage.prototype;
  const original = {
    getItem: proto.getItem,
    setItem: proto.setItem,
    removeItem: proto.removeItem,
  };
  const memory = new Map();

  function guardedGetItem(key) {
    if (ACTIVE_PHASES.has(phase) && isScheduleKey(key)) {
      return memory.has(String(key)) ? memory.get(String(key)) : null;
    }
    return original.getItem.call(this, key);
  }

  function guardedSetItem(key, value) {
    if (ACTIVE_PHASES.has(phase) && isScheduleKey(key)) {
      memory.set(String(key), String(value));
      return;
    }
    return original.setItem.call(this, key, value);
  }

  function guardedRemoveItem(key) {
    if (ACTIVE_PHASES.has(phase) && isScheduleKey(key)) {
      memory.delete(String(key));
      return;
    }
    return original.removeItem.call(this, key);
  }

  proto.getItem = guardedGetItem;
  proto.setItem = guardedSetItem;
  proto.removeItem = guardedRemoveItem;
  storageGuard = { proto, original, guardedGetItem, guardedSetItem, guardedRemoveItem };
}

function restoreStorage() {
  if (!storageGuard) return;
  const { proto, original, guardedGetItem, guardedSetItem, guardedRemoveItem } = storageGuard;
  if (proto.getItem === guardedGetItem) proto.getItem = original.getItem;
  if (proto.setItem === guardedSetItem) proto.setItem = original.setItem;
  if (proto.removeItem === guardedRemoveItem) proto.removeItem = original.removeItem;
  storageGuard = null;
}

function setControlledValue(element, value) {
  if (!element) return;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function locateSchedule() {
  const calendar = Array.from(document.querySelectorAll("section")).find((node) =>
    clean(node.textContent).includes("Tap to view • double tap to add")
  );
  if (!calendar) return null;

  calendar.dataset.claraScheduleCalendar = "true";
  const surface = calendar.parentElement;
  if (surface) {
    surface.dataset.claraGuideSchedulePreview = "true";
    surface.dataset.claraGuideScheduleStaticSurface = "true";
  }

  const agenda = surface?.querySelector(":scope > button") || calendar.previousElementSibling;
  if (agenda?.tagName === "BUTTON") agenda.dataset.claraScheduleAgendaCard = "true";
  const insight = calendar.nextElementSibling;
  if (insight) insight.dataset.claraScheduleMonthlyInsight = "true";

  const previous = calendar.querySelector('button[aria-label="Previous month"]');
  const add = calendar.querySelector('button[aria-label="Add schedule"]');
  const next = calendar.querySelector('button[aria-label="Next month"]');
  if (previous) previous.dataset.claraSchedulePrevMonth = "true";
  if (add) add.dataset.claraScheduleAddButton = "true";
  if (next) next.dataset.claraScheduleNextMonth = "true";

  const dateButtons = Array.from(calendar.querySelectorAll('button[aria-label^="Select "]'));
  dateButtons.forEach((button) => {
    const key = button.getAttribute("aria-label")?.match(/^Select (\d{4}-\d{2}-\d{2})/)?.[1];
    if (key) button.dataset.claraScheduleDate = key;
  });

  if (!guideDateKey && dateButtons.length) {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const preferred = [15, 14, 16, 13, 17, 12, 18, 11, 19, 10, 20, 9, 21, 8, 22, 23, 24];
    const candidates = dateButtons.map((button) => ({
      button,
      key: button.dataset.claraScheduleDate,
      day: Number(button.dataset.claraScheduleDate?.slice(-2)),
      clear: button.getAttribute("title") === "Double tap to add a schedule",
    }));
    guideDateKey = preferred
      .map((day) => candidates.find((item) => item.day === day && item.key !== todayKey && item.clear))
      .find(Boolean)?.key ||
      candidates.find((item) => item.key !== todayKey && item.clear)?.key ||
      candidates.find((item) => item.key !== todayKey)?.key ||
      candidates[0]?.key || "";
  }

  dateButtons.forEach((button) => {
    if (button.dataset.claraScheduleDate === guideDateKey) {
      button.dataset.claraGuideScheduleTargetDate = "true";
    } else {
      delete button.dataset.claraGuideScheduleTargetDate;
    }
  });

  const monthHeading = Array.from(calendar.querySelectorAll("p")).find((node) =>
    /^[A-Za-z]+\s+\d{4}$/.test(clean(node.textContent))
  );
  if (monthHeading) monthHeading.dataset.claraScheduleMonthHeading = "true";
  return { surface, calendar, agenda };
}

function locateDialogs() {
  const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
  const addDialog = dialogs.find((dialog) => clean(dialog.querySelector("h3")?.textContent) === "Add schedule");
  if (addDialog) {
    addDialog.dataset.claraScheduleSheet = "true";
    const surface = addDialog.firstElementChild;
    if (surface) surface.dataset.claraScheduleSheetSurface = "true";
    const form = addDialog.querySelector("form");
    if (form) form.dataset.claraScheduleAddForm = "true";
    const title = addDialog.querySelector('input[placeholder="Schedule title"]');
    const date = addDialog.querySelector('input[type="date"]');
    const time = addDialog.querySelector('input[type="time"]');
    const type = addDialog.querySelector("select");
    const note = addDialog.querySelector("textarea");
    if (title) title.dataset.claraScheduleTitleInput = "true";
    if (date) date.dataset.claraScheduleDateInput = "true";
    if (time) time.dataset.claraScheduleTimeInput = "true";
    if (type) type.dataset.claraScheduleTypeInput = "true";
    if (note) note.dataset.claraScheduleDescriptionInput = "true";
    const calculate = buttons(addDialog).find((button) => clean(button.textContent) === "Calculate money impact");
    const save = buttons(addDialog).find((button) => clean(button.textContent) === "Save without impact");
    if (calculate) {
      calculate.dataset.claraScheduleCalculateImpact = "true";
      calculate.disabled = true;
      calculate.setAttribute("aria-disabled", "true");
    }
    if (save) save.dataset.claraScheduleSaveDirect = "true";

    if (phase === "setup-event" && addDialog.dataset.claraGuidePrefilled !== "true") {
      addDialog.dataset.claraGuidePrefilled = "true";
      setControlledValue(title, "Important Appointment");
      setControlledValue(date, guideDateKey);
      setControlledValue(time, "10:00");
      setControlledValue(type, "Personal");
      setControlledValue(note, "An important appointment added during the CLARA Guide walkthrough.");
    }
  }

  const detailDialog = dialogs.find((dialog) =>
    buttons(dialog).some((button) => clean(button.textContent).includes("Remove schedule"))
  );
  if (detailDialog) {
    const detail = buttons(detailDialog).find((button) => clean(button.textContent).includes("Remove schedule"))?.parentElement;
    if (detail) detail.dataset.claraScheduleEventDetail = "true";
    const remove = buttons(detailDialog).find((button) => clean(button.textContent).includes("Remove schedule"));
    if (remove) {
      remove.dataset.claraScheduleRemoveEvent = "true";
      remove.disabled = true;
      remove.setAttribute("aria-disabled", "true");
    }
  }

  return { addDialog, detailDialog };
}

function refresh() {
  const schedule = locateSchedule();
  const dialogs = locateDialogs();
  if (phase === "double-tap-date" && dialogs.addDialog) requestPhase("setup-event");
  if (phase === "open-event-details" && dialogs.detailDialog) requestPhase("event-details");
  return { schedule, dialogs };
}

function isAllowedClick(event) {
  const target = event.target;
  if (target.closest?.('[data-clara-guide-exit="true"]')) return true;
  if (target.closest?.('[data-clara-guide-schedule-action="true"]')) return true;
  if (phase === "select-date" || phase === "double-tap-date") {
    return Boolean(target.closest?.('[data-clara-guide-schedule-target-date="true"]'));
  }
  if (phase === "setup-event") return Boolean(target.closest?.('[data-clara-schedule-save-direct="true"]'));
  if (phase === "open-event-details") return Boolean(target.closest?.('[data-clara-schedule-agenda-card="true"]'));
  return false;
}

function handleClick(event) {
  if (!ACTIVE_PHASES.has(phase)) return;
  const targetDate = event.target.closest?.('[data-clara-guide-schedule-target-date="true"]');
  const save = event.target.closest?.('[data-clara-schedule-save-direct="true"]');
  const agenda = event.target.closest?.('[data-clara-schedule-agenda-card="true"]');

  if (!isAllowedClick(event)) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    return;
  }

  if (phase === "select-date" && targetDate) {
    singleTapAt = Date.now();
    setTimeout(() => requestPhase("date-selected"), 0);
  } else if (phase === "setup-event" && save) {
    setTimeout(() => requestPhase("event-saved"), 0);
  } else if (phase === "open-event-details" && agenda) {
    setTimeout(refresh, 0);
  }
}

function cleanup() {
  pendingPhase = "";
  guideDateKey = "";
  singleTapAt = 0;
  restoreStorage();
  overlayRoot?.render(null);
  setTimeout(() => {
    const home = document.querySelector('button[aria-label="Home"]');
    if (home && !home.disabled) home.click();
  }, 120);
}

function renderOverlay() {
  if (!overlayRoot) {
    overlayHost = document.createElement("div");
    overlayHost.dataset.claraGuideScheduleOverlayHost = "true";
    document.body.appendChild(overlayHost);
    overlayRoot = createRoot(overlayHost);
  }
  overlayRoot.render(ACTIVE_PHASES.has(phase) ? React.createElement(ClaraGuideScheduleOverlay, { phase }) : null);
}

export function installClaraGuideScheduleRuntime() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;
  clickHandler = handleClick;
  document.addEventListener("click", clickHandler, true);

  requestHandler = (event) => {
    if (event?.detail?.phase !== "double-tap-date" || event.__claraScheduleDelayed) return;
    const remaining = Math.max(0, 420 - (Date.now() - singleTapAt));
    if (!singleTapAt || remaining <= 0) return;
    event.stopImmediatePropagation();
    setTimeout(() => {
      const delayed = new CustomEvent(PHASE_REQUEST, { detail: { phase: "double-tap-date" } });
      delayed.__claraScheduleDelayed = true;
      window.dispatchEvent(delayed);
    }, remaining);
  };
  window.addEventListener(PHASE_REQUEST, requestHandler, true);

  window.addEventListener(PHASE_CHANGE, (event) => {
    phase = event?.detail?.phase || "inactive";
    pendingPhase = "";
    if (ACTIVE_PHASES.has(phase)) installStorageGuard();
    else if (phase === "inactive") cleanup();
    renderOverlay();
    requestAnimationFrame(() => requestAnimationFrame(refresh));
  });

  window.addEventListener(GUIDE_EXIT, () => {
    phase = "inactive";
    cleanup();
  });

  observer = new MutationObserver(() => refresh());
  observer.observe(document.body, { childList: true, subtree: true });
}
