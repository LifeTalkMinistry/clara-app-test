import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Briefcase, Camera, Check, ChevronDown, Eye, Flame, Loader2, Lock,
  MessageCircle, Pencil, Route, Save, Shield, Target, TrendingUp, Trophy, Upload,
  Wallet, X,
} from "lucide-react";
import { backendRequest, getStoredBackendToken, getStoredBackendUser } from "@/lib/clara-backend-client";

const FINANCE_UPDATE_TYPE = "clara_financial_profile_v1";
const PRIVATE_FINANCE_PREFIX = "clara-community-private-finance-v1:";
const VISIBILITY_OPTIONS = [["community", "Share exact"], ["range", "Share range"], ["private", "Private"]];
const F = (key, label, placeholder = "Optional", sensitive = false, multiline = false) => ({ key, label, placeholder, sensitive, multiline });
const FINANCE_SECTIONS = [
  { key: "identity", title: "My Money Identity", short: "Identity", subtitle: "Work, money personality, and responsibilities.", icon: Briefcase, fields: [
    F("occupation", "Occupation", "e.g. Call Center Agent"), F("industry", "Industry", "e.g. BPO / Customer Service"),
    F("employment_type", "Employment type", "Employed, freelance, business, student..."), F("income_sources", "Income sources", "e.g. Salary + side hustle"),
    F("money_personality", "Money personality", "Saver, planner, recovering overspender..."), F("financial_mode", "Financial mode", "Debt payoff, income growth, starting over..."),
    F("responsibilities", "Financial responsibilities", "Breadwinner, supporting parents, household contributor..."), F("people_supported", "People financially supported", "e.g. 3 people", true),
    F("family_support", "Monthly family support", "e.g. ₱5k–₱10k", true),
  ]},
  { key: "today", title: "My Money Today", short: "Money", subtitle: "A snapshot of where your money stands right now.", icon: Wallet, fields: [
    F("monthly_income", "Monthly income", "e.g. ₱25k–₱40k", true), F("monthly_budget", "Monthly budget", "e.g. ₱28,000", true),
    F("monthly_expenses", "Average monthly expenses", "e.g. ₱24,000", true), F("left_after_payday", "Usually left after payday", "e.g. ₱2k–₱5k", true),
    F("savings_balance", "Savings balance", "e.g. ₱10k–₱25k", true), F("emergency_fund", "Emergency fund", "e.g. 1.5 months of expenses", true),
    F("debt_total", "Current debt total", "e.g. ₱10k–₱25k", true), F("monthly_debt_payment", "Monthly debt payments", "e.g. ₱3,000", true),
    F("investments", "Investments", "e.g. Starting / ₱10k–₱25k", true), F("net_worth", "Net worth", "Optional", true),
    F("cash_available", "Cash available", "Optional", true), F("savings_rate", "Savings rate", "e.g. 15%", true),
  ]},
  { key: "dreams", title: "Goals & Dreams", short: "Dreams", subtitle: "What you want your money to make possible.", icon: Target, fields: [
    F("main_goal", "#1 money goal right now", "e.g. Build a ₱100k emergency fund"), F("dream_house", "Dream house", "What kind of home are you dreaming about?"),
    F("dream_car", "Dream car"), F("dream_job", "Dream job", "What work would you love to do?"), F("dream_business", "Dream business", "What would you love to build?"),
    F("dream_monthly_income", "Dream monthly income", "e.g. ₱100k+/month", true), F("dream_lifestyle", "Dream lifestyle", "Describe the life you are building toward.", false, true),
    F("dream_travel", "Dream travel destination"), F("biggest_life_goal", "Biggest life goal", "What would make all the discipline worth it?", false, true),
    F("financial_freedom_age", "Target age for financial freedom", "e.g. 45", true), F("emergency_fund_target", "Emergency fund target", "e.g. ₱100,000", true),
    F("savings_goal", "Savings goal", "e.g. ₱250,000", true), F("debt_free_target", "Debt-free target", "e.g. December 2027"), F("house_fund", "House fund target", "Optional", true),
    F("car_fund", "Car fund target", "Optional", true), F("business_capital", "Business capital target", "Optional", true), F("education_fund", "Education fund", "Optional", true),
    F("wedding_fund", "Wedding fund", "Optional", true), F("travel_fund", "Travel fund", "Optional", true), F("retirement_goal", "Retirement goal", "Optional", true),
    F("investment_target", "Investment target", "Optional", true), F("monthly_savings_target", "Monthly savings target", "e.g. ₱5,000/month", true),
  ]},
  { key: "journey", title: "My Money Journey", short: "Journey", subtitle: "The mission, struggles, lessons, and reasons behind the numbers.", icon: Route, fields: [
    F("current_mission", "Current financial mission", "e.g. Stop living paycheck to paycheck"), F("mission_progress", "Mission progress", "e.g. ₱31,200 / ₱50,000", true),
    F("biggest_money_struggle", "Biggest money struggle", "What are you trying to overcome?", false, true), F("hardest_expense", "Hardest expense to control", "e.g. Food delivery"),
    F("impulse_purchase", "Typical impulse purchase", "e.g. Online shopping"), F("favorite_spend", "Favorite thing to spend on"), F("expense_to_reduce", "Expense I am reducing", "e.g. Eating out"),
    F("unplanned_spending", "Average unplanned spending", "Optional", true), F("why_saving", "Why I am saving", "Who or what are you saving for?", false, true),
    F("biggest_money_lesson", "Biggest money lesson", "What did money teach you?", false, true), F("biggest_financial_mistake", "Biggest financial mistake", "Optional", false, true),
    F("mindset_change", "What changed my money mindset", "Optional", false, true), F("advice_younger_self", "Advice to my younger self", "Optional", false, true),
    F("financial_why", "Why I want financial control", "The deeper reason behind your journey.", false, true),
  ]},
  { key: "discipline", title: "Discipline & Challenges", short: "Challenges", subtitle: "The habits and accountability you are building with CLARA.", icon: Trophy, fields: [
    F("current_challenge", "Current challenge", "e.g. 30-Day CLARA Streak"), F("weekly_progress", "Weekly challenge progress", "e.g. 5 / 7"),
    F("monthly_progress", "Monthly challenge progress", "e.g. 3 / 4 weeks"), F("thirty_day_streak", "Current streak", "e.g. 17 days"), F("longest_streak", "Longest streak", "e.g. 31 days"),
    F("challenges_completed", "Challenges completed", "e.g. 4"), F("challenge_xp", "Challenge points / XP", "e.g. 820"), F("spend_checks", "Spend Checks completed", "e.g. 46"),
    F("purchases_avoided", "Purchases CLARA helped me avoid", "e.g. 12"), F("money_saved_saying_no", "Money saved by saying no", "e.g. ₱8,500", true),
    F("badges", "Badges earned", "e.g. 30-Day Finisher, Smart Spender"),
  ]},
  { key: "progress", title: "Progress & Milestones", short: "Progress", subtitle: "Before vs now — the proof that your money habits are changing.", icon: TrendingUp, fields: [
    F("joined_savings", "Savings when I joined", "Optional", true), F("current_savings", "Savings today", "Optional", true), F("joined_debt", "Debt when I joined", "Optional", true),
    F("current_debt", "Debt today", "Optional", true), F("joined_income", "Income when I joined", "Optional", true), F("current_income", "Income today", "Optional", true),
    F("best_savings_month", "Best savings month", "e.g. Saved ₱12,000 in June", true), F("biggest_savings_milestone", "Biggest savings milestone", "e.g. First ₱50,000 saved", true),
    F("biggest_debt_conquered", "Biggest debt conquered", "Optional", true), F("first_under_budget", "First month under budget", "e.g. July 2026"),
    F("first_without_borrowing", "First month without borrowing"), F("first_side_hustle", "First side-hustle income", "Optional", true), F("first_investment", "First investment"),
    F("proudest_money_win", "Proudest money win", "What are you most proud of?", false, true), F("milestone_timeline", "Money milestone timeline", "Add the milestones you never want to forget.", false, true),
  ]},
];

const SECTION_BY_KEY = Object.fromEntries(FINANCE_SECTIONS.map((section) => [section.key, section]));
const TOP_TABS = [{ key: "overview", label: "Overview" }, { key: "today", label: "Money" }, { key: "dreams", label: "Dreams" }];
const MORE_TABS = ["identity", "journey", "discipline", "progress"];

const entry = (raw, sensitive = false) => raw && typeof raw === "object" && !Array.isArray(raw)
  ? { value: String(raw.value || ""), visibility: sensitive && ["community", "range", "private"].includes(raw.visibility) ? raw.visibility : "community" }
  : { value: String(raw || ""), visibility: "community" };
const emptyFinance = () => Object.fromEntries(FINANCE_SECTIONS.map((s) => [s.key, Object.fromEntries(s.fields.map((f) => [f.key, entry("", f.sensitive)]))]));
const normalizeFinance = (raw = {}) => { const out = emptyFinance(); FINANCE_SECTIONS.forEach((s) => s.fields.forEach((f) => { out[s.key][f.key] = entry(raw?.[s.key]?.[f.key], f.sensitive); })); return out; };
const financeValue = (finance, section, key) => String(finance?.[section]?.[key]?.value || "").trim();
const extractSharedFinance = (profile) => normalizeFinance([...(Array.isArray(profile?.profile_updates) ? profile.profile_updates : [])].reverse().find((x) => x?.type === FINANCE_UPDATE_TYPE)?.data || {});
const privateKey = (id) => `${PRIVATE_FINANCE_PREFIX}${String(id || "unknown")}`;
const loadPrivateFinance = (id) => { if (typeof window === "undefined" || !id) return emptyFinance(); try { return normalizeFinance(JSON.parse(localStorage.getItem(privateKey(id)) || "{}")); } catch { return emptyFinance(); } };
const mergeOwnFinance = (shared, local) => { const out = normalizeFinance(shared); FINANCE_SECTIONS.forEach((s) => s.fields.forEach((f) => { const p = local?.[s.key]?.[f.key]; if (p?.visibility === "private" && String(p.value || "").trim()) out[s.key][f.key] = { value: String(p.value), visibility: "private" }; })); return out; };
const buildSharedFinance = (finance) => Object.fromEntries(FINANCE_SECTIONS.map((s) => { const values = Object.fromEntries(s.fields.map((f) => { const e = entry(finance?.[s.key]?.[f.key], f.sensitive), value = e.value.trim(); return value && e.visibility !== "private" ? [f.key, { value, visibility: f.sensitive ? e.visibility : "community" }] : null; }).filter(Boolean)); return Object.keys(values).length ? [s.key, values] : null; }).filter(Boolean));
const buildPrivateFinance = (finance) => Object.fromEntries(FINANCE_SECTIONS.map((s) => { const values = Object.fromEntries(s.fields.filter((f) => f.sensitive).map((f) => { const e = entry(finance?.[s.key]?.[f.key], true), value = e.value.trim(); return value && e.visibility === "private" ? [f.key, { value, visibility: "private" }] : null; }).filter(Boolean)); return Object.keys(values).length ? [s.key, values] : null; }).filter(Boolean));

function getInitials(name = "", email = "") { const source = String(name || "").trim() || String(email || "").trim() || "CL"; const parts = source.split(/\s+/).filter(Boolean); return (parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2)).toUpperCase(); }
function formatJoined(value) { if (!value) return "CLARA member"; try { return `Member since ${new Intl.DateTimeFormat("en-PH", { month: "short", year: "numeric" }).format(new Date(value))}`; } catch { return "CLARA member"; } }
function loadImage(file) { return new Promise((resolve, reject) => { const url = URL.createObjectURL(file), img = new Image(); img.onload = () => { URL.revokeObjectURL(url); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Unable to read that image.")); }; img.src = url; }); }
async function compressImage(file, kind) { if (!file?.type?.startsWith("image/")) throw new Error("Please choose an image file."); if (file.size > 8 * 1024 * 1024) throw new Error("Please choose an image smaller than 8 MB."); const img = await loadImage(file), maxW = kind === "cover" ? 1400 : 900, maxH = kind === "cover" ? 700 : 900; const scale = Math.min(1, maxW / img.width, maxH / img.height), canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(img.width * scale)); canvas.height = Math.max(1, Math.round(img.height * scale)); canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height); return canvas.toDataURL("image/jpeg", 0.76); }

function PrivacyBadge({ visibility }) {
  if (visibility === "range") return <span className="rounded-full border border-amber-300/15 bg-amber-300/[0.07] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-amber-100/70">Range</span>;
  if (visibility === "private") return <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-white/42"><Lock className="h-2.5 w-2.5" /> Private</span>;
  return null;
}

function ProfileTabs({ activeTab, setActiveTab, moreOpen, setMoreOpen }) {
  const moreActive = MORE_TABS.includes(activeTab);
  return <>
    <nav className="mt-3 border-y border-white/10 bg-[#071725]/72 px-1 py-2">
      <div className="flex items-center gap-1">
        {TOP_TABS.map((tab) => <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); setMoreOpen(false); }} className={`h-10 flex-1 rounded-xl px-3 text-[11px] font-black transition ${activeTab === tab.key ? "bg-[#22c7b8]/14 text-[#ccfbf1]" : "text-white/46 hover:bg-white/[0.04]"}`}>{tab.label}</button>)}
        <button type="button" onClick={() => setMoreOpen((current) => !current)} className={`flex h-10 flex-1 items-center justify-center gap-1 rounded-xl px-3 text-[11px] font-black transition ${moreActive || moreOpen ? "bg-[#22c7b8]/14 text-[#ccfbf1]" : "text-white/46 hover:bg-white/[0.04]"}`}>More <ChevronDown className={`h-3.5 w-3.5 transition ${moreOpen ? "rotate-180" : ""}`} /></button>
      </div>
    </nav>
    {moreOpen ? <div className="mt-2 grid grid-cols-2 gap-2 rounded-[20px] border border-white/10 bg-[#0a1a29] p-2 shadow-xl">{MORE_TABS.map((key) => { const section = SECTION_BY_KEY[key], Icon = section.icon; return <button key={key} type="button" onClick={() => { setActiveTab(key); setMoreOpen(false); }} className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-left ${activeTab === key ? "border-[#22c7b8]/28 bg-[#22c7b8]/10" : "border-white/[0.06] bg-[#071725]"}`}><Icon className="h-4 w-4 shrink-0 text-[#99f6e4]/75"/><span className="text-[10px] font-black text-white/70">{section.short}</span></button>; })}</div> : null}
  </>;
}

function SectionPanel({ section, finance, own }) {
  const Icon = section.icon;
  const filled = section.fields.filter((field) => financeValue(finance, section.key, field.key));
  return <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-5">
    <div className="flex items-start gap-3 border-b border-white/[0.07] pb-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#22c7b8]/15 bg-[#22c7b8]/[0.07] text-[#99f6e4]"><Icon className="h-[18px] w-[18px]"/></div>
      <div className="min-w-0"><h3 className="text-sm font-black">{section.title}</h3><p className="mt-1 text-[10px] font-semibold leading-4 text-white/35">{section.subtitle}</p></div>
    </div>
    {filled.length ? <div>{filled.map((field, index) => { const e = finance?.[section.key]?.[field.key] || {}; return <div key={field.key} className={`py-4 ${index < filled.length - 1 ? "border-b border-white/[0.06]" : ""}`}><div className="flex items-center justify-between gap-3"><p className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">{field.label}</p>{own ? <PrivacyBadge visibility={e.visibility}/> : e.visibility === "range" ? <PrivacyBadge visibility="range"/> : null}</div><p className="mt-1.5 whitespace-pre-wrap text-[13px] font-semibold leading-5 text-white/76">{e.value}</p></div>; })}</div> : <div className="py-8 text-center"><p className="text-xs font-bold text-white/42">{own ? "Nothing added here yet." : "This member has not shared anything here yet."}</p>{own ? <p className="mt-1 text-[10px] text-white/28">Use Edit Profile whenever you are ready.</p> : null}</div>}
  </section>;
}

function FieldEditor({ sectionKey, field, value, onChange }) {
  const e = entry(value, field.sensitive), base = "w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-semibold text-white outline-none placeholder:text-white/22 focus:border-[#22c7b8]/45";
  return <div className="border-b border-white/[0.07] py-4 last:border-b-0">
    <div className="mb-2 flex items-center justify-between gap-3"><span className="text-[11px] font-black text-white/58">{field.label}</span>{field.sensitive ? <select value={e.visibility} onChange={(ev) => onChange(sectionKey, field.key, { ...e, visibility: ev.target.value })} className="h-8 rounded-xl border border-white/10 bg-[#071725] px-2 text-[9px] font-black text-white/55 outline-none">{VISIBILITY_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select> : null}</div>
    {field.multiline ? <textarea rows={4} value={e.value} onChange={(ev) => onChange(sectionKey, field.key, { ...e, value: ev.target.value })} maxLength={700} placeholder={field.placeholder} className={`${base} resize-none py-3 leading-6`}/> : <input value={e.value} onChange={(ev) => onChange(sectionKey, field.key, { ...e, value: ev.target.value })} maxLength={180} placeholder={field.placeholder} className={`${base} h-11`}/>} 
    {field.sensitive && e.visibility === "range" ? <p className="mt-2 text-[9px] font-semibold leading-4 text-amber-100/45">Enter a range instead of an exact amount, for example ₱25k–₱40k.</p> : null}
    {field.sensitive && e.visibility === "private" ? <p className="mt-2 flex items-center gap-1.5 text-[9px] font-semibold leading-4 text-white/32"><Shield className="h-3 w-3"/> Private values stay on this device and are not uploaded.</p> : null}
  </div>;
}

function EditTabs({ active, setActive }) {
  const tabs = [{ key: "basic", label: "Basic" }, ...FINANCE_SECTIONS.map((section) => ({ key: section.key, label: section.short }))];
  return <div className="mt-3 overflow-x-auto border-y border-white/10 bg-[#071725]/72 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="flex min-w-max gap-1 px-1">{tabs.map((tab) => <button key={tab.key} type="button" onClick={() => setActive(tab.key)} className={`h-9 rounded-xl px-3 text-[10px] font-black transition ${active === tab.key ? "bg-[#22c7b8]/14 text-[#ccfbf1]" : "text-white/42"}`}>{tab.label}</button>)}</div></div>;
}

export default function CommunityProfile() {
  const navigate = useNavigate(), { userId } = useParams(), backendUser = getStoredBackendUser(), token = getStoredBackendToken();
  const targetId = userId || backendUser?.id || null, own = !userId || String(userId) === String(backendUser?.id || "");
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [editing, setEditing] = useState(false), [uploading, setUploading] = useState("");
  const [error, setError] = useState(""), [success, setSuccess] = useState(""), [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"), [moreOpen, setMoreOpen] = useState(false), [editTab, setEditTab] = useState("basic");
  const [form, setForm] = useState({ display_name: "", headline: "", bio: "", avatar_url: "", cover_url: "", financial: emptyFinance() });

  useEffect(() => { let mounted = true; (async () => {
    if (!token || !targetId) return navigate("/login", { replace: true });
    try {
      setLoading(true); setError("");
      const data = await backendRequest(own ? "/api/community/profile/me" : `/api/community/profiles/${encodeURIComponent(targetId)}`, { token });
      if (!mounted) return;
      const shared = extractSharedFinance(data), financial = own ? mergeOwnFinance(shared, loadPrivateFinance(targetId)) : shared, hydrated = { ...data, _financial_profile: financial };
      setProfile(hydrated);
      setForm({ display_name: data?.display_name || data?.full_name || "CLARA Member", headline: data?.headline || "", bio: data?.bio || "", avatar_url: data?.avatar_url || "", cover_url: data?.cover_url || "", financial });
    } catch (e) { if (mounted) setError(e?.message || "Unable to load this community profile."); }
    finally { if (mounted) setLoading(false); }
  })(); return () => { mounted = false; }; }, [navigate, own, targetId, token]);

  const live = editing ? { ...profile, ...form } : profile || {}, finance = editing ? form.financial : profile?._financial_profile || emptyFinance();
  const initials = useMemo(() => getInitials(live.display_name || live.full_name, live.email), [live.display_name, live.full_name, live.email]);
  const updateField = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setSuccess(""); };
  const updateFinance = (section, key, value) => { setForm((current) => ({ ...current, financial: { ...current.financial, [section]: { ...current.financial[section], [key]: value } } })); setSuccess(""); };
  const handleImage = async (file, kind) => { if (!file) return; try { setUploading(kind); setError(""); updateField(kind === "avatar" ? "avatar_url" : "cover_url", await compressImage(file, kind)); } catch (e) { setError(e?.message || "Unable to prepare that image."); } finally { setUploading(""); } };
  const startEditing = () => { setForm({ display_name: profile?.display_name || profile?.full_name || "CLARA Member", headline: profile?.headline || "", bio: profile?.bio || "", avatar_url: profile?.avatar_url || "", cover_url: profile?.cover_url || "", financial: normalizeFinance(profile?._financial_profile || {}) }); setEditTab("basic"); setError(""); setSuccess(""); setEditing(true); };
  const saveProfile = async () => {
    try {
      setSaving(true); setError("");
      const old = Array.isArray(profile?.profile_updates) ? profile.profile_updates : [], shared = buildSharedFinance(form.financial);
      const updates = [...old.filter((x) => x?.type !== FINANCE_UPDATE_TYPE), { type: FINANCE_UPDATE_TYPE, version: 1, data: shared, updated_at: new Date().toISOString() }].slice(-50);
      try { localStorage.setItem(privateKey(targetId), JSON.stringify(buildPrivateFinance(form.financial))); } catch {}
      const updated = await backendRequest("/api/community/profile/me", { method: "PATCH", token, timeoutMs: 20000, body: { display_name: form.display_name.trim() || "CLARA Member", headline: form.headline.trim(), bio: form.bio.trim(), avatar_url: form.avatar_url, cover_url: form.cover_url, profile_updates: updates } });
      setProfile({ ...updated, _financial_profile: normalizeFinance(form.financial) }); setEditing(false); setSuccess("Community financial profile updated online.");
    } catch (e) { setError(e?.message || "Unable to save your profile right now."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-[#06111f] text-white"><Loader2 className="h-8 w-8 animate-spin text-[#22c7b8]"/></div>;

  const mission = financeValue(finance, "journey", "current_mission"), goal = financeValue(finance, "dreams", "main_goal") || financeValue(finance, "dreams", "biggest_life_goal"), streak = financeValue(finance, "discipline", "thirty_day_streak");
  const activeSection = SECTION_BY_KEY[activeTab];
  const editSection = SECTION_BY_KEY[editTab];

  return <div className="min-h-screen bg-[#06111f] text-white"><div className="mx-auto w-full max-w-md px-4 pb-24 pt-4">
    <header className="mb-4 flex items-center justify-between gap-3">
      <button type="button" onClick={() => navigate("/community")} className="flex h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 text-white/85"><ArrowLeft className="h-4 w-4"/><span className="text-[11px] font-black">Community</span></button>
      <div className="text-center"><p className="text-[9px] font-black uppercase tracking-[0.28em] text-[#5eead4]/60">CLARA Community</p><h1 className="mt-0.5 text-sm font-black">Profile</h1></div>
      {own ? editing ? <button type="button" onClick={() => setEditing(false)} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-white/70"><X className="h-4 w-4"/></button> : <button type="button" onClick={startEditing} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#22c7b8]/25 bg-[#22c7b8]/10 px-3 text-xs font-black text-[#ccfbf1]"><Pencil className="h-4 w-4"/> Edit</button> : <button type="button" onClick={() => navigate(`/messages?userId=${encodeURIComponent(targetId)}`)} className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#22c7b8]/25 bg-[#22c7b8]/10 px-3 text-xs font-black text-[#ccfbf1]"><MessageCircle className="h-4 w-4"/> Message</button>}
    </header>

    <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[#0a1a29] shadow-[0_18px_54px_rgba(0,0,0,0.26)]">
      <div className="relative h-32 bg-[linear-gradient(135deg,#0f766e_0%,#14b8a6_58%,#22c7b8_100%)]" style={live.cover_url ? { backgroundImage: `linear-gradient(135deg,rgba(6,95,87,.42),rgba(34,199,184,.24)),url("${live.cover_url}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}><div className="absolute right-[-24px] top-[-22px] h-32 w-32 rounded-full bg-white/10"/></div>
      <div className="relative px-5 pb-5">
        <div className="-mt-12 flex items-end justify-between gap-3"><div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#0a1a29] bg-[#123346] text-2xl font-black shadow-[0_12px_30px_rgba(0,0,0,0.28)]">{live.avatar_url ? <img src={live.avatar_url} alt="Profile" className="h-full w-full object-cover"/> : initials}</div>{editing ? <div className="mb-1 flex gap-2"><label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-bold text-white/80">{uploading === "avatar" ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Camera className="h-3.5 w-3.5"/>} Photo<input type="file" accept="image/*" className="hidden" onChange={(e) => { handleImage(e.target.files?.[0], "avatar"); e.target.value = ""; }}/></label><label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-[11px] font-bold text-white/80">{uploading === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Upload className="h-3.5 w-3.5"/>} Cover<input type="file" accept="image/*" className="hidden" onChange={(e) => { handleImage(e.target.files?.[0], "cover"); e.target.value = ""; }}/></label></div> : null}</div>
        <div className="mt-4"><h2 className="text-[28px] font-black leading-none tracking-[-0.035em]">{live.display_name || live.full_name || "CLARA Member"}</h2><p className="mt-2 text-sm font-semibold leading-5 text-[#ccfbf1]/78">{live.headline || "Building better money habits, one decision at a time."}</p><div className="mt-4 flex flex-wrap items-center gap-2"><div className="inline-flex items-center gap-2 rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#99f6e4]"><span className="h-1.5 w-1.5 rounded-full bg-[#2dd4bf]"/> Community Member</div><span className="text-[11px] font-semibold text-white/38">{formatJoined(profile?.created_at)}</span></div></div>
      </div>
    </section>

    {editing ? <EditTabs active={editTab} setActive={setEditTab}/> : <ProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} moreOpen={moreOpen} setMoreOpen={setMoreOpen}/>} 

    {error ? <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}
    {success ? <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#22c7b8]/18 bg-[#22c7b8]/8 px-4 py-3 text-sm font-semibold text-[#ccfbf1]"><Check className="h-4 w-4"/>{success}</div> : null}

    {editing ? <div className="mt-4">
      {editTab === "basic" ? <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/58">Basic profile</p><div className="mt-4 space-y-4"><label className="block"><span className="mb-2 block text-xs font-bold text-white/55">Display name</span><input value={form.display_name} onChange={(e) => updateField("display_name", e.target.value)} maxLength={60} className="h-12 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-semibold outline-none focus:border-[#22c7b8]/45"/></label><label className="block"><span className="mb-2 block text-xs font-bold text-white/55">Status / headline</span><input value={form.headline} onChange={(e) => updateField("headline", e.target.value)} maxLength={120} className="h-12 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-semibold outline-none focus:border-[#22c7b8]/45" placeholder="What are you working toward?"/></label><label className="block"><span className="mb-2 block text-xs font-bold text-white/55">My financial story</span><textarea rows={5} value={form.bio} onChange={(e) => updateField("bio", e.target.value)} maxLength={800} className="w-full resize-none rounded-2xl border border-white/10 bg-[#071725] px-4 py-3 text-sm font-semibold leading-6 outline-none focus:border-[#22c7b8]/45" placeholder="Tell the community about your money journey, mission, or reason for being here."/></label></div></section> : editSection ? <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-5"><div className="flex items-start gap-3 border-b border-white/[0.07] pb-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#22c7b8]/[0.08] text-[#99f6e4]"><editSection.icon className="h-4 w-4"/></div><div><p className="text-sm font-black">{editSection.title}</p><p className="mt-1 text-[10px] font-semibold leading-4 text-white/35">{editSection.subtitle}</p></div></div><div>{editSection.fields.map((field) => <FieldEditor key={field.key} sectionKey={editSection.key} field={field} value={form.financial?.[editSection.key]?.[field.key]} onChange={updateFinance}/>)}</div></section> : null}
      <button type="button" onClick={saveProfile} disabled={saving || uploading} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#22c7b8] font-black text-[#042f2e] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{saving ? "Saving online..." : "Save Profile"}</button>
    </div> : <div className="mt-4">
      {activeTab === "overview" ? <div className="space-y-3">
        <section className="rounded-[24px] border border-[#22c7b8]/14 bg-[#0a1a29] p-4"><div className="grid grid-cols-3 gap-2">{[[Flame, "Right now", mission, "Add your mission"], [Target, "Main goal", goal, "Add your goal"], [Trophy, "Streak", streak, "Add streak"]].map(([Icon, label, value, fallback]) => <div key={label} className="min-w-0 rounded-2xl border border-white/[0.07] bg-[#071725] px-3 py-3"><Icon className="h-3.5 w-3.5 text-[#5eead4]/65"/><p className="mt-2 text-[8px] font-black uppercase tracking-[0.1em] text-white/28">{label}</p><p className="mt-1 line-clamp-2 text-[10px] font-bold leading-4 text-white/70">{value || (own ? fallback : "Not shared")}</p></div>)}</div></section>
        <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#5eead4]/58">My financial story</p><p className="mt-3 text-sm font-semibold leading-7 text-white/72">{profile?.bio || (own ? "Tell the community why you are here, what you are working through, or what you hope money will make possible." : "This member has not shared their financial story yet.")}</p></section>
        {own ? <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#22c7b8]/[0.08] text-[#99f6e4]"><Eye className="h-4 w-4"/></div><div><p className="text-xs font-black">Share bravely, not recklessly.</p><p className="mt-1 text-[10px] font-semibold leading-5 text-white/35">Use ranges when you want context without exact numbers. Private financial fields stay only on this device and are never uploaded to the Community profile.</p></div></div></section> : null}
      </div> : activeSection ? <SectionPanel section={activeSection} finance={finance} own={own}/> : null}
    </div>}
  </div></div>;
}
