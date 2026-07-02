import React, { useEffect, useMemo, useRef } from "react";
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

function readForecastAmount(button) {
  const text = button?.closest?.('[role="dialog"]')?.textContent || "";
  const matches = [...String(text).matchAll(/₱\s*([0-9,]+(?:\.\d+)?)/g)];
  const last = matches.at(-1)?.[1] || "0";
  return Number(last.replaceAll(",", "")) || 0;
}

function markPlannerButtons(pendingBill) {
  if (!pendingBill) return;
  document.querySelectorAll("button").forEach((button) => {
    const label = String(button.textContent || "").trim().toLowerCase();
    if (label === "save with forecast") {
      button.dataset.recurringBillForecastSave = "true";
      button.textContent = "Save recurring bill";
    } else if (label === "save schedule only") {
      button.dataset.recurringBillScheduleSave = "true";
      button.textContent = "Save bill without impact";
    }
  });
}

export default function DashboardScheduleImpactPortalPanel(props) {
  const { user } = useUserRole() || {};
  const ownerId = useMemo(() => getRecurringCashFlowOwnerId(user), [user]);
  const pendingBillRef = useRef(null);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const enhance = () => {
      document
        .querySelectorAll('input[placeholder="Schedule title"], input[placeholder="Bill title"]')
        .forEach((input) => installScheduleBillControls(input.closest("form")));
      markPlannerButtons(pendingBillRef.current);
    };

    const onPointerDown = (event) => {
      if (props.guidePreviewMode) return;
      const button = event.target?.closest?.("button");
      if (!button) return;
      const label = String(button.textContent || "").trim().toLowerCase();
      const form = button.closest("form");

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

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointerdown", onPointerDown, true);
    enhance();
    window.setTimeout(() => syncRecurringBillsIntoSchedule(ownerId), 0);

    const onRecurringUpdate = (event) => {
      if (
        event?.detail?.ownerId &&
        String(event.detail.ownerId) !== String(ownerId)
      ) {
        return;
      }
      window.setTimeout(() => syncRecurringBillsIntoSchedule(ownerId), 0);
    };
    window.addEventListener(
      RECURRING_CASH_FLOW_UPDATED_EVENT,
      onRecurringUpdate
    );

    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener(
        RECURRING_CASH_FLOW_UPDATED_EVENT,
        onRecurringUpdate
      );
    };
  }, [ownerId, props.guidePreviewMode]);

  return React.createElement(OriginalScheduleImpactPortalPanel, props);
}
