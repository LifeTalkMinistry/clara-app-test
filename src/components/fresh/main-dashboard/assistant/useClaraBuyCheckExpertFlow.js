import { useCallback, useMemo, useRef, useState } from "react";
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
  transactionReasonFromEvidence,
} from "@/lib/clara-buy-check-expert-ai";
import "@/clara-buy-check-thinking.css";

const MIN_THINKING_MS = 1500;

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
  return transactionReasonFromEvidence(evidence);
}

function confirmationFromEvidence(evidence = {}) {
  return {
    item: clean(evidence.item),
    price: Number(evidence.price || 0),
    reason: reasonFromEvidence(evidence),
    clarification: "",
    followUpAnswer: "",
    purchaseContext: clean(evidence.readinessSummary || evidence.currentSituation || evidence.purpose),
  };
}

function historyForTurn(snapshot = {}) {
  return Array.isArray(snapshot.messages) ? [...snapshot.messages] : [];
}

function prepareBudgetState(item, price, reason, assistantContext, current = {}) {
  let budgetAssessment = current.budgetAssessment;
  let budgetCoverage = current.budgetCoverage;
  let planningStatus = current.planningStatus;

  try {
    budgetAssessment = analyzeBuyCheckBudgetCoverage(item, price, assistantContext, reason);
    budgetCoverage = budgetCoverageFromAssessment(budgetAssessment);
    planningStatus = budgetCoverage ? "planned" : "unplanned";
  } catch (error) {
    console.warn("[CLARA Buy Check] Conversation budget ownership scan failed safely.", error);
  }

  return { budgetAssessment, budgetCoverage, planningStatus };
}

export default function useClaraBuyCheckExpertFlow({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => createExpertInitialState());
  const activeGeminiRequestRef = useRef(null);

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
    if (snapshot.busy || snapshot.step === "complete") return false;
    if (activeGeminiRequestRef.current) return false;

    const requestToken = `${snapshot.sessionId || "no-session"}:conversation:${Date.now()}`;
    activeGeminiRequestRef.current = requestToken;
    const userMessage = createMessage("user", answer);
    const thinkingMessage = createMessage("clara", "");
    const thinkingStartedAt = Date.now();

    setState((current) => {
      if (current.sessionId !== snapshot.sessionId || current.busy) return current;
      return {
        ...current,
        busy: true,
        messages: [...current.messages, userMessage, thinkingMessage],
      };
    });

    try {
      const turn = await runClaraBuyCheckExpertTurn({
        message: answer,
        history: historyForTurn(snapshot),
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
        const isReadyForChoice = turn.action === "ready" && item && price > 0 && reason;
        const budgetState = isReadyForChoice
          ? prepareBudgetState(item, price, reason, assistantContext, current)
          : {
              budgetAssessment: current.budgetAssessment,
              budgetCoverage: current.budgetCoverage,
              planningStatus: current.planningStatus,
            };

        return {
          ...current,
          evidence,
          item: item || current.item,
          price: price || current.price,
          reason: reason || current.reason,
          purchaseContext: clean(evidence.readinessSummary || evidence.currentSituation || evidence.purpose) || current.purchaseContext,
          readinessConfidence: Number(turn.readinessConfidence || 0),
          conversationTurns: Number(current.conversationTurns || 0) + 1,
          ...budgetState,
          confirmation: isReadyForChoice ? confirmationFromEvidence(evidence) : null,
          step: isReadyForChoice ? "confirm" : "conversation",
          done: false,
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
            confirmation: null,
            messages: replaceThinkingMessage(
              current.messages,
              thinkingMessage.id,
              "I missed that. Tell me a little more about what you're considering, and I'll keep working through it with you.",
            ),
          });
      return false;
    } finally {
      if (activeGeminiRequestRef.current === requestToken) activeGeminiRequestRef.current = null;
    }
  }, [assistantContext, state]);

  const confirm = useCallback(async (choice = "buy") => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return false;
    if (!["buy", "not_buy"].includes(choice)) return false;

    const userText = choice === "buy" ? "Yes" : "No";
    const claraText = choice === "buy"
      ? "Got it. I’ll use the reason we worked out from this conversation. Choose where you’ll pay from, and you can edit the reason before saving the transaction."
      : "Got it. I’ll keep the reason we worked out with this decision so CLARA can remember why you chose not to buy.";

    setState((current) => current.sessionId !== state.sessionId
      ? current
      : {
          ...current,
          step: "complete",
          busy: false,
          done: true,
          confirmation: null,
          messages: [
            ...current.messages,
            createMessage("user", userText),
            createMessage("clara", claraText),
          ],
        });
    return true;
  }, [state]);

  const askMore = useCallback(() => {
    if (state.step !== "confirm" || state.busy) return false;
    return submitAnswer("I want to ask more before deciding.");
  }, [state.busy, state.step, submitAnswer]);

  const returnToChoice = useCallback(() => {
    if (state.step !== "complete" || state.busy) return false;
    setState((current) => current.sessionId !== state.sessionId
      ? current
      : {
          ...current,
          step: "confirm",
          done: false,
          confirmation: confirmationFromEvidence(current.evidence),
        });
    return true;
  }, [state]);

  const editReason = useCallback(() => askMore(), [askMore]);

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

    setState({
      ...createExpertInitialState(sessionId),
      busy: true,
      messages: [
        ...state.messages,
        createMessage("user", "Start over"),
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
              "Okay. Tell me what changed, and I’ll work through the purchase with you from there.",
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
    askMore,
    returnToChoice,
    editReason,
    editAmount,
    editAnswers,
    checkAnother,
  }), [
    askMore,
    checkAnother,
    clearSession,
    confirm,
    editAmount,
    editAnswers,
    editReason,
    returnToChoice,
    startSession,
    state,
    submitAnswer,
  ]);
}
