import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/context/AuthContext";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import { fmt } from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";
import {
  addMoneyToIncomeSource,
  getIncomeHubLocalUserId,
  transferIncomeSourceToWallet,
} from "@/lib/incomeHubRepository";
import { toLocalDateKey } from "@/lib/recurringCashFlowRepository";

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
  toIncomeNumber(wallet?.derived_balance ?? wallet?.balance ?? wallet?.current_balance ?? wallet?.wallet_balance ?? wallet?.starting_balance ?? wallet?.initial_balance ?? 0);

export default function IncomeSourceAddMoneyModal({
  source = null,
  open = false,
  mode = "add_money",
  onClose,
  financeController = null,
}) {
  const { user } = useAuth();
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const wallets = useMemo(
    () => (Array.isArray(financeController?.wallets) ? financeController.wallets : []),
    [financeController?.wallets]
  );
  const isTransfer = mode === "transfer_money";
  const amount = toIncomeNumber(form.amount);
  const currentBalance = getSourceNet(source);
  const amountExceedsBalance = isTransfer && amount > currentBalance;
  const noWallets = isTransfer && wallets.length === 0;
  const missingWallet = isTransfer && !form.destinationWalletId;
  const invalidAmount = amount <= 0;
  const submitDisabled = invalidAmount || noWallets || missingWallet || amountExceedsBalance;
  const submitDisabledLabel = amountExceedsBalance
    ? "Insufficient Funds"
    : noWallets
      ? "No Wallet Available"
      : missingWallet
        ? "Choose Wallet"
        : "Enter Amount";

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      amount: "",
      destinationWalletId: isTransfer ? String(wallets[0]?.id || "") : "",
    });
  }, [isTransfer, open, source?.id, wallets]);

  const closeModal = () => {
    if (saving) return;
    setForm(emptyForm);
    setError("");
    onClose?.();
  };

  const submit = async () => {
    if (submitDisabled || !source?.id) {
      setError(
        amountExceedsBalance
          ? "The transfer is higher than the available balance."
          : noWallets
            ? "Create a wallet before transferring money."
            : missingWallet
              ? "Choose a destination wallet."
              : "Enter an amount greater than zero."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (isTransfer) {
        await transferIncomeSourceToWallet(localUserId, {
          sourceId: source.id,
          destinationWalletId: form.destinationWalletId,
          amount,
          date: toLocalDateKey(new Date()),
          notes: `Transfer from ${source?.name || "Income Source"}`,
        });
      } else {
        await addMoneyToIncomeSource(localUserId, source.id, amount);
      }

      setForm(emptyForm);
      onClose?.();
    } catch (saveError) {
      console.error(isTransfer ? "CLARA income source transfer error:" : "CLARA income source add money error:", saveError);
      setError(saveError?.message || (isTransfer ? "Unable to transfer money. Please try again." : "Unable to add money. Please try again."));
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
        submit();
      }}
      submitLabel={isTransfer ? "Transfer" : "Add money"}
      submitDisabled={submitDisabled}
      submitDisabledLabel={submitDisabledLabel}
      loading={saving}
    >
      {isTransfer ? (
        <FinanceField label="Destination wallet" helper={noWallets ? "Create a wallet before transferring money." : ""}>
          <select
            value={form.destinationWalletId}
            onChange={(event) => {
              setForm((prev) => ({ ...prev, destinationWalletId: event.target.value }));
              if (error) setError("");
            }}
            className={financeInputClassName}
            disabled={noWallets || saving}
          >
            {noWallets ? <option value="">No wallets available</option> : null}
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
        helper={error || (isTransfer ? `Available: ${fmt(currentBalance)}` : `Current balance: ${fmt(currentBalance)}`)}
      >
        <input
          type="number"
          min="0"
          step="0.01"
          value={form.amount}
          onChange={(event) => {
            setForm((prev) => ({ ...prev, amount: event.target.value }));
            if (error) setError("");
          }}
          placeholder="0"
          className={financeInputClassName}
        />
      </FinanceField>
    </FinanceActionModal>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
