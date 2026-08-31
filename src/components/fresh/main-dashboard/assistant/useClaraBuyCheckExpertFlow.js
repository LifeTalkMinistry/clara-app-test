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

const INTAKE_STEP = Object.freeze({
  ITEM: "item",
  CONFIRM_ITEM: "confirm_item",
  REASON_PERMISSION: "reason_permission",
  REASON: "reason",
  PRICE: "price",
  CONFIRM_PRICE: "confirm_price",
  FINAL: "final",
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

function initialStrictState(sessionId = "") {
  return {
    ...createInitialState(sessionId),
    step: "conversation",
    intakeStep: INTAKE_STEP.ITEM,
    evidence: {},
    reasonPermission: null,
    aiAdviceUsed: false,
    metricImpact: null,
    connected: true,
    conversationPhase: "strict_intake",
    readinessConfidence: 0,
    conversationTurns: 0,
  };
}

function yes(value = "") {
  return /^(yes|y|yeah|yep|yup|correct|right|exactly|sure|okay|ok|oo|opo)[.!\s]*$/i.test(clean(value));
}

function no(value = "") {
  return /^(no|n|nope|nah|hindi)[.!\s]*$/i.test(clean(value));
}

function oneTimeCandidate(value = "") {
  const source = clean(value);
  if (!source || /\b(installment|monthly|per\s+month|months?|down\s*payment|downpayment|deposit|fee|interest)\b/i.test(source)) {
    return 0;
  }
  const matches = source.match(/(?:₱|php\s*)?([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  if (!matches) return 0;
  const amount = Number(String(matches[1] || "").replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function paymentEvidenceFromInput(answer = "", previousEvidence = {}) {
  const local = applyLocalPurchaseFacts(answer, previousEvidence);
  const source = sanitizeClaraPurchaseEvidence(local);
  if (hasConfirmedClaraPaymentStructure(source)) return source;

  const directAmount = oneTimeCandidate(answer);
  if (!(directAmount > 0)) return source;

  return sanitizeClaraPurchaseEvidence({
    ...source,
    purchaseType: "one_time",
    priceCandidate: directAmount,
    priceStatus: "needs_confirmation",
  });
}

function confirmPaymentEvidence(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (hasConfirmedClaraPaymentStructure(source)) return source;

  if (source.purchaseType === "one_time" && Number(source.priceCandidate) > 0) {
    return sanitizeClaraPurchaseEvidence({
      ...source,
      price: Number(source.priceCandidate),
      priceStatus: "confirmed",
      priceSource: "user_confirmation",
    });
  }

  return applyLocalPurchaseFacts("Yes", source);
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

function paymentStructureFromEvidence(evidence = {}) {
  const source = sanitizeClaraPurchaseEvidence(evidence);
  if (source.purchaseType !== "installment" || !hasConfirmedClaraPaymentStructure(source)) return null;
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
      return `Just to confirm: ₱${dueNow.toLocaleString("en-PH")} is due now${future}, for ₱${total.toLocaleString("en-PH")} total. Reply Yes or No.`;
    }
  }

  const amount = Number(source.price || source.priceCandidate || 0);
  return amount > 0
    ? `₱${amount.toLocaleString("en-PH")} total. Is that correct? Reply Yes or No.`
    : "Please type the exact amount you will actually pay.";
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

function transactionReason(state = {}) {
  return clean(state.reason || state.evidence?.purpose || "");
}

function confirmationFromState(state = {}) {
  return {
    item: clean(state.item || state.evidence?.item),
    price: hasConfirmedClaraPaymentStructure(state.evidence)
      ? claraPaymentAmountDueNow(state.evidence)
      : 0,
    reason: transactionReason(state),
    clarification: "",
    followUpAnswer: "",
    purchaseContext: transactionReason(state),
  };
}

function finalReply(impact = {}, advice = "") {
  const metric = clean(formatClaraBuyCheckPaymentImpactLine(impact));
  return [clean(advice), metric, "Do you still want to continue with this purchase?"]
    .filter(Boolean)
    .join(" ");
}

export default function useClaraBuyCheckExpertFlow({ assistantContext = {} } = {}) {
  const [state, setState] = useState(() => initialStrictState());
  const activeGeminiRequestRef = useRef(null);
  const activeGeminiAbortRef = useRef(null);

  const cancelActiveGeminiRequest = useCallback(() => {
    activeGeminiAbortRef.current?.abort();
    activeGeminiAbortRef.current = null;
    activeGeminiRequestRef.current = null;
  }, []);

  useEffect(() => () => cancelActiveGeminiRequest(), [cancelActiveGeminiRequest]);

  const startSession = useCallback((sessionId = "") => {
    cancelActiveGeminiRequest();
    setState(initialStrictState(sessionId || `buy-check-${Date.now()}`));
    return true;
  }, [cancelActiveGeminiRequest]);

  const clearSession = useCallback(() => {
    cancelActiveGeminiRequest();
    setState(initialStrictState());
  }, [cancelActiveGeminiRequest]);

  const finishIntake = useCallback(async ({ snapshot, evidence, userMessage }) => {
    const impact = buildImpact(evidence, assistantContext);
    if (!impact?.purchaseSimulationApplied || impact?.projectedScoreAfterPurchase == null) {
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            busy: false,
            intakeStep: INTAKE_STEP.PRICE,
            messages: [
              ...current.messages,
              userMessage,
              createMessage("clara", "I have the amount, but I can’t verify the Means impact right now. Please try again in a moment."),
            ],
          });
      return false;
    }

    const reason = transactionReason({ ...snapshot, evidence });
    const shouldUseAi = Boolean(snapshot.reasonPermission === true && reason && !snapshot.aiAdviceUsed);

    if (!shouldUseAi) {
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            evidence,
            price: claraPaymentAmountDueNow(evidence),
            metricImpact: impact,
            intakeStep: INTAKE_STEP.FINAL,
            step: "confirm",
            confirmation: confirmationFromState({ ...current, evidence }),
            busy: false,
            messages: [...current.messages, userMessage, createMessage("clara", finalReply(impact))],
          });
      return true;
    }

    if (activeGeminiRequestRef.current) return false;
    const token = `${snapshot.sessionId}:alternative:${Date.now()}`;
    const controller = new AbortController();
    const thinkingMessage = createMessage("clara", "");
    const startedAt = Date.now();
    activeGeminiRequestRef.current = token;
    activeGeminiAbortRef.current = controller;

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
        signal: controller.signal,
      });
      await holdThinkingUntil(startedAt);
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            evidence,
            price: claraPaymentAmountDueNow(evidence),
            metricImpact: impact,
            aiAdviceUsed: true,
            intakeStep: INTAKE_STEP.FINAL,
            step: "confirm",
            confirmation: confirmationFromState({ ...current, evidence }),
            busy: false,
            messages: replaceThinkingMessage(current.messages, thinkingMessage.id, finalReply(impact, result?.advice)),
          });
      return true;
    } catch (error) {
      if (error?.code === "CLARA_AI_CANCELLED" || error?.name === "AbortError") return false;
      console.warn("[CLARA Buy Check] Optional alternative AI skipped safely.", error);
      await holdThinkingUntil(startedAt);
      setState((current) => current.sessionId !== snapshot.sessionId
        ? current
        : {
            ...current,
            evidence,
            price: claraPaymentAmountDueNow(evidence),
            metricImpact: impact,
            aiAdviceUsed: true,
            intakeStep: INTAKE_STEP.FINAL,
            step: "confirm",
            confirmation: confirmationFromState({ ...current, evidence }),
            busy: false,
            messages: replaceThinkingMessage(current.messages, thinkingMessage.id, finalReply(impact)),
          });
      return true;
    } finally {
      if (activeGeminiRequestRef.current === token) {
        activeGeminiRequestRef.current = null;
        activeGeminiAbortRef.current = null;
      }
    }
  }, [assistantContext]);

  const submitAnswer = useCallback(async (raw = "") => {
    const answer = clean(raw);
    if (!answer) return false;

    const snapshot = state;
    if (snapshot.busy || snapshot.step === "complete" || snapshot.step === "confirm") return false;
    const userMessage = createMessage("user", answer);

    if (snapshot.intakeStep === INTAKE_STEP.ITEM) {
      const evidence = mergeClaraPurchaseEvidence(snapshot.evidence, { item: answer });
      setState({
        ...snapshot,
        item: answer,
        evidence,
        intakeStep: INTAKE_STEP.CONFIRM_ITEM,
        conversationTurns: snapshot.conversationTurns + 1,
        messages: [...snapshot.messages, userMessage, createMessage("clara", `Got it — ${answer}. Is that the exact item? Reply Yes or No.`)],
      });
      return true;
    }

    if (snapshot.intakeStep === INTAKE_STEP.CONFIRM_ITEM) {
      if (yes(answer)) {
        setState({
          ...snapshot,
          intakeStep: INTAKE_STEP.REASON_PERMISSION,
          conversationTurns: snapshot.conversationTurns + 1,
          messages: [...snapshot.messages, userMessage, createMessage("clara", "Great. Would you mind telling me why you want or need it? Reply Yes or No.")],
        });
      } else if (no(answer)) {
        setState({
          ...snapshot,
          item: "",
          evidence: {},
          intakeStep: INTAKE_STEP.ITEM,
          conversationTurns: snapshot.conversationTurns + 1,
          messages: [...snapshot.messages, userMessage, createMessage("clara", "No problem. Type the exact item again.")],
        });
      } else {
        setState({
          ...snapshot,
          messages: [...snapshot.messages, userMessage, createMessage("clara", "Please reply Yes or No so I can lock the item first.")],
        });
      }
      return true;
    }

    if (snapshot.intakeStep === INTAKE_STEP.REASON_PERMISSION) {
      if (yes(answer)) {
        setState({
          ...snapshot,
          reasonPermission: true,
          intakeStep: INTAKE_STEP.REASON,
          conversationTurns: snapshot.conversationTurns + 1,
          messages: [...snapshot.messages, userMessage, createMessage("clara", `Sure. Why do you want or need the ${snapshot.item}?`)],
        });
      } else if (no(answer)) {
        setState({
          ...snapshot,
          reasonPermission: false,
          intakeStep: INTAKE_STEP.PRICE,
          conversationTurns: snapshot.conversationTurns + 1,
          messages: [...snapshot.messages, userMessage, createMessage("clara", `Got it. How much will you actually pay for the ${snapshot.item}?`)],
        });
      } else {
        setState({
          ...snapshot,
          messages: [...snapshot.messages, userMessage, createMessage("clara", "Please reply Yes or No. Sharing the reason is optional.")],
        });
      }
      return true;
    }

    if (snapshot.intakeStep === INTAKE_STEP.REASON) {
      const evidence = mergeClaraPurchaseEvidence(snapshot.evidence, { purpose: answer });
      setState({
        ...snapshot,
        reason: answer,
        evidence,
        intakeStep: INTAKE_STEP.PRICE,
        conversationTurns: snapshot.conversationTurns + 1,
        messages: [...snapshot.messages, userMessage, createMessage("clara", `Thanks for sharing. How much will you actually pay for the ${snapshot.item}?`)],
      });
      return true;
    }

    if (snapshot.intakeStep === INTAKE_STEP.PRICE) {
      const evidence = paymentEvidenceFromInput(answer, snapshot.evidence);
      const amount = Number(evidence.price || evidence.priceCandidate || evidence.amountDueNow || 0);
      if (!(amount > 0)) {
        setState({
          ...snapshot,
          evidence,
          messages: [...snapshot.messages, userMessage, createMessage("clara", "Please type the exact amount you will actually pay. If it is an installment, include what is due now and the remaining payments.")],
        });
        return true;
      }
      setState({
        ...snapshot,
        evidence,
        price: amount,
        intakeStep: INTAKE_STEP.CONFIRM_PRICE,
        conversationTurns: snapshot.conversationTurns + 1,
        messages: [...snapshot.messages, userMessage, createMessage("clara", paymentConfirmationText(evidence))],
      });
      return true;
    }

    if (snapshot.intakeStep === INTAKE_STEP.CONFIRM_PRICE) {
      if (no(answer)) {
        setState({
          ...snapshot,
          evidence: clearPaymentEvidence(snapshot.evidence),
          price: 0,
          metricImpact: null,
          intakeStep: INTAKE_STEP.PRICE,
          conversationTurns: snapshot.conversationTurns + 1,
          messages: [...snapshot.messages, userMessage, createMessage("clara", "No problem. Type the exact amount or payment structure again.")],
        });
        return true;
      }
      if (!yes(answer)) {
        setState({
          ...snapshot,
          messages: [...snapshot.messages, userMessage, createMessage("clara", "Please reply Yes or No so I can confirm the amount before calculating the impact.")],
        });
        return true;
      }
      const evidence = confirmPaymentEvidence(snapshot.evidence);
      if (!hasConfirmedClaraPaymentStructure(evidence)) {
        setState({
          ...snapshot,
          evidence,
          intakeStep: INTAKE_STEP.PRICE,
          messages: [...snapshot.messages, userMessage, createMessage("clara", "I still need the exact payment structure. Please type it again.")],
        });
        return true;
      }
      return finishIntake({ snapshot, evidence, userMessage });
    }

    return false;
  }, [finishIntake, state]);

  const confirm = useCallback(async (choice = "buy") => {
    if (state.step !== "confirm" || state.busy || !state.confirmation) return false;
    if (!["buy", "not_buy"].includes(choice)) return false;

    const userText = choice === "buy" ? "Yes" : "No";
    const claraText = choice === "buy"
      ? "Got it. Choose where you’ll pay from."
      : "Got it. I’ll remember why you passed on it.";

    setState((current) => current.sessionId !== state.sessionId
      ? current
      : {
          ...current,
          step: "complete",
          busy: false,
          done: true,
          confirmation: null,
          messages: [...current.messages, createMessage("user", userText), createMessage("clara", claraText)],
        });
    return true;
  }, [state]);

  const askMore = useCallback(() => false, []);

  const returnToChoice = useCallback(() => {
    if (state.step !== "complete" || state.busy) return false;
    setState((current) => current.sessionId !== state.sessionId
      ? current
      : {
          ...current,
          step: "confirm",
          done: false,
          confirmation: confirmationFromState(current),
        });
    return true;
  }, [state]);

  const editReason = useCallback(() => false, []);

  const editAmount = useCallback(() => {
    if (!["confirm", "complete"].includes(state.step) || state.busy) return false;
    setState((current) => ({
      ...current,
      step: "conversation",
      intakeStep: INTAKE_STEP.PRICE,
      evidence: clearPaymentEvidence(current.evidence),
      price: 0,
      metricImpact: null,
      confirmation: null,
      done: false,
      messages: [...current.messages, createMessage("clara", "Sure. What’s the exact amount or payment structure you’ll actually pay?")],
    }));
    return true;
  }, [state.busy, state.step]);

  const editAnswers = useCallback(() => {
    const sessionId = state.sessionId;
    setState({
      ...initialStrictState(sessionId),
      messages: [...state.messages, createMessage("clara", "Sure. Type the exact item again.")],
    });
    return true;
  }, [state]);

  const checkAnother = useCallback(() => {
    cancelActiveGeminiRequest();
    setState(initialStrictState(`buy-check-${Date.now()}-${Math.random().toString(36).slice(2)}`));
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
