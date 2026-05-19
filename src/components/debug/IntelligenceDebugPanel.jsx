import { useEffect, useMemo, useState } from "react";
import { Activity, Database, RadioTower, ShieldAlert, TimerReset } from "lucide-react";
import { getClaraIntelligenceOrchestrator, INTELLIGENCE_EVENTS } from "../../lib/claraIntelligenceOrchestrator";

function formatMs(value) {
  const ms = Number(value || 0);
  if (ms <= 0) return "ready";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`;
  return `${Math.ceil(ms / 60_000)}m`;
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <div className="flex items-center gap-2 text-white/42">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        <p className="text-[9px] font-black uppercase tracking-[0.14em]">{label}</p>
      </div>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}

export default function IntelligenceDebugPanel() {
  const [state, setState] = useState(() => getClaraIntelligenceOrchestrator().getDebugState());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const update = () => setState(getClaraIntelligenceOrchestrator().getDebugState());
    window.addEventListener(INTELLIGENCE_EVENTS.DEBUG, update);
    const id = window.setInterval(update, 2000);
    return () => {
      window.removeEventListener(INTELLIGENCE_EVENTS.DEBUG, update);
      window.clearInterval(id);
    };
  }, []);

  const cooldowns = useMemo(() => Object.entries(state.cooldowns || {}), [state.cooldowns]);

  if (typeof window !== "undefined" && window.localStorage?.getItem("clara_debug_intelligence") !== "true") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[99999] w-[min(390px,calc(100vw-24px))] rounded-[28px] border border-cyan-100/14 bg-[#061327]/92 p-3 shadow-[0_24px_80px_rgba(0,0,0,.52)] backdrop-blur-2xl">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/[0.035] px-4 py-3 text-left text-white"
      >
        <span>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/56">CLARA Internal</p>
          <p className="text-sm font-black">Intelligence Debug Panel</p>
        </span>
        <Activity className="h-5 w-5 text-cyan-100/72" />
      </button>

      {open ? (
        <div className="mt-3 max-h-[70vh] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Active locks" value={state.activeLocks?.length || 0} icon={ShieldAlert} />
            <Stat label="Queued jobs" value={state.queuedJobs?.length || 0} icon={TimerReset} />
            <Stat label="Events" value={state.eventDispatchCount || 0} icon={RadioTower} />
            <Stat label="Memory writes" value={state.memoryWriteCount || 0} icon={Database} />
          </div>

          <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Remote sync</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/60">
              Mode: {state.remoteSync?.mode || "online"} • Disabled: {state.remoteSync?.disabled ? "yes" : "no"} • Cooldown: {formatMs(state.remoteSync?.disabledForMs)}
            </p>
            {state.remoteSync?.lastFailureReason ? (
              <p className="mt-1 text-[11px] font-semibold leading-5 text-rose-100/62">{state.remoteSync.lastFailureReason}</p>
            ) : null}
          </section>

          <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Dirty flags</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(state.dirtyFlags || []).length ? state.dirtyFlags.map((flag) => (
                <span key={flag} className="rounded-full border border-cyan-100/12 bg-cyan-200/8 px-2 py-1 text-[10px] font-black text-cyan-50/72">{flag}</span>
              )) : <span className="text-xs font-semibold text-white/42">none</span>}
            </div>
          </section>

          <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Cooldowns</p>
            <div className="mt-2 space-y-1">
              {cooldowns.length ? cooldowns.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 text-[11px] font-semibold text-white/54">
                  <span className="truncate">{key}</span>
                  <span>{formatMs(value)}</span>
                </div>
              )) : <p className="text-xs font-semibold text-white/42">none</p>}
            </div>
          </section>

          <section className="mt-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/38">Recent jobs</p>
            <div className="mt-2 space-y-2">
              {(state.jobHistory || []).slice(0, 8).map((job, index) => (
                <div key={`${job.jobKey}-${index}`} className="rounded-xl bg-white/[0.025] px-2.5 py-2">
                  <p className="text-[11px] font-black text-white/74">{job.jobKey}</p>
                  <p className="text-[10px] font-semibold text-white/38">{job.status} • {job.reason || job.error || job.at}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
