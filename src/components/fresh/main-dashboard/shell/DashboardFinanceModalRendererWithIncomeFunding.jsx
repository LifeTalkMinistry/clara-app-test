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
    const amount = toIncomeHubNumber(financeForm.amount);

    if (!name) {
      showFinanceNotice?.("Please enter a wallet name.");
      return;
    }

    if (!walletType) {
      showFinanceNotice?.("Please enter a wallet type.");
      return;
    }

    if (!incomeSources.length) {
      showFinanceNotice?.("Create an income source first before funding a wallet.");
      return;
    }

    if (!incomeSourceId) {
      showFinanceNotice?.("Please select an income source.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      showFinanceNotice?.("Please enter a valid funding amount.");
      return;
    }

    try {
      setSavingWallet(true);
      const localUserId = getIncomeHubLocalUserId(effectiveUser);
      const latestSources = await getIncomeSources(localUserId);
      const selectedSource = latestSources.find(
        (source) => String(source.id) === incomeSourceId
      );

      if (!selectedSource) {
        showFinanceNotice?.("Please select an income source.");
        return;
      }

      const currentBalance = getIncomeSourceBalance(selectedSource);

      if (currentBalance < amount) {
        showFinanceNotice?.("Insufficient balance in the selected income source.");
        return;
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

  if (!createWalletOpen) {
    return <DashboardFinanceModalRenderer {...props} />;
  }

  const sourceHelper = incomeSources.length
    ? "Choose which real income source will fund this wallet."
    : "Create an income source first before funding a wallet.";
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
      submitDisabled={!incomeSources.length || incomeSourcesLoading}
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
        label="Amount"
        helper={
          selectedIncomeSource
            ? `Available: ${formatMoney(selectedIncomeSourceBalance)}`
            : ""
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
