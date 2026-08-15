import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { LockKeyhole, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import ClaraBrandName from "@/components/ClaraBrandName";
import {
  CLARA_LIFE_PROFILE_FIELDS,
  canUseClaraLifeProfileField,
  getClaraLifeContextAccess,
  getClaraLifeProfileFilledFields,
} from "@/lib/clara-life-context";

const BOARD_SELECTOR = '[data-clara-pause-entry-board="true"]';
const OVERLAY_SELECTOR = '[data-clara-pause-overlay="true"]';
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
      active: "border-[#ffd42f]/38 bg-[#ffd42f]/[0.09] text-[#fff0a1] shadow-[0_8px_24px_rgba(255,212,47,0.08)]",
    };
  }
  if (name === "Plans") {
    return {
      dot: "bg-[#ff4d55]",
      active: "border-[#ff4d55]/36 bg-[#ff4d55]/[0.085] text-[#ffc0c4] shadow-[0_8px_24px_rgba(255,77,85,0.08)]",
    };
  }
  if (name === "Deeper Context") {
    return {
      dot: "bg-[#a78bfa]",
      active: "border-violet-300/36 bg-violet-400/[0.09] text-violet-100 shadow-[0_8px_24px_rgba(139,92,246,0.09)]",
    };
  }
  return {
    dot: "bg-[#4d8cff]",
    active: "border-[#4d8cff]/42 bg-[#4d8cff]/[0.11] text-[#dceaff] shadow-[0_8px_24px_rgba(77,140,255,0.10)]",
  };
}

function ProfileTrigger({ open, filledCount, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? "Close" : "Open"} CLARA Life Profile`}
      className={`absolute left-3 top-3 z-30 grid h-11 w-11 place-items-center overflow-visible rounded-full border transition active:scale-95 ${open
        ? "border-[#ffd42f]/55 bg-[radial-gradient(circle_at_35%_30%,rgba(255,212,47,0.22),rgba(7,21,45,0.96)_68%)] text-[#fff0a1] shadow-[0_10px_30px_rgba(255,212,47,0.15),0_0_0_4px_rgba(77,140,255,0.08),inset_0_1px_0_rgba(255,255,255,0.08)]"
        : "border-[#4d8cff]/34 bg-[radial-gradient(circle_at_35%_30%,rgba(77,140,255,0.18),rgba(7,21,45,0.96)_68%)] text-blue-100 shadow-[0_12px_30px_rgba(23,105,255,0.20),inset_0_1px_0_rgba(255,255,255,0.07)] hover:border-[#4d8cff]/58 hover:bg-blue-500/12"}`}
      data-clara-life-profile-trigger="true"
    >
      <span className="pointer-events-none absolute inset-[3px] rounded-full border border-white/[0.055]" />
      <UserRound className="relative h-[19px] w-[19px]" strokeWidth={2.2} />
      <span className="pointer-events-none absolute -bottom-[2px] left-1/2 flex -translate-x-1/2 gap-[2px]" aria-hidden="true">
        <span className="h-[2px] w-[7px] rounded-full bg-[#4d8cff]" />
        <span className="h-[2px] w-[4px] rounded-full bg-[#ffd42f]" />
        <span className="h-[2px] w-[7px] rounded-full bg-[#ff4d55]" />
      </span>
      {filledCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full border border-[#07152d] bg-[#1769ff] px-1 py-0.5 text-[8px] font-black leading-none text-white shadow-[0_4px_12px_rgba(23,105,255,0.38)]">
          {filledCount > 99 ? "99+" : filledCount}
        </span>
      ) : null}
    </button>
  );
}

function FieldControl({ field, value, onChange }) {
  const commonClass = "mt-2 w-full rounded-[17px] border border-[#4d8cff]/18 bg-[linear-gradient(145deg,rgba(8,27,56,0.96),rgba(9,15,38,0.96))] px-3.5 py-3 text-[12.5px] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_8px_22px_rgba(0,0,0,0.16)] outline-none caret-[#4d8cff] placeholder:text-slate-500/88 transition focus:border-[#4d8cff]/58 focus:bg-[linear-gradient(145deg,rgba(10,34,70,0.98),rgba(10,17,44,0.98))] focus:shadow-[0_0_0_3px_rgba(77,140,255,0.10),inset_0_1px_0_rgba(255,255,255,0.07),0_10px_26px_rgba(23,105,255,0.10)]";

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
        rows={3}
        className={`${commonClass} min-h-[84px] resize-none leading-5`}
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
      <div className="rounded-[20px] border border-[#ffd42f]/10 bg-[linear-gradient(145deg,rgba(255,212,47,0.025),rgba(255,255,255,0.012))] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-black text-white/62">{field.label}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-500">{requiredTierLabel(field.access)} life-context field</p>
          </div>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#ffd42f]/12 bg-[#ffd42f]/[0.035]">
            <LockKeyhole className="h-3.5 w-3.5 text-[#ffd42f]/56" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <label className="block rounded-[20px] border border-[#4d8cff]/12 bg-[linear-gradient(145deg,rgba(77,140,255,0.035),rgba(255,255,255,0.018))] px-3.5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition focus-within:border-[#4d8cff]/28 focus-within:bg-[linear-gradient(145deg,rgba(77,140,255,0.055),rgba(255,255,255,0.022))]">
      <span className="flex items-center gap-2 text-[12px] font-black text-white/94">
        <span className="h-1.5 w-1.5 rounded-full bg-[#4d8cff] shadow-[0_0_10px_rgba(77,140,255,0.55)]" />
        {field.label}
      </span>
      <FieldControl field={field} value={value} onChange={(nextValue) => updateField(field.key, nextValue)} />
    </label>
  );
}

function ClaraLifeProfilePanel({ profile, updateField, supportTier, saveState, onClose }) {
  const access = getClaraLifeContextAccess(supportTier);
  const [section, setSection] = useState("Basics");
  const filledFields = useMemo(() => new Set(getClaraLifeProfileFilledFields(profile)), [profile]);

  const sections = useMemo(() => {
    return SECTION_ORDER.map((name) => ({
      name,
      fields: CLARA_LIFE_PROFILE_FIELDS.filter((field) => field.section === name),
    }));
  }, []);

  const activeSection = sections.find((item) => item.name === section) || sections[0];
  const activeFilled = activeSection.fields.filter((field) => filledFields.has(field.key)).length;
  const activeTone = sectionTone(activeSection.name);

  return (
    <section
      data-clara-life-profile-panel="true"
      className="absolute inset-x-2 bottom-3 top-[84px] z-[70] flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-[#4d8cff]/22 bg-[radial-gradient(circle_at_8%_0%,rgba(39,155,255,0.17),transparent_30%),radial-gradient(circle_at_92%_8%,rgba(229,57,69,0.10),transparent_31%),radial-gradient(circle_at_52%_100%,rgba(103,58,183,0.12),transparent_36%),linear-gradient(150deg,rgba(4,20,44,0.997),rgba(4,11,27,0.999)_58%,rgba(20,8,34,0.995))] text-left shadow-[0_30px_90px_rgba(0,0,0,0.66),0_0_0_1px_rgba(77,140,255,0.04),inset_0_1px_0_rgba(255,255,255,0.055)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#4d8cff_0%,#4d8cff_42%,#ffd42f_42%,#ffd42f_56%,#ff4d55_56%,#ff4d55_100%)] shadow-[0_0_18px_rgba(77,140,255,0.18)]" />
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-[#4d8cff]/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#ff4d55]/[0.07] blur-3xl" />
      <div className="pointer-events-none absolute left-[43%] top-8 h-24 w-24 rounded-full bg-[#ffd42f]/[0.025] blur-3xl" />

      <header className="relative shrink-0 border-b border-white/[0.07] px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border border-[#4d8cff]/24 bg-[radial-gradient(circle_at_35%_30%,rgba(77,140,255,0.20),rgba(7,21,45,0.74)_68%)] text-blue-100 shadow-[0_8px_24px_rgba(23,105,255,0.13),inset_0_1px_0_rgba(255,255,255,0.06)]">
                <UserRound className="h-[17px] w-[17px]" strokeWidth={2.1} />
                <span className="absolute -bottom-[1px] left-1/2 flex -translate-x-1/2 gap-[2px]" aria-hidden="true">
                  <span className="h-[2px] w-2 rounded-full bg-[#4d8cff]" />
                  <span className="h-[2px] w-1 rounded-full bg-[#ffd42f]" />
                  <span className="h-[2px] w-2 rounded-full bg-[#ff4d55]" />
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.20em] text-slate-400/78">
                  <ClaraBrandName className="tracking-[0.16em]" /> <span className="text-blue-100/62">LIFE PROFILE</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold text-blue-200/56">
                  <Sparkles className="h-3 w-3" /> Personal context for smarter decisions
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-black leading-tight tracking-[-0.038em] text-white">Your life behind the numbers.</h2>
              <span className="rounded-full border border-[#ffd42f]/20 bg-[#ffd42f]/[0.055] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#fff0a1]/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
                {accessLabel(access)} context
              </span>
            </div>
            <p className="mt-2 max-w-[330px] text-[11px] font-semibold leading-5 text-slate-300/74">
              Fill only what matters to you. CLARA uses only the relevant parts of this profile during Buy Check.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/16 text-white/66 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[#4d8cff]/34 hover:bg-[#4d8cff]/[0.08] hover:text-white active:scale-95"
            aria-label="Close Life Profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-[14px] border border-white/[0.055] bg-black/12 px-3 py-2 text-[9.5px] font-bold text-slate-400/76">
          <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#4d8cff]/78" />
            <span className="truncate">{saveState}</span>
          </span>
          <span className="shrink-0 text-blue-100/76">{filledFields.size} filled</span>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((item) => {
            const active = item.name === activeSection.name;
            const unlockedCount = item.fields.filter((field) => canUseClaraLifeProfileField(field, supportTier)).length;
            const tone = sectionTone(item.name);
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setSection(item.name)}
                className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black transition ${active
                  ? tone.active
                  : "border-white/[0.075] bg-white/[0.018] text-slate-400 hover:border-white/[0.12] hover:bg-white/[0.035] hover:text-white"}`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${tone.dot} ${active ? "shadow-[0_0_10px_currentColor]" : "opacity-55"}`} />
                  <span>{item.name}</span>
                  <span className="text-[9px] opacity-58">· {unlockedCount}/{item.fields.length}</span>
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${activeTone.dot} shadow-[0_0_12px_rgba(77,140,255,0.28)]`} />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-200/80">{activeSection.name}</p>
            </div>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">{activeFilled} fields filled in this section</p>
          </div>
          {activeSection.fields.some((field) => !canUseClaraLifeProfileField(field, supportTier)) ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd42f]/14 bg-[#ffd42f]/[0.04] px-2.5 py-1.5 text-[9px] font-black text-[#fff0a1]/68">
              <LockKeyhole className="h-3 w-3" /> Higher tier fields locked
            </span>
          ) : null}
        </div>

        <div className="grid gap-2.5">
          {activeSection.fields.map((field) => (
            <ProfileField
              key={field.key}
              field={field}
              profile={profile}
              supportTier={supportTier}
              updateField={updateField}
            />
          ))}
        </div>

        <div className="mt-4 flex gap-3 rounded-[20px] border border-[#4d8cff]/12 bg-[linear-gradient(145deg,rgba(77,140,255,0.045),rgba(255,255,255,0.016))] px-4 py-3.5 text-[10.5px] font-semibold leading-5 text-slate-300/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#4d8cff]/15 bg-[#4d8cff]/[0.055]">
            <ShieldCheck className="h-4 w-4 text-blue-200/72" />
          </div>
          <p>
            Your profile stays private on this device. CLARA only uses user-filled details that matter to the spending decision. Your verified wallet, budget, income, debt, and savings data remain the financial authority.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function ClaraLifeProfilePortal({
  isActive = false,
  disabled = false,
  profile = {},
  updateField,
  supportTier = null,
  saveState = "Saved privately on this device",
  filledCount = 0,
}) {
  const [open, setOpen] = useState(false);
  const [targets, setTargets] = useState({ board: null, overlay: null });

  useEffect(() => {
    if (!isActive || disabled || typeof document === "undefined") {
      setOpen(false);
      setTargets({ board: null, overlay: null });
      return undefined;
    }

    const syncTargets = () => {
      const board = document.querySelector(BOARD_SELECTOR);
      const overlay = document.querySelector(OVERLAY_SELECTOR);
      setTargets((current) => current.board === board && current.overlay === overlay
        ? current
        : { board, overlay });
      if (!board || !overlay) setOpen(false);
    };

    syncTargets();
    const observer = new MutationObserver(syncTargets);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [disabled, isActive]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;
    const active = document.activeElement;
    if (active instanceof HTMLElement) active.blur();
    return undefined;
  }, [open]);

  if (!isActive || disabled || !targets.board || !targets.overlay) return null;

  return (
    <>
      {createPortal(
        <ProfileTrigger
          open={open}
          filledCount={filledCount}
          onToggle={() => setOpen((current) => !current)}
        />,
        targets.board,
      )}
      {open ? createPortal(
        <ClaraLifeProfilePanel
          profile={profile}
          updateField={updateField}
          supportTier={supportTier}
          saveState={saveState}
          onClose={() => setOpen(false)}
        />,
        targets.overlay,
      ) : null}
    </>
  );
}
