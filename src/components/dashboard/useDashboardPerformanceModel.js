import { useMemo } from "react";
import {
  buildMoneySummary,
  buildRecentActivity,
  getStableFinanceSignature,
} from "./dashboardFinanceSelectors";

const getSafeArray = (value) => (Array.isArray(value) ? value : []);

const getArrayVersion = (items) => {
  const safeItems = getSafeArray(items);
  const newestStamp = safeItems.reduce((latest, item) => {
    const raw = item?.updated_at || item?.created_at || item?.date || item?.transaction_date || item?.expense_date || "";
    const stamp = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(stamp) && stamp > latest ? stamp : latest;
  }, 0);

  return `${safeItems.length}:${newestStamp}`;
};

export default function useDashboardPerformanceModel({
  wallets = [],
  expenses = [],
  budgets = [],
  savingsGoals = [],
  walletTransactions = [],
  transfers = [],
  savingsTransactions = [],
  emergencyFundTransactions = [],
  emergencyFund = null,
  walletMoney = 0,
  recentLimit = 8,
} = {}) {
  const financeSignature = useMemo(
    () =>
      getStableFinanceSignature({
        wallets,
        expenses,
        budgets,
        savingsGoals,
        walletTransactions,
      }),
    [wallets, expenses, budgets, savingsGoals, walletTransactions]
  );

  const financeVersion = useMemo(
    () =>
      [
        getArrayVersion(wallets),
        getArrayVersion(expenses),
        getArrayVersion(budgets),
        getArrayVersion(savingsGoals),
        getArrayVersion(walletTransactions),
        getArrayVersion(transfers),
        getArrayVersion(savingsTransactions),
        getArrayVersion(emergencyFundTransactions),
        emergencyFund?.updated_at || emergencyFund?.created_at || "",
        walletMoney,
      ].join("|"),
    [
      wallets,
      expenses,
      budgets,
      savingsGoals,
      walletTransactions,
      transfers,
      savingsTransactions,
      emergencyFundTransactions,
      emergencyFund,
      walletMoney,
    ]
  );

  const moneySummary = useMemo(
    () =>
      buildMoneySummary({
        wallets,
        expenses,
        budgets,
        savingsGoals,
        emergencyFund,
        walletMoney,
      }),
    [financeVersion, wallets, expenses, budgets, savingsGoals, emergencyFund, walletMoney]
  );

  const recentActivity = useMemo(
    () =>
      buildRecentActivity({
        expenses,
        walletTransactions,
        transfers,
        savingsTransactions,
        emergencyFundTransactions,
        limit: recentLimit,
      }),
    [
      financeVersion,
      expenses,
      walletTransactions,
      transfers,
      savingsTransactions,
      emergencyFundTransactions,
      recentLimit,
    ]
  );

  return {
    financeSignature,
    financeVersion,
    moneySummary,
    recentActivity,
  };
}
