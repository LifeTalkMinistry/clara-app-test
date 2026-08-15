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

function sectionNavLabel(name) {
  if (name === "Deeper Context") return "Deeper";
  return name;
}

function sectionTone(name) {
  if (name === "Work & Family") {
    return {
      dot: "bg-[#ffd42f]",
      active: "border-[#6d5a16] bg-[#2a2410] text-[#fff0a1]",
    };
  }
  if (name === "Plans") {
    return {
      dot: "bg-[#ff4d55]",
      active: "border-[#6b2228] bg-[#2a1118] text-[#ffc6ca]",
    };
  }
  if (name === "Deeper Context") {
    return {
      dot: "bg-[#a78bfa]",
      active: "border-[#4b367d] bg-[#1b1532] text-[#e5dcff]",
    };
  }
  return {
    dot: "bg-[#4d8cff]",
    active: "border-[#28589b] bg-[#0b2852] text-[#dceaff]",
  };
}

function FieldControl({ field, value, onChange }) {
  const commonClass = "mt-2.5 w-full rounded-[17px] border border-[#234a7a] bg-[#06152d] px-4 py-3.5 text-[13px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none caret-[#4d8cff] placeholder:text-slate-500 transition focus:border-[#4d8cff] focus:bg-[#071b39] focus:shadow-[0_0_0_3px_rgba(77,140,255,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]";

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

function ProfileField({ field, profile, supportTier, updateField }) {
  const unlocked = canUseClaraLifeProfileField(field, supportTier);
  const value = profile?.[field.key] ?? "";

  if (!unlocked) {
    return (
      <div className="rounded-[22px] border border-[#3c341a] bg-[#121727] px-4 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.20)]">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-black text-white/70">{field.label}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-500">
              {requiredTierLabel(field.access)} life-context field
            </p>
          </div>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#514619] bg-[#211d0e]">
            <LockKeyhole className="h-4 w-4 text-[#ffd42f]/70" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <label className="block rounded-[22px] border border-[#173b68] bg-[#081a35] px-4 py-4 shadow-[0_14px_34px_rgba(0,0,0,0.18)] transition focus-within:border-[#2c65ab]">
      <span className="flex items-center gap-2 text-[13px] font-black text-white">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4d8cff]" />
        {field.label}
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
      className="min-h-[100dvh] bg-[linear-gradient(160deg,#03142b_0%,#050b1d_52%,#160a22_100%)] text-white"
    >
      <div className="h-[3px] w-full bg-[linear-gradient(90deg,#4d8cff_0%,#4d8cff_42%,#ffd42f_42%,#ffd42f_56%,#ff4d55_56%,#ff4d55_100%)]" />

      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
        <header className="rounded-[22px] border border-[#183c69] bg-[#06162e] px-3.5 py-3.5 shadow-[0_18px_42px_rgba(0,0,0,0.24)] sm:px-4 sm:py-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={goBack}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#28578c] bg-[#0a2346] text-blue-100 transition hover:border-[#4d8cff] active:scale-95"
              aria-label="Back from CLARA Life Profile"
            >
              <ArrowLeft className="h-[17px] w-[17px]" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[13px] font-black uppercase tracking-[0.14em] text-white">
                Life Profile
              </h1>
              <p className="mt-0.5 truncate text-[10px] font-semibold text-blue-200/60">
                Personal context for CLARA
              </p>
            </div>

            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#244a76] bg-[#081a35] text-blue-100/80 transition hover:border-[#4d8cff] hover:text-white active:scale-95"
              aria-label="About Life Profile"
              aria-haspopup="dialog"
              aria-expanded={infoOpen}
            >
              <Info className="h-4 w-4" />
            </button>

            <span className="shrink-0 rounded-full border border-[#5f5018] bg-[#211d0e] px-2.5 py-1.5 text-[8px] font-black uppercase tracking-[0.10em] text-[#fff0a1]">
              {accessLabel(access)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] font-bold">
            <span className="text-slate-500">Profile progress</span>
            <span className="text-white">
              {accessibleFilledCount} / {accessibleFields.length} filled
            </span>
          </div>
        </header>

        <nav
          className="sticky top-0 z-20 mt-3 bg-[#050b1d] py-2.5"
          aria-label="Life Profile sections"
        >
          <div className="grid grid-cols-4 gap-1.5">
            {sections.map((item) => {
              const active = item.name === activeSection.name;
              const tone = sectionTone(item.name);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSection(item.name)}
                  className={`flex min-w-0 items-center justify-center gap-1.5 rounded-full border px-2 py-2.5 text-[9px] font-black transition ${active
                    ? tone.active
                    : "border-[#1b304d] bg-[#0a1427] text-slate-400 hover:border-[#294566] hover:text-white"}`}
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                  <span className="truncate">{sectionNavLabel(item.name)}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <section className="mt-1 rounded-[26px] border border-[#162f50] bg-[#061225] p-4 shadow-[0_22px_55px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
              <span className={`h-2 w-2 shrink-0 rounded-full ${activeTone.dot}`} />
              <span className="truncate">{activeSection.name}</span>
            </p>
            <span className="shrink-0 text-[10px] font-bold text-slate-500">
              {activeFilled} / {activeAccessibleFields.length} filled
            </span>
          </div>

          <div className="mt-4 grid gap-3">
            {activeSection.fields.map((field) => (
              <ProfileField
                key={field.key}
                field={field}
                profile={lifeContext.profile}
                supportTier={lifeContext.supportTier}
                updateField={lifeContext.updateField}
              />
            ))}
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
          <Check className="h-3.5 w-3.5 text-emerald-400" /> Changes save automatically
        </div>
      </div>

      {infoOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-3 backdrop-blur-[2px] sm:items-center sm:p-5"
          role="presentation"
          onClick={() => setInfoOpen(false)}
        >
          <section
            data-clara-life-profile-info-sheet="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clara-life-profile-info-title"
            className="w-full max-w-md rounded-[26px] border border-[#1d4776] bg-[#07162d] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300/70">CLARA LIFE PROFILE</p>
                <h2 id="clara-life-profile-info-title" className="mt-1 text-[18px] font-black text-white">
                  About Life Profile
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#244a76] bg-[#0a2346] text-blue-100 transition hover:border-[#4d8cff] active:scale-95"
                aria-label="Close Life Profile information"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4 text-[11px] font-semibold leading-[1.65] text-slate-300">
              <div>
                <p className="font-black text-white">What it does</p>
                <p className="mt-1">
                  Life Profile gives CLARA optional personal context about you so Buy Check can understand the situation behind your financial numbers.
                </p>
              </div>

              <div>
                <p className="font-black text-white">How CLARA uses it</p>
                <p className="mt-1">
                  Only relevant profile details are considered for a spending decision. Verified wallet, budget, income, savings, debt, and obligations remain the primary financial authority.
                </p>
              </div>

              <div>
                <p className="font-black text-white">Your control</p>
                <p className="mt-1">
                  Fill only what you want. Any optional field can stay blank. Builder and Champion tiers unlock additional context fields.
                </p>
              </div>

              <div className="flex items-start gap-2.5 rounded-[16px] border border-[#173b68] bg-[#081a35] px-3.5 py-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                <div>
                  <p className="font-black text-white">Private on this device</p>
                  <p className="mt-0.5 text-slate-400">
                    This Life Profile is stored in CLARA's local device storage and is not a public community profile.
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">{lifeContext.saveState}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
