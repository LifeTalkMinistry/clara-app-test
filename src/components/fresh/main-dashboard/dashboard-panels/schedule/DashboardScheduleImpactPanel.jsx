import React, { useEffect, useRef } from "react";
import OriginalDashboardSchedulePanel from "./DashboardSchedulePanel.jsx";

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function makeTitle(value, type) {
  const text = cleanText(value).replace(/[.!?]+$/g, "");
  if (/church/i.test(text) && /outing/i.test(text)) return "Church outing";
  if (/church/i.test(text)) return "Church event";
  if (/outing|beach|resort|trip/i.test(text)) return "Outing";
  if (/meeting|office|shift|work/i.test(text)) return "Work schedule";
  if (/family|birthday|fiesta/i.test(text)) return "Family schedule";
  const shortText = text.split(" ").filter(Boolean).slice(0, 4).join(" ");
  return shortText || `${type || "Personal"} schedule`;
}

function nativeSet(element, value) {
  if (!element || !value) return;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function readForm(root) {
  const dialog = root.querySelector('[role="dialog"]');
  return {
    titleInput: dialog?.querySelector('input[placeholder="Schedule title"]'),
    noteInput: dialog?.querySelector("textarea"),
    typeInput: dialog?.querySelector("select"),
  };
}

function stretchImpactCoach(root) {
  const dialogs = Array.from(root.querySelectorAll('[role="dialog"]'));
  const impactDialog = dialogs.find((dialog) =>
    cleanText(dialog.textContent).toLowerCase().includes("clara impact coach")
  );

  dialogs.forEach((dialog) => {
    if (!impactDialog) {
      dialog.style.display = "";
      return;
    }

    if (dialog !== impactDialog) {
      dialog.style.display = "none";
      return;
    }

    dialog.style.display = "flex";
    dialog.classList.remove("items-end", "px-4");
    dialog.classList.add("items-stretch", "px-0");
    dialog.style.padding = "0";
    dialog.style.paddingBottom = "0";
    dialog.style.background = "#020617";
    dialog.style.backdropFilter = "none";
    dialog.style.zIndex = "120";

    const panel = dialog.firstElementChild;
    if (!panel) return;

    panel.classList.remove("rounded-[30px]", "max-h-[86svh]");
    panel.classList.add("rounded-none", "h-[100dvh]", "max-h-[100dvh]");
    panel.style.width = "100%";
    panel.style.maxWidth = "520px";
    panel.style.margin = "0 auto";
    panel.style.background = "#071026";
    panel.style.borderRadius = "0";
    panel.style.borderTop = "0";
    panel.style.borderBottom = "0";
  });
}

export default function DashboardScheduleImpactPanel() {
  const rootRef = useRef(null);
  const replayRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const onClick = (event) => {
      const button = event.target?.closest?.("button");
      if (!button || !root.contains(button)) return;

      const label = cleanText(button.textContent).toLowerCase();
      if (!label.includes("calculate money impact")) return;
      if (replayRef.current) return;

      const form = readForm(root);
      const title = cleanText(form.titleInput?.value);
      const note = cleanText(form.noteInput?.value);
      const type = cleanText(form.typeInput?.value);

      if (!title && note) {
        event.preventDefault();
        nativeSet(form.titleInput, makeTitle(note, type));
        replayRef.current = true;
        window.setTimeout(() => {
          button.click();
          window.setTimeout(() => {
            replayRef.current = false;
            stretchImpactCoach(root);
          }, 0);
        }, 0);
      }
    };

    const observer = new MutationObserver(() => stretchImpactCoach(root));
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener("click", onClick, true);

    return () => {
      observer.disconnect();
      root.removeEventListener("click", onClick, true);
    };
  }, []);

  return (
    <div ref={rootRef} className="contents">
      <OriginalDashboardSchedulePanel />
    </div>
  );
}
