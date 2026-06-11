import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardFinanceModalRenderer from "@/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer";
import GuidedWalletCreationModal from "@/components/fresh/main-dashboard/dashboard-primitives/GuidedWalletCreationModal";
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

function getIncomeSourceBalance(source) {
  if (!source) return 0;
  const totalMoneyIn = toIncomeHubNumber(source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in);
  const totalMoneyOut = toIncomeHubNumber(source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out);
  const explicitBalance = source.currentBalance ?? source.current_balance ?? source.balance;
  if (explicitBalance !== undefined && explicitBalance !== null && explicitBalance !== "") return toIncomeHubNumber(explicitBalance);
  return totalMoneyIn - totalMoneyOut;
}

function formatFallbackMoney(value) {
  return `₱${toIncomeHubNumber(value).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

  const createWalletOpen = financeModal?.type === "create_wallet";
  const formatMoney = useCallback((value) => (typeof fmt === "function" ? fmt(value) : formatFallbackMoney(value)), [fmt]);

  const selectedIncomeSource = useMemo(
    () => incomeSources.find((source) => String(source.id) === String(financeForm.incomeSourceId || "")) || null,
    [financeForm.incomeSourceId, incomeSources]
  );

  const loadIncomeSources = useCallback(async () => {
    if (!createWalletOpen) return;

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
  }, [createWalletOpen, effectiveUser, setFinanceForm, showFinanceNotice]);

  useEffect(() => {
    if (!createWalletOpen) return undefined;
    loadIncomeSources();
    if (typeof window === "undefined") return undefined;
    window.addEventListener("clara-income-hub-updated", loadIncomeSources);
    return () => window.removeEventListener("clara-income-hub-updated", loadIncomeSources);
  }, [createWalletOpen, loadIncomeSources]);

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

  const createWalletFromGuidedSetup = useCallback(async () => {
    const name = normalizeString(financeForm.name);
    const selectedWalletType = normalizeString(financeForm.type) || "cash";
    const customWalletType = normalizeString(financeForm.customWalletType);
    const walletType = selectedWalletType === "custom" ? customWalletType || "other" : selectedWalletType;
    const incomeSourceId = String(financeForm.incomeSourceId || "");
    const rawAmount = String(financeForm.amount ?? financeForm.startingBalance ?? "").trim();
    const amount = rawAmount === "" ? 0 : toIncomeHubNumber(rawAmount);
    const startingBalanceMode = normalizeString(financeForm.startingBalanceMode) || (amount > 0 ? "income_hub" : "skip");
    const shouldFundFromIncomeSource = startingBalanceMode === "income_hub" && amount > 0;

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
      console.warn("CLARA wallet creation failed:", error);
      showFinanceNotice?.(error?.message || "Failed to create wallet.");
    } finally {
      setSavingWallet(false);
    }
  }, [closeFinanceModal, debitIncomeSource, effectiveUser, financeForm.amount, financeForm.customWalletType, financeForm.incomeSourceId, financeForm.name, financeForm.startingBalance, financeForm.startingBalanceMode, financeForm.type, financial, incomeSources.length, props.wallets, showFinanceNotice]);

  if (!createWalletOpen) return <DashboardFinanceModalRenderer {...props} />;

  return (
    <GuidedWalletCreationModal
      open={createWalletOpen}
      onClose={closeFinanceModal}
      onSave={createWalletFromGuidedSetup}
      loading={financeActionLoading || savingWallet}
      financeForm={financeForm}
      setFinanceForm={setFinanceForm}
      incomeSources={incomeSources}
      incomeSourcesLoading={incomeSourcesLoading}
      formatMoney={formatMoney}
      getIncomeSourceBalance={getIncomeSourceBalance}
    />
  );
}
