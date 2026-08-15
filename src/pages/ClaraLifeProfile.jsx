import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Info,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import useUserRole from "@/hooks/useUserRole";
import useClaraBuyCheckLifeContext from "@/components/fresh/main-dashboard/assistant/useClaraBuyCheckLifeContext";
import {
  CLARA_LIFE_PROFILE_FIELDS,
  canUseClaraLifeProfileField,
  getClaraLifeContextAccess,
  getClaraLifeProfileFilledFields,
} from "@/lib/clara-life-context";

const SECTION_ORDER = ["Basics", "Work & Family", "Plans", "Deeper Context"];

const SECTION_META = {
  Basics: {
    index: "01",
    nav: "Basics",
    title: "Basics",
    description: "The foundation of who you are and how you live.",
  },
  "Work & Family": {
    index: "02",
    nav: "Work & Family",
    title: "Work & responsibility",
    description: "The people, work, and responsibilities your money supports.",
  },
  Plans: {
    index: "03",
    nav: "Plans",
    title: "Plans & direction",
    description: "Where you are heading and what you are preparing for.",
  },
  "Deeper Context": {
    index: "04",
    nav: "Deeper",
    title: "Life context",
    description: "The deeper realities that can shape your money decisions.",
  },
};

function accessLabel(access) {
  if (access === "champion") return "Champion";
  if (access === "builder") return "Builder";
  return "Core";
}

function requiredTierLabel(access) {
  if (access === "champion") return "Champion";
  if (access === "builder") return "Builder";
  return "Core";
}

function sectionTone(name) {
  if (name === "Work & Family") {
    return {
      dot: "bg-[#ffd42f]",
      active: "border-[#6d5a16] bg-[#211c0d] text-[#fff3ad]",
    };
  }
  if (name === "Plans") {
    return {
      dot: "bg-[#ff4d55]",
      active: "border-[#6a2830] bg-[#241017] text-[#ffd1d4]",
    };
  }
  if (name === "Deeper Context") {
    return {
      dot: "bg-[#d6b86a]",
      active: "border-[#385174] bg-[#0b1b32] text-[#e8eef8]",
    };
  }
  return {
    dot: "bg-[#4d8cff]",
    active: "border-[#28589b] bg-[#0a2448] text-[#e1edff]",
  };
}

function FieldControl({ field, value, onChange }) {
  const commonClass = "mt-2.5 w-full rounded-[14px] border border-[#1c3a60] bg-[#061329] px-3.5 py-3 text-[13px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] outline-none caret-[#4d8cff] placeholder:text-slate-600 transition focus:border-[#3e75ba] focus:bg-[#071831] focus:shadow-[0_0_0_3px_rgba(77,140,255,0.09)]";

  if (field.input === "select") {
    return (
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={`${commonClass} appearance-none [color-scheme:dark]`}
      >
        <option value="">Not set</option>
        {(field.options || []).map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (field.input === "textarea") {
    return (
      <textarea
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder || "Tell CLARA in your own words"}
        maxLength={320}
        rows={4}
        className={`${commonClass} min-h-[104px] resize-none leading-5`}
      />
    );
  }

  return (
    <input
      value={value || ""}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder || "Not set"}
      type={field.input === "number" ? "number" : "text"}
      inputMode={field.input === "number" ? "numeric" : "text"}
      min={field.input === "number" ? "0" : undefined}
      max={field.key === "age" ? "120" : undefined}
      className={commonClass}
    />
  );
}

function ProfileField({ field, profile, supportTier, updateField, completed, tone }) {
  const unlocked = canUseClaraLifeProfileField(field, supportTier);
  const value = profile?.[field.key] ?? "";

  if (!unlocked) {
    return (
      <div className="border-b border-white/[0.06] px-1 py-4 last:border-b-0">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-black text-white/55">{field.label}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-600">
              {requiredTierLabel(field.access)} life-context field
            </p>
          </div>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#4b4018] bg-[#1b180c]">
            <LockKeyhole className="h-3.5 w-3.5 text-[#ffd42f]/65" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <label className="block border-b border-white/[0.06] px-1 py-4 last:border-b-0">
      <span className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5 text-[13px] font-black text-white">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
          <span className="truncate">{field.label}</span>
        </span>
        {completed ? (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#665515] bg-[#231f0d]">
            <Check className="h-3 w-3 text-[#ffd42f]" strokeWidth={3} />
          </span>
        ) : null}
      </span>
      <FieldControl
        field={field}
        value={value}
        onChange={(nextValue) => updateField(field.key, nextValue)}
      />
    </label>
  );
}

export default function ClaraLifeProfile() {
  const navigate = useNavigate();
  const { user } = useUserRole();
  const lifeContext = useClaraBuyCheckLifeContext(user);
  const access = getClaraLifeContextAccess(lifeContext.supportTier);
  const [section, setSection] = useState("Basics");
  const [infoOpen, setInfoOpen] = useState(false);

  const filledFields = useMemo(
    () => new Set(getClaraLifeProfileFilledFields(lifeContext.profile)),
    [lifeContext.profile]
  );

  const accessibleFields = useMemo(
    () => CLARA_LIFE_PROFILE_FIELDS.filter((field) =>
      canUseClaraLifeProfileField(field, lifeContext.supportTier)
    ),
    [lifeContext.supportTier]
  );

  const accessibleFilledCount = useMemo(
    () => accessibleFields.filter((field) => filledFields.has(field.key)).length,
    [accessibleFields, filledFields]
  );

  const sections = useMemo(
    () => SECTION_ORDER.map((name) => ({
      name,
      fields: CLARA_LIFE_PROFILE_FIELDS.filter((field) => field.section === name),
    })),
    []
  );

  const activeSection = sections.find((item) => item.name === section) || sections[0];
  const activeAccessibleFields = activeSection.fields.filter((field) =>
    canUseClaraLifeProfileField(field, lifeContext.supportTier)
  );
  const activeFilled = activeAccessibleFields.filter((field) => filledFields.has(field.key)).length;
  const activeTone = sectionTone(activeSection.name);
  const activeMeta = SECTION_META[activeSection.name];
  const progressPercent = accessibleFields.length
    ? Math.round((accessibleFilledCount / accessibleFields.length) * 100)
    : 0;

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/community?view=home", { replace: true });
  };

  return (
    <main
      data-clara-life-profile-page="true"
      className="min-h-[100dvh] bg-[radial-gradient(circle_at_12%_0%,rgba(36,104,218,0.12),transparent_30%),linear-gradient(165deg,#020d1d_0%,#040915_52%,#080b14_100%)] text-white"
    >
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,#3478ff_0%,#3478ff_42%,#ffd42f_42%,#ffd42f_56%,#ff4651_56%,#ff4651_100%)]" />

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
        <header className="relative overflow-hidden rounded-[28px] border border-[#193d69] bg-[linear-gradient(145deg,rgba(8,28,57,0.98),rgba(4,14,31,0.98))] px-4 py-4 shadow-[0_24px_70px_rgba(0,0,0,0.30)] sm:px-5 sm:py-5">
          <div className="pointer-events-none absolute -left-16 -top-24 h-52 w-52 rounded-full bg-[#176dff]/[0.11] blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -top-28 h-48 w-48 rounded-full bg-[#ff4651]/[0.055] blur-3xl" />
          <div className="pointer-events-none absolute -right-14 top-6 h-28 w-28 rounded-full border border-white/[0.025]" />
          <div className="pointer-events-none absolute -right-4 top-16 h-16 w-16 rounded-full border border-[#ffd42f]/[0.025]" />

          <div className="relative flex items-start gap-3">
            <button
              type="button"
              onClick={goBack}
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#28578c] bg-[#09203f]/85 text-blue-100 transition hover:border-[#4d8cff] active:scale-95"
              aria-label="Back from CLARA Life Profile"
            >
              <ArrowLeft className="h-[17px] w-[17px]" />
            </button>

            <div className="min-w-0 flex-1">
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-[#75a8ff]/70">
                CLARA PERSONAL CONTEXT
              </p>
              <h1 className="mt-1 text-[18px] font-black uppercase tracking-[0.11em] text-white">
                Life Profile
              </h1>
              <p className="mt-1 max-w-[260px] text-[10px] font-semibold leading-4 text-slate-400">
                Help CLARA understand the life behind your money.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-full border border-[#244a76] bg-[#07182f]/90 text-blue-100/80 transition hover:border-[#4d8cff] hover:text-white active:scale-95"
                aria-label="About Life Profile"
                aria-haspopup="dialog"
                aria-expanded={infoOpen}
              >
                <Info className="h-4 w-4" />
              </button>

              <span className="rounded-full border border-[#665615] bg-[#211d0c]/90 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] text-[#fff0a1] shadow-[0_0_18px_rgba(255,212,47,0.05)]">
                {accessLabel(access)}
              </span>
            </div>
          </div>

          <div className="relative mt-5 border-t border-white/[0.055] pt-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.20em] text-slate-500">
                  Your CLARA context
                </p>
                <p className="mt-1 text-[10px] font-bold text-slate-300">
                  {accessibleFilledCount} of {accessibleFields.length} · Getting to know you
                </p>
              </div>
              <span className="text-[12px] font-black text-white">{progressPercent}%</span>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,#3478ff_0%,#3478ff_58%,#ffd42f_80%,#ff4651_100%)] shadow-[0_0_14px_rgba(52,120,255,0.24)] transition-[width] duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </header>

        <nav
          className="sticky top-0 z-20 mt-3 bg-[#040914]/92 py-2.5 backdrop-blur-xl"
          aria-label="Life Profile sections"
        >
          <div className="grid grid-cols-4 gap-1.5 rounded-[18px] border border-white/[0.045] bg-[#07101f]/85 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.16)]">
            {sections.map((item) => {
              const active = item.name === activeSection.name;
              const tone = sectionTone(item.name);
              const meta = SECTION_META[item.name];
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSection(item.name)}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-[13px] border px-1.5 py-2 text-[8px] font-black transition ${active
                    ? tone.active
                    : "border-transparent bg-transparent text-slate-500 hover:bg-white/[0.025] hover:text-slate-300"}`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                    <span className="text-[7px] tracking-[0.10em] opacity-55">{meta.index}</span>
                  </span>
                  <span className="w-full truncate text-center">{meta.nav}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <section className="mt-2 overflow-hidden rounded-[26px] border border-[#132d4d] bg-[linear-gradient(180deg,#061326_0%,#050f20_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.24)]">
          <div className="relative border-b border-white/[0.06] px-4 py-5 sm:px-5">
            <div className="pointer-events-none absolute left-0 top-0 h-full w-[2px] bg-[linear-gradient(180deg,#3478ff_0%,#ffd42f_62%,#ff4651_100%)] opacity-75" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black tracking-[0.18em] text-slate-600">
                    {activeMeta.index}
                  </span>
                  <span className={`h-1.5 w-1.5 rounded-full ${activeTone.dot}`} />
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {activeSection.name}
                  </p>
                </div>
                <h2 className="mt-2 text-[17px] font-black text-white">{activeMeta.title}</h2>
                <p className="mt-1 max-w-lg text-[10px] font-semibold leading-4 text-slate-500">
                  {activeMeta.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.025] px-2.5 py-1.5 text-[9px] font-black text-slate-400">
                {activeFilled}/{activeAccessibleFields.length}
              </span>
            </div>
          </div>

          <div className="px-4 sm:px-5">
            {activeSection.fields.map((field) => (
              <ProfileField
                key={field.key}
                field={field}
                profile={lifeContext.profile}
                supportTier={lifeContext.supportTier}
                updateField={lifeContext.updateField}
                completed={filledFields.has(field.key)}
                tone={activeTone}
              />
            ))}
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-600">
          <Check className="h-3.5 w-3.5 text-[#ffd42f]" /> Changes save automatically
        </div>
      </div>

      {infoOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-[3px] sm:items-center sm:p-5"
          role="presentation"
          onClick={() => setInfoOpen(false)}
        >
          <section
            data-clara-life-profile-info-sheet="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clara-life-profile-info-title"
            className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#1d4776] bg-[linear-gradient(160deg,#07172f_0%,#040d1c_100%)] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.60)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.20em] text-[#75a8ff]/70">CLARA LIFE PROFILE</p>
                <h2 id="clara-life-profile-info-title" className="mt-1.5 text-[18px] font-black text-white">
                  About Life Profile
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#244a76] bg-[#09203f] text-blue-100 transition hover:border-[#4d8cff] active:scale-95"
                aria-label="Close Life Profile information"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-[11px] font-semibold leading-[1.65] text-slate-300">
              <div>
                <p className="font-black text-white">What it does</p>
                <p className="mt-1 text-slate-400">
                  Life Profile gives CLARA optional personal context about you so Buy Check can understand the situation behind your financial numbers.
                </p>
              </div>

              <div>
                <p className="font-black text-white">How CLARA uses it</p>
                <p className="mt-1 text-slate-400">
                  Only relevant profile details are considered for a spending decision. Verified wallet, budget, income, savings, debt, and obligations remain the primary financial authority.
                </p>
              </div>

              <div>
                <p className="font-black text-white">Your control</p>
                <p className="mt-1 text-slate-400">
                  Fill only what you want. Any optional field can stay blank. Builder and Champion tiers unlock additional context fields.
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-[17px] border border-[#173b68] bg-[#07162c] px-3.5 py-3.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#75a8ff]" />
                <div>
                  <p className="font-black text-white">Private on this device</p>
                  <p className="mt-0.5 text-slate-400">
                    This Life Profile is stored in CLARA's local device storage and is not a public community profile.
                  </p>
                  <p className="mt-1 text-[10px] text-slate-600">{lifeContext.saveState}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
