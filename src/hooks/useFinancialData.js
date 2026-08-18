import { useMemo } from "react";
import useFinancialDataBase, {
  useFinancialData as useFinancialDataBaseNamed,
} from "./useFinancialDataBase.js";
import {
  getTotalWalletSpendableBalance,
  syncWalletProtectedAllocations,
} from "@/lib/clara-wallet-money-semantics";

function withSharedWalletSemantics(financeData = {}) {
  const sourceWallets = Array.isArray(financeData?.wallets) ? financeData.wallets : [];
  const savingsGoals = Array.isArray(financeData?.savingsGoals) ? financeData.savingsGoals : [];
  const emergencyFund = financeData?.emergencyFund || null;

  const wallets = syncWalletProtectedAllocations({
    rows: sourceWallets,
    allWallets: sourceWallets,
    emergencyFund,
    savingsGoals,
  });

  const totalEmergencyProtected = wallets.reduce(
    (sum, wallet) => sum + Number(wallet?.emergencyProtectedAmount || 0),
    0
  );
  const totalSavingsProtected = wallets.reduce(
    (sum, wallet) => sum + Number(wallet?.savingsProtectedAmount || 0),
    0
  );
  const totalSpendableWalletBalance = getTotalWalletSpendableBalance({
    wallets: sourceWallets,
    emergencyFund,
    savingsGoals,
  });

  return {
    ...financeData,
    wallets,
    totalEmergencyProtected,
    totalSavingsProtected,
    totalSpendableWalletBalance,
  };
}

export function useFinancialData(user) {
  const financeData = useFinancialDataBaseNamed(user);

  return useMemo(
    () => withSharedWalletSemantics(financeData),
    [financeData]
  );
}

export default function useFinancialDataDefault(user) {
  const financeData = useFinancialDataBase(user);

  return useMemo(
    () => withSharedWalletSemantics(financeData),
    [financeData]
  );
}
