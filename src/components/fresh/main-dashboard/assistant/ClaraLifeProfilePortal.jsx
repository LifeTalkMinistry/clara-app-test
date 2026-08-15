import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { LockKeyhole, UserRound, X } from "lucide-react";
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

function ProfileTrigger({ open, filledCount, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={`${open ? "Close" : "Open"} CLARA Life Profile`}
      className={`absolute left-3 top-3 z-30 grid h-11 w-11 place-items-center rounded-full border transition active:scale-95 ${open
        ? "border-[#ffd84a]/55 bg-[#ffd84a]/12 text-[#ffe783] shadow-[0_10px_30px_rgba(255,216,74,0.14),0_0_0_4px_rgba(23,105,255,0.08)]"
        : "border-blue-300/32 bg-[#07152d]/92 text-blue-100 shadow-[0_12px_30px_rgba(23,105,255,0.20),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-blue-300/52 hover:bg-blue-500/12"}`}
      data-clara-life-profile-trigger="true"
    >
      <UserRound className="h-[19px] w-[19px]" strokeWidth={2.2} />
      {filledCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full border border-[#07152d] bg-[#1769ff] px-1 py-0.5 text-[8px] font-black leading-none text-white">
          {filledCount > 99 ? "99+" : filledCount}
        </span>
      ) : null}
    </button>
  );
}

function FieldControl({ field, value, onChange }) {
  const commonClass = "mt-2 w-full rounded-[16px] border border-blue-200/12 bg-[#07142b]/92 px-3.5 py-3 text-[12.5px] font-bold text-white outline-none placeholder:text-slate-500 focus:border-blue-300/38";

  if (field.input === "select") {
    return (
      <select
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        className={`${commonClass} appearance-none`}
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
      <div className="rounded-[18px] border border-white/[0.07] bg-white/[0.018] px-3.5 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-black text-white/62">{field.label}</p>
            <p className="mt-1 text-[10px] font-bold text-slate-500">{requiredTierLabel(field.access)} life-context field</p>
          </div>
          <LockKeyhole className="h-4 w-4 shrink-0 text-[#ffd84a]/52" />
        </div>
      </div>
    );
  }

  return (
    <label className="block rounded-[18px] border border-white/[0.075] bg-white/[0.025] px-3.5 py-3.5">
      <span className="text-[12px] font-black text-white/92">{field.label}</span>
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

  return (
    <section
      data-clara-life-profile-panel="true"
      className="absolute inset-x-2 bottom-3 top-[84px] z-[70] flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-blue-200/18 bg-[linear-gradient(150deg,rgba(5,22,46,0.995),rgba(4,12,29,0.998)_58%,rgba(22,9,35,0.99))] text-left shadow-[0_30px_90px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,#1769ff_0%,#1769ff_42%,#ffd84a_42%,#ffd84a_56%,#e53945_56%,#e53945_100%)]" />
      <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-blue-500/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-500/[0.08] blur-3xl" />

      <header className="relative shrink-0 border-b border-white/[0.07] px-4 pb-4 pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-200/70">CLARA LIFE PROFILE</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-black tracking-[-0.035em] text-white">Your life, behind the numbers.</h2>
              <span className="rounded-full border border-[#ffd84a]/18 bg-[#ffd84a]/[0.055] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#ffe783]/78">
                {accessLabel(access)} context
              </span>
            </div>
            <p className="mt-2 max-w-[330px] text-[11px] font-semibold leading-5 text-slate-300/72">
              Fill only what you want CLARA to know. Ask Before You Spend sends a short statement from relevant fields—not this whole profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-black/16 text-white/66 transition hover:border-blue-200/28 hover:text-white active:scale-95"
            aria-label="Close Life Profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-[9.5px] font-bold text-slate-400/72">
          <span>{saveState}</span>
          <span>{filledFields.size} filled</span>
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((item) => {
            const active = item.name === activeSection.name;
            const unlockedCount = item.fields.filter((field) => canUseClaraLifeProfileField(field, supportTier)).length;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setSection(item.name)}
                className={`shrink-0 rounded-full border px-3 py-2 text-[10px] font-black transition ${active
                  ? "border-blue-300/34 bg-blue-500/14 text-blue-100"
                  : "border-white/[0.075] bg-white/[0.025] text-slate-400 hover:text-white"}`}
              >
                {item.name} · {unlockedCount}/{item.fields.length}
              </button>
            );
          })}
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300/72">{activeSection.name}</p>
            <p className="mt-1 text-[10px] font-semibold text-slate-500">{activeFilled} fields filled in this section</p>
          </div>
          {activeSection.fields.some((field) => !canUseClaraLifeProfileField(field, supportTier)) ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffd84a]/14 bg-[#ffd84a]/[0.04] px-2.5 py-1.5 text-[9px] font-black text-[#ffe783]/66">
              <LockKeyhole className="h-3 w-3" /> Higher tier fields shown locked
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

        <div className="mt-4 rounded-[18px] border border-blue-200/10 bg-blue-500/[0.035] px-4 py-3 text-[10.5px] font-semibold leading-5 text-slate-300/70">
          Your profile stays on this device. CLARA uses only user-filled details that are relevant to the spending decision. Life context supports financial reasoning; it never replaces verified wallet, budget, income, debt, or savings data.
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
