import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import ClaraBrandName from "@/components/ClaraBrandName";
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

function sectionTone(name) {
  if (name === "Work & Family") {
    return {
      dot: "bg-[#ffd42f]",
      active: "border-[#6d5a16] bg-[#2a2410] text-[#fff0a1]",
      rail: "bg-[#ffd42f]",
    };
  }
  if (name === "Plans") {
    return {
      dot: "bg-[#ff4d55]",
      active: "border-[#6b2228] bg-[#2a1118] text-[#ffc6ca]",
      rail: "bg-[#ff4d55]",
    };
  }
  if (name === "Deeper Context") {
    return {
      dot: "bg-[#a78bfa]",
      active: "border-[#4b367d] bg-[#1b1532] text-[#e5dcff]",
      rail: "bg-[#a78bfa]",
    };
  }
  return {
    dot: "bg-[#4d8cff]",
    active: "border-[#28589b] bg-[#0b2852] text-[#dceaff]",
    rail: "bg-[#4d8cff]",
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

  const filledFields = useMemo(
    () => new Set(getClaraLifeProfileFilledFields(lifeContext.profile)),
    [lifeContext.profile]
  );

  const sections = useMemo(
    () => SECTION_ORDER.map((name) => ({
      name,
      fields: CLARA_LIFE_PROFILE_FIELDS.filter((field) => field.section === name),
    })),
    []
  );

  const activeSection = sections.find((item) => item.name === section) || sections[0];
  const activeFilled = activeSection.fields.filter((field) => filledFields.has(field.key)).length;
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
        <header className="rounded-[28px] border border-[#183c69] bg-[#06162e] px-4 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <button
                type="button"
                onClick={goBack}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#28578c] bg-[#0a2346] text-blue-100 transition hover:border-[#4d8cff] active:scale-95"
                aria-label="Back from CLARA Life Profile"
              >
                <ArrowLeft className="h-[18px] w-[18px]" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border border-[#28578c] bg-[#0a2346] text-blue-100">
                    <UserRound className="h-[18px] w-[18px]" strokeWidth={2.1} />
                    <span className="absolute -bottom-[1px] left-1/2 flex -translate-x-1/2 gap-[2px]" aria-hidden="true">
                      <span className="h-[2px] w-2 rounded-full bg-[#4d8cff]" />
                      <span className="h-[2px] w-1 rounded-full bg-[#ffd42f]" />
                      <span className="h-[2px] w-2 rounded-full bg-[#ff4d55]" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.20em] text-slate-400">
                      <ClaraBrandName className="tracking-[0.16em]" /> <span className="text-blue-100/70">LIFE PROFILE</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold text-blue-200/65">
                      <Sparkles className="h-3 w-3" /> Personal context for smarter decisions
                    </p>
                  </div>
                </div>

                <h1 className="mt-4 text-[25px] font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-[30px]">
                  Your life behind the numbers.
                </h1>
                <p className="mt-2 max-w-xl text-[12px] font-semibold leading-5 text-slate-300">
                  Fill only what matters to you. CLARA uses only the relevant parts of this profile during Buy Check.
                </p>
              </div>
            </div>

            <span className="shrink-0 rounded-full border border-[#5f5018] bg-[#211d0e] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.13em] text-[#fff0a1]">
              {accessLabel(access)} context
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] border border-[#173b68] bg-[#081a35] px-3.5 py-3 text-[10px] font-bold text-slate-300">
            <span className="flex min-w-0 items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-300" />
              <span className="truncate">{lifeContext.saveState}</span>
            </span>
            <span className="shrink-0 text-white">{filledFields.size} filled</span>
          </div>
        </header>

        <nav
          className="sticky top-0 z-20 -mx-1 mt-4 overflow-x-auto bg-[#050b1d] px-1 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Life Profile sections"
        >
          <div className="flex min-w-max gap-2">
            {sections.map((item) => {
              const active = item.name === activeSection.name;
              const tone = sectionTone(item.name);
              const unlockedCount = item.fields.filter((field) => canUseClaraLifeProfileField(field, lifeContext.supportTier)).length;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => setSection(item.name)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-[10px] font-black transition ${active
                    ? tone.active
                    : "border-[#1b304d] bg-[#0a1427] text-slate-400 hover:border-[#294566] hover:text-white"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                  {item.name} · {unlockedCount}/{item.fields.length}
                </button>
              );
            })}
          </div>
        </nav>

        <section className="mt-2 rounded-[28px] border border-[#162f50] bg-[#061225] p-4 shadow-[0_22px_55px_rgba(0,0,0,0.24)] sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                <span className={`h-2 w-2 rounded-full ${activeTone.dot}`} />
                {activeSection.name}
              </p>
              <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                {activeFilled} fields filled in this section
              </p>
            </div>
            <div className={`h-1.5 w-14 rounded-full ${activeTone.rail}`} aria-hidden="true" />
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

        <section className="mt-4 rounded-[22px] border border-[#173b68] bg-[#07172f] px-4 py-4 shadow-[0_16px_38px_rgba(0,0,0,0.20)]">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#24507f] bg-[#0a2346]">
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <p className="text-[11px] font-black text-white">Your context stays yours.</p>
              <p className="mt-1 text-[10.5px] font-semibold leading-5 text-slate-400">
                CLARA uses only user-filled details that are relevant to the spending decision. Life context supports financial reasoning; it never replaces verified wallet, budget, income, debt, or savings data.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
          <Check className="h-3.5 w-3.5 text-emerald-400" /> Changes save automatically
        </div>
      </div>
    </main>
  );
}
