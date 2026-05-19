import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  Database,
  Heart,
  ImageIcon,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { DEFAULT_STAGE, getStageDefinition, LIFE_STAGE_KEY, STAGES } from "./lifeStageIntelligenceData";
import { getLifeStageImage } from "../../../../../config/lifeStageImages";

const STAGE_IMAGE_KEY = "clara_life_stage_images_v1";

const STAGE_VISUALS = {
  "Young Professional": {
    glow: "from-cyan-400/10 via-blue-500/6 to-violet-500/10",
    silhouette:
      "linear-gradient(145deg, rgba(125,211,252,.42), rgba(30,64,175,.12)), radial-gradient(circle at 50% 18%, rgba(255,255,255,.22), transparent 18%), linear-gradient(180deg, transparent 0 40%, rgba(8,15,35,.88) 41% 100%)",
  },
  "Young Earner": {
    glow: "from-cyan-400/10 via-blue-500/6 to-violet-500/10",
    silhouette:
      "linear-gradient(145deg, rgba(125,211,252,.42), rgba(30,64,175,.12)), radial-gradient(circle at 50% 18%, rgba(255,255,255,.22), transparent 18%), linear-gradient(180deg, transparent 0 40%, rgba(8,15,35,.88) 41% 100%)",
  },
  "Working Student": {
    glow: "from-sky-400/10 via-indigo-500/6 to-emerald-500/8",
    silhouette:
      "linear-gradient(145deg, rgba(56,189,248,.38), rgba(16,185,129,.10)), radial-gradient(circle at 52% 18%, rgba(255,255,255,.22), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(7,20,36,.88) 43% 100%)",
  },
  "Living with Partner": {
    glow: "from-fuchsia-400/9 via-cyan-500/6 to-violet-500/10",
    silhouette:
      "linear-gradient(145deg, rgba(217,70,239,.28), rgba(6,182,212,.12)), radial-gradient(circle at 48% 18%, rgba(255,255,255,.22), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(23,15,45,.88) 43% 100%)",
  },
  "Single Parent": {
    glow: "from-emerald-400/8 via-cyan-500/6 to-violet-500/9",
    silhouette:
      "linear-gradient(145deg, rgba(52,211,153,.32), rgba(59,130,246,.10)), radial-gradient(circle at 51% 18%, rgba(255,255,255,.22), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(8,32,35,.88) 43% 100%)",
  },
  Breadwinner: {
    glow: "from-amber-400/8 via-cyan-500/5 to-violet-500/8",
    silhouette:
      "linear-gradient(145deg, rgba(251,191,36,.28), rgba(14,165,233,.10)), radial-gradient(circle at 50% 18%, rgba(255,255,255,.22), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(28,22,8,.88) 43% 100%)",
  },
};

const CATEGORY_STYLES = {
  pressure: {
    stroke: "rgba(251,113,133,.88)",
    statusClass: "text-rose-200",
    glow: "shadow-[0_0_22px_rgba(251,113,133,.10)]",
    chip: "bg-rose-300/8 border-rose-200/10",
  },
  stability: {
    stroke: "rgba(45,212,191,.9)",
    statusClass: "text-cyan-100",
    glow: "shadow-[0_0_22px_rgba(45,212,191,.10)]",
    chip: "bg-cyan-300/8 border-cyan-200/10",
  },
  energy: {
    stroke: "rgba(167,139,250,.9)",
    statusClass: "text-violet-100",
    glow: "shadow-[0_0_22px_rgba(167,139,250,.10)]",
    chip: "bg-violet-300/8 border-violet-200/10",
  },
  growth: {
    stroke: "rgba(250,204,21,.86)",
    statusClass: "text-amber-100",
    glow: "shadow-[0_0_22px_rgba(250,204,21,.10)]",
    chip: "bg-amber-300/8 border-amber-200/10",
  },
  default: {
    stroke: "rgba(125,211,252,.85)",
    statusClass: "text-cyan-100",
    glow: "shadow-[0_0_22px_rgba(125,211,252,.10)]",
    chip: "bg-cyan-300/8 border-cyan-200/10",
  },
};

function readStageProfile() {
  if (typeof window === "undefined") return DEFAULT_STAGE;
  try {
    const saved = JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
    const normalizedStage = saved.stage === "Young Earner" ? "Young Professional" : saved.stage;
    return { ...DEFAULT_STAGE, ...saved, stage: normalizedStage || DEFAULT_STAGE.stage };
  } catch {
    return DEFAULT_STAGE;
  }
}

function saveStageProfile(profile) {
  if (typeof window === "undefined") return;
  const normalizedProfile = {
    ...profile,
    stage: profile?.stage === "Young Earner" ? "Young Professional" : profile?.stage,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(LIFE_STAGE_KEY, JSON.stringify(normalizedProfile));
}

function readStageImages() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STAGE_IMAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveStageImages(images) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STAGE_IMAGE_KEY, JSON.stringify(images || {}));
}

function MiniGraph({ value, category }) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.default;
  return (
    <svg viewBox="0 0 92 34" className="mt-2 h-7 w-full overflow-visible" aria-hidden="true">
      <path
        d="M2 28 C10 22 16 25 22 18 C28 10 33 16 39 9 C45 2 51 15 58 11 C66 7 70 17 76 12 C83 7 87 11 90 9"
        fill="none"
        stroke={style.stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M2 32 H90" stroke="rgba(255,255,255,.055)" strokeWidth="1" />
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
  const style = CATEGORY_STYLES[item.category] || CATEGORY_STYLES.default;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-full min-w-[116px] snap-start rounded-[16px] border border-white/[0.075] bg-[#071226]/66 p-3 text-left backdrop-blur-xl transition active:scale-[0.985] ${style.glow}`}
    >
      <p className="line-clamp-1 text-[9px] font-black tracking-tight text-white/56">{item.label}</p>
      <p className="mt-1 text-[22px] font-black leading-none text-white">{item.value}%</p>
      <p className={`mt-1 text-[9px] font-black ${style.statusClass}`}>{statusLabel(item.value)}</p>
      <MiniGraph value={item.value} category={item.category} />
    </button>
  );
}

function DataDetailPanel({ trend, onClose }) {
  const style = CATEGORY_STYLES[trend.category] || CATEGORY_STYLES.default;
  return (
    <div className="absolute inset-0 z-30 rounded-[28px] border border-white/[0.075] bg-[#050b1f]/92 p-4 shadow-[0_24px_80px_rgba(0,0,0,.42)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_14%_8%,rgba(45,212,191,.10),transparent_28%),radial-gradient(circle_at_86%_10%,rgba(91,63,209,.16),transparent_30%)]" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">
            <Database className="h-3.5 w-3.5" /> Data status
          </p>
          <h4 className="mt-2 text-2xl font-black leading-tight text-white">{trend.label}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/48">{trend.note}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-white/58 active:scale-95" aria-label="Close data details">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className={`relative z-10 mt-5 rounded-[22px] border p-4 ${style.chip}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Life-stage reading</p>
        <p className="mt-1 text-4xl font-black leading-none text-white">{trend.value}%</p>
        <p className={`mt-1 text-xs font-black ${style.statusClass}`}>{statusLabel(trend.value)}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.055]">
          <div className="h-full rounded-full" style={{ width: `${Math.max(14, Math.min(96, trend.value))}%`, background: style.stroke }} />
        </div>
      </div>
      <div className="relative z-10 mt-3 rounded-[22px] border border-white/[0.065] bg-white/[0.03] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Source direction</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/54">
          This is currently a CLARA life-stage intelligence placeholder. Later this can show Philippine survey data, admin-managed sources, and trend update status.
        </p>
      </div>
    </div>
  );
}

function StageImagePanel({ stage, image, onApply, onClose }) {
  const [preview, setPreview] = useState(image || "");

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const save = () => {
    onApply(preview || "");
    onClose();
  };

  return (
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col rounded-[28px] border border-white/[0.075] bg-[#050b1f]/92 p-4 shadow-[0_24px_80px_rgba(0,0,0,.42)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_12%_10%,rgba(45,212,191,.10),transparent_28%),radial-gradient(circle_at_86%_12%,rgba(91,63,209,.16),transparent_32%)]" />
      <div className="relative z-10 flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">Stage image</p>
          <h4 className="mt-2 text-xl font-black leading-tight text-white">Customize {stage}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/44">Use the default CLARA visual or upload your own image for this life stage.</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-white/58 active:scale-95" aria-label="Close image setup">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative z-10 mt-4 min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative h-60 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#071226]/64">
          {preview ? (
            <img src={preview} alt={`${stage} custom visual`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-center">
              <ImageIcon className="mx-auto h-9 w-9 text-white/30" />
              <p className="mt-2 text-xs font-black text-white/44">Default CLARA stage visual</p>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(3,8,28,.72))]" />
        </div>
        <div className="mt-4 grid gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_10px_32px_rgba(125,211,252,.16)] active:scale-95">
            <Upload className="h-4 w-4" /> Upload image
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          <button type="button" onClick={() => setPreview("")} className="flex items-center justify-center gap-2 rounded-full border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-xs font-black text-white/54 active:scale-95">
            <RotateCcw className="h-4 w-4" /> Use default
          </button>
        </div>
      </div>
      <div className="relative z-10 mt-3 flex shrink-0 gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-xs font-black text-white/54 active:scale-95">Cancel</button>
        <button type="button" onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_10px_32px_rgba(125,211,252,.16)] active:scale-95">
          <Check className="h-4 w-4" /> Apply image
        </button>
      </div>
    </div>
  );
}

function StageCard({ stage, active, onClick }) {
  const identity = getStageDefinition(stage).identity;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden rounded-[22px] border p-3.5 text-left transition active:scale-[0.98] ${
        active
          ? "border-cyan-200/24 bg-[linear-gradient(145deg,rgba(45,212,191,.13),rgba(91,63,209,.12))] shadow-[0_0_28px_rgba(45,212,191,.10)]"
          : "border-white/[0.075] bg-[#071226]/58 shadow-[inset_0_1px_0_rgba(255,255,255,.025)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(45,212,191,.08),transparent_35%)] opacity-70" />
      <div className="relative z-10">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/38">{stage}</p>
        <p className="mt-1 text-sm font-black leading-tight text-white">{identity.title}</p>
        <p className="mt-1 line-clamp-2 text-[11px] font-semibold leading-4 text-white/42">{identity.caption}</p>
      </div>
    </button>
  );
}

function OptionGroup({ label, helper, value, options, onSelect }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/38">{label}</p>
      {helper ? <p className="mt-1 text-[11px] font-semibold leading-4 text-white/34">{helper}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${
                active ? "border-cyan-200/22 bg-cyan-200/12 text-cyan-50" : "border-white/[0.075] bg-[#071226]/54 text-white/46"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LifeStageSetupScreen({ profile, onClose, onSave }) {
  const [draft, setDraft] = useState(profile);
  const [step, setStep] = useState("stage");
  const definition = getStageDefinition(draft.stage);
  const fields = definition.fields;
  const stepOrder = ["stage", "environment", "focus"];
  const stepIndex = stepOrder.indexOf(step);

  const selectStage = (stageName) => {
    const next = getStageDefinition(stageName).fields;
    setDraft({
      stage: stageName,
      setup: next.setup[0],
      rhythm: next.rhythm[0],
      pressure: next.pressure[0],
      goal: next.goal[0],
    });
  };

  const goBack = () => {
    if (step === "stage") {
      onClose();
      return;
    }
    setStep(step === "focus" ? "environment" : "stage");
  };

  const goNext = () => {
    if (step === "stage") {
      setStep("environment");
      return;
    }
    if (step === "environment") {
      setStep("focus");
      return;
    }
    const savedDraft = { ...draft, updatedAt: new Date().toISOString() };
    saveStageProfile(savedDraft);
    onSave(savedDraft);
    onClose();
  };

  const title = step === "stage" ? "Let CLARA understand your season" : step === "environment" ? "Shape the environment" : "Set CLARA’s focus";
  const subtitle =
    step === "stage"
      ? "Choose the life stage that best matches your financial environment right now."
      : step === "environment"
        ? "Now tell CLARA how this season actually feels day to day."
        : "Choose what CLARA should watch and protect first.";

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] bg-[#020817] px-3 pb-3 pt-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.035)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_4%,rgba(45,212,191,.14),transparent_28%),radial-gradient(circle_at_90%_8%,rgba(91,63,209,.20),transparent_32%),linear-gradient(180deg,rgba(7,18,38,.84),rgba(2,8,23,.96))]" />

      <header className="relative z-10 shrink-0 rounded-[26px] border border-white/[0.075] bg-[#071226]/58 p-4 shadow-[0_18px_54px_rgba(0,0,0,.22)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/46">Life stage setup</p>
            <h3 className="mt-2 max-w-[260px] text-[24px] font-black leading-[1.05] text-white">{title}</h3>
            <p className="mt-2 max-w-[280px] text-xs font-semibold leading-5 text-white/50">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-white/58 active:scale-95" aria-label="Close life stage setup">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-1.5">
          {stepOrder.map((item, index) => (
            <div key={item} className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-cyan-200/72 shadow-[0_0_18px_rgba(125,211,252,.18)]" : "bg-white/[0.065]"}`} />
          ))}
        </div>
      </header>

      <main className="relative z-10 mt-3 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {step === "stage" ? (
          <div className="grid grid-cols-2 gap-2.5 pb-3">
            {STAGES.map((stage) => (
              <StageCard key={stage} stage={stage} active={draft.stage === stage} onClick={() => selectStage(stage)} />
            ))}
          </div>
        ) : null}

        {step === "environment" ? (
          <div className="space-y-3 pb-3">
            <section className="rounded-[24px] border border-white/[0.075] bg-[#071226]/58 p-4 backdrop-blur-xl">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">Current stage</p>
              <h4 className="mt-2 text-xl font-black leading-tight text-white">{draft.stage}</h4>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/46">{definition.identity.caption}</p>
            </section>
            <section className="space-y-5 rounded-[24px] border border-white/[0.075] bg-[#071226]/58 p-4 backdrop-blur-xl">
              <OptionGroup label="Current setup" helper="Where are you living or operating from right now?" value={draft.setup} options={fields.setup} onSelect={(value) => setDraft((current) => ({ ...current, setup: value }))} />
              <OptionGroup label="Current rhythm" helper="How stable does this season feel lately?" value={draft.rhythm} options={fields.rhythm} onSelect={(value) => setDraft((current) => ({ ...current, rhythm: value }))} />
            </section>
          </div>
        ) : null}

        {step === "focus" ? (
          <div className="space-y-3 pb-3">
            <section className="rounded-[24px] border border-white/[0.075] bg-[#071226]/58 p-4 backdrop-blur-xl">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">CLARA will read</p>
              <h4 className="mt-2 text-xl font-black leading-tight text-white">{draft.stage}</h4>
              <p className="mt-2 text-xs font-semibold leading-5 text-white/46">This shapes your trend snapshot, coaching tone, and future financial guidance.</p>
            </section>
            <section className="space-y-5 rounded-[24px] border border-white/[0.075] bg-[#071226]/58 p-4 backdrop-blur-xl">
              <OptionGroup label="Pressure right now" helper="Choose the pressure that best explains this stage." value={draft.pressure} options={fields.pressure} onSelect={(value) => setDraft((current) => ({ ...current, pressure: value }))} />
              <OptionGroup label="Main focus" helper="What should CLARA protect first?" value={draft.goal} options={fields.goal} onSelect={(value) => setDraft((current) => ({ ...current, goal: value }))} />
            </section>
          </div>
        ) : null}
      </main>

      <footer className="relative z-10 mt-3 flex shrink-0 gap-2">
        <button type="button" onClick={goBack} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-xs font-black text-white/54 active:scale-95">
          {step === "stage" ? "Cancel" : <><ChevronLeft className="h-4 w-4" /> Back</>}
        </button>
        <button type="button" onClick={goNext} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_10px_32px_rgba(125,211,252,.16)] active:scale-95">
          {step === "focus" ? <><Check className="h-4 w-4" /> Apply stage</> : "Continue"}
        </button>
      </footer>
    </div>
  );
}

export default function FinancialClimateScreen() {
  const [showStageSetup, setShowStageSetup] = useState(false);
  const [showImageSetup, setShowImageSetup] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [showHeroActions, setShowHeroActions] = useState(false);
  const [stageProfile, setStageProfile] = useState(() => readStageProfile());
  const [stageImages, setStageImages] = useState(() => readStageImages());

  const definition = useMemo(() => getStageDefinition(stageProfile.stage), [stageProfile.stage]);
  const visual = STAGE_VISUALS[stageProfile.stage] || STAGE_VISUALS["Young Professional"];
  const customImage = stageImages[stageProfile.stage] || "";
  const defaultImage = getLifeStageImage(stageProfile.stage, "default");
  const activeImage = customImage || defaultImage;

  useEffect(() => { saveStageProfile(stageProfile); }, [stageProfile]);
  useEffect(() => { saveStageImages(stageImages); }, [stageImages]);

  const applyStageImage = (image) => {
    setStageImages((current) => {
      const next = { ...current };
      if (image) next[stageProfile.stage] = image;
      else delete next[stageProfile.stage];
      return next;
    });
  };

  const openStageSetup = () => {
    setShowHeroActions(false);
    setShowStageSetup(true);
  };

  const openImageSetup = () => {
    setShowHeroActions(false);
    setShowImageSetup(true);
  };

  if (showStageSetup) {
    return <LifeStageSetupScreen profile={stageProfile} onClose={() => setShowStageSetup(false)} onSave={setStageProfile} />;
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] bg-[#020817] px-3 pb-3 pt-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,.035)]">
      <section className={`relative min-h-0 flex-[1.25] overflow-hidden rounded-b-[30px] bg-gradient-to-br ${visual.glow} px-5 pb-5 pt-5 shadow-[0_22px_80px_rgba(0,0,0,.22)]`}>
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-[linear-gradient(180deg,transparent,rgba(2,8,23,.96))]" />
        <div className="absolute inset-0 opacity-75 [background:linear-gradient(180deg,rgba(2,8,23,.18),rgba(2,8,23,.72)),radial-gradient(circle_at_78%_18%,rgba(96,165,250,.18),transparent_18%),linear-gradient(90deg,rgba(2,8,23,.98)_0%,rgba(2,8,23,.58)_54%,rgba(2,8,23,.14)_100%)]" />
        <div className="absolute bottom-0 right-0 h-full w-[56%] overflow-hidden">
          {activeImage ? <img src={activeImage} alt={`${stageProfile.stage} stage background`} className="h-full w-full object-cover opacity-78 saturate-[.9]" /> : <div className="absolute inset-x-2 bottom-0 h-[92%] rounded-t-[90px] opacity-90" style={{ background: visual.silhouette }} />}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,23,.84),rgba(2,8,23,.08)_48%,rgba(2,8,23,.18))]" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[linear-gradient(180deg,transparent,#020817)]" />

        <div className="absolute left-4 top-4 z-20">
          <button
            type="button"
            onClick={() => setShowHeroActions((current) => !current)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.085] bg-slate-950/24 text-white/64 shadow-[0_10px_28px_rgba(0,0,0,.22)] backdrop-blur-xl transition active:scale-95"
            aria-label="Open life stage actions"
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>

          {showHeroActions ? (
            <div className="absolute left-0 top-11 w-36 overflow-hidden rounded-[18px] border border-white/[0.085] bg-[#071226]/82 p-1.5 shadow-[0_18px_54px_rgba(0,0,0,.38)] backdrop-blur-2xl">
              <button type="button" onClick={openStageSetup} className="w-full rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:bg-white/[0.055] active:scale-[0.99]">
                Set stage
              </button>
              <button type="button" onClick={openImageSetup} className="w-full rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:bg-white/[0.055] active:scale-[0.99]">
                Image
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative z-10 flex h-full max-w-[59%] flex-col justify-center pt-3">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/52">Your life stage</p>
          <h2 className="mt-2 text-[clamp(22px,7vw,31px)] font-black leading-[1.02] text-white drop-shadow-lg">{stageProfile.stage} <span className="text-[13px] text-amber-100/78">♛</span></h2>
          <p className="mt-2 line-clamp-4 text-[12px] font-semibold leading-5 text-white/62">{definition.identity.caption}</p>
        </div>
      </section>

      <section className="mt-3 min-h-0 flex-[0.58] overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#071226]/56 p-3 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-black text-white">You’re not alone.</h3>
            <p className="mt-1 line-clamp-3 text-[12px] font-semibold leading-5 text-white/56">Many people in this life stage are experiencing similar financial pressure.</p>
          </div>
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-violet-200/14 bg-violet-300/8 shadow-[0_0_30px_rgba(167,139,250,.18)]"><Heart className="h-7 w-7 fill-violet-100 text-violet-100" /></div>
        </div>
      </section>

      <section className="mt-3 flex min-h-0 flex-[0.95] flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#071226]/50 p-3 backdrop-blur-xl">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-black text-white">Life Stage Trend Snapshot</h3>
            <p className="mt-0.5 text-[10px] font-semibold text-white/36">Swipe the stage cards.</p>
          </div>
          <Sparkles className="h-4 w-4 text-cyan-100/36" />
        </div>
        <div className="mt-3 flex min-h-0 flex-1 snap-x gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{definition.indicators.map((item) => <TrendSnapshotCard key={item.label} item={item} onClick={() => setSelectedTrend(item)} />)}</div>
      </section>

      {selectedTrend ? <DataDetailPanel trend={selectedTrend} onClose={() => setSelectedTrend(null)} /> : null}
      {showImageSetup ? <StageImagePanel stage={stageProfile.stage} image={customImage} onApply={applyStageImage} onClose={() => setShowImageSetup(false)} /> : null}
    </div>
  );
}
