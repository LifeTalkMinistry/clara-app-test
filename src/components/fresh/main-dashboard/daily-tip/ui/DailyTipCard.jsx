import { useEffect, useRef, useState } from "react";
import { Lock, ThumbsDown, ThumbsUp } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import useDailyTip from "../logic/useDailyTip";
import useDailyCheckIn from "../logic/useDailyCheckIn";
import useDailyTipFeedback from "../logic/useDailyTipFeedback";
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
  const { tip, tipId, hasSeenToday, markSeenToday } = useDailyTip({ simulationMode });
  const {
    todayKey,
    checkedInToday,
    completedCheckInDays,
    challengeDay,
    challengeDotStates,
    challengeStatus,
    currentStreak,
  } = useDailyCheckIn({ userId, simulationMode });
  const [flipped, setFlipped] = useState(false);
  const { reaction, saving: feedbackSaving, syncNotice, react } = useDailyTipFeedback({
    userId,
    tipId,
    enabled: !simulationMode && hasCommittedAccess,
    revealed: flipped,
  });
  const [isFlipping, setIsFlipping] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationLevel, setCelebrationLevel] = useState("normal");
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
      ? "30 Days of Awareness"
      : `Day ${displayedChallengeDay} of ${CHECK_IN_DAYS}`;
  const cardSubtitle = isGuideMode
    ? "Tap to see how CLARA gives you one practical money reminder each day."
    : challengeStatus === "completed"
      ? "You showed up and checked your financial position for 30 days."
      : "";
  const showProgressDots = Boolean(
    isGuideMode ||
      checkedInToday ||
      challengeStatus === "completed",
  );
  const actionLabel = isGuideMode
    ? "Preview"
    : checkedInToday
      ? "Awareness active ✓"
      : "Opening today…";

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
    releaseFlipLock();
  }, [isGuideMode, guideStep]);

  useEffect(() => {
    setFlipped(false);
    setShowCelebration(false);
    releaseFlipLock();
  }, [todayKey]);

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

    setFlipped(true);

    if (!hasSeenToday) {
      markSeenToday();
    }

    flipUnlockTimerRef.current = window.setTimeout(releaseFlipLock, FLIP_UNLOCK_DELAY_MS);
  };

  const handleTipReaction = (event, requestedReaction) => {
    event.preventDefault();
    event.stopPropagation();
    void react(requestedReaction);
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

  const sparkCount = celebrationLevel === "thirty" ? 30 : celebrationLevel === "fourteen" ? 24 : celebrationLevel === "seven" ? 20 : 18;

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
        aria-label={isGuideMode ? "Open the simulated Daily Money Tip guide step" : "Show today’s Daily Money Tip"}
        aria-pressed={flipped}
        aria-disabled={isFlipping && hasCommittedAccess}
        className={`group relative h-[clamp(150px,18.5dvh,160px)] w-full cursor-pointer overflow-hidden rounded-2xl bg-transparent text-left outline-none transition-[box-shadow,filter,transform] duration-300 ${
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

              <div className="relative grid h-full grid-rows-[auto_1fr_auto_auto] gap-y-1 px-4 py-2.5 text-white">
                <div className="text-[8.5px] font-black uppercase leading-none tracking-[0.24em] text-cyan-200/70">
                  {isGuideMode ? "Daily Money Tip" : "Daily Awareness"}
                </div>

                <div className="flex min-h-0 items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[clamp(18px,4.8vw,21px)] font-black leading-none tracking-[-0.035em] text-white">
                      {cardHeadline}
                    </div>

                    {cardSubtitle ? (
                      <p className="mt-1 max-w-[14.5rem] text-[10px] font-semibold leading-[1.25] text-cyan-50/72">
                        {cardSubtitle}
                      </p>
                    ) : null}
                  </div>

                  <span className="clara-checkin-action shrink-0 px-3 py-1.5 text-[8.5px] font-black uppercase tracking-[0.12em] text-cyan-50/88">
                    {actionLabel}
                  </span>
                </div>

                {showProgressDots ? (
                  <div className="grid grid-cols-10 gap-[5px]" aria-label={`${completedDayCount} of ${CHECK_IN_DAYS} awareness days completed`}>
                    {challengeDotStates.slice(0, CHECK_IN_DAYS).map((state, index) => (
                      <span
                        key={`${todayKey}-${index}`}
                        aria-hidden="true"
                        className={`h-[8px] w-[8px] rounded-full border ${
                          state === "completed"
                            ? "border-cyan-100/70 bg-cyan-100 shadow-[0_0_10px_rgba(165,243,252,0.72)]"
                            : state === "current"
                              ? "border-cyan-200/50 bg-cyan-300/22"
                              : "border-cyan-100/10 bg-white/[0.025]"
                        }`}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 text-[8px] font-black uppercase tracking-[0.09em] text-cyan-100/48">
                  <div className="rounded-xl border border-white/[0.055] bg-black/10 px-2.5 py-1.5">
                    <span>Awareness streak</span>
                    <span className="float-right text-[10px] normal-case tracking-normal text-white/88">{pluralizeDay(personalStreak)}</span>
                  </div>
                  <div className="rounded-xl border border-white/[0.055] bg-black/10 px-2.5 py-1.5">
                    <span>Awareness progress</span>
                    <span className="float-right text-[10px] tracking-normal text-white/88">{completedDayCount}/{CHECK_IN_DAYS}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="clara-preserve-flip-face clara-daily-tip-face clara-daily-tip-face--back rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-slate-900/40 to-indigo-500/10">
              <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.10),transparent_44%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_48%)]" />
              <div className="relative flex h-full flex-col px-4 py-3 text-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[8.5px] font-black uppercase tracking-[0.24em] text-cyan-200/70">Daily Money Tip</div>
                  <span className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/50">Tap to return</span>
                </div>

                <div className="mt-2 min-h-0 flex-1 overflow-y-auto pr-1">
                  <p className="text-[11.4px] font-semibold leading-[1.48] text-cyan-50/84">{tip}</p>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/[0.055] pt-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.12em] text-cyan-100/45">Was this useful?</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(event) => handleTipReaction(event, "up")}
                      disabled={feedbackSaving}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${reaction === "up" ? "border-cyan-200/35 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white/55"}`}
                      aria-label="Helpful"
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => handleTipReaction(event, "down")}
                      disabled={feedbackSaving}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border transition ${reaction === "down" ? "border-rose-200/35 bg-rose-300/15 text-rose-100" : "border-white/10 bg-white/[0.04] text-white/55"}`}
                      aria-label="Not helpful"
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {syncNotice ? <p className="mt-1 text-[8px] font-semibold text-cyan-100/45">{syncNotice}</p> : null}
              </div>
            </div>
          </div>
        </div>

        {!hasCommittedAccess ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/45 backdrop-blur-[1.5px]">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/75">
              <Lock className="h-3.5 w-3.5" />
              Committed Version
            </div>
          </div>
        ) : null}

        {showCelebration ? (
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-2xl">
            {Array.from({ length: sparkCount }).map((_, index) => (
              <span
                key={index}
                className="absolute h-1.5 w-1.5 rounded-full bg-cyan-100/80 shadow-[0_0_9px_rgba(165,243,252,0.8)]"
                style={{ left: `${8 + ((index * 31) % 84)}%`, top: `${8 + ((index * 47) % 78)}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
