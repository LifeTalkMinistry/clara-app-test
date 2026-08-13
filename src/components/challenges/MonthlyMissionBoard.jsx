import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Check,
  ChevronRight,
  Info,
  MessageSquareText,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Trophy,
  WalletCards,
  X,
} from "lucide-react";

export const MONTHLY_ENTRY_ID = "monthly-mission-v2";
export const MONTHLY_ACTIVITY_EVENT = "clara:monthly-mission-activity";
const TARGET_DAYS = 20;
const PH_TIME_ZONE = "Asia/Manila";

export const MONTHLY_MISSION_POOL = [
  { id: "spend-smarter", name: "Spend Smarter", feature: "Ask Before You Spend", icon: BrainCircuit, summary: "Pause with CLARA before unplanned purchases." },
  { id: "expense-logger", name: "Know Where It Goes", feature: "Transactions", icon: ReceiptText, summary: "Log your real expenses consistently throughout the month." },
  { id: "budget-pulse", name: "Budget Pulse", feature: "Budget", icon: WalletCards, summary: "Stay close to your plan through regular budget reviews." },
  { id: "savings-builder", name: "Savings Builder", feature: "Savings Goals", icon: PiggyBank, summary: "Build the habit of moving money toward a goal." },
  { id: "money-tip", name: "Money Tip Creator", feature: "Community", icon: MessageSquareText, summary: "Share useful money lessons with the CLARA community." },
  { id: "emergency-builder", name: "Emergency Builder", feature: "Emergency Fund", icon: ShieldCheck, summary: "Strengthen your safety net through consistent action." },
];

function phParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: PH_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  return Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
}

function monthWindow() {
  const now = new Date();
  const parts = phParts(now);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const next = new Date(Date.UTC(year, month, 1));
  return {
    monthKey: `${parts.year}-${parts.month}`,
    monthLabel: new Intl.DateTimeFormat("en-PH", { timeZone: PH_TIME_ZONE, month: "long", year: "numeric" }).format(now),
    day,
    daysInMonth: lastDay,
    daysLeft: Math.max(0, lastDay - day),
    nextRevealLabel: new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", month: "long", day: "numeric" }).format(next),
  };
}

function RulesSheet({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[240] flex items-end bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:justify-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#081827] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#5eead4]/60">Monthly Mission Rules</p><h3 className="mt-1 text-xl font-black text-white">Consistency, not perfection.</h3></div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/55"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 space-y-3 text-[12px] font-semibold leading-5 text-white/55">
          <p>One official CLARA mission is featured each month, and the activity happens inside CLARA.</p>
          <p>This month, record at least one real expense on <b className="text-white">20 different days</b>.</p>
          <p>Missing a day does <b className="text-white">not</b> reset progress. Monthly rewards repeated action across the month.</p>
          <p>There is no manual Monthly check-in button. Only the qualifying CLARA action counts.</p>
        </div>
        <div className="mt-5 rounded-[18px] border border-[#facc15]/15 bg-[#facc15]/[0.045] p-3 text-[11px] font-bold text-[#fde68a]/75">Weekly = streak · Monthly = consistency · 30-Day = official Daily Money Tip streak.</div>
      </div>
    </div>
  );
}

export default function MonthlyMissionBoard({ progress, setProgress }) {
  const navigate = useNavigate();
  const [rulesOpen, setRulesOpen] = useState(false);
  const calendar = useMemo(() => monthWindow(), []);
  const entry = progress?.[MONTHLY_ENTRY_ID] || null;
  const joined = entry?.monthKey === calendar.monthKey && Boolean(entry?.joinedAt);
  const checkIns = joined && Array.isArray(entry?.checkIns) ? entry.checkIns : [];
  const progressCount = Math.min(TARGET_DAYS, checkIns.length);
  const percent = Math.min(100, Math.round((progressCount / TARGET_DAYS) * 100));
  const completed = joined && progressCount >= TARGET_DAYS;
  const expected = Math.min(TARGET_DAYS, Math.ceil((calendar.day / calendar.daysInMonth) * TARGET_DAYS));
  const status = completed ? "Completed" : !joined ? "Not joined" : progressCount >= expected ? "On track" : "Building";

  useEffect(() => {
    const handleActivity = (event) => {
      if (!joined || event?.detail?.type !== "expense_logged") return;
      const dayKey = String(event?.detail?.dayKey || "").slice(0, 10);
      if (!dayKey.startsWith(`${calendar.monthKey}-`)) return;
      setProgress((current) => {
        const currentEntry = current?.[MONTHLY_ENTRY_ID] || {};
        const currentDays = Array.isArray(currentEntry.checkIns) ? currentEntry.checkIns : [];
        if (currentEntry.monthKey !== calendar.monthKey || currentDays.includes(dayKey)) return current;
        const nextDays = [...currentDays, dayKey].sort();
        return { ...current, [MONTHLY_ENTRY_ID]: { ...currentEntry, checkIns: nextDays, completedAt: nextDays.length >= TARGET_DAYS ? currentEntry.completedAt || new Date().toISOString() : null } };
      });
    };
    window.addEventListener(MONTHLY_ACTIVITY_EVENT, handleActivity);
    return () => window.removeEventListener(MONTHLY_ACTIVITY_EVENT, handleActivity);
  }, [calendar.monthKey, joined, setProgress]);

  const joinMission = () => {
    setProgress((current) => ({ ...current, [MONTHLY_ENTRY_ID]: { monthKey: calendar.monthKey, missionId: "expense-logger", joinedAt: new Date().toISOString(), checkIns: [], completedAt: null } }));
  };

  return (
    <>
      <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0a1a29]">
        <div className="border-b border-white/[0.07] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-[#facc15]/20 bg-[#facc15]/[0.055] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#fde68a]"><Sparkles className="h-3 w-3" /> {calendar.monthLabel} Mission</span><span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[9px] font-black text-white/42">30-day consistency mission</span></div>
              <h3 className="mt-4 text-[22px] font-black tracking-[-0.04em] text-white">Know Where Your Money Goes</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/47">Log at least one real expense on 20 different days this month. Missing a day does not reset your progress.</p>
            </div>
            <button type="button" onClick={() => setRulesOpen(true)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/48"><Info className="h-4 w-4" /></button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">Progress</p><p className="mt-1 text-lg font-black">{progressCount}<span className="text-[10px] text-white/30">/{TARGET_DAYS}</span></p></div>
            <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">Time left</p><p className="mt-1 text-lg font-black">{calendar.daysLeft}<span className="text-[10px] text-white/30"> days</span></p></div>
            <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">Status</p><p className={`mt-1 text-[12px] font-black ${completed ? "text-[#fde68a]" : joined ? "text-[#99f6e4]" : "text-white/55"}`}>{status}</p></div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[#22c7b8] transition-[width] duration-500" style={{ width: `${percent}%` }} /></div>
        </div>
        <div className="p-4">
          {!joined ? <button type="button" onClick={joinMission} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#22c7b8] text-sm font-black text-[#042f2e]"><Trophy className="h-4 w-4" /> Join This Month's Mission</button> : completed ? <div className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#facc15]/20 bg-[#facc15]/[0.05] text-sm font-black text-[#fde68a]"><Check className="h-4 w-4" /> Monthly Mission Completed</div> : <button type="button" onClick={() => navigate("/transactions")} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#22c7b8] text-sm font-black text-[#042f2e]"><ReceiptText className="h-4 w-4" /> Log an Expense <ChevronRight className="h-4 w-4" /></button>}
          <p className="mt-3 text-center text-[10px] font-semibold text-white/30">Real CLARA activity moves this mission. No manual Monthly check-in.</p>
        </div>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-[#081827] p-4">
        <div className="flex items-center justify-between px-1"><div><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#5eead4]/48">Mission Pool</p><h3 className="mt-1 text-base font-black">What could come next</h3></div><span className="text-[9px] font-bold text-white/30">Swipe →</span></div>
        <div className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {MONTHLY_MISSION_POOL.map((item) => { const Icon = item.icon; const current = item.id === "expense-logger"; return <article key={item.id} className={`w-[76%] max-w-[245px] shrink-0 snap-start rounded-[20px] border p-4 ${current ? "border-[#facc15]/20 bg-[#facc15]/[0.045]" : "border-white/[0.08] bg-white/[0.025]"}`}><div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${current ? "bg-[#facc15]/10 text-[#fde68a]" : "bg-[#22c7b8]/10 text-[#99f6e4]"}`}><Icon className="h-4 w-4" /></div>{current ? <span className="rounded-full bg-[#facc15]/10 px-2 py-1 text-[8px] font-black uppercase text-[#fde68a]">This month</span> : null}</div><h4 className="mt-3 text-sm font-black">{item.name}</h4><p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#5eead4]/45">{item.feature}</p><p className="mt-2 text-[10px] font-semibold leading-4 text-white/38">{item.summary}</p></article>; })}
        </div>
      </section>

      <section className="rounded-[22px] border border-[#facc15]/16 bg-[#facc15]/[0.04] p-4">
        <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#facc15]/10 text-[#fde68a]"><Sparkles className="h-4 w-4" /></div><div><div className="flex flex-wrap items-center gap-2"><p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#facc15]/65">Next Mission Reveal</p><span className="rounded-full border border-white/[0.08] px-2 py-1 text-[9px] font-black text-white/45">{calendar.nextRevealLabel}</span></div><h3 className="mt-1.5 text-sm font-black">One official mission. Everyone gets the same challenge.</h3><p className="mt-1 text-[10px] font-semibold leading-4 text-white/42">The next Monthly Mission will be chosen from this pool and announced on the first day of the new month.</p></div></div>
      </section>
      <RulesSheet open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </>
  );
}
