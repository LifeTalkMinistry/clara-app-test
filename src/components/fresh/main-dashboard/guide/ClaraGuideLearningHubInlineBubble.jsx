import { useEffect, useRef } from "react";

const DASHBOARD_SCROLL_ROOT_SELECTOR =
  "[data-clara-dashboard-scroll-root='true']";
const PREVIEW_STACK_SELECTOR =
  "[data-clara-guide-learning-hub-preview-stack='true']";
const GUIDE_EXIT_SELECTOR = "[data-clara-guide-exit='true']";
const DASHBOARD_TOP_NAV_ATTRIBUTE = "data-clara-dashboard-top-nav";
const GUIDE_BUBBLE_SAFE_BOTTOM_PX = 18;

function getVisibleDashboardBottom(scrollerRect) {
  if (typeof window === "undefined") return scrollerRect.bottom;

  const visualViewport = window.visualViewport;
  const viewportBottom = visualViewport
    ? visualViewport.offsetTop + visualViewport.height
    : window.innerHeight;

  return Math.min(scrollerRect.bottom, viewportBottom);
}

function getDashboardTopNav(dashboardScroller) {
  const guideExitButton = document.querySelector(GUIDE_EXIT_SELECTOR);
  let currentElement = guideExitButton;

  while (
    currentElement?.parentElement &&
    currentElement.parentElement !== dashboardScroller
  ) {
    currentElement = currentElement.parentElement;
  }

  return currentElement?.parentElement === dashboardScroller
    ? currentElement
    : null;
}

export default function ClaraGuideLearningHubInlineBubble({ onNext }) {
  const bubbleRef = useRef(null);
  const didApplyPreviewLiftRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return undefined;
    }

    const bubble = bubbleRef.current;
    const dashboardScroller = document.querySelector(
      DASHBOARD_SCROLL_ROOT_SELECTOR,
    );
    const previewStack = bubble?.closest?.(PREVIEW_STACK_SELECTOR);

    if (
      !bubble ||
      !dashboardScroller ||
      !previewStack ||
      !dashboardScroller.contains(previewStack)
    ) {
      return undefined;
    }

    const dashboardTopNav = getDashboardTopNav(dashboardScroller);
    const topNavAlreadyMarked = dashboardTopNav?.hasAttribute(
      DASHBOARD_TOP_NAV_ATTRIBUTE,
    );

    if (dashboardTopNav && !topNavAlreadyMarked) {
      dashboardTopNav.setAttribute(DASHBOARD_TOP_NAV_ATTRIBUTE, "true");
    }

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (
          didApplyPreviewLiftRef.current ||
          !bubble.isConnected ||
          !dashboardScroller.isConnected
        ) {
          return;
        }

        didApplyPreviewLiftRef.current = true;

        const scrollerRect = dashboardScroller.getBoundingClientRect();
        const bubbleRect = bubble.getBoundingClientRect();
        const visibleBottom = getVisibleDashboardBottom(scrollerRect);
        const requiredLift = Math.ceil(
          bubbleRect.bottom + GUIDE_BUBBLE_SAFE_BOTTOM_PX - visibleBottom,
        );

        if (requiredLift <= 0) return;

        const currentScrollTop = Number(dashboardScroller.scrollTop) || 0;
        const maxScrollTop = Math.max(
          0,
          dashboardScroller.scrollHeight - dashboardScroller.clientHeight,
        );
        const targetScrollTop = Math.min(
          maxScrollTop,
          currentScrollTop + requiredLift,
        );

        if (targetScrollTop <= currentScrollTop) return;

        const reduceMotion = window.matchMedia?.(
          "(prefers-reduced-motion: reduce)",
        )?.matches;

        if (typeof dashboardScroller.scrollTo === "function") {
          dashboardScroller.scrollTo({
            top: targetScrollTop,
            behavior: reduceMotion ? "auto" : "smooth",
          });
          return;
        }

        dashboardScroller.scrollTop = targetScrollTop;
      });
    });

    return () => {
      if (firstFrame) window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);

      if (dashboardTopNav && !topNavAlreadyMarked) {
        dashboardTopNav.removeAttribute(DASHBOARD_TOP_NAV_ATTRIBUTE);
      }
    };
  }, []);

  return (
    <div
      ref={bubbleRef}
      data-clara-guide-learning-hub-inline-bubble="true"
      className="mt-4 w-full"
    >
      <div
        role="dialog"
        aria-live="polite"
        aria-labelledby="clara-guide-learning-hub-inline-title"
        className="w-full rounded-[30px] border border-cyan-100/24 bg-[linear-gradient(145deg,rgba(5,18,36,0.98),rgba(10,22,54,0.98)_52%,rgba(27,18,65,0.98))] px-6 py-5 text-white shadow-[0_22px_70px_rgba(0,0,0,0.58),0_0_44px_rgba(34,211,238,0.16)] backdrop-blur-2xl"
      >
        <p
          id="clara-guide-learning-hub-inline-title"
          className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100"
        >
          LEARN • PLAY • APPLY
        </p>

        <p className="mt-3 text-[14px] font-bold leading-relaxed text-white">
          Explore lessons, money games, videos, and practical tools designed to strengthen your financial habits.
        </p>

        <p className="mt-2 text-[12px] font-semibold leading-relaxed text-white/70">
          Swipe through the Learning Hub to see what is available.
        </p>

        <p className="mt-4 border-t border-cyan-100/15 pt-4 text-[12px] font-black uppercase leading-relaxed tracking-[0.08em] text-cyan-100/90">
          LEARNING BECOMES POWERFUL WHEN YOU APPLY IT.
        </p>

        <button
          type="button"
          data-clara-guide-learning-hub-next="true"
          onClick={onNext}
          className="clara-guide-learning-hub-next mt-4 flex min-h-[48px] w-full touch-manipulation select-none items-center justify-center rounded-full border border-cyan-100/30 bg-[linear-gradient(135deg,rgba(207,250,254,0.18),rgba(103,232,249,0.10)_48%,rgba(129,140,248,0.13))] px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_12px_34px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-cyan-100/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:scale-[0.99]"
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
