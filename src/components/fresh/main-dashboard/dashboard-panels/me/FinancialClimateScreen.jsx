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
    glow: "from-cyan-400/14 via-blue-500/8 to-violet-500/12",
    silhouette:
      "linear-gradient(145deg, rgba(125,211,252,.55), rgba(30,64,175,.16)), radial-gradient(circle at 50% 18%, rgba(255,255,255,.30), transparent 18%), linear-gradient(180deg, transparent 0 40%, rgba(8,15,35,.85) 41% 100%)",
  },
  "Young Earner": {
    glow: "from-cyan-400/14 via-blue-500/8 to-violet-500/12",
    silhouette:
      "linear-gradient(145deg, rgba(125,211,252,.55), rgba(30,64,175,.16)), radial-gradient(circle at 50% 18%, rgba(255,255,255,.30), transparent 18%), linear-gradient(180deg, transparent 0 40%, rgba(8,15,35,.85) 41% 100%)",
  },
  "Working Student": {
    glow: "from-sky-400/14 via-indigo-500/8 to-emerald-500/12",
    silhouette:
      "linear-gradient(145deg, rgba(56,189,248,.5), rgba(16,185,129,.14)), radial-gradient(circle at 52% 18%, rgba(255,255,255,.28), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(7,20,36,.86) 43% 100%)",
  },
  "Living with Partner": {
    glow: "from-fuchsia-400/14 via-cyan-500/8 to-violet-500/14",
    silhouette:
      "linear-gradient(145deg, rgba(217,70,239,.38), rgba(6,182,212,.16)), radial-gradient(circle at 48% 18%, rgba(255,255,255,.28), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(23,15,45,.86) 43% 100%)",
  },
  "Single Parent": {
    glow: "from-emerald-400/14 via-cyan-500/8 to-violet-500/12",
    silhouette:
      "linear-gradient(145deg, rgba(52,211,153,.42), rgba(59,130,246,.14)), radial-gradient(circle at 51% 18%, rgba(255,255,255,.28), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(8,32,35,.86) 43% 100%)",
  },
  Breadwinner: {
    glow: "from-amber-400/12 via-cyan-500/8 to-violet-500/12",
    silhouette:
      "linear-gradient(145deg, rgba(251,191,36,.38), rgba(14,165,233,.14)), radial-gradient(circle at 50% 18%, rgba(255,255,255,.28), transparent 18%), linear-gradient(180deg, transparent 0 42%, rgba(28,22,8,.86) 43% 100%)",
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

function MiniGraph({ value }) {
  const stroke = value >= 70 ? "rgba(45,212,191,.95)" : value >= 50 ? "rgba(250,204,21,.9)" : "rgba(248,113,113,.92)";
  return (
    <svg viewBox="0 0 92 34" className="mt-2 h-7 w-full overflow-visible" aria-hidden="true">
      <path
        d="M2 28 C10 22 16 25 22 18 C28 10 33 16 39 9 C45 2 51 15 58 11 C66 7 70 17 76 12 C83 7 87 11 90 9"
        fill="none"
        stroke={stroke}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
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
    <button
      type="button"
      onClick={onClick}
      className="h-full min-w-[116px] snap-start rounded-[16px] border border-white/8 bg-slate-950/24 p-3 text-left shadow-[0_14px_38px_rgba(0,0,0,.18)] backdrop-blur-xl transition active:scale-[0.985]"
    >
      <p className="line-clamp-1 text-[9px] font-black tracking-tight text-white/64">{item.label}</p>
      <p className="mt-1 text-[22px] font-black leading-none text-white">{item.value}%</p>
      <p className={`mt-1 text-[9px] font-black ${item.value >= 70 ? "text-rose-300" : item.value >= 55 ? "text-amber-200" : "text-emerald-200"}`}>
        {statusLabel(item.value)}
      </p>
      <MiniGraph value={item.value} />
    </button>
  );
}

function DataDetailPanel({ trend, onClose }) {
  return (
    <div className="absolute inset-0 z-30 rounded-[28px] border border-cyan-200/12 bg-slate-950/90 p-4 backdrop-blur-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/46">
            <Database className="h-3.5 w-3.5" /> Data status
          </p>
          <h4 className="mt-2 text-2xl font-black leading-tight text-white">{trend.label}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/42">{trend.note}</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close data details">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-5 rounded-[22px] border border-white/8 bg-white/[0.045] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/36">Life-stage reading</p>
        <p className="mt-1 text-4xl font-black leading-none text-white">{trend.value}%</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(45,212,191,.45),rgba(96,165,250,.88))]" style={{ width: `${Math.max(14, Math.min(96, trend.value))}%` }} />
        </div>
      </div>
      <div className="mt-3 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Source direction</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-white/56">
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
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col rounded-[28px] border border-cyan-200/12 bg-slate-950/92 p-4 backdrop-blur-2xl">
      <div className="flex shrink-0 items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/46">Stage image</p>
          <h4 className="mt-2 text-xl font-black leading-tight text-white">Customize {stage}</h4>
          <p className="mt-1 text-xs font-semibold leading-5 text-white/42">Use the default CLARA visual or upload your own image for this life stage.</p>
        </div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.055] text-white/62 active:scale-95" aria-label="Close image setup">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative h-60 overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.035]">
          {preview ? (
            <img src={preview} alt={`${stage} custom visual`} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-center">
              <ImageIcon className="mx-auto h-9 w-9 text-white/34" />
              <p className="mt-2 text-xs font-black text-white/48">Default CLARA stage visual</p>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(3,8,28,.72))]" />
        </div>
        <div className="mt-4 grid gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95">
            <Upload className="h-4 w-4" /> Upload image
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          <button type="button" onClick={() => setPreview("")} className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-black text-white/58 active:scale-95">
            <RotateCcw className="h-4 w-4" /> Use default
          </button>
        </div>
      </div>
      <div className="mt-3 flex shrink-0 gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 text-xs font-black text-white/58 active:scale-95">Cancel</button>
        <button type="button" onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-300 px-4 py-3 text-xs font-black text-slate-950 active:scale-95">
          <Check className="h-4 w-4" /> Apply image
        </button>
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
          return (
            <button key={option} type="button" onClick={() => onSelect(option)} className={`rounded-full border px-3 py-2 text-[11px] font-black transition active:scale-95 ${active ? "border-emerald-200/28 bg-emerald-300/16 text-emerald-100" : "border-white/8 bg-white/[0.04] text-white/48"}`}>
              {option}
            </button>
          );
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
        {step === "stage" ? <div className="grid grid-cols-2 gap-2.5">{STAGES.map((stage) => <StageCard key={stage} stage={stage} active={draft.stage === stage} onClick={() => setStage(stage)} />)}</div> : null}
        {step === "environment" ? (
          <div className="space-y-4 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
            <OptionGroup label="Current setup" helper="Where are you living or operating from right now?" value={draft.setup} options={fields.setup} onSelect={(value) => setDraft((current) => ({ ...current, setup: value }))} />
            <OptionGroup label="Current rhythm" helper="How stable does this season feel lately?" value={draft.rhythm} options={fields.rhythm} onSelect={(value) => setDraft((current) => ({ ...current, rhythm: value }))} />
          </div>
        ) : null}
        {step === "focus" ? (
          <div className="space-y-4 rounded-[22px] border border-white/8 bg-white/[0.035] p-4">
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

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] bg-[#020817] px-3 pb-3 pt-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,.04)]">
      <section className={`relative min-h-0 flex-[1.25] overflow-hidden rounded-b-[30px] bg-gradient-to-br ${visual.glow} px-5 pb-5 pt-5 shadow-[0_22px_80px_rgba(0,0,0,.22)]`}>
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-[linear-gradient(180deg,transparent,rgba(2,8,23,.95))]" />
        <div className="absolute inset-0 opacity-70 [background:linear-gradient(180deg,rgba(2,8,23,.20),rgba(2,8,23,.75)),radial-gradient(circle_at_78%_18%,rgba(96,165,250,.30),transparent_18%),linear-gradient(90deg,rgba(2,8,23,.98)_0%,rgba(2,8,23,.55)_54%,rgba(2,8,23,.14)_100%)]" />
        <div className="absolute bottom-0 right-0 h-full w-[56%] overflow-hidden">
          {activeImage ? <img src={activeImage} alt={`${stageProfile.stage} stage background`} className="h-full w-full object-cover opacity-80" /> : <div className="absolute inset-x-2 bottom-0 h-[92%] rounded-t-[90px] opacity-95" style={{ background: visual.silhouette }} />}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,23,.82),rgba(2,8,23,.05)_48%,rgba(2,8,23,.10))]" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[linear-gradient(180deg,transparent,#020817)]" />

        <div className="absolute right-4 top-4 z-20">
          <button
            type="button"
            onClick={() => setShowHeroActions((current) => !current)}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/12 bg-slate-950/22 text-white/70 shadow-[0_10px_28px_rgba(0,0,0,.22)] backdrop-blur-xl transition active:scale-95"
            aria-label="Open life stage actions"
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>

          {showHeroActions ? (
            <div className="absolute right-0 top-11 w-36 overflow-hidden rounded-[18px] border border-white/12 bg-slate-950/72 p-1.5 shadow-[0_18px_54px_rgba(0,0,0,.38)] backdrop-blur-2xl">
              <button type="button" onClick={openStageSetup} className="w-full rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/78 transition hover:bg-white/[0.06] active:scale-[0.99]">
                Set stage
              </button>
              <button type="button" onClick={openImageSetup} className="w-full rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/78 transition hover:bg-white/[0.06] active:scale-[0.99]">
                Image
              </button>
            </div>
          ) : null}
        </div>

        <div className="relative z-10 flex h-full max-w-[59%] flex-col justify-center pt-3">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/55">Your life stage</p>
          <h2 className="mt-2 text-[clamp(22px,7vw,31px)] font-black leading-[1.02] text-white drop-shadow-lg">{stageProfile.stage} <span className="text-[13px] text-amber-200">♛</span></h2>
          <p className="mt-2 line-clamp-4 text-[12px] font-semibold leading-5 text-white/64">{definition.identity.caption}</p>
        </div>
      </section>

      <section className="mt-3 min-h-0 flex-[0.58] overflow-hidden rounded-[24px] border border-violet-300/12 bg-white/[0.045] p-3 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-black text-white">You’re not alone.</h3>
            <p className="mt-1 line-clamp-3 text-[12px] font-semibold leading-5 text-white/60">Many people in this life stage are experiencing similar financial pressure.</p>
          </div>
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-fuchsia-300/25 bg-fuchsia-400/10 shadow-[0_0_35px_rgba(217,70,239,.28)]"><Heart className="h-7 w-7 fill-fuchsia-200 text-fuchsia-200" /></div>
        </div>
      </section>

      <section className="mt-3 flex min-h-0 flex-[0.95] flex-col overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.035] p-3 backdrop-blur-xl">
        <div className="flex shrink-0 items-center justify-between gap-3"><div><h3 className="text-[14px] font-black text-white">Life Stage Trend Snapshot</h3><p className="mt-0.5 text-[10px] font-semibold text-white/38">Swipe the stage cards.</p></div><Sparkles className="h-4 w-4 text-cyan-100/42" /></div>
        <div className="mt-3 flex min-h-0 flex-1 snap-x gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{definition.indicators.map((item) => <TrendSnapshotCard key={item.label} item={item} onClick={() => setSelectedTrend(item)} />)}</div>
      </section>

      {selectedTrend ? <DataDetailPanel trend={selectedTrend} onClose={() => setSelectedTrend(null)} /> : null}
      {showImageSetup ? <StageImagePanel stage={stageProfile.stage} image={customImage} onApply={applyStageImage} onClose={() => setShowImageSetup(false)} /> : null}
      {showStageSetup ? <StageSetupPanel profile={stageProfile} onClose={() => setShowStageSetup(false)} onSave={setStageProfile} /> : null}
    </div>
  );
}
