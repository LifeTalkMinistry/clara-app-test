import React, { useEffect, useMemo, useRef, useState } from "react";
import useUserRole from "@/hooks/useUserRole";
import {
  getRecurringCashFlowOwnerId,
  RECURRING_CASH_FLOW_UPDATED_EVENT,
} from "@/lib/recurringCashFlowRepository";
import {
  installScheduleBillControls,
  readScheduleBillDraft,
} from "./recurringScheduleDomEnhancer";
import {
  saveRecurringScheduleBill,
  syncRecurringBillsIntoSchedule,
} from "./recurringScheduleIntegration";
import OriginalScheduleImpactPortalPanel from "./DashboardScheduleImpactPortalPanel.jsx";

const SCHEDULE_SYNC_INCOME_EVENT = "clara:schedule:sync-income-events";
const INCOME_HUB_UPDATED_EVENT = "clara-income-hub-updated";

function cleanLabel(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function readForecastAmount(button) {
  const text = button?.closest?.('[role="dialog"]')?.textContent || "";
  const matches = [...String(text).matchAll(/₱\s*([0-9,]+(?:\.\d+)?)/g)];
  const last = matches.at(-1)?.[1] || "0";
  return Number(last.replaceAll(",", "")) || 0;
}

function findBillCategory(form) {
  return [...(form?.querySelectorAll("select") || [])].find(
    (select) =>
      !select.closest("[data-schedule-bill-controls]") &&
      [...select.options].some((option) => option.value === "Bill")
  ) || null;
}

function findOriginalActionButtons(form) {
  const buttons = [...(form?.querySelectorAll("button") || [])].filter(
    (button) => button.dataset.billPrimarySave !== "true"
  );

  return {
    impactButton: buttons.find((button) => {
      const label = cleanLabel(button.textContent);
      return label.includes("calculate money impact") || label.includes("check budget impact");
    }) || null,
    directSave: buttons.find((button) => {
      const label = cleanLabel(button.textContent);
      return (
        label === "save without impact" ||
        label === "save recurring bill" ||
        label === "save bill"
      );
    }) || null,
  };
}

function showBillValidation(form, message = "") {
  const validation = form?.querySelector("[data-bill-save-validation]");
  if (validation && validation.textContent !== message) validation.textContent = message;
}

function validateBillDraft(form, draft) {
  if (!draft?.title) {
    showBillValidation(form, "Enter the bill name before saving.");
    form?.querySelector("[data-bill-title-mirror]")?.focus();
    return false;
  }

  if (!(Number(draft.expectedAmount) > 0)) {
    showBillValidation(form, "Enter an expected amount above ₱0.");
    form?.querySelector("[data-bill-expected-amount]")?.focus();
    return false;
  }

  showBillValidation(form, "");
  return true;
}

function configureBillActions(form) {
  if (!form) return;
  const controls = form.querySelector("[data-schedule-bill-controls]");
  const category = findBillCategory(form);
  if (!controls || !category) return;

  const isBill = category.value === "Bill";
  const { impactButton, directSave } = findOriginalActionButtons(form);
  let actionArea = controls.querySelector("[data-bill-primary-action-area]");
  let primarySave = controls.querySelector("[data-bill-primary-save]");

  if (!actionArea) {
    actionArea = document.createElement("div");
    actionArea.dataset.billPrimaryActionArea = "true";
    actionArea.className = "space-y-2 pt-1";

    const validation = document.createElement("p");
    validation.dataset.billSaveValidation = "true";
    validation.className = "min-h-4 text-center text-[11px] font-bold text-rose-200/90";

    primarySave = document.createElement("button");
    primarySave.type = "button";
    primarySave.dataset.billPrimarySave = "true";
    primarySave.className = "w-full rounded-2xl border border-fuchsia-200/24 bg-gradient-to-r from-fuchsia-500/24 via-violet-500/24 to-cyan-400/18 px-4 py-3.5 text-sm font-black text-white shadow-[0_12px_32px_rgba(147,51,234,.18)] transition active:scale-[.99]";
    primarySave.addEventListener("click", () => {
      const draft = readScheduleBillDraft(form);
      if (!validateBillDraft(form, draft)) return;
      findOriginalActionButtons(form).directSave?.click();
    });

    const helper = document.createElement("p");
    helper.className = "text-center text-[10px] font-semibold leading-4 text-white/38";
    helper.textContent = "This saves the bill to Schedule and prepares it for the applicable Budget cycle.";

    actionArea.append(validation, primarySave, helper);
    controls.appendChild(actionArea);
  }

  const recurrence = controls.querySelector("[data-bill-recurrence]")?.value || "one_time";
  if (primarySave) {
    const nextLabel = recurrence === "one_time" ? "Save bill" : "Save recurring bill";
    if (primarySave.textContent !== nextLabel) primarySave.textContent = nextLabel;
    primarySave.hidden = !isBill;
  }
  if (actionArea) actionArea.hidden = !isBill;

  if (impactButton) {
    impactButton.hidden = isBill;
    impactButton.setAttribute("aria-hidden", isBill ? "true" : "false");
  }
  if (directSave) {
    directSave.hidden = isBill;
    directSave.setAttribute("aria-hidden", isBill ? "true" : "false");
  }

  if (category.dataset.billPrimaryActionBound !== "true") {
    category.dataset.billPrimaryActionBound = "true";
    category.addEventListener("change", () => configureBillActions(form));
  }

  const recurrenceSelect = controls.querySelector("[data-bill-recurrence]");
  if (recurrenceSelect && recurrenceSelect.dataset.billPrimaryActionBound !== "true") {
    recurrenceSelect.dataset.billPrimaryActionBound = "true";
    recurrenceSelect.addEventListener("change", () => configureBillActions(form));
  }
}

function markPlannerButtons(pendingBill) {
  if (!pendingBill) return;
  document.querySelectorAll("button").forEach((button) => {
    const label = cleanLabel(button.textContent);
    if (label === "save with forecast") {
      button.dataset.recurringBillForecastSave = "true";
      button.textContent = "Save recurring bill";
    } else if (label === "save schedule only") {
      button.dataset.recurringBillScheduleSave = "true";
      button.textContent = "Save bill without impact";
    }
  });
}

function mutationNeedsEnhancement(mutation) {
  return [...mutation.addedNodes].some((node) => {
    if (node.nodeType !== 1) return false;
    const element = node;
    return (
      element.matches?.('form, [role="dialog"], input[placeholder="Schedule title"], input[placeholder="Bill title"]') ||
      element.querySelector?.('form, [role="dialog"], input[placeholder="Schedule title"], input[placeholder="Bill title"]')
    );
  });
}

export default function DashboardScheduleImpactPortalPanel(props) {
  const { user } = useUserRole() || {};
  const ownerId = useMemo(() => getRecurringCashFlowOwnerId(user), [user]);
  const pendingBillRef = useRef(null);
  const [scheduleRevision, setScheduleRevision] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const enhance = () => {
      document
        .querySelectorAll('input[placeholder="Schedule title"], input[placeholder="Bill title"]')
        .forEach((input) => {
          const form = input.closest("form");
          installScheduleBillControls(form);
          configureBillActions(form);
        });
      markPlannerButtons(pendingBillRef.current);
    };

    const onPointerDown = (event) => {
      if (props.guidePreviewMode) return;
      const button = event.target?.closest?.("button");
      if (!button) return;
      const label = cleanLabel(button.textContent);
      const form = button.closest("form");

      if (button.dataset.billPrimarySave === "true") {
        const draft = readScheduleBillDraft(form);
        if (!validateBillDraft(form, draft)) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation?.();
          return;
        }
        saveRecurringScheduleBill(ownerId, draft);
        pendingBillRef.current = null;
        return;
      }

      if (
        button.dataset.billImpactTrigger === "true" ||
        label.includes("check money impact") ||
        label.includes("calculate money impact")
      ) {
        const draft = readScheduleBillDraft(form);
        if (draft) pendingBillRef.current = draft;
        return;
      }

      if (
        button.dataset.billDirectSave === "true" ||
        label === "save recurring bill" ||
        label === "save bill"
      ) {
        const draft = readScheduleBillDraft(form);
        if (draft) saveRecurringScheduleBill(ownerId, draft);
        pendingBillRef.current = null;
        return;
      }

      const forecastSave =
        button.dataset.recurringBillForecastSave === "true" ||
        label === "save with forecast";
      const scheduleOnlySave =
        button.dataset.recurringBillScheduleSave === "true" ||
        label === "save schedule only" ||
        label === "save bill without impact";

      if (forecastSave || scheduleOnlySave) {
        const draft = pendingBillRef.current;
        if (!draft) return;
        saveRecurringScheduleBill(
          ownerId,
          draft,
          forecastSave ? readForecastAmount(button) : 0
        );
        pendingBillRef.current = null;
      }
    };

    const onIncomeScheduleSync = (event) => {
      if (
        event?.detail?.ownerId &&
        String(event.detail.ownerId) !== String(ownerId)
      ) {
        return;
      }

      // recurringScheduleIntegration has already performed deterministic
      // localStorage replacement. Remount the legacy Schedule state owner so
      // its in-memory event list exactly matches that stored projection.
      setScheduleRevision((current) => current + 1);
    };

    const resyncSchedule = () => {
      window.setTimeout(() => syncRecurringBillsIntoSchedule(ownerId), 0);
    };

    let scheduled = false;
    const observer = new MutationObserver((mutations) => {
      if (!mutations.some(mutationNeedsEnhancement) || scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        enhance();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener(SCHEDULE_SYNC_INCOME_EVENT, onIncomeScheduleSync);
    window.addEventListener(INCOME_HUB_UPDATED_EVENT, resyncSchedule);
    enhance();
    resyncSchedule();

    const onRecurringUpdate = (event) => {
      if (
        event?.detail?.ownerId &&
        String(event.detail.ownerId) !== String(ownerId)
      ) {
        return;
      }
      resyncSchedule();
    };
    window.addEventListener(
      RECURRING_CASH_FLOW_UPDATED_EVENT,
      onRecurringUpdate
    );

    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener(SCHEDULE_SYNC_INCOME_EVENT, onIncomeScheduleSync);
      window.removeEventListener(INCOME_HUB_UPDATED_EVENT, resyncSchedule);
      window.removeEventListener(
        RECURRING_CASH_FLOW_UPDATED_EVENT,
        onRecurringUpdate
      );
    };
  }, [ownerId, props.guidePreviewMode]);

  return React.createElement(OriginalScheduleImpactPortalPanel, {
    ...props,
    key: `schedule-${ownerId}-${scheduleRevision}`,
  });
}
