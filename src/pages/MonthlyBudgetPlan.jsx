import { useLayoutEffect, useRef } from "react";
import MonthlyBudgetPlanGuided from "./monthly-budget-plan/MonthlyBudgetPlanGuided";

export default function MonthlyBudgetPlan() {
  const pageRef = useRef(null);

  useLayoutEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const html = document.documentElement;
    const body = document.body;
    const previousPageStyles = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    const applyViewportLayout = () => {
      const screen = root.firstElementChild;
      const header = root.querySelector("header");
      if (!screen || !header) return;

      const eyebrow = header.querySelector("p");
      const title = header.querySelector("h1");

      if (eyebrow) {
        eyebrow.setAttribute("aria-hidden", "true");
        eyebrow.style.display = "none";
      }

      if (title && title.textContent !== "Budget Setup") {
        title.textContent = "Budget Setup";
        title.setAttribute("aria-label", "Budget Setup");
      }

      Object.assign(screen.style, {
        height: "100%",
        minHeight: "0",
        maxHeight: "100%",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
        scrollbarGutter: "stable",
        boxSizing: "border-box",
        position: "relative",
      });

      Object.assign(header.style, {
        position: "sticky",
        top: "0px",
        zIndex: "60",
        isolation: "isolate",
        background:
          "linear-gradient(105deg, rgba(5, 91, 99, 0.99), rgba(24, 32, 91, 0.99))",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        boxShadow: "0 12px 26px rgba(2, 8, 23, 0.34)",
        transform: "translateZ(0)",
      });
    };

    applyViewportLayout();

    const observer = new MutationObserver(applyViewportLayout);
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    window.addEventListener("resize", applyViewportLayout);
    window.addEventListener("orientationchange", applyViewportLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", applyViewportLayout);
      window.removeEventListener("orientationchange", applyViewportLayout);
      html.style.overflow = previousPageStyles.htmlOverflow;
      html.style.overscrollBehavior = previousPageStyles.htmlOverscroll;
      body.style.overflow = previousPageStyles.bodyOverflow;
      body.style.overscrollBehavior = previousPageStyles.bodyOverscroll;
    };
  }, []);

  return (
    <div
      ref={pageRef}
      className="h-[100svh] max-h-[100svh] min-h-0 w-full overflow-hidden overscroll-none"
      style={{ height: "100dvh", maxHeight: "100dvh" }}
    >
      <MonthlyBudgetPlanGuided />
    </div>
  );
}
