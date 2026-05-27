import { ChevronDown, ChevronUp } from "lucide-react";
import DashboardCardIllustration from "@/components/fresh/main-dashboard/visuals/DashboardCardIllustration";
import { FINANCE_CARD_EXPAND_BUTTON_CLASS } from "./financeCardStyles";

export default function FinanceCardExpandButton({
  expanded = false,
  onToggleDetails,
  detailKey,
  className = "",
  collapsedLabel = "Show details",
  expandedLabel = "Hide details",
  visualVariant = "",
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
        "relative isolate overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {visualVariant ? <DashboardCardIllustration variant={visualVariant} /> : null}
      <span className="relative z-10 font-medium">
        {expanded ? expandedLabel : collapsedLabel}
      </span>
      {expanded ? (
        <ChevronUp className="relative z-10 h-4 w-4" />
      ) : (
        <ChevronDown className="relative z-10 h-4 w-4" />
      )}
    </button>
  );
}
