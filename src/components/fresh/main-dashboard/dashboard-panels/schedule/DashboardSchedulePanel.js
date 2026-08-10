import React, { useEffect, useRef } from "react";
import { askGeminiForUnderstanding } from "@/lib/ai-command/gemini-service";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

const SCHEDULE_BRAND_CSS = `
  .clara-schedule-brand {
    --clara-brand-blue: #1769ff;
    --clara-brand-blue-soft: #73a9ff;
    --clara-brand-gold: #f5c84b;
    --clara-brand-red: #e53945;
    --clara-brand-navy: #050b18;
    --clara-brand-panel: #081426;
  }

  /* Official CLARA palette: deep navy first, blue dominant, gold highlight, red accent. */
  .clara-schedule-brand [class*="text-cyan-"] {
    color: rgba(205, 224, 255, .82) !important;
  }

  .clara-schedule-brand p[class*="uppercase"][class*="text-cyan-"] {
    color: var(--clara-brand-gold) !important;
    text-shadow: 0 0 16px rgba(245, 200, 75, .10);
  }

  .clara-schedule-brand [class*="border-cyan-"] {
    border-color: rgba(65, 132, 255, .30) !important;
  }

  .clara-schedule-brand [class*="bg-cyan-300"] {
    background-color: rgba(23, 105, 255, .12) !important;
  }

  .clara-schedule-brand [class*="bg-cyan-200"] {
    background-color: rgba(52, 125, 255, .12) !important;
  }

  .clara-schedule-brand [class*="bg-cyan-100"] {
    background-color: rgba(115, 169, 255, .72) !important;
  }

  .clara-schedule-brand [class*="bg-fuchsia-"] {
    background-color: rgba(229, 57, 69, .64) !important;
  }

  .clara-schedule-brand [class*="text-fuchsia-"] {
    color: rgba(255, 180, 185, .90) !important;
  }

  .clara-schedule-brand [class*="border-fuchsia-"] {
    border-color: rgba(229, 57, 69, .30) !important;
  }

  .clara-schedule-brand [class*="bg-violet-"] {
    background-color: rgba(229, 57, 69, .10) !important;
  }

  .clara-schedule-brand [class*="bg-amber-"] {
    background-color: rgba(245, 200, 75, .12) !important;
  }

  .clara-schedule-brand [class*="border-amber-"] {
    border-color: rgba(245, 200, 75, .34) !important;
  }

  /* TODAY / SELECTED AGENDA */
  .clara-schedule-brand button[class*="min-h-[clamp(106px"] {
    position: relative;
    border-color: rgba(69, 132, 255, .34) !important;
    background:
      radial-gradient(circle at 5% 110%, rgba(23, 105, 255, .24), transparent 42%),
      radial-gradient(circle at 105% -5%, rgba(229, 57, 69, .15), transparent 38%),
      linear-gradient(145deg, rgba(6, 17, 36, .98), rgba(8, 28, 60, .95) 58%, rgba(21, 12, 25, .96)) !important;
    box-shadow:
      0 20px 52px rgba(0, 0, 0, .34),
      inset 0 1px 0 rgba(255, 255, 255, .07),
      0 0 0 1px rgba(23, 105, 255, .05) !important;
  }

  .clara-schedule-brand button[class*="min-h-[clamp(106px"]::before {
    content: "";
    position: absolute;
    inset: 0 18px auto 18px;
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(90deg,
      var(--clara-brand-blue) 0 43%,
      var(--clara-brand-gold) 43% 57%,
      var(--clara-brand-red) 57% 100%);
    opacity: .88;
    box-shadow: 0 0 14px rgba(23, 105, 255, .18);
    pointer-events: none;
  }

  .clara-schedule-brand button[class*="min-h-[clamp(106px"] div[class*="rounded-[20px]"] {
    border-color: rgba(77, 141, 255, .32) !important;
    background: linear-gradient(145deg, rgba(23, 105, 255, .16), rgba(245, 200, 75, .045)) !important;
    color: rgba(218, 231, 255, .92) !important;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 0 22px rgba(23,105,255,.09) !important;
  }

  .clara-schedule-brand button[class*="min-h-[clamp(106px"] span[class*="rounded-full"][class*="uppercase"] {
    border-color: rgba(245, 200, 75, .30) !important;
    background: rgba(245, 200, 75, .065) !important;
    color: rgba(255, 235, 171, .78) !important;
  }

  /* MONTH CALENDAR */
  .clara-schedule-brand section[class*="rounded-[30px]"] {
    position: relative;
    border-color: rgba(255, 255, 255, .10) !important;
    background:
      radial-gradient(circle at -5% 18%, rgba(23, 105, 255, .17), transparent 34%),
      radial-gradient(circle at 106% 88%, rgba(229, 57, 69, .12), transparent 37%),
      linear-gradient(155deg, rgba(6, 16, 33, .98), rgba(6, 13, 29, .98) 52%, rgba(15, 12, 25, .98)) !important;
    box-shadow:
      0 20px 54px rgba(0, 0, 0, .30),
      inset 0 1px 0 rgba(255, 255, 255, .055),
      inset 0 0 0 1px rgba(23, 105, 255, .025) !important;
  }

  .clara-schedule-brand section[class*="rounded-[30px]"]::before {
    content: "";
    position: absolute;
    top: 0;
    left: 24px;
    right: 24px;
    height: 2px;
    z-index: 20;
    border-radius: 999px;
    background: linear-gradient(90deg,
      var(--clara-brand-blue) 0 45%,
      var(--clara-brand-gold) 45% 56%,
      var(--clara-brand-red) 56% 100%);
    opacity: .70;
    pointer-events: none;
  }

  .clara-schedule-brand section[class*="rounded-[30px]"] button[aria-label="Previous month"],
  .clara-schedule-brand section[class*="rounded-[30px]"] button[aria-label="Next month"] {
    border-color: rgba(77, 141, 255, .22) !important;
    background: rgba(23, 105, 255, .055) !important;
    color: rgba(195, 218, 255, .72) !important;
  }

  .clara-schedule-brand section[class*="rounded-[30px]"] button[aria-label="Add schedule"] {
    border-color: rgba(245, 200, 75, .32) !important;
    background: linear-gradient(145deg, rgba(23,105,255,.12), rgba(245,200,75,.075)) !important;
    color: var(--clara-brand-gold) !important;
    box-shadow: 0 0 18px rgba(245, 200, 75, .045);
  }

  /* Selected date = CLARA blue. Today = gold. Money impact = red. */
  .clara-schedule-brand button[class*="border-cyan-100/28"] {
    border-color: rgba(91, 151, 255, .78) !important;
    background: linear-gradient(155deg, rgba(23, 105, 255, .30), rgba(8, 26, 55, .94)) !important;
    color: white !important;
    box-shadow:
      0 0 0 1px rgba(23, 105, 255, .22),
      0 0 20px rgba(23, 105, 255, .20),
      inset 0 0 15px rgba(23, 105, 255, .10) !important;
  }

  .clara-schedule-brand button[class*="border-cyan-200/16"] {
    border-color: rgba(245, 200, 75, .44) !important;
    background: rgba(245, 200, 75, .055) !important;
    color: rgba(255, 245, 210, .88) !important;
  }

  .clara-schedule-brand button[class*="border-fuchsia-200/14"] {
    border-color: rgba(229, 57, 69, .27) !important;
    background: rgba(229, 57, 69, .055) !important;
  }

  .clara-schedule-brand button[class*="border-amber-200/18"] {
    border-color: rgba(245, 200, 75, .28) !important;
    background: rgba(245, 200, 75, .052) !important;
  }

  .clara-schedule-brand button[class*="border-cyan-100/28"] span[class*="top-1.5"][class*="bg-cyan-100"] {
    background: var(--clara-brand-gold) !important;
    box-shadow: 0 0 9px rgba(245, 200, 75, .34) !important;
  }

  .clara-schedule-brand span[class*="bg-fuchsia-200"] {
    background: var(--clara-brand-red) !important;
    box-shadow: 0 0 8px rgba(229,57,69,.20);
  }

  .clara-schedule-brand span[class*="bg-cyan-200"] {
    background: var(--clara-brand-blue-soft) !important;
    box-shadow: 0 0 8px rgba(23,105,255,.16);
  }

  .clara-schedule-brand span[class*="bg-amber-200"] {
    background: var(--clara-brand-gold) !important;
  }

  /* Monthly insight card: quieter, premium, no purple cast. */
  .clara-schedule-brand div[class*="rounded-[20px]"][class*="backdrop-blur-xl"] {
    border-color: rgba(255,255,255,.085) !important;
    background:
      linear-gradient(90deg, rgba(23,105,255,.055), transparent 30%),
      rgba(7, 15, 31, .88) !important;
    box-shadow: inset 2px 0 0 rgba(245,200,75,.50), inset 0 1px 0 rgba(255,255,255,.04) !important;
  }

  .clara-schedule-brand div[class*="rounded-[20px]"][class*="backdrop-blur-xl"] p {
    color: rgba(226, 234, 248, .62) !important;
  }

  /* Sheets + CLARA money-impact conversation */
  .clara-schedule-brand [role="dialog"] > div[class*="max-w-[520px]"] {
    border-color: rgba(62, 128, 255, .32) !important;
    background:
      radial-gradient(circle at 0 0, rgba(23,105,255,.14), transparent 32%),
      radial-gradient(circle at 100% 100%, rgba(229,57,69,.08), transparent 34%),
      rgba(5, 11, 24, .985) !important;
    box-shadow:
      0 26px 90px rgba(0,0,0,.66),
      0 0 38px rgba(23,105,255,.10),
      inset 0 1px 0 rgba(255,255,255,.055) !important;
  }

  .clara-schedule-brand [role="dialog"] input,
  .clara-schedule-brand [role="dialog"] textarea,
  .clara-schedule-brand [role="dialog"] select {
    border-color: rgba(255,255,255,.11) !important;
    background-color: rgba(8, 18, 38, .94) !important;
  }

  .clara-schedule-brand [role="dialog"] input:focus,
  .clara-schedule-brand [role="dialog"] textarea:focus,
  .clara-schedule-brand [role="dialog"] select:focus {
    border-color: rgba(75, 140, 255, .66) !important;
    box-shadow: 0 0 0 3px rgba(23,105,255,.08);
  }

  .clara-schedule-brand [role="dialog"] button[class*="bg-cyan-300"] {
    border-color: rgba(67, 133, 255, .40) !important;
    background: linear-gradient(135deg, rgba(23,105,255,.23), rgba(18,75,177,.18)) !important;
    color: rgba(228, 238, 255, .96) !important;
    box-shadow: 0 0 22px rgba(23,105,255,.09) !important;
  }

  .clara-schedule-brand [role="dialog"] div[class*="bg-cyan-300"] {
    background: linear-gradient(145deg, rgba(23,105,255,.19), rgba(23,105,255,.10)) !important;
    color: rgba(228,238,255,.92) !important;
  }

  @media (prefers-reduced-motion: reduce) {
    .clara-schedule-brand * {
      scroll-behavior: auto !important;
    }
  }
`;

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
      className: "contents clara-schedule-brand",
    },
    React.createElement("style", null, SCHEDULE_BRAND_CSS),
    React.createElement(OriginalDashboardSchedulePanel)
  );
}
