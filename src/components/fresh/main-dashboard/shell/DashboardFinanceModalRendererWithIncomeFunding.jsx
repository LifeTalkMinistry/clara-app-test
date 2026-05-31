import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";
import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";
import {
  getIncomeHubLocalUserId,
  getIncomeSources,
  toIncomeHubNumber,
  updateIncomeSource,
} from "@/lib/incomeHubRepository";
import { normalizeString } from "@/utils/dashboard/dashboardHelpers";

const WALLET_TYPES = [
  ["cash", "Cash"],
  ["gcash", "GCash"],
  ["maya", "Maya"],
  ["bank", "Bank"],
  ["payroll", "Payroll"],
  ["savings", "Savings"],
  ["allowance", "Allowance"],
  ["business", "Business"],
  ["credit_card", "Credit Card"],
  ["custom", "Custom"],
];

function getIncomeSourceBalance(source) {
  if (!source) return 0;
  const totalMoneyIn = toIncomeHubNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in);
  const totalMoneyOut = toIncomeHubNumber(source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out);
  const explicitBalance = source.currentBalance ?? source.current_balance ?? source.balance;
  if (explicitBalance !== undefined && explicitBalance !== null && explicitBalance !== "") return toIncomeHubNumber(explicitBalance);
  return totalMoneyIn - totalMoneyOut;
}

function getWalletBalance(wallet = {}) {
  return toIncomeHubNumber(
    wallet?.balance ??
      wallet?.currentBalance ??
      wallet?.current_balance ??
      wallet?.availableBalance ??
      wallet?.available_balance ??
      0
  );
}

function formatFallbackMoney(value) {
  return `₱${toIncomeHubNumber(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getWalletName(wallet = {}) {
  return (
    normalizeString(wallet?.name) ||
    normalizeString(wallet?.wallet_name) ||
    normalizeString(wallet?.title) ||
    normalizeString(wallet?.label) ||
    "this wallet"
  );
}

function getWalletProtectedAmount(wallet = {}) {
  return toIncomeHubNumber(
    wallet?.emergencyProtectedAmount ??
      wallet?.emergency_protected_amount ??
      wallet?.protectedEmergencyAmount ??
      wallet?.protected_emergency_amount ??
      0
  );
}

function getEmergencyActivityLog(emergencyFund = {}) {
  const source =
    emergencyFund?.emergencyActivityLog ||
    emergencyFund?.emergency_activity_log ||
    emergencyFund?.activityLog ||
    emergencyFund?.activity_log ||
    emergencyFund?.usageLog ||
    emergencyFund?.usage_log ||
    [];
  return Array.isArray(source) ? source.filter(Boolean) : [];
}

function walletHasProtectedEmergencyMoney(wallet = {}) {
  return (
    getWalletProtectedAmount(wallet) > 0 ||
    wallet?.hasEmergencyFundAllocation === true ||
    wallet?.has_emergency_fund_allocation === true ||
    Boolean(wallet?.emergencyFundLinkedWalletId || wallet?.emergency_fund_linked_wallet_id)
  );
}

export default function DashboardFinanceModalRendererWithIncomeFunding(props) {
  const {
    financeModal,
    closeFinanceModal,
    financeActionLoading,
    financeForm,
    setFinanceForm,
    fmt,
    showFinanceNotice,
  } = props;

  const { user: authUser } = useAuth();
  const effectiveUser = props.user || authUser;
  const financial = useFinancialData(effectiveUser);
  const [incomeSources, setIncomeSources] = useState([]);
  const [incomeSourcesLoading, setIncomeSourcesLoading] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);
  const [protectedTransferWallet, setProtectedTransferWallet] = useState(null);

  const createWalletOpen = financeModal?.type === "create_wallet";
  const addMoneyOpen = financeModal?.type === "add_money";
  const deleteWalletOpen = financeModal?.type === "delete_wallet";
  const walletBeingDeleted = financeModal?.payload || null;
  const protectedDeleteOpen = deleteWalletOpen && walletHasProtectedEmergencyMoney(walletBeingDeleted);
  const protectedAmount = getWalletProtectedAmount(walletBeingDeleted);
  const protectedWalletName = getWalletName(walletBeingDeleted);
  const protectedTransferOpen = Boolean(protectedTransferWallet);
  const protectedTransferAmount = getWalletProtectedAmount(protectedTransferWallet);
  const protectedTransferWalletName = getWalletName(protectedTransferWallet);
  const safeWallets = Array.isArray(props.wallets) ? props.wallets : [];
  const formatMoney = useCallback((value) => (typeof fmt === "function" ? fmt(value) : formatFallbackMoney(value)), [fmt]);

  const protectedTransferDestinationWallets = useMemo(
    () => safeWallets.filter((wallet) => String(wallet.id) !== String(protectedTransferWallet?.id)),
    [protectedTransferWallet?.id, safeWallets]
  );

  const selectedIncomeSource = useMemo(
    () => incomeSources.find((source) => String(source.id) === String(financeForm.incomeSourceId || "")) || null,
    [financeForm.incomeSourceId, incomeSources]
  );

  const selectedIncomeSourceBalance = useMemo(() => getIncomeSourceBalance(selectedIncomeSource), [selectedIncomeSource]);

  const loadIncomeSources = useCallback(async () => {
    if (!createWalletOpen && !addMoneyOpen) return;
    try {
      setIncomeSourcesLoading(true);
      const localUserId = getIncomeHubLocalUserId(effectiveUser);
      const sources = await getIncomeSources(localUserId);
      const cleanSources = Array.isArray(sources) ? sources : [];
      setIncomeSources(cleanSources);
      setFinanceForm((prev) => {
        const currentId = String(prev?.incomeSourceId || "");
        const hasCurrentSource = cleanSources.some((source) => String(source.id) === currentId);
        if (!cleanSources.length) return { ...prev, incomeSourceId: "" };
        if (hasCurrentSource) return prev;
        return { ...prev, incomeSourceId: String(cleanSources[0]?.id || "") };
      });
    } catch (error) {
      console.warn("CLARA income source load failed:", error);
      setIncomeSources([]);
      showFinanceNotice?.("Unable to load income sources yet.");
    } finally {
      setIncomeSourcesLoading(false);
    }
  }, [addMoneyOpen, createWalletOpen, effectiveUser, setFinanceForm, showFinanceNotice]);

  useEffect(() => {
    if (!createWalletOpen && !addMoneyOpen) return undefined;
    loadIncomeSources();
    if (typeof window === "undefined") return undefined;
    window.addEventListener("clara-income-hub-updated", loadIncomeSources);
    return () => window.removeEventListener("clara-income-hub-updated", loadIncomeSources);
  }, [addMoneyOpen, createWalletOpen, loadIncomeSources]);

  const debitIncomeSource = useCallback(
    async ({ incomeSourceId, amount }) => {
      const localUserId = getIncomeHubLocalUserId(effectiveUser);
      const latestSources = await getIncomeSources(localUserId);
      const selectedSource = latestSources.find((source) => String(source.id) === String(incomeSourceId));
      if (!selectedSource) throw new Error("Please select an income source.");
      const currentBalance = getIncomeSourceBalance(selectedSource);
      if (currentBalance < amount) throw new Error("Insufficient balance in the selected income source.");
      const totalMoneyIn = toIncomeHubNumber(selectedSource.totalMoneyIn ?? selectedSource.total_money_in);
      const nextTotalMoneyOut = toIncomeHubNumber(selectedSource.totalMoneyOut ?? selectedSource.total_money_out) + amount;
      const nowIso = new Date().toISOString();
      await updateIncomeSource(localUserId, selectedSource.id, {
        totalMoneyOut: nextTotalMoneyOut,
        total_money_out: nextTotalMoneyOut,
        currentBalance: totalMoneyIn - nextTotalMoneyOut,
        current_balance: totalMoneyIn - nextTotalMoneyOut,
        lastActivityAt: nowIso,
        last_activity_at: nowIso,
        updatedAt: nowIso,
        updated_at: nowIso,
      });
      dispatchClaraEvent("clara-income-hub-updated");
      return selectedSource;
    },
    [effectiveUser]
  );

  const openProtectedWalletTransferModal = useCallback(
    (wallet) => {
      const sourceWallet = wallet || null;
      const amount = getWalletProtectedAmount(sourceWallet);
      const destinationWallets = safeWallets.filter((item) => String(item.id) !== String(sourceWallet?.id));

      if (!destinationWallets.length) {
        showFinanceNotice?.("Create another wallet first before transferring protected money.");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        showFinanceNotice?.("No protected Emergency Fund amount was found for this wallet.");
        return;
      }

      setFinanceForm((prev) => ({
        ...prev,
        protectedTransferDestinationWalletId: String(destinationWallets[0]?.id || ""),
        protectedTransferAmount: String(amount),
        amount: String(amount),
      }));
      setProtectedTransferWallet(sourceWallet);
    },
    [safeWallets, setFinanceForm, showFinanceNotice]
  );

  const closeProtectedWalletTransferModal = useCallback(() => {
    setProtectedTransferWallet(null);
    setFinanceForm((prev) => ({
      ...prev,
      protectedTransferDestinationWalletId: "",
      protectedTransferAmount: "",
      amount: "",
    }));
  }, [setFinanceForm]);

  const transferProtectedWalletMoney = useCallback(async () => {
    const sourceWallet = protectedTransferWallet;
    const destinationWallet = safeWallets.find((wallet) => String(wallet.id) === String(financeForm.protectedTransferDestinationWalletId));
    const lockedAmount = getWalletProtectedAmount(sourceWallet);
    const fallbackAmount = toIncomeHubNumber(financeForm.protectedTransferAmount ?? financeForm.amount ?? 0);
    const amount = lockedAmount > 0 ? lockedAmount : fallbackAmount;

    if (!sourceWallet?.id) return showFinanceNotice?.("Please select a valid source wallet.");
    if (!destinationWallet?.id) return showFinanceNotice?.("Please select a valid destination wallet.");
    if (!Number.isFinite(amount) || amount <= 0) return showFinanceNotice?.("No protected Emergency Fund amount was found for this wallet.");
    if (getWalletBalance(sourceWallet) < amount) return showFinanceNotice?.("Insufficient balance in the source wallet.");

    try {
      setSavingWallet(true);
      const now = new Date().toISOString();
      const destinationWalletName = getWalletName(destinationWallet);
      const nextActivity = [
        {
          id: `emergency_storage_transfer_${Date.now()}`,
          type: "storage_wallet_transfer",
          amount,
          title: "Protected Emergency Fund moved",
          reason: "Emergency Fund Storage Wallet Transfer",
          note: `Moved from ${getWalletName(sourceWallet)} to ${destinationWalletName}`,
          sourceWalletId: sourceWallet.id,
          source_wallet_id: sourceWallet.id,
          storageWalletId: destinationWallet.id,
          storage_wallet_id: destinationWallet.id,
          storageWalletName: destinationWalletName,
          storage_wallet_name: destinationWalletName,
          createdAt: now,
          created_at: now,
        },
        ...getEmergencyActivityLog(financial.emergencyFund),
      ].slice(0, 60);

      await financial.transferBetweenWallets?.({
        from_wallet_id: sourceWallet.id,
        to_wallet_id: destinationWallet.id,
        amount,
        user_id: effectiveUser?.id || null,
        user_email: effectiveUser?.email || null,
        created_by: effectiveUser?.email || null,
      });

      await financial.updateEmergencyFund?.({
        ...(financial.emergencyFund || {}),
        linkedWalletId: destinationWallet.id,
        linked_wallet_id: destinationWallet.id,
        reserveWalletId: destinationWallet.id,
        reserve_wallet_id: destinationWallet.id,
        storageWalletId: destinationWallet.id,
        storage_wallet_id: destinationWallet.id,
        linkedWalletName: destinationWalletName,
        linked_wallet_name: destinationWalletName,
        reserveWalletName: destinationWalletName,
        reserve_wallet_name: destinationWalletName,
        storageWalletName: destinationWalletName,
        storage_wallet_name: destinationWalletName,
        emergencyActivityLog: nextActivity,
        emergency_activity_log: nextActivity,
        activityLog: nextActivity,
        activity_log: nextActivity,
        lastReserveTransferAt: now,
        last_reserve_transfer_at: now,
        lastStorageWalletChangedAt: now,
        last_storage_wallet_changed_at: now,
        updatedAt: now,
        updated_at: now,
      });

      await financial.refreshData?.();
      dispatchClaraEvent("clara-finance-updated");
      setProtectedTransferWallet(null);
      setFinanceForm((prev) => ({
        ...prev,
        protectedTransferDestinationWalletId: "",
        protectedTransferAmount: "",
        amount: "",
      }));
      closeFinanceModal?.();
      showFinanceNotice?.("Protected Emergency Fund money transferred.", "success");
    } catch (error) {
      console.warn("CLARA protected Emergency Fund transfer failed:", error);
      showFinanceNotice?.(error?.message || "Failed to transfer protected Emergency Fund money.");
    } finally {
      setSavingWallet(false);
    }
  }, [closeFinanceModal, effectiveUser?.email, effectiveUser?.id, financeForm.amount, financeForm.protectedTransferAmount, financeForm.protectedTransferDestinationWalletId, financial, protectedTransferWallet, safeWallets, setFinanceForm, showFinanceNotice]);

  const createWalletFromIncomeSource = useCallback(async () => {
    const name = normalizeString(financeForm.name);
    const selectedWalletType = normalizeString(financeForm.type) || "cash";
    const customWalletType = normalizeString(financeForm.customWalletType);
    const walletType = selectedWalletType === "custom" ? customWalletType || "other" : selectedWalletType;
    const incomeSourceId = String(financeForm.incomeSourceId || "");
    const rawAmount = String(financeForm.amount ?? "").trim();
    const amount = rawAmount === "" ? 0 : toIncomeHubNumber(rawAmount);
    const shouldFundFromIncomeSource = amount > 0;

    if (!name) return showFinanceNotice?.("Please enter a wallet name.");
    if (!walletType) return showFinanceNotice?.("Please enter a wallet type.");
    if (!Number.isFinite(amount) || amount < 0) return showFinanceNotice?.("Please enter a valid amount, or leave it at 0.");
    if (shouldFundFromIncomeSource && !incomeSources.length) return showFinanceNotice?.("Create an income source first before funding a wallet.");
    if (shouldFundFromIncomeSource && !incomeSourceId) return showFinanceNotice?.("Please select an income source.");

    try {
      setSavingWallet(true);
      let selectedSource = null;
      if (shouldFundFromIncomeSource) {
        selectedSource = await debitIncomeSource({ incomeSourceId, amount });
      }

      await financial.addWallet?.({
        name,
        type: walletType,
        balance: amount,
        starting_balance: amount,
        sort_order: Array.isArray(props.wallets) ? props.wallets.length : 0,
        user_id: effectiveUser?.id || null,
        user_email: effectiveUser?.email || null,
        created_by: effectiveUser?.email || null,
        incomeSourceId: selectedSource?.id || null,
        income_source_id: selectedSource?.id || null,
        source: selectedSource?.name || "",
      });

      dispatchClaraEvent("clara-finance-updated");
      await financial.refreshData?.();
      closeFinanceModal?.();
      showFinanceNotice?.("Wallet created successfully.", "success");
    } catch (error) {
      console.warn("CLARA wallet income-source funding failed:", error);
      showFinanceNotice?.(error?.message || "Failed to create wallet.");
    } finally {
      setSavingWallet(false);
    }
  }, [closeFinanceModal, debitIncomeSource, effectiveUser, financeForm.amount, financeForm.customWalletType, financeForm.incomeSourceId, financeForm.name, financeForm.type, financial, incomeSources.length, props.wallets, showFinanceNotice]);

  const addMoneyFromIncomeSource = useCallback(async () => {
    const wallet = financeModal?.payload || null;
    const incomeSourceId = String(financeForm.incomeSourceId || "");
    const amount = toIncomeHubNumber(financeForm.amount);

    if (!wallet?.id) return showFinanceNotice?.("Please select a valid destination wallet.");
    if (!Number.isFinite(amount) || amount <= 0) return showFinanceNotice?.("Please enter a valid amount.");
    if (!incomeSources.length) return showFinanceNotice?.("Create an income source first before adding money to a wallet.");
    if (!incomeSourceId) return showFinanceNotice?.("Please select where this money came from.");

    try {
      setSavingWallet(true);
      const selectedSource = await debitIncomeSource({ incomeSourceId, amount });
      await financial.addIncome?.({
        ...financeForm,
        amount,
        wallet_id: wallet.id,
        walletId: wallet.id,
        incomeSourceId: selectedSource.id,
        income_source_id: selectedSource.id,
        source: selectedSource.name || "Income",
        title: selectedSource.name || "Income",
        notes: financeForm.notes || `Added from ${selectedSource.name || "income source"}`,
        user_id: effectiveUser?.id || null,
        user_email: effectiveUser?.email || null,
        created_by: effectiveUser?.email || null,
      });
      dispatchClaraEvent("clara-finance-updated");
      await financial.refreshData?.();
      closeFinanceModal?.();
      showFinanceNotice?.("Money added from income source.", "success");
    } catch (error) {
      console.warn("CLARA add money from income source failed:", error);
      showFinanceNotice?.(error?.message || "Failed to add money.");
    } finally {
      setSavingWallet(false);
    }
  }, [closeFinanceModal, debitIncomeSource, effectiveUser, financeForm, financeModal?.payload, financial, incomeSources.length, showFinanceNotice]);

  if (protectedTransferOpen) {
    const lockedAmount = protectedTransferAmount;
    return (
      <FinanceActionModal
        open={protectedTransferOpen}
        title="Transfer Emergency Fund"
        description="Move the protected Emergency Fund money before deleting this wallet."
        onClose={closeProtectedWalletTransferModal}
        onSubmit={(event) => {
          event.preventDefault();
          transferProtectedWalletMoney();
        }}
        submitLabel="Transfer Protected Money"
        loading={financeActionLoading || savingWallet}
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3 text-sm leading-6 text-white/75">
            <span className="text-white/50">From:</span> <strong className="font-black text-white">{protectedTransferWalletName}</strong>
          </div>
          <FinanceField label="Destination wallet">
            <select
              value={financeForm.protectedTransferDestinationWalletId || ""}
              onChange={(event) => setFinanceForm((prev) => ({ ...prev, protectedTransferDestinationWalletId: event.target.value, amount: String(lockedAmount), protectedTransferAmount: String(lockedAmount) }))}
              className={financeInputClassName}
            >
              {protectedTransferDestinationWallets.map((wallet) => (
                <option key={wallet.id} value={String(wallet.id)}>{getWalletName(wallet)} • {formatMoney(getWalletBalance(wallet))}</option>
              ))}
            </select>
          </FinanceField>
          <div className="rounded-3xl border border-cyan-300/18 bg-cyan-400/[0.08] p-4 shadow-[0_16px_40px_rgba(34,211,238,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/70">Amount to transfer</p>
            <p className="mt-2 text-3xl font-black tracking-tight text-cyan-50">{formatMoney(lockedAmount)}</p>
            <p className="mt-2 text-xs leading-5 text-cyan-50/72">This amount is locked because it is protected Emergency Fund money. The destination wallet also becomes the new Emergency Fund storage wallet.</p>
          </div>
        </div>
      </FinanceActionModal>
    );
  }

  if (protectedDeleteOpen) {
    return (
      <FinanceActionModal
        open={protectedDeleteOpen}
        title="Wallet contains protected money"
        description={`${protectedWalletName} currently protects ${formatMoney(protectedAmount)} for your Emergency Fund.`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          props.deleteWalletInline?.();
        }}
        submitLabel="Delete Anyway"
        loading={financeActionLoading}
        danger
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] p-4 text-sm font-semibold leading-6 text-amber-50/88">
            This wallet is currently linked to your Emergency Fund.
            <br /><br />
            Transfer the protected money or change the Emergency Fund storage wallet before deleting this wallet.
          </div>
          <button type="button" onClick={() => openProtectedWalletTransferModal(walletBeingDeleted)} className="w-full rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.08] px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/[0.13]">Transfer Protected Money</button>
          <button type="button" onClick={closeFinanceModal} className="w-full rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3 text-sm font-black text-white/75 transition hover:bg-white/[0.08]">Cancel</button>
        </div>
      </FinanceActionModal>
    );
  }

  if (addMoneyOpen) {
    const wallet = financeModal?.payload || null;
    const helper = incomeSources.length ? `Choose where this money came from. Available: ${formatMoney(selectedIncomeSourceBalance)}` : "Create an income source first before adding money.";
    const loading = financeActionLoading || savingWallet;
    return (
      <FinanceActionModal
        open={addMoneyOpen}
        title="Add money"
        description={`Destination: ${getWalletName(wallet)}`}
        onClose={closeFinanceModal}
        onSubmit={(event) => {
          event.preventDefault();
          addMoneyFromIncomeSource();
        }}
        submitLabel="Add money"
        submitDisabled={incomeSourcesLoading || !incomeSources.length}
        loading={loading}
      >
        <FinanceField label="Add money from" helper={helper}>
          <select value={financeForm.incomeSourceId || ""} disabled={!incomeSources.length || incomeSourcesLoading || loading} onChange={(event) => setFinanceForm((prev) => ({ ...prev, incomeSourceId: event.target.value }))} className={financeInputClassName}>
            {incomeSources.length ? incomeSources.map((source) => <option key={source.id} value={String(source.id)}>{source.name} • {formatMoney(getIncomeSourceBalance(source))}</option>) : <option value="">No income sources yet</option>}
          </select>
        </FinanceField>
        <FinanceField label="Amount" helper={`Current wallet balance: ${formatMoney(getWalletBalance(wallet))}`}>
          <input type="number" min="0" step="0.01" value={financeForm.amount} onChange={(event) => setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="0" className={financeInputClassName} />
        </FinanceField>
      </FinanceActionModal>
    );
  }

  if (!createWalletOpen) return <DashboardFinanceModalRenderer {...props} />;

  const sourceHelper = incomeSources.length ? "Optional. Choose an income source only if you want to fund this wallet now." : "Optional. You can create the wallet with ₱0 and add money later.";
  const loading = financeActionLoading || savingWallet;

  return (
    <FinanceActionModal
      open={createWalletOpen}
      title="Where will your money live?"
      description="Create a new money container inside your CLARA system."
      onClose={closeFinanceModal}
      onSubmit={(event) => {
        event.preventDefault();
        createWalletFromIncomeSource();
      }}
      submitLabel="Create wallet →"
      submitDisabled={incomeSourcesLoading}
      loading={loading}
    >
      <FinanceField label="Wallet name">
        <input type="text" value={financeForm.name} onChange={(event) => setFinanceForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="e.g. GCash, Cash, Payroll" className={financeInputClassName} />
      </FinanceField>
      <FinanceField label="Wallet type" helper="Choose the closest type so CLARA can organize your money clearly.">
        <div className="space-y-3">
          <select value={financeForm.type} onChange={(event) => setFinanceForm((prev) => ({ ...prev, type: event.target.value, customWalletType: event.target.value === "custom" ? prev.customWalletType : "" }))} className={financeInputClassName}>
            {WALLET_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          {financeForm.type === "custom" ? <input type="text" value={financeForm.customWalletType} onChange={(event) => setFinanceForm((prev) => ({ ...prev, customWalletType: event.target.value }))} placeholder="e.g. Loan Wallet, Travel Fund, Side Hustle" className={financeInputClassName} /> : null}
        </div>
      </FinanceField>
      <FinanceField label="Add money from" helper={sourceHelper}>
        <select value={financeForm.incomeSourceId || ""} disabled={!incomeSources.length || incomeSourcesLoading || loading} onChange={(event) => setFinanceForm((prev) => ({ ...prev, incomeSourceId: event.target.value }))} className={financeInputClassName}>
          {incomeSources.length ? incomeSources.map((source) => <option key={source.id} value={String(source.id)}>{source.name} • {formatMoney(getIncomeSourceBalance(source))}</option>) : <option value="">No income sources yet</option>}
        </select>
      </FinanceField>
      <FinanceField label="Starting amount optional" helper={selectedIncomeSource ? `Optional. Available if funding now: ${formatMoney(selectedIncomeSourceBalance)}` : "Leave this as 0 if you want to add money later."}>
        <input type="number" min="0" step="0.01" value={financeForm.amount} onChange={(event) => setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="0" className={financeInputClassName} />
      </FinanceField>
    </FinanceActionModal>
  );
}
