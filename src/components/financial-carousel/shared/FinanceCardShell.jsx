import {
  FINANCE_CARD_GLOW_LAYERS,
  FINANCE_CARD_SURFACE_CLASS,
} from "./financeCardStyles";

const FINANCE_CARD_BOTTOM_ACTION_ALIGNMENT_CSS = `
  .clara-finance-bubble-investmentFund[data-expanded="false"] > div.relative.z-10 > div.relative.flex,
  .clara-finance-bubble-savingsGoals[data-expanded="false"] > div.relative.z-10 > div.relative.flex {
    min-height: 0;
    flex: 1 1 auto;
  }

  .clara-finance-bubble-investmentFund[data-expanded="false"] > div.relative.z-10 > div.relative.flex > div:last-child,
  .clara-finance-bubble-savingsGoals[data-expanded="false"] > div.relative.z-10 > div.relative.flex > div:last-child {
    margin-top: auto;
  }
`;

export default function FinanceCardShell({
  cardKey = "finance",
  expanded = false,
  ringClass = "",
  roundedClass = "rounded-[30px]",
  shadowClass = "shadow-[0_24px_70px_rgba(0,0,0,0.42),0_0_42px_rgba(0,255,220,0.10),0_0_62px_rgba(126,34,206,0.12)]",
  surfaceClassName = "",
  glowLayerClassNames = FINANCE_CARD_GLOW_LAYERS,
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
      <style>{FINANCE_CARD_BOTTOM_ACTION_ALIGNMENT_CSS}</style>

      {glowLayerClassNames.map((className, index) => (
        <div key={`${cardKey}-glow-${index}`} className={className} />
      ))}

      {children}
    </div>
  );
}
