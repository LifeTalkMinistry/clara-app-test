/**
 * Legacy CLARA AI command executor.
 *
 * Direct finance writes through the retired cloud-data path are disabled.
 * Active CLARA finance writes must go through the offline-first finance
 * repository so wallet, budget, and expense state remain atomic and local.
 */

export async function executeCommand(session) {
  const intent = String(session?.intent || "UNKNOWN").trim() || "UNKNOWN";

  return {
    success: false,
    disabled: true,
    intent,
    message:
      "Legacy AI executor disabled. Use the offline-first finance repository flow instead.",
  };
}

export default executeCommand;
