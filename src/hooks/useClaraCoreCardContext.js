import { useCallback, useEffect, useMemo, useState } from "react";
import useClaraLifeProfile from "@/hooks/useClaraLifeProfile";
import {
  getDebtObligations,
  summarizeDebtObligations,
} from "@/lib/debtObligationStore";
import {
  getInvestments,
  summarizeInvestments,
} from "@/lib/investmentStore";

const DEBT_UPDATED_EVENT = "clara:debt-obligations-updated";
const INVESTMENT_UPDATED_EVENT = "clara:investments-updated";

const getLocalUserId = (user) => {
  const value = user?.id || user?.email || "local-user";
  return String(value || "local-user").trim() || "local-user";
};

export default function useClaraCoreCardContext(user = null, options = {}) {
  const localUserId = getLocalUserId(user);
  const lifeProfile = useClaraLifeProfile(user);
  const income = Number(options.income || options.totalIncome || 0) || 0;

  const [debtObligations, setDebtObligations] = useState([]);
  const [investments, setInvestments] = useState([]);

  const reloadDebtObligations = useCallback(async () => {
    try {
      const records = await getDebtObligations(localUserId);
      setDebtObligations(records || []);
      return records || [];
    } catch (error) {
      console.warn("CLARA debt context load failed:", error);
      setDebtObligations([]);
      return [];
    }
  }, [localUserId]);

  const reloadInvestments = useCallback(async () => {
    try {
      const records = await getInvestments(localUserId);
      setInvestments(records || []);
      return records || [];
    } catch (error) {
      console.warn("CLARA investment context load failed:", error);
      setInvestments([]);
      return [];
    }
  }, [localUserId]);

  useEffect(() => {
    reloadDebtObligations();
    reloadInvestments();

    if (typeof window === "undefined") return undefined;

    const handleDebtUpdate = () => reloadDebtObligations();
    const handleInvestmentUpdate = () => reloadInvestments();

    window.addEventListener(DEBT_UPDATED_EVENT, handleDebtUpdate);
    window.addEventListener(INVESTMENT_UPDATED_EVENT, handleInvestmentUpdate);

    return () => {
      window.removeEventListener(DEBT_UPDATED_EVENT, handleDebtUpdate);
      window.removeEventListener(INVESTMENT_UPDATED_EVENT, handleInvestmentUpdate);
    };
  }, [reloadDebtObligations, reloadInvestments]);

  const debtSummary = useMemo(
    () => summarizeDebtObligations(debtObligations, { income }),
    [debtObligations, income]
  );

  const investmentSummary = useMemo(
    () => summarizeInvestments(investments),
    [investments]
  );

  return {
    localUserId,
    lifeProfile,
    debtObligations,
    debtSummary,
    investments,
    investmentSummary,
    reloadDebtObligations,
    reloadInvestments,
  };
}
