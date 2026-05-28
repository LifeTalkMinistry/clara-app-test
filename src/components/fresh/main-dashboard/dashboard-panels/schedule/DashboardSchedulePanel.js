import React, { useEffect, useRef } from "react";
import { askGeminiForUnderstanding } from "@/lib/ai-command/gemini-service";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sentenceCase(value) {
  const clean = cleanText(value);
  if (!clean) return "";
  return `${clean.charAt(0).toUpperCase()}${clean.slice(1)}`.replace(/([.!?])?$/, ".");
}

function localRefineEventDescription(form) {
  const raw = `${form.note || form.title || ""}`
    .replace(/[₱$]?\s*\d+(?:,\d{3})*(?:\.\d+)?/g, "")
    .replace(/\b(maybe|probably|around|estimate|estimated|budget|cost|costs|expense|expenses|spend|spending)\b/gi, "")
    .replace(/\b(food|snacks|coffee|fare|gas|transport|transportation|contribution|offering|entrance fee|fee|payment)\b/gi, "")
    .replace(/\s+(and|or)\s*$/i, "")
    .replace(/[,.]\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const fallback = form.title || form.type || "Personal schedule";
  return sentenceCase(raw || fallback);
}

function getNativeValueSetter(element) {
  const prototype = Object.getPrototypeOf(element);
  return Object.getOwnPropertyDescriptor(prototype, "value")?.set;
}

function updateControlledTextarea(textarea, value) {
  if (!textarea || !value) return;

  const setter = getNativeValueSetter(textarea);
  if (setter) setter.call(textarea, value);
  else textarea.value = value;

  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
}

function sanitizeAiNote(value) {
  return cleanText(value)
    .replace(/^refined\s*(description|schedule)?\s*:\s*/i, "")
    .replace(/^description\s*:\s*/i, "")
    .replace(/^note\s*:\s*/i, "")
    .replace(/^['"]+|['"]+$/g, "")
    .trim();
}

function readScheduleForm(root) {
  const dialog = root.querySelector('[role="dialog"]');
  const textarea = dialog?.querySelector("textarea");
  const titleInput = dialog?.querySelector('input[placeholder="Schedule title"]');
  const dateInput = dialog?.querySelector('input[type="date"]');
  const timeInput = dialog?.querySelector('input[type="time"]');
  const typeSelect = dialog?.querySelector("select");

  return {
    textarea,
    title: titleInput?.value || "",
    date: dateInput?.value || "",
    time: timeInput?.value || "",
    type: typeSelect?.value || "",
    note: textarea?.value || "",
  };
}

async function refineWithExistingClaraBrain(form) {
  const result = await askGeminiForUnderstanding({
    text: `Refine this CLARA schedule description only. Return the refined description in assistantMessage as one clean natural sentence. Do not calculate money impact. Do not save anything. Do not add advice. Do not invent costs or details. Do not include a label.\n\nSchedule form:\n${JSON.stringify({
      title: form.title,
      date: form.date,
      time: form.time,
      type: form.type,
      note: form.note,
    })}`,
    session: {
      history: [],
      currentCommand: {
        screen: "schedule",
        action: "refine_description_only",
      },
    },
    financeSnapshot: {},
  });

  return sanitizeAiNote(result?.assistantMessage);
}

export default function DashboardSchedulePanel() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let isRefining = false;

    const handleRefineClick = async (clickEvent) => {
      const button = clickEvent.target?.closest?.("button");
      if (!button || !root.contains(button)) return;

      const label = cleanText(button.textContent).toLowerCase();
      const isRefineButton = label.includes("refine with clara") || label.includes("clara thinking");
      if (!isRefineButton) return;

      clickEvent.preventDefault();
      clickEvent.stopPropagation();
      clickEvent.stopImmediatePropagation?.();

      if (isRefining) return;

      const form = readScheduleForm(root);
      if (!form.textarea || (!cleanText(form.note) && !cleanText(form.title))) return;

      const originalText = button.textContent;
      isRefining = true;
      button.disabled = true;
      button.textContent = "CLARA THINKING";
      button.classList.add("cursor-wait", "opacity-70");

      try {
        const aiNote = await refineWithExistingClaraBrain(form);
        const fallbackNote = localRefineEventDescription(form);
        const refinedNote = sanitizeAiNote(aiNote || fallbackNote);

        if (refinedNote && refinedNote !== form.note) {
          updateControlledTextarea(form.textarea, refinedNote);
        }
      } catch (error) {
        console.warn("[CLARA Schedule] AI description refinement fell back locally:", error);

        const fallbackNote = localRefineEventDescription(form);
        if (fallbackNote && fallbackNote !== form.note) {
          updateControlledTextarea(form.textarea, fallbackNote);
        }
      } finally {
        isRefining = false;
        button.disabled = false;
        button.textContent = cleanText(originalText) || "Refine with CLARA";
        button.classList.remove("cursor-wait", "opacity-70");
      }
    };

    root.addEventListener("click", handleRefineClick, true);
    return () => root.removeEventListener("click", handleRefineClick, true);
  }, []);

  return React.createElement(
    "div",
    {
      ref: rootRef,
      className: "contents",
    },
    React.createElement(OriginalDashboardSchedulePanel)
  );
}
