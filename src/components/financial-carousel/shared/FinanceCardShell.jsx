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
        CLARA brand treatment is intentionally centralized here so Wallet,
        Income Hub, Budget, Emergency Fund, Savings, Investment and Debt
        always share one visual language even when older card internals remain.
      */}
      <div className="pointer-events-none absolute inset-0 z-[4] bg-[radial-gradient(circle_at_10%_0%,rgba(37,99,235,0.17),transparent_34%),radial-gradient(circle_at_92%_5%,rgba(250,204,21,0.045),transparent_25%),radial-gradient(circle_at_96%_100%,rgba(220,38,38,0.065),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.018),rgba(2,6,23,0.12)_100%)]" />
      <div className="pointer-events-none absolute inset-x-5 top-0 z-[5] h-px bg-gradient-to-r from-transparent via-blue-200/30 to-transparent" />

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
