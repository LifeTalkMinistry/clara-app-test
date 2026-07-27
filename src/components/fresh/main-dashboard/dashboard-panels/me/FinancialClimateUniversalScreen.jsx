import { useEffect, useMemo, useState } from "react";
import { Check, Heart, ImageIcon, MoreHorizontal, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getLifeStageHero } from "../../../../../life-stage-hero";
import { getLifeStageGuidance } from "../../../../../life-stage-guidance";
import { getLifeStageSnapshot } from "../../../../../life-stage-snapshot";
import {
  isLifeStageProfileConfigured,
  normalizeLifeStageImageVariant,
  readLifeStageProfile,
  saveLifeStageProfile,
} from "../../../../../life-stage-profile";

const STAGE_IMAGE_KEY = "clara_life_stage_images_v1";
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

function readStageImages() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STAGE_IMAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function saveStageImages(images) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STAGE_IMAGE_KEY, JSON.stringify(images || {}));
  }
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

function LifeStageSetupGate({ onSetup }) {
  return (
    <div
      data-clara-life-stage-setup-gate="true"
      className="relative isolate flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] bg-[#071226] px-4 pb-4 pt-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,.055)]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(45,212,191,.22),transparent_32%),radial-gradient(circle_at_86%_12%,rgba(59,130,246,.20),transparent_34%),linear-gradient(180deg,rgba(8,47,73,.38),rgba(2,8,23,.96))]" />
      <div data-clara-life-stage-setup-layout="true" className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-1 py-4">
        <section data-clara-life-stage-setup-card="true" className="w-full max-w-[332px] overflow-hidden rounded-[30px] border border-white/[0.10] bg-[linear-gradient(180deg,rgba(8,47,73,.96),rgba(15,23,42,.98)_56%,rgba(24,12,68,.96))] p-5 text-center shadow-[0_26px_84px_rgba(0,0,0,.36),0_0_54px_rgba(125,211,252,.14),inset_0_1px_0_rgba(255,255,255,.09)]">
          <div className="mx-auto inline-flex rounded-full border border-cyan-100/50 bg-cyan-50 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-950 shadow-[0_0_20px_rgba(207,250,254,.22)]">Personalization needed</div>
          <div className="mx-auto mt-5 grid h-16 w-16 place-items-center rounded-[22px] bg-cyan-50 text-cyan-900 shadow-[0_16px_36px_rgba(34,211,238,.20)]"><Sparkles className="h-7 w-7" /></div>
          <h2 className="mt-5 text-[28px] font-black leading-[1.02] tracking-[-0.04em] text-white">Personalize your Money Profile</h2>
          <p className="mt-4 text-[13px] font-semibold leading-6 text-white/66">Set your life stage so CLARA can understand your real responsibilities, pressure points, and money behavior.</p>
          <button type="button" onClick={onSetup} className="mt-6 flex min-h-[56px] w-full items-center justify-center rounded-[22px] border border-cyan-100/10 bg-[linear-gradient(135deg,#164e63,#2563eb)] px-5 py-4 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_18px_42px_rgba(37,99,235,.34),0_0_34px_rgba(14,116,144,.20)] active:scale-95">SET LIFE STAGE NOW</button>
          <p className="mt-4 text-[11px] font-semibold leading-5 text-white/50">This helps CLARA personalize your reminders, spending signals, and financial safety insights.</p>
        </section>
      </div>
    </div>
  );
}

export default function FinancialClimateUniversalScreen() {
  const navigate = useNavigate();
  const [showImageSetup, setShowImageSetup] = useState(false);
  const [selectedTrend, setSelectedTrend] = useState(null);
  const [showHeroActions, setShowHeroActions] = useState(false);
  const [stageProfile, setStageProfile] = useState(() => readLifeStageProfile());
  const [stageImages, setStageImages] = useState(() => readStageImages());
  const [lifeStageConfigured] = useState(() => isLifeStageProfileConfigured());
  const hero = useMemo(
    () => getLifeStageHero(stageProfile.stage, stageProfile.imageVariant || "default"),
    [stageProfile.stage, stageProfile.imageVariant]
  );
  const supportCopy = useMemo(
    () => getLifeStageGuidance(stageProfile.stage, { profile: stageProfile, mode: "awareness" }),
    [stageProfile]
  );
  const snapshot = useMemo(
    () => getLifeStageSnapshot(stageProfile.stage, stageProfile),
    [stageProfile]
  );
  const customImage = stageImages[stageProfile.stage] || "";
  const hasExplicitGenderVariant = ["male", "female"].includes(
    normalizeLifeStageImageVariant(stageProfile.imageVariant || "default")
  );
  const activeImage = hasExplicitGenderVariant ? hero.heroImage : customImage || hero.heroImage;
  const heroGlow = HERO_VISUALS[stageProfile.stage] || HERO_VISUALS["Young Professional"];
  const snapshotCards = snapshot.cards || [];

  useEffect(() => {
    if (lifeStageConfigured) saveLifeStageProfile(stageProfile);
  }, [lifeStageConfigured, stageProfile]);

  useEffect(() => {
    saveStageImages(stageImages);
  }, [stageImages]);

  const openLifeStageSetup = () => {
    setShowHeroActions(false);
    navigate("/life-stage/setup");
  };

  const handleGenderVariantChange = (variant) => {
    setStageProfile((current) => ({
      ...current,
      imageVariant: normalizeLifeStageImageVariant(variant),
    }));
  };

  if (!lifeStageConfigured) return <LifeStageSetupGate onSetup={openLifeStageSetup} />;

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] bg-[#020817] px-3 pb-3 pt-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,.035)]">
      <section className={`relative min-h-0 flex-[1.25] overflow-hidden rounded-b-[30px] bg-gradient-to-br ${heroGlow} px-5 pb-5 pt-5 shadow-[0_22px_80px_rgba(0,0,0,.22)]`}>
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-[linear-gradient(180deg,transparent,rgba(2,8,23,.96))]" />
        <div className="absolute inset-0 opacity-75 [background:linear-gradient(180deg,rgba(2,8,23,.18),rgba(2,8,23,.72)),radial-gradient(circle_at_78%_18%,rgba(96,165,250,.18),transparent_18%),linear-gradient(90deg,rgba(2,8,23,.98)_0%,rgba(2,8,23,.58)_54%,rgba(2,8,23,.14)_100%)]" />
        <div className="absolute bottom-0 right-0 h-full w-[56%] overflow-hidden">{activeImage ? <img src={activeImage} alt={`${hero.title} stage background`} className="h-full w-full object-cover opacity-78 saturate-[.9]" /> : <div className="absolute inset-x-2 bottom-0 h-[92%] rounded-t-[90px] bg-[linear-gradient(145deg,rgba(125,211,252,.42),rgba(30,64,175,.12))] opacity-90" />}<div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,23,.84),rgba(2,8,23,.08)_48%,rgba(2,8,23,.18))]" /></div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-[linear-gradient(180deg,transparent,#020817)]" />
        <div className="absolute left-4 top-4 z-20">
          <button type="button" onClick={() => setShowHeroActions((current) => !current)} className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.085] bg-slate-950/24 text-white/64 shadow-[0_10px_28px_rgba(0,0,0,.22)] backdrop-blur-xl transition active:scale-95" aria-label="Open life stage actions"><MoreHorizontal className="h-4.5 w-4.5" /></button>
          {showHeroActions ? (
            <div data-clara-life-stage-actions-menu="true" className="absolute left-0 top-11 z-[80] flex w-[168px] flex-col overflow-hidden rounded-[18px] border border-white/[0.085] bg-[#071226]/90 p-1.5 shadow-[0_18px_54px_rgba(0,0,0,.38)] backdrop-blur-2xl">
              <button type="button" onClick={openLifeStageSetup} className="flex w-full items-center justify-start rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:bg-white/[0.055] active:scale-[0.99]">Set stage</button>
              <button type="button" onClick={() => { setShowHeroActions(false); setShowImageSetup(true); }} className="flex w-full items-center justify-start rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:bg-white/[0.055] active:scale-[0.99]">Image</button>
              <div className="my-1 h-px w-full bg-white/[0.07]" />
              <button type="button" onClick={() => { setShowHeroActions(false); handleGenderVariantChange("male"); }} className={`flex w-full items-center justify-start gap-2 rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] transition hover:bg-white/[0.055] active:scale-[0.99] ${normalizeLifeStageImageVariant(stageProfile.imageVariant || "default") === "male" ? "text-cyan-100" : "text-white/72"}`}><span className="text-[14px] leading-none">♂</span><span>Male image</span></button>
              <button type="button" onClick={() => { setShowHeroActions(false); handleGenderVariantChange("female"); }} className={`flex w-full items-center justify-start gap-2 rounded-[14px] px-3 py-2.5 text-left text-[11px] font-black uppercase tracking-[0.12em] transition hover:bg-white/[0.055] active:scale-[0.99] ${normalizeLifeStageImageVariant(stageProfile.imageVariant || "default") === "female" ? "text-cyan-100" : "text-white/72"}`}><span className="text-[14px] leading-none">♀</span><span>Female image</span></button>
            </div>
          ) : null}
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
