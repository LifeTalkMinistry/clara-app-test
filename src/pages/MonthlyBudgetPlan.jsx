import { useLayoutEffect, useRef } from "react";
import MonthlyBudgetPlanGuided from "./monthly-budget-plan/MonthlyBudgetPlanGuided";

export default function MonthlyBudgetPlan() {
  const pageRef = useRef(null);

  useLayoutEffect(() => {
    const applyHeaderLabel = () => {
      const header = pageRef.current?.querySelector("header");
      if (!header) return;

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
    };

    applyHeaderLabel();

    const observer = new MutationObserver(applyHeaderLabel);
    observer.observe(pageRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={pageRef}>
      <MonthlyBudgetPlanGuided />
    </div>
  );
}
