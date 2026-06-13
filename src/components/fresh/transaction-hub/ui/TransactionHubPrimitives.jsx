import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, CircleDot } from "lucide-react";

import { DEFAULT_THEME } from "../logic/transactionHubUtils";

export function useClickOutside(ref, onClose) {
  useEffect(() => {
    const handleClick = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      onClose();
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [ref, onClose]);
}

export function GlassDropdown({
  label,
  icon: Icon,
  value,
  options,
  onChange,
  onAfterChange,
  theme = DEFAULT_THEME,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const selected = options.find((item) => item.key === value) || options[0];

  useClickOutside(dropdownRef, () => setOpen(false));

  return (
    <div
      ref={dropdownRef}
      className={`relative min-w-0 flex-1 ${open ? "z-[80]" : "z-10"}`}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex min-h-[50px] w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border px-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition duration-300 active:scale-[0.985] ${
          open
            ? `border-cyan-200/18 bg-cyan-300/[0.075] ${theme.glowSoft}`
            : "border-white/10 bg-slate-950/44 hover:border-cyan-200/14 hover:bg-cyan-300/[0.045]"
        }`}
      >
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/18 to-transparent" />

        <span className="relative flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-cyan-100/14 bg-cyan-300/[0.08] text-cyan-50/82">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}

          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.17em] text-cyan-100/56">
              {label}
            </span>
            <span className="mt-0.5 block truncate text-sm font-black text-slate-50/90">
              {selected?.label}
            </span>
          </span>
        </span>

        <ChevronDown
          className={`relative h-4 w-4 shrink-0 text-cyan-100/60 transition duration-300 ${
            open ? "rotate-180 text-cyan-50/90" : ""
          }`}
        />
      </button>

      <div
        className={`relative z-[90] mt-2 grid overflow-hidden rounded-[24px] border border-cyan-100/12 bg-[#0b111c]/96 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-all duration-300 sm:absolute sm:left-0 sm:right-0 sm:top-[calc(100%+8px)] sm:mt-0 ${
          open
            ? "grid-rows-[1fr] opacity-100"
            : "pointer-events-none grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="max-h-72 overflow-y-auto">
          <div className="p-2">
            {options.map((item) => {
              const active = item.key === value;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    onChange(item.key);
                    onAfterChange?.();
                    setOpen(false);
                  }}
                  className={`flex min-h-[42px] w-full items-center justify-between rounded-[18px] px-3 text-left text-sm font-black transition duration-200 active:scale-[0.985] ${
                    active
                      ? "bg-cyan-300/[0.085] text-cyan-50/92"
                      : "text-slate-300/68 hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <span className="h-2 w-2 rounded-full bg-cyan-100/82 shadow-[0_0_14px_rgba(103,232,249,0.22)]" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SummaryCard({ label, value, helper, tone = "slate" }) {
  const toneClass =
    tone === "rose"
      ? "text-rose-50/90"
      : tone === "emerald"
        ? "text-emerald-50/88"
        : tone === "cyan"
          ? "text-cyan-50/88"
          : "text-slate-100/88";

  const cardClass =
    tone === "rose"
      ? "border-rose-200/14 bg-[linear-gradient(135deg,rgba(244,63,94,0.14),rgba(15,23,42,0.50)_56%,rgba(15,23,42,0.34))]"
      : tone === "emerald"
        ? "border-emerald-200/14 bg-[linear-gradient(135deg,rgba(16,185,129,0.14),rgba(15,23,42,0.50)_56%,rgba(15,23,42,0.34))]"
        : tone === "cyan"
          ? "border-cyan-200/14 bg-[linear-gradient(135deg,rgba(34,211,238,0.13),rgba(15,23,42,0.50)_56%,rgba(15,23,42,0.34))]"
          : "border-violet-200/12 bg-[linear-gradient(135deg,rgba(139,92,246,0.12),rgba(15,23,42,0.50)_56%,rgba(15,23,42,0.34))]";

  const railClass =
    tone === "rose"
      ? "bg-rose-200/45"
      : tone === "emerald"
        ? "bg-emerald-200/42"
        : tone === "cyan"
          ? "bg-cyan-200/40"
          : "bg-violet-200/36";

  const labelClass =
    tone === "rose"
      ? "text-rose-100/62"
      : tone === "emerald"
        ? "text-emerald-100/62"
        : tone === "cyan"
          ? "text-cyan-100/62"
          : "text-violet-100/56";

  return (
    <div className={`relative min-h-[82px] overflow-hidden rounded-[22px] border p-3 shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-2xl ${cardClass}`}>
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
      <div className={`absolute left-0 top-4 h-10 w-1 rounded-r-full ${railClass}`} />

      <p className={`pl-1 text-[9px] font-black uppercase tracking-[0.16em] ${labelClass}`}>
        {label}
      </p>
      <p className={`mt-2 truncate pl-1 text-[clamp(15px,4.5vw,22px)] font-black tracking-tight ${toneClass}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate pl-1 text-[10px] font-semibold text-slate-300/62">
        {helper}
      </p>
    </div>
  );
}

export function StatusBadge({ children, icon: Icon = CircleDot, tone = "neutral" }) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200/16 bg-emerald-300/[0.075] text-emerald-50/78"
      : tone === "warn"
        ? "border-amber-200/16 bg-amber-300/[0.075] text-amber-50/78"
        : tone === "bad"
          ? "border-rose-200/16 bg-rose-300/[0.075] text-rose-50/78"
          : tone === "info"
            ? "border-cyan-200/14 bg-cyan-300/[0.065] text-cyan-50/76"
            : "border-white/10 bg-white/[0.035] text-slate-300/68";

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.095em] ${toneClass}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}

export function InsightCard({ insight, theme = DEFAULT_THEME }) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const bodyClass = "clara-transaction-hub-harmonic-bg";
    document.body.classList.add(bodyClass);

    return () => document.body.classList.remove(bodyClass);
  }, []);

  return (
    <>
      <style>{`
        body.clara-transaction-hub-harmonic-bg .pointer-events-none.fixed.inset-0.overflow-hidden > div {
          display: none !important;
        }

        body.clara-transaction-hub-harmonic-bg .pointer-events-none.fixed.inset-0.overflow-hidden {
          background:
            radial-gradient(circle at 16% 0%, rgba(45, 212, 191, 0.14), transparent 30%),
            radial-gradient(circle at 94% 2%, rgba(139, 92, 246, 0.13), transparent 34%),
            linear-gradient(155deg, rgba(3, 27, 38, 0.72) 0%, rgba(3, 7, 18, 0.76) 48%, rgba(27, 18, 54, 0.54) 100%);
        }
      `}</style>

      <section className="relative overflow-hidden rounded-[24px] border border-cyan-100/14 bg-[linear-gradient(135deg,rgba(45,212,191,0.10),rgba(15,23,42,0.52)_52%,rgba(59,130,246,0.055))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/18 to-transparent" />

        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border border-cyan-100/16 bg-cyan-300/[0.085] text-cyan-50/82">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/58">
              CLARA Insight
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-100/78">
              {insight}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
