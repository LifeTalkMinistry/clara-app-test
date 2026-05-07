import { ChevronDown, ChevronUp } from "lucide-react";
import { FINANCE_CARD_EXPAND_BUTTON_CLASS } from "./financeCardStyles";

export default function FinanceCardExpandButton({
  expanded = false,
  onToggleDetails,
  detailKey,
  className = "",
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
      className={[FINANCE_CARD_EXPAND_BUTTON_CLASS, className].filter(Boolean).join(" ")}
    >
      <span className="font-medium">
        {expanded ? "Hide details" : "Show details"}
      </span>
      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </button>
  );
}
