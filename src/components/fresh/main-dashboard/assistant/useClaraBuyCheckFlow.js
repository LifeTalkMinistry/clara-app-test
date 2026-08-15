import useClaraBuyCheckFlowV5 from "./useClaraBuyCheckFlowV5.js";

// Ask Before You Spend remains available to every CLARA user. Only successful
// Gemini conversation replies use the server-owned daily AI allowance; the
// user's financial tools, data, and post-choice save actions are never gated.
export default function useClaraBuyCheckFlow({ assistantContext = {} } = {}) {
  return useClaraBuyCheckFlowV5({ assistantContext });
}
