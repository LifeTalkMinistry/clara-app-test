import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, Heart, ImageIcon, Mars, MoreHorizontal, RotateCcw, Sparkles, Upload, Venus, X } from "lucide-react";
import { getLifeStageHero } from "../../../../../life-stage-hero";
import { getLifeStageGuidance } from "../../../../../life-stage-guidance";
import { getLifeStageSnapshot } from "../../../../../life-stage-snapshot";
import {
  getLifeStageOptions,
  getLifeStageQuestions,
  getLifeStageSelectionList,
  getLifeStageStageContext,
  getSelectedLifeStageKey,
  normalizeLifeStageKey,
  readSelectedLifeStageProfile,
  saveSelectedLifeStageProfile,
} from "../../../../../life-stage-flow";

const STAGE_IMAGE_KEY = "clara_life_stage_images_v1";
const QUESTION_META = {
  setup: "Current setup",
  rhythm: "Money rhythm",
  workload: "Weekly load",
  pressure: "Pressure right now",
  coping: "Pressure response",
  goal: "Protection goal",
};
const HERO_VISUALS = {
  "Working Student": "from-sky-400/10 via-indigo-500/6 to-emerald-500/8",
  "Young Professional": "from-cyan-400/10 via-blue-500/6 to-violet-500/10",
  "Living with Partner": "from-fuchsia-400/9 via-cyan-500/6 to-violet-500/10",
  "Living With Partner": "from-fuchsia-400/9 via-cyan-500/6 to-violet-500/10",
  "Family Household": "from-cyan-400/9 via-emerald-500/5 to-violet-500/8",
  "Single Parent": "from-emerald-400/8 via-cyan-500/6 to-violet-500/9",
  "Full-Time Earner": "from-blue-400/9 via-cyan-500/5 to-violet-500/8",
  "Freelance Season": "from-cyan-400/8 via-blue-500/5 to-violet-500/10",
  "Business Builder": "from-amber-400/8 via-cyan-500/5 to-violet-500/8",
};

function normalizeImageVariant(value = "default") {
  const key = String(value || "").toLowerCase().trim();
  if (["male", "men", "man", "boy"].includes(key)) return "male";
  if (["female", "girl", "woman"].includes(key)) return "female";
  return "default";
}

function readStageProfile() {
  const saved = readSelectedLifeStageProfile();
  const stage = normalizeLifeStageKey(saved?.stage || getSelectedLifeStageKey());
  return { ...(saved || {}), stage, imageVariant: normalizeImageVariant(saved?.imageVariant || "default") };
}

function saveStageProfile(profile) {
  saveSelectedLifeStageProfile({
    ...(profile || {}),
    stage: normalizeLifeStageKey(profile?.stage),
    imageVariant: normalizeImageVariant(profile?.imageVariant || "default"),
    updatedAt: new Date().toISOString(),
  });
}

function readStageImages() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(STAGE_IMAGE_KEY) || "{}") || {}; } catch { return {}; }
}

function saveStageImages(images) {
  if (typeof window !== "undefined") localStorage.setItem(STAGE_IMAGE_KEY, JSON.stringify(images || {}));
}

function getQuestionKeys(stage, draft = {}) {
  const questions = getLifeStageQuestions(stage);
  return (questions.order || ["setup", "rhythm", "workload", "pressure", "coping", "goal"]).filter((key) => (getLifeStageOptions({ ...draft, stage }, key) || []).length > 0);
}

function buildStageDraft(stageName, previous = {}) {
  const stage = normalizeLifeStageKey(stageName);
  const next = { stage, imageVariant: normalizeImageVariant(previous.imageVariant || "default") };
  getQuestionKeys(stage, previous).forEach((key) => {
    const options = getLifeStageOptions({ ...previous, stage }, key) || [];
    next[key] = options.includes(previous[key]) ? previous[key] : options[0];
  });
  return next;
}

function displayOption(option) {
  return String(option || "");
}

function getStageDisplayLabel(stage, option) {
  const value = displayOption(option);
  const questions = getLifeStageQuestions(stage);
  return questions.displayLabels?.[value] || value;
}

function getAnswerContext(questionKey, value, draft = {}) {
  const questions = getLifeStageQuestions(draft.stage);
  const label = getStageDisplayLabel(draft.stage, value);
  const context = questions.getQuestionContext?.(questionKey, value, draft);
  if (context) return { title: context.title || label, summary: context.summary || context.body || getLifeStageStageContext(draft.stage) };
  return { title: label, summary: `Choosing “${label}” helps CLARA connect this answer with your ${draft.stage} money reality.` };
}

function TrendSnapshotCard({ item, onClick }) {
  return (
    <button type="button" onClick={onClick} className="h-full min-w-[116px] snap-start rounded-[16px] border border-white/[0.075] bg-[#071226]/66 p-3 text-left backdrop-blur-xl transition active:scale-[0.985] shadow-[0_0_22px_rgba(125,211,252,.10)]">
      <p className="line-clamp-1 text-[9px] font-black tracking-tight text-white/56">{item.label}</p>
      <p className="mt-1 text-[22px] font-black leading-none text-white">{item.value}%</p>
      <p className="mt-1 text-[9px] font-black text-cyan-100">{item.status || "Active"}</p>
      <svg viewBox="0 0 92 34" className="mt-2 h-7 w-full overflow-visible" aria-hidden="true"><path d="M2 28 C10 22 16 25 22 18 C28 10 33 16 39 9 C45 2 51 15 58 11 C66 7 70 17 76 12 C83 7 87 11 90 9" fill="none" stroke="rgba(125,211,252,.85)" strokeWidth="2.2" strokeLinecap="round" /><path d="M2 32 H90" stroke="rgba(255,255,255,.055)" strokeWidth="1" /></svg>
    </button>
  );
}

function DataDetailPanel({ trend, onClose }) {
  return (
    <div className="absolute inset-0 z-30 rounded-[28px] border border-white/[0.075] bg-[#050b1f]/92 p-4 shadow-[0_24px_80px_rgba(0,0,0,.42)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_14%_8%,rgba(45,212,191,.10),transparent_28%),radial-gradient(circle_at_86%_10%,rgba(91,63,209,.16),transparent_30%)]" />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">Data status</p><h4 className="mt-2 text-2xl font-black leading-tight text-white">{trend.label}</h4><p className="mt-1 text-xs font-semibold leading-5 text-white/48">{trend.note}</p></div>
        <button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-white/58 active:scale-95" aria-label="Close data details"><X className="h-4 w-4" /></button>
      </div>
      <div className="relative z-10 mt-5 rounded-[22px] border border-cyan-200/10 bg-cyan-300/8 p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Behavioral distribution share</p><p className="mt-1 text-4xl font-black leading-none text-white">{trend.value}%</p><p className="mt-1 text-xs font-black text-cyan-100">{trend.status}</p></div>
      <div className="relative z-10 mt-3 rounded-[22px] border border-white/[0.065] bg-white/[0.03] p-4"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Snapshot basis</p><p className="mt-2 text-sm font-semibold leading-6 text-white/54">{trend.insight || trend.action || "This reading comes from the universal life-stage snapshot system."}</p></div>
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
  return (
    <div className="absolute inset-0 z-30 flex min-h-0 flex-col rounded-[28px] border border-white/[0.075] bg-[#050b1f]/92 p-4 shadow-[0_24px_80px_rgba(0,0,0,.42)] backdrop-blur-2xl">
      <div className="relative z-10 flex shrink-0 items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">Stage image</p><h4 className="mt-2 text-xl font-black leading-tight text-white">Customize {stage}</h4><p className="mt-1 text-xs font-semibold leading-5 text-white/44">Use the default visual or upload your own image for this life stage.</p></div><button type="button" onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-white/58 active:scale-95" aria-label="Close image setup"><X className="h-4 w-4" /></button></div>
      <div className="relative z-10 mt-4 min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><div className="relative h-60 overflow-hidden rounded-[26px] border border-white/[0.075] bg-[#071226]/64">{preview ? <img src={preview} alt={`${stage} custom visual`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-center"><ImageIcon className="mx-auto h-9 w-9 text-white/30" /><p className="mt-2 text-xs font-black text-white/44">Default stage visual</p></div>}<div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(3,8,28,.72))]" /></div><div className="mt-4 grid gap-2"><label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_10px_32px_rgba(125,211,252,.16)] active:scale-95"><Upload className="h-4 w-4" /> Upload image<input type="file" accept="image/*" className="hidden" onChange={handleUpload} /></label><button type="button" onClick={() => setPreview("")} className="flex items-center justify-center gap-2 rounded-full border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-xs font-black text-white/54 active:scale-95"><RotateCcw className="h-4 w-4" /> Use default</button></div></div>
      <div className="relative z-10 mt-3 flex shrink-0 gap-2"><button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-xs font-black text-white/54 active:scale-95">Cancel</button><button type="button" onClick={() => { onApply(preview || ""); onClose(); }} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_10px_32px_rgba(125,211,252,.16)] active:scale-95"><Check className="h-4 w-4" /> Apply image</button></div>
    </div>
  );
}

function StageCard({ stage, active, onClick }) {
  return <button type="button" onClick={onClick} className={`relative min-h-[78px] overflow-hidden rounded-[24px] border px-3.5 py-3 text-left transition duration-200 active:scale-[0.985] ${active ? "border-cyan-200/55 bg-[linear-gradient(135deg,rgba(45,212,191,.18),rgba(59,130,246,.14)_45%,rgba(91,63,209,.18))] shadow-[0_0_36px_rgba(34,211,238,.22),0_18px_44px_rgba(2,8,23,.36),inset_0_1px_0_rgba(255,255,255,.10)]" : "border-white/[0.075] bg-[#071226]/54 shadow-[0_14px_34px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.035)]"}`}><div className="relative z-10 flex items-center gap-3.5"><span className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[18px] border backdrop-blur-xl ${active ? "border-cyan-100/28 bg-cyan-200/12 text-cyan-100" : "border-white/[0.075] bg-white/[0.035] text-white/46"}`}><Sparkles className="h-6 w-6" /></span><p className="min-w-0 flex-1 text-[15px] font-black leading-tight tracking-[-0.01em] text-white/90 drop-shadow-sm">{stage}</p><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${active ? "border-cyan-100/42 bg-cyan-200/16 text-cyan-50" : "border-white/[0.12] bg-white/[0.025] text-transparent"}`}>{active ? <Check className="h-5 w-5" /> : null}</span></div></button>;
}

function OptionGroup({ eyebrow, value, options, onSelect, displayValue = displayOption }) {
  return <section className="space-y-4 rounded-[26px] border border-white/[0.085] bg-[#071226]/64 p-5 shadow-[0_16px_38px_rgba(0,0,0,.20),inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-xl"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">{eyebrow}</p><div className="space-y-3">{options.map((option) => { const active = option === value; return <button key={option} type="button" onClick={() => onSelect(option)} className={`relative flex min-h-[66px] w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition active:scale-[0.985] ${active ? "border-cyan-200/38 bg-[linear-gradient(135deg,rgba(45,212,191,.16),rgba(59,130,246,.12)_48%,rgba(91,63,209,.16))] text-cyan-50" : "border-white/[0.075] bg-[#071226]/54 text-white/58"}`}><span className="text-[13px] font-black leading-tight">{displayValue(option)}</span><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${active ? "border-cyan-100/38 bg-cyan-200/14 text-cyan-50" : "border-white/[0.12] bg-white/[0.025] text-transparent"}`}>{active ? <Check className="h-4 w-4" /> : null}</span></button>; })}</div></section>;
}

function GenderConfirmationStep({ value, onSelect }) {
  const selected = normalizeImageVariant(value || "default");
  const options = [
    { value: "male", title: "Male" },
    { value: "female", title: "Female" },
    { value: "default", title: "Prefer not to say" },
  ];

  return (
    <section className="space-y-3.5 pb-4">
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`relative min-h-[78px] w-full overflow-hidden rounded-[24px] border px-4 py-4 text-left transition duration-200 active:scale-[0.985] ${active ? "border-cyan-200/60 bg-[linear-gradient(135deg,rgba(45,212,191,.20),rgba(59,130,246,.15)_45%,rgba(91,63,209,.20))] shadow-[0_0_42px_rgba(34,211,238,.24),0_18px_46px_rgba(2,8,23,.36),inset_0_1px_0_rgba(255,255,255,.12)]" : "border-white/[0.09] bg-[#071226]/58 shadow-[0_14px_34px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.035)]"}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(45,212,191,.10),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(91,63,209,.14),transparent_32%)]" />
            <div className="relative z-10 flex items-center gap-3.5">
              <span className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[18px] border backdrop-blur-xl ${active ? "border-cyan-100/30 bg-cyan-200/13 text-cyan-100" : "border-white/[0.085] bg-white/[0.04] text-white/48"}`}>
                <ImageIcon className="h-6 w-6" />
              </span>
              <p className="min-w-0 flex-1 text-[15px] font-black leading-tight tracking-[-0.01em] text-white/90 drop-shadow-sm">{option.title}</p>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${active ? "border-cyan-100/48 bg-cyan-200/18 text-cyan-50 shadow-[0_0_18px_rgba(125,211,252,.18)]" : "border-white/[0.14] bg-white/[0.03] text-transparent"}`}>
                {active ? <Check className="h-5 w-5" /> : null}
              </span>
            </div>
          </button>
        );
      })}
    </section>
  );
}

function GenderVariantToggle({ value, onChange }) {
  const selected = normalizeImageVariant(value || "default");

  const items = [
    { value: "male", label: "Use male life-stage image", icon: Mars },
    { value: "female", label: "Use female life-stage image", icon: Venus },
  ];

  return (
    <div className="flex h-9 items-center gap-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = selected === item.value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={`grid h-8 w-8 place-items-center rounded-full border backdrop-blur-xl transition active:scale-95 ${
              active
                ? "border-cyan-100/28 bg-cyan-200/14 text-cyan-50/80 shadow-[0_0_18px_rgba(125,211,252,.16)]"
                : "border-white/[0.075] bg-slate-950/24 text-white/68 hover:bg-white/[0.045] hover:text-white/82"
            }`}
            aria-label={item.label}
            title={item.label}
          >
            <Icon className="h-4.5 w-4.5 drop-shadow-[0_8px_18px_rgba(0,0,0,.55)]" />
          </button>
        );
      })}
    </div>
  );
}

function LifeStageSetupScreen({ profile, onClose, onSave }) {
  const [draft, setDraft] = useState(() => buildStageDraft(profile.stage || getSelectedLifeStageKey(), profile));
  const [step, setStep] = useState("visual");
  const stageList = getLifeStageSelectionList();
  const questionKeys = getQuestionKeys(draft.stage, draft);
  const stepOrder = ["visual", "stage", ...questionKeys];
  const stepIndex = Math.max(0, stepOrder.indexOf(step));
  const activeQuestionKey = step === "visual" || step === "stage" ? null : step;
  const progressPillIndex = Math.round((stepIndex / Math.max(1, stepOrder.length - 1)) * 4);
  const selectedValue = activeQuestionKey ? draft[activeQuestionKey] : null;
  const insight = activeQuestionKey ? getAnswerContext(activeQuestionKey, selectedValue, draft) : null;
  const stageHero = getLifeStageHero(draft.stage, draft.imageVariant || "default");
  const boardTitle = step === "visual" ? "Confirm your gender" : activeQuestionKey ? insight.title : stageHero.title;
  const boardSummary = step === "visual" ? "" : activeQuestionKey ? insight.summary : stageHero.contextText || getLifeStageStageContext(draft.stage);

  useEffect(() => { if (typeof document === "undefined") return undefined; const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = previousOverflow; }; }, []);

  const goBack = () => { if (stepIndex <= 0) onClose(); else setStep(stepOrder[stepIndex - 1]); };
  const goNext = () => {
    if (stepIndex < stepOrder.length - 1) { setStep(stepOrder[stepIndex + 1]); return; }
    const questions = getLifeStageQuestions(draft.stage);
    const completedDraft = questions.completeDraft?.(draft) || draft;
    const savedDraft = {
      ...completedDraft,
      stage: normalizeLifeStageKey(draft.stage),
      imageVariant: normalizeImageVariant(draft.imageVariant || completedDraft.imageVariant || "default"),
      updatedAt: new Date().toISOString(),
    };
    saveStageProfile(savedDraft);
    onSave(savedDraft);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 left-1/2 z-[9999] flex h-[100svh] w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden bg-[#020817] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] shadow-[0_24px_90px_rgba(0,0,0,.62),inset_0_0_0_1px_rgba(255,255,255,.04)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_2%,rgba(45,212,191,.18),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(124,58,237,.28),transparent_34%),linear-gradient(180deg,rgba(7,18,38,.88),rgba(2,8,23,.98))]" />
      {step === "visual" ? (
        <header className="relative z-10 shrink-0 overflow-hidden rounded-[28px] border border-cyan-200/18 bg-[#071226]/72 p-5 shadow-[0_22px_70px_rgba(0,0,0,.34),0_0_44px_rgba(34,211,238,.10),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(45,212,191,.16),transparent_34%),radial-gradient(circle_at_92%_4%,rgba(124,58,237,.22),transparent_34%)]" />
          <div className="relative z-10">
            <div className="h-2 w-full rounded-full border border-cyan-100/10 bg-[linear-gradient(90deg,rgba(45,212,191,.28),rgba(96,165,250,.22),rgba(124,58,237,.30))] shadow-[0_0_22px_rgba(34,211,238,.16)]" />
            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/56">
              Life stage setup
            </p>
            <h3 className="mt-2 text-[clamp(30px,8vw,40px)] font-black leading-[1.03] tracking-[-0.045em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,.35)]">
              Confirm your gender
            </h3>
            <p className="mt-3 max-w-[350px] text-[13px] font-semibold leading-6 text-white/62">
              Choose the visual style CLARA should use for your life-stage profile.
            </p>
          </div>
        </header>
      ) : (
        <header className="relative z-10 shrink-0 overflow-hidden rounded-[32px] border border-cyan-200/18 bg-[#071226]/68 p-5 shadow-[0_22px_70px_rgba(0,0,0,.34),0_0_44px_rgba(34,211,238,.10),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl">
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/72">CLARA context board</p><h3 className="mt-5 max-w-[330px] text-[clamp(30px,8vw,40px)] font-black leading-[1.03] tracking-[-0.045em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,.35)]">{boardTitle}</h3>{boardSummary ? <p className="mt-4 max-w-[350px] text-[13px] font-semibold leading-6 text-white/74">{boardSummary}</p> : null}</div>
            <button type="button" onClick={onClose} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/[0.12] bg-white/[0.055] text-white/82 shadow-[0_10px_28px_rgba(0,0,0,.20),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl active:scale-95" aria-label="Close life stage setup"><X className="h-6 w-6" /></button>
          </div>
          <div className="relative z-10 mt-6 flex justify-center gap-3">{Array.from({ length: 5 }).map((_, index) => <div key={index} className={`h-1.5 rounded-full transition-all ${index <= progressPillIndex ? "w-12 bg-cyan-200 shadow-[0_0_18px_rgba(125,211,252,.34)]" : "w-10 bg-white/[0.085]"}`} />)}</div>
        </header>
      )}
      <main className="relative z-10 mt-5 min-h-0 flex-1 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {step === "visual" ? <GenderConfirmationStep value={draft.imageVariant || "default"} onSelect={(value) => setDraft((current) => ({ ...current, imageVariant: normalizeImageVariant(value) }))} /> : null}
        {step === "stage" ? <div className="space-y-3.5 pb-4">{stageList.map((stage) => <StageCard key={stage.key} stage={stage.key} active={draft.stage === stage.key} onClick={() => setDraft((current) => buildStageDraft(stage.key, current))} />)}</div> : null}
        {activeQuestionKey ? <div className="space-y-3.5 pb-4"><OptionGroup eyebrow={QUESTION_META[activeQuestionKey] || "Choose one"} value={draft[activeQuestionKey]} options={getLifeStageOptions(draft, activeQuestionKey) || []} displayValue={(option) => getStageDisplayLabel(draft.stage, option)} onSelect={(value) => setDraft((current) => buildStageDraft(current.stage, { ...current, [activeQuestionKey]: value }))} /></div> : null}
      </main>
      <footer className="relative z-10 mt-4 flex shrink-0 gap-4"><button type="button" onClick={goBack} className="flex min-h-[58px] flex-1 items-center justify-center gap-2 rounded-[22px] border border-cyan-200/20 bg-[#061327]/78 px-5 py-4 text-sm font-black text-white/86 shadow-[0_16px_38px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl active:scale-95">{step === "visual" ? "Cancel" : <><ChevronLeft className="h-4 w-4" /> Back</>}</button><button type="button" onClick={goNext} className="flex min-h-[58px] flex-1 items-center justify-center gap-2 rounded-[22px] border border-white/20 bg-[linear-gradient(135deg,#67f8ff,#8bdcff_46%,#72a9ff)] px-5 py-4 text-sm font-black text-slate-950 shadow-[0_18px_42px_rgba(103,248,255,.24),0_0_34px_rgba(125,211,252,.22)] active:scale-95">{stepIndex === stepOrder.length - 1 ? <><Check className="h-4 w-4" /> Apply stage</> : "Continue"}</button></footer>
    </div>
  );
}

export default function FinancialClimateUniversalScreen() {
  const [showStageSetup, setShowStageSetup] = useState(false);
  const [showImageSetup, setShowImageSetup] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [showHeroActions, setShowHeroActions] = useState(false);
  const [stageProfile, setStageProfile] = useState(() => readStageProfile());
  const [stageImages, setStageImages] = useState(() => readStageImages());
  const hero = useMemo(
    () => getLifeStageHero(stageProfile.stage, stageProfile.imageVariant || "default"),
    [stageProfile.stage, stageProfile.imageVariant]
  );
  const supportCopy = useMemo(() => getLifeStageGuidance(stageProfile.stage, { profile: stageProfile, mode: "awareness" }), [stageProfile]);
  const snapshot = useMemo(() => getLifeStageSnapshot(stageProfile.stage, stageProfile), [stageProfile]);
  const customImage = stageImages[stageProfile.stage] || "";
  const hasExplicitGenderVariant = ["male", "female"].includes(normalizeImageVariant(stageProfile.imageVariant || "default"));
  const activeImage = hasExplicitGenderVariant ? hero.heroImage : customImage || hero.heroImage;
  const heroGlow = HERO_VISUALS[stageProfile.stage] || HERO_VISUALS["Young Professional"];
  const snapshotCards = snapshot.cards || [];

  useEffect(() => { saveStageProfile(stageProfile); }, [stageProfile]);
  useEffect(() => { saveStageImages(stageImages); }, [stageImages]);

  const handleGenderVariantChange = (variant) => {
    setStageProfile((current) => ({
      ...current,
      imageVariant: normalizeImageVariant(variant),
    }));
  };

  if (showStageSetup) return <LifeStageSetupScreen profile={stageProfile} onClose={() => setShowStageSetup(false)} onSave={setStageProfile} />;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] bg-[#020817] px-3 pb-3 pt-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,.035)]">
      <section className={`relative min-h-0 flex-[1.25] overflow-hidden rounded-b-[30px] bg-gradient-to-br ${heroGlow} px-5 pb-5 pt-5 shadow-[0_22px_80px_rgba(0,0,0,.22)]`}>
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-[linear-gradient(180deg,transparent,rgba(2,8,23,.96))]" />
        <div className="absolute inset-0 opacity-75 [background:linear-gradient(180deg,rgba(2,8,23,.18),rgba(2,8,23,.72)),radial-gradient(circle_at_78%_18%,rgba(96,165,250,.18),transparent_18%),linear-gradient(90deg,rgba(2,8,23,.98)_0%,rgba(2,8,23,.58)_54%,rgba(2,8,23,.14)_100%)]" />
        <div className="absolute bottom-0 right-0 h-full w-[56%] overflow-hidden">{activeImage ? <img src={activeImage} alt={`${hero.title} stage background`} className="h-full w-full object-cover opacity-78 saturate-[.9]" /> : <div className="absolute inset-x-2 bottom-0 h-[92%] rounded-t-[90px] bg-[linear-gradient(145deg,rgba(125,211,252,.42),rgba(30,64,175,.12))] opacity-90" />}<div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,23,.84),rgba(2,8,23,.08)_48%,rgba(2,8,23,.18))]" /></div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[linear-gradient(180deg,transparent,#020817)]" />
        <div className="absolute left-4 top-4 z-20">
          <button type="button" onClick={() => setShowHeroActions((current) => !current)} className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.085] bg-slate-950/24 text-white/64 shadow-[0_10px_28px_rgba(0,0,0,.22)] backdrop-blur-xl transition active:scale-95" aria-label="Open life stage actions"><MoreHorizontal className="h-4.5 w-4.5" /></button>
          {showHeroActions ? <div className="absolute left-0 top-11 w-36 overflow-hidden rounded-[18px] border border-white/[0.085] bg-[#071226]/82 p-1.5 shadow-[0_18px_54px_rgba(0,0,0,.38)] backdrop-blur-2xl"><button type="button" onClick={() => { setShowHeroActions(false); setShowStageSetup(true); }} className="w-full rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:bg-white/[0.055] active:scale-[0.99]">Set stage</button><button type="button" onClick={() => { setShowHeroActions(false); setShowImageSetup(true); }} className="w-full rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:bg-white/[0.055] active:scale-[0.99]">Image</button></div> : null}
          <div className="absolute left-12 top-0">
            <GenderVariantToggle
              value={stageProfile.imageVariant || "default"}
              onChange={handleGenderVariantChange}
            />
          </div>
        </div>
        <div className="relative z-10 flex h-full max-w-[59%] flex-col justify-center pt-3"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/52">{hero.label || "Your life stage"}</p><h2 className="mt-2 text-[clamp(22px,7vw,31px)] font-black leading-[1.02] text-white drop-shadow-lg">{hero.title} <span className="text-[13px] text-amber-100/78">♛</span></h2><p className="mt-2 line-clamp-4 text-[12px] font-semibold leading-5 text-white/62">{hero.shortDescription || hero.contextText}</p></div>
      </section>
      <section className="mt-3 min-h-0 flex-[0.58] overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#071226]/56 p-3 backdrop-blur-xl"><div className="flex h-full items-center justify-between gap-3"><div className="min-w-0 flex-1"><h3 className="text-[14px] font-black text-white">{supportCopy.title}</h3><p className="mt-1 line-clamp-3 text-[12px] font-semibold leading-5 text-white/56">{supportCopy.body}</p></div><div data-clara-heart-cta="true" className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-violet-200/14 bg-violet-300/8 shadow-[0_0_30px_rgba(167,139,250,.18)]"><Heart className="h-7 w-7 fill-violet-100 text-violet-100" /></div></div></section>
      <section className="mt-3 flex min-h-0 flex-[0.95] flex-col overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#071226]/50 p-3 backdrop-blur-xl"><div className="flex shrink-0 items-center justify-between gap-3"><div><h3 className="text-[14px] font-black text-white">Life Stage Trend Snapshot</h3><p className="mt-0.5 text-[10px] font-semibold text-white/36">{snapshot.subtitle || "Swipe the stage cards."}</p></div><Sparkles className="h-4 w-4 text-cyan-100/36" /></div><div className="mt-3 flex min-h-0 flex-1 snap-x gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{snapshotCards.map((item) => <TrendSnapshotCard key={item.key || item.label} item={item} onClick={() => setSelectedTrend(item)} />)}</div></section>
      {selectedTrend ? <DataDetailPanel trend={selectedTrend} onClose={() => setSelectedTrend(null)} /> : null}
      {showImageSetup ? <StageImagePanel stage={stageProfile.stage} image={customImage} onApply={(image) => setStageImages((current) => { const next = { ...current }; if (image) next[stageProfile.stage] = image; else delete next[stageProfile.stage]; return next; })} onClose={() => setShowImageSetup(false)} /> : null}
    </div>
  );
}
