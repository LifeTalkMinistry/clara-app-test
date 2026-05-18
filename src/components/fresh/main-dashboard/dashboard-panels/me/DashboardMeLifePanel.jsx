import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ChevronRight, MessageCircle, RefreshCcw } from "lucide-react";
import { buildDrawers, clean, dateLabel, readMemory } from "./meMemoryUtils";
import MeMemoryChat from "./MeMemoryChat";

export default function DashboardMeLifePanel() {
  const [memory, setMemory] = useState(() => readMemory());
  const [activeDrawerId, setActiveDrawerId] = useState(null);
  const [activeField, setActiveField] = useState(null);

  const drawers = useMemo(() => buildDrawers(memory), [memory]);
  const activeDrawer = drawers.find((drawer) => drawer.id === activeDrawerId) || null;
  const total = drawers.reduce((sum, drawer) => sum + drawer.total, 0);
  const saved = drawers.reduce((sum, drawer) => sum + drawer.saved, 0);
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
          {!activeDrawer ? (
            <>
              <div className="shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-100/40">Financial Environment Understanding System</p>
                    <h2 className="mt-1 text-[clamp(22px,7vw,30px)] font-black leading-none text-white">Me</h2>
                    <p className="mt-2 max-w-[22rem] text-[clamp(11px,3.2vw,13px)] font-semibold leading-[1.55] text-white/48">Private memory drawers for your financial behavior and life context.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-black text-white/40">{saved}/{total} learned</span>
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-white/32">{dateLabel(memory.updatedAt)}</span>
                    </div>
                  </div>
                  <button type="button" onClick={refresh} className="grid h-9 w-9 shrink-0 place-items-center rounded-[16px] border border-white/8 bg-white/[0.04] text-white/52 active:scale-95" aria-label="Refresh CLARA memory">
                    <RefreshCcw className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-[clamp(10px,2.8vw,16px)] grid min-h-0 flex-1 grid-rows-4 gap-[clamp(8px,2.4vw,12px)]">
                {drawers.map((drawer) => (
                  <button key={drawer.id} type="button" onClick={() => setActiveDrawerId(drawer.id)} className="group min-h-0 rounded-[clamp(18px,5.8vw,25px)] border border-white/8 bg-white/[0.026] px-[clamp(12px,3.4vw,16px)] py-[clamp(9px,2.8vw,14px)] text-left transition active:scale-[0.985]">
                    <div className="flex h-full min-h-0 items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-[clamp(17px,5.5vw,22px)] font-black leading-[1.05] text-white">{drawer.title}</h3>
                        <p className="mt-1 line-clamp-2 text-[clamp(10px,3vw,12px)] font-semibold leading-[1.35] text-white/34">{drawer.subtitle}</p>
                        <div className="mt-2 inline-flex rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] font-black text-white/34">{drawer.saved}/{drawer.total} saved</div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/26" />
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="shrink-0">
                <div className="flex items-start gap-3">
                  <button type="button" onClick={() => { setActiveDrawerId(null); setActiveField(null); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.045] text-white/62 active:scale-95" aria-label="Back to drawers">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[clamp(21px,6vw,26px)] font-black leading-tight text-white">{activeDrawer.title}</h2>
                    <p className="mt-1.5 line-clamp-2 text-[clamp(11px,3.2vw,14px)] font-semibold leading-5 text-white/38">{activeDrawer.subtitle}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] font-black text-white/40">{activeDrawer.saved}/{activeDrawer.total}</span>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-white/8 bg-white/[0.026] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {activeDrawer.fields.map((field) => {
                  const hasValue = clean(field.memory?.value);
                  return (
                    <button key={field.key} type="button" onClick={() => setActiveField(field)} className="w-full border-b border-white/8 py-3 text-left last:border-b-0 active:scale-[0.995]">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {hasValue ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-200/80" /> : <MessageCircle className="h-3.5 w-3.5 shrink-0 text-white/28" />}
                            <p className="truncate text-sm font-black text-white/88">{field.label}</p>
                          </div>
                          <p className={`mt-1.5 line-clamp-2 text-sm font-semibold leading-5 ${hasValue ? "text-white/58" : "text-white/30"}`}>{hasValue || "Tap to teach CLARA"}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/28" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {activeDrawer && activeField ? <MeMemoryChat drawer={activeDrawer} field={activeField} onClose={() => setActiveField(null)} onSaved={setMemory} /> : null}
    </div>
  );
}
