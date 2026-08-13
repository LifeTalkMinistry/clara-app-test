import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleHelp,
  Flame,
  Gift,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { backendRequest, getStoredBackendToken } from "@/lib/clara-backend-client";

const WEEKLY_CHALLENGE_ID = "weekly-discipline-7";
const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromLocalKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  next.setHours(0, 0, 0, 0);
  return next;
}

function weeklyWindow(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);
  const sunday = addDays(monday, 6);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    return { key: localDateKey(date), date, label: DAY_LABELS[index], index };
  });
  return {
    startKey: localDateKey(monday),
    endKey: localDateKey(sunday),
    todayKey: localDateKey(today),
    dayIndex: mondayOffset,
    monday,
    sunday,
    days,
  };
}

function serverWeeklyWindow(state, fallback) {
  if (!state?.weekStartDay || !state?.weekEndDay || !state?.eligibleDay) return fallback;
  const monday = dateFromLocalKey(state.weekStartDay);
  const sunday = dateFromLocalKey(state.weekEndDay);
  const today = dateFromLocalKey(state.eligibleDay);
  if (!monday || !sunday || !today) return fallback;
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(monday, index);
    return { key: localDateKey(date), date, label: DAY_LABELS[index], index };
  });
  return {
    startKey: state.weekStartDay,
    endKey: state.weekEndDay,
    todayKey: state.eligibleDay,
    dayIndex: Math.max(0, Math.min(6, Number(state.dayIndex) || 0)),
    monday,
    sunday,
    days,
  };
}

function weekRangeLabel(windowState) {
  const start = windowState.monday;
  const end = windowState.sunday;
  const startMonth = start.toLocaleDateString(undefined, { month: "short" });
  const endMonth = end.toLocaleDateString(undefined, { month: "short" });
  if (startMonth === endMonth) return `${startMonth} ${start.getDate()}–${end.getDate()}`;
  return `${startMonth} ${start.getDate()}–${endMonth} ${end.getDate()}`;
}

function validCurrentCheckIns(entry, windowState) {
  if (entry?.weekStartKey !== windowState.startKey) return [];
  const allowed = new Set(windowState.days.map((day) => day.key));
  return [...new Set((Array.isArray(entry?.checkIns) ? entry.checkIns : []).filter((key) => allowed.has(key)))].sort();
}

function historySnapshot(entry) {
  if (!entry?.weekStartKey || !entry?.joinedAt) return null;
  return {
    weekStartKey: entry.weekStartKey,
    weekEndKey: entry.weekEndKey || null,
    joinedAt: entry.joinedAt,
    checkIns: Array.isArray(entry.checkIns) ? entry.checkIns : [],
    completedAt: entry.completedAt || null,
  };
}

function WeeklyRulesSheet({ onClose }) {
  return (
    <div className="fixed inset-0 z-[170] flex items-end justify-center bg-[#020814]/75 px-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-sm" role="presentation" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="weekly-rules-title" className="w-full max-w-xl overflow-hidden rounded-[28px] border border-white/10 bg-[#081827] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] p-5">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#facc15]/65">Weekly Mini Streak</p>
            <h3 id="weekly-rules-title" className="mt-1 text-xl font-black tracking-[-0.035em] text-white">How it works</h3>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/65" aria-label="Close weekly challenge rules">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          {[
            ["Monday → Sunday", "Every Weekly Mini Streak uses one shared CLARA week and resets when the next Monday begins."],
            ["Join intentionally", "Opening CLARA or completing Daily Money Tip does not enter you. Tap Join This Week first."],
            ["Check in here", "After joining, return to this Weekly tab and press Check In Today once per day."],
            ["Finish 7/7", "All seven Monday-to-Sunday Weekly check-ins are required to become a Weekly Finisher."],
            ["₱100 load draw", "Weekly Finishers qualify for the weekly ₱100 load draw. The 30-Day Race remains a separate Daily Money Tip competition."],
          ].map(([title, description], index) => (
            <div key={title} className="flex gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-3.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#facc15]/18 bg-[#facc15]/[0.07] text-[10px] font-black text-[#fde68a]">{index + 1}</span>
              <div>
                <p className="text-[11px] font-black text-white">{title}</p>
                <p className="mt-1 text-[10px] font-semibold leading-4 text-white/42">{description}</p>
              </div>
            </div>
          ))}
          <div className="rounded-[18px] border border-[#facc15]/16 bg-[#facc15]/[0.045] px-4 py-3 text-[10px] font-bold leading-4 text-[#fde68a]/75">
            Miss a day and 7/7 is no longer possible for that week. A completely fresh Weekly Mini Streak opens the next Monday.
          </div>
        </div>
      </section>
    </div>
  );
}

export default function WeeklyMiniStreakCard({ progress, setProgress }) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [authority, setAuthority] = useState("loading");
  const [serverState, setServerState] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const localWindow = useMemo(() => weeklyWindow(), []);
  const windowState = useMemo(
    () => (authority === "server" ? serverWeeklyWindow(serverState, localWindow) : localWindow),
    [authority, serverState, localWindow]
  );
  const entry = progress?.[WEEKLY_CHALLENGE_ID] || null;
  const localCheckIns = validCurrentCheckIns(entry, windowState);
  const checkIns = authority === "server"
    ? (Array.isArray(serverState?.checkInDays) ? serverState.checkInDays : [])
    : localCheckIns;
  const checked = new Set(checkIns);
  const joined = authority === "server"
    ? Boolean(serverState?.joined)
    : entry?.weekStartKey === windowState.startKey && Boolean(entry?.joinedAt);
  const progressCount = authority === "server"
    ? Math.max(0, Math.min(7, Number(serverState?.progress) || 0))
    : checkIns.length;
  const completed = authority === "server" ? Boolean(serverState?.completed) : progressCount === 7;
  const alreadyCheckedIn = authority === "server"
    ? Boolean(serverState?.checkedInToday)
    : checked.has(windowState.todayKey);
  const progressPercent = Math.round((progressCount / 7) * 100);

  const mirrorServerState = (nextState) => {
    if (!nextState?.joined) return;
    setProgress((current) => {
      const currentEntry = current?.[WEEKLY_CHALLENGE_ID] || {};
      const previous = currentEntry.weekStartKey && currentEntry.weekStartKey !== nextState.weekStartDay
        ? historySnapshot(currentEntry)
        : null;
      const history = Array.isArray(currentEntry.weekHistory) ? currentEntry.weekHistory : [];
      return {
        ...current,
        [WEEKLY_CHALLENGE_ID]: {
          ...currentEntry,
          weekStartKey: nextState.weekStartDay,
          weekEndKey: nextState.weekEndDay,
          joinedAt: nextState.joinedAt || currentEntry.joinedAt || new Date().toISOString(),
          checkIns: Array.isArray(nextState.checkInDays) ? nextState.checkInDays : [],
          completedAt: nextState.completedAt || null,
          weekHistory: previous ? [previous, ...history].slice(0, 12) : history,
        },
      };
    });
  };

  useEffect(() => {
    const token = getStoredBackendToken();
    if (!token) {
      setAuthority("local");
      return undefined;
    }
    let cancelled = false;
    backendRequest("/api/users/me/weekly-challenge", { token })
      .then((data) => {
        if (cancelled) return;
        setServerState(data || null);
        setAuthority("server");
        mirrorServerState(data);
      })
      .catch(() => {
        if (!cancelled) setAuthority("local");
      });
    return () => {
      cancelled = true;
    };
    // Initial authority handshake only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinLocally = () => {
    setProgress((current) => {
      const currentEntry = current?.[WEEKLY_CHALLENGE_ID] || {};
      if (currentEntry.weekStartKey === windowState.startKey && currentEntry.joinedAt) return current;
      const previous = historySnapshot(currentEntry);
      const history = Array.isArray(currentEntry.weekHistory) ? currentEntry.weekHistory : [];
      return {
        ...current,
        [WEEKLY_CHALLENGE_ID]: {
          ...currentEntry,
          weekStartKey: windowState.startKey,
          weekEndKey: windowState.endKey,
          joinedAt: new Date().toISOString(),
          checkIns: [],
          completedAt: null,
          weekHistory: previous ? [previous, ...history].slice(0, 12) : history,
        },
      };
    });
  };

  const joinThisWeek = async () => {
    if (busy) return;
    setActionError("");
    if (authority !== "server") {
      joinLocally();
      return;
    }
    const token = getStoredBackendToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await backendRequest("/api/users/me/weekly-challenge/join", { method: "POST", token });
      setServerState(data || null);
      mirrorServerState(data);
    } catch (error) {
      setActionError(error?.message || "CLARA could not join this week's mini streak.");
    } finally {
      setBusy(false);
    }
  };

  const checkInLocally = () => {
    if (!joined || alreadyCheckedIn || completed) return;
    setProgress((current) => {
      const currentEntry = current?.[WEEKLY_CHALLENGE_ID] || {};
      if (currentEntry.weekStartKey !== windowState.startKey || !currentEntry.joinedAt) return current;
      const currentCheckIns = validCurrentCheckIns(currentEntry, windowState);
      if (currentCheckIns.includes(windowState.todayKey)) return current;
      const nextCheckIns = [...currentCheckIns, windowState.todayKey].sort();
      return {
        ...current,
        [WEEKLY_CHALLENGE_ID]: {
          ...currentEntry,
          checkIns: nextCheckIns,
          completedAt: nextCheckIns.length === 7
            ? currentEntry.completedAt || new Date().toISOString()
            : currentEntry.completedAt || null,
        },
      };
    });
  };

  const checkInToday = async () => {
    if (!joined || alreadyCheckedIn || completed || busy) return;
    setActionError("");
    if (authority !== "server") {
      checkInLocally();
      return;
    }
    const token = getStoredBackendToken();
    if (!token) return;
    setBusy(true);
    try {
      const data = await backendRequest("/api/users/me/weekly-challenge/check-in", { method: "POST", token });
      setServerState(data || null);
      mirrorServerState(data);
    } catch (error) {
      setActionError(error?.message || "CLARA could not secure today's Weekly check-in.");
    } finally {
      setBusy(false);
    }
  };

  const action = authority === "loading"
    ? { label: "Loading This Week…", icon: Flame, disabled: true, onClick: undefined }
    : !joined
      ? { label: "Join This Week", icon: Trophy, disabled: busy, onClick: joinThisWeek }
      : completed
        ? { label: "Weekly Finisher · You're In", icon: Trophy, disabled: true, onClick: undefined }
        : alreadyCheckedIn
          ? { label: `Day ${progressCount} Secured`, icon: Check, disabled: true, onClick: undefined }
          : { label: busy ? "Securing Check-In…" : "Check In Today", icon: Flame, disabled: busy, onClick: checkInToday };
  const ActionIcon = action.icon;

  return (
    <>
      <section className="overflow-hidden rounded-[26px] border border-[#facc15]/16 bg-[#0a1a29]">
        <div className="relative border-b border-white/[0.07] p-5">
          <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#facc15]/[0.065] blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#facc15]/22 bg-[#facc15]/[0.06] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#fde68a]">
                <Target className="h-3 w-3" /> Weekly Mini Streak
              </span>
              <button type="button" onClick={() => setRulesOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.035] text-white/50 transition hover:text-white/80" aria-label="View Weekly Mini Streak rules">
                <CircleHelp className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-4 text-[22px] font-black tracking-[-0.035em] text-white">₱100 Load Weekly Draw</h3>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">This week</p>
                <p className="mt-1 text-[11px] font-black text-white">{weekRangeLabel(windowState)}</p>
              </div>
              <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">Your streak</p>
                <p className="mt-1 text-lg font-black text-white">{progressCount}<span className="text-[10px] text-white/30">/7</span></p>
              </div>
              <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3">
                <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">Reset</p>
                <p className="mt-1 text-[11px] font-black text-white">Monday</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {windowState.days.map((day) => {
                const isChecked = checked.has(day.key);
                const isToday = day.key === windowState.todayKey;
                const isPastMissed = joined && day.index < windowState.dayIndex && !isChecked;
                return (
                  <div key={day.key} className={`flex min-w-0 flex-col items-center rounded-[13px] border px-1 py-2 ${isChecked ? "border-[#22c7b8]/25 bg-[#22c7b8]/10" : isPastMissed ? "border-[#fb7185]/14 bg-[#fb7185]/[0.035]" : isToday ? "border-[#facc15]/25 bg-[#facc15]/[0.055]" : "border-white/[0.07] bg-white/[0.018]"}`}>
                    <span className={`text-[8px] font-black ${isToday ? "text-[#fde68a]" : "text-white/35"}`}>{day.label}</span>
                    <span className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black ${isChecked ? "bg-[#22c7b8]/18 text-[#99f6e4]" : isPastMissed ? "text-[#fb7185]/55" : "text-white/22"}`}>
                      {isChecked ? <Check className="h-3 w-3" /> : day.date.getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-[#facc15] transition-[width] duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
        <div className="p-4">
          <button type="button" onClick={action.onClick} disabled={action.disabled} className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition ${completed ? "cursor-default border border-[#facc15]/22 bg-[#facc15]/[0.07] text-[#fde68a]" : action.disabled ? "cursor-default border border-white/10 bg-white/[0.035] text-white/42" : "bg-[#1677f2] text-white shadow-[0_12px_28px_rgba(22,119,242,.18)] active:scale-[0.99]"}`}>
            <ActionIcon className="h-4 w-4" /> {action.label}
          </button>
          {actionError ? (
            <p className="mt-2.5 text-center text-[9px] font-semibold text-[#fecdd3]/65">{actionError}</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-[22px] border border-white/[0.08] bg-[#091727] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#facc15]/58">Weekly draw</p>
            <p className="mt-1 text-sm font-black text-white">Finish the shared week.</p>
          </div>
          <Gift className="h-5 w-5 text-[#fde68a]/70" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-[15px] border border-white/[0.07] bg-white/[0.02] px-2.5 py-3 text-center"><p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/28">Prize</p><p className="mt-1 text-[11px] font-black text-[#fde68a]">₱100 Load</p></div>
          <div className="rounded-[15px] border border-white/[0.07] bg-white/[0.02] px-2.5 py-3 text-center"><p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/28">Qualify</p><p className="mt-1 text-[11px] font-black text-white">Finish 7/7</p></div>
          <div className="rounded-[15px] border border-white/[0.07] bg-white/[0.02] px-2.5 py-3 text-center"><p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/28">Cycle</p><p className="mt-1 text-[11px] font-black text-white">Mon–Sun</p></div>
        </div>
        {completed ? (
          <div className="mt-3 flex items-center gap-2 rounded-[16px] border border-[#facc15]/16 bg-[#facc15]/[0.045] px-3 py-2.5 text-[10px] font-black text-[#fde68a]/80"><Trophy className="h-4 w-4 shrink-0" /> You finished 7/7 and qualify for this week's draw.</div>
        ) : (
          <div className="mt-3 flex items-center gap-2 px-1 text-[9px] font-semibold text-white/30"><CalendarDays className="h-3.5 w-3.5 shrink-0" /> The board clears for a new competition every Monday.</div>
        )}
      </section>

      {rulesOpen ? <WeeklyRulesSheet onClose={() => setRulesOpen(false)} /> : null}
    </>
  );
}