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
import "@/clara-buy-check-thinking.css";

const MIN_THINKING_MS = 650;

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function holdThinkingUntil(startedAt) {
  const remaining = MIN_THINKING_MS - (Date.now() - startedAt);
  if (remaining > 0) await wait(remaining);
}

function replaceThinkingMessage(messages = [], thinkingId = "", text = "") {
  return messages.map((entry) =>
    entry.id === thinkingId ? { ...entry, text: clean(text) } : entry,
  );
}

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
    const thinkingMessage = createMessage("clara", "");
    const thinkingStartedAt = Date.now();

    setState((current) => {
      if (current.sessionId !== snapshot.sessionId || current.busy || current.done) return current;
      return {
        ...current,
        busy: true,
        messages: [...current.messages, userMessage, thinkingMessage],
      };
    });

    try {
      const turn = await runClaraBuyCheckExpertTurn({
        message: answer,
        history: snapshot.messages,
        evidence: snapshot.evidence,
        assistantContext,
      });

      await holdThinkingUntil(thinkingStartedAt);

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
          messages: replaceThinkingMessage(current.messages, thinkingMessage.id, turn.reply),
        };
      });
      return true;
    } catch (error) {
      console.warn("[CLARA Buy Check] Expert conversation turn failed safely.", error);
      await holdThinkingUntil(thinkingStartedAt);
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            busy: false,
            step: "conversation",
            messages: replaceThinkingMessage(
              current.messages,
              thinkingMessage.id,
              "I missed that. Tell me a little more about what you’re considering, and I’ll keep working through it with you.",
            ),
          });
      return false;
    }
  }, [assistantContext, state]);

  const confirm = useCallback(async () => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return false;

    const snapshot = state;
    const thinkingMessage = createMessage("clara", "");
    const thinkingStartedAt = Date.now();

    setState({
      ...snapshot,
      step: "diagnosis",
      busy: true,
      messages: [...snapshot.messages, createMessage("user", "Yes"), thinkingMessage],
    });

    try {
      const result = await diagnoseBuyCheck(snapshot, assistantContext);
      await holdThinkingUntil(thinkingStartedAt);
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            step: "complete",
            busy: false,
            done: true,
            diagnosis: result,
            budgetAssessment: result.contextPackage?.finance?.budgetAssessment || current.budgetAssessment,
            messages: replaceThinkingMessage(
              current.messages,
              thinkingMessage.id,
              "I’ve finished the money check. Here’s what the numbers say.",
            ),
          });
      return true;
    } catch (error) {
      console.warn("[CLARA Buy Check] Diagnosis failed safely.", error);
      await holdThinkingUntil(thinkingStartedAt);
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : diagnosisFailureState(current, thinkingMessage.id));
      return false;
    }
  }, [assistantContext, state]);

  const editReason = useCallback(() => {
    if (state.step !== "confirm" || state.busy) return false;

    const sessionId = state.sessionId;
    const thinkingMessage = createMessage("clara", "");
    setState({
      ...state,
      step: "conversation",
      confirmation: null,
      busy: true,
      done: false,
      messages: [
        ...state.messages,
        createMessage("user", "No"),
        thinkingMessage,
      ],
    });

    window.setTimeout(() => {
      setState((current) => current.sessionId !== sessionId
        ? current
        : {
            ...current,
            busy: false,
            messages: replaceThinkingMessage(
              current.messages,
              thinkingMessage.id,
              "Got it — I don’t have it quite right yet. What should I correct or understand better?",
            ),
          });
    }, MIN_THINKING_MS);

    return true;
  }, [state]);

  const editAmount = useCallback(() => {
    if (!["confirm", "complete"].includes(state.step) || state.busy) return false;

    const sessionId = state.sessionId;
    const evidence = { ...(state.evidence || {}) };
    delete evidence.price;
    const thinkingMessage = createMessage("clara", "");

    setState({
      ...state,
      evidence,
      price: 0,
      confirmation: null,
      diagnosis: null,
      done: false,
      busy: true,
      step: "conversation",
      messages: [
        ...state.messages,
        createMessage("user", "Adjust amount"),
        thinkingMessage,
      ],
    });

    window.setTimeout(() => {
      setState((current) => current.sessionId !== sessionId
        ? current
        : {
            ...current,
            busy: false,
            messages: replaceThinkingMessage(
              current.messages,
              thinkingMessage.id,
              "Sure. What price are you actually expecting to pay?",
            ),
          });
    }, MIN_THINKING_MS);

    return true;
  }, [state]);

  const editAnswers = useCallback(() => {
    const sessionId = state.sessionId;
    const thinkingMessage = createMessage("clara", "");
    const userLabel = state.step === "complete" ? "Start over" : "Edit answers";

    setState({
      ...createExpertInitialState(sessionId),
      busy: true,
      messages: [
        ...state.messages,
        createMessage("user", userLabel),
        thinkingMessage,
      ],
    });

    window.setTimeout(() => {
      setState((current) => current.sessionId !== sessionId
        ? current
        : {
            ...current,
            busy: false,
            messages: replaceThinkingMessage(
              current.messages,
              thinkingMessage.id,
              "Okay. Tell me what changed, and I’ll reassess the purchase from there.",
            ),
          });
    }, MIN_THINKING_MS);

    return true;
  }, [state]);

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
