import { createContext, useContext } from "react";
import {
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
  shadowClass = "shadow-[0_24px_70px_rgba(0,0,0,0.36),0_0_36px_rgba(0,255,220,0.065),0_0_60px_rgba(126,34,206,0.09),inset_0_1px_0_rgba(255,255,255,0.075)]",
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
