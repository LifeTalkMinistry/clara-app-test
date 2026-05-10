/**
 * Legacy CLARA AI command executor.
 *
 * This file previously performed direct finance writes to Supabase tables
 * such as expenses, wallets, budgets, and wallet_transactions.
 *
 * That behavior bypassed CLARA's offline-first architecture and could create:
 * - wallet balance mismatches
 * - duplicated finance state
 * - dashboard inconsistencies
 * - offline/online sync conflicts
 *
 * Active CLARA finance writes must go through:
 * - useFinancialData
 * - financeRepository
 * - localFinanceStore (IndexedDB)
 *
 * The modern CLARA assistant already uses the local/offline-first brain.
 * This compatibility layer now fails safely instead of writing directly to
 * Supabase.
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
