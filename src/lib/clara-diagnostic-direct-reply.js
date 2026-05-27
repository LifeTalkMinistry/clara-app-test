import { buildClaraContextDiagnosticReport, isClaraContextDiagnosticRequest } from "./clara-context-diagnostic-report";

export function buildClaraDiagnosticDirectReply(prompt = "", context = {}) {
  if (!isClaraContextDiagnosticRequest(prompt)) return "";
  return buildClaraContextDiagnosticReport(context || {});
}
