import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";

import useInvestmentCardLogic, {
  INVESTMENT_TYPES,
  fmt,
} from "@/components/financial-carousel/cards/investment/logic/useInvestmentCardLogic";

const tileClass =
  "rounded-2xl border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm font-semibold text-white outline-none transition placeholder:text-white/35";

export default function InvestmentCard({
  item = null,
  expanded = false,
  onToggleDetails,
}) {
  const { state, computed, handlers } = useInvestmentCardLogic({
    item,
    expanded,
    onToggleDetails,
  });

  const typePickerRef = useRef(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const { investmentType, plannedAmount, isExpanded } = state;

  const {
    tone,
    title,
    subtitle,
    statusLabel,
    mainLabel,
    description,
    canSafelyInvest,
    safeToInvest,
    selectedType,
    amountStatus,
    statOneLabel,
    statOneValue,
    statTwoLabel,
    statTwoValue,
    statThreeLabel,
    statThreeValue,
  } = computed;

  const {
    setInvestmentType,
    setPlannedAmount,
    handlePlanInvestment,
    handleAskClara,
    handleToggleDetails,
  } = handlers;

  useEffect(() => {
    if (!typePickerOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!typePickerRef.current?.contains(event.target)) {
        setTypePickerOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setTypePickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [typePickerOpen]);

  useEffect(() => {
    if (!isExpanded) {
      setTypePickerOpen(false);
    }
  }, [isExpanded]);

  const summaryTiles = [
    {
      label: "Safe",
      value: canSafelyInvest ? fmt(safeToInvest) : "₱0",
      valueClassName: canSafelyInvest ? "text-emerald-300" : tone.value,
    },
    {
      label: "Type",
      value: selectedType,
    },
    {
      label: "Status",
      value: canSafelyInvest ? "Ready" : "Wait",
      valueClassName: canSafelyInvest ? "text-emerald-300" : tone.value,
    },
  ];

  const selectedTypeOption =
    INVESTMENT_TYPES.find((type) => type.value === investmentType) ||
    INVESTMENT_TYPES[0];

  const handleTypeSelect = (value) => {
    setInvestmentType(value);
    setTypePickerOpen(false);
  };

  return (
    <div
      className={`relative flex h-full min-h-[inherit] flex-col overflow-hidden rounded-3xl border text-white shadow-[0_22px_60px_rgba(0,0,0,0.38),0_0_34px_rgba(0,255,220,0.08),0_0_48px_rgba(126,34,206,0.10)] transition-all duration-200 ${tone.border}`}
    >
      <div className="absolute inset-0" style={{ background: tone.background }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_31%),radial-gradient(circle_at_bottom_right,rgba(126,34,206,0.20),transparent_33%),linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.00)_38%,rgba(255,255,255,0.02)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-black/16 to-black/30" />
      <div className="pointer-events-none absolute bottom-[-135px] right-[-92px] h-[230px] w-[230px] rounded-full bg-violet-400/[0.09] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/10" />

      <div className="relative z-10 flex h-full min-h-0 flex-col p-4 pb-4">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="min-h-0">
            <div className="mb-3 flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border backdrop-blur-sm ${tone.iconShell}`}>
                <TrendingUp className={`h-4 w-4 ${tone.icon}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-base font-semibold tracking-tight text-white">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-white/76">
                      {subtitle || "Decide before you invest"}
                    </p>
                  </div>

                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold backdrop-blur-sm ${tone.status}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className={`text-[32px] font-bold leading-none tracking-[-0.04em] ${tone.value}`}>
                {mainLabel}
              </p>
              <p className="mt-2 text-sm font-semibold leading-tight text-white/82">
                {canSafelyInvest ? "Safe amount you may plan." : "Build protection first."}
              </p>
            </div>

            <div className="mb-1 grid grid-cols-3 gap-2">
              {summaryTiles.map((tile) => (
                <div key={tile.label} className={tileClass}>
                  <p className={`truncate text-[13px] font-black leading-none tracking-[-0.025em] ${tile.valueClassName || "text-white/92"}`}>
                    {tile.value}
                  </p>
                  <p className="mt-1.5 text-[8px] font-black uppercase tracking-[0.18em] text-white/42">
                    {tile.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-white/6 pt-2">
            <button
              type="button"
              onClick={handleToggleDetails}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 text-sm font-medium text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:bg-white/10"
              aria-expanded={isExpanded}
            >
              <span>{isExpanded ? "Hide details" : "Show details"}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/15 p-3 backdrop-blur-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="grid grid-cols-3 gap-2 text-center text-sm text-white">
              {[
                [statOneLabel, statOneValue],
                [statTwoLabel, statTwoValue],
                [statThreeLabel, statThreeValue],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-black/20 px-2.5 py-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                    {label}
                  </p>
                  <p className="truncate text-sm font-bold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div ref={typePickerRef}>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Investment type
              </label>

              <button
                type="button"
                onClick={() => setTypePickerOpen((value) => !value)}
                className={`${inputClass} ${tone.focus} flex items-center justify-between gap-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:bg-white/[0.055]`}
                aria-haspopup="listbox"
                aria-expanded={typePickerOpen}
              >
                <span className="truncate">{selectedTypeOption?.label || selectedType}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-white/62 transition-transform duration-200 ${
                    typePickerOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {typePickerOpen && (
                <div
                  role="listbox"
                  className="mt-2 overflow-hidden rounded-2xl border border-white/12 bg-slate-950/95 p-1.5 shadow-[0_18px_46px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl"
                >
                  {INVESTMENT_TYPES.map((type) => {
                    const selected = type.value === investmentType;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => handleTypeSelect(type.value)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                          selected
                            ? "bg-cyan-400/14 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                            : "text-white/76 hover:bg-white/[0.075] hover:text-white"
                        }`}
                      >
                        <span>{type.label}</span>
                        {selected && <Check className="h-4 w-4 text-cyan-200" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
                Money to invest
              </label>
              <input
                type="number"
                min="0"
                value={plannedAmount}
                onChange={(event) => setPlannedAmount(event.target.value)}
                placeholder="0"
                className={`${inputClass} ${tone.focus}`}
              />
              <p className="mt-1.5 text-[11px] font-medium text-white/60">
                {amountStatus}
              </p>
            </div>

            <p className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-xs font-medium leading-relaxed text-white/62">
              {description}
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePlanInvestment}
                className={`flex items-center justify-center rounded-2xl border px-3 py-2.5 text-sm font-semibold ${tone.primaryButton}`}
              >
                Plan
              </button>

              <button
                type="button"
                onClick={handleAskClara}
                className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/10 hover:text-white"
              >
                Ask CLARA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
