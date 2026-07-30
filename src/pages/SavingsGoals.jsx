import { useLayoutEffect, useRef } from "react";
import SavingsGoalsIntegrated from "./SavingsGoalsIntegrated";
import "./SavingsGoalsPremium.css";
import "./SavingsGoalsCompact.css";
import "./SavingsGoalsTopShell.css";

export default function SavingsGoals() {
  const pageRef = useRef(null);

  useLayoutEffect(() => {
    const main = pageRef.current?.closest("main");
    if (!main) return undefined;

    main.classList.add("clara-savings-goals-main");
    return () => main.classList.remove("clara-savings-goals-main");
  }, []);

  return (
    <div ref={pageRef} className="savings-goals-premium">
      <SavingsGoalsIntegrated />
    </div>
  );
}
