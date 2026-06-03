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
    <div ref={dropdownRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative flex min-h-[50px] w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border px-4 text-left shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-2xl transition duration-300 active:scale-[0.985] ${
          open
            ? `border-white/14 bg-slate-900/72 ${theme.glowSoft}`
            : "border-white/10 bg-slate-950/44 hover:bg-slate-900/48"
        }`}
      >
        <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <span className="relative flex min-w-0 items-center gap-3">
          {Icon ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.035] text-slate-200/78">
              <Icon className="h-4 w-4" />
            </span>
          ) : null}

          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.17em] text-slate-400/72">
              {label}
            </span>
            <span className="mt-0.5 block truncate text-sm font-black text-slate-50/88">
              {selected?.label}
            </span>
          </span>
        </span>

        <ChevronDown
          className={`relative h-4 w-4 shrink-0 text-slate-400/80 transition duration-300 ${
            open ? "rotate-180 text-slate-100/88" : ""
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-30 grid overflow-hidden rounded-[24px] border border-white/10 bg-[#0b111c]/96 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-all duration-300 ${
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
                      ? "bg-white/[0.075] text-slate-50/90"
                      : "text-slate-300/68 hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <span className="h-2 w-2 rounded-full bg-slate-100/78 shadow-[0_0_14px_rgba(226,232,240,0.2)]" />
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
      ? "text-rose-100/86"
      : tone === "emerald"
        ? "text-emerald-100/84"
        : tone === "cyan"
          ? "text-slate-100/86"
          : "text-slate-100/88";

  const railClass =
    tone === "rose"
      ? "bg-rose-200/32"
      : tone === "emerald"
        ? "bg-emerald-200/30"
        : tone === "cyan"
          ? "bg-slate-300/28"
          : "bg-slate-300/24";

  return (
    <div className="relative min-h-[82px] overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/42 p-3 shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className={`absolute left-0 top-4 h-10 w-1 rounded-r-full ${railClass}`} />

      <p className="pl-1 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400/72">
        {label}
      </p>
      <p className={`mt-2 truncate pl-1 text-[clamp(15px,4.5vw,22px)] font-black tracking-tight ${toneClass}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate pl-1 text-[10px] font-semibold text-slate-400/66">
        {helper}
      </p>
    </div>
  );
}

export function StatusBadge({ children, icon: Icon = CircleDot, tone = "neutral" }) {
  const toneClass =
    tone === "good"
      ? "border-emerald-200/14 bg-emerald-300/[0.055] text-emerald-50/74"
      : tone === "warn"
        ? "border-amber-200/14 bg-amber-300/[0.055] text-amber-50/74"
        : tone === "bad"
          ? "border-rose-200/14 bg-rose-300/[0.055] text-rose-50/74"
          : tone === "info"
            ? "border-sky-200/12 bg-sky-300/[0.05] text-sky-50/72"
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

    const bodyClass = "clara-transaction-hub-clean-bg";
    document.body.classList.add(bodyClass);

    return () => document.body.classList.remove(bodyClass);
  }, []);

  return (
    <>
      <style>{`
        body.clara-transaction-hub-clean-bg .pointer-events-none.fixed.inset-0.overflow-hidden > div {
          display: none !important;
        }
      `}</style>

      <section className="relative overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/42 p-4 shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border border-white/10 bg-white/[0.035] text-slate-200/78">
            <CheckCircle2 className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400/72">
              CLARA Insight
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-200/76">
              {insight}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
