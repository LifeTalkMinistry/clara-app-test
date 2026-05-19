import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Check,
  ChevronLeft,
  Database,
  GraduationCap,
  Heart,
  ImageIcon,
  Laptop,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Upload,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { DEFAULT_STAGE, getStageDefinition, LIFE_STAGE_KEY } from "./lifeStageIntelligenceData";
import { getLifeStageImage } from "../../../../../config/lifeStageImages";

const STAGE_IMAGE_KEY = "clara_life_stage_images_v1";

const STAGE_ORDER = [
  "Working Student",
  "Young Professional",
  "Living with Partner",
  "Family Household",
  "Single Parent",
  "Full-Time Earner",
  "Freelance Season",
  "Business Builder",
];

const PEOPLE_IN_STAGE_COPY = {
  "Working Student":
    "People in this stage are balancing classes, work hours, assignments, commute, and limited money while trying to build their future.",
  "Young Professional":
    "People in this stage are building independence, learning money rhythm, and adjusting to career pressure, lifestyle choices, and new responsibilities.",
  "Living with Partner":
    "People in this stage are learning shared routines, relationship expectations, future plans, and financial decisions that are no longer purely personal.",
  "Family Household":
    "People in this stage are shaped by home routines, shared expenses, family requests, and the pressure to contribute without losing personal stability.",
  "Single Parent":
    "People in this stage are protecting essentials, time, emotional energy, and child-centered stability while keeping room for emergencies.",
  "Full-Time Earner":
    "People in this stage usually have routine income, but stress recovery, cutoff cycles, and lifestyle creep can quietly affect decisions.",
  "Freelance Season":
    "People in this stage manage flexible work, irregular income, client timing, and the pressure to create stability without losing freedom.",
  "Business Builder":
    "People in this stage balance growth, reinvestment, operating needs, and personal money while making many high-pressure decisions.",
};

const QUESTION_META = {
  setup: { eyebrow: "Current setup" },
  rhythm: { eyebrow: "Money rhythm" },
  workload: { eyebrow: "Weekly load" },
  pressure: { eyebrow: "Pressure right now" },
  coping: { eyebrow: "Pressure response" },
  goal: { eyebrow: "Protection goal" },
};

const QUESTION_ORDER = ["setup", "rhythm", "workload", "pressure", "coping", "goal"];

const ANSWER_CONTEXT = {
  setup: {
    "Family-supported + working": {
      title: "Supported ambition",
      chip: "support system present",
      summary:
        "CLARA sees support in your environment, but also a stretched schedule. The pressure may show more through time, energy, and guilt around using money for yourself.",
    },
    "Self-supporting student": {
      title: "Self-support pressure",
      chip: "independent survival load",
      summary:
        "CLARA sees a higher independence load. School, daily needs, and income decisions may be connected because fewer expenses can be treated as optional.",
    },
    "Helping family while studying": {
      title: "Shared responsibility",
      chip: "family-linked responsibility",
      summary:
        "CLARA sees family responsibility inside your student season. This can create emotional pressure because personal progress and family needs may compete.",
    },
    "First job while studying": {
      title: "Adjustment season",
      chip: "work-school adjustment",
      summary:
        "CLARA sees a new work-school rhythm forming. This can create reward spending because earning money and exhaustion are happening at the same time.",
    },
    "Side hustle student": {
      title: "Flexible but uneven",
      chip: "flexible income behavior",
      summary:
        "CLARA sees flexible income mixed with school pressure. The opportunity is strong, but timing and consistency may be harder to predict.",
    },
  },
  rhythm: {
    "Allowance + work income": {
      title: "Mixed support rhythm",
      chip: "mixed income support",
      summary:
        "CLARA sees money coming from both support and effort. This can reduce survival pressure, but it may also make tracking harder when sources mix.",
    },
    "Fixed part-time pay": {
      title: "Predictable effort",
      chip: "predictable earning base",
      summary:
        "CLARA sees a clearer pay rhythm. This gives you a stronger base for planning, but your energy and school load still need protection.",
    },
    "Irregular side income": {
      title: "Unstable timing",
      chip: "income instability detected",
      summary:
        "CLARA sees income that can change from week to week. This increases the need for buffers because expenses may be fixed while earnings are not.",
    },
    "Seasonal/project income": {
      title: "Wave-based income",
      chip: "wave-based cash flow",
      summary:
        "CLARA sees money arriving in waves. This can feel good during strong weeks, but weak weeks need planned protection before they happen.",
    },
    "Mostly allowance, small extra work": {
      title: "Light earning layer",
      chip: "allowance-led stability",
      summary:
        "CLARA sees allowance as the main base with small earning support. The main pattern to watch is spending discipline before bigger income arrives.",
    },
  },
  workload: {
    Manageable: {
      title: "Still manageable",
      chip: "control still available",
      summary:
        "CLARA sees a season that still has room for control. This is a good point to build habits before pressure becomes heavier.",
    },
    "Tight but okay": {
      title: "Tight but moving",
      chip: "early strain forming",
      summary:
        "CLARA sees a schedule that is still functioning, but already demanding. Small leaks in money or rest may become noticeable faster.",
    },
    Heavy: {
      title: "Heavy overlap",
      chip: "high schedule overlap",
      summary:
        "CLARA sees work, school, and personal needs starting to overlap. This is where convenience spending and missed tracking can quietly increase.",
    },
    "Survival mode": {
      title: "Survival rhythm",
      chip: "recovery capacity low",
      summary:
        "CLARA sees limited recovery space. The priority is not perfection; it is protecting essentials, reducing pressure, and avoiding decisions made from exhaustion.",
    },
  },
  pressure: {
    "Tuition or school costs": {
      title: "Education pressure",
      chip: "education-cost pressure",
      summary:
        "CLARA sees school costs as the main decision weight. This means budgeting should protect deadlines, tuition needs, and school-related payments first.",
    },
    "Daily food and transport": {
      title: "Daily survival costs",
      chip: "daily-cost drain",
      summary:
        "CLARA sees repeated daily expenses shaping the month. Small costs may not look dangerous alone, but they can drain money through frequency.",
    },
    "Too much work and school load": {
      title: "Energy pressure",
      chip: "energy-trigger spending risk",
      summary:
        "CLARA sees time and energy as the main financial trigger. Spending may happen not from carelessness, but from needing relief or convenience.",
    },
    "Family contribution": {
      title: "Family-linked pressure",
      chip: "shared financial pressure",
      summary:
        "CLARA sees family support as part of your money decisions. The goal is to help wisely without letting guilt erase your own stability.",
    },
    "Debt or borrowed money": {
      title: "Debt pressure",
      chip: "debt-cycle risk",
      summary:
        "CLARA sees borrowed money or delayed payments affecting your choices. This makes avoiding new pressure and protecting repayment rhythm more important.",
    },
  },
  coping: {
    "I buy small rewards": {
      title: "Reward spending pattern",
      chip: "stress-reward spending",
      summary:
        "CLARA sees small purchases acting as emotional relief. The goal is not to shame rewards, but to stop stress from quietly turning into repeated leaks.",
    },
    "I avoid checking my money": {
      title: "Avoidance pattern",
      chip: "money-avoidance pattern",
      summary:
        "CLARA sees money checking as emotionally heavy. This can protect your feelings short-term, but it may increase surprise pressure later.",
    },
    "I borrow or delay payments": {
      title: "Delay-to-survive pattern",
      chip: "delayed-pressure cycle",
      summary:
        "CLARA sees survival decisions happening first, then repair later. The system should protect you from stacking pressure across weeks.",
    },
    "I cut back too much": {
      title: "Over-sacrifice pattern",
      chip: "over-sacrifice risk",
      summary:
        "CLARA sees you reducing needs too aggressively. Saving matters, but your food, rest, and basic energy should not be treated as optional.",
    },
    "I ask for help": {
      title: "Support-seeking pattern",
      chip: "support-seeking habit",
      summary:
        "CLARA sees an active support habit. This can lower risk when used wisely, especially if boundaries and repayment expectations are clear.",
    },
  },
  goal: {
    "Graduate safely": {
      title: "Protect graduation",
      chip: "graduation protection",
      summary:
        "CLARA will prioritize finishing school without letting money pressure, exhaustion, or avoidable debt damage your progress.",
    },
    "Avoid debt": {
      title: "Protect from debt",
      chip: "debt prevention priority",
      summary:
        "CLARA will prioritize preventing new borrowed-money pressure and helping you see risky spending before it becomes a cycle.",
    },
    "Build savings slowly": {
      title: "Protect small savings",
      chip: "slow-savings priority",
      summary:
        "CLARA will prioritize small, realistic saving moves that still respect your limited income and student workload.",
    },
    "Help family wisely": {
      title: "Protect wise support",
      chip: "wise family support",
      summary:
        "CLARA will prioritize helping family without losing your own school stability, essentials, and emergency protection.",
    },
    "Control stress spending": {
      title: "Protect from stress spending",
      chip: "stress-spending control",
      summary:
        "CLARA will prioritize replacing pressure-based spending with safer relief patterns that still feel human and realistic.",
    },
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

const HERO_VISUALS = {
  "Working Student": "from-sky-400/10 via-indigo-500/6 to-emerald-500/8",
  "Young Professional": "from-cyan-400/10 via-blue-500/6 to-violet-500/10",
  "Living with Partner": "from-fuchsia-400/9 via-cyan-500/6 to-violet-500/10",
  "Family Household": "from-cyan-400/9 via-emerald-500/5 to-violet-500/8",
  "Single Parent": "from-emerald-400/8 via-cyan-500/6 to-violet-500/9",
  "Full-Time Earner": "from-blue-400/9 via-cyan-500/5 to-violet-500/8",
  "Freelance Season": "from-cyan-400/8 via-blue-500/5 to-violet-500/10",
  "Business Builder": "from-amber-400/8 via-cyan-500/5 to-violet-500/8",
};

const STAGE_ICON_MAP = {
  "Working Student": GraduationCap,
  "Young Professional": Briefcase,
  "Living with Partner": Heart,
  "Family Household": Users,
  "Single Parent": User,
  "Full-Time Earner": Wallet,
  "Freelance Season": Laptop,
  "Business Builder": TrendingUp,
};

function normalizeStageName(stage) {
  if (stage === "Young Earner") return "Young Professional";
  if (STAGE_ORDER.includes(stage)) return stage;
  return DEFAULT_STAGE.stage || "Young Professional";
}

function getPeopleCopy(stage, definition) {
  return PEOPLE_IN_STAGE_COPY[stage] || definition?.identity?.overview || definition?.identity?.caption || "Choose the stage that best reflects your current financial environment.";
}

function readStageProfile() {
  if (typeof window === "undefined") return DEFAULT_STAGE;
  try {
    const saved = JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
    return { ...DEFAULT_STAGE, ...saved, stage: normalizeStageName(saved.stage || DEFAULT_STAGE.stage) };
  } catch {
    return DEFAULT_STAGE;
  }
}

function saveStageProfile(profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    LIFE_STAGE_KEY,
    JSON.stringify({ ...profile, stage: normalizeStageName(profile?.stage), updatedAt: new Date().toISOString() })
  );
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

function statusLabel(value) {
  if (value >= 75) return "High";
  if (value >= 60) return "Moderate";
  if (value >= 45) return "Watch";
  return "Low";
}

function getQuestionKeys(fields = {}) {
  return QUESTION_ORDER.filter((key) => Array.isArray(fields[key]) && fields[key].length > 0);
}

function buildStageDraft(stageName, previous = {}) {
  const nextFields = getStageDefinition(stageName).fields || {};
  const next = { stage: stageName };

  getQuestionKeys(nextFields).forEach((key) => {
    next[key] = nextFields[key]?.includes(previous[key]) ? previous[key] : nextFields[key]?.[0];
  });

  return next;
}

function getAnswerContext(questionKey, value) {
  const match = ANSWER_CONTEXT[questionKey]?.[value];
  if (match) return match;

  return {
    title: value || "Building context",
    chip: "context clue added",
    summary: "CLARA will use this answer together with the previous answers to shape the life-stage snapshot.",
  };
}

function getInsightChip(insight) {
  return String(insight?.chip || insight?.title || "").trim();
}

function getPriorInsight(questionKey, draft) {
  return draft?.[questionKey] ? getAnswerContext(questionKey, draft[questionKey]) : null;
}

function buildContextualSummary(activeQuestionKey, currentInsight, draft) {
  const setup = getPriorInsight("setup", draft);
  const rhythm = getPriorInsight("rhythm", draft);
  const workload = getPriorInsight("workload", draft);
  const pressure = getPriorInsight("pressure", draft);
  const coping = getPriorInsight("coping", draft);

  const setupChip = getInsightChip(setup);
  const rhythmChip = getInsightChip(rhythm);
  const workloadChip = getInsightChip(workload);
  const pressureChip = getInsightChip(pressure);
  const copingChip = getInsightChip(coping);

  if (activeQuestionKey === "setup") {
    return `${currentInsight.summary} This becomes the starting environment CLARA will use before reading your income rhythm, weekly load, pressure, and spending response.`;
  }

  if (activeQuestionKey === "rhythm") {
    return `${currentInsight.summary} Because your setup already suggests ${setupChip}, this rhythm tells CLARA whether your support system is stable, stretched, or vulnerable to timing gaps.`;
  }

  if (activeQuestionKey === "workload") {
    return `${currentInsight.summary} With ${setupChip} and ${rhythmChip} already in the profile, CLARA now treats your energy level as part of the money pattern, not a separate issue.`;
  }

  if (activeQuestionKey === "pressure") {
    return `${currentInsight.summary} Since your profile already shows ${setupChip}, ${rhythmChip}, and ${workloadChip}, this pressure becomes the first area CLARA should protect in your budget.`;
  }

  if (activeQuestionKey === "coping") {
    return `${currentInsight.summary} Connected with ${workloadChip} and ${pressureChip}, CLARA can now tell whether spending is a pressure response instead of just a normal expense choice.`;
  }

  if (activeQuestionKey === "goal") {
    return `${currentInsight.summary} Based on ${setupChip}, ${rhythmChip}, ${workloadChip}, ${pressureChip}, and ${copingChip}, CLARA now has enough context to turn this into a protection plan instead of a generic student profile.`;
  }

  return currentInsight.summary;
}

function getBoardContext({ step, activeQuestionKey, draft, peopleInStage }) {
  if (step === "stage") {
    return {
      title: draft.stage,
      summary: peopleInStage,
    };
  }

  const selectedValue = draft[activeQuestionKey];
  const currentInsight = getAnswerContext(activeQuestionKey, selectedValue);

  return {
    title: currentInsight.title,
    summary: buildContextualSummary(activeQuestionKey, currentInsight, draft),
  };
}

function MiniGraph({ category }) {
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
      <MiniGraph category={item.category} />
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
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-white/58 active:scale-95"
          aria-label="Close data details"
        >
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
          This is currently a life-stage intelligence placeholder. Later this can show Philippine survey data, admin-managed sources, and trend update status.
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
          <p className="mt-1 text-xs font-semibold leading-5 text-white/44">Use the default visual or upload your own image for this life stage.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/[0.075] bg-white/[0.04] text-white/58 active:scale-95"
          aria-label="Close image setup"
        >
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
              <p className="mt-2 text-xs font-black text-white/44">Default stage visual</p>
            </div>
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(3,8,28,.72))]" />
        </div>
        <div className="mt-4 grid gap-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_10px_32px_rgba(125,211,252,.16)] active:scale-95">
            <Upload className="h-4 w-4" /> Upload image
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
          <button
            type="button"
            onClick={() => setPreview("")}
            className="flex items-center justify-center gap-2 rounded-full border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-xs font-black text-white/54 active:scale-95"
          >
            <RotateCcw className="h-4 w-4" /> Use default
          </button>
        </div>
      </div>
      <div className="relative z-10 mt-3 flex shrink-0 gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-full border border-white/[0.075] bg-white/[0.035] px-4 py-3 text-xs font-black text-white/54 active:scale-95">
          Cancel
        </button>
        <button type="button" onClick={save} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-cyan-200 px-4 py-3 text-xs font-black text-slate-950 shadow-[0_10px_32px_rgba(125,211,252,.16)] active:scale-95">
          <Check className="h-4 w-4" /> Apply image
        </button>
      </div>
    </div>
  );
}

function StageCard({ stage, active, onClick }) {
  const Icon = STAGE_ICON_MAP[stage] || Sparkles;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-[78px] overflow-hidden rounded-[24px] border px-3.5 py-3 text-left transition duration-200 active:scale-[0.985] ${
        active
          ? "border-cyan-200/55 bg-[linear-gradient(135deg,rgba(45,212,191,.18),rgba(59,130,246,.14)_45%,rgba(91,63,209,.18))] shadow-[0_0_36px_rgba(34,211,238,.22),0_18px_44px_rgba(2,8,23,.36),inset_0_1px_0_rgba(255,255,255,.10)]"
          : "border-white/[0.075] bg-[#071226]/54 shadow-[0_14px_34px_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.035)]"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(45,212,191,.10),transparent_36%),radial-gradient(circle_at_92%_20%,rgba(91,63,209,.12),transparent_36%)]" />
      {active ? (
        <div className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-cyan-200/18" />
      ) : null}
      <div className="relative z-10 flex items-center gap-3.5">
        <span
          className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-[18px] border backdrop-blur-xl ${
            active
              ? "border-cyan-100/28 bg-cyan-200/12 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,.18),inset_0_1px_0_rgba(255,255,255,.10)]"
              : "border-white/[0.075] bg-white/[0.035] text-white/46 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]"
          }`}
        >
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-black leading-tight tracking-[-0.01em] text-white/90 drop-shadow-sm">{stage}</p>
        <span
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${
            active
              ? "border-cyan-100/42 bg-cyan-200/16 text-cyan-50 shadow-[0_0_26px_rgba(34,211,238,.28)]"
              : "border-white/[0.12] bg-white/[0.025] text-transparent"
          }`}
        >
          {active ? <Check className="h-5 w-5" strokeWidth={2.2} /> : null}
        </span>
      </div>
    </button>
  );
}

function OptionGroup({ eyebrow, value, options, onSelect }) {
  return (
    <section className="space-y-4 rounded-[26px] border border-white/[0.085] bg-[#071226]/64 p-5 shadow-[0_16px_38px_rgba(0,0,0,.20),inset_0_1px_0_rgba(255,255,255,.04)] backdrop-blur-xl">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/42">{eyebrow}</p>
      <div className="space-y-3">
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onSelect(option)}
              className={`relative flex min-h-[66px] w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-left transition active:scale-[0.985] ${
                active
                  ? "border-cyan-200/38 bg-[linear-gradient(135deg,rgba(45,212,191,.16),rgba(59,130,246,.12)_48%,rgba(91,63,209,.16))] text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,.16),inset_0_1px_0_rgba(255,255,255,.08)]"
                  : "border-white/[0.075] bg-[#071226]/54 text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,.03)]"
              }`}
            >
              <span className="text-[13px] font-black leading-tight">{option}</span>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                  active ? "border-cyan-100/38 bg-cyan-200/14 text-cyan-50" : "border-white/[0.12] bg-white/[0.025] text-transparent"
                }`}
              >
                {active ? <Check className="h-4 w-4" strokeWidth={2.2} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LifeStageSetupScreen({ profile, onClose, onSave }) {
  const [draft, setDraft] = useState(() => buildStageDraft(profile.stage || DEFAULT_STAGE.stage, profile));
  const [step, setStep] = useState("stage");
  const definition = getStageDefinition(draft.stage);
  const fields = definition.fields || {};
  const questionKeys = getQuestionKeys(fields);
  const stepOrder = ["stage", ...questionKeys];
  const stepIndex = Math.max(0, stepOrder.indexOf(step));
  const activeQuestionKey = step === "stage" ? null : step;
  const activeMeta = activeQuestionKey ? QUESTION_META[activeQuestionKey] || QUESTION_META.setup : null;
  const progressPillIndex = Math.round((stepIndex / Math.max(1, stepOrder.length - 1)) * 4);
  const peopleInStage = getPeopleCopy(draft.stage, definition);
  const boardContext = getBoardContext({ step, activeQuestionKey, draft, peopleInStage });

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const selectStage = (stageName) => {
    setDraft((current) => buildStageDraft(stageName, current));
  };

  const goBack = () => {
    if (stepIndex <= 0) {
      onClose();
      return;
    }
    setStep(stepOrder[stepIndex - 1]);
  };

  const goNext = () => {
    if (stepIndex < stepOrder.length - 1) {
      setStep(stepOrder[stepIndex + 1]);
      return;
    }
    const savedDraft = { ...draft, stage: normalizeStageName(draft.stage), updatedAt: new Date().toISOString() };
    saveStageProfile(savedDraft);
    onSave(savedDraft);
    onClose();
  };

  return (
    <div className="fixed inset-y-0 left-1/2 z-[9999] flex h-[100svh] w-full max-w-[430px] -translate-x-1/2 flex-col overflow-hidden bg-[#020817] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] shadow-[0_24px_90px_rgba(0,0,0,.62),inset_0_0_0_1px_rgba(255,255,255,.04)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_2%,rgba(45,212,191,.18),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(124,58,237,.28),transparent_34%),radial-gradient(circle_at_45%_100%,rgba(14,165,233,.10),transparent_30%),linear-gradient(180deg,rgba(7,18,38,.88),rgba(2,8,23,.98))]" />

      <header className="relative z-10 shrink-0 overflow-hidden rounded-[32px] border border-cyan-200/18 bg-[#071226]/68 p-5 shadow-[0_22px_70px_rgba(0,0,0,.34),0_0_44px_rgba(34,211,238,.10),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-56 rounded-full bg-cyan-300/16 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-24 h-56 w-64 rounded-full bg-violet-500/24 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_8%,rgba(255,255,255,.10),transparent_26%),radial-gradient(circle_at_20%_16%,rgba(125,211,252,.10),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_18%_22%,rgba(255,255,255,.34)_0_1px,transparent_1.5px),radial-gradient(circle_at_82%_36%,rgba(255,255,255,.28)_0_1px,transparent_1.5px),radial-gradient(circle_at_72%_72%,rgba(255,255,255,.22)_0_1px,transparent_1.5px)]" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/72">CLARA context board</p>
            <h3 className="mt-5 max-w-[330px] text-[clamp(30px,8vw,40px)] font-black leading-[1.03] tracking-[-0.045em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,.35)]">{boardContext.title}</h3>
            <p className="mt-4 max-w-[350px] text-[13px] font-semibold leading-6 text-white/74">{boardContext.summary}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/[0.12] bg-white/[0.055] text-white/82 shadow-[0_10px_28px_rgba(0,0,0,.20),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl active:scale-95"
            aria-label="Close life stage setup"
          >
            <X className="h-6 w-6" strokeWidth={1.8} />
          </button>
        </div>

        <div className="relative z-10 mt-6 flex justify-center gap-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index <= progressPillIndex
                  ? "w-12 bg-cyan-200 shadow-[0_0_18px_rgba(125,211,252,.34)]"
                  : "w-10 bg-white/[0.085]"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="relative z-10 mt-5 min-h-0 flex-1 overflow-y-auto pr-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {step === "stage" ? (
          <div className="space-y-3.5 pb-4">
            {STAGE_ORDER.map((stage) => (
              <StageCard key={stage} stage={stage} active={draft.stage === stage} onClick={() => selectStage(stage)} />
            ))}
          </div>
        ) : null}

        {activeQuestionKey ? (
          <div className="space-y-3.5 pb-4">
            <OptionGroup
              eyebrow={activeMeta?.eyebrow || "Choose one"}
              value={draft[activeQuestionKey]}
              options={fields[activeQuestionKey] || []}
              onSelect={(value) => setDraft((current) => ({ ...current, [activeQuestionKey]: value }))}
            />
          </div>
        ) : null}
      </main>

      <footer className="relative z-10 mt-4 flex shrink-0 gap-4">
        <button type="button" onClick={goBack} className="flex min-h-[58px] flex-1 items-center justify-center gap-2 rounded-[22px] border border-cyan-200/20 bg-[#061327]/78 px-5 py-4 text-sm font-black text-white/86 shadow-[0_16px_38px_rgba(0,0,0,.28),inset_0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl active:scale-95">
          {step === "stage" ? "Cancel" : <><ChevronLeft className="h-4 w-4" /> Back</>}
        </button>
        <button type="button" onClick={goNext} className="flex min-h-[58px] flex-1 items-center justify-center gap-2 rounded-[22px] border border-white/20 bg-[linear-gradient(135deg,#67f8ff,#8bdcff_46%,#72a9ff)] px-5 py-4 text-sm font-black text-slate-950 shadow-[0_18px_42px_rgba(103,248,255,.24),0_0_34px_rgba(125,211,252,.22)] active:scale-95">
          {stepIndex === stepOrder.length - 1 ? <><Check className="h-4 w-4" /> Apply stage</> : "Continue"}
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
  const customImage = stageImages[stageProfile.stage] || "";
  const defaultImage = getLifeStageImage(stageProfile.stage, "default");
  const activeImage = customImage || defaultImage;
  const heroGlow = HERO_VISUALS[stageProfile.stage] || HERO_VISUALS["Young Professional"];

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
      <section className={`relative min-h-0 flex-[1.25] overflow-hidden rounded-b-[30px] bg-gradient-to-br ${heroGlow} px-5 pb-5 pt-5 shadow-[0_22px_80px_rgba(0,0,0,.22)]`}>
        <div className="absolute inset-x-0 bottom-0 h-[62%] bg-[linear-gradient(180deg,transparent,rgba(2,8,23,.96))]" />
        <div className="absolute inset-0 opacity-75 [background:linear-gradient(180deg,rgba(2,8,23,.18),rgba(2,8,23,.72)),radial-gradient(circle_at_78%_18%,rgba(96,165,250,.18),transparent_18%),linear-gradient(90deg,rgba(2,8,23,.98)_0%,rgba(2,8,23,.58)_54%,rgba(2,8,23,.14)_100%)]" />
        <div className="absolute bottom-0 right-0 h-full w-[56%] overflow-hidden">
          {activeImage ? (
            <img src={activeImage} alt={`${stageProfile.stage} stage background`} className="h-full w-full object-cover opacity-78 saturate-[.9]" />
          ) : (
            <div className="absolute inset-x-2 bottom-0 h-[92%] rounded-t-[90px] bg-[linear-gradient(145deg,rgba(125,211,252,.42),rgba(30,64,175,.12))] opacity-90" />
          )}
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
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-violet-200/14 bg-violet-300/8 shadow-[0_0_30px_rgba(167,139,250,.18)]">
            <Heart className="h-7 w-7 fill-violet-100 text-violet-100" />
          </div>
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
        <div className="mt-3 flex min-h-0 flex-1 snap-x gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {definition.indicators.map((item) => (
            <TrendSnapshotCard key={item.label} item={item} onClick={() => setSelectedTrend(item)} />
          ))}
        </div>
      </section>

      {selectedTrend ? <DataDetailPanel trend={selectedTrend} onClose={() => setSelectedTrend(null)} /> : null}
      {showImageSetup ? <StageImagePanel stage={stageProfile.stage} image={customImage} onApply={applyStageImage} onClose={() => setShowImageSetup(false)} /> : null}
    </div>
  );
}
