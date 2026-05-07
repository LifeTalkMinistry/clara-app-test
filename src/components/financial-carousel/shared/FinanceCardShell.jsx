import {
  FINANCE_CARD_GLOW_LAYERS,
  FINANCE_CARD_SURFACE_CLASS,
} from "./financeCardStyles";

export default function FinanceCardShell({
  cardKey = "finance",
  expanded = false,
  ringClass = "",
  roundedClass = "rounded-[30px]",
  shadowClass = "shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_42px_rgba(0,255,220,0.10),0_0_62px_rgba(126,34,206,0.12)]",
  surfaceClassName = "",
  children,
}) {
  return (
    <div
      data-finance-card={cardKey}
      data-expanded={expanded ? "true" : "false"}
      className={[
        "clara-finance-bubble-card",
        `clara-finance-bubble-${cardKey}`,
        FINANCE_CARD_SURFACE_CLASS,
        roundedClass,
        shadowClass,
        ringClass,
        surfaceClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {FINANCE_CARD_GLOW_LAYERS.map((className, index) => (
        <div key={`${cardKey}-glow-${index}`} className={className} />
      ))}

      {children}
    </div>
  );
}
