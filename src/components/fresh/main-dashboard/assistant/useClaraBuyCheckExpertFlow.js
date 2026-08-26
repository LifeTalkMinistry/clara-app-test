import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clean,
  createInitialState,
  createMessage,
} from "@/lib/clara-buy-check-budget-intelligence";
import {
  mergeEvidence,
  runClaraBuyCheckExpertTurn,
  transactionReasonFromEvidence,
} from "@/lib/clara-buy-check-expert-ai";
import {
  claraPaymentAmountDueNow,
  hasConfirmedClaraPaymentStructure,
  isClaraPurchaseContextMature,
} from "@/lib/clara-buy-check-intelligence-router";
import "@/clara-buy-check-thinking.css";

const MIN_THINKING_MS = 450;

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

function createExpertInitialState(sessionId = "", { connected = false } = {}) {
  return {
    ...createInitialState(sessionId),
    step: "conversation",
    evidence: {},
    connected,
    conversationPhase: connected ? "discover" : "establish",
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
    price: hasConfirmedClaraPaymentStructure(evidence)
      ? claraPaymentAmountDueNow(evidence)
      : 0,
    reason: reasonFromEvidence(evidence),
    clarification: "",
    followUpAnswer: "",
    purchaseContext: clean(
      evidence.readinessSummary ||
      evidence.currentSituation ||
      evidence.purpose,
    ),
  };
}

function historyForTurn(snapshot = {}) {
  return Array.isArray(snapshot.messages) ? [...snapshot.messages] : [];
}

function clearPaymentEvidence(evidence = {}) {
  const next = { ...(evidence || {}) };
  [
    "purchaseType",
    "price",
    "priceCandidate",
    "priceStatus",
    "priceSource",
    "paymentStructureStatus",
    "paymentStructureSource",
    "amountDueNow",
    "paymentAmount",
    "remainingPayments",
    "totalPayments",
    "totalCommitment",
    "frequency",
    "fees",
  ].forEach((key) => delete next[key]);
  return next;
}

export default function useClaraBuyCheckExpertFlow({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => createExpertInitialState());
  const activeGeminiRequestRef = useRef(null);
  const activeGeminiAbortRef = useRef(null);

  const cancelActiveGeminiRequest = useCallback(() => {
    activeGeminiAbortRef.current?.abort();
    activeGeminiAbortRef.current = null;
    activeGeminiRequestRef.current = null;
  }, []);

  useEffect(() => () => {
    cancelActiveGeminiRequest();
  }, [cancelActiveGeminiRequest]);

  const startSession = useCallback((sessionId = "") => {
    cancelActiveGeminiRequest();
    setState(createExpertInitialState(sessionId || `buy-check-${Date.now()}`));
    return true;
  }, [cancelActiveGeminiRequest]);

  const clearSession = useCallback(() => {
    cancelActiveGeminiRequest();
    setState(createExpertInitialState());
  }, [cancelActiveGeminiRequest]);

  const submitAnswer = useCallback(async (raw = "") => {
    const answer = clean(raw);
    if (!answer) return false;

    const snapshot = state;
    if (snapshot.busy || snapshot.step === "complete") return false;
    if (activeGeminiRequestRef.current) return false;

    const requestToken = `${snapshot.sessionId || "no-session"}:conversation:${Date.now()}`;
    const requestController = new AbortController();
    activeGeminiRequestRef.current = requestToken;
    activeGeminiAbortRef.current = requestController;
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
        connected: Boolean(snapshot.connected),
        signal: requestController.signal,
      });

      await holdThinkingUntil(thinkingStartedAt);

      setState((current) => {
        if (current.sessionId !== snapshot.sessionId) return current;

        const evidence = mergeEvidence(current.evidence, turn.evidence);
        const item = clean(evidence.item);
        const price = hasConfirmedClaraPaymentStructure(evidence)
          ? claraPaymentAmountDueNow(evidence)
          : 0;
        const reason = reasonFromEvidence(evidence);
        const isReadyForChoice = Boolean(
          turn.action === "ready" &&
          isClaraPurchaseContextMature(evidence) &&
          item &&
          price > 0 &&
          reason,
        );

        return {
          ...current,
          evidence,
          connected: true,
          conversationPhase: clean(turn.phase) || current.conversationPhase,
          item: item || current.item,
          price: price || current.price,
          reason: reason || current.reason,
          purchaseContext: clean(
            evidence.readinessSummary ||
            evidence.currentSituation ||
            evidence.purpose,
          ) || current.purchaseContext,
          readinessConfidence: Number(turn.readinessConfidence || 0),
          conversationTurns: Number(current.conversationTurns || 0) + 1,
          confirmation: isReadyForChoice ? confirmationFromEvidence(evidence) : null,
          step: isReadyForChoice ? "confirm" : "conversation",
          done: false,
          busy: false,
          messages: replaceThinkingMessage(
            current.messages,
            thinkingMessage.id,
            turn.reply,
          ),
        };
      });
      return true;
    } catch (error) {
      if (error?.code === "CLARA_AI_CANCELLED" || error?.name === "AbortError") {
        return false;
      }

      console.warn("[CLARA Buy Check] Progressive conversation turn failed safely.", error);
      await holdThinkingUntil(thinkingStartedAt);
      const dailyLimitReached = error?.code === "CLARA_AI_DAILY_LIMIT_REACHED";
      const failureReply = dailyLimitReached
        ? clean(
            error?.message ||
            "You've used today's CLARA replies for your current plan. Your allowance resets tomorrow.",
          )
        : "I missed that. Say it once more and I’ll keep it simple.";

      setState((current) =>
        current.sessionId !== snapshot.sessionId
          ? current
          : {
              ...current,
              connected: true,
              busy: false,
              step: "conversation",
              confirmation: null,
              messages: replaceThinkingMessage(
                current.messages,
                thinkingMessage.id,
                failureReply,
              ),
            },
      );
      return false;
    } finally {
      if (activeGeminiRequestRef.current === requestToken) {
        activeGeminiRequestRef.current = null;
        activeGeminiAbortRef.current = null;
      }
    }
  }, [assistantContext, state]);

  const confirm = useCallback(async (choice = "buy") => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return false;
    if (!["buy", "not_buy"].includes(choice)) return false;

    const userText = choice === "buy" ? "Yes" : "No";
    const claraText = choice === "buy"
      ? "Got it. Choose where you’ll pay from."
      : "Got it. I’ll remember why you passed on it.";

    setState((current) =>
      current.sessionId !== state.sessionId
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
          },
    );
    return true;
  }, [state]);

  const askMore = useCallback(() => {
    if (state.step !== "confirm" || state.busy) return false;
    return submitAnswer("I want to ask more before deciding.");
  }, [state.busy, state.step, submitAnswer]);

  const returnToChoice = useCallback(() => {
    if (state.step !== "complete" || state.busy) return false;
    setState((current) =>
      current.sessionId !== state.sessionId
        ? current
        : {
            ...current,
            step: "confirm",
            done: false,
            confirmation: confirmationFromEvidence(current.evidence),
          },
    );
    return true;
  }, [state]);

  const editReason = useCallback(() => askMore(), [askMore]);

  const editAmount = useCallback(() => {
    if (!["confirm", "complete"].includes(state.step) || state.busy) return false;

    const sessionId = state.sessionId;
    const evidence = clearPaymentEvidence(state.evidence);
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
      setState((current) =>
        current.sessionId !== sessionId
          ? current
          : {
              ...current,
              busy: false,
              messages: replaceThinkingMessage(
                current.messages,
                thinkingMessage.id,
                "Sure. What’s the exact amount or payment structure you’ll actually pay?",
              ),
            },
      );
    }, MIN_THINKING_MS);

    return true;
  }, [state]);

  const editAnswers = useCallback(() => {
    const sessionId = state.sessionId;
    const thinkingMessage = createMessage("clara", "");

    setState({
      ...createExpertInitialState(sessionId, { connected: true }),
      busy: true,
      messages: [
        ...state.messages,
        createMessage("user", "Start over"),
        thinkingMessage,
      ],
    });

    window.setTimeout(() => {
      setState((current) =>
        current.sessionId !== sessionId
          ? current
          : {
              ...current,
              busy: false,
              messages: replaceThinkingMessage(
                current.messages,
                thinkingMessage.id,
                "Sure. What changed?",
              ),
            },
      );
    }, MIN_THINKING_MS);

    return true;
  }, [state]);

  const checkAnother = useCallback(() => {
    cancelActiveGeminiRequest();
    setState(
      createExpertInitialState(
        `buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        { connected: true },
      ),
    );
    return true;
  }, [cancelActiveGeminiRequest]);

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
