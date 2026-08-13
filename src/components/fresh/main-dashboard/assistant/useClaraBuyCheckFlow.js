import useClaraBuyCheckFlowV5 from "./useClaraBuyCheckFlowV5.js";

// Ask Before You Spend is part of CLARA's universal free core. The decision
// flow must never depend on membership, payment, support, beta activation, or a
// daily quota whose bypass is tied to a paid/Committed state.
export default function useClaraBuyCheckFlow({ assistantContext = {} } = {}) {
  return useClaraBuyCheckFlowV5({ assistantContext });
}
