import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Edit3,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import useDashboardManualExpenseBudgetOptions from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions";
import useDashboardMonthlyBudgetHeader from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetHeader";
import useDashboardMonthlyBudgetPlan from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan";
import { resetMonthlyBudgetCycle } from "@/lib/clara-budget-cycle-reset";
import {
  amountValue,
  buildBudgetCategoryPayload,
  buildDerivedHeaderPayload,
  createBudgetSetupDraft,
  firstAmount,
  getCycleWindow,
  isDebtCommitment,
  isDerivedBudgetHeader,
  normalizeBudgetText,
  saveProtectionSettings,
  summarizeBudgetRows,
  writeBudgetSetupDraft,
} from "@/lib/clara-derived-budget";
import MonthlyBudgetPlanGuided from "./monthly-budget-plan/MonthlyBudgetPlanGuided";

const card =
  "rounded-[26px] border border-cyan-100/12 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl";
const input =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-emerald-300/45";
const primaryButton =
  "flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-4 py-3 text-sm font-black text-[#03171a] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton =
  "flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/72 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";

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

function cycleFromHeader(header = {}, plan = {}) {
  return getCycleWindow(
    header?.cycle_type || header?.budget_cycle || plan?.cycle_type || "monthly",
    header?.cycle_start || plan?.cycle_start,
    header?.cycle_end || plan?.cycle_end,
  );
}

function legacyHeaderPayload({ amount, header, cycle, user }) {
  const now = new Date().toISOString();
  const title = `${cycle.label} Spending Plan`;
  return {
    ...(header || {}),
    title,
    name: title,
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    type: "monthly_budget",
    plan_type: "monthly_budget",
    is_plan_header: true,
    budget_cycle: cycle.type,
    cycle_type: cycle.type,
    cycle_start: cycle.start,
    cycle_end: cycle.end,
    period_start: cycle.start,
    period_end: cycle.end,
    declared_amount: amount,
    declared_budget: amount,
    monthly_budget_amount: amount,
    total_declared_budget: amount,
    total_budget: amount,
    amount,
    is_complete: true,
    complete: true,
    status: "active",
    is_active: true,
    active: true,
    updated_at: now,
    created_by: user?.email || header?.created_by || null,
    email: user?.email || header?.email || null,
    user_id: user?.id || header?.user_id || null,
  };
}


function legacyCategoryPayload({ title, amount, order = 0, user, cycle, current = {} }) {
  const now = new Date().toISOString();
  const base = current?.budget || current || {};
  const cleanTitle = String(title || "Budget item").trim() || "Budget item";
  const numericAmount = Math.max(0, amountValue(amount));
  return {
    ...base,
    title: cleanTitle,
    name: cleanTitle,
    category: cleanTitle,
    budget_category: cleanTitle,
    allocated: numericAmount,
    allocated_amount: numericAmount,
    budget_amount: numericAmount,
    total_budget: numericAmount,
    amount: numericAmount,
    sort_order: order,
    display_order: order,
    position: order,
    budget_cycle: cycle.type,
    cycle_type: cycle.type,
    cycle_start: cycle.start,
    cycle_end: cycle.end,
    period_start: cycle.start,
    period_end: cycle.end,
    is_active: true,
    active: true,
    status: "active",
    updated_at: now,
    created_by: user?.email || base?.created_by || null,
    email: user?.email || base?.email || null,
    user_id: user?.id || base?.user_id || null,
  };
}

function useLockedBudgetViewport(pageRef) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    const node = pageRef.current;
    if (node) {
      node.style.overflowY = "auto";
      node.style.overscrollBehaviorY = "contain";
      node.style.WebkitOverflowScrolling = "touch";
    }
    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      body.style.overflow = previous.bodyOverflow;
      body.style.overscrollBehavior = previous.bodyOverscroll;
    };
  }, [pageRef]);
}

function Stat({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        accent ? "border-emerald-300/16 bg-emerald-400/[0.07]" : "border-white/8 bg-black/12"
      }`}
    >
      <p
        className={`text-[9px] font-black uppercase tracking-[0.13em] ${
          accent ? "text-emerald-100/45" : "text-white/34"
        }`}
      >
        {label}
      </p>
      <p className={`mt-1 text-lg font-black ${accent ? "text-emerald-100" : "text-white"}`}>{value}</p>
    </div>
  );
}

function BudgetRow({ row, editing, draftName, draftAmount, onStartEdit, onCancelEdit, onSave, onRemove, busy }) {
  const debt = isDebtCommitment(row);
  if (editing) {
    return (
      <div className="rounded-2xl border border-cyan-300/18 bg-cyan-400/[0.06] p-3">
        <input
          type="text"
          value={draftName.value}
          onChange={(event) => draftName.set(event.target.value)}
          className={input}
          placeholder="Budget item"
        />
        <input
          type="number"
          min="0"
          inputMode="decimal"
          value={draftAmount.value}
          onChange={(event) => draftAmount.set(event.target.value)}
          className={`${input} mt-2`}
          placeholder="Amount"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancelEdit} className={secondaryButton}>
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button type="button" onClick={onSave} disabled={busy} className={primaryButton}>
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 py-3 ${
        debt ? "border-amber-300/14 bg-amber-400/[0.05]" : "border-white/8 bg-black/12"
      }`}
    >
      {debt ? (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-100/75">
          <CreditCard className="h-4 w-4" />
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{row.title}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-white/38">
          {debt ? "Committed debt payment" : `${fmt(row.remaining)} remaining`}
        </p>
      </div>
      <p className="shrink-0 text-sm font-black text-white/82">{fmt(row.allocated)}</p>
      <button
        type="button"
        onClick={onStartEdit}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/55"
        aria-label={`Edit ${row.title}`}
      >
        <Edit3 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        disabled={busy}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-rose-300/18 bg-rose-500/10 text-rose-100/75 disabled:opacity-45"
        aria-label={`Remove ${row.title}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function CurrentBudgetManager({
  user,
  budgets,
  monthlyBudgetHeader,
  declaredAmount,
  budgetOptions,
  plan,
  addBudget,
  updateBudget,
  deleteBudget,
  refreshData,
  loading,
  requestedEditId,
}) {
  const navigate = useNavigate();
  const derived = isDerivedBudgetHeader(monthlyBudgetHeader);
  const cycle = cycleFromHeader(monthlyBudgetHeader, plan);
  const [editingId, setEditingId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(String(declaredAmount || ""));
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingProtected, setEditingProtected] = useState(false);
  const [emergencyProtectedInput, setEmergencyProtectedInput] = useState("");
  const [savingsProtectedInputs, setSavingsProtectedInputs] = useState({});
  const syncingHeaderRef = useRef(false);

  const protectedAmount = firstAmount(
    plan?.totalProtectedCommitments,
    plan?.protected_commitments_total,
  );
  const protectedCommitments =
    plan?.protectedBudgetCommitments || plan?.protected_budget_commitments || {};
  const protectedSettings = protectedCommitments?.settings || {};
  const protectedSavingsGoals = Array.isArray(protectedCommitments?.includedSavingsGoals)
    ? protectedCommitments.includedSavingsGoals
    : [];
  const protectedEmergencyIncluded = protectedCommitments?.includedEmergencyFund === true;
  const protectedDisplayRows = Array.isArray(plan?.budgetDisplayCategories)
    ? plan.budgetDisplayCategories
    : Array.isArray(plan?.budget_display_categories)
      ? plan.budget_display_categories
      : [];
  const protectedRowForKey = (key) =>
    protectedDisplayRows.find(
      (row) =>
        (row?.isProtectedCommitment === true || row?.is_protected_commitment === true) &&
        String(row?.key || row?.id || "") === String(key || ""),
    ) || null;
  const emergencyProtectedPlanned = firstAmount(protectedCommitments?.emergencyFundAmount);
  const emergencyProtectedRow = protectedRowForKey("protected-emergency-fund");
  const emergencyProtectedFunded = Math.min(
    emergencyProtectedPlanned,
    firstAmount(emergencyProtectedRow?.spent, emergencyProtectedRow?.used),
  );
  const emergencyProtectedRemaining = Math.max(
    emergencyProtectedPlanned - emergencyProtectedFunded,
    0,
  );
  const savingsProtectedProgress = Object.fromEntries(
    protectedSavingsGoals.map((goal) => {
      const id = String(goal?.id || "");
      const planned = firstAmount(goal?.amount);
      const row = protectedRowForKey(`protected-savings-${id}`);
      const funded = Math.min(planned, firstAmount(row?.spent, row?.used));
      return [
        id,
        {
          planned,
          funded,
          remaining: Math.max(planned - funded, 0),
        },
      ];
    }),
  );
  const protectedRemainingAmount =
    (protectedEmergencyIncluded ? emergencyProtectedRemaining : 0) +
    protectedSavingsGoals.reduce(
      (sum, goal) =>
        sum + (savingsProtectedProgress[String(goal?.id || "")]?.remaining || 0),
      0,
    );
  const protectedFundedAmount = Math.max(protectedAmount - protectedRemainingAmount, 0);
  const showProtectedSection =
    protectedAmount > 0 || protectedEmergencyIncluded || protectedSavingsGoals.length > 0;
  const draftProtectedTotal =
    Math.max(0, amountValue(emergencyProtectedInput)) +
    protectedSavingsGoals.reduce(
      (sum, goal) =>
        sum + Math.max(0, amountValue(savingsProtectedInputs[String(goal?.id || "")])),
      0,
    );

  const rows = useMemo(() => {
    const trackedRows = Array.isArray(plan?.categories) ? plan.categories : [];
    return budgetOptions.map((item) => {
      const itemId = String(item?.id || item?.key || "");
      const title = String(item?.title || item?.name || "Budget item").trim();
      const tracked = trackedRows.find((candidate) => {
        const candidateId = String(candidate?.id || candidate?.key || "");
        return (
          (itemId && candidateId === itemId) ||
          normalizeBudgetText(candidate?.title) === normalizeBudgetText(title)
        );
      });
      const allocated = firstAmount(
        tracked?.allocated,
        item?.allocated,
        item?.allocated_amount,
        item?.budget_amount,
        item?.amount,
      );
      const spent = firstAmount(tracked?.spent, tracked?.used);
      const raw = item?.budget || item || {};
      return {
        ...item,
        ...raw,
        budget: raw,
        id: item?.id || item?.key || raw?.id,
        title,
        allocated,
        spent,
        remaining: Math.max(allocated - spent, 0),
      };
    });
  }, [budgetOptions, plan?.categories]);

  const summary = useMemo(() => summarizeBudgetRows(rows, protectedAmount), [protectedAmount, rows]);
  const regularRows = summary.regularItems;
  const debtRows = summary.debtItems;
  const categoryTotal = summary.regularTotal + summary.debtTotal;
  const calculatedTotal = summary.calculatedTotal;
  const legacyUnallocated = Math.max(declaredAmount - categoryTotal - protectedAmount, 0);
  const displayedTotal = derived ? calculatedTotal : declaredAmount;

  useEffect(() => {
    if (!requestedEditId || !rows.length) return;
    const row = rows.find((item) => String(item.id) === String(requestedEditId));
    if (!row) return;
    setEditingId(String(row.id));
    setDraftName(row.title);
    setDraftAmount(String(row.allocated || ""));
  }, [requestedEditId, rows]);

  useEffect(() => {
    if (!derived || !monthlyBudgetHeader?.id || busy || loading || syncingHeaderRef.current) return;
    const cached = firstAmount(
      monthlyBudgetHeader.declared_amount,
      monthlyBudgetHeader.declared_budget,
      monthlyBudgetHeader.total_budget,
      monthlyBudgetHeader.amount,
    );
    if (Math.abs(cached - calculatedTotal) < 0.01 || calculatedTotal <= 0) return;
    syncingHeaderRef.current = true;
    updateBudget?.(
      monthlyBudgetHeader.id,
      buildDerivedHeaderPayload({
        total: calculatedTotal,
        cycle,
        user,
        done: true,
        current: monthlyBudgetHeader,
        draftId: monthlyBudgetHeader.setup_draft_id || "",
      }),
    )
      .then(() => refreshData?.())
      .then(() => fireBudgetEvents())
      .catch((error) => console.warn("CLARA could not refresh the derived budget cache:", error))
      .finally(() => {
        syncingHeaderRef.current = false;
      });
  }, [
    busy,
    calculatedTotal,
    cycle,
    derived,
    loading,
    monthlyBudgetHeader,
    refreshData,
    updateBudget,
    user,
  ]);

  const refresh = async () => {
    await refreshData?.();
    fireBudgetEvents();
  };

  const updateDerivedHeaderTotal = async (nextCategoryTotal) => {
    if (!derived || !monthlyBudgetHeader?.id) return;
    const nextTotal = Math.max(0, amountValue(nextCategoryTotal) + protectedAmount);
    await updateBudget?.(
      monthlyBudgetHeader.id,
      buildDerivedHeaderPayload({
        total: nextTotal,
        cycle,
        user,
        done: true,
        current: monthlyBudgetHeader,
        draftId: monthlyBudgetHeader.setup_draft_id || "",
      }),
    );
  };

  const saveLegacyTotal = async () => {
    const next = amountValue(totalInput);
    if (next <= 0) {
      setNotice("Enter a total budget above ₱0.");
      return;
    }
    if (next < categoryTotal + protectedAmount) {
      setNotice(`The total cannot be lower than the ${fmt(categoryTotal + protectedAmount)} already committed.`);
      return;
    }
    try {
      setBusy(true);
      setNotice("");
      await updateBudget?.(
        monthlyBudgetHeader.id,
        legacyHeaderPayload({ amount: next, header: monthlyBudgetHeader, cycle, user }),
      );
      await refresh();
      setEditingTotal(false);
      setNotice("Total budget updated.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not update the total budget yet.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (row) => {
    setEditingId(String(row.id));
    setDraftName(row.title);
    setDraftAmount(String(row.allocated || ""));
    setNotice("");
  };

  const saveItem = async (row) => {
    const title = String(draftName || "").trim();
    const amount = amountValue(draftAmount);
    if (!title) {
      setNotice("Enter a category name.");
      return;
    }
    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }
    const duplicate = rows.find(
      (item) => item.id !== row.id && normalizeBudgetText(item.title) === normalizeBudgetText(title),
    );
    if (duplicate) {
      setNotice(`${duplicate.title} already exists in this plan.`);
      return;
    }
    const nextCategoryTotal = categoryTotal - row.allocated + amount;
    if (!derived && nextCategoryTotal + protectedAmount > declaredAmount) {
      setNotice(`You only have ${fmt(Math.max(declaredAmount - (categoryTotal - row.allocated) - protectedAmount, 0))} available for this item.`);
      return;
    }
    const raw = row.budget || row;
    const commitment = isDebtCommitment(row)
      ? {
          id: raw.source_debt_id || raw.sourceDebtId,
          title: raw.source_debt_title || row.title,
          dueDate: raw.source_debt_due_date || raw.sourceDebtDueDate,
        }
      : null;
    try {
      setBusy(true);
      setNotice("");
      const payload = derived
        ? buildBudgetCategoryPayload({
            title,
            amount,
            order: row.sortOrder ?? row.sort_order ?? 0,
            user,
            cycle,
            current: raw,
            draftId: raw.setup_draft_id || monthlyBudgetHeader.setup_draft_id || "",
            itemId: raw.setup_item_id || String(row.id),
            commitment,
          })
        : legacyCategoryPayload({
            title,
            amount,
            order: row.sortOrder ?? row.sort_order ?? 0,
            user,
            cycle,
            current: raw,
          });
      await updateBudget?.(row.id, payload);
      await updateDerivedHeaderTotal(nextCategoryTotal);
      await refresh();
      setEditingId("");
      setNotice("Budget item updated.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not update this item yet.");
    } finally {
      setBusy(false);
    }
  };

  const addItem = async () => {
    const title = String(newName || "").trim();
    const amount = amountValue(newAmount);
    if (!title) {
      setNotice("Enter a category name.");
      return;
    }
    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }
    if (rows.some((row) => normalizeBudgetText(row.title) === normalizeBudgetText(title))) {
      setNotice(`${title} already exists in this plan.`);
      return;
    }
    const nextCategoryTotal = categoryTotal + amount;
    if (!derived && nextCategoryTotal + protectedAmount > declaredAmount) {
      setNotice(`Only ${fmt(legacyUnallocated)} is still unallocated.`);
      return;
    }
    try {
      setBusy(true);
      setNotice("");
      const payload = derived
        ? buildBudgetCategoryPayload({
            title,
            amount,
            order: rows.length,
            user,
            cycle,
            draftId: monthlyBudgetHeader.setup_draft_id || "",
            itemId: `active-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          })
        : legacyCategoryPayload({
            title,
            amount,
            order: rows.length,
            user,
            cycle,
          });
      await addBudget?.(payload);
      await updateDerivedHeaderTotal(nextCategoryTotal);
      await refresh();
      setNewName("");
      setNewAmount("");
      setAdding(false);
      setNotice("Budget item added.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not add this item yet.");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async (row) => {
    if (!row?.id || typeof deleteBudget !== "function") return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Remove ${row.title} from this budget plan?`);
      if (!confirmed) return;
    }
    const nextCategoryTotal = Math.max(0, categoryTotal - row.allocated);
    if (derived && nextCategoryTotal + protectedAmount <= 0) {
      setNotice("Keep at least one budget item or protected amount in an active plan.");
      return;
    }
    try {
      setBusy(true);
      setNotice("");
      await deleteBudget(row.id);
      await updateDerivedHeaderTotal(nextCategoryTotal);
      await refresh();
      setEditingId("");
      setNotice("Budget item removed.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not remove this item yet.");
    } finally {
      setBusy(false);
    }
  };

  const startProtectedEdit = () => {
    setEmergencyProtectedInput(String(emergencyProtectedRemaining || ""));
    setSavingsProtectedInputs(
      Object.fromEntries(
        protectedSavingsGoals.map((goal) => {
          const id = String(goal?.id || "");
          return [id, String(savingsProtectedProgress[id]?.remaining || "")];
        }),
      ),
    );
    setEditingProtected(true);
    setNotice("");
  };

  const saveProtectedEdits = async () => {
    // Inputs represent what is still left to protect. Storage stays as the full
    // cycle commitment so fulfilled Manual Log entries are never deducted twice.
    const emergencyAmount = protectedEmergencyIncluded
      ? emergencyProtectedFunded + Math.max(0, amountValue(emergencyProtectedInput))
      : 0;
    const nextSavingsGoalAmounts = {
      ...(protectedSettings?.savingsGoalMonthlyAmounts || {}),
    };
    protectedSavingsGoals.forEach((goal) => {
      const id = String(goal?.id || "");
      if (!id) return;
      const alreadyFunded = savingsProtectedProgress[id]?.funded || 0;
      const desiredRemaining = Math.max(0, amountValue(savingsProtectedInputs[id]));
      nextSavingsGoalAmounts[id] = alreadyFunded + desiredRemaining;
    });
    const selectedSavingsGoalIds =
      Array.isArray(protectedSettings?.selectedSavingsGoalIds) &&
      protectedSettings.selectedSavingsGoalIds.length
        ? protectedSettings.selectedSavingsGoalIds.map(String)
        : protectedSavingsGoals.map((goal) => String(goal?.id || "")).filter(Boolean);

    try {
      setBusy(true);
      setNotice("");
      saveProtectionSettings({
        setupCompleted: true,
        includeEmergencyFund: protectedEmergencyIncluded,
        emergencyFundContributionMode: "fixed",
        emergencyFundMonthlyAmount: emergencyAmount,
        includeSavingsGoals:
          protectedSettings?.includeSavingsGoals === true || protectedSavingsGoals.length > 0,
        savingsGoalMode:
          protectedSettings?.savingsGoalMode ||
          (selectedSavingsGoalIds.length ? "selected" : "none"),
        selectedSavingsGoalIds,
        savingsContributionMode: "fixed",
        savingsGoalMonthlyAmounts: nextSavingsGoalAmounts,
      });
      await refresh();
      setEditingProtected(false);
      setNotice("Protected money updated.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not update protected money yet.");
    } finally {
      setBusy(false);
    }
  };

  const resetPlan = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Start a fresh bottom-up budget? Transaction history will stay, but current categories and commitments will be cleared.",
      );
      if (!confirmed) return;
    }
    const nextDraft = createBudgetSetupDraft({ step: 1 });
    const resetCycle = getCycleWindow("monthly", nextDraft.cycleStart, nextDraft.cycleEnd);
    try {
      setBusy(true);
      setNotice("");
      await resetMonthlyBudgetCycle({
        budgets,
        headerPayload: buildDerivedHeaderPayload({
          total: 0,
          cycle: resetCycle,
          user,
          done: false,
          draftId: nextDraft.draftId,
        }),
        categoryPayloads: [],
        addBudget,
        updateBudget,
      });
      saveProtectionSettings({
        setupCompleted: false,
        includeEmergencyFund: false,
        emergencyFundMonthlyAmount: 0,
        includeSavingsGoals: false,
        savingsGoalMode: "none",
        selectedSavingsGoalIds: [],
        savingsGoalMonthlyAmounts: {},
      });
      writeBudgetSetupDraft(nextDraft);
      await refresh();
      navigate("/budget-plan", { replace: true, state: { resetAt: Date.now() } });
    } catch (error) {
      setNotice(error?.message || "CLARA could not reset this budget plan yet.");
    } finally {
      setBusy(false);
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
              <h1 className="truncate text-lg font-black tracking-[-0.035em]">Current Budget Plan</h1>
              <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/55">
                {derived ? "Bottom-up calculated plan" : "Legacy declared-total plan"}
              </p>
            </div>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-400/12 px-2.5 py-1 text-[10px] font-bold text-emerald-100">
              Active
            </span>
          </div>
        </header>

        <section className={`${card} overflow-hidden`}>
          <div className="border-b border-white/8 bg-gradient-to-br from-cyan-400/[0.09] via-transparent to-violet-400/[0.08] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/50">
                  {derived ? "Calculated budget total" : "Current budget"}
                </p>
                <p className="mt-1 text-3xl font-black tracking-[-0.04em]">{fmt(displayedTotal)}</p>
                <p className="mt-1 text-xs font-semibold text-white/45">
                  {derived
                    ? "Your total updates automatically when you change an item."
                    : "Available for this legacy cycle"}
                </p>
              </div>
              {!derived ? (
                <button
                  type="button"
                  onClick={() => {
                    setTotalInput(String(declaredAmount || ""));
                    setEditingTotal((current) => !current);
                    setNotice("");
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/60"
                  aria-label="Edit total budget"
                >
                  {editingTotal ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                </button>
              ) : null}
            </div>

            {!derived && editingTotal ? (
              <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-black/15 p-3">
                <input
                  type="number"
                  min="0"
                  inputMode="decimal"
                  value={totalInput}
                  onChange={(event) => {
                    setTotalInput(event.target.value);
                    setNotice("");
                  }}
                  className={input}
                  placeholder="Total budget"
                />
                <button type="button" onClick={saveLegacyTotal} disabled={busy || loading} className={`${primaryButton} w-full`}>
                  <Save className="h-4 w-4" />
                  Save total budget
                </button>
              </div>
            ) : null}
          </div>

          {derived ? (
            <div className="grid grid-cols-2 gap-2 p-4">
              <Stat label="Regular items" value={fmt(summary.regularTotal)} />
              <Stat label="Protected" value={fmt(protectedAmount)} />
              <Stat label="Obligations" value={fmt(summary.debtTotal)} />
              <Stat label="Calculated total" value={fmt(calculatedTotal)} accent />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 p-4">
              <Stat label="Assigned" value={fmt(categoryTotal)} />
              <Stat label="Unallocated" value={fmt(legacyUnallocated)} accent />
              <Stat label="Protected" value={fmt(protectedAmount)} />
              <Stat label="Items" value={rows.length} />
            </div>
          )}

          <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-black/12 px-3.5 py-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-cyan-100/65" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Timeframe</p>
              <p className="mt-0.5 text-sm font-black">{cycle.label}</p>
            </div>
            <p className="max-w-[52%] truncate text-right text-[11px] font-semibold text-white/38">
              {cycle.start} to {cycle.end}
            </p>
          </div>
        </section>

        <section className={`${card} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/14 bg-cyan-400/10 text-cyan-100/75">
                <ListChecks className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black">Regular budget items</p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/38">
                  {derived ? "Changing an item recalculates the total." : "Legacy items remain limited by the declared total."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setAdding((current) => !current);
                setNotice("");
              }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10 text-emerald-100"
              aria-label="Add budget item"
            >
              {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>

          {adding ? (
            <div className="mt-3 space-y-2 rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.05] p-3">
              <input
                type="text"
                value={newName}
                onChange={(event) => {
                  setNewName(event.target.value);
                  setNotice("");
                }}
                placeholder="Category name"
                className={input}
              />
              <input
                type="number"
                min="0"
                inputMode="decimal"
                value={newAmount}
                onChange={(event) => {
                  setNewAmount(event.target.value);
                  setNotice("");
                }}
                placeholder="Planned amount"
                className={input}
              />
              <button type="button" onClick={addItem} disabled={busy || loading} className={`${primaryButton} w-full`}>
                <Plus className="h-4 w-4" />
                Add item
              </button>
            </div>
          ) : null}

          <div className="mt-4 space-y-2">
            {regularRows.length ? (
              regularRows.map((row) => (
                <BudgetRow
                  key={row.id || row.key}
                  row={row}
                  editing={editingId === String(row.id)}
                  draftName={{ value: draftName, set: setDraftName }}
                  draftAmount={{ value: draftAmount, set: setDraftAmount }}
                  onStartEdit={() => startEdit(row)}
                  onCancelEdit={() => setEditingId("")}
                  onSave={() => saveItem(row)}
                  onRemove={() => removeItem(row)}
                  busy={busy || loading}
                />
              ))
            ) : (
              <p className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-xs font-semibold text-white/38">
                No regular items in this plan.
              </p>
            )}
          </div>
        </section>

        {debtRows.length ? (
          <section className={`${card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/16 bg-amber-400/10 text-amber-100/75">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-black">Debt & obligation payments</p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/38">
                  Stored separately from ordinary discretionary categories.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {debtRows.map((row) => (
                <BudgetRow
                  key={row.id || row.key}
                  row={row}
                  editing={editingId === String(row.id)}
                  draftName={{ value: draftName, set: setDraftName }}
                  draftAmount={{ value: draftAmount, set: setDraftAmount }}
                  onStartEdit={() => startEdit(row)}
                  onCancelEdit={() => setEditingId("")}
                  onSave={() => saveItem(row)}
                  onRemove={() => removeItem(row)}
                  busy={busy || loading}
                />
              ))}
            </div>
          </section>
        ) : null}

        {showProtectedSection ? (
          <section className={`${card} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/16 bg-emerald-400/10 text-emerald-100/75">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">Protected money</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-white/38">
                    {fmt(protectedRemainingAmount)} still to protect · {fmt(protectedAmount)} planned
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (editingProtected) {
                    setEditingProtected(false);
                    setNotice("");
                  } else {
                    startProtectedEdit();
                  }
                }}
                disabled={busy || loading}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/55 disabled:opacity-45"
                aria-label={editingProtected ? "Cancel protected money edit" : "Edit protected money"}
              >
                {editingProtected ? <X className="h-3.5 w-3.5" /> : <Edit3 className="h-3.5 w-3.5" />}
              </button>
            </div>

            {editingProtected ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-emerald-300/14 bg-emerald-400/[0.05] p-3">
                <p className="text-[10px] font-bold leading-4 text-white/45">
                  Edit how much is still left to protect this cycle. Money already logged stays fulfilled, and your actual Emergency Fund and Savings Goal targets stay unchanged.
                </p>
                {protectedFundedAmount > 0 ? (
                  <div className="flex items-center justify-between rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.04] px-3.5 py-2.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/38">
                      Already fulfilled
                    </span>
                    <span className="text-sm font-black text-cyan-100">{fmt(protectedFundedAmount)}</span>
                  </div>
                ) : null}

                {protectedEmergencyIncluded ? (
                  <label className="block">
                    <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/55">
                      Emergency Fund
                    </span>
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={emergencyProtectedInput}
                      onChange={(event) => {
                        setEmergencyProtectedInput(event.target.value);
                        setNotice("");
                      }}
                      className={input}
                      placeholder="Amount left to protect"
                    />
                  </label>
                ) : null}

                {protectedSavingsGoals.map((goal) => {
                  const id = String(goal?.id || "");
                  const title = String(goal?.title || "Savings Goal");
                  return (
                    <label key={id || title} className="block">
                      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/55">
                        {title}
                      </span>
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={savingsProtectedInputs[id] ?? ""}
                        onChange={(event) => {
                          setSavingsProtectedInputs((current) => ({
                            ...current,
                            [id]: event.target.value,
                          }));
                          setNotice("");
                        }}
                        className={input}
                        placeholder="Amount left to protect"
                      />
                    </label>
                  );
                })}

                <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/15 px-3.5 py-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/38">
                    New amount left to protect
                  </span>
                  <span className="text-sm font-black text-emerald-100">{fmt(draftProtectedTotal)}</span>
                </div>

                <button
                  type="button"
                  onClick={saveProtectedEdits}
                  disabled={busy || loading}
                  className={`${primaryButton} w-full`}
                >
                  <Save className="h-4 w-4" />
                  Save protected money
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold leading-5 text-amber-50">
            {notice}
          </div>
        ) : null}

        <section className={`${card} border-amber-300/14 bg-amber-400/[0.05] p-4`}>
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-amber-100/70" />
            <div>
              <p className="text-sm font-black text-amber-50">Start a fresh bottom-up budget</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-amber-50/55">
                Transaction history stays. Current categories and selected commitments are archived, then the new setup starts with no declared total.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetPlan}
            disabled={busy || loading}
            className="mt-3 w-full rounded-2xl border border-amber-300/22 bg-amber-400/10 px-4 py-3 text-xs font-black text-amber-50 disabled:opacity-45"
          >
            Reset budget cycle
          </button>
        </section>

        <button type="button" onClick={() => navigate("/dashboard")} className={`${secondaryButton} w-full`}>
          <CheckCircle2 className="h-4 w-4" />
          Done managing plan
        </button>
      </div>
    </div>
  );
}

export default function MonthlyBudgetPlan() {
  const pageRef = useRef(null);
  const location = useLocation();
  const { user } = useUserRole();
  const {
    budgets = [],
    expenses = [],
    savingsGoals = [],
    emergencyFund = null,
    addBudget,
    updateBudget,
    deleteBudget,
    refreshData,
    loading,
  } = useFinancialData(user);
  const { monthlyBudgetHeader, declaredMonthlyBudgetAmount } = useDashboardMonthlyBudgetHeader({ budgets });
  const budgetOptions = useDashboardManualExpenseBudgetOptions({ budgets });
  const declaredAmount = firstAmount(
    declaredMonthlyBudgetAmount,
    monthlyBudgetHeader?.declared_amount,
    monthlyBudgetHeader?.declared_budget,
    monthlyBudgetHeader?.monthly_budget_amount,
    monthlyBudgetHeader?.total_declared_budget,
    monthlyBudgetHeader?.total_budget,
    monthlyBudgetHeader?.amount,
  );
  const plan = useDashboardMonthlyBudgetPlan({
    manualExpenseBudgetOptions: budgetOptions,
    expenses,
    declaredMonthlyBudgetAmount: declaredAmount,
    monthlyBudgetHeader,
    savingsGoals,
    emergencyFund,
  });
  const showCurrentPlan = Boolean(monthlyBudgetHeader);
  useLockedBudgetViewport(pageRef);

  return (
    <div
      ref={pageRef}
      className="h-[100svh] max-h-[100svh] min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-contain"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      {showCurrentPlan ? (
        <CurrentBudgetManager
          user={user}
          budgets={budgets}
          monthlyBudgetHeader={monthlyBudgetHeader}
          declaredAmount={declaredAmount}
          budgetOptions={budgetOptions}
          plan={plan}
          addBudget={addBudget}
          updateBudget={updateBudget}
          deleteBudget={deleteBudget}
          refreshData={refreshData}
          loading={loading}
          requestedEditId={location.state?.editCategoryId || ""}
        />
      ) : (
        <MonthlyBudgetPlanGuided />
      )}
    </div>
  );
}
