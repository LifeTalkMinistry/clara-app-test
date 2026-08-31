import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clean,
  createInitialState,
  createMessage,
} from "@/lib/clara-buy-check-budget-intelligence";
import {
  applyLocalPurchaseFacts,
  claraPaymentAmountDueNow,
  hasConfirmedClaraPaymentStructure,
  mergeClaraPurchaseEvidence,
  sanitizeClaraPurchaseEvidence,
} from "@/lib/clara-buy-check-intelligence-router";
import {
  buildClaraBuyCheckPaymentImpact,
  formatClaraBuyCheckPaymentImpactLine,
} from "@/lib/clara-buy-check-payment-impact";
import { requestClaraBuyCheckAlternative } from "@/lib/clara-buy-check-alternative-ai";
import "@/clara-buy-check-thinking.css";

const MIN_THINKING_MS = 450;

export const CLARA_BUY_CHECK_STEP = Object.freeze({
  ITEM: "item",
  CONFIRM_ITEM: "confirm_item",
  REASON_PERMISSION: "reason_permission",
  REASON: "reason",
  PRICE: "price",
  CONFIRM_PRICE: "confirm_price",
  CONFIRM: "confirm",
  COMPLETE: "complete",
});

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

function createStrictInitialState(sessionId = "") {
  return {
    ...createInitialState(sessionId),
    step: CLARA_BUY_CHECK_STEP.ITEM,
    evidence: {},
    reasonPermission: null,
    aiAdviceUsed: false,
    metricImpact: null,
    confirmation: null,
    done: false,
    busy: false,
  };
}

function paymentStructureFromEvidence(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.purchaseType !== "installment") return null;
  if (!hasConfirmedClaraPaymentStructure(source)) return null;
  return {
    purchaseType: "installment",
    amountDueNow: Number(source.amountDueNow || 0),
    paymentAmount: Number(source.paymentAmount || 0),
    remainingPayments: Number(source.remainingPayments || 0),
    totalPayments: Number(source.totalPayments || 0),
    totalCommitment: Number(source.totalCommitment || 0),
    frequency: clean(source.frequency || "monthly") || "monthly",
    fees: Number(source.fees || 0),
  };
}

function paymentConfirmationText(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.purchaseType === "installment") {
    const dueNow = Number(source.amountDueNow || 0);
    const payment = Number(source.paymentAmount || 0);
    const remaining = Number(source.remainingPayments || 0);
    const total = Number(source.totalCommitment || 0);
    if (dueNow > 0 && payment > 0 && total > 0) {
      const future = remaining > 0
        ? `, then ${remaining} more ${source.frequency || "monthly"} payment${remaining === 1 ? "" : "s"} of ₱${payment.toLocaleString("en-PH")}`
        : "";
      return `Just to confirm: ₱${dueNow.toLocaleString("en-PH")} is due now${future}, for ₱${total.toLocaleString("en-PH")} total. Is that correct?`;
    }
    return "Please type the exact installment structure, including what is due now and the remaining payments.";
  }

  const amount = Number(source.price || source.priceCandidate || 0);
  return amount > 0
    ? `₱${amount.toLocaleString("en-PH")} total. Is that correct?`
    : "Please type the exact amount you will actually pay.";
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
    "feeTreatment",
  ].forEach((key) => delete next[key]);
  return sanitizeClaraPurchaseEvidence(next);
}

function reasonFromState(state = {}) {
  return clean(state.reason || state.evidence?.purpose || "");
}

function confirmationFromState(state = {}) {
  return {
    item: clean(state.item || state.evidence?.item),
    price: claraPaymentAmountDueNow(state.evidence),
    reason: reasonFromState(state),
    clarification: "",
    followUpAnswer: "",
    purchaseContext: reasonFromState(state),
  };
}

function buildImpact(evidence = {}, assistantContext = {}) {
  if (!hasConfirmedClaraPaymentStructure(evidence)) return null;
  const amountDueNow = claraPaymentAmountDueNow(evidence);
  if (!(amountDueNow > 0)) return null;
  return buildClaraBuyCheckPaymentImpact({
    purchasePrice: amountDueNow,
    item: clean(evidence.item),
    paymentStructure: paymentStructureFromEvidence(evidence),
    assistantContext,
  });
}

function finalDecisionReply({ impact, advice = "" } = {}) {
  const metricSentence = clean(formatClaraBuyCheckPaymentImpactLine(impact));
  const parts = [];
  if (clean(advice)) parts.push(clean(advice));
  if (metricSentence) parts.push(metricSentence);
  parts.push("Do you still want to continue with this purchase?");
  return parts.join(" ");
}

export default function useClaraBuyCheckExpertFlow({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => createStrictInitialState());
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
    setState(createStrictInitialState(sessionId || `buy-check-${Date.now()}`));
    return true;
  }, [cancelActiveGeminiRequest]);

  const clearSession = useCallback(() => {
    cancelActiveGeminiRequest();
    setState(createStrictInitialState());
  }, [cancelActiveGeminiRequest]);

  const prepareFinalDecision = useCallback(async ({ snapshot, evidence, userMessage }) => {
    const impact = buildImpact(evidence, assistantContext);
    if (!impact?.purchaseSimulationApplied || impact?.projectedScoreAfterPurchase == null) {
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            busy: false,
            step: CLARA_BUY_CHECK_STEP.CONFIRM_PRICE,
            messages: [
              ...current.messages,
              userMessage,
              createMessage("clara", "I have the amount, but I can’t verify the Means impact right now. Please try again in a moment."),
            ],
          });
      return false;
    }

    const reason = reasonFromState({ ...snapshot, evidence });
    const shouldUseAi = Boolean(snapshot.reasonPermission === true && reason && !snapshot.aiAdviceUsed);

    if (!shouldUseAi) {
      const reply = finalDecisionReply({ impact });
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            evidence,
            price: claraPaymentAmountDueNow(evidence),
            metricImpact: impact,
            busy: false,
            step: CLARA_BUY_CHECK_STEP.CONFIRM,
            confirmation: confirmationFromState({ ...current, evidence }),
            messages: [...current.messages, userMessage, createMessage("clara", reply)],
          });
      return true;
    }

    if (activeGeminiRequestRef.current) return false;
    const requestToken = `${snapshot.sessionId || "no-session"}:alternative:${Date.now()}`;
    const requestController = new AbortController();
    const thinkingMessage = createMessage("clara", "");
    const thinkingStartedAt = Date.now();
    activeGeminiRequestRef.current = requestToken;
    activeGeminiAbortRef.current = requestController;

    setState((current) => current.sessionId !== snapshot.sessionId
      ? current
      : {
          ...current,
          evidence,
          price: claraPaymentAmountDueNow(evidence),
          metricImpact: impact,
          busy: true,
          messages: [...current.messages, userMessage, thinkingMessage],
        });

    try {
      const result = await requestClaraBuyCheckAlternative({
        item: clean(evidence.item),
        reason,
        price: claraPaymentAmountDueNow(evidence),
        impact,
        signal: requestController.signal,
      });
      await holdThinkingUntil(thinkingStartedAt);
      const reply = finalDecisionReply({ impact, advice: result?.advice });
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            evidence,
            price: claraPaymentAmountDueNow(evidence),
            metricImpact: impact,
            aiAdviceUsed: true,
            busy: false,
            step: CLARA_BUY_CHECK_STEP.CONFIRM,
            confirmation: confirmationFromState({ ...current, evidence }),
            messages: replaceThinkingMessage(current.messages, thinkingMessage.id, reply),
          });
      return true;
    } catch (error) {
      if (error?.code === "CLARA_AI_CANCELLED" || error?.name === "AbortError") return false;
      console.warn("[CLARA Buy Check] Optional alternative AI skipped safely.", error);
      await holdThinkingUntil(thinkingStartedAt);
      const reply = finalDecisionReply({ impact });
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            evidence,
            price: claraPaymentAmountDueNow(evidence),
            metricImpact: impact,
            aiAdviceUsed: true,
            busy: false,
            step: CLARA_BUY_CHECK_STEP.CONFIRM,
            confirmation: confirmationFromState({ ...current, evidence }),
            messages: replaceThinkingMessage(current.messages, thinkingMessage.id, reply),
          });
      return true;
    } finally {
      if (activeGeminiRequestRef.current === requestToken) {
        activeGeminiRequestRef.current = null;
        activeGeminiAbortRef.current = null;
      }
    }
  }, [assistantContext]);

  const submitAnswer = useCallback(async (raw = "") => {
    const answer = clean(raw);
    if (!answer) return false;

    const snapshot = state;
    if (snapshot.busy || snapshot.step === CLARA_BUY_CHECK_STEP.COMPLETE) return false;
    const userMessage = createMessage("user", answer);

    if (snapshot.step === CLARA_BUY_CHECK_STEP.ITEM) {
      const evidence = mergeClaraPurchaseEvidence(snapshot.evidence, { item: answer });
      setState({
        ...snapshot,
        item: answer,
        evidence,
        step: CLARA_BUY_CHECK_STEP.CONFIRM_ITEM,
        messages: [
          ...snapshot.messages,
          userMessage,
          createMessage("clara", `Got it — ${answer}. Is that the exact item?`),
        ],
      });
      return true;
    }

    if (snapshot.step === CLARA_BUY_CHECK_STEP.CONFIRM_ITEM) {
      const yes = /^(yes|y|yeah|yep|correct|right|oo|opo)$/i.test(answer);
      if (yes) {
        setState({
          ...snapshot,
          step: CLARA_BUY_CHECK_STEP.REASON_PERMISSION,
          messages: [
            ...snapshot.messages,
            userMessage,
            createMessage("clara", "Great. Would you mind sharing why you want or need it?"),
          ],
        });
      } else {
        setState({
          ...snapshot,
          item: "",
          evidence: {},
          step: CLARA_BUY_CHECK_STEP.ITEM,
          messages: [
            ...snapshot.messages,
            userMessage,
            createMessage("clara", "No problem. Type the exact item again."),
          ],
        });
      }
      return true;
    }

    if (snapshot.step === CLARA_BUY_CHECK_STEP.REASON_PERMISSION) {
      const yes = /^(yes|y|yeah|yep|sure|okay|ok|oo|opo)$/i.test(answer);
      if (yes) {
        setState({
          ...snapshot,
          reasonPermission: true,
          step: CLARA_BUY_CHECK_STEP.REASON,
          messages: [
            ...snapshot.messages,
            userMessage,
            createMessage("clara", `Sure. Why do you want or need the ${snapshot.item}?`),
          ],
        });
      } else {
        setState({
          ...snapshot,
          reasonPermission: false,
          step: CLARA_BUY_CHECK_STEP.PRICE,
          messages: [
            ...snapshot.messages,
            userMessage,
            createMessage("clara", `Got it. How much will you actually pay for the ${snapshot.item}?`),
          ],
        });
      }
      return true;
    }

    if (snapshot.step === CLARA_BUY_CHECK_STEP.REASON) {
      const evidence = mergeClaraPurchaseEvidence(snapshot.evidence, { purpose: answer });
      setState({
        ...snapshot,
        reason: answer,
        evidence,
        step: CLARA_BUY_CHECK_STEP.PRICE,
        messages: [
          ...snapshot.messages,
          userMessage,
          createMessage("clara", `Thanks for sharing. How much will you actually pay for the ${snapshot.item}?`),
        ],
      });
      return true;
    }

    if (snapshot.step === CLARA_BUY_CHECK_STEP.PRICE) {
      const evidence = applyLocalPurchaseFacts(answer, snapshot.evidence);
      const source = sanitizeClaraPurchaseEvidence(evidence);
      const hasAmount = hasConfirmedClaraPaymentStructure(source) ||
        Number(source.priceCandidate || source.amountDueNow || 0) > 0;

      if (!hasAmount) {
        setState({
          ...snapshot,
          evidence,
          messages: [
            ...snapshot.messages,
            userMessage,
            createMessage("clara", "Please type the exact amount you will actually pay. If it is an installment, include what is due now and the remaining payments."),
          ],
        });
        return true;
      }

      setState({
        ...snapshot,
        evidence,
        price: claraPaymentAmountDueNow(source) || Number(source.priceCandidate || 0),
        step: CLARA_BUY_CHECK_STEP.CONFIRM_PRICE,
        messages: [
          ...snapshot.messages,
          userMessage,
          createMessage("clara", paymentConfirmationText(source)),
        ],
      });
      return true;
    }

    if (snapshot.step === CLARA_BUY_CHECK_STEP.CONFIRM_PRICE) {
      const yes = /^(yes|y|yeah|yep|correct|right|oo|opo)$/i.test(answer);
      if (!yes) {
        const evidence = clearPaymentEvidence(snapshot.evidence);
        setState({
          ...snapshot,
          evidence,
          price: 0,
          metricImpact: null,
          step: CLARA_BUY_CHECK_STEP.PRICE,
          messages: [
            ...snapshot.messages,
            userMessage,
            createMessage("clara", "No problem. Type the exact amount or payment structure again."),
          ],
        });
        return true;
      }

      const evidence = hasConfirmedClaraPaymentStructure(snapshot.evidence)
        ? snapshot.evidence
        : applyLocalPurchaseFacts(answer, snapshot.evidence);
      if (!hasConfirmedClaraPaymentStructure(evidence)) {
        setState({
          ...snapshot,
          evidence,
          step: CLARA_BUY_CHECK_STEP.PRICE,
          messages: [
            ...snapshot.messages,
            userMessage,
            createMessage("clara", "I still need the exact payment structure before I calculate the impact. Please type it again with what is due now and what remains."),
          ],
        });
        return true;
      }

      return prepareFinalDecision({ snapshot, evidence, userMessage });
    }

    if (snapshot.step === CLARA_BUY_CHECK_STEP.CONFIRM) return false;
    return false;
  }, [prepareFinalDecision, state]);

  const confirm = useCallback(async (choice = "buy") => {
    if (state.step !== CLARA_BUY_CHECK_STEP.CONFIRM || state.busy || !state.confirmation) return false;
    if (!["buy", "not_buy"].includes(choice)) return false;

    const userText = choice === "buy" ? "Yes" : "No";
    const claraText = choice === "buy"
      ? "Got it. Review how you want to record the purchase."
      : "Got it. I’ll keep this as a decision not to spend.";

    setState((current) => current.sessionId !== state.sessionId
      ? current
      : {
          ...current,
          step: CLARA_BUY_CHECK_STEP.COMPLETE,
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
    if (state.step !== CLARA_BUY_CHECK_STEP.CONFIRM || state.busy) return false;
    setState((current) => ({
      ...current,
      messages: [
        ...current.messages,
        createMessage("user", "Ask more"),
        createMessage("clara", "The purchase details and Means impact are already documented. You can choose Yes or No, or go back and change the amount."),
      ],
    }));
    return true;
  }, [state.busy, state.step]);

  const returnToChoice = useCallback(() => {
    if (state.step !== CLARA_BUY_CHECK_STEP.COMPLETE || state.busy) return false;
    setState((current) => current.sessionId !== state.sessionId
      ? current
      : {
          ...current,
          step: CLARA_BUY_CHECK_STEP.CONFIRM,
          done: false,
          confirmation: confirmationFromState(current),
        });
    return true;
  }, [state]);

  const editReason = useCallback(() => {
    if (state.busy) return false;
    setState((current) => ({
      ...current,
      reasonPermission: true,
      reason: "",
      evidence: mergeClaraPurchaseEvidence(current.evidence, { purpose: "" }),
      step: CLARA_BUY_CHECK_STEP.REASON,
      confirmation: null,
      done: false,
      messages: [...current.messages, createMessage("clara", "Sure. Why do you want or need it?")],
    }));
    return true;
  }, [state.busy]);

  const editAmount = useCallback(() => {
    if (state.busy) return false;
    setState((current) => ({
      ...current,
      evidence: clearPaymentEvidence(current.evidence),
      price: 0,
      metricImpact: null,
      confirmation: null,
      done: false,
      step: CLARA_BUY_CHECK_STEP.PRICE,
      messages: [...current.messages, createMessage("clara", "Sure. What is the exact amount or payment structure you will actually pay?")],
    }));
    return true;
  }, [state.busy]);

  const editAnswers = useCallback(() => {
    const sessionId = state.sessionId;
    cancelActiveGeminiRequest();
    setState({
      ...createStrictInitialState(sessionId),
      messages: [...state.messages, createMessage("clara", "Sure. Type the exact item again.")],
    });
    return true;
  }, [cancelActiveGeminiRequest, state]);

  const checkAnother = useCallback(() => {
    cancelActiveGeminiRequest();
    setState(createStrictInitialState(`buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`));
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
