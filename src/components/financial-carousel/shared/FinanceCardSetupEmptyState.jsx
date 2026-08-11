import { useState } from "react";
import { Info } from "lucide-react";
import FinanceCardExpandButton from "./FinanceCardExpandButton";

export default function FinanceCardSetupEmptyState({
  title,
  info,
  cta,
  Icon,
  iconClass = "border-cyan-200/20 bg-cyan-400/[0.08] text-cyan-100",
  buttonClass = "border-cyan-300/18 bg-cyan-400/[0.08] text-cyan-100 hover:bg-cyan-400/[0.12]",
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
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <div className="w-full rounded-[28px] border border-white/[0.07] bg-black/[0.08] px-4 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-sm">
          <div
            className={`mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${iconClass}`}
          >
            <Icon className="h-4.5 w-4.5" />
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <h3 className="text-[17px] font-black tracking-[-0.025em] text-white/94">
              {title}
            </h3>
            <button
              type="button"
              onClick={() => setInfoOpen((value) => !value)}
              aria-label={`About ${title}`}
              aria-expanded={infoOpen}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-black/[0.18] text-white/68 transition hover:border-white/20 hover:text-white"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          </div>

          {infoOpen ? (
            <div className="mt-3 rounded-2xl border border-blue-200/[0.12] bg-[#071a31] px-3.5 py-3 text-left text-[11.5px] font-semibold leading-5 text-white/68 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(0,0,0,0.24)]">
              {info}
            </div>
          ) : null}

          <button
            type="button"
            onClick={onSetup}
            className={`mt-4 flex min-h-[46px] w-full items-center justify-center rounded-2xl border px-4 py-3 text-sm font-black transition ${buttonClass}`}
          >
            {cta}
          </button>
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.04] pt-3">
        <FinanceCardExpandButton
          detailKey={detailKey}
          expanded={expanded}
          onToggleDetails={onToggleDetails}
          collapsedLabel={collapsedLabel}
          expandedLabel={expandedLabel}
          className="border-white/[0.05] bg-black/[0.12] py-3 font-medium text-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_22px_rgba(0,0,0,0.14)]"
        />
      </div>
    </div>
  );
}
