import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, Flame, LoaderCircle, Share2, Sparkles, Trophy, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useDailyCheckIn from "../logic/useDailyCheckIn";
import {
  createStreakShareImage,
  downloadShareImage,
  getEventStreakCount,
  isShareableStreakEvent,
} from "./streakShareImage";

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
            eyebrow: "Daily awareness streak",
            title: "Day 1 is active",
            body: "You opened CLARA and checked your financial position today. Your awareness streak starts here.",
            action: "Got it",
            icon: Eye,
          }
        : {
            eyebrow: "Daily awareness streak",
            title: `Day ${streakCount} is active`,
            body: `You showed up and checked your financial position today. That’s ${streakCount} days of financial awareness in a row.`,
            action: "Keep showing up",
            icon: Eye,
          };
    case "streak_reset":
      return {
        eyebrow: "Your progress remains",
        title: `You stayed aware for ${previousStreak} ${dayLabel} straight`,
        body: `That consistency still counts. A day was missed, so your active awareness streak restarted—but your ${previousStreak}-day achievement remains part of your progress.`,
        action: "Build again",
        icon: Flame,
      };
    case "streak_7_day":
      return {
        eyebrow: "Awareness milestone",
        title: "7 days of showing up 🔥",
        body: "For seven days straight, you opened CLARA and stayed aware of your financial position.",
        action: "Keep showing up",
        icon: Flame,
      };
    case "streak_14_day":
      return {
        eyebrow: "Awareness milestone",
        title: "Two weeks financially aware ✨",
        body: "You have shown up for 14 consecutive days. Checking your financial position is becoming a habit.",
        action: "Continue the streak",
        icon: Sparkles,
      };
    case "streak_30_completed":
      return {
        eyebrow: "30-day awareness unlocked",
        title: "30 DAYS OF AWARENESS 🏆",
        body: "You showed up for 30 consecutive days and kept your financial position visible instead of ignoring it.",
        footer: "Your streak continues. Keep showing up.",
        action: "Keep building",
        icon: Trophy,
      };
    case "new_longest_streak":
      return {
        eyebrow: "New awareness record",
        title: `${streakCount}-day streak achieved ✨`,
        body: "You moved beyond your previous best. Keep making financial awareness part of your everyday life.",
        action: "Keep showing up",
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
  const [shareState, setShareState] = useState("idle");
  const actionRef = useRef(null);
  const shareResetTimerRef = useRef(null);
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

  useEffect(() => {
    setShareState("idle");
    if (shareResetTimerRef.current && typeof window !== "undefined") {
      window.clearTimeout(shareResetTimerRef.current);
      shareResetTimerRef.current = null;
    }
  }, [pendingBubble?.id]);

  useEffect(
    () => () => {
      if (shareResetTimerRef.current && typeof window !== "undefined") {
        window.clearTimeout(shareResetTimerRef.current);
      }
    },
    [],
  );

  if (simulationMode || !pendingBubble || !copy) return null;

  const Icon = copy.icon;
  const isThirtyDayAchievement = pendingBubble.type === "streak_30_completed";
  const canShareStreak = isShareableStreakEvent(pendingBubble.type);
  const streakCount = getEventStreakCount(pendingBubble);

  const scheduleShareStateReset = () => {
    if (typeof window === "undefined") return;
    if (shareResetTimerRef.current) window.clearTimeout(shareResetTimerRef.current);
    shareResetTimerRef.current = window.setTimeout(() => {
      setShareState("idle");
      shareResetTimerRef.current = null;
    }, 2400);
  };

  const handleShareStreak = async () => {
    if (shareState === "generating") return;

    setShareState("generating");

    try {
      const blob = createStreakShareImage(pendingBubble);
      const fileName = `clara-${streakCount}-day-streak.png`;
      const shareTitle = `My ${streakCount}-day CLARA streak`;
      const shareText = `I stayed financially aware for ${streakCount} ${streakCount === 1 ? "day" : "days"} straight with CLARA.`;
      const file = typeof File === "function" ? new File([blob], fileName, { type: "image/png" }) : null;

      let shared = false;
      if (file && typeof navigator !== "undefined" && typeof navigator.share === "function") {
        let canUseFileShare = true;
        if (typeof navigator.canShare === "function") {
          try {
            canUseFileShare = navigator.canShare({ files: [file] });
          } catch {
            canUseFileShare = false;
          }
        }

        if (canUseFileShare) {
          try {
            await navigator.share({ files: [file], title: shareTitle, text: shareText });
            shared = true;
          } catch (error) {
            if (error?.name === "AbortError") {
              setShareState("idle");
              return;
            }
          }
        }
      }

      if (shared) {
        setShareState("shared");
      } else {
        downloadShareImage(blob, fileName);
        setShareState("saved");
      }
      scheduleShareStateReset();
    } catch {
      setShareState("error");
      scheduleShareStateReset();
    }
  };

  const shareButtonLabel =
    shareState === "generating"
      ? "Preparing image"
      : shareState === "shared"
        ? "Shared"
        : shareState === "saved"
          ? "Image saved"
          : shareState === "error"
            ? "Try sharing again"
            : "Share my streak";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[max(14px,env(safe-area-inset-top))] z-[220] flex justify-center px-3"
      role="dialog"
      aria-modal="false"
      aria-live="polite"
      aria-labelledby="clara-streak-bubble-title"
      aria-describedby="clara-streak-bubble-body"
    >
      <div
        className={`pointer-events-auto relative w-full max-w-[680px] overflow-hidden rounded-[22px] border px-4 py-3.5 text-white shadow-[0_18px_48px_rgba(0,0,0,0.42),0_0_34px_rgba(34,211,238,0.10)] backdrop-blur-2xl ${
          isThirtyDayAchievement
            ? "border-amber-200/24 bg-[linear-gradient(145deg,rgba(9,25,48,0.985),rgba(31,27,68,0.98)_52%,rgba(49,34,10,0.97))]"
            : "border-cyan-100/20 bg-[linear-gradient(145deg,rgba(7,26,57,0.985),rgba(5,18,42,0.985))]"
        }`}
      >
        <div className="pointer-events-none absolute -left-16 -top-16 h-36 w-36 rounded-full bg-cyan-300/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-44 w-44 rounded-full bg-indigo-400/14 blur-3xl" />

        <button
          type="button"
          onClick={() => dismissPendingBubble(pendingBubble.id)}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/55 transition hover:bg-white/[0.10] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
          aria-label="Close streak message"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10 flex items-start gap-3 pr-9">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
            isThirtyDayAchievement
              ? "border-amber-100/20 bg-amber-300/12 text-amber-100"
              : "border-cyan-100/15 bg-cyan-300/10 text-cyan-100"
          }`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/58">{copy.eyebrow}</p>
            <h2 id="clara-streak-bubble-title" className="mt-1 text-[16px] font-black leading-tight tracking-[-0.025em] text-white">{copy.title}</h2>
            <p id="clara-streak-bubble-body" className="mt-1 text-[11.5px] font-semibold leading-[1.45] text-cyan-50/72">{copy.body}</p>
            {copy.footer ? <p className="mt-1.5 text-[11px] font-black text-amber-100/82">{copy.footer}</p> : null}
          </div>
        </div>

        <div className={`relative z-10 mt-3 grid gap-2 ${canShareStreak ? "grid-cols-[1fr_auto]" : "grid-cols-1"}`}>
          <button
            ref={actionRef}
            type="button"
            onClick={() => dismissPendingBubble(pendingBubble.id)}
            className={`min-h-10 rounded-[14px] px-4 text-[10.5px] font-black uppercase tracking-[0.13em] transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 ${
              isThirtyDayAchievement
                ? "bg-amber-200 text-slate-950 focus-visible:ring-amber-100"
                : "bg-[linear-gradient(135deg,#38d9ff,#58a6ff)] text-slate-950 focus-visible:ring-cyan-100"
            }`}
          >
            {copy.action}
          </button>

          {canShareStreak ? (
            <button
              type="button"
              onClick={handleShareStreak}
              disabled={shareState === "generating"}
              className="flex min-h-10 items-center justify-center gap-2 rounded-[14px] border border-cyan-100/14 bg-white/[0.045] px-4 text-[10px] font-black uppercase tracking-[0.11em] text-cyan-50/82 transition hover:bg-white/[0.08] active:scale-[0.99] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/70"
            >
              {shareState === "generating" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : shareState === "shared" || shareState === "saved" ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              {shareButtonLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
