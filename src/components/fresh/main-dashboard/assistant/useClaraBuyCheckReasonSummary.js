import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useClaraBuyCheckFlowV5 from "./useClaraBuyCheckFlowV5.js";
import {
  interpretBuyCheckConfirmation,
  interpretBuyCheckItem,
  interpretBuyCheckReason,
  normalizeItemSummary,
  normalizeReasonSummary,
} from "./buyCheckReasonInterpreter.js";
import {
  analyzeBuyCheckBudgetCoverage,
  budgetCoverageFromAssessment,
  needsPurchaseClarification,
  parsePrice,
} from "@/lib/clara-buy-check-budget-intelligence";

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const blankItem = () => ({ busy: false, original: "", item: "", sessionId: "", index: -1, source: "" });
const blankReason = () => ({ busy: false, original: "", summary: "", sessionId: "", index: -1, source: "" });
const blankConfirmation = () => ({ busy: false, text: "", sessionId: "", index: -1, source: "" });

function replaceOrAppendThinking(list, index, id, text) {
  if (index >= 0 && list.length > index + 1) {
    return list.map((message, messageIndex) => messageIndex === index + 1
      ? { ...message, id, role: "clara", text }
      : message);
  }
  return [...list, { id, role: "clara", text }];
}

export default function useClaraBuyCheckReasonSummary({ assistantContext = {} } = {}) {
  const flow = useClaraBuyCheckFlowV5({ assistantContext });
  const [itemState, setItemState] = useState(blankItem);
  const [reasonState, setReasonState] = useState(blankReason);
  const [confirmationState, setConfirmationState] = useState(blankConfirmation);
  const sessionRef = useRef("");
  const previousStepRef = useRef(flow.state?.step || "");
  sessionRef.current = flow.state?.sessionId || "";

  useEffect(() => {
    setItemState(blankItem());
    setReasonState(blankReason());
    setConfirmationState(blankConfirmation());
    previousStepRef.current = flow.state?.step || "";
  }, [flow.state?.sessionId]);

  useEffect(() => {
    const currentStep = flow.state?.step || "";
    if (currentStep === "item" && previousStepRef.current && previousStepRef.current !== "item") {
      setItemState(blankItem());
      setReasonState(blankReason());
      setConfirmationState(blankConfirmation());
    }
    previousStepRef.current = currentStep;
  }, [flow.state?.step]);

  const submitAnswer = useCallback(async (raw = "") => {
    const answer = clean(raw);
    if (!answer) return false;
    if (itemState.busy || reasonState.busy || confirmationState.busy || flow.state?.busy) return false;

    const sessionId = flow.state?.sessionId || "";
    const step = flow.state?.step;
    const index = flow.messages?.length || 0;

    if (step === "item") {
      setItemState({ busy: true, original: answer, item: "", sessionId, index, source: "" });
      const result = await interpretBuyCheckItem({ originalItem: answer });
      if (sessionRef.current !== sessionId) return false;

      const item = normalizeItemSummary(result.item, answer);
      const submitted = flow.submitAnswer(item);
      if (!submitted) {
        setItemState(blankItem());
        return false;
      }

      setItemState({ busy: false, original: answer, item, sessionId, index, source: result.source });
      return true;
    }

    if (step === "price") {
      const price = parsePrice(answer);
      if (!price) return flow.submitAnswer(answer);

      const item = clean(flow.state?.item || "this purchase");
      const assessment = analyzeBuyCheckBudgetCoverage(item, price, assistantContext, "");
      const coverage = budgetCoverageFromAssessment(assessment);
      const submitted = flow.submitAnswer(answer);
      if (!submitted || !coverage) return submitted;

      setConfirmationState({ busy: true, text: "", sessionId, index, source: "" });
      const result = await interpretBuyCheckConfirmation({ item, price, reason: "" });
      if (sessionRef.current !== sessionId) return false;

      setConfirmationState({
        busy: false,
        text: result.confirmation,
        sessionId,
        index,
        source: result.source,
      });
      return true;
    }

    if (step === "reason") {
      const item = clean(flow.state?.item || "this purchase");
      const price = Number(flow.state?.price || 0);
      setReasonState({ busy: true, original: answer, summary: "", sessionId, index, source: "" });
      setConfirmationState(blankConfirmation());

      const reasonResult = await interpretBuyCheckReason({
        item,
        price,
        originalReason: answer,
        assistantContext,
      });
      if (sessionRef.current !== sessionId) return false;

      const summary = normalizeReasonSummary(reasonResult.summary, answer);
      const shouldClarify = needsPurchaseClarification(answer, item) || needsPurchaseClarification(summary, item);
      const submitted = flow.submitAnswer(summary);
      if (!submitted) {
        setReasonState(blankReason());
        setConfirmationState(blankConfirmation());
        return false;
      }

      setReasonState({
        busy: false,
        original: answer,
        summary,
        sessionId,
        index,
        source: reasonResult.source,
      });

      if (shouldClarify) {
        setConfirmationState(blankConfirmation());
        return true;
      }

      setConfirmationState({ busy: true, text: "", sessionId, index, source: "" });
      const confirmationResult = await interpretBuyCheckConfirmation({ item, price, reason: summary });
      if (sessionRef.current !== sessionId) return false;

      setConfirmationState({
        busy: false,
        text: confirmationResult.confirmation,
        sessionId,
        index,
        source: confirmationResult.source,
      });
      return true;
    }

    if (step === "clarification") {
      setConfirmationState(blankConfirmation());
      return flow.submitAnswer(answer);
    }

    return flow.submitAnswer(answer);
  }, [
    assistantContext,
    confirmationState.busy,
    flow,
    itemState.busy,
    reasonState.busy,
  ]);

  const editReason = useCallback(() => {
    if (itemState.busy || reasonState.busy || confirmationState.busy || flow.state?.busy) return false;
    setReasonState(blankReason());
    setConfirmationState(blankConfirmation());
    return flow.editReason?.() ?? false;
  }, [confirmationState.busy, flow.editReason, flow.state?.busy, itemState.busy, reasonState.busy]);

  const messages = useMemo(() => {
    let list = [...(flow.messages || [])];
    const activeSessionId = flow.state?.sessionId;

    if (itemState.sessionId === activeSessionId) {
      if (itemState.busy) {
        list = replaceOrAppendThinking(
          list,
          itemState.index,
          `item-${itemState.sessionId}`,
          "Let me identify the exact item you want to buy...",
        );
      } else if (itemState.item && list.length > itemState.index) {
        list = list.map((message, index) => index === itemState.index
          ? { ...message, role: "user", text: itemState.original }
          : message);
      }
    }

    if (reasonState.sessionId === activeSessionId && reasonState.busy) {
      list = replaceOrAppendThinking(
        list,
        reasonState.index,
        `reason-${reasonState.sessionId}`,
        "Let me make sure I understood your reason correctly...",
      );
    }

    if (confirmationState.sessionId === activeSessionId) {
      if (confirmationState.busy && !reasonState.busy) {
        list = replaceOrAppendThinking(
          list,
          confirmationState.index,
          `confirmation-${confirmationState.sessionId}`,
          "Let me summarize what you’re considering...",
        );
      } else if (confirmationState.text && list.length > confirmationState.index + 1) {
        list = list.map((message, index) => {
          if (reasonState.original && index === confirmationState.index) {
            return { ...message, role: "user", text: reasonState.original };
          }
          if (index === confirmationState.index + 1) {
            return { ...message, role: "clara", text: confirmationState.text };
          }
          return message;
        });
      }
    }

    return list;
  }, [
    confirmationState,
    flow.messages,
    flow.state?.sessionId,
    itemState,
    reasonState,
  ]);

  const aiBusy = Boolean(itemState.busy || reasonState.busy || confirmationState.busy);

  return {
    ...flow,
    submitAnswer,
    editReason,
    messages,
    state: {
      ...flow.state,
      busy: Boolean(flow.state?.busy || aiBusy),
      originalItem: itemState.original || flow.state?.item || "",
      interpretedItem: itemState.item || flow.state?.item || "",
      itemInterpretationSource: itemState.source,
      originalReason: reasonState.original || flow.state?.reason || "",
      summarizedReason: reasonState.summary || flow.state?.reason || "",
      reasonSummarySource: reasonState.source,
      confirmationSummarySource: confirmationState.source,
    },
  };
}
