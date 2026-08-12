import { useCallback, useMemo, useState } from "react";
import { diagnoseBuyCheck } from "@/lib/clara-buy-check-diagnosis-v5";
import {
  analyzeBuyCheckBudgetCoverage,
  budgetCoverageFromAssessment,
  clean,
  createInitialState,
  createMessage,
} from "@/lib/clara-buy-check-budget-intelligence";
import {
  mergeEvidence,
  runClaraBuyCheckExpertTurn,
} from "@/lib/clara-buy-check-expert-ai";

function createExpertInitialState(sessionId = "") {
  return {
    ...createInitialState(sessionId),
    step: "conversation",
    evidence: {},
    readinessConfidence: 0,
    conversationTurns: 0,
  };
}

function reasonFromEvidence(evidence = {}) {
  const summary = clean(evidence.readinessSummary);
  if (summary) return summary;

  const purpose = clean(evidence.purpose);
  const situation = clean(evidence.currentSituation);
  if (purpose && situation && !purpose.toLowerCase().includes(situation.toLowerCase())) {
    return `${purpose}. ${situation}`;
  }
  return purpose || situation;
}

function confirmationFromEvidence(evidence = {}) {
  return {
    item: clean(evidence.item),
    price: Number(evidence.price || 0),
    reason: reasonFromEvidence(evidence),
    clarification: "",
    followUpAnswer: "",
    purchaseContext: clean(evidence.currentSituation || evidence.purpose),
  };
}

function diagnosisFailureState(current, checkingId) {
  const fallbackCard = {
    eyebrow: "FINAL DECISION",
    title: "NOT ENOUGH INFORMATION YET",
    stat: "Risk: High",
    body: "CLARA could not complete the full financial context check right now.",
    note: "Safer move: Do not rush the purchase.",
    final: true,
    decision: "PAUSE",
  };

  return {
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
    messages: current.messages.map((entry) => entry.id === checkingId
      ? { ...entry, text: "I couldn’t complete the financial scan, so I’m not going to pretend I have a verdict. The safer move is to pause for now." }
      : entry),
  };
}

export default function useClaraBuyCheckExpertFlow({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => createExpertInitialState());

  const startSession = useCallback((sessionId = "") => {
    setState(createExpertInitialState(sessionId || `buy-check-${Date.now()}`));
    return true;
  }, []);

  const clearSession = useCallback(() => {
    setState(createExpertInitialState());
  }, []);

  const submitAnswer = useCallback(async (raw = "") => {
    const answer = clean(raw);
    if (!answer) return false;

    const snapshot = state;
    if (snapshot.busy || snapshot.done || ["diagnosis", "complete", "confirm"].includes(snapshot.step)) return false;

    const userMessage = createMessage("user", answer);
    setState((current) => {
      if (current.sessionId !== snapshot.sessionId || current.busy || current.done) return current;
      return {
        ...current,
        busy: true,
        messages: [...current.messages, userMessage],
      };
    });

    try {
      const turn = await runClaraBuyCheckExpertTurn({
        message: answer,
        history: snapshot.messages,
        evidence: snapshot.evidence,
        assistantContext,
      });

      setState((current) => {
        if (current.sessionId !== snapshot.sessionId) return current;

        const evidence = mergeEvidence(current.evidence, turn.evidence);
        const item = clean(evidence.item);
        const price = Number(evidence.price || 0);
        const reason = reasonFromEvidence(evidence);
        const isReady = turn.action === "ready" && item && price > 0 && reason;
        let budgetAssessment = current.budgetAssessment;
        let budgetCoverage = current.budgetCoverage;
        let planningStatus = current.planningStatus;

        if (isReady) {
          try {
            budgetAssessment = analyzeBuyCheckBudgetCoverage(item, price, assistantContext, reason);
            budgetCoverage = budgetCoverageFromAssessment(budgetAssessment);
            planningStatus = budgetCoverage ? "planned" : "unplanned";
          } catch (error) {
            console.warn("[CLARA Buy Check] Pre-verdict budget ownership scan failed safely.", error);
          }
        }

        return {
          ...current,
          evidence,
          item: item || current.item,
          price: price || current.price,
          reason: reason || current.reason,
          purchaseContext: clean(evidence.currentSituation || evidence.purpose) || current.purchaseContext,
          readinessConfidence: Number(turn.readinessConfidence || 0),
          conversationTurns: Number(current.conversationTurns || 0) + 1,
          planningStatus,
          budgetCoverage,
          budgetAssessment,
          confirmation: isReady ? confirmationFromEvidence(evidence) : null,
          step: isReady ? "confirm" : "conversation",
          busy: false,
          messages: [...current.messages, createMessage("clara", turn.reply)],
        };
      });
      return true;
    } catch (error) {
      console.warn("[CLARA Buy Check] Expert conversation turn failed safely.", error);
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            busy: false,
            step: "conversation",
            messages: [
              ...current.messages,
              createMessage("clara", "I missed that. Tell me a little more about what you’re considering, and I’ll keep working through it with you."),
            ],
          });
      return false;
    }
  }, [assistantContext, state]);

  const confirm = useCallback(async () => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return false;

    const snapshot = state;
    const checking = createMessage(
      "clara",
      "That gives me enough context. I’m checking the actual money side now — your spendable cash, budgets, obligations, safety buffers, and the rest of your saved financial context.",
    );

    setState({
      ...snapshot,
      step: "diagnosis",
      busy: true,
      messages: [...snapshot.messages, createMessage("user", "Yes"), checking],
    });

    try {
      const result = await diagnoseBuyCheck(snapshot, assistantContext);
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            step: "complete",
            busy: false,
            done: true,
            diagnosis: result,
            budgetAssessment: result.contextPackage?.finance?.budgetAssessment || current.budgetAssessment,
            messages: current.messages.map((entry) => entry.id === checking.id
              ? { ...entry, text: "I’ve finished the money check. Here’s what the numbers say." }
              : entry),
          });
      return true;
    } catch (error) {
      console.warn("[CLARA Buy Check] Diagnosis failed safely.", error);
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : diagnosisFailureState(current, checking.id));
      return false;
    }
  }, [assistantContext, state]);

  const editReason = useCallback(() => {
    let changed = false;
    setState((current) => {
      if (current.step !== "confirm" || current.busy) return current;
      changed = true;
      return {
        ...current,
        step: "conversation",
        confirmation: null,
        busy: false,
        done: false,
        messages: [
          ...current.messages,
          createMessage("user", "No"),
          createMessage("clara", "Got it — I don’t have it quite right yet. What should I correct or understand better?"),
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
      const evidence = { ...(current.evidence || {}) };
      delete evidence.price;
      return {
        ...current,
        evidence,
        price: 0,
        confirmation: null,
        diagnosis: null,
        done: false,
        busy: false,
        step: "conversation",
        messages: [
          ...current.messages,
          createMessage("user", "Adjust amount"),
          createMessage("clara", "Sure. What price are you actually expecting to pay?"),
        ],
      };
    });
    return changed;
  }, []);

  const editAnswers = useCallback(() => {
    setState((current) => ({
      ...createExpertInitialState(current.sessionId),
      messages: [
        ...current.messages,
        createMessage("user", current.step === "complete" ? "Start over" : "Edit answers"),
        createMessage("clara", "Okay. Tell me what changed, and I’ll reassess the purchase from there."),
      ],
    }));
    return true;
  }, []);

  const checkAnother = useCallback(() => {
    setState(createExpertInitialState(`buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`));
    return true;
  }, []);

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
  }), [
    checkAnother,
    clearSession,
    confirm,
    editAmount,
    editAnswers,
    editReason,
    startSession,
    state,
    submitAnswer,
  ]);
}
