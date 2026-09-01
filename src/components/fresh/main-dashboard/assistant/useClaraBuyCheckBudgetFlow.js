import { useMemo } from "react";
import useClaraBuyCheckExpertFlow from "./useClaraBuyCheckExpertFlow.js";

function isSilentBinaryMessage(message = {}) {
  return message?.role === "user" && /^(yes|no)$/i.test(String(message?.text || message?.content || "").trim());
}

export default function useClaraBuyCheckBudgetFlow(options = {}) {
  const flow = useClaraBuyCheckExpertFlow(options);

  return useMemo(() => {
    const messages = (Array.isArray(flow.messages) ? flow.messages : []).filter(
      (message) => !isSilentBinaryMessage(message),
    );

    return {
      ...flow,
      messages,
      state: flow.state
        ? {
            ...flow.state,
            messages,
            conversationPhase: "deterministic_intake",
          }
        : flow.state,
    };
  }, [flow]);
}
