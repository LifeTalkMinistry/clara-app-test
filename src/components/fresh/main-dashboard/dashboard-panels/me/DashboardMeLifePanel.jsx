import { useEffect, useMemo, useState } from "react";
import { CLARA_ENVIRONMENT_UPDATED, countEnvironmentSignals, readEnvironmentSignals } from "./claraEnvironmentUtils";
import FinancialClimateScreen from "./FinancialClimateUniversalScreen";

export default function DashboardMeLifePanel() {
  const [signals, setSignals] = useState(() => readEnvironmentSignals());

  const signalCount = useMemo(() => countEnvironmentSignals(signals), [signals]);
  const signalTotal = Math.max(signalCount, 1);
  const refresh = () => setSignals(readEnvironmentSignals());

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener(CLARA_ENVIRONMENT_UPDATED, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(CLARA_ENVIRONMENT_UPDATED, handler);
    };
  }, []);

  return (
    <div className="h-[calc(100svh-126px)] min-h-0 overflow-hidden rounded-[30px] bg-[#020817] shadow-[0_18px_52px_rgba(0,0,0,.24)]">
      <FinancialClimateScreen signals={signals} signalCount={signalCount} signalTotal={signalTotal} />
    </div>
  );
}
