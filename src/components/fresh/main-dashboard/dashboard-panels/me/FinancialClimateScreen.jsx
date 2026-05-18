import { Activity, CheckCircle2, Sparkles } from "lucide-react";
import { clean } from "./claraEnvironmentUtils";

function signalValue(signals, key) {
  return clean(signals?.items?.[key]?.value);
}

function readClimate(signals) {
  const income = signalValue(signals, "incomePattern");
  const living = signalValue(signals, "livingSituation");
  const work = signalValue(signals, "workType");
  const responsibilities = signalValue(signals, "responsibilities");
  const goal = signalValue(signals, "mainFinancialGoal");
  const emotional = signalValue(signals, "emotionalStateTrend");
  const text = [income, living, work, responsibilities, goal, emotional].join(" ").toLowerCase();

  const irregular = /cutoff|changing|project|freelance|part-time|irregular/.test(text);
  const sharedHome = /family|partner|parent|sibling|spouse|girlfriend|boyfriend/.test(text);
  const supportRole = /support|rent|bill|family|dependent|responsib/.test(text);
  const emotionalRisk = /stress|tired|guilt|tempt|impulse|emotional|pressure/.test(text);

  const pressure = irregular && (supportRole || sharedHome) ? "High awareness" : irregular || supportRole || emotionalRisk ? "Watchful season" : "Stable rhythm";
  const rhythm = irregular ? "income timing needs buffer" : "cash flow can support routine";
  const summary = sharedHome
    ? "CLARA is reading a money environment shaped by your home setup, people around you, and the way daily pressure can affect decisions."
    : irregular
      ? "CLARA is reading a flexible money environment where timing, consistency, and small buffers matter more than perfect planning."
      : "CLARA is reading a growth environment where consistent decisions, simple rules, and gentle accountability can build stronger money habits.";

  return {
    pressure,
    summary,
    similar: [
      irregular ? "feel tension between income timing and real expenses" : "can still lose money through small repeated leaks",
      supportRole ? "carry emotional weight when money affects other people" : "need reminders that comfort spending can still hide inside routine",
      emotionalRisk ? "spend for relief when stress or tiredness rises" : "benefit from clear decision rules before spending",
    ],
    focus: [
      rhythm,
      sharedHome ? "understand the living environment before judging spending" : "keep the budget simple enough to follow",
      goal ? `protect the current goal: ${goal}` : "build consistency before adding complexity",
    ],
  };
}

export default function FinancialClimateScreen({ signals, signalCount, signalTotal }) {
  const climate = readClimate(signals);

  return (
    <div className="relative overflow-hidden rounded-[30px] border border-cyan-200/14 bg-[linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.025)_48%,rgba(16,185,129,.055))] p-5 shadow-[0_18px_60px_rgba(0,0,0,.25)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-300/14 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-6 h-60 w-60 rounded-full bg-emerald-300/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/14 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/78"><Sparkles className="h-3.5 w-3.5" /> Adaptive climate</div>
            <h3 className="mt-4 text-[clamp(23px,7vw,32px)] font-black leading-[0.98] text-white">{climate.pressure}</h3>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-100/38">Financial environment reading</p>
          </div>
          <div className="rounded-[18px] border border-white/10 bg-white/[0.05] px-3 py-2 text-right"><p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/34">Signals</p><p className="mt-1 text-sm font-black text-white/76">{signalCount}/{signalTotal}</p></div>
        </div>
        <p className="mt-5 text-[13px] font-semibold leading-6 text-white/68">{climate.summary}</p>
        <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/38">People in similar situations often...</p>
          <div className="mt-3 space-y-2">{climate.similar.map((item) => <div key={item} className="flex gap-2 text-xs font-semibold leading-5 text-white/58"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-200/72" /><span>{item}</span></div>)}</div>
        </div>
        <div className="mt-3 rounded-[22px] border border-white/8 bg-white/[0.026] p-4">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/34"><Activity className="h-3.5 w-3.5" /> CLARA coaching focus</p>
          <div className="mt-3 space-y-2">{climate.focus.map((item) => <p key={item} className="text-xs font-semibold leading-5 text-white/50">• {item}</p>)}</div>
        </div>
      </div>
    </div>
  );
}
