import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/context/AuthContext";
import useFinancialData from "@/hooks/useFinancialData";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import { fmt } from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";
import {
  getIncomeHubLocalUserId,
  upsertIncomeSource,
} from "@/lib/incomeHubRepository";

const emptyForm = { amount: "", destinationWalletId: "" };

const toIncomeNumber = (value) => {
  const number = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const getSourceIn = (source) => toIncomeNumber(source?.totalMoneyIn ?? source?.total_money_in);
const getSourceOut = (source) => toIncomeNumber(source?.totalMoneyOut ?? source?.total_money_out);
const getSourceNet = (source) =>
  toIncomeNumber(source?.currentBalance ?? source?.current_balance ?? getSourceIn(source) - getSourceOut(source));

const getWalletName = (wallet) => wallet?.name || wallet?.wallet_name || wallet?.title || "Wallet";
const getWalletBalance = (wallet) =>
  toIncomeNumber(
    wallet?.derived_balance ??
      wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.starting_balance ??
      wallet?.initial_balance ??
      0
  );

export default function IncomeSourceAddMoneyModal({ source = null, open = false, mode = "add_money", onClose }) {
  const { user } = useAuth();
  const financial = useFinancialData(user);
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const wallets = useMemo(() => (Array.isArray(financial.wallets) ? financial.wallets : []), [financial.wallets]);
  const isTransfer = mode === "transfer_money";
  const amount = toIncomeNumber(form.amount);
  const currentBalance = getSourceNet(source);
  const amountExceedsBalance = isTransfer && amount > currentBalance;

  useEffect(() => {
    if (!open || !isTransfer) return;

    setForm((prev) => ({
      ...prev,
      destinationWalletId: prev.destinationWalletId || String(wallets[0]?.id || ""),
    }));
  }, [isTransfer, open, wallets]);

  const closeModal = () => {
    if (saving) return;
    setForm(emptyForm);
    onClose?.();
  };

  const refreshFinanceEvents = async () => {
    if (typeof financial.refreshData === "function") {
      await financial.refreshData();
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("clara-income-hub-updated"));
      window.dispatchEvent(new Event("clara-finance-updated"));
      window.dispatchEvent(new Event("clara-wallets-updated"));
      window.dispatchEvent(new Event("clara-wallet-transactions-updated"));
    }
  };

  const saveMoney = async () => {
    if (!source?.id || amount <= 0) return;

    const currentIn = getSourceIn(source);
    const currentOut = getSourceOut(source);
    const nextIn = currentIn + amount;
    const nextBalance = nextIn - currentOut;
    const timestamp = new Date().toISOString();

    try {
      setSaving(true);

      await upsertIncomeSource(localUserId, {
        ...source,
        totalMoneyIn: nextIn,
        total_money_in: nextIn,
        totalMoneyOut: currentOut,
        total_money_out: currentOut,
        currentBalance: nextBalance,
        current_balance: nextBalance,
        lastActivityAt: timestamp,
        last_activity_at: timestamp,
      });

      await refreshFinanceEvents();
      closeModal();
    } catch (error) {
      console.error("CLARA income source add money error:", error);
    } finally {
      setSaving(false);
    }
  };

  const transferMoney = async () => {
    if (!source?.id || amount <= 0 || !form.destinationWalletId || amount > currentBalance) return;

    const addToWallet = typeof financial.addIncome === "function" ? financial.addIncome : financial.addMoney;
    if (typeof addToWallet !== "function") return;

    const currentIn = getSourceIn(source);
    const currentOut = getSourceOut(source);
    const nextOut = currentOut + amount;
    const nextBalance = currentIn - nextOut;
    const timestamp = new Date().toISOString();
    const today = new Date().toISOString().split("T")[0];

    try {
      setSaving(true);

      await addToWallet({
        amount,
        wallet_id: form.destinationWalletId,
        walletId: form.destinationWalletId,
        source: source?.name || "Income Source",
        source_type: source?.name || "Income Source",
        notes: `Transfer from ${source?.name || "Income Source"}`,
        type: "income",
        income_source_id: source.id,
        incomeSourceId: source.id,
        income_flow_type: "income_source_transfer",
        incomeFlowType: "income_source_transfer",
        date: today,
        transaction_date: today,
      });

      await upsertIncomeSource(localUserId, {
        ...source,
        totalMoneyIn: currentIn,
        total_money_in: currentIn,
        totalMoneyOut: nextOut,
        total_money_out: nextOut,
        currentBalance: nextBalance,
        current_balance: nextBalance,
        lastActivityAt: timestamp,
        last_activity_at: timestamp,
      });

      await refreshFinanceEvents();
      closeModal();
    } catch (error) {
      console.error("CLARA income source transfer money error:", error);
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <FinanceActionModal
      open={open}
      title={isTransfer ? "Transfer money" : "Add money"}
      description={
        isTransfer
          ? `Move funds from ${source?.name || "income source"} to another wallet.`
          : `Add funds to ${source?.name || "income source"}.`
      }
      onClose={closeModal}
      onSubmit={(event) => {
        event.preventDefault();
        if (isTransfer) {
          transferMoney();
          return;
        }
        saveMoney();
      }}
      submitLabel={isTransfer ? "Transfer" : "Add money"}
      submitDisabled={amountExceedsBalance}
      loading={saving}
    >
      {isTransfer ? (
        <FinanceField label="Destination wallet">
          <select
            value={form.destinationWalletId}
            onChange={(event) => setForm((prev) => ({ ...prev, destinationWalletId: event.target.value }))}
            className={financeInputClassName}
          >
            {wallets.map((wallet) => (
              <option key={wallet.id} value={String(wallet.id)}>
                {getWalletName(wallet)} • {fmt(getWalletBalance(wallet))}
              </option>
            ))}
          </select>
        </FinanceField>
      ) : null}

      <FinanceField
        label="Amount"
        helper={isTransfer ? `Available: ${fmt(currentBalance)}` : `Current balance: ${fmt(currentBalance)}`}
      >
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
          placeholder="0"
          className={financeInputClassName}
        />
      </FinanceField>
    </FinanceActionModal>
  );

  if (typeof document === "undefined") return modal;

  return createPortal(modal, document.body);
}
