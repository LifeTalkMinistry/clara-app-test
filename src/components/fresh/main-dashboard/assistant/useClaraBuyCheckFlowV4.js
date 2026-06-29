import { useCallback, useEffect, useMemo, useState } from "react";
import { addExpense as repoAddExpense } from "@/lib/financeRepository";
import useClaraBuyCheckFlowV3 from "./useClaraBuyCheckFlowV3.js";

function clean(value = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeCategory(value = "") {
  const text = clean(value).toLowerCase();
  if (/food|meal|coffee|snack|grocery/.test(text)) return "food";
  if (/transport|fare|gas|grab|jeep|bus|taxi/.test(text)) return "transport";
  if (/bill|utility|utilities|internet|rent/.test(text)) return "utilities";
  if (/health|medical|medicine|wellness|fitness/.test(text)) return "health";
  if (/school|study|education/.test(text)) return "education";
  if (/shoe|phone|shopping|clothes|bag|gadget|lazada|shopee/.test(text)) return "shopping";
  return "other";
}

function normalizeNeedType(reason = "", category = "") {
  const text = `${reason} ${category}`.toLowerCase();
  if (/health|medical|medicine|doctor|work|job|school|study|replacement|replace|broken|repair|lost/.test(text)) return "need";
  if (/savings|goal|invest/.test(text)) return "savings";
  return "want";
}

function walletId(wallet = {}) {
  return clean(wallet?.id ?? wallet?.wallet_id ?? wallet?.walletId ?? wallet?.key ?? wallet?.uuid ?? "");
}

function walletName(wallet = {}) {
  return clean(wallet?.name || wallet?.wallet_name || wallet?.title || wallet?.label || "Wallet");
}

function walletBalance(wallet = {}) {
  return toNumber(
    wallet?.derived_balance ??
      wallet?.balance ??
      wallet?.current_balance ??
      wallet?.wallet_balance ??
      wallet?.available_balance ??
      wallet?.starting_balance ??
      0,
  );
}

function isProtectedWallet(wallet = {}) {
  return /emergency|reserve|saving|goal/.test(
    `${walletName(wallet)} ${wallet?.type || ""}`.toLowerCase(),
  );
}

function getWalletOptions(context = {}, amount = 0) {
  const seen = new Set();
  return (Array.isArray(context?.wallets) ? context.wallets : [])
    .filter((wallet) => wallet && typeof wallet === "object" && !isProtectedWallet(wallet))
    .map((wallet) => {
      const id = walletId(wallet);
      const name = walletName(wallet);
      const balance = walletBalance(wallet);
      const key = id || name.toLowerCase();
      if (!key || seen.has(key)) return null;
      seen.add(key);
      return {
        id,
        name,
        balance,
        enough: Boolean(id) && balance >= toNumber(amount),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.enough) - Number(a.enough) || b.balance - a.balance);
}

function getPHDateString(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function createDecisionState() {
  return {
    phase: "choose",
    choice: "",
    explanation: "",
    walletId: "",
    busy: false,
    error: "",
    result: null,
  };
}

function saveLocalList(key, payload) {
  try {
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    const list = Array.isArray(current) ? current : [];
    list.unshift(payload);
    window.localStorage.setItem(key, JSON.stringify(list.slice(0, 30)));
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

function dispatchFinanceUpdates() {
  if (typeof window === "undefined") return;
  [
    "clara-expenses-updated",
    "clara-finance-updated",
    "clara-wallets-updated",
    "clara-wallet-transactions-updated",
    "clara-local-finance-updated",
  ].forEach((name) => window.dispatchEvent(new Event(name)));
}

export default function useClaraBuyCheckFlowV4({ assistantContext = {} } = {}) {
  const base = useClaraBuyCheckFlowV3({ assistantContext });
  const [decision, setDecision] = useState(createDecisionState);
  const amount = toNumber(base.state?.price);
  const walletOptions = useMemo(
    () => getWalletOptions(assistantContext, amount),
    [assistantContext, amount],
  );

  useEffect(() => {
    setDecision(createDecisionState());
  }, [base.state?.sessionId]);

  const startSession = useCallback(
    (sessionId = "") => {
      setDecision(createDecisionState());
      base.startSession(sessionId);
    },
    [base.startSession],
  );

  const clearSession = useCallback(() => {
    setDecision(createDecisionState());
    base.clearSession();
  }, [base.clearSession]);

  const checkAnother = useCallback(() => {
    setDecision(createDecisionState());
    base.checkAnother();
  }, [base.checkAnother]);

  const chooseFinalDecision = useCallback(
    (choice) => {
      if (base.state?.step !== "complete" || !["buy", "not_buy"].includes(choice)) return;
      const defaultWallet = choice === "buy" ? walletOptions.find((wallet) => wallet.enough)?.id || "" : "";
      setDecision({
        phase: "explain",
        choice,
        explanation: "",
        walletId: defaultWallet,
        busy: false,
        error: "",
        result: null,
      });
    },
    [base.state?.step, walletOptions],
  );

  const cancelFinalDecision = useCallback(() => {
    setDecision(createDecisionState());
  }, []);

  const setDecisionExplanation = useCallback((explanation) => {
    setDecision((current) => ({ ...current, explanation, error: "" }));
  }, []);

  const setDecisionWallet = useCallback((nextWalletId) => {
    setDecision((current) => ({ ...current, walletId: nextWalletId, error: "" }));
  }, []);

  const submitFinalDecision = useCallback(async () => {
    if (base.state?.step !== "complete" || decision.phase !== "explain" || decision.busy) return false;

    const explanation = clean(decision.explanation);
    if (!explanation) {
      setDecision((current) => ({
        ...current,
        error:
          current.choice === "buy"
            ? "Please explain why you will buy it."
            : "Please explain why you decided not to buy it.",
      }));
      return false;
    }

    const purchase = {
      item: clean(base.state?.item),
      price: amount,
      reason: clean(base.state?.reason),
      planningStatus: base.state?.planningStatus || "unplanned",
      category: base.state?.diagnosis?.contextPackage?.purchase?.category || normalizeCategory(base.state?.item),
    };
    const recommendation = clean(base.state?.diagnosis?.decision || "PAUSE");
    const createdAt = new Date().toISOString();

    setDecision((current) => ({ ...current, busy: true, error: "" }));

    try {
      if (decision.choice === "buy") {
        const wallet = walletOptions.find((option) => option.id === decision.walletId);
        if (!wallet) throw new Error("Choose a wallet before logging this expense.");
        if (!wallet.enough) throw new Error("The selected wallet does not have enough balance.");

        const localUserId = clean(
          assistantContext?.user?.id || assistantContext?.user?.email || "local-user",
        );
        const category = normalizeCategory(`${purchase.category} ${purchase.item}`);
        const planningStatus = purchase.planningStatus === "planned" ? "planned" : "unplanned";
        const payload = {
          amount,
          category,
          wallet_id: wallet.id,
          date: getPHDateString(),
          notes: `${purchase.item} — ${explanation}`,
          need_type: normalizeNeedType(`${purchase.reason} ${explanation}`, category),
          planning_status: planningStatus,
          unplanned_reason:
            planningStatus === "unplanned"
              ? `Buy Check decision — ${explanation}`
              : null,
          source: "local",
          syncStatus: "local_only",
        };

        await repoAddExpense(localUserId, payload);

        const memoryPayload = {
          source: "buy_check_buy",
          clara_recommendation: recommendation,
          user_action: "buy",
          explanation,
          wallet_id: wallet.id,
          wallet_name: wallet.name,
          purchase,
          created_at: createdAt,
        };
        saveLocalList("clara_buy_check_buy_explanations", memoryPayload);
        window.dispatchEvent(
          new CustomEvent("clara:buy-check-decision-memory", { detail: memoryPayload }),
        );
        dispatchFinanceUpdates();

        setDecision({
          ...decision,
          phase: "resolved",
          busy: false,
          error: "",
          result: {
            choice: "buy",
            title: "Expense logged",
            message: `${purchase.item} was added to your transactions and deducted from ${wallet.name}.`,
          },
        });
        return true;
      }

      const memoryPayload = {
        source: "buy_check_not_buy",
        clara_recommendation: recommendation,
        user_action: "not_buy",
        reflection: explanation,
        purchase,
        created_at: createdAt,
      };
      saveLocalList("clara_buy_check_not_buy_reflections", memoryPayload);
      window.dispatchEvent(
        new CustomEvent("clara:buy-check-decision-memory", { detail: memoryPayload }),
      );

      setDecision({
        ...decision,
        phase: "resolved",
        busy: false,
        error: "",
        result: {
          choice: "not_buy",
          title: "Reflection saved",
          message: "Your decision not to buy was saved so CLARA can remember this pattern.",
        },
      });
      return true;
    } catch (error) {
      setDecision((current) => ({
        ...current,
        busy: false,
        error: clean(error?.message || "Could not save your final decision."),
      }));
      return false;
    }
  }, [
    amount,
    assistantContext,
    base.state,
    decision,
    walletOptions,
  ]);

  return useMemo(
    () => ({
      ...base,
      state: {
        ...base.state,
        finalDecision: decision,
        walletOptions,
      },
      startSession,
      clearSession,
      checkAnother,
      chooseFinalDecision,
      cancelFinalDecision,
      setDecisionExplanation,
      setDecisionWallet,
      submitFinalDecision,
    }),
    [
      base,
      cancelFinalDecision,
      checkAnother,
      chooseFinalDecision,
      clearSession,
      decision,
      setDecisionExplanation,
      setDecisionWallet,
      startSession,
      submitFinalDecision,
      walletOptions,
    ],
  );
}
