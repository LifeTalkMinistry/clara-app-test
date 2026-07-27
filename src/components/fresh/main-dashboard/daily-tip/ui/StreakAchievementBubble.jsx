import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Sparkles, Trophy, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useDailyCheckIn from "../logic/useDailyCheckIn";

const ACTIVE_CURRENT_STATE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";
const GUIDE_MODE_CHANGE_EVENT = "clara:guide-mode-change";

function hasActiveSampleMode() {
  if (typeof window === "undefined") return false;
  try {
    const value = JSON.parse(window.localStorage.getItem(ACTIVE_CURRENT_STATE_KEY) || "null");
    return value?.mode === "current_state";
  } catch {
    return false;
  }
}

function getBubbleCopy(event) {
  const streakCount = Math.max(0, Number(event?.streakCount) || 0);
  const previousStreak = Math.max(0, Number(event?.previousStreak) || streakCount);
  const dayLabel = previousStreak === 1 ? "day" : "days";

  switch (event?.type) {
    case "daily_check_in_completed":
      return streakCount <= 1
        ? {
            eyebrow: "Your streak starts here",
            title: "You showed up today! 🔥",
            body: "Day 1 is complete. You checked in, protected your money discipline, and started building the habit.",
            action: "Keep building",
            icon: Flame,
          }
        : {
            eyebrow: "Your streak continues",
            title: `You showed up for ${streakCount} days straight! 🔥`,
            body: "Another day protected. Another promise to yourself kept. Keep building the discipline.",
            action: "Keep going",
            icon: Flame,
          };
    case "streak_reset":
      return {
        eyebrow: "Your progress remains",
        title: `You showed up for ${previousStreak} ${dayLabel} straight! 🔥`,
        body: `That consistency was real progress. A full daily check-in was missed, so your active streak has restarted—but your ${previousStreak}-day achievement remains part of your journey.`,
        action: "Start again today",
        icon: Flame,
      };
    case "streak_7_day":
      return {
        eyebrow: "Consistency milestone",
        title: "7 days of consistency! 🔥",
        body: "You showed up for your money discipline seven days in a row. Keep protecting the habit you are building.",
        action: "Keep going",
        icon: Flame,
      };
    case "streak_14_day":
      return {
        eyebrow: "Consistency milestone",
        title: "Two weeks strong! ✨",
        body: "You have checked in for 14 consecutive days. Your consistency is becoming part of how you manage money.",
        action: "Continue the streak",
        icon: Sparkles,
      };
    case "streak_30_completed":
      return {
        eyebrow: "30-day achievement unlocked",
        title: "30 DAYS COMPLETED! 🏆",
        body: "You checked in for 30 consecutive days. You proved that you can repeatedly show up and stay committed to your financial growth.",
        footer: "Your streak continues. Let’s see how far you can take it.",
        action: "Keep building",
        icon: Trophy,
      };
    case "new_longest_streak":
      return {
        eyebrow: "New personal best",
        title: `${streakCount}-day streak achieved! ✨`,
        body: "You have moved beyond your previous best. Keep building this habit one thoughtful day at a time.",
        action: "Keep going",
        icon: Sparkles,
      };
    default:
      return null;
  }
}

export default function StreakAchievementBubble() {
  const { user } = useAuth();
  const [guideMode, setGuideMode] = useState(false);
  const [sampleMode, setSampleMode] = useState(() => hasActiveSampleMode());
  const actionRef = useRef(null);
  const simulationMode = guideMode || sampleMode;
  const { pendingBubble, dismissPendingBubble } = useDailyCheckIn({
    userId: user?.id || "guest",
    simulationMode,
  });
  const copy = useMemo(() => getBubbleCopy(pendingBubble), [pendingBubble]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleGuideModeChange = (event) => setGuideMode(Boolean(event?.detail?.active));
    const syncSampleMode = () => setSampleMode(hasActiveSampleMode());

    window.addEventListener(GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);
    window.addEventListener("clara-young-professional-current-state-loaded", syncSampleMode);
    window.addEventListener("storage", syncSampleMode);

    return () => {
      window.removeEventListener(GUIDE_MODE_CHANGE_EVENT, handleGuideModeChange);
      window.removeEventListener("clara-young-professional-current-state-loaded", syncSampleMode);
      window.removeEventListener("storage", syncSampleMode);
    };
  }, []);

  useEffect(() => {
    if (!copy || typeof window === "undefined") return undefined;

    const focusTimer = window.setTimeout(() => actionRef.current?.focus?.(), 80);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") dismissPendingBubble(pendingBubble?.id);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [copy, dismissPendingBubble, pendingBubble?.id]);

  if (simulationMode || !pendingBubble || !copy) return null;

  const Icon = copy.icon;
  const isThirtyDayAchievement = pendingBubble.type === "streak_30_completed";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[220] flex justify-center px-3 pb-[max(18px,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-labelledby="clara-streak-bubble-title"
      aria-describedby="clara-streak-bubble-body"
    >
      <div
        className={`pointer-events-auto relative w-full max-w-[404px] overflow-hidden rounded-[28px] border p-5 text-white shadow-[0_26px_90px_rgba(0,0,0,0.62),0_0_55px_rgba(34,211,238,0.14)] backdrop-blur-2xl ${
          isThirtyDayAchievement
            ? "border-amber-200/24 bg-[linear-gradient(145deg,rgba(9,25,48,0.98),rgba(31,27,68,0.97)_52%,rgba(49,34,10,0.96))]"
            : "border-cyan-100/16 bg-[linear-gradient(145deg,rgba(5,19,41,0.97),rgba(8,24,55,0.96)_52%,rgba(18,13,52,0.96))]"
        }`}
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-cyan-300/14 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-48 w-48 rounded-full bg-indigo-400/16 blur-3xl" />
        {isThirtyDayAchievement ? (
          <div className="pointer-events-none absolute right-4 top-3 h-24 w-24 rounded-full bg-amber-300/14 blur-2xl" />
        ) : null}

        <button
          type="button"
          onClick={() => dismissPendingBubble(pendingBubble.id)}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/58 transition hover:bg-white/[0.10] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
          aria-label="Close streak message"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 pr-8">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] ${
              isThirtyDayAchievement
                ? "border-amber-100/20 bg-amber-300/12 text-amber-100"
                : "border-cyan-100/15 bg-cyan-300/10 text-cyan-100"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>

          <p className="mt-4 text-[9px] font-black uppercase tracking-[0.24em] text-cyan-100/58">
            {copy.eyebrow}
          </p>
          <h2
            id="clara-streak-bubble-title"
            className="mt-2 text-[21px] font-black leading-tight tracking-[-0.035em] text-white"
          >
            {copy.title}
          </h2>
          <p
            id="clara-streak-bubble-body"
            className="mt-3 text-[12.5px] font-semibold leading-relaxed text-cyan-50/76"
          >
            {copy.body}
          </p>
          {copy.footer ? (
            <p className="mt-2 text-[11.5px] font-black leading-relaxed text-amber-100/82">
              {copy.footer}
            </p>
          ) : null}

          <button
            ref={actionRef}
            type="button"
            onClick={() => dismissPendingBubble(pendingBubble.id)}
            className={`mt-5 w-full rounded-2xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.15em] shadow-[0_14px_34px_rgba(0,0,0,0.24)] transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              isThirtyDayAchievement
                ? "bg-amber-200 text-slate-950 focus-visible:ring-amber-100"
                : "bg-cyan-200 text-slate-950 focus-visible:ring-cyan-100"
            }`}
          >
            {copy.action}
          </button>
        </div>
      </div>
    </div>
  );
}
