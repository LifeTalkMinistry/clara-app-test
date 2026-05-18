import { useState } from "react";
import { Database, TrendingUp, X } from "lucide-react";
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
  return `${Math.max(14, Math.min(96, value))}%`;
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

  const stabilityScore = sharedHome && !irregular ? 76 : irregular ? 44 : 66;
  const pressureScore = supportRole || emotionalRisk ? 73 : sharedHome ? 58 : 41;
  const consistencyScore = goal ? 69 : irregular ? 42 : 63;

  return {
    lifeStage,
    trends: [
      { label: "Environment", value: stabilityScore, state: stabilityScore >= 70 ? "stabilizing" : "adjusting", source: living || "living situation signal not set" },
      { label: "Pressure", value: pressureScore, state: pressureScore >= 70 ? "active" : "manageable", source: responsibilities || emotional || "pressure signal not set" },
      { label: "Consistency", value: consistencyScore, state: consistencyScore >= 65 ? "building" : "needs support", source: goal || income || "goal signal not set" },
    ],
  };
}

function TrendCard({ trend }) {
  return (
    <div className="rounded-[20px] border border-white/9 bg-white/[0.035] p-3 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/36">{trend.label}</p>
          <p className="mt-1 text-[18px] font-black leading-none text-white">{trend.value}%</p>
        </div>
        <span className="rounded-full border border-cyan-200/10 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black text-cyan-100/70">{trend.state}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))] transition-all duration-700" style={{ width: trendBar(trend.value) }} />
      </div>
    </div>
  );
}

function DataStatusPanel({ climate, signalCount, onClose }) {
  return (
    <div className="absolute inset-0 z-20 rounded-[28px] border border-cyan-200/12 bg-slate-950/88 p-4 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/46"><Database className="h-3.5 w-3.5" /> Data status</p>
          <h4 className="mt-2 text-xl font-black leading-tight text-white">{climate.lifeStage}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/44">Based on {signalCount} active environment signal{signalCount === 1 ? "" : "s"}.</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close data status">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 space-y-2.5">
        {climate.trends.map((trend) => (
          <div key={trend.label} className="rounded-[18px] border border-white/8 bg-white/[0.045] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.13em] text-white/58">{trend.label}</p>
              <p className="text-xs font-black text-cyan-100/70">{trend.value}%</p>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/42">Source: {trend.source}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] font-semibold leading-5 text-white/34">This is a local CLARA reading. Later, this panel can show survey status, benchmark sources, and stage-specific research notes.</p>
    </div>
  );
}

export default function FinancialClimateScreen({ signals, signalCount }) {
  const [showDataStatus, setShowDataStatus] = useState(false);
  const climate = readClimate(signals);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.02)_46%,rgba(16,185,129,.05))] p-4 shadow-[0_18px_60px_rgba(0,0,0,.24)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute -left-20 top-0 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-60 w-60 rounded-full bg-violet-400/10 blur-3xl" />

      <button type="button" onClick={() => setShowDataStatus(true)} className="relative flex min-h-0 flex-1 flex-col rounded-[24px] border border-cyan-200/10 bg-[linear-gradient(135deg,rgba(6,182,212,.06),rgba(255,255,255,.02))] p-4 text-left active:scale-[0.992]">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-cyan-100/42"><TrendingUp className="h-3.5 w-3.5" /> Life stage trend</p>
            <h4 className="mt-1 text-xl font-black leading-tight text-white">{climate.lifeStage}</h4>
          </div>
          <div className="rounded-full border border-emerald-200/12 bg-emerald-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/74">View data</div>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-rows-3 gap-2.5">
          {climate.trends.map((trend) => (
            <TrendCard key={trend.label} trend={trend} />
          ))}
        </div>
      </button>

      {showDataStatus ? <DataStatusPanel climate={climate} signalCount={signalCount} onClose={() => setShowDataStatus(false)} /> : null}
    </div>
  );
}
