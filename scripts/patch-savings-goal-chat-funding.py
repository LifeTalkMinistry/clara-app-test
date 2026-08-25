from pathlib import Path

p = Path('src/components/fresh/main-dashboard/assistant/ClaraSavingsGoalOverlay.jsx')
s = p.read_text()
marker = 'data-clara-savings-goal-fund-actions="true"'
if marker in s:
    print('Already patched')
    raise SystemExit(0)

old = '''function isActiveWallet(wallet) {
  return Boolean(wallet && getWalletId(wallet) && !wallet?.deletedAt && !wallet?.deleted_at && !wallet?.is_archived);
}
'''
new = '''function isActiveWallet(wallet) {
  return Boolean(wallet && getWalletId(wallet) && !wallet?.deletedAt && !wallet?.deleted_at && !wallet?.is_archived);
}

function isMoneyLentWallet(wallet = {}) {
  const type = clean(wallet?.type || wallet?.wallet_type || wallet?.walletType).toLowerCase().replace(/-/g, "_");
  return ["money_lent", "lent", "receivable"].includes(type);
}

function getGoalId(goal = {}) {
  return String(goal?.id || goal?.goal_id || goal?.goalId || "").trim();
}

function getGoalTitle(goal = {}) {
  return clean(goal?.title || goal?.name || goal?.label || "Savings Goal") || "Savings Goal";
}

function getGoalTargetAmount(goal = {}) {
  return toNumber(goal?.target_amount ?? goal?.targetAmount ?? goal?.target ?? goal?.amount_target ?? 0);
}

function getGoalActivity(goal = {}) {
  const rows = goal?.savingsActivityLog || goal?.savings_activity_log || goal?.activityLog || goal?.activity_log || [];
  return Array.isArray(rows) ? rows.filter(Boolean) : [];
}
'''
if old not in s:
    raise SystemExit('helper anchor not found')
s = s.replace(old, new, 1)

old = '''  const activeWallets = useMemo(
    () => sourceWallets.filter(isActiveWallet).map((wallet) => ({
      ...wallet,
      id: getWalletId(wallet),
      name: getWalletName(wallet),
      balance: getWalletBalance(wallet),
    })),
    [sourceWallets]
  );
'''
new = old + '''
  const realWallets = useMemo(
    () => activeWallets.filter((wallet) => !isMoneyLentWallet(wallet)),
    [activeWallets]
  );

  const activeGoals = useMemo(
    () => sourceGoals
      .filter((goal) => goal && !goal?.deletedAt && !goal?.deleted_at && !goal?.is_archived)
      .map((goal) => ({ ...goal, id: getGoalId(goal) }))
      .filter((goal) => goal.id),
    [sourceGoals]
  );
'''
if old not in s:
    raise SystemExit('wallet anchor not found')
s = s.replace(old, new, 1)

old = '''  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
'''
new = old + '''  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [fundWalletId, setFundWalletId] = useState("");
  const [fundAmountInput, setFundAmountInput] = useState("");
  const [outWalletId, setOutWalletId] = useState("");
  const [outAmountInput, setOutAmountInput] = useState("");
'''
if old not in s:
    raise SystemExit('state anchor not found')
s = s.replace(old, new, 1)

old = '''  const selectedWallet = activeWallets.find((wallet) => wallet.id === walletId) || null;
  const subcategoryOptions = category && CATEGORIES[category] ? CATEGORIES[category] : [];
'''
new = '''  const selectedWallet = activeWallets.find((wallet) => wallet.id === walletId) || null;
  const selectedManagedGoal = activeGoals.find((goal) => goal.id === selectedGoalId) || null;
  const subcategoryOptions = category && CATEGORIES[category] ? CATEGORIES[category] : [];
'''
if old not in s:
    raise SystemExit('selected wallet anchor not found')
s = s.replace(old, new, 1)

anchor = '''  useEffect(() => {
    const viewport = viewportRef.current;
'''
inject = '''  useEffect(() => {
    if (!isActive || phase !== "title" || !activeGoals.length || title || titleInput) return;
    setMessages([
      { role: "assistant", text: `Savings Goals is open, ${firstName}.` },
      { role: "assistant", text: "You can create a new goal or manage money in one you already have." },
    ]);
    setPhase("home");
  }, [activeGoals.length, firstName, isActive, phase, title, titleInput]);

  useEffect(() => {
    const viewport = viewportRef.current;
'''
if anchor not in s:
    raise SystemExit('effect anchor not found')
s = s.replace(anchor, inject, 1)

anchor = '''  const askTarget = (userText) => {
'''
handlers = '''  const openGoalHome = () => {
    setSelectedGoalId("");
    setFundWalletId("");
    setFundAmountInput("");
    setOutWalletId("");
    setOutAmountInput("");
    setError("");
    setMessages([
      { role: "assistant", text: `Savings Goals is open, ${firstName}.` },
      { role: "assistant", text: activeGoals.length ? "Choose an existing goal to manage its money, or create a new one." : "You do not have a Savings Goal yet. Create one when you are ready." },
    ]);
    setPhase(activeGoals.length ? "home" : "title");
  };

  const chooseManagedGoal = (goal) => {
    setSelectedGoalId(goal.id);
    setFundWalletId("");
    setFundAmountInput("");
    setOutWalletId("");
    setOutAmountInput("");
    setError("");
    appendExchange(
      getGoalTitle(goal),
      `${getGoalTitle(goal)} has ${fmt(getGoalSavedAmount(goal))} saved toward ${fmt(getGoalTargetAmount(goal))}. What do you want to do?`
    );
    setPhase("manage-goal");
  };

  const startCreateGoal = () => {
    setMessages([
      { role: "assistant", text: greeting },
      { role: "assistant", text: "Choose one real-life target first. Give the money a name, a reason, and a finish line." },
    ]);
    setSelectedGoalId("");
    setError("");
    setPhase("title");
  };

  const startAddFund = () => {
    if (!selectedManagedGoal) return;
    if (getGoalSavedAmount(selectedManagedGoal) >= getGoalTargetAmount(selectedManagedGoal)) {
      setError("This goal is already fully funded.");
      return;
    }
    if (!realWallets.length) {
      setError("Create or fund a real wallet first before adding money to this goal.");
      return;
    }
    setFundWalletId("");
    setFundAmountInput("");
    setError("");
    appendExchange("Add Fund", "Where should I get the money from?");
    setPhase("fund-wallet");
  };

  const chooseFundWallet = (wallet) => {
    const available = Math.max(toNumber(walletAvailableBalances[wallet.id]), 0);
    if (available <= 0) {
      setError(`${wallet.name} has no unprotected money available to move.`);
      return;
    }
    setFundWalletId(wallet.id);
    setFundAmountInput("");
    setError("");
    appendExchange(`${wallet.name} · Available ${fmt(available)}`, `How much should I add to ${getGoalTitle(selectedManagedGoal)}?`);
    setPhase("fund-amount");
  };

  const submitAddFund = async () => {
    if (saving || !selectedManagedGoal) return;
    const amount = toNumber(fundAmountInput);
    const sourceWallet = realWallets.find((wallet) => wallet.id === fundWalletId) || null;
    if (!sourceWallet || amount <= 0) return setError("Choose a wallet and enter a valid amount.");
    const currentSaved = Math.max(getGoalSavedAmount(selectedManagedGoal), 0);
    const target = Math.max(getGoalTargetAmount(selectedManagedGoal), 0);
    const remaining = Math.max(target - currentSaved, 0);
    if (remaining <= 0) return setError("This goal is already fully funded.");
    if (amount > remaining + 0.0001) return setError(`You only need ${fmt(remaining)} more to complete this goal.`);
    const available = Math.max(toNumber(walletAvailableBalances[sourceWallet.id]), 0);
    if (amount > available + 0.0001) return setError(`${sourceWallet.name} only has ${fmt(available)} of unprotected money available.`);
    if (typeof finance?.updateSavingsGoal !== "function") return setError("Savings Goal funding is not available yet.");

    const assignedWalletId = getWalletId({ id: selectedManagedGoal?.wallet_id || selectedManagedGoal?.walletId || "" });
    const storageWallet = assignedWalletId ? realWallets.find((wallet) => wallet.id === assignedWalletId) || null : sourceWallet;
    if (!storageWallet) return setError("The wallet holding this savings is unavailable. Choose a valid saved-in wallet first.");

    const now = new Date().toISOString();
    const activityId = `savings_chat_add_${Date.now()}`;
    const shouldMove = sourceWallet.id !== storageWallet.id;
    let moved = false;
    try {
      setSaving(true);
      setError("");
      if (shouldMove) {
        if (typeof finance?.transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await finance.transferBetweenWallets({
          id: activityId,
          transfer_group_id: activityId,
          from_wallet_id: sourceWallet.id,
          to_wallet_id: storageWallet.id,
          amount,
          notes: `Savings goal funding: ${getGoalTitle(selectedManagedGoal)}.`,
          source_type: "savings_goal_funding",
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        });
        moved = true;
      }
      const nextSaved = Math.min(currentSaved + amount, target);
      const activity = [{
        id: activityId,
        type: "add",
        title: "Savings added",
        amount,
        sourceWalletId: sourceWallet.id,
        source_wallet_id: sourceWallet.id,
        sourceWalletName: sourceWallet.name,
        source_wallet_name: sourceWallet.name,
        storageWalletId: storageWallet.id,
        storage_wallet_id: storageWallet.id,
        storageWalletName: storageWallet.name,
        storage_wallet_name: storageWallet.name,
        note: shouldMove ? `Moved from ${sourceWallet.name} to ${storageWallet.name}` : `Protected in ${storageWallet.name}`,
        createdAt: now,
        created_at: now,
      }, ...getGoalActivity(selectedManagedGoal)].slice(0, 80);
      const updatedGoal = {
        ...selectedManagedGoal,
        wallet_id: storageWallet.id,
        walletId: storageWallet.id,
        saved_amount: nextSaved,
        savedAmount: nextSaved,
        current_amount: nextSaved,
        currentAmount: nextSaved,
        savingsActivityLog: activity,
        savings_activity_log: activity,
        activityLog: activity,
        activity_log: activity,
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      };
      await finance.updateSavingsGoal(selectedManagedGoal.id, updatedGoal);
      await finance.refreshData?.();
      setFundAmountInput("");
      appendExchange(fmt(amount), `Done. ${fmt(amount)} is now protected for ${getGoalTitle(updatedGoal)}. Saved: ${fmt(nextSaved)} of ${fmt(target)}.`);
      setPhase("manage-goal");
    } catch (nextError) {
      if (moved && typeof finance?.transferBetweenWallets === "function") {
        try {
          await finance.transferBetweenWallets({
            from_wallet_id: storageWallet.id,
            to_wallet_id: sourceWallet.id,
            amount,
            notes: "Savings goal funding rollback after goal update failed.",
            source_type: "savings_goal_funding_rollback",
            user_id: user?.id || null,
            user_email: user?.email || null,
            created_by: user?.email || null,
          });
        } catch (rollbackError) { console.error("Savings funding rollback failed:", rollbackError); }
      }
      setError(nextError?.message || "CLARA could not add this savings yet.");
    } finally { setSaving(false); }
  };

  const startMoveFundOut = () => {
    if (!selectedManagedGoal) return;
    if (getGoalSavedAmount(selectedManagedGoal) <= 0) return setError("There is no saved money to move out of this goal.");
    if (!realWallets.length) return setError("No real wallet is available to receive this money.");
    setOutWalletId("");
    setOutAmountInput("");
    setError("");
    appendExchange("Move Fund Out", "Which wallet should receive the released savings?");
    setPhase("out-wallet");
  };

  const chooseOutWallet = (wallet) => {
    setOutWalletId(wallet.id);
    setOutAmountInput("");
    setError("");
    appendExchange(wallet.name, `How much should I move out of ${getGoalTitle(selectedManagedGoal)}?`);
    setPhase("out-amount");
  };

  const submitMoveFundOut = async () => {
    if (saving || !selectedManagedGoal) return;
    const amount = toNumber(outAmountInput);
    const destinationWallet = realWallets.find((wallet) => wallet.id === outWalletId) || null;
    const currentSaved = Math.max(getGoalSavedAmount(selectedManagedGoal), 0);
    if (!destinationWallet || amount <= 0) return setError("Choose a destination wallet and enter a valid amount.");
    if (amount > currentSaved + 0.0001) return setError(`Only ${fmt(currentSaved)} is currently saved in this goal.`);
    if (typeof finance?.updateSavingsGoal !== "function") return setError("Savings Goal release is not available yet.");

    const storageWalletId = getWalletId({ id: selectedManagedGoal?.wallet_id || selectedManagedGoal?.walletId || "" });
    const storageWallet = realWallets.find((wallet) => wallet.id === storageWalletId) || null;
    if (!storageWallet) return setError("The wallet holding this savings is unavailable.");
    if (getWalletBalance(storageWallet) + 0.0001 < amount) return setError(`${storageWallet.name} no longer contains enough money to release ${fmt(amount)}.`);

    const now = new Date().toISOString();
    const activityId = `savings_chat_release_${Date.now()}`;
    const shouldMove = storageWallet.id !== destinationWallet.id;
    let moved = false;
    try {
      setSaving(true);
      setError("");
      if (shouldMove) {
        if (typeof finance?.transferBetweenWallets !== "function") throw new Error("Wallet transfer is not available yet.");
        await finance.transferBetweenWallets({
          id: activityId,
          transfer_group_id: activityId,
          from_wallet_id: storageWallet.id,
          to_wallet_id: destinationWallet.id,
          amount,
          notes: `Savings released from ${getGoalTitle(selectedManagedGoal)}.`,
          source_type: "savings_goal_release",
          user_id: user?.id || null,
          user_email: user?.email || null,
          created_by: user?.email || null,
        });
        moved = true;
      }
      const nextSaved = Math.max(currentSaved - amount, 0);
      const activity = [{
        id: activityId,
        type: "release",
        title: "Savings released",
        amount,
        destinationWalletId: destinationWallet.id,
        destination_wallet_id: destinationWallet.id,
        destinationWalletName: destinationWallet.name,
        destination_wallet_name: destinationWallet.name,
        storageWalletId: storageWallet.id,
        storage_wallet_id: storageWallet.id,
        note: shouldMove ? `Moved to ${destinationWallet.name}` : `Protection released in ${destinationWallet.name}`,
        createdAt: now,
        created_at: now,
      }, ...getGoalActivity(selectedManagedGoal)].slice(0, 80);
      const updatedGoal = {
        ...selectedManagedGoal,
        saved_amount: nextSaved,
        savedAmount: nextSaved,
        current_amount: nextSaved,
        currentAmount: nextSaved,
        savingsActivityLog: activity,
        savings_activity_log: activity,
        activityLog: activity,
        activity_log: activity,
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      };
      await finance.updateSavingsGoal(selectedManagedGoal.id, updatedGoal);
      await finance.refreshData?.();
      setOutAmountInput("");
      appendExchange(fmt(amount), `Done. ${fmt(amount)} was released from ${getGoalTitle(updatedGoal)} into ${destinationWallet.name}. Remaining saved: ${fmt(nextSaved)}.`);
      setPhase("manage-goal");
    } catch (nextError) {
      if (moved && typeof finance?.transferBetweenWallets === "function") {
        try {
          await finance.transferBetweenWallets({
            from_wallet_id: destinationWallet.id,
            to_wallet_id: storageWallet.id,
            amount,
            notes: "Savings release rollback after goal update failed.",
            source_type: "savings_goal_release_rollback",
            user_id: user?.id || null,
            user_email: user?.email || null,
            created_by: user?.email || null,
          });
        } catch (rollbackError) { console.error("Savings release rollback failed:", rollbackError); }
      }
      setError(nextError?.message || "CLARA could not move this savings yet.");
    } finally { setSaving(false); }
  };

  const askTarget = (userText) => {
'''
if anchor not in s:
    raise SystemExit('handler anchor not found')
s = s.replace(anchor, handlers, 1)

anchor = '''          {phase === "title" ? (
'''
ui = '''          {phase === "home" ? (
            <div className="mt-auto grid gap-2.5 pt-3" data-clara-savings-goal-fund-actions="true">
              <div className="grid gap-2">
                {activeGoals.map((goal) => (
                  <ReplyButton key={goal.id} onClick={() => chooseManagedGoal(goal)}>
                    <span className="block">{getGoalTitle(goal)}</span>
                    <span className="mt-1 block text-[10px] font-semibold text-white/48">Saved {fmt(getGoalSavedAmount(goal))} · Target {fmt(getGoalTargetAmount(goal))}</span>
                  </ReplyButton>
                ))}
              </div>
              <ReplyButton onClick={startCreateGoal} secondary>Create new Savings Goal</ReplyButton>
            </div>
          ) : null}

          {phase === "manage-goal" && selectedManagedGoal ? (
            <div className="mt-auto grid gap-2.5 pt-3" data-clara-savings-goal-fund-actions="true">
              <div className="rounded-[20px] border border-cyan-200/14 bg-cyan-200/[.045] p-3.5">
                <SummaryRow label="Goal" value={getGoalTitle(selectedManagedGoal)} />
                <div className="mt-2"><SummaryRow label="Saved" value={fmt(getGoalSavedAmount(selectedManagedGoal))} accent /></div>
                <div className="mt-2"><SummaryRow label="Target" value={fmt(getGoalTargetAmount(selectedManagedGoal))} /></div>
              </div>
              <ReplyButton onClick={startAddFund} disabled={saving}>Add Fund</ReplyButton>
              <ReplyButton onClick={startMoveFundOut} disabled={saving || getGoalSavedAmount(selectedManagedGoal) <= 0}>Move Fund Out</ReplyButton>
              <ReplyButton onClick={openGoalHome} secondary>Back to Savings Goals</ReplyButton>
            </div>
          ) : null}

          {phase === "fund-wallet" && selectedManagedGoal ? (
            <div className="grid gap-2 pt-1" data-clara-savings-goal-fund-actions="true">
              {realWallets.map((wallet) => {
                const available = Math.max(toNumber(walletAvailableBalances[wallet.id]), 0);
                return (
                  <ReplyButton key={wallet.id} onClick={() => chooseFundWallet(wallet)} disabled={available <= 0}>
                    <span className="block">{wallet.name}</span>
                    <span className="mt-1 block text-[10px] font-semibold text-white/48">Available: {fmt(available)}</span>
                  </ReplyButton>
                );
              })}
              <ReplyButton onClick={() => setPhase("manage-goal")} secondary>Back</ReplyButton>
            </div>
          ) : null}

          {phase === "fund-amount" && selectedManagedGoal ? (
            <div className="mt-auto grid gap-2.5 pt-3" data-clara-savings-goal-fund-actions="true">
              <Composer value={fundAmountInput} onChange={(value) => { setFundAmountInput(cleanMoney(value)); setError(""); }} onSubmit={submitAddFund} placeholder="Amount to add" inputMode="decimal" />
              <ReplyButton onClick={() => setPhase("fund-wallet")} secondary>Choose another wallet</ReplyButton>
            </div>
          ) : null}

          {phase === "out-wallet" && selectedManagedGoal ? (
            <div className="grid gap-2 pt-1" data-clara-savings-goal-fund-actions="true">
              {realWallets.map((wallet) => (
                <ReplyButton key={wallet.id} onClick={() => chooseOutWallet(wallet)}>
                  <span className="block">{wallet.name}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-white/48">Current balance: {fmt(getWalletBalance(wallet))}</span>
                </ReplyButton>
              ))}
              <ReplyButton onClick={() => setPhase("manage-goal")} secondary>Back</ReplyButton>
            </div>
          ) : null}

          {phase === "out-amount" && selectedManagedGoal ? (
            <div className="mt-auto grid gap-2.5 pt-3" data-clara-savings-goal-fund-actions="true">
              <Composer value={outAmountInput} onChange={(value) => { setOutAmountInput(cleanMoney(value)); setError(""); }} onSubmit={submitMoveFundOut} placeholder={`Up to ${fmt(getGoalSavedAmount(selectedManagedGoal))}`} inputMode="decimal" />
              <ReplyButton onClick={() => setPhase("out-wallet")} secondary>Choose another wallet</ReplyButton>
            </div>
          ) : null}

          {phase === "title" ? (
'''
if anchor not in s:
    raise SystemExit('ui anchor not found')
s = s.replace(anchor, ui, 1)

old = '''                <ReplyButton onClick={reset}>Create another goal</ReplyButton>
                <ReplyButton onClick={onClose} secondary>Done</ReplyButton>
'''
new = '''                <ReplyButton onClick={openGoalHome}>Manage Savings Goals</ReplyButton>
                <ReplyButton onClick={reset} secondary>Create another goal</ReplyButton>
                <ReplyButton onClick={onClose} secondary>Done</ReplyButton>
'''
if old not in s:
    raise SystemExit('saved actions anchor not found')
s = s.replace(old, new, 1)

p.write_text(s)
print('Patched Savings Goal chat funding actions')
