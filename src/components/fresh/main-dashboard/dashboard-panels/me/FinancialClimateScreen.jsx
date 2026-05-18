import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Database, MessageCircle, Target, TrendingUp, X } from "lucide-react";
import { clean } from "./claraEnvironmentUtils";
import { DEFAULT_STAGE, getStageDefinition, LIFE_STAGE_KEY, STAGES } from "./lifeStageIntelligenceData";

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

function scoreFromProfile(profile) {
  const text = [profile.setup, profile.rhythm, profile.pressure, profile.goal].join(" ").toLowerCase();
  const unstable = /irregular|changing|temporary|unpredictable|delay|adjusting|new|still finding|moving around|not steady|uncertain|seasonal/.test(text);
  const shared = /family|partner|child|co-parent|shared|parents|siblings|together|household/.test(text);
  const pressure = /heavy|burnout|support|debt|tuition|capital|emergency|stress|emotion|cash-flow|uncertain|lifestyle|pressure|risk|fatigue|low buffer/.test(text);
  return {
    environment: shared && !unstable ? 76 : unstable ? 44 : 66,
    pressure: pressure ? 72 : shared ? 58 : 41,
    consistency: profile.goal ? (unstable ? 56 : 69) : 42,
  };
}

function readClimate(stageProfile) {
  const definition = getStageDefinition(stageProfile.stage);
  const score = scoreFromProfile(stageProfile);
  return {
    definition,
    lifeStage: stageProfile.stage,
    stageProfile,
    trends: [
      { label: "Environment", value: score.environment, state: score.environment >= 70 ? "stabilizing" : "adjusting", source: stageProfile.setup, explanation: "This reads your current setup and how stable your environment feels." },
      { label: "Pressure", value: score.pressure, state: score.pressure >= 70 ? "active" : "manageable", source: stageProfile.pressure, explanation: "This reads the emotional or practical pressure around this life season." },
      { label: "Consistency", value: score.consistency, state: score.consistency >= 65 ? "building" : "needs support", source: stageProfile.goal, explanation: "This reads whether your current focus can support repeatable money behavior." },
    ],
  };
}

function IntelligenceCard({ title, value, note, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-[22px] border border-white/9 bg-white/[0.035] p-4 text-left backdrop-blur-xl transition active:scale-[0.985]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/36">{title}</p>
          <p className="mt-1 text-2xl font-black leading-none text-white">{value}%</p>
        </div>
        <span className="rounded-full border border-cyan-200/10 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black text-cyan-100/70">Trend</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))]" style={{ width: trendBar(value) }} />
      </div>
      <p className="mt-3 text-[11px] font-semibold leading-5 text-white/44">{note}</p>
    </button>
  );
}

function TrendCard({ trend, onClick }) {
  return (
    <button type="button" onClick={() => onClick(trend)} className="rounded-[20px] border border-white/9 bg-white/[0.035] p-3 text-left backdrop-blur-xl transition active:scale-[0.985]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/36">{trend.label}</p>
          <p className="mt-1 text-[18px] font-black leading-none text-white">{trend.value}%</p>
        </div>
        <span className="rounded-full border border-cyan-200/10 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black text-cyan-100/70">{trend.state}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))]" style={{ width: trendBar(trend.value) }} />
      </div>
    </button>
  );
}

function TrendDetailPanel({ trend, onClose }) {
  return (
    <div className="absolute inset-0 z-30 rounded-[28px] border border-cyan-200/12 bg-slate-950/90 p-4 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/46"><Database className="h-3.5 w-3.5" /> Trend reading</p>
          <h4 className="mt-2 text-2xl font-black leading-tight text-white">{trend.label}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{trend.explanation || trend.note}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close trend details"><X className="h-4 w-4" /></button>
      </div>
      <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.045] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">Current reading</p>
        <p className="mt-1 text-4xl font-black leading-none text-white">{trend.value}%</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))]" style={{ width: trendBar(trend.value) }} /></div>
      </div>
      <div className="mt-3 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Source context</p>
        <p className="mt-2 text-sm font-black leading-5 text-white/74">{trend.source || trend.note}</p>
        <p className="mt-2 text-[11px] font-semibold leading-5 text-white/36">This is a life-stage intelligence estimate. Future versions can connect this to admin-managed survey data and source status.</p>
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

function SectionHeader({ icon: Icon, eyebrow, title }) {
  return <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-cyan-100/45" /><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/38">{eyebrow}</p><h3 className="text-lg font-black leading-tight text-white">{title}</h3></div></div>;
}

export default function FinancialClimateScreen({ signals, signalCount }) {
  const [showStageSetup, setShowStageSetup] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [stageProfile, setStageProfile] = useState(() => readStageProfile());
  const climate = useMemo(() => readClimate(stageProfile), [stageProfile]);
  const definition = climate.definition;

  useEffect(() => { saveStageProfile(stageProfile); }, [stageProfile]);

  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-[28px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.02)_46%,rgba(16,185,129,.05))] p-4 shadow-[0_18px_60px_rgba(0,0,0,.24)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute -left-20 top-0 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-60 w-60 rounded-full bg-violet-400/10 blur-3xl" />
      <div className="relative h-full overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <section className="rounded-[24px] border border-cyan-200/10 bg-[linear-gradient(135deg,rgba(6,182,212,.06),rgba(255,255,255,.02))] p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-cyan-100/42"><TrendingUp className="h-3.5 w-3.5" /> Life stage intelligence</p><h2 className="mt-2 text-3xl font-black leading-none text-white">{climate.lifeStage}</h2><p className="mt-3 text-sm font-semibold leading-6 text-white/55">{definition.identity.overview}</p></div>
            <button type="button" onClick={() => setShowStageSetup(true)} className="shrink-0 rounded-full border border-emerald-200/12 bg-emerald-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/74 active:scale-95">Set stage</button>
          </div>
          <div className="mt-4 grid gap-2.5">{climate.trends.map((trend) => <TrendCard key={trend.label} trend={trend} onClick={setSelectedTrend} />)}</div>
        </section>

        <section className="mt-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <SectionHeader icon={Database} eyebrow="National reality" title="Economic weather" />
          <div className="mt-3 grid gap-2.5">{definition.indicators.map((item) => <IntelligenceCard key={item.label} title={item.label} value={item.value} note={item.note} onClick={() => setSelectedTrend({ ...item, source: "Philippine life-stage intelligence placeholder", explanation: item.note })} />)}</div>
        </section>

        <section className="mt-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <SectionHeader icon={TrendingUp} eyebrow="Pressure breakdown" title="Common struggles" />
          <div className="mt-3 flex flex-wrap gap-2">{definition.struggles.map((item) => <span key={item} className="rounded-full border border-white/8 bg-white/[0.045] px-3 py-2 text-[11px] font-black text-white/50">{item}</span>)}</div>
        </section>

        <section className="mt-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
          <SectionHeader icon={Target} eyebrow="Recommended focus" title="What to protect first" />
          <div className="mt-3 grid grid-cols-2 gap-2">{definition.recommendations.map((item, index) => <div key={item} className="rounded-[18px] border border-emerald-200/10 bg-emerald-300/[0.055] p-3"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100/40">0{index + 1}</p><p className="mt-1 text-sm font-black leading-tight text-white/78">{item}</p></div>)}</div>
        </section>

        <section className="mt-3 rounded-[24px] border border-cyan-200/10 bg-cyan-300/[0.045] p-4">
          <SectionHeader icon={MessageCircle} eyebrow="Talk to CLARA" title="Bring your real situation" />
          <p className="mt-3 text-sm font-semibold leading-6 text-white/56">{definition.talkPrompt}</p>
          <button type="button" className="mt-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2.5 text-xs font-black text-white/64 active:scale-95">Open CLARA conversation</button>
        </section>
      </div>
      {selectedTrend ? <TrendDetailPanel trend={selectedTrend} onClose={() => setSelectedTrend(null)} /> : null}
      {showStageSetup ? <StageSetupPanel profile={stageProfile} onClose={() => setShowStageSetup(false)} onSave={setStageProfile} /> : null}
    </div>
  );
}
