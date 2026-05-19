import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { CLARA_ENVIRONMENT_UPDATED, countEnvironmentSignals, readEnvironmentSignals } from "./claraEnvironmentUtils";
import FinancialClimateScreen from "./FinancialClimateScreen";

function DashboardMeLifePanel() {
  const [signals, setSignals] = useState(() => readEnvironmentSignals());

  const signalCount = useMemo(() => countEnvironmentSignals(signals), [signals]);
  const signalTotal = useMemo(() => Math.max(signalCount, 1), [signalCount]);

  const refresh = useCallback(() => {
    setSignals((current) => {
      const next = readEnvironmentSignals();
      return JSON.stringify(current || {}) === JSON.stringify(next || {}) ? current : next;
    });
  }, []);

  useEffect(() => {
    let timer = null;
    const handler = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, 180);
    };

    window.addEventListener("storage", handler);
    window.addEventListener(CLARA_ENVIRONMENT_UPDATED, handler);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handler);
      window.removeEventListener(CLARA_ENVIRONMENT_UPDATED, handler);
    };
  }, [refresh]);

  return (
    <div className="clara-me-render-island h-[calc(100svh-126px)] min-h-0 overflow-hidden rounded-[30px] bg-[#020817] shadow-[0_18px_52px_rgba(0,0,0,.24)]" data-clara-me-shell="true">
      <FinancialClimateScreen signals={signals} signalCount={signalCount} signalTotal={signalTotal} />
    </div>
  );
}

export default memo(DashboardMeLifePanel);
