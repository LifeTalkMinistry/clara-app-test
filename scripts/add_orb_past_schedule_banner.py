from pathlib import Path

path = Path('src/components/community/ClaraOrbPage.jsx')
text = path.read_text()

helper_anchor = 'const COMMAND_VISIBLE_STATES = new Set([\n'
helper = '''const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2_";
const CLARA_FINANCE_DATA_UPDATED_EVENT = "clara:finance-data-updated";

function readPastOrbSchedule() {
  if (typeof window === "undefined") return null;
  const today = toDateKey(new Date());
  const matches = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith(SCHEDULE_STORAGE_PREFIX)) continue;
    try {
      const events = JSON.parse(window.localStorage.getItem(key) || "[]");
      if (!Array.isArray(events)) continue;
      events.forEach((event) => {
        const date = String(event?.date || "").slice(0, 10);
        if (!date || date >= today) return;
        matches.push({ storageKey: key, event, date });
      });
    } catch {}
  }

  matches.sort((a, b) => a.date.localeCompare(b.date));
  return matches[0] || null;
}

function writeOrbScheduleResolution(storageKey, updater) {
  if (typeof window === "undefined" || !storageKey) return;
  try {
    const current = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
    if (!Array.isArray(current)) return;
    window.localStorage.setItem(storageKey, JSON.stringify(updater(current)));
    window.dispatchEvent(new CustomEvent(CLARA_FINANCE_DATA_UPDATED_EVENT));
  } catch {}
}

'''
if 'const SCHEDULE_STORAGE_PREFIX = "clara_schedule_events_v2_";' not in text:
    if helper_anchor not in text:
        raise SystemExit('helper anchor not found')
    text = text.replace(helper_anchor, helper + helper_anchor, 1)

state_anchor = '  const [launching, setLaunching] = useState(false);\n'
state_insert = state_anchor + '''  const [pastSchedule, setPastSchedule] = useState(null);
  const [reschedulingPastSchedule, setReschedulingPastSchedule] = useState(false);
  const [pastScheduleDate, setPastScheduleDate] = useState("");
'''
if 'const [pastSchedule, setPastSchedule]' not in text:
    if state_anchor not in text:
        raise SystemExit('state anchor not found')
    text = text.replace(state_anchor, state_insert, 1)

fx_anchor = '''  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.add("clara-orb-page-active");
    return () => document.body.classList.remove("clara-orb-page-active");
  }, []);
'''
fx_insert = fx_anchor + '''
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const refreshPastSchedule = () => setPastSchedule(readPastOrbSchedule());
    refreshPastSchedule();
    window.addEventListener(CLARA_FINANCE_DATA_UPDATED_EVENT, refreshPastSchedule);
    window.addEventListener("focus", refreshPastSchedule);
    return () => {
      window.removeEventListener(CLARA_FINANCE_DATA_UPDATED_EVENT, refreshPastSchedule);
      window.removeEventListener("focus", refreshPastSchedule);
    };
  }, []);

  const removePastSchedule = () => {
    if (!pastSchedule) return;
    writeOrbScheduleResolution(pastSchedule.storageKey, (events) =>
      events.filter((event) => String(event?.id) !== String(pastSchedule.event?.id))
    );
    setReschedulingPastSchedule(false);
    setPastScheduleDate("");
    setPastSchedule(readPastOrbSchedule());
  };

  const startPastScheduleReschedule = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPastScheduleDate(toDateKey(tomorrow));
    setReschedulingPastSchedule(true);
  };

  const applyPastScheduleReschedule = () => {
    if (!pastSchedule || !pastScheduleDate || pastScheduleDate <= toDateKey(new Date())) return;
    writeOrbScheduleResolution(pastSchedule.storageKey, (events) =>
      events.map((event) =>
        String(event?.id) === String(pastSchedule.event?.id)
          ? { ...event, date: pastScheduleDate }
          : event
      )
    );
    setReschedulingPastSchedule(false);
    setPastScheduleDate("");
    setPastSchedule(readPastOrbSchedule());
  };
'''
if 'const removePastSchedule = () =>' not in text:
    if fx_anchor not in text:
        raise SystemExit('effect anchor not found')
    text = text.replace(fx_anchor, fx_insert, 1)

main_anchor = '''    >
      <style>{`
'''
banner = '''    >
      {pastSchedule ? (
        <section className="absolute left-4 right-4 top-4 z-50 mx-auto max-w-[560px] rounded-[26px] border border-amber-200/25 bg-[linear-gradient(135deg,rgba(42,27,5,.97),rgba(12,11,31,.98)_58%,rgba(34,18,55,.96))] p-4 text-left shadow-[0_18px_60px_rgba(0,0,0,.48),0_0_28px_rgba(251,191,36,.08)] backdrop-blur-2xl" data-clara-orb-past-schedule-banner="true">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-amber-100/15 bg-amber-300/10 text-lg">⏳</div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[.20em] text-amber-100/55">Needs review</p>
              <h2 className="mt-1 truncate text-[17px] font-black text-white">{pastSchedule.event?.title || "Past schedule"}</h2>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-white/58">This schedule already passed. Remove it or move it to a new date.</p>
            </div>
          </div>

          {reschedulingPastSchedule ? (
            <div className="mt-4 flex gap-2">
              <input
                type="date"
                min={toDateKey(new Date(Date.now() + 86400000))}
                value={pastScheduleDate}
                onChange={(event) => setPastScheduleDate(event.target.value)}
                className="min-h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/25 px-3 text-[13px] font-bold text-white outline-none"
              />
              <button type="button" onClick={applyPastScheduleReschedule} className="min-h-12 rounded-2xl border border-cyan-200/20 bg-cyan-300/12 px-5 text-[12px] font-black text-cyan-50">Move</button>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={removePastSchedule} className="min-h-12 rounded-2xl border border-white/10 bg-white/[.04] px-4 text-[12px] font-black text-white/72">Remove</button>
              <button type="button" onClick={startPastScheduleReschedule} className="min-h-12 rounded-2xl border border-cyan-200/20 bg-cyan-300/12 px-4 text-[12px] font-black text-cyan-50">Reschedule</button>
            </div>
          )}
        </section>
      ) : null}
      <style>{`
'''
if 'data-clara-orb-past-schedule-banner="true"' not in text:
    if main_anchor not in text:
        raise SystemExit('main anchor not found')
    text = text.replace(main_anchor, banner, 1)

checks = [
    'readPastOrbSchedule()',
    'data-clara-orb-past-schedule-banner="true"',
    'const removePastSchedule = () =>',
    'const applyPastScheduleReschedule = () =>',
]
for check in checks:
    if check not in text:
        raise SystemExit(f'missing invariant: {check}')

path.write_text(text)
