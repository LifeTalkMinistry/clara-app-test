import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Flame,
  Medal,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";

const STORAGE_KEY = "clara-challenge-progress-v1";

const TABS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "thirty", label: "30-Day" },
];

const CHALLENGES = {
  weekly: {
    id: "weekly-discipline-7",
    eyebrow: "Weekly challenge",
    title: "7-Day Money Discipline",
    description:
      "Check in once a day after following your spending plan. Small disciplined days build the habit.",
    goal: 7,
    unit: "days",
    cadence: "daily",
    pointsPerCheckIn: 20,
    completionBonus: 60,
    accent: "Daily check-in",
  },
  monthly: {
    id: "monthly-save-4",
    eyebrow: "Monthly challenge",
    title: "Save Something Every Week",
    description:
      "Put something aside once each week this month. The amount is yours to choose—consistency is what counts.",
    goal: 4,
    unit: "weeks",
    cadence: "weekly",
    pointsPerCheckIn: 60,
    completionBonus: 120,
    accent: "Weekly check-in",
  },
  thirty: {
    id: "thirty-day-discipline",
    eyebrow: "30-day challenge",
    title: "30-Day CLARA Streak",
    description:
      "Show up for your money every day for 30 days. Review, decide, and stay accountable before you spend.",
    goal: 30,
    unit: "days",
    cadence: "daily",
    pointsPerCheckIn: 25,
    completionBonus: 250,
    accent: "Daily check-in",
  },
};

function loadProgress() {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function checkInKey(cadence) {
  const now = new Date();
  if (cadence !== "weekly") return localDateKey(now);

  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - mondayOffset);
  return `week-${localDateKey(monday)}`;
}

function safeCheckIns(entry) {
  return Array.isArray(entry?.checkIns) ? entry.checkIns : [];
}

function ChallengeMetric({ icon: Icon, value, label }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-[#0a1a29] px-3 py-4 text-center">
      <Icon className="mx-auto h-4 w-4 text-[#5eead4]/70" />
      <p className="mt-2 text-lg font-black tracking-[-0.03em] text-white">{value}</p>
      <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.13em] text-white/35">{label}</p>
    </div>
  );
}

function Badge({ icon: Icon, title, description, unlocked }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[18px] border px-3 py-3 ${
        unlocked
          ? "border-[#22c7b8]/25 bg-[#22c7b8]/[0.07]"
          : "border-white/[0.07] bg-white/[0.025] opacity-55"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          unlocked ? "bg-[#22c7b8]/14 text-[#99f6e4]" : "bg-white/[0.04] text-white/35"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-black text-white">{title}</p>
          {unlocked ? <Check className="h-3.5 w-3.5 text-[#5eead4]" /> : null}
        </div>
        <p className="mt-0.5 text-[10px] font-semibold leading-4 text-white/38">{description}</p>
      </div>
    </div>
  );
}

export default function Challenges() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("weekly");
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Keep the challenge usable even when device storage is unavailable.
    }
  }, [progress]);

  const challenge = CHALLENGES[activeTab];
  const entry = progress[challenge.id] || null;
  const checkIns = safeCheckIns(entry);
  const progressCount = Math.min(checkIns.length, challenge.goal);
  const progressPercent = Math.min(100, Math.round((progressCount / challenge.goal) * 100));
  const joined = Boolean(entry?.joinedAt);
  const completed = progressCount >= challenge.goal;
  const currentCheckInKey = checkInKey(challenge.cadence);
  const alreadyCheckedIn = checkIns.includes(currentCheckInKey);

  const summary = useMemo(() => {
    let joinedCount = 0;
    let completedCount = 0;
    let points = 0;

    Object.values(CHALLENGES).forEach((item) => {
      const itemEntry = progress[item.id];
      if (!itemEntry?.joinedAt) return;
      joinedCount += 1;
      const itemCheckIns = safeCheckIns(itemEntry).slice(0, item.goal);
      points += itemCheckIns.length * item.pointsPerCheckIn;
      if (itemCheckIns.length >= item.goal) {
        completedCount += 1;
        points += item.completionBonus;
      }
    });

    return { joinedCount, completedCount, points };
  }, [progress]);

  const joinChallenge = () => {
    setProgress((current) => ({
      ...current,
      [challenge.id]: {
        ...(current[challenge.id] || {}),
        joinedAt: current[challenge.id]?.joinedAt || new Date().toISOString(),
        checkIns: safeCheckIns(current[challenge.id]),
      },
    }));
  };

  const checkIn = () => {
    if (!joined || completed || alreadyCheckedIn) return;

    setProgress((current) => {
      const currentEntry = current[challenge.id] || {};
      const currentCheckIns = safeCheckIns(currentEntry);
      if (currentCheckIns.includes(currentCheckInKey)) return current;

      const nextCheckIns = [...currentCheckIns, currentCheckInKey].slice(0, challenge.goal);
      return {
        ...current,
        [challenge.id]: {
          ...currentEntry,
          joinedAt: currentEntry.joinedAt || new Date().toISOString(),
          checkIns: nextCheckIns,
          ...(nextCheckIns.length >= challenge.goal
            ? { completedAt: currentEntry.completedAt || new Date().toISOString() }
            : {}),
        },
      };
    });
  };

  const thirtyDayCompleted =
    safeCheckIns(progress[CHALLENGES.thirty.id]).length >= CHALLENGES.thirty.goal;

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] w-screen flex-col overflow-hidden bg-[#06111f] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#06111f]/96 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/community")}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/85"
            aria-label="Back to Community"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#5eead4]/60">CLARA</p>
            <h1 className="truncate text-[17px] font-black tracking-[-0.025em] sm:text-xl">Challenges</h1>
          </div>
          <div className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#22c7b8]/25 bg-[#22c7b8]/10 px-3 text-[#ccfbf1]">
            <Trophy className="h-4 w-4" />
            <span className="text-[11px] font-black">{summary.points}</span>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-4 sm:px-5">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <section className="relative overflow-hidden rounded-[28px] border border-[#22c7b8]/20 bg-[#0a1a29] p-5">
            <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#22c7b8]/10 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[#5eead4]/20 bg-[#22c7b8]/10 text-[#99f6e4] shadow-[0_0_28px_rgba(34,199,184,.08)]">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#5eead4]/55">Challenge Hub</p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.03em]">Consistency wins here.</h2>
                <p className="mt-2 text-xs font-semibold leading-5 text-white/45">
                  Weekly, monthly, and 30-day challenges designed to build stronger money habits—not compare incomes.
                </p>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-3 gap-2 rounded-[18px] border border-white/10 bg-[#071725] p-1.5">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`h-10 rounded-[13px] text-[10px] font-black transition ${
                  activeTab === tab.key
                    ? "bg-[#22c7b8]/16 text-[#ccfbf1] shadow-[inset_0_0_0_1px_rgba(94,234,212,.16)]"
                    : "text-white/42 hover:text-white/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0a1a29]">
            <div className="border-b border-white/[0.07] p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22c7b8]/20 bg-[#22c7b8]/[0.07] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[#99f6e4]">
                  <Target className="h-3 w-3" /> {challenge.eyebrow}
                </span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">{challenge.accent}</span>
              </div>

              <h3 className="mt-4 text-[22px] font-black tracking-[-0.035em] text-white">{challenge.title}</h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/47">{challenge.description}</p>

              <div className="mt-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">Your progress</p>
                    <p className="mt-1 text-2xl font-black tracking-[-0.04em]">
                      {progressCount}<span className="text-sm text-white/30">/{challenge.goal} {challenge.unit}</span>
                    </p>
                  </div>
                  <p className="text-xs font-black text-[#99f6e4]">{progressPercent}%</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-[#22c7b8] transition-[width] duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="p-4">
              {!joined ? (
                <button
                  type="button"
                  onClick={joinChallenge}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#22c7b8] text-sm font-black text-[#042f2e] shadow-[0_12px_28px_rgba(34,199,184,.12)]"
                >
                  <Trophy className="h-4 w-4" /> Join Challenge
                </button>
              ) : completed ? (
                <div className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#5eead4]/25 bg-[#22c7b8]/10 text-sm font-black text-[#ccfbf1]">
                  <CheckCircle2 className="h-4 w-4" /> Challenge Completed
                </div>
              ) : (
                <button
                  type="button"
                  onClick={checkIn}
                  disabled={alreadyCheckedIn}
                  className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition ${
                    alreadyCheckedIn
                      ? "cursor-default border border-white/10 bg-white/[0.035] text-white/42"
                      : "bg-[#22c7b8] text-[#042f2e] shadow-[0_12px_28px_rgba(34,199,184,.12)]"
                  }`}
                >
                  {alreadyCheckedIn ? <Check className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                  {alreadyCheckedIn
                    ? challenge.cadence === "weekly"
                      ? "Checked in this week"
                      : "Checked in today"
                    : "Log My Check-In"}
                </button>
              )}
              <p className="mt-3 text-center text-[10px] font-semibold text-white/30">
                +{challenge.pointsPerCheckIn} points per check-in · +{challenge.completionBonus} completion bonus
              </p>
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#5eead4]/48">Your momentum</p>
                <h3 className="mt-1 text-base font-black">Challenge record</h3>
              </div>
              <Sparkles className="h-4 w-4 text-[#5eead4]/45" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <ChallengeMetric icon={Flame} value={summary.joinedCount} label="Joined" />
              <ChallengeMetric icon={CheckCircle2} value={summary.completedCount} label="Finished" />
              <ChallengeMetric icon={Award} value={summary.points} label="Points" />
            </div>
          </section>

          <section className="rounded-[24px] border border-white/10 bg-[#0a1a29] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#5eead4]/48">Badges</p>
                <h3 className="mt-1 text-base font-black">Earned through consistency</h3>
              </div>
              <Medal className="h-5 w-5 text-[#99f6e4]/60" />
            </div>
            <div className="mt-3 space-y-2">
              <Badge
                icon={CalendarDays}
                title="First Step"
                description="Join your first CLARA challenge."
                unlocked={summary.joinedCount > 0}
              />
              <Badge
                icon={Medal}
                title="Challenge Finisher"
                description="Complete any weekly or monthly challenge."
                unlocked={summary.completedCount > 0}
              />
              <Badge
                icon={Trophy}
                title="30-Day Finisher"
                description="Complete the full 30-Day CLARA Streak."
                unlocked={thirtyDayCompleted}
              />
            </div>
          </section>

          <section className="flex items-start gap-3 rounded-[22px] border border-[#22c7b8]/16 bg-[#22c7b8]/[0.045] p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#22c7b8]/10 text-[#99f6e4]">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-black">CLARA challenge rule</p>
              <p className="mt-1 text-[11px] font-semibold leading-5 text-white/42">
                We reward discipline and completion—not who has the biggest income or who can save the largest peso amount.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
