import { useEffect, useMemo, useRef, useState } from "react";
import CarouselItemCard from "./ui/CarouselItemCard";
import CarouselViewport from "./ui/CarouselViewport";
import CarouselDots from "./ui/CarouselDots";
import CarouselSlideShell from "./ui/CarouselSlideShell";
import useAutoMovingHorizontalCarousel from "./logic/useAutoMovingHorizontalCarousel";
import {
  getCarouselData,
  getDefaultCarouselIndex,
} from "./logic/FinancialCarouselLogic";
import {
  CLARA_AI_KEYBOARD_FOCUS_CLASS,
  EXPANDED_TOP_PULL,
  FINANCIAL_CAROUSEL_FOCUS_CLASS,
  FINANCIAL_CAROUSEL_FOCUS_STYLES,
  getExpandedCarouselCardIndex,
} from "./shared/financialCarouselFocus";
import { DEFAULT_FINANCIAL_CARD_KEY } from "./logic/FinancialCardRegistry";

const CLARA_MONEY_CHAT_EVENT = "clara:money-card-chat";
const CLARA_AI_TOP_PULL = "clamp(-260px, -30dvh, -120px)";
const CLARA_AI_IDLE_PULL = "clamp(-120px, -12dvh, -48px)";
const KEYBOARD_THRESHOLD = 140;

export default function FinancialCarousel(props) {
  const {
    dashboardScale = {},
    selectedDashboardTheme = {},
    themeInactiveDotClass = "bg-white/20 hover:bg-white/35",
    expandedFinanceCard,
  } = props;

  const rootRef = useRef(null);
  const initialViewportHeight = useRef(
    typeof window !== "undefined"
      ? window.visualViewport?.height || window.innerHeight
      : 0
  );

  const [isClaraConversationActive, setIsClaraConversationActive] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const items = useMemo(() => getCarouselData(props), [props]);
  const defaultIndex = useMemo(() => getDefaultCarouselIndex(items), [items]);

  const {
    carouselRef,
    activeIndex,
    scrollToIndex,
    handleScroll,
    interactionHandlers,
  } = useAutoMovingHorizontalCarousel({
    itemCount: items.length,
    defaultIndex,
    autoMove: false,
  });

  const expandedCardIndex = useMemo(
    () => getExpandedCarouselCardIndex(items, expandedFinanceCard),
    [items, expandedFinanceCard]
  );

  const budgetCardIndex = useMemo(() => {
    const index = items.findIndex(
      (item) => item?.key === DEFAULT_FINANCIAL_CARD_KEY
    );

    return index >= 0 ? index : 0;
  }, [items]);

  const isInlineFocusExpanded = expandedCardIndex >= 0;
  const isFinanceFocusMode = isInlineFocusExpanded || isClaraConversationActive;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const viewport = window.visualViewport;

    const handleViewportResize = () => {
      const currentHeight = viewport?.height || window.innerHeight;
      const keyboardOpen =
        initialViewportHeight.current - currentHeight > KEYBOARD_THRESHOLD;

      setIsKeyboardVisible(keyboardOpen);

      if (!keyboardOpen && isClaraConversationActive) {
        window.requestAnimationFrame(() => {
          rootRef.current?.scrollIntoView?.({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    };

    viewport?.addEventListener("resize", handleViewportResize);
    window.addEventListener("resize", handleViewportResize);

    return () => {
      viewport?.removeEventListener("resize", handleViewportResize);
      window.removeEventListener("resize", handleViewportResize);
    };
  }, [isClaraConversationActive]);

  useEffect(() => {
    const handleClaraMoneyChat = (event) => {
      const detail = event?.detail || {};
      const active = Boolean(detail.active);

      setIsClaraConversationActive(active);

      if (active) {
        window.requestAnimationFrame(() => {
          scrollToIndex(budgetCardIndex, "smooth");
          rootRef.current?.scrollIntoView?.({
            behavior: "smooth",
            block: "start",
          });
        });
      }
    };

    window.addEventListener(CLARA_MONEY_CHAT_EVENT, handleClaraMoneyChat);

    return () => {
      window.removeEventListener(CLARA_MONEY_CHAT_EVENT, handleClaraMoneyChat);
    };
  }, [budgetCardIndex, scrollToIndex]);

  useEffect(() => {
    if (
      expandedCardIndex < 0 ||
      typeof window === "undefined" ||
      isClaraConversationActive
    ) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollToIndex(expandedCardIndex, "smooth");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [expandedCardIndex, scrollToIndex, isClaraConversationActive]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const root = document.documentElement;

    root.classList.toggle(FINANCIAL_CAROUSEL_FOCUS_CLASS, isFinanceFocusMode);
    root.classList.toggle(
      CLARA_AI_KEYBOARD_FOCUS_CLASS,
      isClaraConversationActive && isKeyboardVisible
    );

    return () => {
      root.classList.remove(FINANCIAL_CAROUSEL_FOCUS_CLASS);
      root.classList.remove(CLARA_AI_KEYBOARD_FOCUS_CLASS);
    };
  }, [isFinanceFocusMode, isClaraConversationActive, isKeyboardVisible]);

  if (!items.length) return null;

  return (
    <div
      ref={rootRef}
      className="relative z-20 mb-5 transition-[margin-top] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        marginTop: isClaraConversationActive
          ? isKeyboardVisible
            ? CLARA_AI_TOP_PULL
            : CLARA_AI_IDLE_PULL
          : isInlineFocusExpanded
            ? EXPANDED_TOP_PULL
            : 0,
      }}
    >
      <style>{FINANCIAL_CAROUSEL_FOCUS_STYLES}</style>

      <CarouselViewport
        carouselRef={carouselRef}
        onScroll={handleScroll}
        interactionHandlers={interactionHandlers}
        clipClassName={dashboardScale.financeClip || "rounded-[28px]"}
        allowVerticalOverflow={isFinanceFocusMode}
        locked={isClaraConversationActive}
      >
        {items.map((item) => {
          const isInlineExpanded = isClaraConversationActive
            ? item?.key === DEFAULT_FINANCIAL_CARD_KEY
            : item.detailKey === expandedFinanceCard && expandedCardIndex >= 0;

          return (
            <CarouselSlideShell
              key={item.key}
              item={item}
              selectedDashboardTheme={selectedDashboardTheme}
              dashboardScale={dashboardScale}
              isExpanded={isInlineExpanded}
            >
              <CarouselItemCard
                {...props}
                item={item}
                selectedDashboardTheme={selectedDashboardTheme}
                expandedFinanceCard={expandedFinanceCard}
                isKeyboardVisible={isKeyboardVisible}
              />
            </CarouselSlideShell>
          );
        })}
      </CarouselViewport>

      <CarouselDots
        items={items}
        activeIndex={activeIndex}
        onSelect={isClaraConversationActive ? () => {} : scrollToIndex}
        dashboardScale={dashboardScale}
        selectedDashboardTheme={selectedDashboardTheme}
        themeInactiveDotClass={themeInactiveDotClass}
      />
    </div>
  );
}
