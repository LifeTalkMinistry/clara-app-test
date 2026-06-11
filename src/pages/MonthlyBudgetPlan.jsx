import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Edit3, Plus, ShieldCheck, Trash2, X } from "lucide-react";
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

const BUDGET_PROTECTION_STORAGE_KEY = "clara_budget_protection_settings";
const BUDGET_PROTECTION_UPDATED_EVENT = "clara:budget-protection-settings-updated";
const DEFAULT_BUDGET_PROTECTION_SETTINGS = {
  setupCompleted: false,
  includeSavingsGoals: false,
  savingsGoalMode: "none",
  selectedSavingsGoalIds: [],
  savingsContributionMode: "goalMonthly",
  savingsGoalMonthlyAmounts: {},
  includeEmergencyFund: false,
  emergencyFundContributionMode: "fixed",
  emergencyFundMonthlyAmount: 0,
  createdAt: null,
  updatedAt: null,
};

function fireBudgetEvents() {
  if (typeof window === "undefined") return;
  ["clara-budgets-updated", "clara-finance-updated", "clara-local-finance-updated"].forEach((name) => window.dispatchEvent(new Event(name)));
}

function cleanProtectionSettings(settings = {}) {
  return {
    ...DEFAULT_BUDGET_PROTECTION_SETTINGS,
    ...settings,
    setupCompleted: settings.setupCompleted === true,
    includeSavingsGoals: settings.includeSavingsGoals === true,
    savingsGoalMode: ["none", "all", "selected"].includes(settings.savingsGoalMode) ? settings.savingsGoalMode : "none",
    selectedSavingsGoalIds: Array.isArray(settings.selectedSavingsGoalIds) ? settings.selectedSavingsGoalIds.map(String).filter(Boolean) : [],
    savingsContributionMode: ["goalMonthly", "fixed", "targetDate"].includes(settings.savingsContributionMode) ? settings.savingsContributionMode : "goalMonthly",
    savingsGoalMonthlyAmounts: settings.savingsGoalMonthlyAmounts && typeof settings.savingsGoalMonthlyAmounts === "object" ? settings.savingsGoalMonthlyAmounts : {},
    includeEmergencyFund: settings.includeEmergencyFund === true,
    emergencyFundContributionMode: ["fixed", "setupTarget", "leftover"].includes(settings.emergencyFundContributionMode) ? settings.emergencyFundContributionMode : "fixed",
    emergencyFundMonthlyAmount: Math.max(0, firstValidNumber(settings.emergencyFundMonthlyAmount)),
  };
}

function readProtectionSettings() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return cleanProtectionSettings();
    const raw = window.localStorage.getItem(BUDGET_PROTECTION_STORAGE_KEY);
    return raw ? cleanProtectionSettings(JSON.parse(raw)) : cleanProtectionSettings();
  } catch {
    return cleanProtectionSettings();
  }
}

function saveProtectionSettings(settings = {}) {
  const current = readProtectionSettings();
  const timestamp = new Date().toISOString();
  const next = cleanProtectionSettings({ ...current, ...settings, createdAt: current.createdAt || timestamp, updatedAt: timestamp });
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(BUDGET_PROTECTION_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(BUDGET_PROTECTION_UPDATED_EVENT, { detail: { settings: next } }));
    }
  } catch (error) {
    console.warn("CLARA budget protection save failed:", error);
  }
  return next;
}

function goalId(goal = {}, index = 0) { return String(goal.id || goal.goal_id || goal.key || `goal-${index}`); }
function goalTitle(goal = {}, index = 0) { return String(goal.title || goal.name || goal.goal_name || `Savings Goal ${index + 1}`); }
function goalTarget(goal = {}) { return firstValidNumber(goal.target_amount, goal.targetAmount, goal.goal_amount, goal.target, goal.goal); }
function goalSaved(goal = {}) { return firstValidNumber(goal.saved_amount, goal.current_amount, goal.saved, goal.current, goal.amount); }
function isActiveGoal(goal = {}) {
  const status = String(goal.status || goal.goal_status || goal.state || "active").toLowerCase();
  if (["done", "completed", "complete", "archived", "inactive"].includes(status)) return false;
  const target = goalTarget(goal);
  return target <= 0 || goalSaved(goal) < target;
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

function ProtectionSetupModal({ open, settings, savingsGoals = [], emergencyFund, onClose, onSave }) {
  const [draft, setDraft] = useState(() => cleanProtectionSettings(settings));
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState("");
  const activeGoals = useMemo(() => (Array.isArray(savingsGoals) ? savingsGoals : []).filter(isActiveGoal), [savingsGoals]);

  useEffect(() => {
    if (!open) return;
    setDraft(cleanProtectionSettings(settings));
    setStep(1);
    setMessage("");
  }, [open, settings]);

  if (!open) return null;

  const commit = (nextDraft = draft) => {
    const clean = cleanProtectionSettings({ ...nextDraft, setupCompleted: true });
    if (clean.includeEmergencyFund && clean.emergencyFundContributionMode === "fixed" && firstValidNumber(clean.emergencyFundMonthlyAmount) <= 0) {
      setMessage("Put a monthly Emergency Fund amount above ₱0, or choose target/leftover.");
      setStep(3);
      return;
    }
    const saved = saveProtectionSettings(clean);
    onSave(saved);
  };
  const skip = () => commit({ setupCompleted: true, includeSavingsGoals: false, savingsGoalMode: "none", selectedSavingsGoalIds: [], includeEmergencyFund: false, emergencyFundContributionMode: "fixed", emergencyFundMonthlyAmount: 0 });
  const toggleGoal = (id) => setDraft((current) => {
    const selected = new Set(current.selectedSavingsGoalIds || []);
    if (selected.has(id)) selected.delete(id); else selected.add(id);
    return { ...current, selectedSavingsGoalIds: [...selected] };
  });
  const optionClass = (selected) => `w-full rounded-2xl border px-4 py-3 text-left transition ${selected ? "border-emerald-300/30 bg-emerald-400/12 text-emerald-50" : "border-white/10 bg-white/[0.045] text-white/66"}`;

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#020713]/82 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={onClose}>
    <div role="dialog" aria-modal="true" onClick={(e)=>e.stopPropagation()} className="max-h-[92svh] w-full max-w-[430px] overflow-y-auto rounded-t-[32px] border border-white/15 bg-[#07111f] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.58)] sm:rounded-[32px]">
      <div className="flex items-start justify-between gap-3"><div><div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/80"><ShieldCheck className="h-3.5 w-3.5"/>Budget Protection</div><h2 className="mt-3 text-2xl font-black tracking-[-0.04em]">{step === 4 ? "Your Budget Protection Setup" : "Should your budget include savings and protection?"}</h2></div><button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.06] text-white/64"><X className="h-4 w-4"/></button></div>
      <p className="mt-3 text-sm font-semibold leading-6 text-white/58">CLARA can include Savings Goals and Emergency Fund in your monthly budget so they are protected before extra spending.</p>
      {message ? <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-xs font-bold leading-5 text-amber-100">{message}</p> : null}

      {step === 1 ? <div className="mt-5 space-y-3"><button type="button" onClick={skip} className="w-full rounded-2xl border border-white/15 bg-white/[0.055] px-4 py-3 text-sm font-bold text-white/70">No, skip this</button><button type="button" onClick={()=>setStep(2)} className="w-full rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(16,185,129,0.22)]">Yes, include them</button></div> : null}

      {step === 2 ? <div className="mt-5 space-y-3"><p className="text-sm font-black">Should Savings Goals be part of your monthly budget?</p><button type="button" onClick={()=>setDraft((c)=>({...c,includeSavingsGoals:false,savingsGoalMode:"none",selectedSavingsGoalIds:[]}))} className={optionClass(!draft.includeSavingsGoals)}><span className="text-sm font-black">No, keep goals separate</span></button><button type="button" onClick={()=>setDraft((c)=>({...c,includeSavingsGoals:true,savingsGoalMode:"all"}))} className={optionClass(draft.includeSavingsGoals && draft.savingsGoalMode === "all")}><span className="block text-sm font-black">Yes, include all active goals</span><span className="mt-1 block text-xs text-white/45">{activeGoals.length} active goal{activeGoals.length===1?"":"s"} found</span></button><button type="button" onClick={()=>setDraft((c)=>({...c,includeSavingsGoals:true,savingsGoalMode:"selected"}))} className={optionClass(draft.includeSavingsGoals && draft.savingsGoalMode === "selected")}><span className="text-sm font-black">Yes, let me choose goals</span></button>{draft.includeSavingsGoals && draft.savingsGoalMode === "selected" ? <div className="space-y-2 rounded-2xl border border-white/12 bg-white/[0.035] p-3">{activeGoals.length ? activeGoals.map((goal,index)=>{ const id = goalId(goal,index); const selected = draft.selectedSavingsGoalIds.includes(id); return <button key={id} type="button" onClick={()=>toggleGoal(id)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left ${selected ? "border-emerald-300/25 bg-emerald-400/10" : "border-white/10 bg-black/10"}`}><span className="text-xs font-bold">{goalTitle(goal,index)}</span>{selected ? <CheckCircle2 className="h-4 w-4 text-emerald-200"/> : null}</button>; }) : <p className="text-xs leading-5 text-white/50">No savings goals yet. You can skip this for now.</p>}</div> : null}<button type="button" onClick={()=>setStep(3)} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950">Continue</button></div> : null}

      {step === 3 ? <div className="mt-5 space-y-3"><p className="text-sm font-black">Should Emergency Fund be part of your monthly budget?</p><button type="button" onClick={()=>setDraft((c)=>({...c,includeEmergencyFund:false,emergencyFundContributionMode:"fixed",emergencyFundMonthlyAmount:0}))} className={optionClass(!draft.includeEmergencyFund)}><span className="text-sm font-black">No, keep Emergency Fund separate</span></button><button type="button" onClick={()=>setDraft((c)=>({...c,includeEmergencyFund:true,emergencyFundContributionMode:c.emergencyFundContributionMode || "fixed"}))} className={optionClass(draft.includeEmergencyFund)}><span className="block text-sm font-black">Yes, protect it monthly</span><span className="mt-1 block text-xs text-white/45">Emergency Fund can be reserved before extra spending.</span></button>{draft.includeEmergencyFund ? <div className="rounded-2xl border border-white/12 bg-white/[0.035] p-3"><p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-white/40">Reserve method</p>{[["fixed","Fixed monthly amount"],["setupTarget","Use Emergency Fund setup target"],["leftover","Use leftover after essentials"]].map(([value,label])=><button key={value} type="button" onClick={()=>setDraft((c)=>({...c,emergencyFundContributionMode:value}))} className={`mb-2 w-full rounded-xl border px-3 py-2 text-left text-xs font-bold ${draft.emergencyFundContributionMode===value?"border-emerald-300/25 bg-emerald-400/10 text-emerald-100":"border-white/10 bg-black/10 text-white/55"}`}>{label}</button>)}{draft.emergencyFundContributionMode === "fixed" ? <input type="number" min="0" value={draft.emergencyFundMonthlyAmount || ""} onChange={(e)=>setDraft((c)=>({...c,emergencyFundMonthlyAmount:e.target.value}))} placeholder="Example: 1000" className={`${input} mt-1`}/> : null}{!emergencyFund ? <p className="mt-2 text-xs leading-5 text-white/42">Emergency Fund is not set up yet. CLARA will keep this safe and use ₱0 until setup data exists.</p> : null}</div> : null}<button type="button" onClick={()=>setStep(4)} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-slate-950">Continue</button></div> : null}

      {step === 4 ? <div className="mt-5 space-y-3"><div className="rounded-2xl border border-white/12 bg-white/[0.045] p-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">Savings Goals</p><p className="mt-1 text-sm font-black">{draft.includeSavingsGoals ? "Included" : "Not included"}</p><p className="mt-1 text-xs text-white/50">Mode: {draft.savingsGoalMode === "all" ? "All active" : draft.savingsGoalMode === "selected" ? "Selected" : "None"}</p></div><div className="rounded-2xl border border-white/12 bg-white/[0.045] p-4"><p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">Emergency Fund</p><p className="mt-1 text-sm font-black">{draft.includeEmergencyFund ? "Included" : "Not included"}</p><p className="mt-1 text-xs text-white/50">Method: {draft.emergencyFundContributionMode}</p>{draft.includeEmergencyFund && draft.emergencyFundContributionMode === "fixed" ? <p className="mt-1 text-xs text-white/50">Monthly reserve: {fmt(draft.emergencyFundMonthlyAmount)}</p> : null}</div><p className="rounded-2xl border border-cyan-300/15 bg-cyan-400/8 px-4 py-3 text-xs leading-5 text-cyan-50/70">CLARA will subtract these protected commitments before judging extra spending.</p><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setStep(3)} className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white/70">Back</button><button type="button" onClick={()=>commit()} className="rounded-2xl bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-600 px-4 py-3 text-sm font-black text-white">Save settings</button></div></div> : null}
    </div>
  </div>;
}

export default function MonthlyBudgetPlan() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserRole();
  const { budgets = [], expenses = [], savingsGoals = [], emergencyFund = null, addBudget, updateBudget, deleteBudget, refreshData, loading } = useFinancialData(user);
  const { monthlyBudgetHeader, declaredMonthlyBudgetAmount } = useDashboardMonthlyBudgetHeader({ budgets });
  const budgetOptions = useDashboardManualExpenseBudgetOptions({ budgets });
  const [protectionSettings, setProtectionSettings] = useState(() => readProtectionSettings());
  const [protectionOpen, setProtectionOpen] = useState(false);
  const plan = useDashboardMonthlyBudgetPlan({ manualExpenseBudgetOptions: budgetOptions, expenses, declaredMonthlyBudgetAmount, monthlyBudgetHeader, savingsGoals, emergencyFund });
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
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const sync = () => setProtectionSettings(readProtectionSettings());
    window.addEventListener("storage", sync);
    window.addEventListener(BUDGET_PROTECTION_UPDATED_EVENT, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(BUDGET_PROTECTION_UPDATED_EVENT, sync); };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__CLARA_BUDGET_PROTECTION_CONTEXT = { savingsGoals, emergencyFund };
    window.dispatchEvent(new CustomEvent(BUDGET_PROTECTION_UPDATED_EVENT, { detail: { settings: readProtectionSettings() } }));
  }, [emergencyFund, savingsGoals]);
  useEffect(() => { if (!protectionSettings.setupCompleted) setProtectionOpen(true); }, [protectionSettings.setupCompleted]);

  const cycle = getCycleWindow(cycleType, cycleStart, cycleEnd);
  const declared = firstValidNumber(declaredInput, declaredMonthlyBudgetAmount);
  const allocated = plan.allocated;
  const protectedAmount = firstValidNumber(plan.totalProtectedCommitments, plan.protected_commitments_total);
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
    <ProtectionSetupModal open={protectionOpen} settings={protectionSettings} savingsGoals={savingsGoals} emergencyFund={emergencyFund} onClose={() => setProtectionOpen(false)} onSave={(saved) => { setProtectionSettings(saved); setProtectionOpen(false); fireBudgetEvents(); }} />
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

      <section className={`${card} border-emerald-300/14 bg-emerald-400/[0.055]`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0"><p className="text-sm font-black text-emerald-50">Budget Protection</p><p className="mt-1 text-xs font-semibold leading-5 text-emerald-50/58">Savings Goals and Emergency Fund reserved before extra spending.</p></div>
          <button type="button" onClick={()=>setProtectionOpen(true)} className="shrink-0 rounded-2xl border border-emerald-300/25 bg-emerald-400/12 px-3 py-2 text-xs font-black text-emerald-50">{protectionSettings.setupCompleted ? "Edit" : "Setup"}</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2"><Tile label="Protected" value={fmt(protectedAmount)} accent/><Tile label="Status" value={protectionSettings.setupCompleted ? "Ready" : "Not Set"}/></div>
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
