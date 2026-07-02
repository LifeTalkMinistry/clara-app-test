import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import RecurringBillOccurrenceActions from "@/components/fresh/main-dashboard/budget/RecurringBillOccurrenceActions";
import { findRecurringBudgetOccurrence } from "@/components/fresh/main-dashboard/budget/findRecurringBudgetOccurrence";
import {
  createDefaultRecurringBudgetDraft,
  installRecurringBudgetControls,
  recurringBillToDraft,
} from "@/components/fresh/main-dashboard/budget/recurringBudgetDomEnhancer";
import { cleanRecurringBudgetText } from "@/components/fresh/main-dashboard/budget/recurringBudgetIntegration";
import { saveRecurringBillFromBudget } from "@/components/fresh/main-dashboard/budget/saveRecurringBillFromBudget";
import {
  getRecurringBills,
  getRecurringCashFlowOwnerId,
} from "@/lib/recurringCashFlowRepository";
import DashboardFinanceModalRendererWithIncomeFunding from "./DashboardFinanceModalRendererWithIncomeFunding";

export default function DashboardFinanceModalRendererWithRecurringBills(props) {
  const { user } = useAuth();
  const ownerId = useMemo(() => getRecurringCashFlowOwnerId(user), [user]);
  const recurringDraftRef = useRef(createDefaultRecurringBudgetDraft());
  const [occurrenceContext, setOccurrenceContext] = useState(null);

  useEffect(() => {
    if (props.financeModal?.type !== "save_budget") {
      recurringDraftRef.current = createDefaultRecurringBudgetDraft();
      return;
    }

    const item = props.financeModal?.payload || null;
    const title = cleanRecurringBudgetText(
      item?.title || item?.name || item?.category
    ).toLowerCase();
    const bill = getRecurringBills(ownerId).find((entry) =>
      cleanRecurringBudgetText(
        entry.sourceBudgetTitle || entry.source_budget_title || entry.title
      ).toLowerCase() === title
    );
    recurringDraftRef.current = bill
      ? recurringBillToDraft(bill)
      : createDefaultRecurringBudgetDraft();
  }, [ownerId, props.financeModal?.payload, props.financeModal?.type]);

  useEffect(() => {
    if (
      typeof document === "undefined" ||
      props.financeModal?.type !== "save_budget"
    ) {
      return undefined;
    }

    const enhance = () => {
      document
        .querySelectorAll('input[placeholder="Bills, Food, Transportation..."]')
        .forEach((input) =>
          installRecurringBudgetControls(
            input.closest("div.space-y-4"),
            recurringDraftRef
          )
        );
    };

    const observer = new MutationObserver(enhance);
    observer.observe(document.body, { childList: true, subtree: true });
    enhance();
    return () => observer.disconnect();
  }, [props.financeModal?.type]);

  const saveBudgetInline = useCallback(
    async (options) => {
      const saved = await props.saveBudgetInline?.(options);
      if (!saved) return saved;

      const result = saveRecurringBillFromBudget({
        ownerId,
        draft: recurringDraftRef.current,
        financeForm: props.financeForm,
      });
      if (result?.draft) recurringDraftRef.current = result.draft;
      return saved;
    },
    [ownerId, props.financeForm, props.saveBudgetInline]
  );

  const openRecurringActions = useCallback(
    (item) => {
      const record = item?.budget || item || {};
      const generated =
        record.isRecurringBillOccurrence === true ||
        record.is_recurring_bill_occurrence === true;
      if (!generated) return false;

      const context = findRecurringBudgetOccurrence(ownerId, item);
      if (!context) return false;
      setOccurrenceContext({ ownerId, ...context });
      return true;
    },
    [ownerId]
  );

  const openBudgetModal = useCallback(
    (item) => {
      if (!openRecurringActions(item)) props.openBudgetModal?.(item);
    },
    [openRecurringActions, props.openBudgetModal]
  );

  const openDeleteBudgetCategoryModal = useCallback(
    (item) => {
      if (!openRecurringActions(item)) {
        props.openDeleteBudgetCategoryModal?.(item);
      }
    },
    [openRecurringActions, props.openDeleteBudgetCategoryModal]
  );

  const occurrenceKey = occurrenceContext
    ? `${occurrenceContext.bill.id}:${
        occurrenceContext.occurrence.occurrenceDueDate ||
        occurrenceContext.occurrence.occurrence_due_date
      }`
    : "none";

  return (
    <>
      <DashboardFinanceModalRendererWithIncomeFunding
        {...props}
        saveBudgetInline={saveBudgetInline}
        openBudgetModal={openBudgetModal}
        openDeleteBudgetCategoryModal={openDeleteBudgetCategoryModal}
      />
      <RecurringBillOccurrenceActions
        key={occurrenceKey}
        context={occurrenceContext}
        onClose={() => setOccurrenceContext(null)}
      />
    </>
  );
}
