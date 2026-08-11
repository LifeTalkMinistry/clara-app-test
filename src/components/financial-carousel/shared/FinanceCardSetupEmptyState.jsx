import { useState } from "react";
import { Info } from "lucide-react";
import FinanceCardExpandButton from "./FinanceCardExpandButton";

export default function FinanceCardSetupEmptyState({
  title,
  info,
  cta,
  Icon,
  iconClass = "border-cyan-200/18 bg-cyan-300/[0.08] text-cyan-100",
  buttonClass = "border-cyan-200/20 bg-cyan-300/[0.11] text-cyan-100 hover:bg-cyan-300/[0.16]",
  detailKey,
  expanded = false,
  onSetup,
  onToggleDetails,
  collapsedLabel,
  expandedLabel,
}) {
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="relative z-10 flex h-full min-h-0 flex-col overflow-hidden px-4 pb-4 pt-5">
      <div
        className={`relative flex min-h-0 flex-col gap-4 ${
          expanded ? "flex-1" : ""
        }`}
      >
        <div
          className={`relative overflow-hidden rounded-[28px] border border-white/[0.045] bg-black/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.026)] ${
            expanded
              ? "flex min-h-[360px] flex-1 flex-col justify-center px-5 py-7"
              : "px-4 py-5"
          }`}
        >
          <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-300/[0.07] blur-[58px]" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-violet-500/[0.10] blur-[62px]" />

          <div className="relative flex flex-col items-center text-center">
            <div
              className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border shadow-[0_0_18px_rgba(34,211,238,0.10)] ${iconClass}`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex items-center justify-center gap-2">
              <h3 className="text-xl font-black tracking-[-0.025em] text-white">
                {title}
              </h3>
              <button
                type="button"
                onClick={() => setInfoOpen((value) => !value)}
                aria-label={`About ${title}`}
                aria-expanded={infoOpen}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                  infoOpen
                    ? "border-cyan-200/30 bg-cyan-300/[0.14] text-cyan-100"
                    : "border-white/12 bg-white/[0.055] text-white/58 hover:border-cyan-200/24 hover:text-cyan-100"
                }`}
              >
                <Info className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onSetup}
              className={`mt-5 flex w-full items-center justify-center rounded-2xl border px-4 py-3.5 text-sm font-black shadow-[0_0_18px_rgba(34,211,238,0.08)] transition ${buttonClass}`}
            >
              {cta}
            </button>

            {infoOpen ? (
              <div className="mt-3 w-full rounded-2xl border border-cyan-200/12 bg-[#071a31] px-3.5 py-2.5 text-[11px] font-semibold leading-5 text-white/64 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {info}
              </div>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.035] pt-3">
          <FinanceCardExpandButton
            detailKey={detailKey}
            expanded={expanded}
            onToggleDetails={onToggleDetails}
            collapsedLabel={collapsedLabel}
            expandedLabel={expandedLabel}
            className="border-white/[0.045] bg-black/[0.105] py-3 font-medium text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.028),0_10px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm hover:border-white/[0.07] hover:bg-white/[0.04]"
          />
        </div>
      </div>
    </div>
  );
}
