import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Edit3, Plus, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import useDashboardManualExpenseBudgetOptions from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions";
import useDashboardMonthlyBudgetHeader from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetHeader";
import useDashboardMonthlyBudgetPlan from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan";
import {
  firstValidNumber,
  getPHMonthKey,
  normalizeString,
} from "@/utils/dashboard/dashboardHelpers";

const fmt = (value = 0) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(firstValidNumber(value));

const glassPanel =
  "rounded-[28px] border border-cyan-100/15 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-2xl";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-base font-semibold text-white outline-none transition placeholder:text-white/35 focus:border-emerald-300/35 focus:bg-black/25 focus:shadow-[0_0_0_3px_rgba(16,185,129,0.08)]";

const buttonBase =
  "rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55";

function dispatchBudgetEvents() {
  if (typeof window === "undefined") return;

  [
    "clara-budgets-updated",
    "clara-finance-updated",
    "clara-local-finance-updated",
  ].forEach((eventName) => window.dispatchEvent(new Event(eventName)));
}

function buildBudgetHeaderPayload({ monthKey, declaredAmount, isComplete, user }) {
  const now = new Date().toISOString();

  return {
    month: monthKey,
    month_key: monthKey,
    title: "Monthly Spending Plan",
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    type: "monthly_budget",
    plan_type: "monthly_budget",
    is_plan_header: true,
    declared_amount: declaredAmount,
    declared_budget: declaredAmount,
    monthly_budget_amount: declaredAmount,
    total_declared_budget: declaredAmount,
    total_budget: declaredAmount,
    amount: declaredAmount,
    is_complete: Boolean(isComplete),
    status: Boolean(isComplete) ? "active" : "draft",
    is_active: true,
    active: true,
    updated_at: now,
    created_by: user?.email || null,
    email: user?.email || null,
    user_id: user?.id || null,
  };
}

function buildBudgetCategoryPayload({ monthKey, title, amount, sortOrder, user }) {
  const now = new Date().toISOString();
  const cleanTitle = normalizeString(title || "Budget Category") || "Budget Category";

  return {
    month: monthKey,
    month_key: monthKey,
    title: cleanTitle,
    name: cleanTitle,
    category: cleanTitle,
    budget_category: cleanTitle,
    allocated: amount,
    allocated_amount: amount,
    budget_amount: amount,
    total_budget: amount,
    amount,
    sort_order: sortOrder,
    display_order: sortOrder,
    position: sortOrder,
    is_active: true,
    active: true,
    status: "active",
    updated_at: now,
    created_by: user?.email || null,
    email: user?.email || null,
    user_id: user?.id || null,
  };
}

export default function MonthlyBudgetPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserRole();
  const {
    budgets = [],
    expenses = [],
    addBudget,
    updateBudget,
    deleteBudget,
    refreshData,
    loading,
  } = useFinancialData(user);

  const monthKey = getPHMonthKey();
  const { monthlyBudgetHeader, declaredMonthlyBudgetAmount } =
    useDashboardMonthlyBudgetHeader({ budgets });
  const budgetOptions = useDashboardManualExpenseBudgetOptions({ budgets });
  const monthlyBudgetPlan = useDashboardMonthlyBudgetPlan({
    manualExpenseBudgetOptions: budgetOptions,
    expenses,
    declaredMonthlyBudgetAmount,
  });

  const editCategoryId = String(location.state?.editCategoryId || "");
  const editingCategory = useMemo(
    () =>
      editCategoryId
        ? budgetOptions.find((item) => String(item.id || item.key) === editCategoryId) || null
        : null,
    [budgetOptions, editCategoryId]
  );

  const [declaredInput, setDeclaredInput] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryAmount, setCategoryAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (declaredMonthlyBudgetAmount > 0) {
      setDeclaredInput(String(declaredMonthlyBudgetAmount));
    }
  }, [declaredMonthlyBudgetAmount]);

  useEffect(() => {
    if (!editingCategory) return;
    setCategoryName(editingCategory.title || "");
    setCategoryAmount(String(editingCategory.allocated || ""));
  }, [editingCategory]);

  const declaredAmount = firstValidNumber(declaredInput, declaredMonthlyBudgetAmount);
  const projectedAllocated = monthlyBudgetPlan.allocated;
  const projectedUnallocated = Math.max(declaredAmount - projectedAllocated, 0);
  const canFinish = declaredAmount > 0 && budgetOptions.length > 0 && projectedUnallocated <= 0;

  const refreshBudgetData = async () => {
    await refreshData?.();
    dispatchBudgetEvents();
  };

  const saveHeader = async ({ finish = false } = {}) => {
    if (typeof addBudget !== "function" && typeof updateBudget !== "function") {
      throw new Error("Budget actions are not ready yet.");
    }

    const amount = firstValidNumber(declaredInput, declaredMonthlyBudgetAmount);
    if (amount <= 0) throw new Error("Please enter your monthly budget first.");

    const payload = buildBudgetHeaderPayload({
      monthKey,
      declaredAmount: amount,
      isComplete: finish,
      user,
    });

    if (monthlyBudgetHeader?.id && typeof updateBudget === "function") {
      await updateBudget(monthlyBudgetHeader.id, payload);
      return;
    }

    await addBudget(payload);
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setNotice("");
      await saveHeader({ finish: false });
      await refreshBudgetData();
      setNotice("Budget draft saved.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not save this budget yet.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCategory = async () => {
    const title = normalizeString(categoryName);
    const amount = firstValidNumber(categoryAmount);

    if (!title) {
      setNotice("Please enter a category name.");
      return;
    }

    if (amount <= 0) {
      setNotice("Please enter an allocated amount.");
      return;
    }

    try {
      setSaving(true);
      setNotice("");
      await saveHeader({ finish: false });

      const payload = buildBudgetCategoryPayload({
        monthKey,
        title,
        amount,
        sortOrder: editingCategory?.sortOrder ?? budgetOptions.length,
        user,
      });

      if (editingCategory?.id && typeof updateBudget === "function") {
        await updateBudget(editingCategory.id, payload);
      } else {
        await addBudget(payload);
      }

      setCategoryName("");
      setCategoryAmount("");
      await refreshBudgetData();
      setNotice(editingCategory ? "Budget category updated." : "Budget category added.");

      if (editingCategory) {
        navigate("/budget-plan", { replace: true });
      }
    } catch (error) {
      setNotice(error?.message || "CLARA could not save this category yet.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = async (item) => {
    if (!item?.id || typeof deleteBudget !== "function") return;
    const confirmed = window.confirm(`Remove ${item.title} from this month’s plan?`);
    if (!confirmed) return;

    try {
      setSaving(true);
      setNotice("");
      await deleteBudget(item.id);
      await refreshBudgetData();
      setNotice("Budget category removed.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not remove this category yet.");
    } finally {
      setSaving(false);
    }
  };

  const handleFinishBudget = async () => {
    if (!canFinish) {
      setNotice("Assign your full declared budget before finishing.");
      return;
    }

    try {
      setSaving(true);
      setNotice("");
      await saveHeader({ finish: true });
      await refreshBudgetData();
      navigate("/dashboard");
    } catch (error) {
      setNotice(error?.message || "CLARA could not finish this budget yet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[100svh] w-full bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.20),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.22),transparent_36%),linear-gradient(135deg,#04171e,#071430_50%,#170d36)] px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(0.8rem+env(safe-area-inset-top))] text-white">
      <div className="mx-auto flex w-full max-w-[430px] flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:bg-white/10"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/55">
              Budget setup
            </p>
            <p className="text-xs font-semibold text-white/55">{monthKey}</p>
          </div>
        </div>

        <section className={`${glassPanel} p-5`}>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/55">
            Monthly Budget Plan
          </p>
          <h1 className="mt-2 text-[32px] font-black leading-[1.02] tracking-[-0.045em] text-white">
            Give every peso a place.
          </h1>
          <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/66">
            Use this page to think slowly, assign categories, and finish your monthly spending plan with clarity.
          </p>
        </section>

        <section className={`${glassPanel} p-4`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Monthly budget</p>
              <p className="mt-0.5 text-xs text-white/52">Total money you plan to spend.</p>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100">
              {fmt(declaredAmount)}
            </span>
          </div>

          <input
            type="number"
            min="0"
            value={declaredInput}
            onChange={(event) => setDeclaredInput(event.target.value)}
            placeholder="25000"
            className={inputClass}
          />

          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              ["Allocated", fmt(projectedAllocated)],
              ["Left", fmt(projectedUnallocated)],
              ["Categories", budgetOptions.length],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5">
                <p className="truncate text-sm font-black text-white">{value}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/42">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${glassPanel} p-4`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">
                {editingCategory ? "Edit category" : "Add budget category"}
              </p>
              <p className="mt-0.5 text-xs text-white/52">Food, bills, transport, savings, or anything you plan.</p>
            </div>
            {editingCategory ? (
              <button
                type="button"
                onClick={() => navigate("/budget-plan", { replace: true })}
                className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-semibold text-white/65"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Bills, Food, Transportation..."
              className={inputClass}
            />
            <input
              type="number"
              min="0"
              value={categoryAmount}
              onChange={(event) => setCategoryAmount(event.target.value)}
              placeholder="Allocated amount"
              className={inputClass}
            />
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={saving || loading}
              className={`${buttonBase} flex w-full items-center justify-center gap-2 border border-emerald-300/25 bg-emerald-500/15 text-emerald-50 shadow-[0_10px_30px_rgba(16,185,129,0.16)] hover:bg-emerald-500/22`}
            >
              <Plus className="h-4 w-4" />
              {editingCategory ? "Update Category" : "Add Category"}
            </button>
          </div>
        </section>

        <section className={`${glassPanel} p-4`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Budget categories</p>
              <p className="mt-0.5 text-xs text-white/52">Your current monthly plan.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-bold text-white/62">
              {budgetOptions.length}
            </span>
          </div>

          {budgetOptions.length ? (
            <div className="space-y-2">
              {budgetOptions.map((item) => (
                <div
                  key={item.id || item.key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-white/52">{fmt(item.allocated)} allocated</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        navigate("/budget-plan", {
                          replace: true,
                          state: { editCategoryId: item.id || item.key },
                        })
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/70 transition hover:bg-white/10 hover:text-white"
                      aria-label={`Edit ${item.title}`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(item)}
                      disabled={saving || loading}
                      className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-500/10 text-rose-100 transition hover:bg-rose-500/18 disabled:opacity-55"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm font-semibold text-white/58">
              No categories yet. Start with your biggest fixed expenses first.
            </div>
          )}
        </section>

        {notice ? (
          <div className="rounded-2xl border border-cyan-100/15 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-50">
            {notice}
          </div>
        ) : null}

        <div className="sticky bottom-0 z-20 -mx-4 border-t border-white/10 bg-[#06101d]/88 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl">
          <div className="mx-auto grid max-w-[430px] grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || loading}
              className={`${buttonBase} border border-white/12 bg-white/[0.07] text-white/78 hover:bg-white/10 hover:text-white`}
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={handleFinishBudget}
              disabled={saving || loading || !canFinish}
              className={`${buttonBase} flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.24)]`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Finish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
