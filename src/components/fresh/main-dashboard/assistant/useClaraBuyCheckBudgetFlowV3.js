import { useCallback, useMemo, useState } from "react";
import { diagnoseBuyCheck } from "@/lib/clara-buy-check-diagnosis-v5";
import {
  analyzeBuyCheckBudgetCoverage,
  budgetCoverageFromAssessment,
  clean,
  confirmationText,
  createInitialState,
  createMessage,
  parsePrice,
  priceStepMessage,
} from "@/lib/clara-buy-check-budget-intelligence";

function recoveryState(current, userMessage, error) {
  console.warn("[CLARA Buy Check] Answer transition recovered safely.", error);
  return {
    ...current,
    busy: false,
    step: current.step === "price" ? "reason" : current.step,
    messages: [
      ...current.messages,
      userMessage,
      createMessage("clara", current.step === "price"
        ? "I couldn’t finish the budget scan, but we can continue. Why do you want to buy it?"
        : "Something in your saved money data could not be read. Please try that answer again."),
    ],
  };
}

export default function useClaraBuyCheckBudgetFlowV3({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => createInitialState());
  const startSession = useCallback((sessionId = "") => setState(createInitialState(sessionId || `buy-check-${Date.now()}`)), []);
  const clearSession = useCallback(() => setState(createInitialState()), []);

  const submitAnswer = useCallback((raw = "") => {
    const answer = clean(raw);
    if (!answer) return false;
    setState((current) => {
      if (current.busy || current.done || current.step === "confirm" || current.step === "diagnosis") return current;
      const userMessage = createMessage("user", answer);
      try {
        if (current.step === "item") {
          return {
            ...current,
            item: answer,
            step: "price",
            messages: [...current.messages, userMessage, createMessage("clara", `How much does ${answer} cost? Type the amount only. Example: ₱3,500`)],
          };
        }

        if (current.step === "price") {
          const price = parsePrice(answer);
          if (!price) {
            return {
              ...current,
              messages: [...current.messages, userMessage, createMessage("clara", "Please type the price clearly. Example: ₱3,500")],
            };
          }

          const assessment = analyzeBuyCheckBudgetCoverage(current.item, price, assistantContext, current.reason);
          const coverage = budgetCoverageFromAssessment(assessment);

          if (coverage) {
            const next = {
              ...current,
              price,
              reason: "",
              planningStatus: "planned",
              budgetCoverage: coverage,
              budgetAssessment: assessment,
              step: "confirm",
            };
            next.confirmation = {
              item: next.item,
              price: next.price,
              reason: "",
              planningStatus: next.planningStatus,
            };
            next.messages = [
              ...current.messages,
              userMessage,
              createMessage("clara", confirmationText(next)),
            ];
            return next;
          }

          return {
            ...current,
            price,
            planningStatus: "unplanned",
            budgetCoverage: null,
            budgetAssessment: assessment,
            step: "reason",
            messages: [...current.messages, userMessage, createMessage("clara", priceStepMessage())],
          };
        }

        if (current.step === "reason") {
          const next = { ...current, reason: answer, step: "confirm" };
          next.confirmation = {
            item: next.item,
            price: next.price,
            reason: next.reason,
            planningStatus: next.planningStatus,
          };
          next.messages = [...current.messages, userMessage, createMessage("clara", confirmationText(next))];
          return next;
        }

        return current;
      } catch (error) {
        return recoveryState(current, userMessage, error);
      }
    });
    return true;
  }, [assistantContext]);

  const editAnswers = useCallback(() => {
    setState((current) => {
      if (!["confirm", "complete"].includes(current.step) || current.busy) return current;
      return {
        ...createInitialState(current.sessionId),
        messages: [
          ...current.messages,
          createMessage("user", current.step === "complete" ? "Adjust amount" : "Edit answers"),
          createMessage("clara", "No problem. What do you want to buy?"),
        ],
      };
    });
  }, []);

  const confirm = useCallback(async () => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return;
    const snapshot = state;
    const checking = createMessage("clara", "Got it. I’m checking your wallet, every active budget, goals, emergency fund, schedule, Me profile, and memory now.");
    setState({ ...snapshot, step: "diagnosis", busy: true, messages: [...snapshot.messages, createMessage("user", "Continue"), checking] });

    try {
      const result = await diagnoseBuyCheck(snapshot, assistantContext);
      setState((current) => current.sessionId !== snapshot.sessionId ? current : {
        ...current,
        step: "complete",
        busy: false,
        done: true,
        diagnosis: result,
        budgetAssessment: result.contextPackage?.finance?.budgetAssessment || current.budgetAssessment,
        messages: current.messages.map((entry) => entry.id === checking.id ? { ...entry, text: "Your Buy Check report is ready." } : entry),
      });
    } catch (error) {
      console.warn("[CLARA Buy Check] Diagnosis failed safely.", error);
      setState((current) => current.sessionId !== snapshot.sessionId ? current : {
        ...current,
        step: "complete",
        busy: false,
        done: true,
        diagnosis: {
          decision: "PAUSE",
          risk: "High",
          reasonCode: "SCAN_FAILED",
          explanation: "CLARA could not complete the full financial context check right now.",
          saferMove: "Check your wallet and budget manually before buying.",
          cards: [{
            eyebrow: "FINAL DECISION",
            title: "PAUSE",
            stat: "Risk: High",
            body: "CLARA could not complete the full context check right now.",
            note: "Safer move: Do not rush the purchase.",
            final: true,
            decision: "PAUSE",
          }],
        },
        messages: current.messages.map((entry) => entry.id === checking.id
          ? { ...entry, text: "I couldn’t complete the full context check, so the safest decision is to pause." }
          : entry),
      });
    }
  }, [assistantContext, state]);

  const checkAnother = useCallback(() => setState(createInitialState(`buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`)), []);

  return useMemo(() => ({
    state,
    messages: state.messages,
    startSession,
    clearSession,
    submitAnswer,
    confirm,
    editAnswers,
    checkAnother,
  }), [checkAnother, clearSession, confirm, editAnswers, startSession, state, submitAnswer]);
}
