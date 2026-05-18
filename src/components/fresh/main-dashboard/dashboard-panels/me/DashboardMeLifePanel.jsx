import { useEffect, useMemo, useState } from "react";
import { CLARA_ENVIRONMENT_UPDATED, countEnvironmentSignals, readEnvironmentSignals } from "./claraEnvironmentUtils";
import FinancialClimateScreen from "./FinancialClimateScreen";

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
    <div className="h-[calc(100svh-126px)] min-h-0 overflow-hidden pb-0">
      <section className="relative flex h-full min-h-0 overflow-hidden rounded-[28px] border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,55,69,.94),rgba(15,23,48,.97)_48%,rgba(47,23,83,.95))] p-3 shadow-[0_14px_46px_rgba(0,0,0,.20)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/9 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="relative min-h-0 w-full flex-1 overflow-hidden">
          <FinancialClimateScreen signals={signals} signalCount={signalCount} signalTotal={signalTotal} />
        </div>
      </section>
    </div>
  );
}
