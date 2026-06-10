import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Edit3, Plus, Trash2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import useUserRole from "@/hooks/useUserRole";
import useFinancialData from "@/hooks/useFinancialData";
import useDashboardManualExpenseBudgetOptions from "@/components/fresh/main-dashboard/budget/useDashboardManualExpenseBudgetOptions";
import useDashboardMonthlyBudgetHeader from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetHeader";
import useDashboardMonthlyBudgetPlan from "@/components/fresh/main-dashboard/budget/useDashboardMonthlyBudgetPlan";
import { resetMonthlyBudgetCycle } from "@/lib/clara-budget-cycle-reset";
import { firstValidNumber, getPHMonthKey, normalizeString } from "@/utils/dashboard/dashboardHelpers";

const fmt = (v = 0) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(firstValidNumber(v));
const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();
const addDays = (date, days) => { const d = new Date(`${String(date || today()).slice(0, 10)}T00:00:00`); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const card = "rounded-[26px] border border-cyan-100/12 bg-white/[0.05] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_14px_36px_rgba(0,0,0,0.16)] backdrop-blur-2xl";
const input = "w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/35 focus:border-emerald-300/35";
const btn = "rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const hint = "rounded-2xl border border-white/8 bg-black/12 px-3 py-2.5 text-xs font-semibold leading-5 text-white/58";

function fireBudgetEvents() {
  if (typeof window === "undefined") return;
  ["clara-budgets-updated", "clara-finance-updated", "clara-local-finance-updated"].forEach((name) => window.dispatchEvent(new Event(name)));
}

function normalizeCycleType(value) {
  const clean = String(value || "").trim().toLowerCase().replace(/\s+/g, "");
  if (["weekly", "week"].includes(clean)) return "weekly";
  if (["biweekly", "bi-weekly", "2weeks", "twoweeks"].includes(clean)) return "biweekly";
  if (["custom"].includes(clean)) return "custom";
  return "monthly";
}

function getCycleWindow(type, start, end) {
  const safeType = normalizeCycleType(type);
  const safeStart = start || today();
  if (safeType === "weekly") return { start: safeStart, end: addDays(safeStart, 6), label: "Weekly" };
  if (safeType === "biweekly") return { start: safeStart, end: addDays(safeStart, 13), label: "Bi-weekly" };
  if (safeType === "custom") return { start: safeStart, end: end || String(safeStart).slice(0, 10), label: "Custom" };
  const month = getPHMonthKey();
  return { start: `${month}-01`, end: "", label: "Monthly" };
}

function getResetCycleWindow(type, end) {
  const resetStart = nowIso();
  const base = getCycleWindow(type, today(), end);
  return { ...base, start: resetStart, reset_start_at: resetStart };
}

function headerPayload({ amount, done, user, cycle }) {
  const now = new Date().toISOString();
  const title = `${cycle.label} Spending Plan`;
  const resetBoundary = cycle.reset_start_at || null;
  return {
    month: getPHMonthKey(), month_key: getPHMonthKey(), title, name: title,
    category: "__monthly_budget__", budget_category: "__monthly_budget__",
    type: "monthly_budget", plan_type: "monthly_budget", is_plan_header: true,
    budget_cycle: cycle.label.toLowerCase(), cycle_type: cycle.label.toLowerCase(),
    cycle_start: cycle.start, cycle_end: cycle.end, period_start: cycle.start, period_end: cycle.end,
    reset_start_at: resetBoundary,
    tracking_started_at: resetBoundary,
    tracking_start_date: resetBoundary,
    declared_amount: amount, declared_budget: amount, monthly_budget_amount: amount,
    total_declared_budget: amount, total_budget: amount, amount,
    is_complete: Boolean(done), status: done ? "active" : "draft", is_active: true, active: true,
    updated_at: now, created_by: user?.email || null, email: user?.email || null, user_id: user?.id || null,
  };
}

function categoryPayload({ title, amount, order, user, cycle }) {
  const now = new Date().toISOString();
  const clean = normalizeString(title) || "Budget Category";
  return {
    month: getPHMonthKey(), month_key: getPHMonthKey(), title: clean, name: clean,
    category: clean, budget_category: clean, allocated: amount, allocated_amount: amount,
    budget_amount: amount, total_budget: amount, amount, sort_order: order, display_order: order, position: order,
    budget_cycle: cycle.label.toLowerCase(), cycle_type: cycle.label.toLowerCase(),
    cycle_start: cycle.start, cycle_end: cycle.end, period_start: cycle.start, period_end: cycle.end,
    reset_start_at: cycle.reset_start_at || null,
    is_active: true, active: true, status: "active", updated_at: now,
    created_by: user?.email || null, email: user?.email || null, user_id: user?.id || null,
  };
}

function Tile({ label, value, accent }) {
  return <div className="rounded-2xl border border-white/8 bg-white/[0.035] px-2 py-2 text-center"><p className={`truncate text-xs font-black ${accent ? "text-emerald-200" : "text-white/82"}`}>{value}</p><p className="mt-1 text-[7px] font-black uppercase tracking-[0.14em] text-white/34">{label}</p></div>;
}

export default function MonthlyBudgetPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserRole();
  const { budgets = [], expenses = [], addBudget, updateBudget, deleteBudget, refreshData, loading } = useFinancialData(user);
  const { monthlyBudgetHeader, declaredMonthlyBudgetAmount } = useDashboardMonthlyBudgetHeader({ budgets });
  const budgetOptions = useDashboardManualExpenseBudgetOptions({ budgets });
  const plan = useDashboardMonthlyBudgetPlan({ manualExpenseBudgetOptions: budgetOptions, expenses, declaredMonthlyBudgetAmount, monthlyBudgetHeader });
  const editId = String(location.state?.editCategoryId || "");
  const editing = useMemo(() => editId ? budgetOptions.find((b) => String(b.id || b.key) === editId) || null : null, [budgetOptions, editId]);

  const [cycleType, setCycleType] = useState(normalizeCycleType(monthlyBudgetHeader?.cycle_type || monthlyBudgetHeader?.budget_cycle || "monthly"));
  const [cycleStart, setCycleStart] = useState(monthlyBudgetHeader?.cycle_start || today());
  const [cycleEnd, setCycleEnd] = useState(monthlyBudgetHeader?.cycle_end || addDays(today(), 6));
  const [declaredInput, setDeclaredInput] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryAmount, setCategoryAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { if (declaredMonthlyBudgetAmount > 0) setDeclaredInput(String(declaredMonthlyBudgetAmount)); }, [declaredMonthlyBudgetAmount]);
  useEffect(() => { if (editing) { setCategoryName(editing.title || ""); setCategoryAmount(String(editing.allocated || "")); } }, [editing]);

  const cycle = getCycleWindow(cycleType, cycleStart, cycleEnd);
  const declared = firstValidNumber(declaredInput, declaredMonthlyBudgetAmount);
  const allocated = plan.allocated;
  const left = Math.max(declared - allocated, 0);
  const canFinish = declared > 0 && budgetOptions.length > 0 && left <= 0;
  const headerStatus = String(monthlyBudgetHeader?.status || "").trim().toLowerCase();
  const isActiveBudget = Boolean(monthlyBudgetHeader?.is_complete || monthlyBudgetHeader?.complete || headerStatus === "active" || headerStatus === "activated");
  const canActivate = canFinish && !isActiveBudget;
  const pageBadge = isActiveBudget ? "Active" : canFinish ? "Ready" : "Draft";
  const busy = saving || loading;
  const helper = isActiveBudget ? "You already have an active budget plan. Editing keeps the same cycle and spending history." : canFinish ? "Ready to activate." : declared <= 0 ? "Enter your budget first." : budgetOptions.length === 0 ? "Add at least one category." : `Assign the remaining ${fmt(left)}.`;

  const refresh = async () => { await refreshData?.(); fireBudgetEvents(); };
  const saveHeader = async (done = false) => {
    const amount = firstValidNumber(declaredInput, declaredMonthlyBudgetAmount);
    if (amount <= 0) throw new Error("Please enter your budget first.");
    const payload = headerPayload({ amount, done: Boolean(done || isActiveBudget), user, cycle });
    if (monthlyBudgetHeader?.id && typeof updateBudget === "function") return updateBudget(monthlyBudgetHeader.id, payload);
    return addBudget?.(payload);
  };

  const saveDraft = async () => { try { setSaving(true); setNotice(""); await saveHeader(false); await refresh(); setNotice(isActiveBudget ? "Budget plan updated. Spending history stayed in this cycle." : "Budget draft saved."); } catch (e) { setNotice(e?.message || "CLARA could not save this budget yet."); } finally { setSaving(false); } };
  const addCategory = async () => {
    const title = normalizeString(categoryName); const amount = firstValidNumber(categoryAmount);
    if (!title) return setNotice("Please enter a category name.");
    if (amount <= 0) return setNotice("Please enter an amount to assign.");
    const current = editing ? Math.max(allocated - firstValidNumber(editing.allocated), 0) : allocated;
    if (declared > 0 && current + amount > declared) return setNotice(`This exceeds your budget. You only have ${fmt(Math.max(declared - current, 0))} left.`);
    try { setSaving(true); setNotice(""); await saveHeader(false); const payload = categoryPayload({ title, amount, order: editing?.sortOrder ?? budgetOptions.length, user, cycle }); if (editing?.id && typeof updateBudget === "function") await updateBudget(editing.id, payload); else await addBudget?.(payload); setCategoryName(""); setCategoryAmount(""); await refresh(); setNotice(editing ? "Category updated. Existing spending stayed counted in this cycle." : "Category added."); if (editing) navigate("/budget-plan", { replace: true }); } catch (e) { setNotice(e?.message || "CLARA could not save this category yet."); } finally { setSaving(false); }
  };
  const removeCategory = async (item) => { if (!item?.id || typeof deleteBudget !== "function") return; try { setSaving(true); await deleteBudget(item.id); await refresh(); setNotice("Category removed."); } catch (e) { setNotice(e?.message || "CLARA could not remove this category yet."); } finally { setSaving(false); } };
  const finish = async () => { if (isActiveBudget) return setNotice("This budget plan is already active. Use Save Changes to edit, or Reset Cycle to start clean."); if (!canActivate) return setNotice(helper); try { setSaving(true); await saveHeader(true); await refresh(); navigate("/dashboard"); } catch (e) { setNotice(e?.message || "CLARA could not activate this budget yet."); } finally { setSaving(false); } };
  const resetCycle = async () => {
    const amount = firstValidNumber(declaredInput, declaredMonthlyBudgetAmount);
    if (amount <= 0) return setNotice("Please enter your new budget amount first.");
    if (typeof window !== "undefined") {
      const ok = window.confirm("Reset budget cycle? Transaction history stays, but the Budget Card, Watch Zone, and categories start clean from this exact moment.");
      if (!ok) return;
    }
    try {
      setSaving(true);
      setNotice("");
      const resetCycleWindow = getResetCycleWindow(cycleType, cycleEnd);
      await resetMonthlyBudgetCycle({
        budgets,
        headerPayload: headerPayload({ amount, done: false, user, cycle: resetCycleWindow }),
        categoryPayloads: [],
        addBudget,
        updateBudget,
      });
      await refresh();
      setCycleStart(resetCycleWindow.start);
      setCycleEnd(resetCycleWindow.end || cycleEnd);
      setCategoryName("");
      setCategoryAmount("");
      navigate("/budget-plan", { replace: true });
      setNotice("Budget cycle reset. Transaction history stayed, and the Budget Card, Watch Zone, and categories now start clean.");
    } catch (e) {
      setNotice(e?.message || "CLARA could not reset this budget cycle yet.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="min-h-[100svh] w-full bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.24),transparent_38%),linear-gradient(135deg,#04171e,#071430_48%,#170d36)] px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(0.7rem+env(safe-area-inset-top))] text-white">
    <div className="mx-auto flex w-full max-w-[430px] flex-col gap-3">
      <header className="sticky top-0 z-30 -mx-4 border-b border-white/8 bg-[#06101d]/75 px-4 pb-2.5 pt-[calc(0.7rem+env(safe-area-inset-top))] backdrop-blur-2xl"><div className="mx-auto flex max-w-[430px] items-center gap-3"><button type="button" onClick={() => navigate("/dashboard")} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/80"><ArrowLeft className="h-4 w-4" /></button><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/50">Budget setup</p><h1 className="truncate text-lg font-black tracking-[-0.035em]">{cycle.label} Budget Plan</h1></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${isActiveBudget || canFinish ? "border-emerald-300/25 bg-emerald-400/12 text-emerald-100" : "border-amber-300/20 bg-amber-400/10 text-amber-100"}`}>{pageBadge}</span></div></header>

      <section className={card}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/50">Budget amount</p>
            <p className="mt-1 text-sm font-semibold leading-5 text-white/58">Money available this cycle.</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/34">Unallocated</p>
            <p className="mt-0.5 text-lg font-black leading-none text-emerald-200">{fmt(left)}</p>
          </div>
        </div>
        <input type="number" min="0" value={declaredInput} onChange={(e)=>setDeclaredInput(e.target.value)} placeholder="25000" className={`${input} mt-3 text-lg font-black tracking-[-0.02em]`}/>
        <div className="mt-2.5 grid grid-cols-3 gap-1.5"><Tile label="Allocated" value={fmt(allocated)}/><Tile label="Unallocated" value={fmt(left)} accent/><Tile label="Categories" value={budgetOptions.length}/></div>
        <p className={`${hint} mt-2.5 ${isActiveBudget ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-50" : ""}`}>{helper}</p>
      </section>

      {isActiveBudget ? <section className={`${card} border-amber-300/14 bg-amber-400/[0.055]`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-amber-50">Reset cycle</p><p className="mt-1 text-xs font-semibold leading-5 text-amber-50/60">Starts a fresh budget from now. Transaction history stays, but Watch Zone and categories reset.</p></div><button type="button" onClick={resetCycle} disabled={busy} className="shrink-0 rounded-2xl border border-amber-300/25 bg-amber-400/12 px-3 py-2 text-xs font-black text-amber-50">Reset</button></div></section> : null}

      <section className={card}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/50">Cycle</p>
          <p className="text-[11px] font-semibold text-white/42">{String(cycle.start || "").slice(0, 10)}{cycle.end ? ` → ${cycle.end}` : ""}</p>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">{[["weekly","Weekly"],["biweekly","2 Weeks"],["monthly","Monthly"],["custom","Custom"]].map(([key,label])=><button key={key} type="button" onClick={()=>setCycleType(key)} className={`rounded-2xl border px-2 py-2 text-[11px] font-bold ${cycleType===key?"border-emerald-300/30 bg-emerald-400/15 text-emerald-100":"border-white/8 bg-white/[0.035] text-white/50"}`}>{label}</button>)}</div>{cycleType!=="monthly"?<div className="mt-2.5 grid grid-cols-2 gap-2"><input type="date" value={String(cycleStart || "").slice(0,10)} onChange={(e)=>setCycleStart(e.target.value)} className={input}/>{cycleType==="custom"?<input type="date" value={cycleEnd} onChange={(e)=>setCycleEnd(e.target.value)} className={input}/>:<div className="rounded-2xl border border-white/8 bg-black/12 px-4 py-3 text-sm font-semibold text-white/55">Ends {cycle.end}</div>}</div>:null}</section>

      <section className={card}><div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-sm font-bold">{editing ? "Edit category" : "Add category"}</p><p className="mt-0.5 text-xs leading-5 text-white/48">Food, bills, rent, transport, savings.</p></div>{editing?<button type="button" onClick={()=>navigate("/budget-plan",{replace:true})} className="rounded-full border border-white/8 bg-white/[0.045] px-3 py-1 text-xs font-semibold text-white/58">Cancel</button>:null}</div><div className="space-y-2.5"><input type="text" value={categoryName} onChange={(e)=>{setCategoryName(e.target.value);setNotice("");}} placeholder="Example: Food" className={input}/><input type="number" min="0" value={categoryAmount} onChange={(e)=>{setCategoryAmount(e.target.value);setNotice("");}} placeholder="Amount to assign" className={input}/><button type="button" onClick={addCategory} disabled={busy} className={`${btn} flex w-full items-center justify-center gap-2 border border-emerald-300/25 bg-emerald-500/15 text-emerald-50`}><Plus className="h-4 w-4"/>{editing?"Update Category":"Add Category"}</button></div></section>
      {notice?<div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-50">{notice}</div>:null}
      <section className={card}><div className="mb-3 flex items-center justify-between"><p className="text-sm font-bold">Budget categories</p><span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs font-bold text-white/58">{budgetOptions.length}</span></div>{budgetOptions.length?<div className="space-y-2">{budgetOptions.map((item)=><div key={item.id||item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/12 px-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-bold">{item.title}</p><p className="mt-0.5 text-xs text-white/48">{fmt(item.allocated)} assigned</p></div><div className="flex shrink-0 gap-1.5"><button type="button" onClick={()=>navigate("/budget-plan",{replace:true,state:{editCategoryId:item.id||item.key}})} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.05] text-white/64"><Edit3 className="h-3.5 w-3.5"/></button><button type="button" onClick={()=>removeCategory(item)} disabled={busy} className="flex h-9 w-9 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-500/10 text-rose-100"><Trash2 className="h-3.5 w-3.5"/></button></div></div>)}</div>:<div className="rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-5 text-sm font-semibold leading-6 text-white/54">No categories yet. Start with the biggest fixed expenses first.</div>}</section>
    </div><div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#06101d]/88 px-4 pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-2xl"><div className="mx-auto grid max-w-[430px] grid-cols-2 gap-2"><button type="button" onClick={saveDraft} disabled={busy} className={`${btn} border border-white/12 bg-white/[0.07] text-white/78`}>{saving?"Saving...":isActiveBudget?"Save Changes":"Save Draft"}</button><button type="button" onClick={finish} disabled={busy||!canActivate} className={`${btn} flex items-center justify-center gap-2 ${canActivate?"bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 text-white":"border border-white/10 bg-white/[0.07] text-white/42"}`}><CheckCircle2 className="h-4 w-4"/>{isActiveBudget?"Active Budget":canActivate?"Activate Budget":"Locked"}</button></div></div>
  </div>;
}