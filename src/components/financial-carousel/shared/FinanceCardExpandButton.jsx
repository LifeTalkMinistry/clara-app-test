import { ChevronDown, ChevronUp } from "lucide-react";
import { FINANCE_CARD_EXPAND_BUTTON_CLASS } from "./financeCardStyles";

const COLLAPSED_VIEW_BUTTON_CLASS =
  "relative !justify-center overflow-hidden !rounded-[22px] !border-cyan-100/[0.18] !bg-[linear-gradient(135deg,rgba(103,232,249,0.13),rgba(14,116,144,0.12)_42%,rgba(139,92,246,0.13))] !px-4 !py-3.5 !text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.105),0_14px_30px_rgba(0,0,0,0.18),0_0_26px_rgba(103,232,249,0.07),0_0_28px_rgba(139,92,246,0.055)] hover:!border-cyan-100/[0.30] hover:!bg-[linear-gradient(135deg,rgba(103,232,249,0.18),rgba(14,116,144,0.15)_42%,rgba(139,92,246,0.17))]";

const EXPANDED_EXIT_BUTTON_CLASS =
  "relative !justify-center overflow-hidden !rounded-[22px] !border-cyan-100/[0.22] !bg-[linear-gradient(135deg,rgba(103,232,249,0.16),rgba(14,116,144,0.15)_42%,rgba(139,92,246,0.17))] !px-4 !py-3.5 !text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.11),0_16px_34px_rgba(0,0,0,0.20),0_0_30px_rgba(103,232,249,0.08),0_0_32px_rgba(139,92,246,0.065)] hover:!border-cyan-100/[0.32] hover:!bg-[linear-gradient(135deg,rgba(103,232,249,0.22),rgba(14,116,144,0.18)_42%,rgba(139,92,246,0.21))]";

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
        expanded ? EXPANDED_EXIT_BUTTON_CLASS : COLLAPSED_VIEW_BUTTON_CLASS,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={expanded ? expandedLabel : collapsedLabel}
    >
      <span className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/55 to-transparent" />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.12),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.006)_45%,rgba(0,0,0,0.12))]" />

      <span className="relative z-10 mx-auto block min-w-0 px-8 text-center text-[13px] font-black leading-none tracking-[-0.01em] text-white/96">
        {expanded ? expandedLabel : collapsedLabel}
      </span>

      <span className="absolute right-3 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-100/[0.16] bg-black/[0.18] text-cyan-50/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-sm">
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}