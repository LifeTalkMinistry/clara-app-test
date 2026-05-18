import { useEffect, useMemo, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { clean, readMemory } from "./meMemoryUtils";
import FinancialClimateScreen from "./FinancialClimateScreen";

export default function DashboardMeLifePanel() {
  const [memory, setMemory] = useState(() => readMemory());

  const saved = useMemo(() => Object.values(memory.items || {}).filter((item) => clean(item?.value)).length, [memory]);
  const total = Math.max(saved, 1);
  const refresh = () => setMemory(readMemory());

  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener("storage", handler);
    window.addEventListener("clara-behavioral-memory-updated", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("clara-behavioral-memory-updated", handler);
    };
  }, []);

  return (
    <div className="h-[calc(100svh-126px)] min-h-[520px] overflow-hidden pb-0">
      <section className="relative flex h-full min-h-0 overflow-hidden rounded-[30px] border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,55,69,.94),rgba(15,23,48,.97)_48%,rgba(47,23,83,.95))] p-[clamp(12px,3.4vw,18px)] shadow-[0_14px_46px_rgba(0,0,0,.20)]">
        <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/9 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 bottom-10 h-72 w-72 rounded-full bg-violet-400/10 blur-3xl" />

        <div className="relative flex min-h-0 w-full flex-col">
          <div className="shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/40">Financial Environment Understanding System</p>
                <h2 className="mt-1 text-[clamp(22px,7vw,30px)] font-black leading-none text-white">Me</h2>
                <p className="mt-2 max-w-[22rem] text-[clamp(11px,3.2vw,13px)] font-semibold leading-[1.55] text-white/48">CLARA now focuses on your financial climate, life season, and real-world pressure signals.</p>
              </div>
              <button type="button" onClick={refresh} className="grid h-9 w-9 shrink-0 place-items-center rounded-[16px] border border-white/8 bg-white/[0.04] text-white/52 active:scale-95" aria-label="Refresh CLARA environment">
                <RefreshCcw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FinancialClimateScreen memory={memory} saved={saved} total={total} />
          </div>
        </div>
      </section>
    </div>
  );
}
