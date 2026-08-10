import { createContext, useContext } from "react";
import {
  FINANCE_CARD_BRAND_OVERRIDES,
  FINANCE_CARD_GLOW_LAYERS,
  getFinanceCardGlowLayers,
  getFinanceCardShellClassName,
  normalizeFinanceCardPerformanceMode,
} from "./financeCardStyles";

const FinanceCardPerformanceModeContext = createContext("full");

export function FinanceCardPerformanceModeProvider({
  performanceMode = "full",
  children,
}) {
  return (
    <FinanceCardPerformanceModeContext.Provider
      value={normalizeFinanceCardPerformanceMode(performanceMode)}
    >
      {children}
    </FinanceCardPerformanceModeContext.Provider>
  );
}

function useFinanceCardPerformanceMode(performanceMode) {
  const contextMode = useContext(FinanceCardPerformanceModeContext);
  return normalizeFinanceCardPerformanceMode(performanceMode || contextMode);
}

export default function FinanceCardShell({
  cardKey = "finance",
  expanded = false,
  performanceMode,
  ringClass = "",
  roundedClass = "rounded-[30px]",
  shadowClass = "",
  surfaceClassName = "",
  glowLayerClassNames = FINANCE_CARD_GLOW_LAYERS,
  children,
}) {
  const inheritedPerformanceMode = useFinanceCardPerformanceMode(performanceMode);
  const activePerformanceMode = expanded ? "full" : inheritedPerformanceMode;
  const glowLayers = getFinanceCardGlowLayers(
    glowLayerClassNames,
    activePerformanceMode
  );

  return (
    <div
      data-finance-card={cardKey}
      data-expanded={expanded ? "true" : "false"}
      data-performance-mode={activePerformanceMode}
      className={[
        "clara-finance-bubble-card",
        `clara-finance-bubble-${cardKey}`,
        getFinanceCardShellClassName({
          performanceMode: activePerformanceMode,
          roundedClass,
          shadowClass,
          ringClass,
          surfaceClassName,
        }),
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <style>{FINANCE_CARD_BRAND_OVERRIDES}</style>

      {/*
        CLARA finance identity stays abstract rather than drawing a literal flag.
        Royal blue owns the material; restrained gold/red diagonal traces act as
        a quiet brand signature while the midnight base keeps the cards premium.
      */}
      <div className="clara-finance-brand-field pointer-events-none absolute inset-0 z-[4]" />
      <div className="clara-finance-brand-edge pointer-events-none absolute inset-x-5 top-0 z-[5] h-px" />

      {/*
        Performance rule:
        Carousel cards can mount active + nearby slides together.
        Keep full glow/blur treatment only for active or expanded cards.
        Medium/lite modes reduce paint cost on mobile without changing card layout.
      */}
      {glowLayers.map((className, index) => (
        <div key={`${cardKey}-glow-${index}`} className={className} />
      ))}

      {children}
    </div>
  );
}
