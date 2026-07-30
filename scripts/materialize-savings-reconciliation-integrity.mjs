import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  const last = source.lastIndexOf(search);
  if (first < 0) throw new Error(`Missing source contract: ${label}`);
  if (first !== last) throw new Error(`Ambiguous source contract: ${label}`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

const financePath = "src/hooks/useFinancialData.js";
let finance = readFileSync(financePath, "utf8");
finance = replaceOnce(
  finance,
  `  getWalletTransactions,\n  addIncome as repoAddIncome,`,
  `  getWalletTransactions,\n  insertWalletTransaction as repoInsertWalletTransaction,\n  addIncome as repoAddIncome,`,
  "wallet transaction repository import",
);
finance = replaceOnce(
  finance,
  `const FINANCE_INCOME_TYPES = new Set(["income", "add", "cash_in", "deposit", "opening_balance", "credit"]);`,
  `const FINANCE_INCOME_TYPES = new Set(["income", "add", "cash_in", "deposit", "opening_balance", "credit"]);\nconst NON_EARNED_INCOME_SOURCE_TYPES = new Set(["savings_wallet_reconciliation", "balance_correction"]);\nconst NON_EARNED_INCOME_TAGS = new Set(["historical_wallet_correction"]);\nconst isEarnedIncomeTransaction = (transaction = {}) => {\n  const type = String(transaction?.type || "").trim().toLowerCase();\n  if (!FINANCE_INCOME_TYPES.has(type)) return false;\n  const sourceType = String(transaction?.source_type || transaction?.sourceType || "").trim().toLowerCase();\n  const tag = String(transaction?.tag || "").trim().toLowerCase();\n  return !NON_EARNED_INCOME_SOURCE_TYPES.has(sourceType) && !NON_EARNED_INCOME_TAGS.has(tag);\n};`,
  "earned income classifier",
);
finance = replaceOnce(
  finance,
  `    const safeIncomes = safeWalletTransactions.filter((transaction) => FINANCE_INCOME_TYPES.has(String(transaction?.type || "").trim().toLowerCase()));`,
  `    const safeIncomes = safeWalletTransactions.filter(isEarnedIncomeTransaction);`,
  "safe income filtering",
);
finance = replaceOnce(
  finance,
  `  const addMoney = useCallback(async (income) => { const result = typeof repoAddMoney === "function" ? await repoAddMoney(localUserId, income) : await repoAddIncome(localUserId, income); await refreshData(); return result; }, [localUserId, refreshData]);`,
  `  const addMoney = useCallback(async (income) => { const result = typeof repoAddMoney === "function" ? await repoAddMoney(localUserId, income) : await repoAddIncome(localUserId, income); await refreshData(); return result; }, [localUserId, refreshData]);\n  const insertWalletTransaction = useCallback(async (transaction) => { const result = await repoInsertWalletTransaction(localUserId, transaction); await refreshData(); return result; }, [localUserId, refreshData]);`,
  "neutral wallet activity action",
);
finance = replaceOnce(
  finance,
  `  const totalIncome = useMemo(() => safeWalletTransactions.filter((transaction) => FINANCE_INCOME_TYPES.has(String(transaction?.type || "").trim().toLowerCase())).reduce((sum, transaction) => sum + toNumber(transaction.amount), 0), [safeWalletTransactions]);`,
  `  const totalIncome = useMemo(() => safeIncomes.reduce((sum, transaction) => sum + toNumber(transaction.amount), 0), [safeIncomes]);`,
  "total income exclusion",
);
finance = replaceOnce(
  finance,
  `    addIncome, addMoney, updateWalletTransaction, deleteWalletTransaction, deleteIncome, transferBetweenWallets, updateTransfer, deleteTransfer,`,
  `    addIncome, addMoney, insertWalletTransaction, updateWalletTransaction, deleteWalletTransaction, deleteIncome, transferBetweenWallets, updateTransfer, deleteTransfer,`,
  "finance action export",
);
writeFileSync(financePath, finance);

const savingsPath = "src/pages/SavingsGoalsIntegrated.jsx";
let savings = readFileSync(savingsPath, "utf8");
savings = replaceOnce(
  savings,
  `    addMoney,\n    updateWallet,`,
  `    addMoney,\n    insertWalletTransaction,\n    updateWallet,`,
  "Savings wallet activity action",
);
savings = replaceOnce(
  savings,
  `    const cleanReason = String(input?.reason || "").trim();\n    const currentSaved = Math.max(getGoalSavedAmount(goal), 0);`,
  `    const cleanReason = String(input?.reason || "").trim();\n    const rawActualWalletBalance = String(input?.actualWalletBalance ?? "").trim();\n    const rawActualSavedBalance = String(input?.actualSavedBalance ?? "").trim();\n    const currentSaved = Math.max(getGoalSavedAmount(goal), 0);`,
  "explicit reconciliation inputs",
);
savings = replaceOnce(
  savings,
  `    } else {\n      nextWalletBalance = toNumber(input?.actualWalletBalance);\n      nextSaved = toNumber(input?.actualSavedBalance);\n      if (nextWalletBalance < 0) throw new Error("Actual wallet balance cannot be negative.");\n      if (nextSaved < 0) throw new Error("Actual saved amount cannot be negative.");\n    }`,
  `    } else {\n      if (!rawActualWalletBalance || !rawActualSavedBalance) {\n        throw new Error("Enter both the actual wallet balance and the actual saved amount.");\n      }\n      nextWalletBalance = toNumber(rawActualWalletBalance);\n      nextSaved = toNumber(rawActualSavedBalance);\n      if (nextWalletBalance < 0) throw new Error("Actual wallet balance cannot be negative.");\n      if (nextSaved < 0) throw new Error("Actual saved amount cannot be negative.");\n    }`,
  "required both-record values",
);
savings = replaceOnce(
  savings,
  `    let walletCorrectionTransactionId = "";\n    let walletAdjustedDirectly = false;`,
  `    let walletCorrectionTransactionId = "";\n    let walletCorrectionActivityId = "";\n    let walletAdjustedDirectly = false;`,
  "rollback tracking",
);
savings = replaceOnce(
  savings,
  `      } else if (walletDelta < 0) {\n        if (typeof updateWallet !== "function") throw new Error("Wallet balance correction is not available yet.");\n        await updateWallet(selectedWalletId, {\n          balance: nextWalletBalance,\n          last_balance_correction_reason: cleanReason,\n          lastBalanceCorrectionReason: cleanReason,\n          last_balance_correction_at: now,\n          lastBalanceCorrectionAt: now,\n          last_balance_correction_source: "savings_wallet_reconciliation",\n          lastBalanceCorrectionSource: "savings_wallet_reconciliation",\n          syncStatus: "local_only",\n          source: "local",\n        });\n        walletAdjustedDirectly = true;\n      }`,
  `      } else if (walletDelta < 0) {\n        if (typeof updateWallet !== "function" || typeof insertWalletTransaction !== "function") {\n          throw new Error("Wallet balance correction activity is not available yet.");\n        }\n        await updateWallet(selectedWalletId, {\n          balance: nextWalletBalance,\n          last_balance_correction_reason: cleanReason,\n          lastBalanceCorrectionReason: cleanReason,\n          last_balance_correction_at: now,\n          lastBalanceCorrectionAt: now,\n          last_balance_correction_source: "savings_wallet_reconciliation",\n          lastBalanceCorrectionSource: "savings_wallet_reconciliation",\n          syncStatus: "local_only",\n          source: "local",\n        });\n        walletAdjustedDirectly = true;\n        const walletActivityResult = await insertWalletTransaction({\n          id: reconciliationId + "_wallet_activity",\n          wallet_id: selectedWalletId,\n          amount: Math.abs(walletDelta),\n          type: "balance_correction",\n          category: "Balance Correction",\n          source_type: "savings_wallet_reconciliation",\n          tag: "historical_wallet_correction",\n          notes: 'Wallet balance corrected for savings goal "' + (goal?.title || "Savings Goal") + '": ' + cleanReason,\n          details: JSON.stringify({\n            reconciliation_id: reconciliationId,\n            savings_goal_id: goal?.id || null,\n            previous_balance: currentWalletBalance,\n            next_balance: nextWalletBalance,\n            adjustment: walletDelta,\n          }),\n          created_at: now,\n          user_id: user?.id || null,\n          user_email: user?.email || null,\n          created_by: user?.email || null,\n        });\n        walletCorrectionActivityId = String(walletActivityResult?.walletTransaction?.id || walletActivityResult?.id || reconciliationId + "_wallet_activity");\n      }`,
  "downward wallet correction activity",
);
savings = replaceOnce(
  savings,
  `          linkedWalletTransactionId: walletCorrectionTransactionId || null,\n          linked_wallet_transaction_id: walletCorrectionTransactionId || null,`,
  `          linkedWalletTransactionId: walletCorrectionTransactionId || walletCorrectionActivityId || null,\n          linked_wallet_transaction_id: walletCorrectionTransactionId || walletCorrectionActivityId || null,`,
  "linked correction activity",
);
savings = replaceOnce(
  savings,
  `    } catch (error) {\n      if (walletCorrectionTransactionId && typeof deleteWalletTransaction === "function") {\n        try { await deleteWalletTransaction(walletCorrectionTransactionId); }\n        catch (rollbackError) { console.error("Failed to roll back historical wallet correction:", rollbackError); }\n      } else if (walletAdjustedDirectly && typeof updateWallet === "function") {\n        try {\n          await updateWallet(selectedWalletId, {\n            balance: currentWalletBalance,\n            last_balance_correction_source: "savings_wallet_reconciliation_rollback",\n            lastBalanceCorrectionSource: "savings_wallet_reconciliation_rollback",\n            syncStatus: "local_only",\n            source: "local",\n          });\n        } catch (rollbackError) {\n          console.error("Failed to roll back wallet balance correction:", rollbackError);\n        }\n      }\n      throw error;\n    }`,
  `    } catch (error) {\n      const rollbackFailures = [];\n      if (walletCorrectionTransactionId && typeof deleteWalletTransaction === "function") {\n        try { await deleteWalletTransaction(walletCorrectionTransactionId); }\n        catch (rollbackError) {\n          rollbackFailures.push("historical wallet correction");\n          console.error("Failed to roll back historical wallet correction:", rollbackError);\n        }\n      }\n      if (walletCorrectionActivityId && typeof deleteWalletTransaction === "function") {\n        try { await deleteWalletTransaction(walletCorrectionActivityId); }\n        catch (rollbackError) {\n          rollbackFailures.push("wallet correction activity");\n          console.error("Failed to remove wallet correction activity:", rollbackError);\n        }\n      }\n      if (walletAdjustedDirectly && typeof updateWallet === "function") {\n        try {\n          await updateWallet(selectedWalletId, {\n            balance: currentWalletBalance,\n            last_balance_correction_source: "savings_wallet_reconciliation_rollback",\n            lastBalanceCorrectionSource: "savings_wallet_reconciliation_rollback",\n            syncStatus: "local_only",\n            source: "local",\n          });\n        } catch (rollbackError) {\n          rollbackFailures.push("wallet balance");\n          console.error("Failed to roll back wallet balance correction:", rollbackError);\n        }\n      }\n      if (rollbackFailures.length > 0) {\n        const repairError = new Error("Reconciliation stopped, but automatic rollback did not fully finish. Check this wallet and Savings Goal before making another change.");\n        repairError.repairRequired = true;\n        repairError.rollbackFailures = rollbackFailures;\n        repairError.originalError = error;\n        throw repairError;\n      }\n      throw error;\n    }`,
  "visible rollback repair state",
);
savings = replaceOnce(
  savings,
  `  const [reconciliationReason, setReconciliationReason] = useState("");\n  const [reconciliationError, setReconciliationError] = useState("");`,
  `  const [reconciliationReason, setReconciliationReason] = useState("");\n  const [reconciliationError, setReconciliationError] = useState("");\n  const [reconciliationRepairRequired, setReconciliationRepairRequired] = useState(false);`,
  "reconciliation repair UI state",
);
savings = replaceOnce(
  savings,
  `  const reconciliationSpendableAfter = Math.max(\n    reconciliationPreview.walletAfter - reconciliationProtectionBase - reconciliationPreview.savedAfter,\n    0,\n  );`,
  `  const reconciliationSpendableAfter = Math.max(\n    reconciliationPreview.walletAfter - reconciliationProtectionBase - reconciliationPreview.savedAfter,\n    0,\n  );\n  const reconciliationBothValuesMissing = reconciliationMode === "both" && (\n    !String(reconciliationActualWalletBalance ?? "").trim() ||\n    !String(reconciliationActualSavedBalance ?? "").trim()\n  );\n  const reconciliationReducesMoney =\n    toMinorUnits(reconciliationPreview.walletAfter) < toMinorUnits(reconciliationWalletBalance) ||\n    toMinorUnits(reconciliationPreview.savedAfter) < toMinorUnits(saved);`,
  "reconciliation UI guards",
);
savings = replaceOnce(
  savings,
  `    setReconciliationReason("");\n    setReconciliationError("");\n    setReconciliationOpen(true);`,
  `    setReconciliationReason("");\n    setReconciliationError("");\n    setReconciliationRepairRequired(false);\n    setReconciliationOpen(true);`,
  "reset repair warning",
);
savings = replaceOnce(
  savings,
  `      setSavingAmount(true);\n      setReconciliationError("");\n      await onReconcileSavingsWallet(goal, {`,
  `      setSavingAmount(true);\n      setReconciliationError("");\n      setReconciliationRepairRequired(false);\n      await onReconcileSavingsWallet(goal, {`,
  "clear repair warning before submit",
);
savings = replaceOnce(
  savings,
  `      console.error("Failed to reconcile savings and wallet:", error);\n      setReconciliationError(error?.message || "CLARA could not reconcile these balances yet. Try again.");`,
  `      console.error("Failed to reconcile savings and wallet:", error);\n      setReconciliationRepairRequired(Boolean(error?.repairRequired));\n      setReconciliationError(error?.message || "CLARA could not reconcile these balances yet. Try again.");`,
  "surface repair warning",
);
savings = replaceOnce(
  savings,
  `{reconciliationMode === "both" ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><FormInput label="Actual wallet balance"><Input type="number" className={inputDarkClass} value={reconciliationActualWalletBalance} onChange={(event) => { setReconciliationActualWalletBalance(event.target.value); setReconciliationError(""); }} /></FormInput><FormInput label="Actual saved amount"><Input type="number" className={inputDarkClass} value={reconciliationActualSavedBalance} onChange={(event) => { setReconciliationActualSavedBalance(event.target.value); setReconciliationError(""); }} /></FormInput></div> : null}`,
  `{reconciliationMode === "both" ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><FormInput label="Actual wallet balance"><Input type="number" min="0" step="0.01" className={inputDarkClass} value={reconciliationActualWalletBalance} onChange={(event) => { setReconciliationActualWalletBalance(event.target.value); setReconciliationError(""); setReconciliationRepairRequired(false); }} /></FormInput><FormInput label="Actual saved amount"><Input type="number" min="0" step="0.01" className={inputDarkClass} value={reconciliationActualSavedBalance} onChange={(event) => { setReconciliationActualSavedBalance(event.target.value); setReconciliationError(""); setReconciliationRepairRequired(false); }} /></FormInput></div> : null}`,
  "explicit balance fields",
);
savings = replaceOnce(
  savings,
  `              </div>\n              <FormInput label="Reason"><Textarea`,
  `              </div>\n              {reconciliationReducesMoney ? <div className="rounded-2xl border border-amber-300/20 bg-amber-400/[0.09] p-3 text-xs font-semibold leading-5 text-amber-50">This correction reduces a recorded wallet or savings balance. Review the before-and-after amounts carefully before confirming.</div> : null}\n              <FormInput label="Reason"><Textarea`,
  "downward correction warning",
);
savings = replaceOnce(
  savings,
  `              {reconciliationError ? <div role="alert" className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{reconciliationError}</div> : null}`,
  `              {reconciliationRepairRequired ? <div role="alert" className="rounded-2xl border border-red-300/30 bg-red-500/[0.13] px-4 py-3 text-sm font-bold leading-6 text-red-50">Automatic rollback did not fully finish. Do not repeat the correction yet. Compare the real wallet balance with CLARA and reopen this reconciliation after the record is reviewed.</div> : null}\n              {reconciliationError ? <div role="alert" className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{reconciliationError}</div> : null}`,
  "repair-required alert",
);
savings = replaceOnce(
  savings,
  `disabled={savingAmount || !reconciliationWalletId}`,
  `disabled={savingAmount || !reconciliationWalletId || !String(reconciliationReason || "").trim() || reconciliationBothValuesMissing}`,
  "reconciliation submit guard",
);
writeFileSync(savingsPath, savings);

const testPath = "tests/savings-reconciliation-integrity.test.mjs";
writeFileSync(testPath, `import test from "node:test";\nimport assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\n\nconst finance = readFileSync(new URL("../src/hooks/useFinancialData.js", import.meta.url), "utf8");\nconst savings = readFileSync(new URL("../src/pages/SavingsGoalsIntegrated.jsx", import.meta.url), "utf8");\n\ntest("Savings reconciliation corrections do not inflate earned income", () => {\n  assert.match(finance, /NON_EARNED_INCOME_SOURCE_TYPES/);\n  assert.match(finance, /historical_wallet_correction/);\n  assert.match(finance, /safeWalletTransactions\\.filter\\(isEarnedIncomeTransaction\\)/);\n  assert.match(finance, /safeIncomes\\.reduce/);\n});\n\ntest("Savings reconciliation requires explicit real balances", () => {\n  assert.match(savings, /Enter both the actual wallet balance and the actual saved amount/);\n  assert.match(savings, /reconciliationBothValuesMissing/);\n  assert.match(savings, /min="0" step="0\\.01"/);\n});\n\ntest("downward wallet corrections create auditable neutral activity", () => {\n  assert.match(savings, /type: "balance_correction"/);\n  assert.match(savings, /insertWalletTransaction/);\n  assert.match(savings, /previous_balance/);\n  assert.match(savings, /next_balance/);\n});\n\ntest("rollback failures surface a repair-required state", () => {\n  assert.match(savings, /repairError\\.repairRequired = true/);\n  assert.match(savings, /Automatic rollback did not fully finish/);\n  assert.match(savings, /reconciliationRepairRequired/);\n});\n`);

const packagePath = "package.json";
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
const parts = String(pkg.scripts?.test || "").split(/\s+/).filter(Boolean);
if (!parts.includes(testPath)) parts.push(testPath);
pkg.scripts.test = parts.join(" ");
writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");

const triggerPath = ".savings-reconciliation-integrity-request";
if (existsSync(triggerPath)) unlinkSync(triggerPath);
if (existsSync(new URL(import.meta.url))) unlinkSync(new URL(import.meta.url));
