import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Database, Heart, Sparkles, TrendingUp, X } from "lucide-react";
import { DEFAULT_STAGE, getStageDefinition, LIFE_STAGE_KEY, STAGES } from "./lifeStageIntelligenceData";

const STAGE_VISUALS = {
  "Young Earner": {
    glow: "from-cyan-400/18 via-blue-500/10 to-violet-500/16",
    silhouette: "linear-gradient(145deg, rgba(125,211,252,.55), rgba(30,64,175,.16)), radial-gradient(circle at 50% 18%, rgba(255,255,255,.30), transparent 18%), linear-gradient(180deg, transparent 0 40%, rgba(8,15,35,.85) 41% 100%)",
  },
  "Working Student": {
    glow: "from-sky-400/18 via-indigo-500/10 to-emerald-500/14",
    silhouette: "linear-gradient(145deg, rgba(56,189,248,.5), rgba(16,185,129,.14)), radial-gradient(circle at 52% 18%, rgba(255,255,255,.28), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(7,20,36,.86) 43% 100%)",
  },
  "Living with Partner": {
    glow: "from-fuchsia-400/16 via-cyan-500/10 to-violet-500/18",
    silhouette: "linear-gradient(145deg, rgba(217,70,239,.38), rgba(6,182,212,.16)), radial-gradient(circle at 48% 18%, rgba(255,255,255,.28), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(23,15,45,.86) 43% 100%)",
  },
  "Single Parent": {
    glow: "from-emerald-400/16 via-cyan-500/10 to-violet-500/14",
    silhouette: "linear-gradient(145deg, rgba(52,211,153,.42), rgba(59,130,246,.14)), radial-gradient(circle at 51% 18%, rgba(255,255,255,.28), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(8,32,35,.86) 43% 100%)",
  },
  "Breadwinner": {
    glow: "from-amber-400/15 via-cyan-500/8 to-violet-500/14",
    silhouette: "linear-gradient(145deg, rgba(251,191,36,.38), rgba(14,165,233,.14)), radial-gradient(circle at 50% 18%, rgba(255,255,255,.28), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(28,22,8,.86) 43% 100%)",
  },
};

function readStageProfile() {
  if (typeof window === "undefined") return DEFAULT_STAGE;
  try {
    return { ...DEFAULT_STAGE, ...(JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {}) };
  } catch {
    return DEFAULT_STAGE;
  }
}

function saveStageProfile(profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIFE_STAGE_KEY, JSON.stringify({ ...profile, updatedAt: new Date().toISOString() }));
}

function trendBar(value) {
  return `${Math.max(14, Math.min(96, value))}%`;
}

function MiniGraph({ value }) {
  const high = value >= 70;
  const mid = value >= 50 && value < 70;
  const stroke = high ? "rgba(45,212,191,.95)" : mid ? "rgba(250,204,21,.9)" : "rgba(248,113,113,.92)";
  return (
    <svg viewBox="0 0 92 34" className="mt-4 h-9 w-full overflow-visible" aria-hidden="true">
      <path d="M2 28 C10 22 16 25 22 18 C28 10 33 16 39 9 C45 2 51 15 58 11 C66 7 70 17 76 12 C83 7 87 11 90 9" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M2 32 H90" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
    </svg>
  );
}

function statusLabel(value) {
  if (value >= 75) return "High";
  if (value >= 60) return "Moderate";
  if (value >= 45) return "Watch";
  return "Low";
}

function TrendSnapshotCard({ item, onClick }) {
  return (
    <button type="button" onClick={onClick} className="min-w-[132px] snap-start rounded-[18px] border border-white/8 bg-slate-950/28 p-3 text-left shadow-[0_14px_38px_rgba(0,0,0,.18)] backdrop-blur-xl transition active:scale-[0.985]">
      <p className="line-clamp-1 text-[10px] font-black tracking-tight text-white/64">{item.label}</p>
      <p className="mt-2 text-[26px] font-black leading-none text-white">{item.value}%</p>
      <p className={`mt-1 text-[10px] font-black ${item.value >= 70 ? "text-rose-300" : item.value >= 55 ? "text-amber-200" : "text-emerald-200"}`}>{statusLabel(item.value)}</p>
      <MiniGraph value={item.value} />
    </button>
  );
}

function DataDetailPanel({ trend, onClose }) {
  return (
    <div className="absolute inset-0 z-30 rounded-[28px] border border-cyan-200/12 bg-slate-950/90 p-4 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/46"><Database className="h-3.5 w-3.5" /> Data status</p>
          <h4 className="mt-2 text-2xl font-black leading-tight text-white">{trend.label}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{trend.note}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close data details"><X className="h-4 w-4" /></button>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.045] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">Life-stage reading</p>
        <p className="mt-1 text-4xl font-black leading-none text-white">{trend.value}%</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))]" style={{ width: trendBar(trend.value) }} />
        </div>
      </div>

      <div className="mt-3 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Source direction</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/56">This is currently a CLARA life-stage intelligence placeholder. Later this can show Philippine survey data, admin-managed sources, and trend update status.</p>
      </div>
    </div>
  );
}

function StageCard({ stage, active, onClick }) {
  const identity = getStageDefinition(stage).identity;
  return (
    <button type="button" onClick={onClick} className={`relative overflow-hidden rounded-[22px] border p-3.5 text-left transition active:scale-[0.98] ${active ? "border-emerald-200/34 bg-emerald-300/14" : "border-white/8 bg-white/[0.04]"}`}>
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/34">{stage}</p>
      <p className="mt-1 text-sm font-black leading-tight text-white">{identity.title}</p>
      <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white/38">{identity.caption}</p>
    </button>
  );
}

function OptionGroup({ label, helper, value, options, onSelect }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/38">{label}</p>
      {helper ? <p className="mt-1 text-[11px] font-semibold leading-4 text-white/32">{helper}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === value;
          return <button key={option} type="button" onClick={() => onSelect(option)} className={`rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${active ? "border-emerald-200/28 bg-emerald-300/16 text-emerald-100" : "border-white/8 bg-white/[0.04] text-white/48"}`}>{option}</button>;
        })}
      </div>
    </div>
  );
}

function StageSetupPanel({ profile, onClose, onSave }) {
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState("stage");
  const definition = getStageDefinition(draft.stage);
  const fields = definition.fields;

  const setStage = (stageName) => {
    const next = getStageDefinition(stageName).fields;
    setDraft({ stage: stageName, setup: next.setup[0], rhythm: next.rhythm[0], pressure: next.pressure[0], goal: next.goal[0] });
    setStep("environment");
  };

  const save = () => {
    saveStageProfile(draft);
    onSave(draft);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-20 flex min-h-0 flex-col rounded-[28px] border border-cyan-200/12 bg-slate-950/92 p-4 backdrop-blur-2xl">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/46">Life stage setup</p>
          <h4 className="mt-2 text-xl font-black leading-tight text-white">{step === "stage" ? "Let CLARA understand your season" : step === "environment" ? "How does this season feel?" : "What should CLARA watch?"}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{step === "stage" ? "Choose the closest stage. It does not need to be perfect." : definition.identity.caption}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close stage setup"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex shrink-0 gap-1.5">{["stage", "environment", "focus"].map((item) => <div key={item} className={`h-1.5 flex-1 rounded-full ${item === step ? "bg-emerald-300/80" : "bg-white/[0.08]"}`} />)}</div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {step === "stage" ? <div className="grid grid-cols-2 gap-2.5">{STAGES.map((stage) => <StageCard key={stage} stage={stage} active={draft.stage === stage} onClick={() => setStage(stage)} />)}</div> : null}
        {step === "environment" ? <div className="space-y-4 rounded-[22px] border border-white/8 bg-white/[0.035] p-4"><OptionGroup label="Current setup" helper="Where are you living or operating from right now?" value={draft.setup} options={fields.setup} onSelect={(value) => setDraft((current) => ({ ...current, setup: value }))} /><OptionGroup label="Current rhythm" helper="How stable does this season feel lately?" value={draft.rhythm} options={fields.rhythm} onSelect={(value) => setDraft((current) => ({ ...current, rhythm: value }))} /></div> : null}
        {step === "focus" ? <div className="space-y-4 rounded-[22px] border border-white/8 bg-white/[0.035] p-4"><OptionGroup label="Pressure right now" helper="Choose the pressure that best explains this stage." value={draft.pressure} options={fields.pressure} onSelect={(value) => setDraft((current) => ({ ...current, pressure: value }))} /><OptionGroup label="Main focus" helper="What should CLARA protect first?" value={draft.goal} options={fields.goal} onSelect={(value) => setDraft((current) => ({ ...current, goal: value }))} /></div> : null}
      </div>
      <div className="mt-3 flex shrink-0 gap-2">
        {step === "stage" ? <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-black text-white/58 active:scale-95">Cancel</button> : <button type="button" onClick={() => setStep(step === "focus" ? "environment" : "stage")} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-black text-white/58 active:scale-95"><ChevronLeft className="h-4 w-4" /> Back</button>}
        {step === "stage" ? <button type="button" onClick={() => setStep("environment")} className="flex-1 rounded-full bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95">Continue</button> : step === "environment" ? <button type="button" onClick={() => setStep("focus")} className="flex-1 rounded-full bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95">Continue</button> : <button type="button" onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95"><Check className="h-4 w-4" /> Apply stage</button>}
      </div>
    </div>
  );
}

export default function FinancialClimateScreen() {
  const [showStageSetup, setShowStageSetup] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [stageProfile, setStageProfile] = useState(() => readStageProfile());
  const definition = useMemo(() => getStageDefinition(stageProfile.stage), [stageProfile.stage]);
  const visual = STAGE_VISUALS[stageProfile.stage] || STAGE_VISUALS["Young Earner"];

  useEffect(() => { saveStageProfile(stageProfile); }, [stageProfile]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-[28px] border border-cyan-200/12 bg-[#050b1f] shadow-[0_18px_60px_rgba(0,0,0,.24)]">
      <div className="relative h-full overflow-y-auto px-3 pb-5 pt-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className={`relative min-h-[252px] overflow-hidden rounded-[30px] border border-white/8 bg-gradient-to-br ${visual.glow} p-5 shadow-[0_20px_70px_rgba(0,0,0,.28)]`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(255,255,255,.18),transparent_20%),linear-gradient(180deg,rgba(3,8,28,.06),rgba(3,8,28,.92))]" />
          <div className="absolute bottom-0 right-0 h-[92%] w-[50%] opacity-90">
            <div className="absolute inset-x-2 bottom-0 h-[86%] rounded-t-full blur-[1px]" style={{ background: visual.silhouette }} />
            <div className="absolute bottom-6 right-5 h-28 w-28 rounded-full bg-cyan-300/10 blur-3xl" />
          </div>
          <div className="relative z-10 max-w-[58%] pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/58">Your life stage</p>
            <h2 className="mt-3 text-[27px] font-black leading-tight text-white">{stageProfile.stage} <span className="text-[14px] text-amber-200">♛</span></h2>
            <p className="mt-3 text-[13px] font-semibold leading-5 text-white/62">{definition.identity.caption}</p>
            <button type="button" onClick={() => setShowStageSetup(true)} className="mt-4 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white/72 active:scale-95">Set stage</button>
          </div>
        </section>

        <section className="mt-3 rounded-[26px] border border-violet-300/14 bg-white/[0.045] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-[15px] font-black text-white">You’re not alone.</h3>
              <p className="mt-2 text-[13px] font-semibold leading-6 text-white/58">Many people in this life stage are experiencing similar financial pressure.</p>
            </div>
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 shadow-[0_0_35px_rgba(217,70,239,.28)]">
              <Heart className="h-8 w-8 fill-fuchsia-200 text-fuchsia-200" />
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-[26px] border border-white/8 bg-white/[0.035] p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-black text-white">Life Stage Trend Snapshot</h3>
              <p className="mt-1 text-[11px] font-semibold text-white/38">Swipe the stage cards.</p>
            </div>
            <Sparkles className="h-4 w-4 text-cyan-100/42" />
          </div>
          <div className="mt-4 flex snap-x gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {definition.indicators.map((item) => (
              <TrendSnapshotCard key={item.label} item={item} onClick={() => setSelectedTrend(item)} />
            ))}
          </div>
        </section>
      </div>

      {selectedTrend ? <DataDetailPanel trend={selectedTrend} onClose={() => setSelectedTrend(null)} /> : null}
      {showStageSetup ? <StageSetupPanel profile={stageProfile} onClose={() => setShowStageSetup(false)} onSave={setStageProfile} /> : null}
    </div>
  );
}
