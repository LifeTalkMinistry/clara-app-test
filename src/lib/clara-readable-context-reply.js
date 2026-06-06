import { buildClaraMasterDiagnosisDirectReply as a } from "./clara-master-diagnosis-ai-reader";
import { buildContextualFinanceReply as b } from "./clara-direct-finance-reply";

export function buildContextualFinanceReply(m = "", c = {}) {
  return a(m, c) || b(m, c);
}
