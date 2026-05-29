import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { useAuth } from "@/context/AuthContext";
import FinanceActionModal from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceActionModal";
import FinanceField from "@/components/fresh/main-dashboard/dashboard-primitives/FinanceField";
import { financeInputClassName } from "@/components/fresh/main-dashboard/finance-form/financeFormConstants";
import { fmt } from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";
import {
  getIncomeHubLocalUserId,
  upsertIncomeSource,
} from "@/lib/incomeHubRepository";

const emptyForm = { amount: "" };

const toIncomeNumber = (value) => {
  const number = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(number) ? number : 0;
};

const getSourceIn = (source) => toIncomeNumber(source?.totalMoneyIn ?? source?.total_money_in);
const getSourceOut = (source) => toIncomeNumber(source?.totalMoneyOut ?? source?.total_money_out);
const getSourceNet = (source) =>
  toIncomeNumber(source?.currentBalance ?? source?.current_balance ?? getSourceIn(source) - getSourceOut(source));

export default function IncomeSourceAddMoneyModal({ source = null, open = false, onClose }) {
  const { user } = useAuth();
  const localUserId = useMemo(() => getIncomeHubLocalUserId(user), [user]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const amount = toIncomeNumber(form.amount);
  const currentBalance = getSourceNet(source);

  const closeModal = () => {
    if (saving) return;
    setForm(emptyForm);
    onClose?.();
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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("clara-income-hub-updated"));
        window.dispatchEvent(new Event("clara-finance-updated"));
      }

      closeModal();
    } catch (error) {
      console.error("CLARA income source add money error:", error);
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <FinanceActionModal
      open={open}
      title="Add money"
      description={`Add funds to ${source?.name || "income source"}.`}
      onClose={closeModal}
      onSubmit={(event) => {
        event.preventDefault();
        saveMoney();
      }}
      submitLabel="Add money"
      submitDisabled={false}
      loading={saving}
    >
      <FinanceField
        label="Amount"
        helper={`Current balance: ${fmt(currentBalance)}`}
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
