import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  ListChecks,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import useDashboardManualExpenseBudgetOptions from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions";
import useDashboardMonthlyBudgetHeader from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetHeader";
import useDashboardMonthlyBudgetPlan from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan";
import { resetMonthlyBudgetCycle } from "@/lib/clara-budget-cycle-reset";
import { getPHMonthKey, normalizeString } from "@/utils/dashboard/dashboardHelpers";
import MonthlyBudgetPlanGuided from "./monthly-budget-plan/MonthlyBudgetPlanGuided";

const STEP_LABELS = ["Amount", "Cycle", "Protection", "Categories", "Review"];
const card =
  "rounded-[26px] border border-cyan-100/12 bg-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_18px_44px_rgba(0,0,0,0.18)] backdrop-blur-2xl";
const input =
  "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-emerald-300/45";
const primaryButton =
  "flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 px-4 py-3 text-sm font-black text-[#03171a] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButton =
  "flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/72 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45";

const amountValue = (value, fallback = 0) => {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(String(value).replace(/php/gi, "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(numeric) ? numeric : fallback;
};

const firstAmount = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const numeric = amountValue(value, NaN);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
};

const fmt = (value = 0) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountValue(value));

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();
const addDays = (date, days) => {
  const value = new Date(`${String(date || today()).slice(0, 10)}T00:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};

function fireBudgetEvents() {
  if (typeof window === "undefined") return;
  [
    "clara-budgets-updated",
    "clara-finance-updated",
    "clara-local-finance-updated",
  ].forEach((name) => window.dispatchEvent(new Event(name)));
}

function normalizeCycleType(value) {
  const clean = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (["weekly", "week"].includes(clean)) return "weekly";
  if (["biweekly", "bi-weekly", "2weeks", "twoweeks"].includes(clean)) return "biweekly";
  if (clean === "custom") return "custom";
  return "monthly";
}

function getCycleWindow(type, start, end) {
  const safeType = normalizeCycleType(type);
  const safeStart = start || today();
  if (safeType === "weekly") {
    return { start: safeStart, end: addDays(safeStart, 6), label: "Weekly" };
  }
  if (safeType === "biweekly") {
    return { start: safeStart, end: addDays(safeStart, 13), label: "Bi-weekly" };
  }
  if (safeType === "custom") {
    return { start: safeStart, end: end || safeStart, label: "Custom" };
  }
  const month = getPHMonthKey();
  return { start: `${month}-01`, end: "", label: "Monthly" };
}

function getResetCycleWindow(type, end) {
  const resetStart = nowIso();
  const base = getCycleWindow(type, today(), end);
  return { ...base, start: resetStart, reset_start_at: resetStart };
}

function headerPayload({ amount, done, user, cycle }) {
  const timestamp = nowIso();
  const title = `${cycle.label} Spending Plan`;
  const resetBoundary = cycle.reset_start_at || null;
  return {
    month: getPHMonthKey(),
    month_key: getPHMonthKey(),
    title,
    name: title,
    category: "__monthly_budget__",
    budget_category: "__monthly_budget__",
    type: "monthly_budget",
    plan_type: "monthly_budget",
    is_plan_header: true,
    budget_cycle: cycle.label.toLowerCase(),
    cycle_type: cycle.label.toLowerCase(),
    cycle_start: cycle.start,
    cycle_end: cycle.end,
    period_start: cycle.start,
    period_end: cycle.end,
    reset_start_at: resetBoundary,
    tracking_started_at: resetBoundary,
    tracking_start_date: resetBoundary,
    declared_amount: amount,
    declared_budget: amount,
    monthly_budget_amount: amount,
    total_declared_budget: amount,
    total_budget: amount,
    amount,
    is_complete: Boolean(done),
    status: done ? "active" : "draft",
    is_active: true,
    active: true,
    updated_at: timestamp,
    created_by: user?.email || null,
    email: user?.email || null,
    user_id: user?.id || null,
  };
}

function categoryPayload({ title, amount, order, user, cycle, current = {} }) {
  const clean = normalizeString(title) || "Budget Category";
  return {
    ...(current?.budget || current || {}),
    month: getPHMonthKey(),
    month_key: getPHMonthKey(),
    title: clean,
    name: clean,
    category: clean,
    budget_category: clean,
    allocated: amount,
    allocated_amount: amount,
    budget_amount: amount,
    total_budget: amount,
    amount,
    sort_order: order,
    display_order: order,
    position: order,
    budget_cycle: cycle.label.toLowerCase(),
    cycle_type: cycle.label.toLowerCase(),
    cycle_start: cycle.start,
    cycle_end: cycle.end,
    period_start: cycle.start,
    period_end: cycle.end,
    is_active: true,
    active: true,
    status: "active",
    updated_at: nowIso(),
    created_by: user?.email || null,
    email: user?.email || null,
    user_id: user?.id || null,
  };
}

function useLockedBudgetViewport(pageRef, guidedMode) {
  useLayoutEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const html = document.documentElement;
    const body = document.body;
    const previousPageStyles = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    const applyViewportLayout = () => {
      const screen = root.firstElementChild;
      const header = root.querySelector("header");
      if (!screen || !header) return;

      Object.assign(screen.style, {
        height: "100%",
        minHeight: "0",
        maxHeight: "100%",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
        scrollbarGutter: "stable",
        boxSizing: "border-box",
        position: "relative",
      });

      Object.assign(header.style, {
        position: "sticky",
        top: "0px",
        zIndex: "60",
        isolation: "isolate",
        background:
          "linear-gradient(105deg, rgba(5, 91, 99, 0.99), rgba(24, 32, 91, 0.99))",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        boxShadow: "0 12px 26px rgba(2, 8, 23, 0.34)",
        transform: "translateZ(0)",
      });

      if (!guidedMode) return;

      const eyebrow = header.querySelector("p:not([data-budget-progress-text])");
      const title = header.querySelector("h1");
      const progressSection = Array.from(root.querySelectorAll("section")).find((section) =>
        /step\s*\d+\s*of\s*5/i.test(section.textContent || ""),
      );
      const stepMatch = progressSection?.textContent?.match(/step\s*(\d+)\s*of\s*5/i);
      const currentStep = Math.min(5, Math.max(1, Number(stepMatch?.[1]) || 1));
      const currentLabel = STEP_LABELS[currentStep - 1];

      if (eyebrow) {
        eyebrow.setAttribute("aria-hidden", "true");
        eyebrow.style.display = "none";
      }

      if (title && title.textContent !== "Budget Setup") {
        title.textContent = "Budget Setup";
        title.setAttribute("aria-label", "Budget Setup");
      }

      if (progressSection) {
        progressSection.setAttribute("aria-hidden", "true");
        progressSection.style.display = "none";
      }

      if (title?.parentElement) {
        let progressText = title.parentElement.querySelector("[data-budget-progress-text]");
        if (!progressText) {
          progressText = document.createElement("p");
          progressText.setAttribute("data-budget-progress-text", "true");
          progressText.setAttribute("aria-live", "polite");
          Object.assign(progressText.style, {
            display: "block",
            margin: "2px 0 0",
            color: "rgba(207, 250, 254, 0.58)",
            fontSize: "9px",
            fontWeight: "800",
            letterSpacing: "0.12em",
            lineHeight: "1.2",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          });
          title.insertAdjacentElement("afterend", progressText);
        }
        const nextProgressText = `Step ${currentStep} of 5 · ${currentLabel}`;
        if (progressText.textContent !== nextProgressText) {
          progressText.textContent = nextProgressText;
        }
      }
    };

    applyViewportLayout();
    const observer = new MutationObserver(applyViewportLayout);
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener("resize", applyViewportLayout);
    window.addEventListener("orientationchange", applyViewportLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyViewportLayout);
      window.removeEventListener("orientationchange", applyViewportLayout);
      html.style.overflow = previousPageStyles.htmlOverflow;
      html.style.overscrollBehavior = previousPageStyles.htmlOverscroll;
      body.style.overflow = previousPageStyles.bodyOverflow;
      body.style.overscrollBehavior = previousPageStyles.bodyOverscroll;
    };
  }, [guidedMode, pageRef]);
}

function Stat({ label, value, accent = false }) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        accent
          ? "border-emerald-300/16 bg-emerald-400/[0.07]"
          : "border-white/8 bg-black/12"
      }`}
    >
      <p
        className={`text-[9px] font-black uppercase tracking-[0.13em] ${
          accent ? "text-emerald-100/45" : "text-white/34"
        }`}
      >
        {label}
      </p>
      <p className={`mt-1 text-lg font-black ${accent ? "text-emerald-100" : "text-white"}`}>
        {value}
      </p>
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
}) {
  const navigate = useNavigate();
  const [editingId, setEditingId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftAmount, setDraftAmount] = useState("");
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalInput, setTotalInput] = useState(String(declaredAmount || ""));
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const cycleType = normalizeCycleType(
    monthlyBudgetHeader?.cycle_type || monthlyBudgetHeader?.budget_cycle || plan?.cycle_type,
  );
  const cycle = getCycleWindow(
    cycleType,
    monthlyBudgetHeader?.cycle_start || plan?.cycle_start || today(),
    monthlyBudgetHeader?.cycle_end || plan?.cycle_end || "",
  );

  const protectedAmount = firstAmount(
    plan?.totalProtectedCommitments,
    plan?.protected_commitments_total,
  );
  const categoryAllocated = budgetOptions.reduce(
    (sum, item) =>
      sum +
      firstAmount(
        item?.allocated,
        item?.allocated_amount,
        item?.budget_amount,
        item?.total_budget,
        item?.amount,
      ),
    0,
  );
  const totalCommitted = categoryAllocated + protectedAmount;
  const unallocated = Math.max(declaredAmount - totalCommitted, 0);

  const rows = useMemo(() => {
    const planRows = Array.isArray(plan?.categories) ? plan.categories : [];
    return budgetOptions.map((item) => {
      const itemId = String(item?.id || item?.key || "");
      const itemTitle = normalizeString(item?.title || item?.name || item?.category || "Budget item");
      const tracked = planRows.find((row) => {
        const rowId = String(row?.id || row?.key || "");
        return (itemId && rowId === itemId) ||
          normalizeString(row?.title || row?.name || row?.category).toLowerCase() ===
            itemTitle.toLowerCase();
      });
      const allocated = firstAmount(
        tracked?.allocated,
        item?.allocated,
        item?.allocated_amount,
        item?.budget_amount,
        item?.amount,
      );
      const spent = firstAmount(tracked?.spent, tracked?.used);
      return {
        ...item,
        id: item?.id || item?.key,
        title: itemTitle,
        allocated,
        spent,
        remaining: Math.max(allocated - spent, 0),
      };
    });
  }, [budgetOptions, plan?.categories]);

  const refresh = async () => {
    await refreshData?.();
    fireBudgetEvents();
  };

  const saveHeaderAmount = async () => {
    const nextAmount = firstAmount(totalInput);
    if (nextAmount <= 0) {
      setNotice("Enter a total budget above ₱0.");
      return;
    }
    if (nextAmount < totalCommitted) {
      setNotice(`The total cannot be lower than the ${fmt(totalCommitted)} already committed.`);
      return;
    }

    try {
      setBusy(true);
      setNotice("");
      const payload = headerPayload({ amount: nextAmount, done: true, user, cycle });
      if (monthlyBudgetHeader?.id && typeof updateBudget === "function") {
        await updateBudget(monthlyBudgetHeader.id, payload);
      } else {
        await addBudget?.(payload);
      }
      await refresh();
      setEditingTotal(false);
      setNotice("Total budget updated.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not update the total budget yet.");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(String(item.id));
    setDraftName(item.title);
    setDraftAmount(String(item.allocated || ""));
    setNotice("");
  };

  const saveItem = async (item) => {
    const title = normalizeString(draftName);
    const amount = firstAmount(draftAmount);
    if (!title) {
      setNotice("Enter a category name.");
      return;
    }
    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }

    const committedWithoutItem = totalCommitted - item.allocated;
    if (declaredAmount > 0 && committedWithoutItem + amount > declaredAmount) {
      setNotice(`You only have ${fmt(Math.max(declaredAmount - committedWithoutItem, 0))} available for this item.`);
      return;
    }

    try {
      setBusy(true);
      setNotice("");
      await updateBudget?.(
        item.id,
        categoryPayload({
          title,
          amount,
          order: item.sortOrder ?? item.sort_order ?? 0,
          user,
          cycle,
          current: item,
        }),
      );
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
    const title = normalizeString(newName);
    const amount = firstAmount(newAmount);
    if (!title) {
      setNotice("Enter a category name.");
      return;
    }
    if (amount <= 0) {
      setNotice("Enter an amount above ₱0.");
      return;
    }
    if (declaredAmount > 0 && totalCommitted + amount > declaredAmount) {
      setNotice(`Only ${fmt(unallocated)} is still unallocated.`);
      return;
    }

    try {
      setBusy(true);
      setNotice("");
      await addBudget?.(
        categoryPayload({
          title,
          amount,
          order: budgetOptions.length,
          user,
          cycle,
        }),
      );
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

  const removeItem = async (item) => {
    if (!item?.id || typeof deleteBudget !== "function") return;
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Remove ${item.title} from this budget plan?`);
      if (!confirmed) return;
    }
    try {
      setBusy(true);
      setNotice("");
      await deleteBudget(item.id);
      await refresh();
      setEditingId("");
      setNotice("Budget item removed.");
    } catch (error) {
      setNotice(error?.message || "CLARA could not remove this item yet.");
    } finally {
      setBusy(false);
    }
  };

  const resetPlan = async () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Reset this budget plan? Transaction history will stay, but all current budget categories will be cleared.",
      );
      if (!confirmed) return;
    }

    try {
      setBusy(true);
      setNotice("");
      const resetCycle = getResetCycleWindow(cycleType, cycle.end);
      await resetMonthlyBudgetCycle({
        budgets,
        headerPayload: headerPayload({
          amount: declaredAmount,
          done: false,
          user,
          cycle: resetCycle,
        }),
        categoryPayloads: [],
        addBudget,
        updateBudget,
      });
      await refresh();
      fireBudgetEvents();
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
        <header className="sticky top-0 z-30 -mx-4 border-b border-white/8 px-4 pb-2.5 pt-[calc(0.7rem+env(safe-area-inset-top))]">
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
                Review and manage your active plan
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
                  Current budget
                </p>
                <p className="mt-1 text-3xl font-black tracking-[-0.04em]">{fmt(declaredAmount)}</p>
                <p className="mt-1 text-xs font-semibold text-white/45">Available for this cycle</p>
              </div>
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
            </div>

            {editingTotal ? (
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
                <button type="button" onClick={saveHeaderAmount} disabled={busy || loading} className={`${primaryButton} w-full`}>
                  <Save className="h-4 w-4" />
                  Save total budget
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 p-4">
            <Stat label="Assigned" value={fmt(categoryAllocated)} />
            <Stat label="Unallocated" value={fmt(unallocated)} accent />
            <Stat label="Protected" value={fmt(protectedAmount)} />
            <Stat label="Items" value={rows.length} />
          </div>

          <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-black/12 px-3.5 py-3">
            <CalendarDays className="h-4 w-4 shrink-0 text-cyan-100/65" />
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.13em] text-white/34">Cycle</p>
              <p className="mt-0.5 text-sm font-black">{cycle.label}</p>
            </div>
            <p className="max-w-[44%] truncate text-right text-[11px] font-semibold text-white/38">
              {cycle.end ? `${String(cycle.start).slice(0, 10)} to ${cycle.end}` : String(cycle.start).slice(0, 10)}
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
                <p className="text-sm font-black">Budget items</p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/38">
                  Tap edit to change a category.
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
                placeholder="Amount to assign"
                className={input}
              />
              <button type="button" onClick={addItem} disabled={busy || loading} className={`${primaryButton} w-full`}>
                <Plus className="h-4 w-4" />
                Add to plan
              </button>
            </div>
          ) : null}

          <div className="mt-3 space-y-2">
            {rows.map((item) => {
              const isEditing = editingId === String(item.id);
              return (
                <div key={item.id || item.title} className="rounded-2xl border border-white/8 bg-black/12 p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={draftName}
                        onChange={(event) => {
                          setDraftName(event.target.value);
                          setNotice("");
                        }}
                        className={input}
                      />
                      <input
                        type="number"
                        min="0"
                        inputMode="decimal"
                        value={draftAmount}
                        onChange={(event) => {
                          setDraftAmount(event.target.value);
                          setNotice("");
                        }}
                        className={input}
                      />
                      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                        <button type="button" onClick={() => setEditingId("")} className={secondaryButton}>
                          Cancel
                        </button>
                        <button type="button" onClick={() => saveItem(item)} disabled={busy || loading} className={primaryButton}>
                          <Save className="h-4 w-4" />
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item)}
                          disabled={busy || loading}
                          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-500/10 text-rose-100"
                          aria-label={`Remove ${item.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-300/12 bg-violet-400/10 text-violet-100/70">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black">{item.title}</p>
                        <p className="mt-0.5 text-[11px] font-semibold text-white/38">
                          {fmt(item.spent)} spent · {fmt(item.remaining)} remaining
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-emerald-100">{fmt(item.allocated)}</p>
                        <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/28">Assigned</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] text-white/55"
                        aria-label={`Edit ${item.title}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {protectedAmount > 0 ? (
          <section className={`${card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/14 bg-emerald-400/10 text-emerald-100/75">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">Budget protection</p>
                <p className="mt-0.5 text-[11px] font-semibold text-white/38">
                  Emergency Fund or Savings Goals reserved first.
                </p>
              </div>
              <p className="text-sm font-black text-emerald-100">{fmt(protectedAmount)}</p>
            </div>
          </section>
        ) : null}

        {notice ? (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold leading-5 text-amber-50">
            {notice}
          </div>
        ) : null}

        <section className={`${card} border-rose-300/12 bg-rose-500/[0.04] p-4`}>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-rose-300/18 bg-rose-500/10 text-rose-100/75">
              <RotateCcw className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-rose-50">Reset budget plan</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-rose-50/50">
                Clears the current categories and starts a fresh plan. Transaction history stays.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetPlan}
            disabled={busy || loading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/22 bg-rose-500/10 px-4 py-3 text-sm font-black text-rose-50 disabled:opacity-45"
          >
            <RotateCcw className="h-4 w-4" />
            {busy ? "Working..." : "Reset current plan"}
          </button>
        </section>

        <button type="button" onClick={() => navigate("/dashboard")} className={`${secondaryButton} mb-4 w-full`}>
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

  const categoryTotal = budgetOptions.reduce(
    (sum, item) =>
      sum +
      firstAmount(
        item?.allocated,
        item?.allocated_amount,
        item?.budget_amount,
        item?.total_budget,
        item?.amount,
      ),
    0,
  );

  const declaredAmount = firstAmount(
    declaredMonthlyBudgetAmount,
    monthlyBudgetHeader?.declared_amount,
    monthlyBudgetHeader?.declared_budget,
    monthlyBudgetHeader?.monthly_budget_amount,
    monthlyBudgetHeader?.total_declared_budget,
    monthlyBudgetHeader?.total_budget,
    monthlyBudgetHeader?.amount,
    categoryTotal,
  );

  const plan = useDashboardMonthlyBudgetPlan({
    manualExpenseBudgetOptions: budgetOptions,
    expenses,
    declaredMonthlyBudgetAmount: declaredAmount,
    monthlyBudgetHeader,
    savingsGoals,
    emergencyFund,
  });

  const editingCategory = Boolean(location.state?.editCategoryId);
  const showCurrentPlan = budgetOptions.length > 0 && !editingCategory;
  useLockedBudgetViewport(pageRef, !showCurrentPlan);

  return (
    <div
      ref={pageRef}
      className="h-[100svh] max-h-[100svh] min-h-0 w-full overflow-hidden overscroll-none"
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
        />
      ) : (
        <MonthlyBudgetPlanGuided />
      )}
    </div>
  );
}
