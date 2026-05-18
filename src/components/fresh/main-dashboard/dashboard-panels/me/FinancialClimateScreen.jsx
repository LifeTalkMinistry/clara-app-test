import { Activity, CheckCircle2, Sparkles, TrendingUp } from "lucide-react";
import { clean } from "./claraEnvironmentUtils";

function signalValue(signals, key) {
  return clean(signals?.items?.[key]?.value);
}

function detectLifeStage(text) {
  if (/single parent|child|kids|children/.test(text)) return "Single Parent";
  if (/partner|spouse|girlfriend|boyfriend|husband|wife/.test(text)) return "Living with Partner";
  if (/family|parent|sibling|mother|father/.test(text)) return "Family Household";
  if (/student|school|college/.test(text)) return "Working Student";
  if (/freelance|project/.test(text)) return "Freelance Season";
  if (/business|negosyo/.test(text)) return "Business Builder";
  if (/bpo|call center|full-time|full time|office/.test(text)) return "Full-Time Earner";
  return "Young Earner";
}

function trendBar(value) {
  return `${Math.max(16, Math.min(94, value))}%`;
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
  const lifeStage = detectLifeStage(text);

  const pressure = irregular && (supportRole || sharedHome) ? "High awareness" : irregular || supportRole || emotionalRisk ? "Watchful season" : "Stable rhythm";
  const rhythm = irregular ? "income timing needs buffer" : "cash flow can support routine";
  const summary = sharedHome
    ? "CLARA is reading a money environment shaped by your home setup, people around you, and the way daily pressure can affect decisions."
    : irregular
      ? "CLARA is reading a flexible money environment where timing, consistency, and small buffers matter more than perfect planning."
      : "CLARA is reading a growth environment where consistent decisions, simple rules, and gentle accountability can build stronger money habits.";

  const stabilityScore = sharedHome && !irregular ? 74 : irregular ? 46 : 68;
  const pressureScore = supportRole || emotionalRisk ? 72 : sharedHome ? 58 : 42;
  const consistencyScore = goal ? 67 : irregular ? 43 : 61;

  const trends = [
    {
      label: "Environment stability",
      state: stabilityScore >= 70 ? "forming stronger routine" : "still calibrating",
      value: stabilityScore,
      note: sharedHome ? "home setup is shaping daily spending behavior" : "routine signals are becoming easier to read",
    },
    {
      label: "Spending pressure",
      state: pressureScore >= 70 ? "pressure building" : "pressure manageable",
      value: pressureScore,
      note: emotionalRisk ? "emotional triggers may raise decision friction" : "current stage still needs spending boundaries",
    },
    {
      label: "Goal consistency",
      state: consistencyScore >= 65 ? "momentum possible" : "needs small checkpoints",
      value: consistencyScore,
      note: goal ? `current goal signal: ${goal}` : "CLARA needs more goal context to read direction",
    },
  ];

  const stageForecast = sharedHome
    ? "This stage may become more stable when the home routine feels predictable and spending decisions have clear pause points."
    : irregular
      ? "This stage may improve when income timing is paired with small buffers and weekly check-ins."
      : "This stage may improve through repeated simple decisions rather than heavy budget rules.";

  return {
    pressure,
    summary,
    lifeStage,
    stageForecast,
    trends,
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

function TrendRow({ trend }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-slate-950/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{trend.label}</p>
          <p className="mt-1 text-sm font-black leading-tight text-white/78">{trend.state}</p>
        </div>
        <p className="rounded-full border border-cyan-200/10 bg-cyan-300/10 px-2 py-1 text-[10px] font-black text-cyan-100/66">{trend.value}%</p>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.35),rgba(134,239,172,.85))]" style={{ width: trendBar(trend.value) }} />
      </div>
      <p className="mt-2 text-[11px] font-semibold leading-5 text-white/42">{trend.note}</p>
    </div>
  );
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

        <div className="mt-5 overflow-hidden rounded-[24px] border border-cyan-200/12 bg-[linear-gradient(135deg,rgba(6,182,212,.07),rgba(255,255,255,.025))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/48"><TrendingUp className="h-3.5 w-3.5" /> Life stage trend map</p>
              <h4 className="mt-2 text-lg font-black leading-tight text-white">{climate.lifeStage}</h4>
            </div>
            <span className="rounded-full border border-emerald-200/14 bg-emerald-300/10 px-3 py-1 text-[10px] font-black text-emerald-100/70">Live reading</span>
          </div>

          <div className="mt-4 space-y-2.5">
            {climate.trends.map((trend) => <TrendRow key={trend.label} trend={trend} />)}
          </div>

          <div className="mt-3 rounded-[20px] border border-white/8 bg-white/[0.035] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">CLARA stage forecast</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/56">{climate.stageForecast}</p>
          </div>
        </div>

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
