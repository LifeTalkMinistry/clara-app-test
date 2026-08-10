import { useMemo, useState } from "react";
import {
  Check,
  Flame,
  Plus,
  ShieldCheck,
  Target,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import { backendRequest } from "@/lib/clara-backend-client";

const ACTIVITY_TYPES = [
  {
    key: "savings_goal",
    label: "Savings Goal",
    short: "Save together toward a clear target.",
    defaultTitle: "Shared Savings Goal",
    icon: Target,
    amountLabel: "Savings target",
  },
  {
    key: "paluwagan_tracker",
    label: "Paluwagan Tracker",
    short: "Track contributions and accountability only.",
    defaultTitle: "Paluwagan Tracker",
    icon: UsersRound,
    amountLabel: "Contribution amount",
  },
  {
    key: "no_spend_challenge",
    label: "No-Spend Challenge",
    short: "Stay accountable to a spending boundary.",
    defaultTitle: "No-Spend Challenge",
    icon: Flame,
  },
  {
    key: "emergency_fund",
    label: "Emergency Fund",
    short: "Build your safety buffer together.",
    defaultTitle: "Emergency Fund Builder",
    icon: ShieldCheck,
    amountLabel: "Fund target",
  },
  {
    key: "debt_payoff",
    label: "Debt Payoff",
    short: "Keep each other moving toward debt freedom.",
    defaultTitle: "Debt Payoff Challenge",
    icon: Wallet,
    amountLabel: "Payoff target",
  },
  {
    key: "payday_accountability",
    label: "Payday Accountability",
    short: "Budget first every time income arrives.",
    defaultTitle: "Payday Accountability",
    icon: Check,
  },
];

const TYPE_BY_KEY = Object.fromEntries(ACTIVITY_TYPES.map((type) => [type.key, type]));
const MONEY_TYPES = new Set(["savings_goal", "paluwagan_tracker", "emergency_fund", "debt_payoff"]);

function peso(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: amount % 1 ? 2 : 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "No deadline";
  try {
    return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function formatTime(value) {
  if (!value) return "";
  const time = new Date(value).getTime();
  const delta = Date.now() - time;
  if (Number.isFinite(delta) && delta >= 0) {
    if (delta < 60_000) return "just now";
    if (delta < 3_600_000) return `${Math.max(1, Math.floor(delta / 60_000))}m ago`;
    if (delta < 86_400_000) return `${Math.max(1, Math.floor(delta / 3_600_000))}h ago`;
  }
  try {
    return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(value));
  } catch {
    return "recently";
  }
}

function statusCopy(activity) {
  switch (activity?.activity_type) {
    case "savings_goal": return { status: "saved", button: "Log savings", amount: "Amount saved" };
    case "paluwagan_tracker": return { status: "paid", button: "Mark contribution paid", amount: "Amount contributed" };
    case "emergency_fund": return { status: "saved", button: "Add fund progress", amount: "Amount added" };
    case "debt_payoff": return { status: "paid", button: "Log debt payment", amount: "Amount paid" };
    case "payday_accountability": return { status: "done", button: "I budgeted my payday" };
    default: return { status: "success", button: "Stayed on track" };
  }
}

function ActivityIcon({ type, className = "h-4 w-4" }) {
  const Icon = TYPE_BY_KEY[type]?.icon || Target;
  return <Icon className={className} />;
}

function ActivityCard({ activity, onOpen }) {
  const meta = TYPE_BY_KEY[activity.activity_type] || TYPE_BY_KEY.savings_goal;
  const total = Number(activity.total_amount || 0);
  const target = Number(activity.target_amount || 0);
  const progress = target > 0 && activity.activity_type !== "paluwagan_tracker"
    ? Math.min(100, Math.max(0, (total / target) * 100))
    : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(activity)}
      className="w-full rounded-[20px] border border-white/[0.08] bg-[#071725] p-3.5 text-left transition active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#22c7b8]/18 bg-[#22c7b8]/10 text-[#99f6e4]">
          <ActivityIcon type={activity.activity_type} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.13em] text-[#5eead4]/52">{meta.label}</p>
              <p className="mt-1 truncate text-sm font-black text-white">{activity.title}</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#22c7b8]/14 bg-[#22c7b8]/[0.055] px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#99f6e4]">
              Active
            </span>
          </div>

          {activity.description ? <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-white/38">{activity.description}</p> : null}

          {progress !== null ? (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-3 text-[9px] font-bold">
                <span className="text-white/46">{peso(total)} tracked</span>
                <span className="text-white/30">{peso(target)} goal</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-[#22c7b8]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : activity.activity_type === "paluwagan_tracker" && target > 0 ? (
            <p className="mt-3 text-[9px] font-bold text-white/42">Contribution: {peso(target)} · {activity.checkin_count || 0} payment update{Number(activity.checkin_count) === 1 ? "" : "s"}</p>
          ) : (
            <p className="mt-3 text-[9px] font-bold text-white/38">{activity.participant_count || 0} member{Number(activity.participant_count) === 1 ? "" : "s"} checked in · {activity.checkin_count || 0} update{Number(activity.checkin_count) === 1 ? "" : "s"}</p>
          )}

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.055] pt-2.5">
            <span className="text-[9px] font-semibold text-white/28">{formatDate(activity.due_date)}</span>
            {activity.my_last_checkin_at ? <span className="text-[9px] font-black text-[#5eead4]/55">You checked in {formatTime(activity.my_last_checkin_at)}</span> : <span className="text-[9px] font-black text-white/24">Tap to check in</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function CircleActivitiesPanel({
  token,
  circleId,
  activities = [],
  isOwner = false,
  onRefresh,
  onNotice,
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [checkinAmount, setCheckinAmount] = useState("");
  const [checkinNote, setCheckinNote] = useState("");
  const [busy, setBusy] = useState(false);

  const activeActivities = useMemo(
    () => (Array.isArray(activities) ? activities.filter((activity) => activity.status !== "archived") : []),
    [activities]
  );

  const chooseType = (type) => {
    setSelectedType(type.key);
    setTitle(type.defaultTitle);
    setDescription("");
    setTargetAmount("");
    setDueDate("");
  };

  const resetCreator = () => {
    setCreateOpen(false);
    setSelectedType("");
    setTitle("");
    setDescription("");
    setTargetAmount("");
    setDueDate("");
  };

  const createActivity = async () => {
    if (!token || !circleId || !selectedType || !title.trim() || busy) return;
    setBusy(true);
    try {
      await backendRequest(`/api/community/circles/${circleId}/activities`, {
        method: "POST",
        token,
        body: {
          activity_type: selectedType,
          title: title.trim(),
          description: description.trim(),
          target_amount: MONEY_TYPES.has(selectedType) && targetAmount !== "" ? Number(targetAmount) : null,
          due_date: dueDate || null,
        },
      });
      resetCreator();
      await onRefresh?.();
      onNotice?.({ type: "success", message: "Circle activity started. Everyone in this circle can now check in." });
    } catch (error) {
      onNotice?.({ type: "error", message: error?.message || "Unable to start that circle activity." });
    } finally {
      setBusy(false);
    }
  };

  const openActivity = (activity) => {
    setSelectedActivity(activity);
    setCheckinAmount("");
    setCheckinNote("");
  };

  const submitCheckin = async (statusOverride) => {
    if (!token || !circleId || !selectedActivity?.id || busy) return;
    const copy = statusCopy(selectedActivity);
    setBusy(true);
    try {
      await backendRequest(`/api/community/circles/${circleId}/activities/${selectedActivity.id}/check-ins`, {
        method: "POST",
        token,
        body: {
          status: statusOverride || copy.status,
          amount: MONEY_TYPES.has(selectedActivity.activity_type) && checkinAmount !== "" ? Number(checkinAmount) : null,
          note: checkinNote.trim(),
        },
      });
      setSelectedActivity(null);
      setCheckinAmount("");
      setCheckinNote("");
      await onRefresh?.();
      onNotice?.({ type: "success", message: "Your activity check-in is shared with this circle." });
    } catch (error) {
      onNotice?.({ type: "error", message: error?.message || "Unable to save that activity check-in." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="rounded-[24px] border border-[#22c7b8]/14 bg-[#0a1a29] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#5eead4]/58">Circle activities</p>
            <h3 className="mt-1 text-sm font-black">Work on money together</h3>
            <p className="mt-1 text-[10px] leading-4 text-white/34">Choose a real accountability activity instead of only talking about the goal.</p>
          </div>
          {isOwner ? (
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#22c7b8] px-3 text-[10px] font-black text-[#042f2e]">
              <Plus className="h-3.5 w-3.5" /> Start
            </button>
          ) : null}
        </div>

        {activeActivities.length ? (
          <div className="mt-4 space-y-2.5">
            {activeActivities.map((activity) => <ActivityCard key={activity.id} activity={activity} onOpen={openActivity} />)}
          </div>
        ) : (
          <div className="mt-4 rounded-[20px] border border-dashed border-white/10 bg-[#071725]/55 p-4">
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.slice(0, 6).map((type) => (
                <div key={type.key} className="flex items-center gap-2 rounded-xl border border-white/[0.055] bg-white/[0.02] px-2.5 py-2">
                  <ActivityIcon type={type.key} className="h-3.5 w-3.5 shrink-0 text-[#5eead4]/55" />
                  <span className="truncate text-[9px] font-black text-white/38">{type.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-[10px] leading-4 text-white/30">{isOwner ? "Start the first activity for this circle." : "The circle owner can start a shared activity."}</p>
          </div>
        )}
      </section>

      {createOpen ? (
        <div className="fixed inset-0 z-[450] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) resetCreator(); }}>
          <div className="max-h-[86dvh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/12 bg-[#081725] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.7)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#5eead4]/58">Start an activity</p><h3 className="mt-1 text-lg font-black">What will this circle work on?</h3></div>
              <button type="button" onClick={resetCreator} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55"><X className="h-4 w-4" /></button>
            </div>

            {!selectedType ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {ACTIVITY_TYPES.map((type) => (
                  <button key={type.key} type="button" onClick={() => chooseType(type)} className="rounded-2xl border border-white/[0.08] bg-[#071725] p-3 text-left transition active:scale-[0.98]">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#22c7b8]/16 bg-[#22c7b8]/[0.07] text-[#99f6e4]"><ActivityIcon type={type.key} /></div>
                    <p className="mt-3 text-[11px] font-black text-white">{type.label}</p>
                    <p className="mt-1 text-[9px] leading-4 text-white/32">{type.short}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <button type="button" onClick={() => setSelectedType("")} className="inline-flex items-center gap-2 rounded-xl border border-[#22c7b8]/15 bg-[#22c7b8]/[0.05] px-3 py-2 text-[10px] font-black text-[#99f6e4]">
                  <ActivityIcon type={selectedType} className="h-3.5 w-3.5" /> {TYPE_BY_KEY[selectedType]?.label}
                </button>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Activity name" className="h-11 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#22c7b8]/30" />
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={400} rows={3} placeholder="What are the rules or goal?" className="min-h-[82px] w-full resize-none rounded-2xl border border-white/10 bg-[#071725] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#22c7b8]/30" />
                {MONEY_TYPES.has(selectedType) ? <input type="number" min="0" step="0.01" inputMode="decimal" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder={`${TYPE_BY_KEY[selectedType]?.amountLabel || "Target amount"} (optional)`} className="h-11 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#22c7b8]/30" /> : null}
                <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.13em] text-white/28">Deadline / next due date</span><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-bold text-white outline-none focus:border-[#22c7b8]/30" /></label>
                {selectedType === "paluwagan_tracker" ? <div className="rounded-2xl border border-[#22c7b8]/12 bg-[#22c7b8]/[0.045] px-3 py-3 text-[9px] leading-4 text-white/38"><strong className="text-[#99f6e4]/72">Tracker only.</strong> CLARA does not collect, hold, transfer, guarantee, or distribute Paluwagan funds. Members record their own real-world contributions.</div> : null}
                <button type="button" onClick={createActivity} disabled={!title.trim() || busy} className="h-11 w-full rounded-2xl bg-[#22c7b8] text-xs font-black text-[#042f2e] disabled:opacity-40">{busy ? "Starting..." : "Start Activity"}</button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {selectedActivity ? (
        <div className="fixed inset-0 z-[450] flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedActivity(null); }}>
          <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-[28px] border border-white/12 bg-[#081725] shadow-[0_28px_80px_rgba(0,0,0,0.7)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="border-b border-white/[0.07] bg-[radial-gradient(circle_at_0%_0%,rgba(34,199,184,0.16),transparent_42%),#0a1a29] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#22c7b8]/18 bg-[#22c7b8]/10 text-[#99f6e4]"><ActivityIcon type={selectedActivity.activity_type} className="h-5 w-5" /></div>
                <button type="button" onClick={() => setSelectedActivity(null)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/55"><X className="h-4 w-4" /></button>
              </div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-[#5eead4]/58">{TYPE_BY_KEY[selectedActivity.activity_type]?.label || "Circle activity"}</p>
              <h3 className="mt-1 text-xl font-black">{selectedActivity.title}</h3>
              {selectedActivity.description ? <p className="mt-2 text-xs leading-5 text-white/42">{selectedActivity.description}</p> : null}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">Members active</p><p className="mt-1 text-sm font-black">{selectedActivity.participant_count || 0}</p></div>
                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">Due</p><p className="mt-1 text-xs font-black">{formatDate(selectedActivity.due_date)}</p></div>
              </div>
              {MONEY_TYPES.has(selectedActivity.activity_type) ? <div className="mt-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/28">Tracked by the circle</p><p className="mt-1 text-sm font-black">{peso(selectedActivity.total_amount || 0)}{Number(selectedActivity.target_amount || 0) > 0 ? ` · ${selectedActivity.activity_type === "paluwagan_tracker" ? `${peso(selectedActivity.target_amount)} contribution` : `${peso(selectedActivity.target_amount)} target`}` : ""}</p></div> : null}
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#5eead4]/55">Your check-in</p>
                {MONEY_TYPES.has(selectedActivity.activity_type) ? <input type="number" min="0" step="0.01" inputMode="decimal" value={checkinAmount} onChange={(event) => setCheckinAmount(event.target.value)} placeholder={`${statusCopy(selectedActivity).amount} (optional)`} className="mt-2 h-11 w-full rounded-2xl border border-white/10 bg-[#071725] px-4 text-sm font-bold text-white outline-none placeholder:text-white/25 focus:border-[#22c7b8]/30" /> : null}
                <textarea value={checkinNote} onChange={(event) => setCheckinNote(event.target.value)} rows={2} maxLength={500} placeholder="Add a short update for your circle..." className="mt-2 min-h-[72px] w-full resize-none rounded-2xl border border-white/10 bg-[#071725] px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#22c7b8]/30" />
                {selectedActivity.activity_type === "no_spend_challenge" ? (
                  <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => submitCheckin("slip")} disabled={busy} className="h-11 rounded-2xl border border-white/10 bg-white/[0.04] text-[10px] font-black text-white/50 disabled:opacity-40">Had a slip</button><button type="button" onClick={() => submitCheckin("success")} disabled={busy} className="h-11 rounded-2xl bg-[#22c7b8] text-[10px] font-black text-[#042f2e] disabled:opacity-40">Stayed on track</button></div>
                ) : (
                  <button type="button" onClick={() => submitCheckin()} disabled={busy} className="mt-2 h-11 w-full rounded-2xl bg-[#22c7b8] text-[10px] font-black text-[#042f2e] disabled:opacity-40">{busy ? "Saving..." : statusCopy(selectedActivity).button}</button>
                )}
              </div>

              {selectedActivity.activity_type === "paluwagan_tracker" ? <p className="rounded-2xl border border-[#22c7b8]/12 bg-[#22c7b8]/[0.04] px-3 py-3 text-[9px] leading-4 text-white/34">CLARA records accountability only. No money is held, transferred, guaranteed, or released by CLARA.</p> : null}

              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/28">Recent circle updates</p>
                <div className="mt-2 space-y-2">
                  {(Array.isArray(selectedActivity.recent_checkins) ? selectedActivity.recent_checkins : []).length ? selectedActivity.recent_checkins.slice(0, 6).map((checkin) => (
                    <div key={checkin.id} className="rounded-2xl border border-white/[0.06] bg-[#071725] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-3"><p className="truncate text-[10px] font-black text-white/72">{checkin.display_name || "Circle member"}</p><span className="shrink-0 text-[8px] font-semibold text-white/25">{formatTime(checkin.created_at)}</span></div>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5eead4]/48">{String(checkin.checkin_status || "done").replaceAll("_", " ")}{checkin.amount !== null && checkin.amount !== undefined ? ` · ${peso(checkin.amount)}` : ""}</p>
                      {checkin.note ? <p className="mt-1.5 text-[10px] leading-4 text-white/38">{checkin.note}</p> : null}
                    </div>
                  )) : <p className="rounded-2xl border border-dashed border-white/[0.08] px-3 py-5 text-center text-[10px] text-white/28">No check-ins yet. Be the first.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
