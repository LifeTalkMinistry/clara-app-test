import { ChevronDown } from "lucide-react";
import { FINANCE_CARD_EXPAND_BUTTON_CLASS } from "./financeCardStyles";

const EXPANDED_EXIT_BUTTON_CLASS =
  "relative !justify-center overflow-hidden !border-cyan-100/22 !bg-[linear-gradient(135deg,rgba(45,212,191,0.18),rgba(14,116,144,0.16)_42%,rgba(124,58,237,0.18))] !px-4 !py-3.5 !text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_32px_rgba(45,212,191,0.10),0_0_30px_rgba(124,58,237,0.08)] hover:!border-cyan-100/32 hover:!bg-[linear-gradient(135deg,rgba(45,212,191,0.24),rgba(14,116,144,0.19)_42%,rgba(124,58,237,0.22))]";

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
      aria-label={expanded ? expandedLabel : collapsedLabel}
    >
      {expanded ? (
        <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/48 to-transparent" />
      ) : null}

      <span
        className={
          expanded
            ? "relative z-10 mx-auto block min-w-0 text-center text-[13px] font-black leading-none tracking-[-0.01em] text-white/95"
            : "font-medium"
        }
      >
        {expanded ? expandedLabel : collapsedLabel}
      </span>

      {expanded ? null : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}
