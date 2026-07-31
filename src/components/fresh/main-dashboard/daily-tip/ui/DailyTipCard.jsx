import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useDailyTip from "../logic/useDailyTip";
import useDailyCheckIn from "../logic/useDailyCheckIn";
import { exitYoungProfessionalCurrentState } from "@/lib/clara-young-professional-current-state";
import "./daily-tip-premium-flip.css";

const ACTIVE_CURRENT_STATE_KEY = "CLARA_ACTIVE_CURRENT_STATE_V1";
const FLIP_UNLOCK_DELAY_MS = 700;
const CHECK_IN_DAYS = 30;

function readActiveCurrentState() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ACTIVE_CURRENT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.mode === "current_state" ? parsed : null;
  } catch {
    return null;
  }
}

function pluralizeDay(value) {
  return `${value} ${value === 1 ? "day" : "days"}`;
}

export default function DailyTipCard({
  userId: providedUserId,
  hasCommittedAccess = true,
  onOpenCommitmentBooklet,
  flushSpacing = false,
  isGuideMode = false,
  guideStep = 0,
  isDailyTipGuideActive = false,
  onGuideDailyTipTap,
}) {
  const { user } = useAuth();
  const [activeCurrentState, setActiveCurrentState] = useState(() => readActiveCurrentState());
  const simulationMode = isGuideMode || Boolean(activeCurrentState);
  const userId = providedUserId || user?.id || "guest";
  const { tip, hasSeenToday, markSeenToday } = useDailyTip({ simulationMode });
  const {
    todayKey,
    checkedInToday,
    completedCheckInDays,
    challengeDay,
    challengeDotStates,
    challengeStatus,
    currentStreak,
    checkInToday,
  } = useDailyCheckIn({ userId, simulationMode });
  const [flipped, setFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationLevel, setCelebrationLevel] = useState("normal");
  const [checkInFeedback, setCheckInFeedback] = useState("");
  const isFlippingRef = useRef(false);
  const flipUnlockTimerRef = useRef(null);
  const celebrationTimerRef = useRef(null);
  const [exiting, setExiting] = useState(false);
  const spacingClass = flushSpacing ? "px-3" : "px-3 mt-1.5";
  const isGuideStepActive = isGuideMode && isDailyTipGuideActive && guideStep === 0;
  const completedDayCount = Math.min(
    CHECK_IN_DAYS,
    Math.max(0, Number(completedCheckInDays) || 0),
  );
  const displayedChallengeDay = challengeStatus === "completed"
    ? CHECK_IN_DAYS
    : Math.min(CHECK_IN_DAYS, Math.max(1, Number(challengeDay) || 1));
  const personalStreak = Math.max(0, Number(currentStreak) || 0);
  const cardHeadline = isGuideMode
    ? "Today’s money reminder"
    : challengeStatus === "completed"
      ? "30-Day Challenge Complete"
      : `Day ${displayedChallengeDay} of ${CHECK_IN_DAYS}`;
  const cardSubtitle = checkInFeedback
    ? checkInFeedback
    : isGuideMode
      ? "Tap to see how CLARA gives you one practical money reminder each day."
      : challengeStatus === "completed"
        ? "You completed all 30 local Daily Money Tip check-ins."
        : "";
  const checkInPrompt = personalStreak > 0
    ? `Keep your ${personalStreak}-day streak going. Check in today.`
    : completedDayCount > 0
      ? "Continue your 30-day progress. Check in today."
      : "Start your 30-day streak. Check in today.";
  const showProgressDots = Boolean(
    isGuideMode ||
      checkedInToday ||
      challengeStatus === "completed" ||
      checkInFeedback,
  );
  const actionLabel = isGuideMode
    ? "Preview"
    : checkedInToday
      ? "Checked in ✓"
      : isFlipping
        ? "Checking…"
        : "Tap to check in";

  const releaseFlipLock = () => {
    if (flipUnlockTimerRef.current) {
      window.clearTimeout(flipUnlockTimerRef.current);
      flipUnlockTimerRef.current = null;
    }

    isFlippingRef.current = false;
    setIsFlipping(false);
  };

  useEffect(() => {
    const syncActiveState = () => setActiveCurrentState(readActiveCurrentState());

    syncActiveState();
    window.addEventListener("clara-young-professional-current-state-loaded", syncActiveState);
    window.addEventListener("storage", syncActiveState);

    return () => {
      window.removeEventListener("clara-young-professional-current-state-loaded", syncActiveState);
      window.removeEventListener("storage", syncActiveState);
    };
  }, []);

  useEffect(() => {
    if (!isGuideMode) return;
    setFlipped(false);
    setCheckInFeedback("");
    releaseFlipLock();
  }, [isGuideMode, guideStep]);

  useEffect(() => {
    setFlipped(false);
    setShowCelebration(false);
    setCheckInFeedback("");
    releaseFlipLock();
  }, [todayKey]);

  useEffect(() => {
    setCheckInFeedback("");
  }, [userId]);

  useEffect(() => {
    if (checkedInToday) setCheckInFeedback("");
  }, [checkedInToday]);

  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;

      if (flipUnlockTimerRef.current) {
        window.clearTimeout(flipUnlockTimerRef.current);
      }

      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  const triggerCheckInCelebration = (milestoneType = null) => {
    if (typeof window === "undefined") return;

    const level =
      milestoneType === "streak_30_completed"
        ? "thirty"
        : milestoneType === "streak_14_day"
          ? "fourteen"
          : milestoneType === "streak_7_day"
            ? "seven"
            : "normal";
    const duration =
      level === "thirty" ? 1900 : level === "fourteen" ? 1450 : level === "seven" ? 1200 : 950;

    setShowCelebration(false);
    setCelebrationLevel(level);

    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
      celebrationTimerRef.current = null;
    }

    const startCelebration = () => {
      setShowCelebration(true);
      celebrationTimerRef.current = window.setTimeout(() => {
        setShowCelebration(false);
        celebrationTimerRef.current = null;
      }, duration);
    };

    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(startCelebration);
      return;
    }

    startCelebration();
  };

  const handleFlip = () => {
    if (isGuideMode) {
      if (isGuideStepActive) onGuideDailyTipTap?.();
      return;
    }

    if (!hasCommittedAccess) {
      onOpenCommitmentBooklet?.();
      return;
    }

    if (isFlippingRef.current) return;

    const willRevealTip = !flipped;
    isFlippingRef.current = true;
    setIsFlipping(true);

    if (!willRevealTip) {
      setFlipped(false);
      flipUnlockTimerRef.current = window.setTimeout(releaseFlipLock, FLIP_UNLOCK_DELAY_MS);
      return;
    }

    const checkInResult = checkInToday();
    const mayRevealTip =
      checkInResult?.status === "completed" ||
      checkInResult?.status === "already_checked_in";

    if (!mayRevealTip) {
      if (checkInResult?.status === "identity_unavailable") {
        setCheckInFeedback("Sign in with your CLARA account to save today’s check-in.");
      } else if (checkInResult?.status === "busy") {
        setCheckInFeedback("Today’s check-in is still being saved. Please tap again.");
      } else {
        setCheckInFeedback("We couldn’t save today’s check-in. Tap to retry.");
      }
      releaseFlipLock();
      return;
    }

    setCheckInFeedback("");

    if (checkInResult?.status === "completed") {
      triggerCheckInCelebration(checkInResult.milestoneType);
    }

    setFlipped(true);

    if (!hasSeenToday) {
      markSeenToday();
    }

    flipUnlockTimerRef.current = window.setTimeout(releaseFlipLock, FLIP_UNLOCK_DELAY_MS);
  };

  const handleFlipTransitionEnd = (event) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    releaseFlipLock();
  };

  const handleExitCurrentState = async () => {
    if (exiting) return;

    try {
      setExiting(true);
      await exitYoungProfessionalCurrentState();
      setActiveCurrentState(null);

      window.setTimeout(() => {
        window.location.hash = "#/dashboard";
        window.location.reload();
      }, 350);
    } catch (error) {
      console.error("Unable to exit Sample Data learning mode:", error);
      setExiting(false);
    }
  };

  if (!isGuideMode && activeCurrentState) {
    return (
      <div className={`clara-budget-focus-shift clara-budget-focus-tip ${spacingClass}`}>
        <div className="relative h-[150px] w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/40 to-indigo-500/10 p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.10),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_48%)]" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-black uppercase leading-none tracking-[0.18em] text-cyan-100/60">
                Sample Mode
              </div>
              <button
                type="button"
                onClick={handleExitCurrentState}
                disabled={exiting}
                className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-white/75 transition hover:bg-white/12 disabled:opacity-60"
              >
                {exiting ? "Exiting..." : "Exit"}
              </button>
            </div>

            <div className="mt-[18px] max-w-[19.5rem] pr-2">
              <p className="text-[11.6px] font-semibold leading-[1.5] text-cyan-50/74">
                Explore without risking real records. Practice first so CLARA can show how it reads income, explains your setup, and guides decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sparkCount =
    celebrationLevel === "thirty"
      ? 30
      : celebrationLevel === "fourteen"
        ? 24
        : celebrationLevel === "seven"
          ? 20
          : 18;

  return (
    <div
      data-clara-daily-tip-card="true"
      className={`clara-budget-focus-shift clara-budget-focus-tip ${spacingClass} ${
        isGuideStepActive ? "relative z-[70]" : ""
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        data-check-in-state={checkedInToday ? "completed-local" : "available"}
        onClick={handleFlip}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleFlip();
          }
        }}
        aria-label={
          isGuideMode
            ? "Open the simulated Daily Money Tip guide step"
            : hasCommittedAccess
              ? checkedInToday
                ? "Show today’s Daily Money Tip"
                : "Check in for today and reveal Daily Money Tip"
              : "Open the Committed Version to unlock Daily Check-In"
        }
        aria-pressed={flipped}
        aria-disabled={isFlipping && hasCommittedAccess}
        className={`group relative h-[clamp(160px,21dvh,176px)] w-full cursor-pointer overflow-hidden rounded-2xl bg-transparent text-left outline-none transition-[box-shadow,filter,transform] duration-300 ${
          isGuideStepActive
            ? "ring-2 ring-cyan-200/80 shadow-[0_0_0_1px_rgba(255,255,255,0.10),0_0_42px_rgba(34,211,238,0.34)]"
            : ""
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <div className="clara-daily-tip-scene">
          <div
            onTransitionEnd={handleFlipTransitionEnd}
            className={`clara-preserve-flip-motion clara-daily-tip-flipper ${
              flipped ? "clara-daily-tip-flipper--flipped" : ""
            } ${
              hasCommittedAccess
                ? ""
                : "pointer-events-none opacity-45 grayscale-[0.78] saturate-[0.68]"
            }`}
          >
            <div className="clara-preserve-flip-face clara-daily-tip-face clara-daily-tip-face--front rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/40 to-indigo-500/10">
              <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.10),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_48%)]" />

              <div className="relative grid h-full grid-rows-[auto_1fr_auto_auto] gap-y-1.5 px-4 py-3 text-white">
                <div className="text-[8.5px] font-black uppercase leading-none tracking-[0.24em] text-cyan-200/70">
                  Daily Money Tip
                </div>

                <div className="flex min-h-0 items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[clamp(18px,4.8vw,21px)] font-black leading-none tracking-[-0.035em] text-white">
                      {cardHeadline}
                    </div>

                    {cardSubtitle ? (
                      <p className={`mt-1 max-w-[14.5rem] text-[10px] font-semibold leading-[1.25] ${
                        checkInFeedback ? "text-rose-200/90" : "text-cyan-50/72"
                      }`}>
                        {cardSubtitle}
                      </p>
                    ) : null}
                  </div>

                  <span className="clara-checkin-action shrink-0 px-3 py-2 text-[8px] font-black uppercase tracking-[0.12em]">
                    {actionLabel}
                  </span>
                </div>

                {showProgressDots ? (
                  <div
                    className="clara-checkin-grid"
                    role="img"
                    aria-label={`30-day progress: ${completedDayCount} of ${CHECK_IN_DAYS} completed`}
                  >
                    {(challengeDotStates?.length ? challengeDotStates : Array.from({ length: CHECK_IN_DAYS })).map((dot, dotIndex) => {
                      const isDone = Boolean(dot?.completed);
                      const isToday = Boolean(dot?.today);
                      const isMissed = Boolean(dot?.pastMissed);

                      return (
                        <span
                          key={dot?.dateKey || dotIndex}
                          aria-hidden="true"
                          className={`clara-checkin-dot ${isDone ? "clara-checkin-dot--done" : ""} ${
                            isToday ? "clara-checkin-dot--today" : ""
                          } ${isMissed ? "clara-checkin-dot--missed" : ""}`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[42px] items-center justify-center px-3 text-center">
                    <p className="max-w-[16rem] text-[10.5px] font-bold leading-[1.35] text-cyan-50/78">
                      {checkInPrompt}
                    </p>
                  </div>
                )}

                <div className="clara-checkin-metrics" aria-label="Daily check-in summary">
                  <span>
                    <small>Personal streak</small>
                    <strong>{pluralizeDay(personalStreak)}</strong>
                  </span>
                  <span>
                    <small>30-day progress</small>
                    <strong>{completedDayCount}/{CHECK_IN_DAYS}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="clara-preserve-flip-face clara-daily-tip-face clara-daily-tip-face--back rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-indigo-500/15 via-slate-950/70 to-cyan-400/10">
              <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.12),transparent_44%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.12),transparent_48%)]" />

              <div className="relative grid h-full grid-rows-[auto_1fr_auto] px-5 py-4 text-center text-white">
                <div className="pt-1 text-center">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/66">
                    Today’s Money Tip
                  </span>
                </div>

                <div className="flex items-center justify-center">
                  <p className="max-w-[20rem] text-[13px] font-semibold leading-relaxed text-white/90">
                    {tip}
                  </p>
                </div>

                <div>
                  <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-cyan-100/25 to-transparent" />
                  <p className="mt-2 text-[8px] font-bold uppercase tracking-[0.14em] text-white/42">
                    Tap to return to progress
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {showCelebration ? (
          <div
            className="clara-checkin-celebration"
            aria-hidden="true"
            style={{
              transform:
                celebrationLevel === "thirty"
                  ? "scale(1.08)"
                  : celebrationLevel === "fourteen"
                    ? "scale(1.04)"
                    : undefined,
            }}
          >
            {Array.from({ length: sparkCount }).map((_, index) => (
              <span
                key={index}
                className={`clara-checkin-spark clara-checkin-spark--${(index % 18) + 1}`}
              />
            ))}
          </div>
        ) : null}

        {!hasCommittedAccess ? (
          <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/[0.14] backdrop-blur-[0.8px]">
            <span className="rounded-[22px] border border-white/16 bg-[rgba(9,18,36,0.72)] px-4 py-3 text-center text-white shadow-[0_16px_42px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] text-white/76">
                <Lock className="h-3.5 w-3.5" />
              </span>
              <span className="mt-2 block text-[9px] font-black uppercase tracking-[0.2em] text-white/58">
                Committed Version
              </span>
              <span className="mt-1 block text-[11px] font-black text-white/88">
                Tap to unlock
              </span>
            </span>
          </span>
        ) : null}
      </div>
    </div>
  );
}
