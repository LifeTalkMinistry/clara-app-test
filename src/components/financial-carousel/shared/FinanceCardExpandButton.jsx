import { ChevronDown, X } from "lucide-react";
import { FINANCE_CARD_EXPAND_BUTTON_CLASS } from "./financeCardStyles";

const EXPANDED_EXIT_BUTTON_CLASS =
  "relative !justify-center overflow-hidden !border-rose-200/25 !bg-[linear-gradient(135deg,rgba(251,113,133,0.18),rgba(14,116,144,0.14)_46%,rgba(124,58,237,0.16))] !px-4 !py-3.5 !text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_32px_rgba(244,63,94,0.14),0_0_30px_rgba(45,212,191,0.06)] hover:!border-rose-100/35 hover:!bg-[linear-gradient(135deg,rgba(251,113,133,0.24),rgba(14,116,144,0.17)_46%,rgba(124,58,237,0.20))]";

export default function FinanceCardExpandButton({
  expanded = false,
  onToggleDetails,
  detailKey,
  className = "",
  collapsedLabel = "Show details",
  expandedLabel = "Hide details",
}) {
  const handleClick = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof onToggleDetails === "function") {
      onToggleDetails(detailKey);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={[
        FINANCE_CARD_EXPAND_BUTTON_CLASS,
        className,
        expanded ? EXPANDED_EXIT_BUTTON_CLASS : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={expanded ? `Exit ${expandedLabel}` : collapsedLabel}
    >
      {expanded ? (
        <>
          <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-rose-100/50 to-transparent" />
          <span className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-rose-100/20 bg-black/20 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-rose-50/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            Exit
          </span>
        </>
      ) : null}

      <span
        className={
          expanded
            ? "relative z-10 mx-auto block min-w-0 px-14 text-center text-[13px] font-black leading-none tracking-[-0.01em] text-white/95"
            : "font-medium"
        }
      >
        {expanded ? expandedLabel : collapsedLabel}
      </span>

      {expanded ? (
        <span className="absolute right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-rose-100/20 bg-black/20 text-rose-50/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <X className="h-3.5 w-3.5" />
        </span>
      ) : (
        <ChevronDown className="h-4 w-4" />
      )}
    </button>
  );
}
