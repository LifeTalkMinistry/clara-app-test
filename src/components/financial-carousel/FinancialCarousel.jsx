import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CarouselItemCard from "./CarouselItemCard";
import { getEnabledCarouselItems } from "./carouselConfig";
import useCarouselData from "./useCarouselData";

const getFinanceThemeAccentClass = (tone = "emerald", isLight = false) => {
  if (isLight) {
    const lightToneMap = {
      emerald: "border-slate-300/45 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(134,239,172,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,244,0.94)_52%,rgba(236,253,245,0.96))] shadow-[0_22px_60px_rgba(16,185,129,0.10)]",
      blue: "border-slate-300/45 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.94)_52%,rgba(224,231,255,0.96))] shadow-[0_22px_60px_rgba(59,130,246,0.10)]",
      teal: "border-slate-300/45 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.94)_52%,rgba(236,254,255,0.96))] shadow-[0_22px_60px_rgba(20,184,166,0.10)]",
      gold: "border-slate-300/45 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(250,204,21,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,251,235,0.94)_52%,rgba(255,247,237,0.96))] shadow-[0_22px_60px_rgba(245,158,11,0.10)]",
    };
    return lightToneMap[tone] || lightToneMap.emerald;
  }

  const darkToneMap = {
    emerald: "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.14),transparent_42%),linear-gradient(135deg,rgba(4,25,24,0.96),rgba(6,38,36,0.93)_52%,rgba(3,19,18,0.98))] shadow-[0_28px_85px_rgba(16,185,129,0.16)]",
    blue: "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.14),transparent_42%),linear-gradient(135deg,rgba(8,18,52,0.96),rgba(12,33,80,0.93)_52%,rgba(7,15,38,0.98))] shadow-[0_28px_85px_rgba(59,130,246,0.16)]",
    teal: "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.14),transparent_42%),linear-gradient(135deg,rgba(4,23,30,0.96),rgba(5,40,48,0.93)_52%,rgba(4,17,24,0.98))] shadow-[0_28px_85px_rgba(20,184,166,0.16)]",
    gold: "border-white/15 bg-[radial-gradient(circle_at_top_left,rgba(250,204,21,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.14),transparent_42%),linear-gradient(135deg,rgba(29,18,8,0.96),rgba(43,28,13,0.93)_52%,rgba(18,11,8,0.98))] shadow-[0_28px_85px_rgba(245,158,11,0.16)]",
  };

  return darkToneMap[tone] || darkToneMap.emerald;
};

const getFinanceSlideShellClass = (cardKey, theme = null, scale = null) => {
  const toneMap = {
    emergency: theme?.moneyTone || "blue",
    wallets: theme?.moneyTone || "teal",
    budgets: theme?.monthTone || theme?.moneyTone || "gold",
    investmentFund: theme?.tipTone || theme?.moneyTone || "emerald",
    debtObligations: theme?.monthTone || "gold",
    savings: theme?.tipTone || theme?.monthTone || "emerald",
  };

  const accentClass = getFinanceThemeAccentClass(toneMap[cardKey] || "emerald", theme?.isLight === true);
  const shellBorderClass = theme?.isLight === true ? "border-slate-300/45" : "border-white/15";
  const glowCapClass = theme?.isLight === true ? "before:bg-white/70" : "before:bg-white/10";
  const innerRingClass = theme?.isLight === true ? "after:ring-slate-300/40" : "after:ring-white/6";
  const scaleSlideClass = scale?.financeSlide || "min-h-[314px] rounded-[30px] [&>*]:min-h-[312px] [&>*]:rounded-[29px]";

  return `relative isolate w-full overflow-hidden ${scaleSlideClass} ${shellBorderClass} p-[1px] backdrop-blur-sm before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-20 before:rounded-full ${glowCapClass} before:blur-3xl after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-inset ${innerRingClass} [&>*]:mb-0 [&>*]:h-full ${accentClass}`;
};

export default function FinancialCarousel(props) {
  const {
    dashboardScale,
    selectedDashboardTheme,
    themeInactiveDotClass = "bg-white/20 hover:bg-white/35",
    startClaraAiLongPress,
    endClaraAiLongPress,
    handleClaraAiOrbClickCapture,
  } = props;

  const carouselRef = useRef(null);
  const items = useMemo(() => getEnabledCarouselItems(), []);
  const [cardIndex, setCardIndex] = useState(0);
  const carouselData = useCarouselData(props);

  const hasSurvivalSetup =
    Boolean(props.profileData?.survival_setup_done) ||
    props.firstPositiveNumber?.(
      props.profileData?.monthly_survival_expense,
      props.profileData?.survival_expense,
      props.profileData?.clara_survival_expense,
      props.survivalExpense,
      props.readStoredSurvivalExpense?.(props.user?.id)
    ) > 0;

  const scrollTo = useCallback(
    (nextIndex) => {
      const safeIndex = Math.max(0, Math.min(items.length - 1, nextIndex));
      const container = carouselRef.current;
      setCardIndex(safeIndex);
      if (!container) return;

      const slideWidth = items.length > 0 ? container.scrollWidth / items.length : container.clientWidth || 0;
      container.scrollTo({ left: slideWidth * safeIndex, behavior: "smooth" });
    },
    [items.length]
  );

  const handleScroll = useCallback(() => {
    const container = carouselRef.current;
    if (!container || items.length <= 0) return;
    const slideWidth = Math.max(1, container.scrollWidth / items.length || container.clientWidth || 1);
    const index = Math.round(container.scrollLeft / slideWidth);
    setCardIndex(Math.max(0, Math.min(items.length - 1, index)));
  }, [items.length]);

  useEffect(() => {
    const container = carouselRef.current;
    if (!container) return undefined;
    let frame = null;
    const onScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(handleScroll);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    handleScroll();
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [handleScroll]);

  const dashboard = { ...props, selectedDashboardTheme, hasSurvivalSetup };

  return (
    <>
      <div className={`overflow-hidden ${dashboardScale.financeClip}`}>
        <div
          ref={carouselRef}
          onScroll={handleScroll}
          className="flex touch-pan-x items-stretch snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => {
            const shellKey = item.dashboardKey || item.key;
            const emergencyHandlers =
              item.type === "emergencyFund"
                ? {
                    onMouseDownCapture: startClaraAiLongPress,
                    onMouseUpCapture: endClaraAiLongPress,
                    onMouseLeaveCapture: endClaraAiLongPress,
                    onTouchStartCapture: startClaraAiLongPress,
                    onTouchEndCapture: endClaraAiLongPress,
                    onTouchCancelCapture: endClaraAiLongPress,
                    onClickCapture: (event) => {
                      if (handleClaraAiOrbClickCapture?.(event)) return;
                      const button = event.target?.closest?.("button");
                      const label = String(button?.textContent || "").toLowerCase();
                      if (label.includes("show details") || label.includes("hide details")) {
                        event.preventDefault();
                        event.stopPropagation();
                        props.toggleFinanceDetails?.("emergency", { autoExpand: true, forceOpen: true });
                      }
                    },
                  }
                : {};

            return (
              <div key={item.key} className="flex w-full min-w-full shrink-0 snap-center">
                <div className={getFinanceSlideShellClass(shellKey, selectedDashboardTheme, dashboardScale)} {...emergencyHandlers}>
                  <CarouselItemCard item={item} data={carouselData} dashboard={dashboard} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`flex items-center justify-center ${dashboardScale.dots}`}>
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => scrollTo(index)}
            aria-label={`Go to ${item.label} card`}
            className={`h-2 rounded-full transition-all duration-200 ${
              cardIndex === index
                ? `w-5 ${selectedDashboardTheme?.indicatorActive || "bg-emerald-400"}`
                : `w-2 ${themeInactiveDotClass}`
            }`}
          />
        ))}
      </div>
    </>
  );
}
