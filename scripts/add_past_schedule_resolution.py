from pathlib import Path

path = Path('src/components/fresh/main-dashboard/dashboard-panels/schedule/DashboardSchedulePanel.jsx')
text = path.read_text()

state_anchor = '  const [form, setForm] = useState({ title: "", date: today, time: "", type: "Personal", amount: "", note: "" });\n'
state_insert = state_anchor + '  const [pastRescheduleId, setPastRescheduleId] = useState("");\n  const [pastRescheduleDate, setPastRescheduleDate] = useState("");\n'
if state_anchor not in text:
    raise SystemExit('state anchor not found')
text = text.replace(state_anchor, state_insert, 1)

memo_anchor = '''  const selectedEvents = byDate[selectedDate] || [];
  const selectedHoliday = getHoliday(selectedDate);
'''
memo_insert = '''  const selectedEvents = byDate[selectedDate] || [];
  const unresolvedPastEvents = useMemo(
    () => events
      .filter((event) => {
        const date = String(event?.date || "").slice(0, 10);
        return Boolean(date && date < today);
      })
      .sort((a, b) => String(a?.date || "").localeCompare(String(b?.date || ""))),
    [events, today]
  );
  const unresolvedPastEvent = unresolvedPastEvents[0] || null;
  const selectedHoliday = getHoliday(selectedDate);
'''
if memo_anchor not in text:
    raise SystemExit('memo anchor not found')
text = text.replace(memo_anchor, memo_insert, 1)

handler_anchor = '''  const openEvent = (event) => {
    setSelectedEvent(event);
    setMode("event");
  };

'''
handler_insert = handler_anchor + '''  const beginPastReschedule = (event) => {
    setPastRescheduleId(String(event?.id || ""));
    setPastRescheduleDate(addDays(fromDateKey(today), 1) ? toDateKey(addDays(fromDateKey(today), 1)) : today);
  };

  const applyPastReschedule = () => {
    if (!pastRescheduleId || !pastRescheduleDate || pastRescheduleDate <= today) return;
    setEvents((current) =>
      current.map((event) =>
        String(event?.id) === String(pastRescheduleId)
          ? { ...event, date: pastRescheduleDate }
          : event
      )
    );
    setSelectedDate(pastRescheduleDate);
    setPastRescheduleId("");
    setPastRescheduleDate("");
  };

'''
if handler_anchor not in text:
    raise SystemExit('handler anchor not found')
text = text.replace(handler_anchor, handler_insert, 1)

jsx_anchor = '      <MonthlyInsightCard insight={monthlyInsight} />\n'
jsx_insert = '''      {unresolvedPastEvent ? (
        <section className="mx-4 mb-4 rounded-[22px] border border-amber-200/20 bg-[linear-gradient(135deg,rgba(88,56,9,.34),rgba(27,16,4,.42))] p-4 shadow-[0_14px_34px_rgba(0,0,0,.22)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-100/60">Past schedule</p>
              <h3 className="mt-1 truncate text-[15px] font-black text-white">{getEventIcon(unresolvedPastEvent)} {displayTitle(unresolvedPastEvent)}</h3>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-white/55">This event has already passed. Remove it now or reschedule it.</p>
              {unresolvedPastEvents.length > 1 ? (
                <p className="mt-1 text-[10px] font-bold text-white/30">{unresolvedPastEvents.length} past schedules need review.</p>
              ) : null}
            </div>
          </div>

          {pastRescheduleId === String(unresolvedPastEvent.id) ? (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="date"
                min={addDays(fromDateKey(today), 1) ? toDateKey(addDays(fromDateKey(today), 1)) : today}
                value={pastRescheduleDate}
                onChange={(event) => setPastRescheduleDate(event.target.value)}
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-3 text-[12px] font-bold text-white outline-none"
              />
              <button
                type="button"
                onClick={applyPastReschedule}
                disabled={!pastRescheduleDate || pastRescheduleDate <= today}
                className="min-h-11 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-4 text-[11px] font-black text-cyan-50 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => remove(unresolvedPastEvent.id)}
                className="min-h-11 rounded-xl border border-white/10 bg-white/[.035] px-3 text-[11px] font-black text-white/68"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => beginPastReschedule(unresolvedPastEvent)}
                className="min-h-11 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-3 text-[11px] font-black text-cyan-50"
              >
                Reschedule
              </button>
            </div>
          )}
        </section>
      ) : null}
      <MonthlyInsightCard insight={monthlyInsight} />
'''
if jsx_anchor not in text:
    raise SystemExit('jsx anchor not found')
text = text.replace(jsx_anchor, jsx_insert, 1)

checks = [
    'const [pastRescheduleId, setPastRescheduleId] = useState("")',
    'const unresolvedPastEvents = useMemo(',
    'This event has already passed. Remove it now or reschedule it.',
    'onClick={() => remove(unresolvedPastEvent.id)}',
    'onClick={() => beginPastReschedule(unresolvedPastEvent)}',
    'const applyPastReschedule = () =>',
]
for check in checks:
    if check not in text:
        raise SystemExit(f'missing invariant: {check}')

path.write_text(text)
