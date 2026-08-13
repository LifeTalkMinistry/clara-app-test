import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import WeeklyMiniStreakCard from "@/components/challenges/WeeklyMiniStreakCard";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  Flame,
  Info,
  Medal,
  Sparkles,
  Target,
  Ticket,
  Trophy,
  Users,
  X,
} from "lucide-react";

const STORAGE_KEY = "clara-challenge-progress-v1";
const THIRTY_DAY_BLOCK = 30;
const CHALLENGE_HUB_INFO_DIALOG_ID = "clara-challenge-hub-info-dialog";
const CHALLENGE_HUB_INFO_TITLE_ID = "clara-challenge-hub-info-title";
const CHALLENGE_HUB_INFO_DESCRIPTION_ID = "clara-challenge-hub-info-description";

const TABS = [
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "thirty", label: "30-Day" },
];

const CHALLENGES = {
  weekly: {
    id: "weekly-discipline-7",
    eyebrow: "Weekly Mini Streak",
    title: "₱100 Load Weekly Draw",
    description:
      "Join intentionally, then check in here every day from Monday through Sunday.",
    goal: 7,
    unit: "days",
    cadence: "daily",
    pointsPerCheckIn: 20,
    completionBonus: 60,
    accent: "Monday–Sunday",
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
      "Every official CLARA 30-Day Race starts together on the 1st of the month. Finish the race, earn your badge and Monthly Draw entry, then keep your streak alive to keep building your chances.",
    goal: THIRTY_DAY_BLOCK,
    unit: "days",
    cadence: "daily",
    pointsPerCheckIn: 25,
    completionBonus: 250,
    accent: "Daily check-in",
    repeatable: true,
  },
};

const DRAW_PRIZE_TIERS = [
  { label: "1–2", amount: "₱500" },
  { label: "3–5", amount: "₱1K" },
  { label: "6–9", amount: "₱2K" },
  { label: "10–20", amount: "₱3K" },
  { label: "21–49", amount: "₱4K" },
  { label: "50+", amount: "₱5K" },
];

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

function dateFromLocalKey(key) {
  if (typeof key !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetweenKeys(fromKey, toKey) {
  const from = dateFromLocalKey(fromKey);
  const to = dateFromLocalKey(toKey);
  if (!from || !to) return Number.POSITIVE_INFINITY;
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function monthlyRaceWindow(now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  currentStart.setHours(0, 0, 0, 0);
  nextStart.setHours(0, 0, 0, 0);

  const daysUntilNextStart = Math.max(
    0,
    Math.round((nextStart.getTime() - today.getTime()) / 86_400_000),
  );

  return {
    isStartDay: now.getDate() === 1,
    currentStartKey: localDateKey(currentStart),
    nextStartKey: localDateKey(nextStart),
    currentLabel: currentStart.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
    nextLabel: nextStart.toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    daysUntilNextStart,
  };
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

function normalizedDailyCheckIns(entry) {
  return [...new Set(safeCheckIns(entry).filter((key) => dateFromLocalKey(key)))].sort();
}

function activeDailyStreak(entry, now = new Date()) {
  const keys = normalizedDailyCheckIns(entry);
  if (!keys.length) {
    return { days: 0, startKey: null, lastKey: null, alive: false, checkedInToday: false };
  }

  const todayKey = localDateKey(now);
  const lastKey = keys[keys.length - 1];
  const distanceFromToday = daysBetweenKeys(lastKey, todayKey);

  if (distanceFromToday < 0 || distanceFromToday > 1) {
    return { days: 0, startKey: null, lastKey, alive: false, checkedInToday: false };
  }

  let days = 1;
  let startIndex = keys.length - 1;

  for (let index = keys.length - 1; index > 0; index -= 1) {
    if (daysBetweenKeys(keys[index - 1], keys[index]) !== 1) break;
    days += 1;
    startIndex = index - 1;
  }

  return {
    days,
    startKey: keys[startIndex],
    lastKey,
    alive: true,
    checkedInToday: lastKey === todayKey,
  };
}

function longestDailyStreak(entry) {
  const keys = normalizedDailyCheckIns(entry);
  if (!keys.length) return 0;

  let longest = 1;
  let current = 1;

  for (let index = 1; index < keys.length; index += 1) {
    if (daysBetweenKeys(keys[index - 1], keys[index]) === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function milestoneProgress(streakDays) {
  if (streakDays <= 0) return 0;
  const remainder = streakDays % THIRTY_DAY_BLOCK;
  return remainder === 0 ? THIRTY_DAY_BLOCK : remainder;
}

function daysToNextEntry(streakDays) {
  if (streakDays <= 0) return THIRTY_DAY_BLOCK;
  const remainder = streakDays % THIRTY_DAY_BLOCK;
  return remainder === 0 ? THIRTY_DAY_BLOCK : THIRTY_DAY_BLOCK - remainder;
}

function getRewardState(entry, streak) {
  if (!streak.alive || !streak.startKey) {
    return {
      activeEntries: 0,
      earnedEntries: 0,
      boostEntries: 0,
      earnedMilestones: 0,
      milestoneOffset: 0,
      ledgerMatchesStreak: false,
    };
  }

  const ledger = entry?.rewardLedger || {};
  const ledgerMatchesStreak = ledger.streakStartKey === streak.startKey;
  const milestoneOffset = ledgerMatchesStreak
    ? Math.max(0, Number(ledger.milestoneOffset) || 0)
    : 0;
  const boostEntries = ledgerMatchesStreak
    ? Math.max(0, Number(ledger.boostEntries) || 0)
    : 0;
  const earnedMilestones = Math.floor(streak.days / THIRTY_DAY_BLOCK);
  const earnedEntries = Math.max(0, earnedMilestones - milestoneOffset);

  return {
    activeEntries: earnedEntries + boostEntries,
    earnedEntries,
    boostEntries,
    earnedMilestones,
    milestoneOffset,
    ledgerMatchesStreak,
  };
}

function nextMonthlyDraw(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  next.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const daysAway = Math.max(0, Math.round((next.getTime() - today.getTime()) / 86_400_000));

  return {
    date: next,
    daysAway,
    label: next.toLocaleDateString(undefined, { month: "long", day: "numeric" }),
  };
}

function ChallengeMetric({ icon: Icon, value, label, tone = "teal" }) {
  const iconClass = tone === "gold" ? "text-[#facc15]/75" : "text-[#5eead4]/70";

  return (
    <div className="rounded-[20px] border border-white/10 bg-[#0a1a29] px-3 py-4 text-center">
      <Icon className={`mx-auto h-4 w-4 ${iconClass}`} />
      <p className="mt-2 text-lg font-black tracking-[-0.03em] text-white">{value}</p>
      <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.13em] text-white/35">{label}</p>
    </div>
  );
}

function Badge({ icon: Icon, title, description, unlocked, accent = "teal" }) {
  const unlockedShell =
    accent === "gold"
      ? "border-[#facc15]/25 bg-[#facc15]/[0.07]"
      : "border-[#22c7b8]/25 bg-[#22c7b8]/[0.07]";
  const unlockedIcon =
    accent === "gold"
      ? "bg-[#facc15]/12 text-[#fde68a]"
      : "bg-[#22c7b8]/14 text-[#99f6e4]";
  const unlockedCheck = accent === "gold" ? "text-[#facc15]" : "text-[#5eead4]";

  return (
    <div
      className={`flex items-center gap-3 rounded-[18px] border px-3 py-3 ${
        unlocked ? unlockedShell : "border-white/[0.07] bg-white/[0.025] opacity-55"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
          unlocked ? unlockedIcon : "bg-white/[0.04] text-white/35"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-black text-white">{title}</p>
          {unlocked ? <Check className={`h-3.5 w-3.5 ${unlockedCheck}`} /> : null}
        </div>
        <p className="mt-0.5 text-[10px] font-semibold leading-4 text-white/38">{description}</p>
      </div>
    </div>
  );
}

function RaceBoard({ race, raceActive }) {
  if (raceActive) {
    return (
      <section className="flex items-start gap-3 rounded-[22px] border border-[#22c7b8]/18 bg-[#22c7b8]/[0.05] p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#22c7b8]/10 text-[#99f6e4]">
          <Flame className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#5eead4]/60">Race in progress</p>
          <p className="mt-1 text-sm font-black text-white">{race.currentLabel} 30-Day Race</p>
          <p className="mt-1 text-[11px] font-semibold leading-5 text-white/42">
            You started with the community on the 1st. Keep checking in every day.
          </p>
        </div>
      </section>
    );
  }

  if (race.isStartDay) {
    return (
      <section className="relative overflow-hidden rounded-[22px] border border-[#facc15]/22 bg-[#facc15]/[0.055] p-4">
        <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[#facc15]/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#facc15]/10 text-[#fde68a]">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#facc15]/70">Race day</p>
            <p className="mt-1 text-base font-black text-white">The {race.currentLabel} race starts today.</p>
            <p className="mt-1 text-[11px] font-semibold leading-5 text-white/45">
              Official 30-Day Races only open on the 1st. Join today so your Day 1 begins with everyone else.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#facc15]/20 bg-[#091727] p-5">
      <div className="pointer-events-none absolute -right-14 -top-16 h-36 w-36 rounded-full bg-[#facc15]/[0.09] blur-3xl" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] border border-[#facc15]/18 bg-[#facc15]/10 text-[#fde68a]">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-[#facc15]/65">Next 30-Day Race</p>
          <h3 className="mt-1 text-xl font-black tracking-[-0.035em] text-white">Starts {race.nextLabel}</h3>
          <p className="mt-1.5 text-[11px] font-semibold leading-5 text-white/45">
            Everyone starts together on the 1st. This month's race has already started, so CLARA will hold your place for the next one.
          </p>
          <div className="mt-3 inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[10px] font-black text-white/55">
            {race.daysUntilNextStart} {race.daysUntilNextStart === 1 ? "day" : "days"} until the next race
          </div>
        </div>
      </div>
    </section>
  );
}

function MonthlyDrawCard({ streak, rewardState, draw }) {
  const qualified = streak.days >= THIRTY_DAY_BLOCK;
  const blockProgress = milestoneProgress(streak.days);
  const nextEntryDays = daysToNextEntry(streak.days);
  const progressPercent = Math.min(100, Math.round((blockProgress / THIRTY_DAY_BLOCK) * 100));

  return (
    <section className="relative overflow-hidden rounded-[26px] border border-[#facc15]/18 bg-[#091727]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-[#facc15]/[0.08] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-40 w-40 rounded-full bg-[#22c7b8]/[0.07] blur-3xl" />

      <div className="relative border-b border-white/[0.07] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[17px] border border-[#facc15]/20 bg-[#facc15]/10 text-[#fde68a]">
            <Ticket className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#facc15]/70">
                Monthly Finisher Draw
              </p>
              <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[9px] font-black text-white/50">
                Next draw · {draw.label}
              </span>
            </div>
            <h3 className="mt-2 text-xl font-black tracking-[-0.035em] text-white">
              {qualified
                ? `${rewardState.activeEntries} active ${rewardState.activeEntries === 1 ? "entry" : "entries"}`
                : "Your first entry starts at Day 30"}
            </h3>
            <p className="mt-1.5 text-[11px] font-semibold leading-5 text-white/45">
              Entries carry forward while your streak stays alive. If you are not picked this month, your chances stay with you and can keep growing.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">Your entries</p>
            <p className="mt-1 text-xl font-black text-[#fde68a]">{rewardState.activeEntries}</p>
          </div>
          <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">Active streak</p>
            <p className="mt-1 text-xl font-black text-white">{streak.days}<span className="ml-1 text-[10px] text-white/35">days</span></p>
          </div>
          <div className="rounded-[17px] border border-white/[0.08] bg-white/[0.025] px-3 py-3">
            <p className="text-[8px] font-black uppercase tracking-[0.12em] text-white/30">Draw in</p>
            <p className="mt-1 text-xl font-black text-white">{draw.daysAway}<span className="ml-1 text-[10px] text-white/35">days</span></p>
          </div>
        </div>

        <div className="mt-4 rounded-[19px] border border-[#facc15]/14 bg-[#facc15]/[0.045] p-3.5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#facc15]/55">
                {qualified ? "Building your next entry" : "First entry progress"}
              </p>
              <p className="mt-1 text-xs font-black text-white">
                {qualified
                  ? `${nextEntryDays} ${nextEntryDays === 1 ? "day" : "days"} until your next earned entry`
                  : `${Math.max(0, THIRTY_DAY_BLOCK - streak.days)} days until your first entry`}
              </p>
            </div>
            <span className="text-[10px] font-black text-[#fde68a]">{blockProgress}/{THIRTY_DAY_BLOCK}</span>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-[#facc15] transition-[width] duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {qualified ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#22c7b8]/15 bg-[#22c7b8]/[0.055] px-2.5 py-1 text-[9px] font-black text-[#99f6e4]/75">
              Earned · {rewardState.earnedEntries}
            </span>
            <span className="rounded-full border border-[#facc15]/15 bg-[#facc15]/[0.055] px-2.5 py-1 text-[9px] font-black text-[#fde68a]/75">
              Entry boosts · +{rewardState.boostEntries}
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative p-5">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-3.5">
            <Trophy className="h-4 w-4 text-[#facc15]/75" />
            <p className="mt-2 text-[11px] font-black text-white">1 Grand Winner</p>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-white/38">
              Wins the unlocked monthly cash prize. Their streak stays; only their active entry balance resets.
            </p>
          </div>
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-3.5">
            <Ticket className="h-4 w-4 text-[#99f6e4]/70" />
            <p className="mt-2 text-[11px] font-black text-white">3 Entry Boosts</p>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-white/38">
              Three additional finishers receive +1 active entry that carries forward with their streak.
            </p>
          </div>
          <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.025] p-3.5">
            <Flame className="h-4 w-4 text-[#fb7185]/70" />
            <p className="mt-2 text-[11px] font-black text-white">Nobody else resets</p>
            <p className="mt-1 text-[10px] font-semibold leading-4 text-white/38">
              Not picked? You keep every active entry. Keep the streak alive and come back stronger next month.
            </p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-white/28">Community prize ladder</p>
              <p className="mt-1 text-[10px] font-semibold text-white/40">Based on unique qualified active finishers—not total tickets.</p>
            </div>
            <span className="shrink-0 rounded-full border border-[#facc15]/18 bg-[#facc15]/[0.06] px-2.5 py-1 text-[9px] font-black text-[#fde68a]">₱5K max</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {DRAW_PRIZE_TIERS.map((tier) => (
              <div key={tier.label} className="rounded-[14px] border border-white/[0.07] bg-white/[0.02] px-2 py-2.5 text-center">
                <p className="text-[8px] font-black text-white/30">{tier.label}</p>
                <p className="mt-0.5 text-[10px] font-black text-white/75">{tier.amount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Challenges() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("weekly");
  const [progress, setProgress] = useState(loadProgress);
  const [isChallengeHubInfoOpen, setIsChallengeHubInfoOpen] = useState(false);
  const challengeHubInfoButtonRef = useRef(null);
  const challengeHubInfoCloseRef = useRef(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Keep the challenge usable even when device storage is unavailable.
    }
  }, [progress]);

  useEffect(() => {
    if (!isChallengeHubInfoOpen) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      challengeHubInfoCloseRef.current?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setIsChallengeHubInfoOpen(false);
      window.requestAnimationFrame(() => {
        challengeHubInfoButtonRef.current?.focus();
      });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isChallengeHubInfoOpen]);

  const closeChallengeHubInfo = () => {
    setIsChallengeHubInfoOpen(false);
    window.requestAnimationFrame(() => {
      challengeHubInfoButtonRef.current?.focus();
    });
  };

  const challenge = CHALLENGES[activeTab];
  const entry = progress[challenge.id] || null;
  const checkIns = safeCheckIns(entry);
  const isWeekly = activeTab === "weekly";
  const isThirtyDay = activeTab === "thirty";
  const race = useMemo(() => monthlyRaceWindow(), []);

  const currentThirtyEntry = progress[CHALLENGES.thirty.id] || null;
  const hasCurrentOfficialRace =
    currentThirtyEntry?.raceStartKey === race.currentStartKey;
  const joined = isThirtyDay
    ? hasCurrentOfficialRace
    : Boolean(entry?.joinedAt);

  const currentThirtyStreak = activeDailyStreak(currentThirtyEntry);
  const currentThirtyReward = getRewardState(currentThirtyEntry, currentThirtyStreak);
  const currentThirtyBest = longestDailyStreak(currentThirtyEntry);
  const thirtyDayQualified = currentThirtyStreak.days >= THIRTY_DAY_BLOCK;
  const draw = useMemo(() => nextMonthlyDraw(), []);

  const currentCheckInKey = checkInKey(challenge.cadence);
  const alreadyCheckedIn = checkIns.includes(currentCheckInKey);

  const progressCount = isThirtyDay
    ? hasCurrentOfficialRace
      ? milestoneProgress(currentThirtyStreak.days)
      : 0
    : Math.min(checkIns.length, challenge.goal);
  const progressPercent = Math.min(100, Math.round((progressCount / challenge.goal) * 100));
  const completed = isThirtyDay
    ? hasCurrentOfficialRace && currentThirtyStreak.days >= challenge.goal
    : progressCount >= challenge.goal;

  const summary = useMemo(() => {
    let joinedCount = 0;
    let completedCount = 0;
    let points = 0;

    Object.values(CHALLENGES).forEach((item) => {
      const itemEntry = progress[item.id];
      if (!itemEntry?.joinedAt) return;

      joinedCount += 1;
      const itemCheckIns = safeCheckIns(itemEntry);
      points += Math.min(itemCheckIns.length, item.goal) * item.pointsPerCheckIn;

      const itemCompleted =
        item.id === CHALLENGES.thirty.id
          ? longestDailyStreak(itemEntry) >= item.goal
          : itemCheckIns.length >= item.goal;

      if (itemCompleted) {
        completedCount += 1;
        points += item.completionBonus;
      }
    });

    return { joinedCount, completedCount, points };
  }, [progress]);

  const joinChallenge = () => {
    if (isThirtyDay && !race.isStartDay) return;

    setProgress((current) => {
      const currentEntry = current[challenge.id] || {};
      const firstOfficialRace =
        isThirtyDay && !currentEntry.officialRaceStartedAt;

      return {
        ...current,
        [challenge.id]: {
          ...currentEntry,
          joinedAt: isThirtyDay
            ? new Date().toISOString()
            : currentEntry.joinedAt || new Date().toISOString(),
          checkIns: firstOfficialRace ? [] : safeCheckIns(currentEntry),
          ...(isThirtyDay
            ? {
                officialRaceStartedAt:
                  currentEntry.officialRaceStartedAt || new Date().toISOString(),
                raceStartKey: race.currentStartKey,
              }
            : {}),
        },
      };
    });
  };

  const checkIn = () => {
    if (
      !joined ||
      alreadyCheckedIn ||
      (isThirtyDay && !hasCurrentOfficialRace) ||
      (!challenge.repeatable && completed)
    ) {
      return;
    }

    setProgress((current) => {
      const currentEntry = current[challenge.id] || {};
      const currentCheckIns = safeCheckIns(currentEntry);
      if (currentCheckIns.includes(currentCheckInKey)) return current;

      const nextCheckIns = challenge.repeatable
        ? [...currentCheckIns, currentCheckInKey]
        : [...currentCheckIns, currentCheckInKey].slice(0, challenge.goal);

      const nextEntry = {
        ...currentEntry,
        joinedAt: currentEntry.joinedAt || new Date().toISOString(),
        checkIns: nextCheckIns,
      };

      if (challenge.id === CHALLENGES.thirty.id) {
        const nextStreak = activeDailyStreak(nextEntry);
        const existingLedger = currentEntry.rewardLedger || {};
        const sameStreak = existingLedger.streakStartKey === nextStreak.startKey;

        nextEntry.rewardLedger = sameStreak
          ? existingLedger
          : {
              streakStartKey: nextStreak.startKey,
              boostEntries: 0,
              milestoneOffset: 0,
              lifetimeBoostWins: Number(existingLedger.lifetimeBoostWins) || 0,
              lifetimeGrandWins: Number(existingLedger.lifetimeGrandWins) || 0,
            };

        if (nextStreak.days >= challenge.goal && !currentEntry.completedAt) {
          nextEntry.completedAt = new Date().toISOString();
        }
      } else if (nextCheckIns.length >= challenge.goal && !currentEntry.completedAt) {
        nextEntry.completedAt = new Date().toISOString();
      }

      return {
        ...current,
        [challenge.id]: nextEntry,
      };
    });
  };

  const progressLabel =
    isThirtyDay && !hasCurrentOfficialRace
      ? "Official race progress"
      : isThirtyDay && currentThirtyStreak.days >= THIRTY_DAY_BLOCK
        ? "Progress to next entry"
        : "Your progress";

  const actionLabel =
    isThirtyDay && completed ? "Keep My Streak Alive" : "Log My Check-In";

  return (
    <div className="relative z-[80] flex min-h-full w-full flex-col overflow-visible bg-[#06111f] text-white">
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

      <main className="w-full flex-none overflow-visible px-3 pb-[calc(env(safe-area-inset-bottom)+32px)] pt-4 sm:px-5">
        <div className="mx-auto w-full max-w-3xl space-y-4">
          <section
            className="relative overflow-hidden rounded-[28px] border border-[#22c7b8]/20 bg-[#0a1a29] p-5"
            data-challenge-hub-hero
          >
            <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-[#22c7b8]/10 blur-3xl" />
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#5eead4]/55">Challenge Hub</p>
                <h2 className="mt-2 max-w-[310px] text-[22px] font-black leading-[1.16] tracking-[-0.035em] sm:max-w-none sm:text-2xl">
                  Consistency builds financial strength.
                </h2>
              </div>
              <button
                ref={challengeHubInfoButtonRef}
                type="button"
                className="challenge-hub-info-trigger flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                aria-label="About Challenge Hub"
                aria-haspopup="dialog"
                aria-expanded={isChallengeHubInfoOpen}
                aria-controls={CHALLENGE_HUB_INFO_DIALOG_ID}
                onClick={() => setIsChallengeHubInfoOpen(true)}
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
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

          {isThirtyDay ? (
            <RaceBoard race={race} raceActive={hasCurrentOfficialRace} />
          ) : null}

          {isWeekly ? (
            <WeeklyMiniStreakCard progress={progress} setProgress={setProgress} />
          ) : (
            <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[#0a1a29]">
              <div className="border-b border-white/[0.07] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] ${
                    isThirtyDay
                      ? "border-[#facc15]/25 bg-[#facc15]/[0.065] text-[#fde68a]"
                      : "border-[#22c7b8]/20 bg-[#22c7b8]/[0.07] text-[#99f6e4]"
                  }`}>
                    <Target className="h-3 w-3" /> {challenge.eyebrow}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/30">{challenge.accent}</span>
                </div>

                <h3 className="mt-4 text-[22px] font-black tracking-[-0.035em] text-white">{challenge.title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/47">{challenge.description}</p>

                {isThirtyDay && hasCurrentOfficialRace && currentThirtyStreak.days >= THIRTY_DAY_BLOCK ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#facc15]/18 bg-[#facc15]/[0.055] px-2.5 py-1 text-[9px] font-black text-[#fde68a]/80">
                      <Medal className="h-3 w-3" /> 30-Day Finisher · Active
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.025] px-2.5 py-1 text-[9px] font-black text-white/45">
                      <Ticket className="h-3 w-3" /> {currentThirtyReward.activeEntries} active {currentThirtyReward.activeEntries === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                ) : null}

                <div className="mt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/32">{progressLabel}</p>
                      <p className="mt-1 text-2xl font-black tracking-[-0.04em]">
                        {progressCount}<span className="text-sm text-white/30">/{challenge.goal} {challenge.unit}</span>
                      </p>
                      {isThirtyDay && hasCurrentOfficialRace ? (
                        <p className="mt-1 text-[10px] font-semibold text-white/34">
                          Active streak: {currentThirtyStreak.days} days{currentThirtyBest > currentThirtyStreak.days ? ` · Best: ${currentThirtyBest}` : ""}
                        </p>
                      ) : null}
                    </div>
                    <p className={`text-xs font-black ${isThirtyDay ? "text-[#fde68a]" : "text-[#99f6e4]"}`}>{progressPercent}%</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${isThirtyDay ? "bg-[#facc15]" : "bg-[#22c7b8]"}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4">
                {isThirtyDay && !hasCurrentOfficialRace && !race.isStartDay ? (
                  <div className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#facc15]/16 bg-[#facc15]/[0.045] px-4 py-3 text-center text-sm font-black text-[#fde68a]">
                    <CalendarDays className="h-4 w-4 shrink-0" /> Next race starts {race.nextLabel}
                  </div>
                ) : !joined ? (
                  <button
                    type="button"
                    onClick={joinChallenge}
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black shadow-[0_12px_28px_rgba(34,199,184,.12)] ${
                      isThirtyDay
                        ? "bg-[#facc15] text-[#2a2104]"
                        : "bg-[#22c7b8] text-[#042f2e]"
                    }`}
                  >
                    <Trophy className="h-4 w-4" /> {isThirtyDay ? `Join ${race.currentLabel} Race` : "Join Challenge"}
                  </button>
                ) : !challenge.repeatable && completed ? (
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
                        : isThirtyDay
                          ? "bg-[#facc15] text-[#2a2104] shadow-[0_12px_28px_rgba(250,204,21,.10)]"
                          : "bg-[#22c7b8] text-[#042f2e] shadow-[0_12px_28px_rgba(34,199,184,.12)]"
                    }`}
                  >
                    {alreadyCheckedIn ? <Check className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
                    {alreadyCheckedIn
                      ? challenge.cadence === "weekly"
                        ? "Checked in this week"
                        : "Checked in today"
                      : actionLabel}
                  </button>
                )}
                <p className="mt-3 text-center text-[10px] font-semibold text-white/30">
                  +{challenge.pointsPerCheckIn} points per check-in · +{challenge.completionBonus} first-completion bonus
                </p>

                {isThirtyDay ? (
                  <div className="mt-3 flex items-start gap-2.5 rounded-[17px] border border-[#facc15]/13 bg-[#facc15]/[0.035] px-3 py-3">
                    <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[#facc15]/65" />
                    <p className="text-[10px] font-semibold leading-4 text-white/42">
                      The official race always starts on the 1st. Once you are in, every 30 consecutive active days can build another Monthly Draw entry while your streak stays alive.
                    </p>
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {isThirtyDay && (hasCurrentOfficialRace || currentThirtyReward.activeEntries > 0) ? (
            <MonthlyDrawCard streak={currentThirtyStreak} rewardState={currentThirtyReward} draw={draw} />
          ) : null}

          <section>
            <div className="mb-3 flex items-center justify-between px-1">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#5eead4]/48">Your momentum</p>
                <h3 className="mt-1 text-base font-black">Challenge record</h3>
              </div>
              <Sparkles className="h-4 w-4 text-[#5eead4]/45" />
            </div>
            {isThirtyDay ? (
              <div className="grid grid-cols-3 gap-2">
                <ChallengeMetric icon={Flame} value={hasCurrentOfficialRace ? currentThirtyStreak.days : 0} label="Streak days" />
                <ChallengeMetric icon={Ticket} value={currentThirtyReward.activeEntries} label="Active entries" tone="gold" />
                <ChallengeMetric icon={Award} value={currentThirtyBest} label="Best streak" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <ChallengeMetric icon={Flame} value={summary.joinedCount} label="Joined" />
                <ChallengeMetric icon={CheckCircle2} value={summary.completedCount} label="Finished" />
                <ChallengeMetric icon={Award} value={summary.points} label="Points" />
              </div>
            )}
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
                description={
                  thirtyDayQualified
                    ? "Active badge. Keep your streak alive to keep this status and your entries."
                    : currentThirtyBest >= THIRTY_DAY_BLOCK
                      ? `Previously reached ${currentThirtyBest} days. Rebuild a 30-day active streak to reactivate.`
                      : "Complete 30 consecutive days in an official race to activate this badge and your first draw entry."
                }
                unlocked={thirtyDayQualified}
                accent="gold"
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

      {isChallengeHubInfoOpen ? (
        <div
          className="challenge-hub-info-backdrop fixed inset-0 z-[240] flex items-center justify-center p-4 sm:p-6"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeChallengeHubInfo();
          }}
        >
          <section
            id={CHALLENGE_HUB_INFO_DIALOG_ID}
            className="challenge-hub-info-dialog relative w-full max-w-md rounded-[26px] p-5 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby={CHALLENGE_HUB_INFO_TITLE_ID}
            aria-describedby={CHALLENGE_HUB_INFO_DESCRIPTION_ID}
          >
            <button
              ref={challengeHubInfoCloseRef}
              type="button"
              className="challenge-hub-info-close absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl"
              aria-label="Close Challenge Hub information"
              onClick={closeChallengeHubInfo}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <p className="challenge-hub-info-eyebrow pr-12 text-[9px] font-black uppercase tracking-[0.18em]">
              Challenge Hub
            </p>
            <h3
              id={CHALLENGE_HUB_INFO_TITLE_ID}
              className="mt-2 pr-12 text-[21px] font-black leading-[1.2] tracking-[-0.025em]"
            >
              Consistency is the advantage.
            </h3>
            <p
              id={CHALLENGE_HUB_INFO_DESCRIPTION_ID}
              className="challenge-hub-info-copy mt-4 text-[12px] font-semibold leading-6"
            >
              Money habits are built through repeated action. Weekly challenges train short streaks, Monthly Missions reward steady in-app activity, and the 30-Day Race tests long-form discipline. CLARA measures your consistency—not your income.
            </p>
            <div className="challenge-hub-info-principle mt-4 rounded-[18px] px-3.5 py-3 text-[11px] font-extrabold leading-5">
              Small actions, repeated well, become financial strength.
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
