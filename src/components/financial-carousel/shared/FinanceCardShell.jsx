import {
  FINANCE_CARD_GLOW_LAYERS,
  FINANCE_CARD_SURFACE_CLASS,
} from "./financeCardStyles";

export default function FinanceCardShell({
  cardKey = "finance",
  expanded = false,
  ringClass = "",
  roundedClass = "rounded-[30px]",
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
        ringClass,
        surfaceClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(135deg,#062638_0%,#071430_48%,#171342_100%)]" />

      {FINANCE_CARD_GLOW_LAYERS.map((className, index) => (
        <div key={`${cardKey}-clean-glow-${index}`} className={className} />
      ))}

      {children}
    </div>
  );
}
