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

export default function useClaraBuyCheckBudgetFlowDeterministic({ assistantContext = {} } = {}) {
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

  const editReason = useCallback(() => {
    let changed = false;
    setState((current) => {
      if (current.step !== "confirm" || current.busy) return current;
      changed = true;
      return {
        ...current,
        reason: "",
        confirmation: null,
        step: "reason",
        done: false,
        messages: [
          ...current.messages,
          createMessage("user", "No"),
          createMessage("clara", "No problem. Please tell me the correct reason you want to buy it."),
        ],
      };
    });
    return changed;
  }, []);

  const editAmount = useCallback(() => {
    let changed = false;
    setState((current) => {
      if (!["confirm", "complete"].includes(current.step) || current.busy) return current;
      changed = true;
      return {
        ...current,
        price: 0,
        reason: "",
        planningStatus: null,
        budgetCoverage: null,
        budgetAssessment: null,
        confirmation: null,
        diagnosis: null,
        step: "price",
        done: false,
        messages: [
          ...current.messages,
          createMessage("user", "Adjust amount"),
          createMessage("clara", `Enter the new price for ${current.item}.`),
        ],
      };
    });
    return changed;
  }, []);

  const editAnswers = useCallback(() => {
    setState((current) => {
      if (!["confirm", "complete"].includes(current.step) || current.busy) return current;
      return {
        ...createInitialState(current.sessionId),
        messages: [
          ...current.messages,
          createMessage("user", current.step === "complete" ? "Start over" : "Edit answers"),
          createMessage("clara", "No problem. What do you want to buy?"),
        ],
      };
    });
  }, []);

  const confirm = useCallback(async () => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return;
    const snapshot = state;
    const checking = createMessage("clara", "Got it. I’m checking your income runway, wallets, budgets, obligations, goals, emergency fund, schedule, Me profile, and memory now.");
    setState({ ...snapshot, step: "diagnosis", busy: true, messages: [...snapshot.messages, createMessage("user", "Yes"), checking] });

    try {
      const result = await diagnoseBuyCheck(snapshot, assistantContext);
      setState((current) => current.sessionId !== snapshot.sessionId ? current : {
        ...current,
        step: "complete",
        busy: false,
        done: true,
        diagnosis: result,
        budgetAssessment: result.contextPackage?.finance?.budgetAssessment || current.budgetAssessment,
        messages: current.messages.map((entry) => entry.id === checking.id ? { ...entry, text: "Your Buy Check result is ready." } : entry),
      });
    } catch (error) {
      console.warn("[CLARA Buy Check] Diagnosis failed safely.", error);
      const fallbackCard = {
        eyebrow: "FINAL DECISION",
        title: "NOT ENOUGH INFORMATION YET",
        stat: "Risk: High",
        body: "CLARA could not complete the full context check right now.",
        note: "Safer move: Do not rush the purchase.",
        final: true,
        decision: "PAUSE",
      };
      setState((current) => current.sessionId !== snapshot.sessionId ? current : {
        ...current,
        step: "complete",
        busy: false,
        done: true,
        diagnosis: {
          decision: "PAUSE",
          userFacingDecision: "NOT ENOUGH INFORMATION YET",
          risk: "High",
          reasonCode: "SCAN_FAILED",
          explanation: "CLARA could not complete the full financial context check right now.",
          saferMove: "Check your wallet and budget manually before buying.",
          summaryCard: {
            eyebrow: "BUY CHECK",
            verdict: "NOT ENOUGH INFORMATION YET",
            explanation: "CLARA could not complete the full financial context check right now.",
            impactValue: "Scan incomplete",
            impactLabel: "No financial approval was issued",
            informationLabel: "Why this result?",
          },
          detailCards: [fallbackCard],
          cards: [fallbackCard],
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
    editReason,
    editAmount,
    editAnswers,
    checkAnother,
  }), [checkAnother, clearSession, confirm, editAmount, editAnswers, editReason, startSession, state, submitAnswer]);
}
