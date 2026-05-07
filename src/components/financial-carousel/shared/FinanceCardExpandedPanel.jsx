import { FINANCE_CARD_EXPANDED_PANEL_CLASS } from "./financeCardStyles";

export default function FinanceCardExpandedPanel({ children, className = "" }) {
  return (
    <div className={[FINANCE_CARD_EXPANDED_PANEL_CLASS, className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}
