const SAVINGS_GOALS_FILE_SUFFIX = "/src/pages/SavingsGoalsIntegrated.jsx";

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  const last = source.lastIndexOf(search);

  if (first < 0) {
    throw new Error(`[savings-wallet-reconciliation] Missing source contract: ${label}`);
  }

  if (first !== last) {
    throw new Error(`[savings-wallet-reconciliation] Ambiguous source contract: ${label}`);
  }

  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function transformGoalDetail(source) {
  const start = source.indexOf("function GoalDetail(");
  const end = source.indexOf("\n\n\nfunction SavingsDeleteConfirmDialog", start);

  if (start < 0 || end < 0) {
    throw new Error("[savings-wallet-reconciliation] GoalDetail boundaries were not found.");
  }

  let detail = source.slice(start, end);

  detail = replaceOnce(
    detail,
    "function GoalDetail({ goal, wallets, walletBalances, walletAvailableBalances, walletCapacity, walletSyncSuggestion, onOpenWalletSyncPrompt, onClose, onEdit, onDelete, onAddSavings, onReleaseSavings, onCorrectSavingsBalance, onUseSavings, totalIncome, fmt }) {",
    "function GoalDetail({ goal, wallets, walletBalances, walletAvailableBalances, walletCapacity, getWalletProtectionBase, walletSyncSuggestion, onOpenWalletSyncPrompt, onClose, onEdit, onDelete, onAddSavings, onReleaseSavings, onCorrectSavingsBalance, onReconcileSavingsWallet, onUseSavings, totalIncome, fmt }) {",
    "GoalDetail reconciliation signature",
  );

  detail = replaceOnce(
    detail,
    '  const [correctionError, setCorrectionError] = useState("");',
    `  const [correctionError, setCorrectionError] = useState("");
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [reconciliationMode, setReconciliationMode] = useState("wallet_correct");
  const [reconciliationWalletId, setReconciliationWalletId] = useState("");
  const [reconciliationActualWalletBalance, setReconciliationActualWalletBalance] = useState("");
  const [reconciliationActualSavedBalance, setReconciliationActualSavedBalance] = useState("");
  const [reconciliationReason, setReconciliationReason] = useState("");
  const [reconciliationError, setReconciliationError] = useState("");`,
    "GoalDetail reconciliation state",
  );

  detail = replaceOnce(
    detail,
    `  const hasBalanceMismatch = Boolean(
    assignedWallet && toMinorUnits(saved) > toMinorUnits(safeWalletCapacity),
  );`,
    `  const hasBalanceMismatch = Boolean(
    assignedWallet && toMinorUnits(saved) > toMinorUnits(safeWalletCapacity),
  );
  const assignedWalletIdValue = walletId(assignedWallet);
  const reconciliationWallet = wallets.find((item) => walletId(item) === String(reconciliationWalletId)) || null;
  const reconciliationWalletBalance = reconciliationWallet
    ? toNumber(walletBalances[walletId(reconciliationWallet)] ?? reconciliationWallet?.balance)
    : 0;
  const reconciliationProtectionBase = reconciliationWallet
    ? Math.max(toNumber(getWalletProtectionBase?.(walletId(reconciliationWallet))), 0)
    : 0;
  const reconciliationCurrentCapacity = Math.max(
    reconciliationWalletBalance - reconciliationProtectionBase,
    0,
  );
  const reconciliationActualWallet = Math.max(
    toNumber(reconciliationActualWalletBalance),
    0,
  );
  const reconciliationActualSaved = Math.max(
    toNumber(reconciliationActualSavedBalance),
    0,
  );
  const reconciliationPreview = reconciliationMode === "wallet_correct"
    ? {
        walletAfter: reconciliationWalletBalance,
        savedAfter: Math.min(saved, reconciliationCurrentCapacity),
      }
    : reconciliationMode === "savings_correct"
      ? {
          walletAfter: Math.max(
            reconciliationWalletBalance,
            reconciliationProtectionBase + saved,
          ),
          savedAfter: saved,
        }
      : {
          walletAfter: reconciliationActualWallet,
          savedAfter: reconciliationActualSaved,
        };
  const reconciliationSpendableAfter = Math.max(
    reconciliationPreview.walletAfter -
      reconciliationProtectionBase -
      reconciliationPreview.savedAfter,
    0,
  );
  const openReconciliation = (mode = hasBalanceMismatch ? "wallet_correct" : "both") => {
    const fallbackWalletId = assignedWalletIdValue || walletId(wallets[0]) || "";
    const fallbackWallet = wallets.find((item) => walletId(item) === fallbackWalletId) || null;
    const fallbackBalance = fallbackWallet
      ? toNumber(walletBalances[fallbackWalletId] ?? fallbackWallet?.balance)
      : 0;
    setReconciliationMode(mode);
    setReconciliationWalletId(fallbackWalletId);
    setReconciliationActualWalletBalance(String(fallbackBalance));
    setReconciliationActualSavedBalance(String(saved));
    setReconciliationReason("");
    setReconciliationError("");
    setReconciliationOpen(true);
  };`,
    "GoalDetail reconciliation preview",
  );

  detail = replaceOnce(
    detail,
    `  const handleSubmitCorrection = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setCorrectionError("");
      await onCorrectSavingsBalance(goal, correctedAmount, correctionReason);
      setCorrectedAmount("");
      setCorrectionReason("");
      setCorrectionOpen(false);
    } catch (error) {
      console.error("Failed to correct savings balance:", error);
      setCorrectionError(error?.message || "CLARA could not correct this savings balance yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };

  return <>`,
    `  const handleSubmitCorrection = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setCorrectionError("");
      await onCorrectSavingsBalance(goal, correctedAmount, correctionReason);
      setCorrectedAmount("");
      setCorrectionReason("");
      setCorrectionOpen(false);
    } catch (error) {
      console.error("Failed to correct savings balance:", error);
      setCorrectionError(error?.message || "CLARA could not correct this savings balance yet. Try again.");
    } finally {
      setSavingAmount(false);
    }
  };

  const handleSubmitReconciliation = async () => {
    if (savingAmount) return;
    try {
      setSavingAmount(true);
      setReconciliationError("");
      await onReconcileSavingsWallet(goal, {
        mode: reconciliationMode,
        walletId: reconciliationWalletId,
        actualWalletBalance: reconciliationActualWalletBalance,
        actualSavedBalance: reconciliationActualSavedBalance,
        reason: reconciliationReason,
      });
      setReconciliationOpen(false);
    } catch (error) {
      console.error("Failed to reconcile savings and wallet:", error);
      setReconciliationError(
        error?.message || "CLARA could not reconcile these balances yet. Try again.",
      );
    } finally {
      setSavingAmount(false);
    }
  };

  return <>`,
    "GoalDetail reconciliation submit",
  );

  detail = replaceOnce(
    detail,
    `<Button type="button" onClick={() => { setCorrectedAmount(String(Math.min(saved, safeWalletCapacity))); setCorrectionReason(""); setCorrectionError(""); setCorrectionOpen(true); }} className="mt-3 h-9 w-full rounded-xl border border-rose-200/20 bg-rose-400/15 text-xs font-bold text-rose-50 hover:bg-rose-400/20">Correct Balance</Button>`,
    `<Button type="button" onClick={() => openReconciliation("wallet_correct")} className="mt-3 h-9 w-full rounded-xl border border-rose-200/20 bg-rose-400/15 text-xs font-bold text-rose-50 hover:bg-rose-400/20">Reconcile Savings & Wallet</Button>`,
    "GoalDetail mismatch reconciliation action",
  );

  const correctButton =
    '<Button type="button" onClick={() => { setCorrectedAmount(String(saved)); setCorrectionReason(""); setCorrectionError(""); setCorrectionOpen(true); }} className="h-10 rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/15">Correct Balance</Button>';

  detail = replaceOnce(
    detail,
    correctButton,
    `${correctButton}<Button type="button" onClick={() => openReconciliation(hasBalanceMismatch ? "wallet_correct" : "both")} className="h-10 rounded-xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15">Reconcile Wallet</Button>`,
    "GoalDetail reconciliation button",
  );

  detail = replaceOnce(
    detail,
    '<span className={entry.type === "use" || entry.type === "release" ? "text-amber-200" : entry.type === "correction" ? "text-sky-200" : "text-green-200"}>{entry.type === "correction" ? `${fmt(entry.previousAmount ?? entry.previous_amount)} → ${fmt(entry.correctedAmount ?? entry.corrected_amount)}` : `${entry.type === "use" || entry.type === "release" ? "-" : "+"}${fmt(entry.amount)}`}</span>',
    '<span className={entry.type === "use" || entry.type === "release" ? "text-amber-200" : entry.type === "correction" ? "text-sky-200" : entry.type === "reconciliation" ? "text-cyan-200" : "text-green-200"}>{entry.type === "reconciliation" ? `Savings ${fmt(entry.savedBalanceBefore ?? entry.saved_balance_before)} → ${fmt(entry.savedBalanceAfter ?? entry.saved_balance_after)}` : entry.type === "correction" ? `${fmt(entry.previousAmount ?? entry.previous_amount)} → ${fmt(entry.correctedAmount ?? entry.corrected_amount)}` : `${entry.type === "use" || entry.type === "release" ? "-" : "+"}${fmt(entry.amount)}`}</span>',
    "GoalDetail reconciliation activity amount",
  );

  detail = replaceOnce(
    detail,
    "\n  </>;",
    `
    <Dialog open={reconciliationOpen} onOpenChange={(value) => { if (!savingAmount) { setReconciliationOpen(value); if (!value) setReconciliationError(""); } }}><DialogContent className={formDialogClass}><div className="flex max-h-[inherit] flex-col"><DialogHeader className="border-b border-white/10 px-4 sm:px-5 py-4 pr-12"><DialogTitle className="text-white text-xl sm:text-2xl leading-tight">Reconcile Savings & Wallet</DialogTitle><p className="mt-1 text-xs text-white/50">Choose which record reflects your real money.</p></DialogHeader><div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5"><div className="space-y-4"><FormInput label="Assigned wallet"><Select value={reconciliationWalletId} onValueChange={(value) => { const selected = wallets.find((item) => walletId(item) === String(value)); setReconciliationWalletId(value); setReconciliationActualWalletBalance(String(selected ? toNumber(walletBalances[walletId(selected)] ?? selected?.balance) : 0)); setReconciliationError(""); }}><SelectTrigger className={selectDarkTriggerClass}><SelectValue placeholder="Choose wallet" /></SelectTrigger><SelectContent>{wallets.map((item) => <SelectItem key={walletId(item)} value={walletId(item)}>{walletName(item)} • {fmt(walletBalances[walletId(item)] ?? item?.balance)}</SelectItem>)}</SelectContent></Select></FormInput>{reconciliationWalletId && assignedWalletIdValue && reconciliationWalletId !== assignedWalletIdValue ? <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] p-3 text-xs leading-5 text-cyan-50/75">CLARA will correct the goal's assigned-wallet record. It will not transfer money out of the old wallet.</div> : null}<div className="space-y-2"><p className={labelDarkClass}>Which record is correct?</p><Button type="button" onClick={() => { setReconciliationMode("wallet_correct"); setReconciliationError(""); }} className={\`h-auto w-full justify-start rounded-2xl border px-4 py-3 text-left \${reconciliationMode === "wallet_correct" ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-50" : "border-white/10 bg-white/[0.04] text-white/75"}\`}><span><span className="block text-sm font-bold">The wallet balance is correct</span><span className="mt-1 block text-xs font-normal opacity-70">Reduce protected savings to what this wallet can support.</span></span></Button><Button type="button" onClick={() => { setReconciliationMode("savings_correct"); setReconciliationError(""); }} className={\`h-auto w-full justify-start rounded-2xl border px-4 py-3 text-left \${reconciliationMode === "savings_correct" ? "border-green-300/35 bg-green-400/15 text-green-50" : "border-white/10 bg-white/[0.04] text-white/75"}\`}><span><span className="block text-sm font-bold">The savings amount is correct</span><span className="mt-1 block text-xs font-normal opacity-70">Add the missing historical wallet amount and keep the savings.</span></span></Button><Button type="button" onClick={() => { setReconciliationMode("both"); setReconciliationActualWalletBalance(String(reconciliationWalletBalance)); setReconciliationActualSavedBalance(String(saved)); setReconciliationError(""); }} className={\`h-auto w-full justify-start rounded-2xl border px-4 py-3 text-left \${reconciliationMode === "both" ? "border-violet-300/35 bg-violet-400/15 text-violet-50" : "border-white/10 bg-white/[0.04] text-white/75"}\`}><span><span className="block text-sm font-bold">Both records need correction</span><span className="mt-1 block text-xs font-normal opacity-70">Enter the real wallet and savings balances yourself.</span></span></Button></div>{reconciliationMode === "both" ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><FormInput label="Actual wallet balance"><Input type="number" className={inputDarkClass} value={reconciliationActualWalletBalance} onChange={(event) => { setReconciliationActualWalletBalance(event.target.value); setReconciliationError(""); }} /></FormInput><FormInput label="Actual saved amount"><Input type="number" className={inputDarkClass} value={reconciliationActualSavedBalance} onChange={(event) => { setReconciliationActualSavedBalance(event.target.value); setReconciliationError(""); }} /></FormInput></div> : null}<div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"><p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/45">Correction preview</p><div className="mt-3 grid grid-cols-2 gap-3"><InfoMini label="Wallet" value={\`\${fmt(reconciliationWalletBalance)} → \${fmt(reconciliationPreview.walletAfter)}\`} /><InfoMini label="Protected savings" value={\`\${fmt(saved)} → \${fmt(reconciliationPreview.savedAfter)}\`} /><InfoMini label="Spendable after" value={fmt(reconciliationSpendableAfter)} /><InfoMini label="Other protection" value={fmt(reconciliationProtectionBase)} /></div></div><FormInput label="Reason"><Textarea className="min-h-[84px] rounded-xl border-white/10 bg-[#0b1a2f] text-white placeholder:text-white/35" placeholder="Example: This money existed in Maya but the previous app bug did not record it." value={reconciliationReason} onChange={(event) => { setReconciliationReason(event.target.value); setReconciliationError(""); }} /></FormInput>{reconciliationError ? <div role="alert" className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{reconciliationError}</div> : null}<div className="rounded-2xl border border-amber-300/15 bg-amber-400/[0.07] p-3 text-xs leading-5 text-amber-50/75">Only choose “The savings amount is correct” when that money truly exists in the real wallet. CLARA will create a historical wallet correction for the missing amount.</div></div></div><div className="border-t border-white/10 bg-[#061224]/96 px-4 py-3 sm:px-5"><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" onClick={() => setReconciliationOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80">Cancel</Button><Button type="button" onClick={handleSubmitReconciliation} disabled={savingAmount || !reconciliationWalletId} className="h-10 rounded-xl bg-cyan-500 px-4 font-semibold text-[#041226] hover:bg-cyan-400 disabled:opacity-50">{savingAmount ? "Reconciling..." : "Confirm Reconciliation"}</Button></div></div></div></DialogContent></Dialog>
  </>;`,
    "GoalDetail reconciliation dialog",
  );

  return source.slice(0, start) + detail + source.slice(end);
}

export function transformSavingsGoalWalletReconciliation(input) {
  let source = input;

  source = replaceOnce(
    source,
    `    transferBetweenWallets,
  } = data || {};`,
    `    transferBetweenWallets,
    addMoney,
    updateWallet,
    deleteWalletTransaction,
  } = data || {};`,
    "Savings page reconciliation data actions",
  );

  source = replaceOnce(
    source,
    "  const handleUseSavings = async (goal, amount, reason) => {",
    `  const getGoalWalletProtectionBase = (rawGoal, rawWalletId) => {
    const goal = normalizeGoal(rawGoal);
    const targetWalletId = walletId(rawWalletId);
    if (!targetWalletId) return 0;
    const wallet = activeWallets.find((item) => walletId(item) === targetWalletId);
    if (!wallet) return 0;
    const rawBalance = Math.max(toNumber(walletBalances[targetWalletId] ?? wallet?.balance), 0);
    const emergencyProtected = Math.min(getWalletEmergencyProtectedAmount(wallet), rawBalance);
    const currentAssignedWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
    const currentSaved = Math.max(getGoalSavedAmount(goal), 0);
    const allSavingsProtected = Math.max(toNumber(protectedSavingsByWallet[targetWalletId]), 0);
    const otherSavingsProtected = Math.max(
      allSavingsProtected - (currentAssignedWalletId === targetWalletId ? currentSaved : 0),
      0,
    );
    return emergencyProtected + otherSavingsProtected;
  };

  const handleReconcileSavingsWallet = async (goal, input = {}) => {
    const mode = String(input?.mode || "").trim();
    const selectedWalletId = walletId(input?.walletId || "");
    const cleanReason = String(input?.reason || "").trim();
    const currentSaved = Math.max(getGoalSavedAmount(goal), 0);
    const target = Math.max(getGoalTargetAmount(goal), 0);
    const previousWalletId = walletId(goal?.wallet_id || goal?.walletId || "");
    const selectedWallet = activeWallets.find((item) => walletId(item) === selectedWalletId) || null;

    if (!["wallet_correct", "savings_correct", "both"].includes(mode)) {
      throw new Error("Choose which balance is correct.");
    }
    if (!selectedWallet) throw new Error("Choose the wallet that actually holds this savings.");
    if (!cleanReason) throw new Error("Explain why this reconciliation is needed.");

    const currentWalletBalance = Math.max(
      toNumber(walletBalances[selectedWalletId] ?? selectedWallet?.balance),
      0,
    );
    const protectionBase = getGoalWalletProtectionBase(goal, selectedWalletId);
    let nextWalletBalance = currentWalletBalance;
    let nextSaved = currentSaved;

    if (mode === "wallet_correct") {
      nextSaved = Math.min(currentSaved, Math.max(currentWalletBalance - protectionBase, 0));
    } else if (mode === "savings_correct") {
      nextWalletBalance = Math.max(currentWalletBalance, protectionBase + currentSaved);
    } else {
      nextWalletBalance = toNumber(input?.actualWalletBalance);
      nextSaved = toNumber(input?.actualSavedBalance);
      if (nextWalletBalance < 0) throw new Error("Actual wallet balance cannot be negative.");
      if (nextSaved < 0) throw new Error("Actual saved amount cannot be negative.");
    }

    if (nextSaved > target) throw new Error("Reconciled savings cannot exceed the goal target.");
    const nextCapacity = Math.max(nextWalletBalance - protectionBase, 0);
    if (nextSaved > nextCapacity) {
      throw new Error(
        "The corrected wallet balance cannot support that saved amount after other protected money.",
      );
    }

    const walletChanged = previousWalletId !== selectedWalletId;
    const walletBalanceChanged =
      toMinorUnits(nextWalletBalance) !== toMinorUnits(currentWalletBalance);
    const savingsChanged = toMinorUnits(nextSaved) !== toMinorUnits(currentSaved);

    if (!walletChanged && !walletBalanceChanged && !savingsChanged) {
      throw new Error("These records already match the selected correction.");
    }

    const now = new Date().toISOString();
    const reconciliationId = `savings_wallet_reconciliation_${Date.now()}`;
    const walletDelta = nextWalletBalance - currentWalletBalance;
    let walletCorrectionTransactionId = "";
    let walletAdjustedDirectly = false;

    try {
      if (walletDelta > 0) {
        if (typeof addMoney !== "function") {
          throw new Error("Historical wallet corrections are not available yet.");
        }
        const correctionResult = await addMoney({
          id: reconciliationId,
          wallet_id: selectedWalletId,
          amount: walletDelta,
          category: "Balance Correction",
          source_type: "savings_wallet_reconciliation",
          tag: "historical_wallet_correction",
          notes: `Historical wallet correction for savings goal "${goal?.title || "Savings Goal"}": ${cleanReason}`,
          created_at: now,
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        });
        walletCorrectionTransactionId = String(
          correctionResult?.walletTransaction?.id || reconciliationId,
        );
      } else if (walletDelta < 0) {
        if (typeof updateWallet !== "function") {
          throw new Error("Wallet balance correction is not available yet.");
        }
        await updateWallet(selectedWalletId, {
          balance: nextWalletBalance,
          last_balance_correction_reason: cleanReason,
          lastBalanceCorrectionReason: cleanReason,
          last_balance_correction_at: now,
          lastBalanceCorrectionAt: now,
          last_balance_correction_source: "savings_wallet_reconciliation",
          lastBalanceCorrectionSource: "savings_wallet_reconciliation",
          syncStatus: "local_only",
          source: "local",
        });
        walletAdjustedDirectly = true;
      }

      const updatedGoal = normalizeGoal({
        ...goal,
        wallet_id: selectedWalletId,
        walletId: selectedWalletId,
        saved_amount: nextSaved,
        current_amount: nextSaved,
        savedAmount: nextSaved,
        currentAmount: nextSaved,
        wallet_sync_prompt_wallet_id: selectedWalletId,
        walletSyncPromptWalletId: selectedWalletId,
        wallet_sync_prompt_decision: "reconciled",
        walletSyncPromptDecision: "reconciled",
        wallet_sync_prompt_updated_at: now,
        walletSyncPromptUpdatedAt: now,
        savingsActivityLog: buildActivity(goal, {
          id: reconciliationId,
          type: "reconciliation",
          title: "Savings and wallet reconciled",
          mode,
          reason: cleanReason,
          amount: Math.max(Math.abs(nextSaved - currentSaved), Math.abs(walletDelta)),
          previousWalletId,
          previous_wallet_id: previousWalletId,
          correctedWalletId: selectedWalletId,
          corrected_wallet_id: selectedWalletId,
          walletBalanceBefore: currentWalletBalance,
          wallet_balance_before: currentWalletBalance,
          walletBalanceAfter: nextWalletBalance,
          wallet_balance_after: nextWalletBalance,
          savedBalanceBefore: currentSaved,
          saved_balance_before: currentSaved,
          savedBalanceAfter: nextSaved,
          saved_balance_after: nextSaved,
          linkedWalletTransactionId: walletCorrectionTransactionId || null,
          linked_wallet_transaction_id: walletCorrectionTransactionId || null,
          note:
            mode === "savings_correct"
              ? "Historical wallet money added and protected savings preserved"
              : mode === "wallet_correct"
                ? "Protected savings reduced to match the real wallet"
                : "Wallet and savings records corrected to the declared real balances",
          createdAt: now,
          created_at: now,
        }),
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      updatedGoal.savings_activity_log = updatedGoal.savingsActivityLog;
      updatedGoal.activityLog = updatedGoal.savingsActivityLog;
      updatedGoal.activity_log = updatedGoal.savingsActivityLog;

      await updateSavingsGoal(goal.id, updatedGoal);
      setDetailGoal(updatedGoal);
      return updatedGoal;
    } catch (error) {
      if (walletCorrectionTransactionId && typeof deleteWalletTransaction === "function") {
        try {
          await deleteWalletTransaction(walletCorrectionTransactionId);
        } catch (rollbackError) {
          console.error("Failed to roll back historical wallet correction:", rollbackError);
        }
      } else if (walletAdjustedDirectly && typeof updateWallet === "function") {
        try {
          await updateWallet(selectedWalletId, {
            balance: currentWalletBalance,
            last_balance_correction_source: "savings_wallet_reconciliation_rollback",
            lastBalanceCorrectionSource: "savings_wallet_reconciliation_rollback",
            syncStatus: "local_only",
            source: "local",
          });
        } catch (rollbackError) {
          console.error("Failed to roll back wallet balance correction:", rollbackError);
        }
      }
      throw error;
    }
  };

  const handleUseSavings = async (goal, amount, reason) => {`,
    "Savings page reconciliation actions",
  );

  source = replaceOnce(
    source,
    '    {detailGoal && <GoalDetail goal={detailGoal} wallets={activeWallets} walletBalances={walletBalances} walletAvailableBalances={walletAvailableBalances} walletCapacity={getGoalWalletCapacity(detailGoal)} walletSyncSuggestion={getWalletBalanceSyncSuggestion(detailGoal)} onOpenWalletSyncPrompt={openWalletSyncPromptForGoal} onClose={() => setDetailGoal(null)} onEdit={openEdit} onDelete={requestDelete} onAddSavings={handleAddSavings} onReleaseSavings={handleReleaseSavings} onCorrectSavingsBalance={handleCorrectSavingsBalance} onUseSavings={handleUseSavings} totalIncome={data?.totalIncome || 0} fmt={fmt} />}',
    '    {detailGoal && <GoalDetail goal={detailGoal} wallets={activeWallets} walletBalances={walletBalances} walletAvailableBalances={walletAvailableBalances} walletCapacity={getGoalWalletCapacity(detailGoal)} getWalletProtectionBase={(walletIdValue) => getGoalWalletProtectionBase(detailGoal, walletIdValue)} walletSyncSuggestion={getWalletBalanceSyncSuggestion(detailGoal)} onOpenWalletSyncPrompt={openWalletSyncPromptForGoal} onClose={() => setDetailGoal(null)} onEdit={openEdit} onDelete={requestDelete} onAddSavings={handleAddSavings} onReleaseSavings={handleReleaseSavings} onCorrectSavingsBalance={handleCorrectSavingsBalance} onReconcileSavingsWallet={handleReconcileSavingsWallet} onUseSavings={handleUseSavings} totalIncome={data?.totalIncome || 0} fmt={fmt} />}',
    "GoalDetail reconciliation props",
  );

  source = transformGoalDetail(source);
  return source;
}

export function savingsGoalWalletReconciliationPlugin() {
  return {
    name: "clara-savings-goal-wallet-reconciliation",
    enforce: "pre",
    transform(code, id) {
      const normalizedId = String(id || "").replaceAll("\\", "/").split("?")[0];
      if (!normalizedId.endsWith(SAVINGS_GOALS_FILE_SUFFIX)) return null;
      return { code: transformSavingsGoalWalletReconciliation(code), map: null };
    },
  };
}
