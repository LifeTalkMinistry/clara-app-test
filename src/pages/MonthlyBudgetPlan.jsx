import { useLayoutEffect, useRef } from "react";
import MonthlyBudgetPlanGuided from "./monthly-budget-plan/MonthlyBudgetPlanGuided";

const STEP_LABELS = ["Amount", "Cycle", "Protection", "Categories", "Review"];

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

      const eyebrow = header.querySelector("p:not([data-budget-progress-text])");
      const title = header.querySelector("h1");
      const progressSection = Array.from(root.querySelectorAll("section")).find((section) =>
        /step\s*\d+\s*of\s*5/i.test(section.textContent || ""),
      );
      const stepMatch = progressSection?.textContent?.match(/step\s*(\d+)\s*of\s*5/i);
      const currentStep = Math.min(5, Math.max(1, Number(stepMatch?.[1]) || 1));
      const currentLabel = STEP_LABELS[currentStep - 1];

      if (eyebrow) {
        eyebrow.setAttribute("aria-hidden", "true");
        eyebrow.style.display = "none";
      }

      if (title && title.textContent !== "Budget Setup") {
        title.textContent = "Budget Setup";
        title.setAttribute("aria-label", "Budget Setup");
      }

      if (progressSection) {
        progressSection.setAttribute("aria-hidden", "true");
        progressSection.style.display = "none";
      }

      if (title?.parentElement) {
        let progressText = title.parentElement.querySelector("[data-budget-progress-text]");

        if (!progressText) {
          progressText = document.createElement("p");
          progressText.setAttribute("data-budget-progress-text", "true");
          progressText.setAttribute("aria-live", "polite");
          Object.assign(progressText.style, {
            display: "block",
            margin: "2px 0 0",
            color: "rgba(207, 250, 254, 0.58)",
            fontSize: "9px",
            fontWeight: "800",
            letterSpacing: "0.12em",
            lineHeight: "1.2",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          });
          title.insertAdjacentElement("afterend", progressText);
        }

        const nextProgressText = `Step ${currentStep} of 5 · ${currentLabel}`;
        if (progressText.textContent !== nextProgressText) {
          progressText.textContent = nextProgressText;
        }
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
