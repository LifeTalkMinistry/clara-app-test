import { createContext, useContext } from "react";
import "./collapsedFinanceOuter.css";
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

      {/* A single blue material is the finance identity. No teal, violet,
          gold/red traces, or decorative multicolor glow is painted here. */}
      <div className="pointer-events-none absolute inset-x-5 top-0 z-[5] h-px bg-white/15" />

      {glowLayers.map((className, index) => (
        <div key={`${cardKey}-glow-${index}`} className={className} />
      ))}

      {children}
    </div>
  );
}
