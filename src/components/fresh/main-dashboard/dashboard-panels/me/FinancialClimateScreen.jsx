import { Sparkles, TrendingUp } from "lucide-react";
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
    climateLabel: stabilityScore >= 70 ? "High awareness" : pressureScore >= 70 ? "Pressure building" : "Adaptive rhythm",
    trends: [
      {
        label: "Environment stability",
        value: stabilityScore,
        state: stabilityScore >= 70 ? "routine stabilizing" : "still adjusting",
      },
      {
        label: "Spending pressure",
        value: pressureScore,
        state: pressureScore >= 70 ? "pressure active" : "manageable",
      },
      {
        label: "Goal consistency",
        value: consistencyScore,
        state: consistencyScore >= 65 ? "building momentum" : "needs reinforcement",
      },
    ],
  };
}

function TrendCard({ trend }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/8 bg-[linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.015))] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">{trend.label}</p>
          <p className="mt-2 text-base font-black text-white">{trend.value}%</p>
        </div>
        <span className="rounded-full border border-cyan-200/10 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black text-cyan-100/70">{trend.state}</span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))] transition-all duration-700"
          style={{ width: trendBar(trend.value) }}
        />
      </div>
    </div>
  );
}

export default function FinancialClimateScreen({ signals, signalCount }) {
  const climate = readClimate(signals);

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.02)_46%,rgba(16,185,129,.05))] p-5 shadow-[0_18px_60px_rgba(0,0,0,.24)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute -left-20 top-0 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-violet-400/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/12 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/78">
              <Sparkles className="h-3.5 w-3.5" />
              Adaptive climate
            </div>

            <h3 className="mt-4 text-[clamp(26px,8vw,38px)] font-black leading-[0.94] text-white">
              {climate.climateLabel}
            </h3>

            <p className="mt-3 text-sm font-semibold text-white/50">
              CLARA is detecting evolving financial environment patterns.
            </p>
          </div>

          <div className="rounded-[20px] border border-white/8 bg-white/[0.04] px-3 py-2 text-right backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/32">Signals</p>
            <p className="mt-1 text-lg font-black text-white">{signalCount}</p>
          </div>
        </div>

        <div className="mt-6 rounded-[26px] border border-cyan-200/10 bg-[linear-gradient(135deg,rgba(6,182,212,.06),rgba(255,255,255,.02))] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/42">
                <TrendingUp className="h-3.5 w-3.5" />
                Life stage trend map
              </p>

              <h4 className="mt-2 text-xl font-black text-white">
                {climate.lifeStage}
              </h4>
            </div>

            <div className="rounded-full border border-emerald-200/12 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/74">
              Live reading
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {climate.trends.map((trend) => (
              <TrendCard key={trend.label} trend={trend} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
