from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, content):
    Path(path).write_text(content, encoding="utf-8")


def replace_once(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one exact match, found {count}")
    return content.replace(old, new, 1)


def regex_once(content, pattern, replacement, label, flags=0):
    next_content, count = re.subn(pattern, replacement, content, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{label}: expected one regex match, found {count}")
    return next_content


page_path = "src/pages/SavingsGoalsIntegrated.jsx"
page = read(page_path)

page = replace_once(
    page,
    '''  const [walletSyncPrompt, setWalletSyncPrompt] = useState(null);
  const [walletSyncSaving, setWalletSyncSaving] = useState(false);
  const [formError, setFormError] = useState("");
''',
    '''  const [walletSyncPrompt, setWalletSyncPrompt] = useState(null);
  const [walletSyncSaving, setWalletSyncSaving] = useState(false);
  const [walletSyncError, setWalletSyncError] = useState("");
  const [formError, setFormError] = useState("");
''',
    "wallet sync error state",
)

page = replace_once(
    page,
    '''  const openWalletSyncPromptForGoal = (goal) => {
    const suggestion = getWalletBalanceSyncSuggestion(goal);
    if (!suggestion) return;
    setWalletSyncPrompt({
''',
    '''  const openWalletSyncPromptForGoal = (goal) => {
    const suggestion = getWalletBalanceSyncSuggestion(goal);
    if (!suggestion) return;
    setWalletSyncError("");
    setWalletSyncPrompt({
''',
    "wallet sync open reset",
)

page = page.replace("Reduce Already Saved to $0 before changing wallets.", "Reduce Already Saved to ₱0 before changing wallets.")

new_dismiss = r'''  const handleDismissWalletBalanceSync = async () => {
    if (!walletSyncPrompt || walletSyncSaving) return;
    const promptGoal = normalizeGoal(walletSyncPrompt.goal);
    const goal = goals.find((item) => String(item.id) === String(promptGoal.id)) || promptGoal;
    const handledWalletId = walletId(walletSyncPrompt.wallet || goal.wallet_id || goal.walletId || "");
    if (!handledWalletId) {
      setWalletSyncPrompt(null);
      setWalletSyncError("");
      return;
    }

    try {
      setWalletSyncSaving(true);
      setWalletSyncError("");
      const now = new Date().toISOString();
      const updatedGoal = normalizeGoal({
        ...goal,
        wallet_sync_prompt_wallet_id: handledWalletId,
        walletSyncPromptWalletId: handledWalletId,
        wallet_sync_prompt_decision: "dismissed",
        walletSyncPromptDecision: "dismissed",
        wallet_sync_prompt_updated_at: now,
        walletSyncPromptUpdatedAt: now,
        updated_date: now,
        updatedAt: now,
        syncStatus: "local_only",
        source: "local",
      });
      await updateSavingsGoal(goal.id, updatedGoal);
      setDetailGoal(updatedGoal);
      setWalletSyncPrompt(null);
    } catch (error) {
      console.error("Failed to remember wallet savings prompt decision:", error);
      setWalletSyncError(error?.message || "CLARA could not save this choice yet. Try again.");
    } finally {
      setWalletSyncSaving(false);
    }
  };

'''
page = regex_once(
    page,
    r"  const handleDismissWalletBalanceSync = async \(\) => \{.*?\n  \};\n\n  const handleConfirmWalletBalanceSync",
    new_dismiss + "  const handleConfirmWalletBalanceSync",
    "wallet sync dismiss flow",
    flags=re.S,
)

new_confirm = r'''  const handleConfirmWalletBalanceSync = async () => {
    if (!walletSyncPrompt || walletSyncSaving) return;

    const promptGoal = normalizeGoal(walletSyncPrompt.goal);
    const goal = goals.find((item) => String(item.id) === String(promptGoal.id)) || promptGoal;
    const promptWalletId = walletId(walletSyncPrompt.wallet || goal.wallet_id || goal.walletId || "");

    // Protect against a stale or duplicated prompt adding the same wallet balance twice.
    if (promptWalletId && getWalletSyncHandledWalletId(goal) === promptWalletId) {
      setWalletSyncPrompt(null);
      setWalletSyncError("");
      return;
    }

    const suggestion = getWalletBalanceSyncSuggestion(goal);
    if (!suggestion) {
      setWalletSyncPrompt(null);
      setWalletSyncError("");
      return;
    }

    const amount = Math.min(toNumber(walletSyncPrompt.amount), toNumber(suggestion.suggestedAmount));
    if (amount <= 0) {
      setWalletSyncPrompt(null);
      setWalletSyncError("");
      return;
    }

    try {
      setWalletSyncSaving(true);
      setWalletSyncError("");
      const now = new Date().toISOString();
      const currentSaved = toNumber(goal.saved_amount);
      const target = toNumber(goal.target_amount);
      const nextSaved = Math.min(currentSaved + amount, target);
      const wallet = suggestion.wallet;
      const handledWalletId = walletId(wallet);
      const updatedGoal = normalizeGoal({
        ...goal,
        saved_amount: nextSaved,
        current_amount: nextSaved,
        savedAmount: nextSaved,
        currentAmount: nextSaved,
        wallet_sync_prompt_wallet_id: handledWalletId,
        walletSyncPromptWalletId: handledWalletId,
        wallet_sync_prompt_decision: "accepted",
        walletSyncPromptDecision: "accepted",
        wallet_sync_prompt_updated_at: now,
        walletSyncPromptUpdatedAt: now,
        savingsActivityLog: buildActivity(goal, {
          id: `savings_wallet_sync_${Date.now()}`,
          type: "wallet_sync",
          title: "Wallet balance marked as savings",
          amount,
          storageWalletId: handledWalletId,
          storage_wallet_id: handledWalletId,
          storageWalletName: walletName(wallet),
          storage_wallet_name: walletName(wallet),
          note: `Marked existing ${walletName(wallet)} balance as protected savings`,
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
      setWalletSyncPrompt(null);
    } catch (error) {
      console.error("Failed to sync wallet balance to savings goal:", error);
      setWalletSyncError(error?.message || "CLARA could not mark this wallet money as saved yet. Try again.");
    } finally {
      setWalletSyncSaving(false);
    }
  };

'''
page = regex_once(
    page,
    r"  const handleConfirmWalletBalanceSync = async \(\) => \{.*?\n  \};\n\n  const handleAddSavings",
    new_confirm + "  const handleAddSavings",
    "wallet sync confirm flow",
    flags=re.S,
)

page = replace_once(
    page,
    '''<PageHeader title="Savings Goals" subtitle="Plan and track what matters most" action={<Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" />New Goal</Button>} />''',
    '''<PageHeader title="Savings Goals" subtitle="Plan and track what matters most" action={<Button size="sm" onClick={() => openAdd()}><Plus className="w-4 h-4 mr-1" />New Goal</Button>} />''',
    "new goal click ownership",
)

page = replace_once(
    page,
    '''<WalletBalanceSyncPrompt prompt={walletSyncPrompt} fmt={fmt} saving={walletSyncSaving} onCancel={handleDismissWalletBalanceSync} onConfirm={handleConfirmWalletBalanceSync} />''',
    '''<WalletBalanceSyncPrompt prompt={walletSyncPrompt} fmt={fmt} saving={walletSyncSaving} error={walletSyncError} onCancel={handleDismissWalletBalanceSync} onConfirm={handleConfirmWalletBalanceSync} />''',
    "wallet sync error wiring",
)

page = replace_once(
    page,
    '''function WalletBalanceSyncPrompt({ prompt, fmt, saving, onCancel, onConfirm }) {''',
    '''function WalletBalanceSyncPrompt({ prompt, fmt, saving, error, onCancel, onConfirm }) {''',
    "wallet sync error prop",
)
page = replace_once(
    page,
    '''<p className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-white/55">This will not move money or create a transaction. It only protects the existing wallet balance for this goal. CLARA will only ask again if you change the saved-in wallet.</p></div></div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl">''',
    '''<p className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-xs leading-5 text-white/55">This will not move money or create a transaction. It only protects the existing wallet balance for this goal. CLARA will only ask again if you change the saved-in wallet.</p>{error ? <div className="rounded-2xl border border-rose-300/18 bg-rose-400/[0.08] px-4 py-3 text-sm font-semibold text-rose-100">{error}</div> : null}</div></div><div className="border-t border-white/10 bg-[#041226]/96 px-4 sm:px-5 py-3 backdrop-blur-xl">''',
    "wallet sync visible error",
)

page = replace_once(
    page,
    '''<p className="text-white/45 text-[11px] uppercase font-semibold">Wallet Balance</p><p className="font-bold text-white">{fmt(sourceWalletBalance)}</p>''',
    '''<p className="text-white/45 text-[11px] uppercase font-semibold">Available to Save</p><p className="font-bold text-white">{fmt(sourceWalletBalance)}</p>''',
    "available savings label",
)

page = replace_once(
    page,
    '''<Button type="button" onClick={() => setOverAmountOpen(false)} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button type="button" onClick={() => runAddSavings(cappedAddAmount)} disabled={savingAmount}''',
    '''<Button type="button" onClick={() => setOverAmountOpen(false)} disabled={savingAmount} variant="ghost" className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-white/80 hover:bg-white/[0.08] hover:text-white disabled:opacity-50">Cancel</Button><Button type="button" onClick={() => runAddSavings(cappedAddAmount)} disabled={savingAmount}''',
    "over amount action guard",
)
write(page_path, page)

manual_path = "src/lib/manualExpenseLinkedTargetSync.js"
manual = read(manual_path)
manual = replace_once(
    manual,
    '''const normalizedLabel = (value) =>
  lower(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
''',
    '''const normalizedLabel = (value) =>
  lower(value)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const isSavingsUsageExpense = (expense = {}) => {
  const identity = normalizedLabel([
    expense?.source_type,
    expense?.sourceType,
    expense?.type,
    expense?.category,
    expense?.title,
    expense?.notes,
  ].filter(Boolean).join(" "));
  return identity.includes("savings goal usage") || identity.includes("savings goal used");
};
''',
    "manual savings usage classifier",
)
manual = replace_once(
    manual,
    '''async function resolveManualExpenseTarget({ expense, localUserId, repository }) {
  if (!expense) return null;

  const explicit = getExplicitTarget(expense);
''',
    '''async function resolveManualExpenseTarget({ expense, localUserId, repository }) {
  if (!expense) return null;
  if (isSavingsUsageExpense(expense)) return null;

  const explicit = getExplicitTarget(expense);
''',
    "manual usage exclusion",
)
write(manual_path, manual)

test_path = "tests/savings-goal-card-flow-regression.test.mjs"
test = read(test_path)
test = replace_once(
    test,
    '''const repair = read("src/lib/savingsGoalLinkedExpenseRepair.js");
const packageJson = read("package.json");
''',
    '''const repair = read("src/lib/savingsGoalLinkedExpenseRepair.js");
const manualSync = read("src/lib/manualExpenseLinkedTargetSync.js");
const packageJson = read("package.json");
''',
    "manual sync test source",
)
test = replace_once(
    test,
    '''test("savings usage cannot be mistaken for a historical contribution", () => {
  assert.match(repair, /isSavingsUsageExpense/);
  assert.match(repair, /if \(isSavingsUsageExpense\(expense\)\) return false/);
});
''',
    '''test("savings usage cannot be mistaken for a historical contribution", () => {
  assert.match(repair, /isSavingsUsageExpense/);
  assert.match(repair, /if \(isSavingsUsageExpense\(expense\)\) return false/);
  assert.match(manualSync, /isSavingsUsageExpense/);
  assert.match(manualSync, /if \(isSavingsUsageExpense\(expense\)\) return null/);
});
''',
    "manual sync regression",
)
test = replace_once(
    test,
    '''test("starter ideas prefill the goal and card totals preserve explicit zero", () => {
  assert.match(page, /openAdd\(routeState\?\.starterTitle \|\| ""\)/);
  assert.match(card, /const hasExplicitSaved/);
  assert.match(card, /const activePrimaryGoal/);
});
''',
    '''test("starter ideas prefill the goal and card totals preserve explicit zero", () => {
  assert.match(page, /openAdd\(routeState\?\.starterTitle \|\| ""\)/);
  assert.match(page, /onClick=\{\(\) => openAdd\(\)\}/);
  assert.doesNotMatch(page, /onClick=\{openAdd\}/);
  assert.match(card, /const hasExplicitSaved/);
  assert.match(card, /const activePrimaryGoal/);
});

test("wallet sync failures stay visible instead of using alerts", () => {
  assert.match(page, /const \[walletSyncError, setWalletSyncError\]/);
  assert.match(page, /CLARA could not mark this wallet money as saved yet/);
  assert.doesNotMatch(page, /alert\(/);
  assert.match(page, /Available to Save/);
});
''',
    "wallet sync and click regression",
)
write(test_path, test)
