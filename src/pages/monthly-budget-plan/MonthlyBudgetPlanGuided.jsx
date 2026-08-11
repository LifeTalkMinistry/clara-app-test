import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Edit3,
  Info,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import useDashboardMonthlyBudgetHeader from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetHeader";
import { getDebtObligations, getDebtTitle } from "@/lib/debtObligationStore";
import {
  addDays,
  amountValue,
  buildBudgetCategoryPayload,
  buildDerivedHeaderPayload,
  clearBudgetSetupDraft,
  dateOnly,
  firstAmount,
  getCycleWindow,
  isDateInsideCycle,
  isDerivedBudgetHeader,
  isValidCycleWindow,
  makeDraftItemId,
  normalizeBudgetText,
  readBudgetSetupDraft,
  saveProtectionSettings,
  todayDate,
  writeBudgetSetupDraft,
} from "@/lib/clara-derived-budget";

const card =
  "rounded-[28px] border border-cyan-100/12 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl";
const input =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-emerald-300/45 focus:bg-black/25";
const primaryButton =
  "flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-4 py-3.5 text-sm font-black text-[#03171a] shadow-[0_16px_34px_rgba(45,212,191,0.2)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton =
  "flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3.5 text-sm font-bold text-white/72 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";

const STEPS = ["Budget Items", "Protected Money", "Review", "Timeframe", "Activate"];
const SUGGESTIONS = ["Food", "Bills", "Rent", "Transport", "Groceries"];

const fmt = (value = 0) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountValue(value));

function fireBudgetEvents() {
  if (typeof window === "undefined") return;
  ["clara-budgets-updated", "clara-finance-updated", "clara-local-finance-updated"].forEach(
    (name) => window.dispatchEvent(new Event(name)),
  );
}

function isBudgetHeader(row = {}) {
  return Boolean(
    row?.is_plan_header === true ||
      row?.plan_type === "monthly_budget" ||
      normalizeBudgetText(row?.category) === "monthly budget" ||
      normalizeBudgetText(row?.budget_category) === "monthly budget" ||
      normalizeBudgetText(row?.type) === "monthly budget",
  );
}

function isInactiveRow(row = {}) {
  const status = normalizeBudgetText(row?.status);
  return Boolean(
    row?.is_active === false ||
      row?.active === false ||
      ["inactive", "archived", "deleted", "closed", "reset"].includes(status),
  );
}

function goalId(goal = {}, index = 0) {
  return String(goal.id || goal.goal_id || goal.key || `goal-${index}`);
}

function goalTitle(goal = {}, index = 0) {
  return String(goal.title || goal.name || goal.goal_name || `Savings Goal ${index + 1}`);
}

function goalTarget(goal = {}) {
  return firstAmount(
    goal.target_amount,
    goal.targetAmount,
    goal.goal_amount,
    goal.target,
    goal.goal,
  );
}

function goalSaved(goal = {}) {
  return firstAmount(
    goal.saved_amount,
    goal.current_amount,
    goal.saved,
    goal.current,
    goal.amount,
  );
}

function goalMonthly(goal = {}) {
  return firstAmount(
    goal.monthly_contribution,
    goal.monthlyContribution,
    goal.monthly_amount,
    goal.monthlyAmount,
    goal.target_monthly_amount,
    goal.recommended_monthly_amount,
  );
}

function isActiveGoal(goal = {}) {
  const status = normalizeBudgetText(goal.status || goal.goal_status || goal.state || "active");
  if (["done", "completed", "complete", "archived", "inactive"].includes(status)) return false;
  const target = goalTarget(goal);
  return target <= 0 || goalSaved(goal) < target;
}

function hasEmergencyFundSetup(emergencyFund) {
  if (!emergencyFund || typeof emergencyFund !== "object") return false;
  if (emergencyFund.resetAt || emergencyFund.reset_at) return false;
  const status = normalizeBudgetText(
    emergencyFund.status || emergencyFund.state || emergencyFund.setup_status || "",
  );
  if (["reset", "inactive", "archived", "deleted", "not setup", "not set"].includes(status)) {
    return false;
  }
  const setupFlag =
    emergencyFund.is_setup === true ||
    emergencyFund.isSetup === true ||
    emergencyFund.setup_complete === true ||
    emergencyFund.setupComplete === true ||
    emergencyFund.setupCompleted === true ||
    emergencyFund.is_configured === true ||
    emergencyFund.isConfigured === true;
  const setupStatus = ["active", "setup", "configured", "complete", "completed", "ready"].includes(
    status,
  );
  const target = firstAmount(
    emergencyFund.target_amount,
    emergencyFund.targetAmount,
    emergencyFund.target,
    emergencyFund.goal_amount,
  );
  const survival = firstAmount(
    emergencyFund.monthly_survival_cost,
    emergencyFund.monthlySurvivalCost,
    emergencyFund.survival_expense,
    emergencyFund.survivalExpense,
    emergencyFund.monthlyExpense,
    emergencyFund.monthly_expense,
  );
  const walletId = String(
    emergencyFund.linkedWalletId ||
      emergencyFund.linked_wallet_id ||
      emergencyFund.reserveWalletId ||
      emergencyFund.reserve_wallet_id ||
      emergencyFund.walletId ||
      emergencyFund.wallet_id ||
      "",
  ).trim();
  return setupFlag || setupStatus || target > 0 || survival > 0 || Boolean(walletId);
}

function monthlyDebtPayment(record = {}) {
  return firstAmount(
    record.monthlyDebt,
    record.monthlyPayment,
    record.monthly_payment,
    record.payment,
  );
}

function debtDueDate(record = {}) {
  return dateOnly(record.dueDate || record.due_date || "");
}

function isActiveDebt(record = {}) {
  const status = normalizeBudgetText(record.status || "active");
  return !["inactive", "archived", "deleted", "closed", "paid", "completed"].includes(status);
}

function QuestionHeader({ icon: Icon, eyebrow, title, body }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_12px_28px_rgba(34,211,238,0.1)]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/45">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black leading-tight tracking-[-0.035em]">{title}</h2>
        {body ? <p className="mt-2 text-sm font-semibold leading-6 text-white/52">{body}</p> : null}
      </div>
    </div>
  );
}

function InfoHint({ label, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-8 w-8 items-center justify-center rounded-full border transition active:scale-95 ${
          open
            ? "border-cyan-300/35 bg-cyan-400/15 text-cyan-100"
            : "border-white/10 bg-white/[0.045] text-white/45"
        }`}
        aria-label={`About ${label}`}
        aria-expanded={open}
      >
        <Info className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-20 w-[min(290px,calc(100vw-3.5rem))] rounded-2xl border border-cyan-200/15 bg-[#07172a]/98 p-3.5 text-xs font-semibold leading-5 text-white/68 shadow-[0_18px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        accent ? "border-emerald-300/18 bg-emerald-400/[0.08]" : "border-white/8 bg-black/12"
      }`}
    >
      <p
        className={`text-[8px] font-black uppercase tracking-[0.13em] ${
          accent ? "text-emerald-100/50" : "text-white/34"
        }`}
      >
        {label}
      </p>
      <p className={`mt-1 text-base font-black ${accent ? "text-emerald-100" : "text-white"}`}>{value}</p>
    </div>
  );
}

function ItemRow({ title, amount, note, tone = "regular", onEdit, onRemove }) {
  const toneClass =
    tone === "debt"
      ? "border-amber-300/14 bg-amber-400/[0.05]"
      : tone === "protected"
        ? "border-emerald-300/14 bg-emerald-400/[0.05]"
        : "border-white/8 bg-black/12";
  return (
    <div className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${toneClass}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{title}</p>
        {note ? <p className="mt-0.5 truncate text-[10px] font-semibold text-white/38">{note}</p> : null}
      </div>
      <p className="shrink-0 text-sm font-black text-white/84">{fmt(amount)}</p>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/55"
          aria-label={`Edit ${title}`}
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-rose-300/18 bg-rose-500/10 text-rose-100/75"
          aria-label={`Remove ${title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export default function MonthlyBudgetPlanGuided() {
  const navigate = useNavigate();
  const { user } = useUserRole();
  const {
    budgets = [],
    savingsGoals = [],
    emergencyFund = null,
    addBudget,
    updateBudget,
    refreshData,
    loading,
  } = useFinancialData(user);
  const { monthlyBudgetHeader } = useDashboardMonthlyBudgetHeader({ budgets, includeDraft: true });
  const [draft, setDraft] = useState(() => readBudgetSetupDraft());
  const [itemName, setItemName] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [editingItemId, setEditingItemId] = useState("");
  const [debts, setDebts] = useState([]);
  const [debtLoading, setDebtLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const step = draft.step;
  const localUserId = String(user?.id || user?.email || "local-user");
  const activeGoals = useMemo(
    () => (Array.isArray(savingsGoals) ? savingsGoals : []).filter(isActiveGoal),
    [savingsGoals],
  );
  const emergencyAvailable = useMemo(() => hasEmergencyFundSetup(emergencyFund), [emergencyFund]);

  useEffect(() => {
    const headerDraftId = String(monthlyBudgetHeader?.setup_draft_id || "").trim();
    if (!headerDraftId || !isDerivedBudgetHeader(monthlyBudgetHeader) || headerDraftId === draft.draftId) return;
    setDraft((current) =>
      writeBudgetSetupDraft({
        ...current,
        draftId: headerDraftId,
        cycleType: monthlyBudgetHeader?.cycle_type || current.cycleType,
        cycleStart: monthlyBudgetHeader?.cycle_start || current.cycleStart,
        cycleEnd: monthlyBudgetHeader?.cycle_end || current.cycleEnd,
      }),
    );
  }, [draft.draftId, monthlyBudgetHeader]);

  useEffect(() => {
    let cancelled = false;
    setDebtLoading(true);
    getDebtObligations(localUserId)
      .then((records) => {
        if (cancelled) return;
        setDebts((Array.isArray(records) ? records : []).filter(isActiveDebt));
      })
      .catch((error) => {
        console.error("CLARA could not load debt obligations:", error);
        if (!cancelled) setDebts([]);
      })
      .finally(() => {
        if (!cancelled) setDebtLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [localUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__CLARA_BUDGET_PROTECTION_CONTEXT = { savingsGoals, emergencyFund };
  }, [emergencyFund, savingsGoals]);

  useEffect(() => {
    writeBudgetSetupDraft(draft);
  }, [draft]);

  const regularTotal = useMemo(
    () => draft.items.reduce((sum, item) => sum + Math.max(0, amountValue(item.amount)), 0),
    [draft.items],
  );
  const savingsTotal = useMemo(
    () =>
      draft.selectedSavingsGoalIds.reduce(
        (sum, id) => sum + Math.max(0, amountValue(draft.savingsGoalAmounts?.[id])),
        0,
      ),
    [draft.savingsGoalAmounts, draft.selectedSavingsGoalIds],
  );
  const emergencyTotal = draft.includeEmergencyFund ? Math.max(0, amountValue(draft.emergencyFundAmount)) : 0;
  const protectedTotal = emergencyTotal + savingsTotal;
  const selectedDebtRecords = useMemo(() => {
    const selected = new Set(draft.selectedDebtIds.map(String));
    return debts.filter((debt) => selected.has(String(debt.id)) && monthlyDebtPayment(debt) > 0);
  }, [debts, draft.selectedDebtIds]);
  const includedDebtRecords = useMemo(
    () =>
      selectedDebtRecords.filter(
        (debt) => draft.outsideDueConfirmed?.[String(debt.id)] !== false,
      ),
    [draft.outsideDueConfirmed, selectedDebtRecords],
  );
  const debtTotal = useMemo(
    () => includedDebtRecords.reduce((sum, debt) => sum + monthlyDebtPayment(debt), 0),
    [includedDebtRecords],
  );
  const calculatedTotal = regularTotal + protectedTotal + debtTotal;
  const cycle = useMemo(
    () => getCycleWindow(draft.cycleType, draft.cycleStart, draft.cycleEnd),
    [draft.cycleEnd, draft.cycleStart, draft.cycleType],
  );

  const updateDraft = (updates) => {
    setDraft((current) => ({
      ...current,
      ...(typeof updates === "function" ? updates(current) : updates),
      updatedAt: new Date().toISOString(),
    }));
    setNotice("");
  };

  const setStep = (nextStep) => updateDraft({ step: Math.min(5, Math.max(1, nextStep)) });

  const resetItemForm = () => {
    setItemName("");
    setItemAmount("");
    setEditingItemId("");
  };

  const saveDraftItem = () => {
    const title = String(itemName || "").trim();
    const amount = amountValue(itemAmount);
    if (!title) {
      setNotice("Name the budget item first.");
      return;
    }
    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }
    const duplicate = draft.items.find(
      (item) =>
        item.id !== editingItemId && normalizeBudgetText(item.title) === normalizeBudgetText(title),
    );
    if (duplicate) {
      setNotice(`${duplicate.title} is already in your budget. Edit the existing item instead.`);
      return;
    }
    updateDraft((current) => ({
      items: editingItemId
        ? current.items.map((item) =>
            item.id === editingItemId ? { ...item, title, amount } : item,
          )
        : [...current.items, { id: makeDraftItemId(), title, amount }],
    }));
    resetItemForm();
  };

  const editDraftItem = (item) => {
    setEditingItemId(item.id);
    setItemName(item.title);
    setItemAmount(String(item.amount || ""));
    setNotice("");
  };

  const removeDraftItem = (item) => {
    updateDraft((current) => ({ items: current.items.filter((entry) => entry.id !== item.id) }));
    if (editingItemId === item.id) resetItemForm();
  };

  const toggleSavingsGoal = (id, goal) => {
    updateDraft((current) => {
      const selected = new Set(current.selectedSavingsGoalIds);
      const amounts = { ...(current.savingsGoalAmounts || {}) };
      if (selected.has(id)) {
        selected.delete(id);
        delete amounts[id];
      } else {
        selected.add(id);
        amounts[id] = amountValue(amounts[id]) || goalMonthly(goal) || 0;
      }
      return { selectedSavingsGoalIds: [...selected], savingsGoalAmounts: amounts };
    });
  };

  const debtAlreadyRepresented = (debt) => {
    const id = String(debt?.id || "");
    const title = normalizeBudgetText(getDebtTitle(debt));
    return draft.items.some(
      (item) =>
        (item.sourceDebtId && String(item.sourceDebtId) === id) ||
        (title && normalizeBudgetText(item.title) === title),
    );
  };

  useEffect(() => {
    const eligibleIds = debts
      .filter((debt) => monthlyDebtPayment(debt) > 0 && !debtAlreadyRepresented(debt))
      .map((debt) => String(debt.id || ""))
      .filter(Boolean);

    setDraft((current) => {
      const currentIds = current.selectedDebtIds.map(String);
      const sameSelection =
        currentIds.length === eligibleIds.length &&
        currentIds.every((id, index) => id === eligibleIds[index]);
      if (sameSelection) return current;

      const eligibleSet = new Set(eligibleIds);
      const nextOutsideDueConfirmed = Object.fromEntries(
        Object.entries(current.outsideDueConfirmed || {}).filter(([id]) => eligibleSet.has(String(id))),
      );

      return {
        ...current,
        selectedDebtIds: eligibleIds,
        outsideDueConfirmed: nextOutsideDueConfirmed,
        updatedAt: new Date().toISOString(),
      };
    });
  }, [debts, draft.items]);

  const toggleDebt = (debt) => {
    const id = String(debt.id || "");
    if (!id || monthlyDebtPayment(debt) <= 0) return;
    if (debtAlreadyRepresented(debt) && !draft.selectedDebtIds.includes(id)) {
      setNotice(`${getDebtTitle(debt)} already appears as a regular budget item, so CLARA will not count it twice.`);
      return;
    }
    updateDraft((current) => {
      const selected = new Set(current.selectedDebtIds);
      const outsideDueConfirmed = { ...(current.outsideDueConfirmed || {}) };
      if (selected.has(id)) {
        selected.delete(id);
        delete outsideDueConfirmed[id];
      } else {
        selected.add(id);
      }
      return { selectedDebtIds: [...selected], outsideDueConfirmed };
    });
  };

  const outsideDueDebts = useMemo(
    () =>
      selectedDebtRecords.filter((debt) => {
        const due = debtDueDate(debt);
        return due && isValidCycleWindow(cycle) && !isDateInsideCycle(due, cycle);
      }),
    [cycle, selectedDebtRecords],
  );
  const insideDueDebts = useMemo(
    () =>
      includedDebtRecords.filter((debt) => {
        const due = debtDueDate(debt);
        return due && isValidCycleWindow(cycle) && isDateInsideCycle(due, cycle);
      }),
    [cycle, includedDebtRecords],
  );

  const continueFromTimeframe = () => {
    if (!isValidCycleWindow(cycle)) {
      setNotice("Choose a valid start and end date for this budget period.");
      return;
    }
    const unresolved = outsideDueDebts.find((debt) => {
      const decision = draft.outsideDueConfirmed?.[String(debt.id)];
      return decision !== true && decision !== false;
    });
    if (unresolved) {
      setNotice(`Confirm whether to keep ${getDebtTitle(unresolved)} in this budget period.`);
      return;
    }
    setStep(5);
  };

  const buildProtectionSettings = () => ({
    setupCompleted: true,
    includeEmergencyFund: emergencyAvailable && draft.includeEmergencyFund && emergencyTotal > 0,
    emergencyFundContributionMode: "fixed",
    emergencyFundMonthlyAmount: emergencyAvailable && draft.includeEmergencyFund ? emergencyTotal : 0,
    includeSavingsGoals: draft.selectedSavingsGoalIds.length > 0 && savingsTotal > 0,
    savingsGoalMode: draft.selectedSavingsGoalIds.length ? "selected" : "none",
    selectedSavingsGoalIds: draft.selectedSavingsGoalIds,
    savingsContributionMode: "fixed",
    savingsGoalMonthlyAmounts: draft.savingsGoalAmounts,
  });

  const activateBudget = async () => {
    if (!isValidCycleWindow(cycle)) {
      setNotice("Choose a valid timeframe before activation.");
      return;
    }
    if (calculatedTotal <= 0) {
      setNotice("Add at least one budget item, protected amount, or confirmed obligation.");
      return;
    }
    const invalidItem = draft.items.find((item) => !item.title || amountValue(item.amount) <= 0);
    if (invalidItem) {
      setNotice("Review your regular budget items before activation.");
      setStep(1);
      return;
    }
    const duplicateDebtId = includedDebtRecords.find((debt) => debtAlreadyRepresented(debt));
    if (duplicateDebtId) {
      setNotice(`${getDebtTitle(duplicateDebtId)} is already represented by a regular item. Remove one copy first.`);
      setStep(1);
      return;
    }

    const draftHeader = (Array.isArray(budgets) ? budgets : []).find(
      (row) =>
        isBudgetHeader(row) &&
        !isInactiveRow(row) &&
        isDerivedBudgetHeader(row) &&
        String(row?.setup_draft_id || "") === draft.draftId,
    );
    const existingDraftRows = (Array.isArray(budgets) ? budgets : []).filter(
      (row) =>
        !isBudgetHeader(row) &&
        !isInactiveRow(row) &&
        String(row?.setup_draft_id || "") === draft.draftId,
    );

    const desiredRows = [
      ...draft.items.map((item, index) => ({
        key: item.id,
        title: item.title,
        amount: amountValue(item.amount),
        order: index,
        commitment: null,
      })),
      ...includedDebtRecords.map((debt, index) => ({
        key: `debt-${debt.id}`,
        title: getDebtTitle(debt),
        amount: monthlyDebtPayment(debt),
        order: draft.items.length + index,
        commitment: {
          id: String(debt.id),
          title: getDebtTitle(debt),
          dueDate: debtDueDate(debt),
        },
      })),
    ];

    try {
      setSaving(true);
      setNotice("");
      const draftPayload = buildDerivedHeaderPayload({
        total: calculatedTotal,
        cycle,
        user,
        done: false,
        current: draftHeader || {},
        draftId: draft.draftId,
      });
      const savedHeader = draftHeader?.id
        ? await updateBudget?.(draftHeader.id, draftPayload)
        : await addBudget?.(draftPayload);
      const headerId = draftHeader?.id || savedHeader?.id || savedHeader?.data?.id || savedHeader?.record?.id;

      for (const row of desiredRows) {
        const existing = existingDraftRows.find(
          (item) => String(item?.setup_item_id || "") === String(row.key),
        );
        const payload = buildBudgetCategoryPayload({
          title: row.title,
          amount: row.amount,
          order: row.order,
          user,
          cycle,
          current: existing || {},
          draftId: draft.draftId,
          itemId: row.key,
          commitment: row.commitment,
        });
        if (existing?.id) await updateBudget?.(existing.id, payload);
        else await addBudget?.(payload);
      }

      const desiredKeys = new Set(desiredRows.map((row) => String(row.key)));
      for (const stale of existingDraftRows) {
        if (!stale?.id || desiredKeys.has(String(stale?.setup_item_id || ""))) continue;
        await updateBudget?.(stale.id, {
          ...stale,
          is_active: false,
          active: false,
          status: "archived",
          archived_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      saveProtectionSettings(buildProtectionSettings());

      if (!headerId) {
        throw new Error("CLARA saved the draft but could not resolve its header ID for activation.");
      }
      await updateBudget?.(
        headerId,
        buildDerivedHeaderPayload({
          total: calculatedTotal,
          cycle,
          user,
          done: true,
          current: { ...(draftHeader || {}), ...(savedHeader || {}), id: headerId },
          draftId: draft.draftId,
        }),
      );
      await refreshData?.();
      fireBudgetEvents();
      clearBudgetSetupDraft();
      navigate("/dashboard");
    } catch (error) {
      setNotice(error?.message || "CLARA could not activate this budget yet. Your setup draft was kept.");
    } finally {
      setSaving(false);
    }
  };

  const cancelDraft = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Discard this unfinished budget setup?");
      if (!confirmed) return;
    }
    try {
      setSaving(true);
      setNotice("");
      const now = new Date().toISOString();
      const draftRows = (Array.isArray(budgets) ? budgets : []).filter(
        (row) =>
          !isInactiveRow(row) &&
          String(row?.setup_draft_id || "") === draft.draftId,
      );
      for (const row of draftRows) {
        if (!row?.id) continue;
        await updateBudget?.(row.id, {
          ...row,
          is_active: false,
          active: false,
          status: "archived",
          archived_at: now,
          updated_at: now,
        });
      }
      clearBudgetSetupDraft();
      await refreshData?.();
      fireBudgetEvents();
      navigate("/dashboard");
    } catch (error) {
      setNotice(error?.message || "CLARA could not discard this setup yet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100svh] w-full bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.24),transparent_38%),linear-gradient(135deg,#04171e,#071430_48%,#170d36)] px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(0.7rem+env(safe-area-inset-top))] text-white">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-3">
        <header className="sticky top-0 z-30 -mx-4 border-b border-white/8 bg-[#06101d]/92 px-4 pb-2.5 pt-[calc(0.7rem+env(safe-area-inset-top))]">
          <div className="mx-auto flex max-w-[430px] items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/80"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black tracking-[-0.035em]">Budget Setup</h1>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/55">
                Step {step} of 5 · {STEPS[step - 1]}
              </p>
            </div>
            <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold text-amber-100">
              Draft
            </span>
          </div>
        </header>

        {step === 1 ? (
          <section className={`${card} p-4`}>
            <div className="rounded-2xl border border-emerald-300/18 bg-emerald-400/[0.07] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.13em] text-emerald-100/48">
                    Current planned total
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-100">{fmt(regularTotal)}</p>
                </div>
                <InfoHint label="budget items">
                  Add each expense or responsibility one at a time. CLARA updates this total as you add items, with no preset ceiling.
                </InfoHint>
              </div>
            </div>

            <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-black/12 p-3.5">
              <input
                type="text"
                value={itemName}
                onChange={(event) => {
                  setItemName(event.target.value);
                  setNotice("");
                }}
                placeholder="Example: Food"
                className={input}
              />
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.filter(
                  (suggestion) =>
                    !draft.items.some(
                      (item) => normalizeBudgetText(item.title) === normalizeBudgetText(suggestion),
                    ),
                ).map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setItemName(suggestion)}
                    className="rounded-full border border-white/9 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-white/55"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-emerald-200/80">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={itemAmount}
                  onChange={(event) => {
                    setItemAmount(event.target.value);
                    setNotice("");
                  }}
                  placeholder="Planned amount"
                  className={`${input} pl-10 text-lg font-black`}
                />
              </div>
              <div className="grid grid-cols-[0.75fr_1.25fr] gap-2">
                {editingItemId ? (
                  <button type="button" onClick={resetItemForm} className={secondaryButton}>
                    Cancel
                  </button>
                ) : (
                  <div />
                )}
                <button type="button" onClick={saveDraftItem} className={primaryButton}>
                  <Plus className="h-4 w-4" />
                  {editingItemId ? "Update item" : "Add item"}
                </button>
              </div>
            </div>

            {draft.items.length ? (
              <div className="mt-5 space-y-2 border-t border-white/8 pt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">
                  Your budget items
                </p>
                {draft.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    title={item.title}
                    amount={item.amount}
                    onEdit={() => editDraftItem(item)}
                    onRemove={() => removeDraftItem(item)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/8 bg-black/12 p-4 text-sm font-semibold leading-6 text-white/45">
                You can continue without a regular item if this budget will contain only protected money or a saved obligation.
              </div>
            )}

            <button type="button" onClick={() => setStep(2)} className={`${primaryButton} mt-4`}>
              Continue to protected money
              <ChevronRight className="h-4 w-4" />
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className={`${card} p-4`}>
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.05] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/45">
                    Protected money
                  </p>
                  <InfoHint label="protected money">
                    Choose which savings goals and emergency reserves you want to protect in this budget. Only amounts you include here are added to the budget total.
                  </InfoHint>
                </div>
                {emergencyAvailable ? (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-black/12 p-3.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateDraft((current) => ({
                          includeEmergencyFund: !current.includeEmergencyFund,
                          emergencyFundAmount: current.includeEmergencyFund
                            ? 0
                            : amountValue(current.emergencyFundAmount),
                        }))
                      }
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <span>
                        <span className="block text-sm font-black">Emergency Fund</span>
                        <span className="mt-1 block text-xs font-semibold text-white/42">
                          Reserve part of this budget for emergencies.
                        </span>
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                          draft.includeEmergencyFund
                            ? "border-emerald-300/30 bg-emerald-400/12 text-emerald-100"
                            : "border-white/10 bg-white/[0.04] text-white/45"
                        }`}
                      >
                        {draft.includeEmergencyFund ? "Included" : "Not included"}
                      </span>
                    </button>
                    {draft.includeEmergencyFund ? (
                      <div className="relative mt-3">
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-emerald-200/80">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          inputMode="decimal"
                          value={draft.emergencyFundAmount || ""}
                          onChange={(event) => updateDraft({ emergencyFundAmount: event.target.value })}
                          placeholder="Amount to protect"
                          className={`${input} pl-10`}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-semibold leading-5 text-white/42">
                    No Emergency Fund setup was detected. CLARA will not invent a reserve amount.
                  </p>
                )}

                {activeGoals.length ? (
                  <div className="mt-3 space-y-2">
                    {activeGoals.map((goal, index) => {
                      const id = goalId(goal, index);
                      const selected = draft.selectedSavingsGoalIds.includes(id);
                      return (
                        <div key={id} className="rounded-2xl border border-white/8 bg-black/12 p-3.5">
                          <button
                            type="button"
                            onClick={() => toggleSavingsGoal(id, goal)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-black">{goalTitle(goal, index)}</span>
                              <span className="mt-1 block text-xs font-semibold text-white/42">
                                {goalTarget(goal) > 0
                                  ? `${fmt(goalSaved(goal))} of ${fmt(goalTarget(goal))}`
                                  : "Active savings goal"}
                              </span>
                            </span>
                            <span
                              className={`rounded-full border px-3 py-1 text-[10px] font-black ${
                                selected
                                  ? "border-emerald-300/30 bg-emerald-400/12 text-emerald-100"
                                  : "border-white/10 bg-white/[0.04] text-white/45"
                              }`}
                            >
                              {selected ? "Included" : "Not included"}
                            </span>
                          </button>
                          {selected ? (
                            <div className="relative mt-3">
                              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base font-black text-emerald-200/80">
                                ₱
                              </span>
                              <input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={draft.savingsGoalAmounts?.[id] || ""}
                                onChange={(event) =>
                                  updateDraft((current) => ({
                                    savingsGoalAmounts: {
                                      ...(current.savingsGoalAmounts || {}),
                                      [id]: event.target.value,
                                    },
                                  }))
                                }
                                placeholder="Amount to protect"
                                className={`${input} pl-10`}
                              />
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-semibold leading-5 text-white/42">
                    No active Savings Goal was detected.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStep(1)} className={secondaryButton}>
                Back to items
              </button>
              <button type="button" onClick={() => setStep(3)} className={primaryButton}>
                Review total
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section className={`${card} p-4`}>
            <QuestionHeader
              icon={Wallet}
              eyebrow="Step 3"
              title="Your budget is taking shape"
              body={`Based on everything you added, this budget currently requires ${fmt(calculatedTotal)}.`}
            />

            <div className="mt-5 grid grid-cols-2 gap-2">
              <SummaryStat label="Regular items" value={fmt(regularTotal)} />
              <SummaryStat label="Protected money" value={fmt(protectedTotal)} />
              <SummaryStat label="Debt & obligations" value={fmt(debtTotal)} />
              <SummaryStat label="Total budget needed" value={fmt(calculatedTotal)} accent />
            </div>

            <div className="mt-5 space-y-4 border-t border-white/8 pt-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Regular items</p>
                  <button type="button" onClick={() => setStep(1)} className="text-xs font-black text-cyan-100/65">
                    Edit
                  </button>
                </div>
                <div className="space-y-2">
                  {draft.items.length ? (
                    draft.items.map((item) => <ItemRow key={item.id} title={item.title} amount={item.amount} />)
                  ) : (
                    <p className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-xs font-semibold text-white/38">
                      No regular items added.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/45">
                    Protected money
                  </p>
                  <button type="button" onClick={() => setStep(2)} className="text-xs font-black text-cyan-100/65">
                    Edit
                  </button>
                </div>
                <div className="space-y-2">
                  {emergencyTotal > 0 ? (
                    <ItemRow title="Emergency Fund" amount={emergencyTotal} tone="protected" />
                  ) : null}
                  {activeGoals
                    .map((goal, index) => ({ goal, index, id: goalId(goal, index) }))
                    .filter((item) => draft.selectedSavingsGoalIds.includes(item.id))
                    .map((item) => (
                      <ItemRow
                        key={item.id}
                        title={goalTitle(item.goal, item.index)}
                        amount={draft.savingsGoalAmounts?.[item.id] || 0}
                        tone="protected"
                      />
                    ))}
                  {protectedTotal <= 0 ? (
                    <p className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-xs font-semibold text-white/38">
                      No protected money selected.
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-100/45">
                    Debt & obligations
                  </p>
                  <button type="button" onClick={() => setStep(4)} className="text-xs font-black text-cyan-100/65">
                    Timeframe
                  </button>
                </div>
                <div className="space-y-2">
                  {includedDebtRecords.length ? (
                    includedDebtRecords.map((debt) => (
                      <ItemRow
                        key={debt.id}
                        title={getDebtTitle(debt)}
                        amount={monthlyDebtPayment(debt)}
                        note={debtDueDate(debt) ? `Due ${debtDueDate(debt)}` : "Monthly obligation"}
                        tone="debt"
                      />
                    ))
                  ) : (
                    <p className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-xs font-semibold text-white/38">
                      No saved obligation payment is included.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStep(2)} className={secondaryButton}>
                Back
              </button>
              <button type="button" onClick={() => setStep(4)} className={primaryButton}>
                Set timeframe
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className={`${card} p-4`}>
            <QuestionHeader
              icon={CalendarDays}
              eyebrow="Step 4"
              title="How long should this budget cover?"
              body="The timeframe gives meaning to the total you built. It will not change or prorate your amounts automatically."
            />

            <div className="mt-5 grid grid-cols-2 gap-2">
              {[
                ["weekly", "Weekly", "7 days"],
                ["biweekly", "Every 2 weeks", "14 days"],
                ["monthly", "Monthly", "Calendar month"],
                ["custom", "Custom", "Choose dates"],
              ].map(([key, label, note]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    const nextCycle = getCycleWindow(key, todayDate(), addDays(todayDate(), 6));
                    updateDraft({
                      cycleType: key,
                      cycleStart: nextCycle.start,
                      cycleEnd: nextCycle.end,
                      outsideDueConfirmed: {},
                    });
                  }}
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    draft.cycleType === key
                      ? "border-emerald-300/35 bg-emerald-400/12"
                      : "border-white/9 bg-white/[0.035]"
                  }`}
                >
                  <span
                    className={`block text-sm font-black ${
                      draft.cycleType === key ? "text-emerald-100" : "text-white/72"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="mt-1 block text-[11px] font-semibold text-white/35">{note}</span>
                </button>
              ))}
            </div>

            {draft.cycleType !== "monthly" ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-black/12 p-3.5">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.13em] text-white/34">
                    Starts on
                  </label>
                  <input
                    type="date"
                    value={draft.cycleStart}
                    onChange={(event) => {
                      const next = getCycleWindow(draft.cycleType, event.target.value, draft.cycleEnd);
                      updateDraft({
                        cycleStart: next.start,
                        cycleEnd: next.end,
                        outsideDueConfirmed: {},
                      });
                    }}
                    className={`${input} mt-2`}
                  />
                </div>
                {draft.cycleType === "custom" ? (
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-[0.13em] text-white/34">
                      Ends on
                    </label>
                    <input
                      type="date"
                      value={draft.cycleEnd}
                      onChange={(event) =>
                        updateDraft({ cycleEnd: event.target.value, outsideDueConfirmed: {} })
                      }
                      className={`${input} mt-2`}
                    />
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-white/50">This period ends on {cycle.end}.</p>
                )}
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-cyan-300/14 bg-cyan-400/[0.05] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/45">
                Relationship to your total
              </p>
              <p className="mt-1 text-sm font-black text-cyan-50">
                {fmt(calculatedTotal)} for {cycle.start} to {cycle.end}
              </p>
              <p className="mt-2 text-xs font-semibold leading-5 text-cyan-50/50">
                The same amount can mean something very different over seven days versus a full month. CLARA records both together.
              </p>
            </div>

            {insideDueDebts.length ? (
              <div className="mt-4 space-y-2">
                {insideDueDebts.map((debt) => (
                  <div
                    key={debt.id}
                    className="rounded-2xl border border-emerald-300/16 bg-emerald-400/[0.06] px-4 py-3"
                  >
                    <p className="text-sm font-black text-emerald-50">
                      {getDebtTitle(debt)} falls inside this budget period
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-emerald-50/55">
                      Its saved due date is {debtDueDate(debt)}, between {cycle.start} and {cycle.end}.
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

            {outsideDueDebts.length ? (
              <div className="mt-4 space-y-2">
                {outsideDueDebts.map((debt) => {
                  const id = String(debt.id);
                  const confirmed = draft.outsideDueConfirmed?.[id] === true;
                  const removed = draft.outsideDueConfirmed?.[id] === false;
                  return (
                    <div key={id} className="rounded-2xl border border-amber-300/18 bg-amber-400/[0.08] p-4">
                      <p className="text-sm font-black text-amber-50">
                        {getDebtTitle(debt)} is due outside this period
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-amber-50/55">
                        Its saved due date is {debtDueDate(debt)}, outside {cycle.start} to {cycle.end}. Keep it if you are budgeting early.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft((current) => ({
                              outsideDueConfirmed: {
                                ...(current.outsideDueConfirmed || {}),
                                [id]: false,
                              },
                            }))
                          }
                          className={`${secondaryButton} ${
                            removed ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : ""
                          }`}
                        >
                          Remove payment
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft((current) => ({
                              outsideDueConfirmed: {
                                ...(current.outsideDueConfirmed || {}),
                                [id]: true,
                              },
                            }))
                          }
                          className={`${secondaryButton} ${
                            confirmed ? "border-emerald-300/30 bg-emerald-400/12 text-emerald-100" : ""
                          }`}
                        >
                          Keep included
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setStep(3)} className={secondaryButton}>
                Back
              </button>
              <button type="button" onClick={continueFromTimeframe} className={primaryButton}>
                Final summary
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {step === 5 ? (
          <section className={`${card} overflow-hidden`}>
            <div className="border-b border-white/8 bg-gradient-to-br from-cyan-400/[0.09] via-transparent to-violet-400/[0.08] p-4">
              <QuestionHeader
                icon={CheckCircle2}
                eyebrow="Step 5"
                title={`You created a ${fmt(calculatedTotal)} ${cycle.label.toLowerCase()} budget`}
                body={`This budget is intended to cover ${cycle.start} to ${cycle.end}.`}
              />
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <SummaryStat label="Regular items" value={fmt(regularTotal)} />
                <SummaryStat label="Protected money" value={fmt(protectedTotal)} />
                <SummaryStat label="Debt & obligations" value={fmt(debtTotal)} />
                <SummaryStat label="Calculated total" value={fmt(calculatedTotal)} accent />
              </div>

              <div className="mt-4 rounded-2xl border border-white/8 bg-black/12 p-4 text-sm font-semibold leading-6 text-white/58">
                It includes {fmt(regularTotal)} in regular budget items, {fmt(protectedTotal)} in protected money, and {fmt(debtTotal)} in debt or obligation payments.
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setStep(1)} className={secondaryButton}>
                  Items
                </button>
                <button type="button" onClick={() => setStep(2)} className={secondaryButton}>
                  Protected
                </button>
                <button type="button" onClick={() => setStep(4)} className={secondaryButton}>
                  Timeframe
                </button>
              </div>

              <button
                type="button"
                onClick={activateBudget}
                disabled={saving || loading || calculatedTotal <= 0}
                className={`${primaryButton} mt-4`}
              >
                {saving ? "Activating…" : "Activate budget"}
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>
          </section>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold leading-5 text-amber-50">
            {notice}
          </div>
        ) : null}

        <button
          type="button"
          onClick={cancelDraft}
          disabled={saving}
          className="w-full py-2 text-xs font-bold text-white/32 disabled:opacity-40"
        >
          {saving ? "Working…" : "Discard unfinished setup"}
        </button>
      </div>
    </div>
  );
}