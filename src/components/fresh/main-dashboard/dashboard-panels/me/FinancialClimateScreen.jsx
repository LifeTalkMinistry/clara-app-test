import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Database, TrendingUp, X } from "lucide-react";
import { clean } from "./claraEnvironmentUtils";

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const STAGES = [
  "Young Earner",
  "Living with Partner",
  "Family Household",
  "Working Student",
  "Single Parent",
  "Freelance Season",
  "Business Builder",
  "Full-Time Earner",
];

const STAGE_IDENTITY = {
  "Young Earner": {
    title: "Building independence",
    caption: "Learning money rhythm, freedom, and the small choices that become habits.",
  },
  "Living with Partner": {
    title: "Shared-life season",
    caption: "Routines, emotions, and future plans are starting to shape financial decisions.",
  },
  "Family Household": {
    title: "Home-centered season",
    caption: "Family setup, household rhythm, and daily environment influence money behavior.",
  },
  "Working Student": {
    title: "Stretched season",
    caption: "Time, school, work, energy, and money all compete for attention.",
  },
  "Single Parent": {
    title: "Protective season",
    caption: "Essentials, stability, emotional energy, and safety need careful protection.",
  },
  "Freelance Season": {
    title: "Flexible income season",
    caption: "Income timing, client flow, and buffers matter more than perfect planning.",
  },
  "Business Builder": {
    title: "Building season",
    caption: "Personal money, operating needs, reinvestment, and pressure can easily mix.",
  },
  "Full-Time Earner": {
    title: "Routine earning season",
    caption: "Consistency, stress recovery, and lifestyle creep become the quiet patterns to watch.",
  },
};

const STAGE_FIELDS = {
  "Living with Partner": {
    setup: ["Just us together", "With my family", "With partner’s family", "Still moving around"],
    rhythm: ["Mostly stable", "Still finding rhythm", "This is new", "Temporary for now"],
    pressure: ["Managing okay", "Some pressure", "Heavy lately", "Emotionally sensitive"],
    goal: ["Build savings together", "Emergency fund first", "Plan our future", "Stability first"],
  },
  "Working Student": {
    setup: ["Mostly school", "Mostly work", "Trying to balance", "Schedule keeps changing"],
    rhythm: ["Allowance + work", "Part-time only", "Income is irregular", "Seasonal income"],
    pressure: ["School costs", "Transport pressure", "Burnout risk", "Family expectations"],
    goal: ["Graduate safely", "Save slowly", "Avoid debt", "Help family"],
  },
  "Family Household": {
    setup: ["With parents", "With siblings", "Whole family", "Shared home"],
    rhythm: ["Stable home", "Home is changing", "Shared routine", "Busy household"],
    pressure: ["Managing okay", "Some pressure", "Heavy lately", "Support pressure"],
    goal: ["Contribute wisely", "Build safety", "Reduce stress spending", "Personal stability"],
  },
  "Single Parent": {
    setup: ["One child", "Two children", "Three or more", "Co-parenting setup"],
    rhythm: ["Stable routine", "Childcare changes", "School-heavy season", "Unpredictable days"],
    pressure: ["Daily needs", "School expenses", "Emergency risk", "Time pressure"],
    goal: ["Protect essentials", "Emergency fund first", "Reduce debt", "Stable routine"],
  },
  "Freelance Season": {
    setup: ["Client-based", "Project-based", "Side hustle", "Full freelance"],
    rhythm: ["Income is irregular", "Monthly clients", "Seasonal work", "Growing slowly"],
    pressure: ["Cash-flow gaps", "Client delays", "Burnout risk", "Uncertain months"],
    goal: ["Build buffer", "Stabilize income", "Separate wallets", "Grow clients"],
  },
  "Business Builder": {
    setup: ["Just starting", "Growing already", "Side business", "Main income"],
    rhythm: ["Reinvesting", "Sales not steady", "Monthly cycle", "Scaling up"],
    pressure: ["Capital pressure", "Inventory pressure", "Operating costs", "Personal/business mix"],
    goal: ["Separate money", "Build runway", "Control spending", "Grow sustainably"],
  },
  "Full-Time Earner": {
    setup: ["Corporate", "BPO/call center", "Office work", "Remote work"],
    rhythm: ["Every cutoff", "Monthly salary", "Stable salary", "Shift-based"],
    pressure: ["Lifestyle creep", "Stress spending", "Family support", "Routine fatigue"],
    goal: ["Save consistently", "Emergency fund first", "Reduce random spending", "Build discipline"],
  },
  "Young Earner": {
    setup: ["First job", "Early career", "Exploring income", "Building independence"],
    rhythm: ["Stable salary", "Cutoff cycle", "Income still changing", "Learning rhythm"],
    pressure: ["Peer pressure", "Comfort spending", "New responsibilities", "Low buffer"],
    goal: ["Build habits", "Emergency fund first", "Reduce impulse buys", "Save first"],
  },
};

const DEFAULT_STAGE = {
  stage: "Young Earner",
  setup: "Early career",
  rhythm: "Learning rhythm",
  pressure: "Comfort spending",
  goal: "Build habits",
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

function scoreFromProfile(profile, fallbackText) {
  const text = [profile.setup, profile.rhythm, profile.pressure, profile.goal, fallbackText].join(" ").toLowerCase();
  const unstable = /irregular|changing|temporary|unpredictable|client|delay|unstable|adjusting|new|still finding|moving around|not steady|uncertain|seasonal/.test(text);
  const shared = /family|partner|child|co-parent|shared|parents|siblings|together|household/.test(text);
  const pressure = /high|heavy|burnout|support|debt|tuition|capital|emergency|stress|emotion|cash-flow|uncertain|lifestyle|pressure|risk|fatigue|low buffer/.test(text);
  const goal = clean(profile.goal);

  return {
    environment: shared && !unstable ? 76 : unstable ? 44 : 66,
    pressure: pressure ? 72 : shared ? 58 : 41,
    consistency: goal ? (unstable ? 56 : 69) : 42,
  };
}

function readClimate(signals, stageProfile) {
  const income = signalValue(signals, "incomePattern");
  const living = signalValue(signals, "livingSituation");
  const work = signalValue(signals, "workType");
  const responsibilities = signalValue(signals, "responsibilities");
  const goal = signalValue(signals, "mainFinancialGoal");
  const emotional = signalValue(signals, "emotionalStateTrend");
  const fallbackText = [income, living, work, responsibilities, goal, emotional].join(" ").toLowerCase();
  const lifeStage = stageProfile?.stage || detectLifeStage(fallbackText);
  const score = scoreFromProfile(stageProfile || DEFAULT_STAGE, fallbackText);

  return {
    lifeStage,
    stageProfile,
    trends: [
      { label: "Environment", value: score.environment, state: score.environment >= 70 ? "stabilizing" : "adjusting", source: stageProfile.setup || living || "setup not selected", explanation: "This reads your current setup and how stable your environment feels." },
      { label: "Pressure", value: score.pressure, state: score.pressure >= 70 ? "active" : "manageable", source: stageProfile.pressure || responsibilities || emotional || "pressure not selected", explanation: "This reads the emotional or practical pressure around this life season." },
      { label: "Consistency", value: score.consistency, state: score.consistency >= 65 ? "building" : "needs support", source: stageProfile.goal || goal || income || "goal not selected", explanation: "This reads whether your current focus can support repeatable money behavior." },
    ],
  };
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
        <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))] transition-all duration-700" style={{ width: trendBar(trend.value) }} />
      </div>
    </button>
  );
}

function TrendDetailPanel({ trend, onClose }) {
  return (
    <div className="absolute inset-0 z-20 rounded-[28px] border border-cyan-200/12 bg-slate-950/90 p-4 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/46"><Database className="h-3.5 w-3.5" /> Trend reading</p>
          <h4 className="mt-2 text-2xl font-black leading-tight text-white">{trend.label}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{trend.explanation}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close trend details">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.045] p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">Current score</p>
            <p className="mt-1 text-4xl font-black leading-none text-white">{trend.value}%</p>
          </div>
          <span className="rounded-full border border-cyan-200/10 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black text-cyan-100/70">{trend.state}</span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))]" style={{ width: trendBar(trend.value) }} />
        </div>
      </div>

      <div className="mt-3 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Source signal</p>
        <p className="mt-2 text-sm font-black leading-5 text-white/74">{trend.source}</p>
        <p className="mt-2 text-[11px] font-semibold leading-5 text-white/36">Later, this space can show stage benchmarks, survey status, and why CLARA thinks this trend is changing.</p>
      </div>
    </div>
  );
}

function StageCard({ stage, active, onClick }) {
  const identity = STAGE_IDENTITY[stage];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-[22px] border p-3.5 text-left transition active:scale-[0.98] ${active ? "border-emerald-200/34 bg-emerald-300/14 shadow-[0_0_34px_rgba(45,212,191,.12)]" : "border-white/8 bg-white/[0.04]"}`}
    >
      {active ? <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-emerald-300/12 blur-2xl" /> : null}
      <div className="relative">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/34">{stage}</p>
        <p className="mt-1 text-sm font-black leading-tight text-white">{identity?.title || stage}</p>
        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white/38">{identity?.caption}</p>
      </div>
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
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${active ? "border-emerald-200/28 bg-emerald-300/16 text-emerald-100" : "border-white/8 bg-white/[0.04] text-white/48"}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function setupTitle(step, draft) {
  if (step === "stage") return "Let CLARA understand your season";
  if (step === "environment") return "How does this season feel in real life?";
  return "What should CLARA watch closely?";
}

function setupDescription(step, draft) {
  if (step === "stage") return "Your financial behavior changes with your current life season. Choose the closest one — it does not need to be perfect.";
  if (step === "environment") return STAGE_IDENTITY[draft.stage]?.caption || "CLARA will read the environment around this stage.";
  return "This final step shapes the trend statistics on your Me screen.";
}

function StageSetupPanel({ profile, onClose, onSave }) {
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState("stage");
  const fields = STAGE_FIELDS[draft.stage] || STAGE_FIELDS["Young Earner"];

  const setStage = (stage) => {
    const next = STAGE_FIELDS[stage] || STAGE_FIELDS["Young Earner"];
    setDraft({ stage, setup: next.setup[0], rhythm: next.rhythm[0], pressure: next.pressure[0], goal: next.goal[0] });
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
          <h4 className="mt-2 text-xl font-black leading-tight text-white">{setupTitle(step, draft)}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{setupDescription(step, draft)}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close stage setup">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex shrink-0 gap-1.5">
        {["stage", "environment", "focus"].map((item) => (
          <div key={item} className={`h-1.5 flex-1 rounded-full ${item === step ? "bg-emerald-300/80" : "bg-white/[0.08]"}`} />
        ))}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {step === "stage" ? (
          <div className="space-y-3">
            <div className="rounded-[22px] border border-cyan-200/10 bg-cyan-300/[0.045] p-3">
              <p className="text-sm font-black leading-5 text-white">Start with your current reality.</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/40">CLARA will adapt the next questions based on the season you choose.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {STAGES.map((stage) => (
                <StageCard key={stage} stage={stage} active={draft.stage === stage} onClick={() => setStage(stage)} />
              ))}
            </div>
          </div>
        ) : null}

        {step === "environment" ? (
          <div className="space-y-4 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
            <div className="rounded-[20px] border border-emerald-200/10 bg-emerald-300/[0.06] p-3">
              <p className="text-sm font-black leading-5 text-white">Got it — {draft.stage}.</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/42">Now CLARA will read the environment around this stage, not just your income.</p>
            </div>
            <OptionGroup label="Current setup" helper="Where are you living or operating from right now?" value={draft.setup} options={fields.setup} onSelect={(value) => setDraft((current) => ({ ...current, setup: value }))} />
            <OptionGroup label="Current rhythm" helper="How stable does this season feel lately?" value={draft.rhythm} options={fields.rhythm} onSelect={(value) => setDraft((current) => ({ ...current, rhythm: value }))} />
          </div>
        ) : null}

        {step === "focus" ? (
          <div className="space-y-4 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
            <div className="rounded-[20px] border border-cyan-200/10 bg-cyan-300/[0.05] p-3">
              <p className="text-sm font-black leading-5 text-white">Last part — what should CLARA watch?</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/42">This will shape the trend statistics on your Me screen.</p>
            </div>
            <OptionGroup label="Pressure right now" helper="Choose the pressure that best explains this stage." value={draft.pressure} options={fields.pressure} onSelect={(value) => setDraft((current) => ({ ...current, pressure: value }))} />
            <OptionGroup label="Main focus" helper="What should CLARA protect first?" value={draft.goal} options={fields.goal} onSelect={(value) => setDraft((current) => ({ ...current, goal: value }))} />
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex shrink-0 gap-2">
        {step === "stage" ? (
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-black text-white/58 active:scale-95">Cancel</button>
        ) : (
          <button type="button" onClick={() => setStep(step === "focus" ? "environment" : "stage")} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-black text-white/58 active:scale-95"><ChevronLeft className="h-4 w-4" /> Back</button>
        )}

        {step === "stage" ? (
          <button type="button" onClick={() => setStep("environment")} className="flex-1 rounded-full bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95">Continue</button>
        ) : step === "environment" ? (
          <button type="button" onClick={() => setStep("focus")} className="flex-1 rounded-full bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95">Continue</button>
        ) : (
          <button type="button" onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95"><Check className="h-4 w-4" /> Apply stage</button>
        )}
      </div>
    </div>
  );
}

export default function FinancialClimateScreen({ signals, signalCount }) {
  const [showStageSetup, setShowStageSetup] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [stageProfile, setStageProfile] = useState(() => readStageProfile());
  const climate = useMemo(() => readClimate(signals, stageProfile), [signals, stageProfile]);

  useEffect(() => {
    saveStageProfile(stageProfile);
  }, [stageProfile]);

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.02)_46%,rgba(16,185,129,.05))] p-4 shadow-[0_18px_60px_rgba(0,0,0,.24)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute -left-20 top-0 h-52 w-52 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 h-60 w-60 rounded-full bg-violet-400/10 blur-3xl" />

      <div className="relative flex min-h-0 flex-1 flex-col rounded-[24px] border border-cyan-200/10 bg-[linear-gradient(135deg,rgba(6,182,212,.06),rgba(255,255,255,.02))] p-4 text-left">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.17em] text-cyan-100/42"><TrendingUp className="h-3.5 w-3.5" /> Life stage trend</p>
            <h4 className="mt-1 text-xl font-black leading-tight text-white">{climate.lifeStage}</h4>
          </div>
          <button type="button" onClick={() => setShowStageSetup(true)} className="rounded-full border border-emerald-200/12 bg-emerald-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/74 active:scale-95">Set stage</button>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 grid-rows-3 gap-2.5">
          {climate.trends.map((trend) => (
            <TrendCard key={trend.label} trend={trend} onClick={setSelectedTrend} />
          ))}
        </div>
      </div>

      {selectedTrend ? <TrendDetailPanel trend={selectedTrend} onClose={() => setSelectedTrend(null)} /> : null}
      {showStageSetup ? <StageSetupPanel profile={stageProfile} onClose={() => setShowStageSetup(false)} onSave={setStageProfile} /> : null}
    </div>
  );
}
