import useClaraBuyCheckFlowV5 from "./useClaraBuyCheckFlowV5.js";

// Ask Before You Spend is application-owned. Item, reason permission, reason,
// payment capture, confirmation, Means impact, and post-choice recording stay
// local. Gemini is optional and can run at most once, only after the user chose
// to share a reason, to offer one practical alternative before the final choice.
export default function useClaraBuyCheckFlow({ assistantContext = {} } = {}) {
  return useClaraBuyCheckFlowV5({ assistantContext });
}
