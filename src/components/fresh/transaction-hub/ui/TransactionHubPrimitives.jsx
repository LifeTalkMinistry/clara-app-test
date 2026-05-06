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
        className={`relative flex min-h-[50px] w-full items-center justify-between gap-3 overflow-hidden rounded-[22px] border px-4 text-left shadow-[0_14px_36px_rgba(0,0,0,0.22)] backdrop-blur-2xl transition duration-300 active:scale-[0.985] ${
          open
            ? `${theme.border} ${theme.orb} ${theme.glow}`
            : "border-white/10 bg-white/[0.045]"
        }`}
      >
        <span
          className={`pointer-events-none absolute -right-8 -top-10 h-20 w-20 rounded-full ${theme.orb} blur-2xl opacity-70`}
        />

        <span className="relative flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-black/18 ${theme.primaryText}`}
            >
              <Icon className="h-4 w-4" />
            </span>
          ) : null}

          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.17em] text-white/34">
              {label}
            </span>
            <span className="mt-0.5 block truncate text-sm font-black text-white/84">
              {selected?.label}
            </span>
          </span>
        </span>

        <ChevronDown
          className={`relative h-4 w-4 shrink-0 text-white/48 transition duration-300 ${
            open ? `rotate-180 ${theme.primaryText}` : ""
          }`}
        />
      </button>

      <div
        className={`absolute left-0 right-0 top-[calc(100%+8px)] z-30 grid overflow-hidden rounded-[24px] border border-white/10 bg-[#07101d]/96 shadow-[0_24px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl transition-all duration-300 ${
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
                      ? `${theme.orb} ${theme.primaryText}`
                      : "text-white/60 hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{item.label}</span>
                  {active ? (
                    <span
                      className={`h-2 w-2 rounded-full ${theme.orb} ${theme.glow}`}
                    />
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
      ? "from-rose-400/10 text-rose-50/88"
      : tone === "emerald"
        ? "from-[color:var(--clara-theme-soft,rgba(148,163,184,0.1))] text-[color:var(--clara-theme-text,rgba(241,245,249,0.88))]"
        : tone === "cyan"
          ? "from-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.1))] text-sky-50/82"
          : "from-white/[0.075] text-white/88";

  return (
    <div
      className={`relative min-h-[82px] overflow-hidden rounded-[22px] border border-white/10 bg-gradient-to-br ${toneClass} via-white/[0.035] to-white/[0.02] p-3 shadow-[0_16px_42px_rgba(0,0,0,0.22)] backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-20 w-20 rounded-full bg-white/[0.055] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-white/38">
        {label}
      </p>
      <p className="mt-2 truncate text-[clamp(15px,4.5vw,22px)] font-black tracking-tight">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-white/40">
        {helper}
      </p>
    </div>
  );
}

export function StatusBadge({ children, icon: Icon = CircleDot, tone = "neutral" }) {
  const toneClass =
    tone === "good"
      ? "border-[color:var(--clara-theme-border,rgba(148,163,184,0.18))] bg-[color:var(--clara-theme-soft,rgba(148,163,184,0.075))] text-[color:var(--clara-theme-text,rgba(241,245,249,0.78))]"
      : tone === "warn"
        ? "border-amber-200/16 bg-amber-300/8 text-amber-50/76"
        : tone === "bad"
          ? "border-rose-200/16 bg-rose-300/8 text-rose-50/76"
          : tone === "info"
            ? "border-[color:var(--clara-theme-secondary-border,rgba(125,211,252,0.16))] bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.075))] text-sky-50/76"
            : "border-white/10 bg-black/18 text-white/58";

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
  return (
    <section
      className={`relative overflow-hidden rounded-[24px] border ${theme.border} bg-white/[0.045] p-4 shadow-[0_18px_52px_rgba(0,0,0,0.22)] backdrop-blur-2xl`}
    >
      <div
        className={`pointer-events-none absolute -right-14 -top-16 h-32 w-32 rounded-full ${theme.orb} blur-3xl opacity-70`}
      />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-28 w-28 rounded-full bg-[color:var(--clara-theme-secondary-soft,rgba(125,211,252,0.07))] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />

      <div className="relative flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[17px] border ${theme.border} ${theme.orb} ${theme.primaryText}`}
        >
          <CheckCircle2 className="h-4.5 w-4.5" />
        </div>

        <div className="min-w-0">
          <p
            className={`text-[9px] font-black uppercase tracking-[0.18em] ${theme.primaryText} opacity-55`}
          >
            CLARA Insight
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-white/70">
            {insight}
          </p>
        </div>
      </div>
    </section>
  );
}
