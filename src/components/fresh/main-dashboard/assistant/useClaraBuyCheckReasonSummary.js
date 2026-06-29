import { useCallback, useMemo, useRef, useState } from "react";
import useClaraBuyCheckFlowV4 from "./useClaraBuyCheckFlowV4.js";
import { formatMoney, interpretBuyCheckReason, normalizeReasonSummary } from "./buyCheckReasonInterpreter.js";

const blank = () => ({ busy: false, original: "", summary: "", confirmation: "", sessionId: "", index: -1, source: "" });
const clean = (v = "") => String(v ?? "").replace(/\s+/g, " ").trim();

export default function useClaraBuyCheckReasonSummary({ assistantContext = {} } = {}) {
  const flow = useClaraBuyCheckFlowV4({ assistantContext });
  const [reason, setReason] = useState(blank);
  const sessionRef = useRef("");
  sessionRef.current = flow.state?.sessionId || "";

  const submitAnswer = useCallback(async (raw = "") => {
    const answer = clean(raw);
    if (!answer) return false;
    if (flow.state?.step !== "reason") return flow.submitAnswer(answer);
    if (reason.busy || flow.state?.busy) return false;

    const sessionId = flow.state?.sessionId || "";
    const item = clean(flow.state?.item || "this purchase");
    const price = Number(flow.state?.price || 0);
    const index = flow.messages?.length || 0;
    setReason({ busy: true, original: answer, summary: "", confirmation: "", sessionId, index, source: "" });

    const result = await interpretBuyCheckReason({ item, price, originalReason: answer, assistantContext });
    if (sessionRef.current !== sessionId) return false;

    const summary = normalizeReasonSummary(result.summary, answer);
    const confirmation = `You’re considering ${item} for ${formatMoney(price)} because ${summary}. Did I understand that correctly before I run the full Buy Check?`;
    if (!flow.submitAnswer(summary)) return false;
    setReason({ busy: false, original: answer, summary, confirmation, sessionId, index, source: result.source });
    return true;
  }, [assistantContext, flow, reason.busy]);

  const messages = useMemo(() => {
    const list = flow.messages || [];
    if (reason.busy) return [...list, { id: `reason-${reason.sessionId}`, role: "clara", text: "Let me make sure I understood your reason correctly..." }];
    if (!reason.confirmation || reason.sessionId !== flow.state?.sessionId) return list;
    return list.map((message, index) => index === reason.index ? { ...message, role: "user", text: reason.original } : index === reason.index + 1 ? { ...message, role: "clara", text: reason.confirmation } : message);
  }, [flow.messages, flow.state?.sessionId, reason]);

  return { ...flow, submitAnswer, messages, state: { ...flow.state, busy: Boolean(flow.state?.busy || reason.busy), originalReason: reason.original || flow.state?.reason || "", summarizedReason: reason.summary || flow.state?.reason || "", reasonSummarySource: reason.source } };
}
