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

  const totalMoneyIn = toIncomeHubNumber(
    source.totalMoneyIn ?? source.total_money_in ?? source.moneyIn ?? source.money_in
  );
  const totalMoneyOut = toIncomeHubNumber(
    source.totalMoneyOut ?? source.total_money_out ?? source.moneyOut ?? source.money_out
  );
  const explicitBalance = source.currentBalance ?? source.current_balance ?? source.balance;

  if (explicitBalance !== undefined && explicitBalance !== null && explicitBalance !== "") {
    return toIncomeHubNumber(explicitBalance);
  }

  return totalMoneyIn - totalMoneyOut;
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
    openTransferMoneyModal,
  } = props;

  const { user: authUser } = useAuth();
  const effectiveUser = props.user || authUser;
  const financial = useFinancialData(effectiveUser);
  const [incomeSources, setIncomeSources] = useState([]);
  const [incomeSourcesLoading, setIncomeSourcesLoading] = useState(false);
  const [savingWallet, setSavingWallet] = useState(false);

  const createWalletOpen = financeModal?.type === "create_wallet";
  const deleteWalletOpen = financeModal?.type === "delete_wallet";
  const walletBeingDeleted = financeModal?.payload || null;
  const protectedDeleteOpen = deleteWalletOpen && walletHasProtectedEmergencyMoney(walletBeingDeleted);
  const protectedAmount = getWalletProtectedAmount(walletBeingDeleted);
  const protectedWalletName = getWalletName(walletBeingDeleted);
  const formatMoney = useCallback(
    (value) => (typeof fmt === "function" ? fmt(value) : formatFallbackMoney(value)),
    [fmt]
  );

  const selectedIncomeSource = useMemo(
    () =>
      incomeSources.find(
        (source) => String(source.id) === String(financeForm.incomeSourceId || "")
      ) || null,
    [financeForm.incomeSourceId, incomeSources]
  );

  const selectedIncomeSourceBalance = useMemo(
    () => getIncomeSourceBalance(selectedIncomeSource),
    [selectedIncomeSource]
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
        const hasCurrentSource = cleanSources.some(
          (source) => String(source.id) === currentId
        );

        if (!cleanSources.length) {
          return { ...prev, incomeSourceId: "" };
        }

        if (hasCurrentSource) return prev;

        return {
          ...prev,
          incomeSourceId: String(cleanSources[0]?.id || ""),
        };
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

    return () => {
      window.removeEventListener("clara-income-hub-updated", loadIncomeSources);
    };
  }, [createWalletOpen, loadIncomeSources]);

  const createWalletFromIncomeSource = useCallback(async () => {
    const name = normalizeString(financeForm.name);
    const selectedWalletType = normalizeString(financeForm.type) || "cash";
    const customWalletType = normalizeString(financeForm.customWalletType);
    const walletType =
      selectedWalletType === "custom" ? customWalletType || "other" : selectedWalletType;
    const incomeSourceId = String(financeForm.incomeSourceId || "");
    const rawAmount = String(financeForm.amount ?? "").trim();
    const amount = rawAmount === "" ? 0 : toIncomeHubNumber(rawAmount);
    const shouldFundFromIncomeSource = amount > 0;

    if (!name) {
      showFinanceNotice?.("Please enter a wallet name.");
      return;
    }

    if (!walletType) {
      showFinanceNotice?.("Please enter a wallet type.");
      return;
    }

    if (!Number.isFinite(amount) || amount < 0) {
      showFinanceNotice?.("Please enter a valid amount, or leave it at 0.");
      return;
    }

    if (shouldFundFromIncomeSource && !incomeSources.length) {
      showFinanceNotice?.("Create an income source first before funding a wallet.");
      return;
    }

    if (shouldFundFromIncomeSource && !incomeSourceId) {
      showFinanceNotice?.("Please select an income source.");
      return;
    }

    try {
      setSavingWallet(true);
      const localUserId = getIncomeHubLocalUserId(effectiveUser);
      let selectedSource = null;
      let currentBalance = 0;

      if (shouldFundFromIncomeSource) {
        const latestSources = await getIncomeSources(localUserId);
        selectedSource = latestSources.find(
          (source) => String(source.id) === incomeSourceId
        );

        if (!selectedSource) {
          showFinanceNotice?.("Please select an income source.");
          return;
        }

        currentBalance = getIncomeSourceBalance(selectedSource);

        if (currentBalance < amount) {
          showFinanceNotice?.("Insufficient balance in the selected income source.");
          return;
        }
      }

      const nowIso = new Date().toISOString();

      await financial.addWallet?.({
        name,
        type: walletType,
        balance: amount,
        starting_balance: amount,
        sort_order: Array.isArray(props.wallets) ? props.wallets.length : 0,
        user_id: effectiveUser?.id || null,
        user_email: effectiveUser?.email || null,
        created_by: effectiveUser?.email || null,
      });

      if (shouldFundFromIncomeSource && selectedSource) {
        const totalMoneyIn = toIncomeHubNumber(
          selectedSource.totalMoneyIn ?? selectedSource.total_money_in
        );
        const nextTotalMoneyOut =
          toIncomeHubNumber(selectedSource.totalMoneyOut ?? selectedSource.total_money_out) + amount;
        const nextCurrentBalance = totalMoneyIn - nextTotalMoneyOut;

        await updateIncomeSource(localUserId, selectedSource.id, {
          totalMoneyOut: nextTotalMoneyOut,
          total_money_out: nextTotalMoneyOut,
          currentBalance: nextCurrentBalance,
          current_balance: nextCurrentBalance,
          lastActivityAt: nowIso,
          last_activity_at: nowIso,
          updatedAt: nowIso,
          updated_at: nowIso,
        });

        dispatchClaraEvent("clara-income-hub-updated");
      }

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
  }, [
    closeFinanceModal,
    effectiveUser,
    financeForm.amount,
    financeForm.customWalletType,
    financeForm.incomeSourceId,
    financeForm.name,
    financeForm.type,
    financial,
    incomeSources.length,
    props.wallets,
    showFinanceNotice,
  ]);

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
            <br />
            <br />
            Deleting this wallet will remove the Emergency Fund allocation attached to it.
            <br />
            <br />
            Transfer the funds first if you want to keep the money protected before deleting this wallet.
          </div>

          <button
            type="button"
            onClick={() => openTransferMoneyModal?.(walletBeingDeleted)}
            className="w-full rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.08] px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/[0.13]"
          >
            Transfer Funds
          </button>
        </div>
      </FinanceActionModal>
    );
  }

  if (!createWalletOpen) {
    return <DashboardFinanceModalRenderer {...props} />;
  }

  const sourceHelper = incomeSources.length
    ? "Optional. Choose an income source only if you want to fund this wallet now."
    : "Optional. You can create the wallet with ₱0 and add money later.";
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
        <input
          type="text"
          value={financeForm.name}
          onChange={(event) =>
            setFinanceForm((prev) => ({ ...prev, name: event.target.value }))
          }
          placeholder="e.g. GCash, Cash, Payroll"
          className={financeInputClassName}
        />
      </FinanceField>

      <FinanceField
        label="Wallet type"
        helper="Choose the closest type so CLARA can organize your money clearly."
      >
        <div className="space-y-3">
          <select
            value={financeForm.type}
            onChange={(event) =>
              setFinanceForm((prev) => ({
                ...prev,
                type: event.target.value,
                customWalletType:
                  event.target.value === "custom" ? prev.customWalletType : "",
              }))
            }
            className={financeInputClassName}
          >
            {WALLET_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          {financeForm.type === "custom" ? (
            <input
              type="text"
              value={financeForm.customWalletType}
              onChange={(event) =>
                setFinanceForm((prev) => ({
                  ...prev,
                  customWalletType: event.target.value,
                }))
              }
              placeholder="e.g. Loan Wallet, Travel Fund, Side Hustle"
              className={financeInputClassName}
            />
          ) : null}
        </div>
      </FinanceField>

      <FinanceField label="Add money from" helper={sourceHelper}>
        <select
          value={financeForm.incomeSourceId || ""}
          disabled={!incomeSources.length || incomeSourcesLoading || loading}
          onChange={(event) =>
            setFinanceForm((prev) => ({
              ...prev,
              incomeSourceId: event.target.value,
            }))
          }
          className={financeInputClassName}
        >
          {incomeSources.length ? (
            incomeSources.map((source) => (
              <option key={source.id} value={String(source.id)}>
                {source.name} • {formatMoney(getIncomeSourceBalance(source))}
              </option>
            ))
          ) : (
            <option value="">No income sources yet</option>
          )}
        </select>
      </FinanceField>

      <FinanceField
        label="Starting amount optional"
        helper={
          selectedIncomeSource
            ? `Optional. Available if funding now: ${formatMoney(selectedIncomeSourceBalance)}`
            : "Leave this as 0 if you want to add money later."
        }
      >
        <input
          type="number"
          min="0"
          step="0.01"
          value={financeForm.amount}
          onChange={(event) =>
            setFinanceForm((prev) => ({ ...prev, amount: event.target.value }))
          }
          placeholder="0"
          className={financeInputClassName}
        />
      </FinanceField>
    </FinanceActionModal>
  );
}
