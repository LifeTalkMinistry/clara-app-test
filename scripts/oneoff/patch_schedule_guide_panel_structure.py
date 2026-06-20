from pathlib import Path


def exact(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


path = Path("src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx")
text = path.read_text(encoding="utf-8")

text = exact(text, 'import { useEffect, useMemo, useState } from "react";', 'import { useEffect, useMemo, useRef, useState } from "react";', "useRef import")
text = exact(text, 'import useUserRole from "@/hooks/useUserRole";', 'import useUserRole from "@/hooks/useUserRole";\nimport ClaraGuideScheduleOverlay from "../../guide/ClaraGuideScheduleOverlay";', "overlay import")
text = exact(
    text,
    'const DOUBLE_TAP_DELAY_MS = 380;',
    '''const DOUBLE_TAP_DELAY_MS = 380;
const CLARA_GUIDE_SCHEDULE_PHASE_CHANGE_EVENT = "clara:guide-schedule-phase-change";
const CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT = "clara:guide-schedule-phase-request";
const CLARA_GUIDE_EXIT_EVENT = "clara:guide-exit";
const GUIDE_DEMO_EVENT_ID = "clara-guide-schedule-demo-event";
const EMPTY_DATE_TAP = { date: "", time: 0 };

const SCHEDULE_GUIDE_PHASES = {
  INACTIVE: "inactive",
  AWAIT_SCHEDULE_TAB: "await-schedule-tab",
  OVERVIEW: "schedule-overview",
  AGENDA_OVERVIEW: "agenda-overview",
  CALENDAR_OVERVIEW: "calendar-overview",
  SELECT_DATE: "select-date",
  DATE_SELECTED: "date-selected",
  DOUBLE_TAP_DATE: "double-tap-date",
  SETUP_EVENT: "setup-event",
  EVENT_SAVED: "event-saved",
  OPEN_EVENT_DETAILS: "open-event-details",
  EVENT_DETAILS: "event-details",
};''',
    "guide constants",
)
text = exact(
    text,
    '''function isSameMonth(event, monthDate) {
  const eventDate = fromDateKey(event?.date);
  return eventDate.getFullYear() === monthDate.getFullYear() && eventDate.getMonth() === monthDate.getMonth();
}''',
    '''function isSameMonth(event, monthDate) {
  const eventDate = fromDateKey(event?.date);
  return eventDate.getFullYear() === monthDate.getFullYear() && eventDate.getMonth() === monthDate.getMonth();
}

function chooseGuideDate(monthDate, todayKey) {
  const candidates = buildMonthCells(monthDate).filter(Boolean);
  const preferredDays = [15, 14, 16, 13, 17, 12, 18, 11, 19, 10, 20, 9, 21, 8, 22, 23, 24];
  const ranked = preferredDays
    .map((day) => candidates.find((cell) => cell.day === day))
    .filter(Boolean);
  const fallback = candidates.filter((cell) => cell.key !== todayKey);
  const pool = [...ranked, ...fallback, ...candidates];
  return pool.find((cell) => cell.key !== todayKey && !getHoliday(cell.key))?.key ||
    pool.find((cell) => !getHoliday(cell.key))?.key ||
    candidates[0]?.key ||
    todayKey;
}

function requestScheduleGuidePhase(phase) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(CLARA_GUIDE_SCHEDULE_PHASE_REQUEST_EVENT, {
      detail: { phase },
    })
  );
}''',
    "guide helpers",
)
text = exact(
    text,
    '''    <button
      type="button"
      onClick={() => agenda.event && onOpen(agenda.event)}''',
    '''    <button
      data-clara-schedule-agenda-card="true"
      type="button"
      onClick={() => agenda.event && onOpen(agenda.event)}''',
    "agenda marker",
)
text = exact(
    text,
    'function CalendarMonth({ monthDate, cells, selectedDate, todayKey, byDate, onSelect, onPrev, onNext, onAdd }) {',
    'function CalendarMonth({ monthDate, cells, selectedDate, todayKey, byDate, onSelect, onPrev, onNext, onAdd, guideDateKey = "", guidePreviewMode = false }) {',
    "calendar signature",
)
text = exact(text, '    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px]', '    <section data-clara-schedule-calendar="true" className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px]', "calendar marker")
text = exact(text, '        <button\n          type="button"\n          onClick={onPrev}', '        <button\n          data-clara-schedule-prev-month="true"\n          type="button"\n          onClick={onPrev}', "prev marker")
text = exact(text, '<p className="text-[clamp(0.82rem,3.5vw,0.92rem)] font-black text-white/88">{formatMonth(monthDate)}</p>', '<p data-clara-schedule-month-heading="true" className="text-[clamp(0.82rem,3.5vw,0.92rem)] font-black text-white/88">{formatMonth(monthDate)}</p>', "month marker")
text = exact(text, '          <button\n            type="button"\n            onClick={onAdd}', '          <button\n            data-clara-schedule-add-button="true"\n            type="button"\n            onClick={onAdd}', "add marker")
text = exact(text, '          <button\n            type="button"\n            onClick={onNext}', '          <button\n            data-clara-schedule-next-month="true"\n            type="button"\n            onClick={onNext}', "next marker")
text = exact(
    text,
    '''            <button
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}''',
    '''            <button
              key={cell.key}
              data-clara-schedule-date={cell.key}
              data-clara-guide-schedule-target-date={
                guidePreviewMode && cell.key === guideDateKey ? "true" : undefined
              }
              type="button"
              onClick={() => onSelect(cell.key)}''',
    "date markers",
)
text = exact(text, '    <div className="shrink-0 rounded-[20px] border border-white/7', '    <div data-clara-schedule-monthly-insight="true" className="shrink-0 rounded-[20px] border border-white/7', "insight marker")
text = exact(text, 'function Sheet({ event, mode, form, setForm, onSave, onRemove, onClose, onRefineDescription, onStartImpact }) {', 'function Sheet({ event, mode, form, setForm, onSave, onRemove, onClose, onRefineDescription, onStartImpact, guidePreviewMode = false }) {', "sheet signature")
text = exact(text, '    <div\n      role="dialog"\n      aria-modal="true"', '    <div\n      data-clara-schedule-sheet="true"\n      role="dialog"\n      aria-modal="true"', "sheet marker")
text = exact(text, '      <div\n        className="w-full max-w-[520px] rounded-[30px]', '      <div\n        data-clara-schedule-sheet-surface="true"\n        className="w-full max-w-[520px] rounded-[30px]', "sheet surface")
text = exact(text, '<form onSubmit={onStartImpact} className="mt-5 space-y-3">', '<form data-clara-schedule-add-form="true" onSubmit={onStartImpact} className="mt-5 space-y-3">', "form marker")
text = exact(text, '            <input\n              value={form.title}', '            <input\n              data-clara-schedule-title-input="true"\n              value={form.title}', "title marker")
text = exact(text, '              <input\n                type="date"', '              <input\n                data-clara-schedule-date-input="true"\n                type="date"', "date input")
text = exact(text, '              <input\n                type="time"', '              <input\n                data-clara-schedule-time-input="true"\n                type="time"', "time input")
text = exact(text, '              <select\n                value={form.type}', '              <select\n                data-clara-schedule-type-input="true"\n                value={form.type}', "type input")
text = exact(text, '              <textarea\n                value={form.note}', '              <textarea\n                data-clara-schedule-description-input="true"\n                value={form.note}', "description input")
text = exact(text, '<button type="submit" className="w-full rounded-2xl border border-cyan-300/24', '<button data-clara-schedule-calculate-impact="true" type="submit" disabled={guidePreviewMode} className="w-full rounded-2xl border border-cyan-300/24', "calculate marker")
text = exact(text, '<button type="button" onClick={onSave} className="w-full rounded-2xl border border-white/10', '<button data-clara-schedule-save-direct="true" type="button" onClick={onSave} className="w-full rounded-2xl border border-white/10', "save marker")
text = exact(text, '<div className="mt-5 space-y-4">\n            <div className="rounded-2xl border border-white/8', '<div data-clara-schedule-event-detail="true" className="mt-5 space-y-4">\n            <div className="rounded-2xl border border-white/8', "detail marker")
text = exact(
    text,
    '''            <button
              type="button"
              onClick={() => onRemove(event.id)}''',
    '''            <button
              data-clara-schedule-remove-event="true"
              type="button"
              disabled={guidePreviewMode}
              onClick={() => onRemove(event.id)}''',
    "remove marker",
)
text = exact(text, 'export default function DashboardSchedulePanel() {', 'export default function DashboardSchedulePanel({ guidePreviewMode = false, scheduleGuidePhase = "inactive" }) {', "panel signature")

path.write_text(text, encoding="utf-8")
print("Schedule Guide structure patched")
