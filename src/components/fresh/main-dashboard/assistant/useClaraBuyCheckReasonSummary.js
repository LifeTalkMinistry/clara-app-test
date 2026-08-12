import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useClaraBuyCheckFlowV5 from "./useClaraBuyCheckFlowV5.js";
import {
  interpretBuyCheckItem,
  normalizeItemSummary,
} from "./buyCheckReasonInterpreter.js";

const clean = (value = "") => String(value ?? "").replace(/\s+/g, " ").trim();
const blankItem = () => ({ busy: false, original: "", item: "", sessionId: "", index: -1, source: "" });

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
  const sessionRef = useRef("");
  sessionRef.current = flow.state?.sessionId || "";

  useEffect(() => {
    setItemState(blankItem());
  }, [flow.state?.sessionId]);

  const submitAnswer = useCallback(async (raw = "") => {
    const answer = clean(raw);
    if (!answer) return false;
    if (itemState.busy || flow.state?.busy) return false;

    const sessionId = flow.state?.sessionId || "";
    const step = flow.state?.step;
    const index = flow.messages?.length || 0;

    if (step === "item") {
      setItemState({ busy: true, original: answer, item: "", sessionId, index, source: "" });
      const result = await interpretBuyCheckItem({ originalItem: answer });
      if (sessionRef.current !== sessionId) return false;

      const item = normalizeItemSummary(result.item, answer);
      const submitted = await flow.submitAnswer(item);
      if (!submitted) {
        setItemState(blankItem());
        return false;
      }

      setItemState({ busy: false, original: answer, item, sessionId, index, source: result.source });
      return true;
    }

    return flow.submitAnswer(answer);
  }, [flow, itemState.busy]);

  const messages = useMemo(() => {
    let list = [...(flow.messages || [])];
    const activeSessionId = flow.state?.sessionId;

    if (itemState.sessionId === activeSessionId) {
      if (itemState.busy) {
        list = replaceOrAppendThinking(
          list,
          itemState.index,
          `item-${itemState.sessionId}`,
          "Let me make sure I understood what you want to buy...",
        );
      } else if (itemState.item && list.length > itemState.index) {
        list = list.map((message, index) => index === itemState.index
          ? { ...message, role: "user", text: itemState.original }
          : message);
      }
    }

    return list;
  }, [flow.messages, flow.state?.sessionId, itemState]);

  return {
    ...flow,
    submitAnswer,
    messages,
    state: {
      ...flow.state,
      busy: Boolean(flow.state?.busy || itemState.busy),
      originalItem: itemState.original || flow.state?.item || "",
      interpretedItem: itemState.item || flow.state?.item || "",
      itemInterpretationSource: itemState.source,
      originalReason: flow.state?.reason || "",
      summarizedReason: flow.state?.reason || "",
      reasonSummarySource: "conversation-ai",
      confirmationSummarySource: "conversation-ai",
    },
  };
}
