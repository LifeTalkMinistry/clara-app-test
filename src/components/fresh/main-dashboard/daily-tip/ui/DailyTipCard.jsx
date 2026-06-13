import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
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

export default function DailyTipCard({
  hasCommittedAccess = true,
  onOpenCommitmentBooklet,
}) {
  const { tip, hasSeenToday, markSeenToday } = useDailyTip();
  const {
    checkedInToday,
    totalCompleted,
    challengeDay,
    currentStreak,
    checkInToday,
  } = useDailyCheckIn();
  const [flipped, setFlipped] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const isFlippingRef = useRef(false);
  const flipUnlockTimerRef = useRef(null);
  const [activeCurrentState, setActiveCurrentState] = useState(() => readActiveCurrentState());
  const [exiting, setExiting] = useState(false);

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
    return () => {
      if (flipUnlockTimerRef.current) {
        window.clearTimeout(flipUnlockTimerRef.current);
      }
    };
  }, []);

  const releaseFlipLock = () => {
    if (flipUnlockTimerRef.current) {
      window.clearTimeout(flipUnlockTimerRef.current);
      flipUnlockTimerRef.current = null;
    }

    isFlippingRef.current = false;
    setIsFlipping(false);
  };

  const handleFlip = () => {
    if (!hasCommittedAccess) {
      onOpenCommitmentBooklet?.();
      return;
    }

    if (isFlippingRef.current) return;

    const willRevealTip = !flipped;

    isFlippingRef.current = true;
    setIsFlipping(true);

    if (willRevealTip && !checkedInToday) {
      checkInToday();
    }

    setFlipped((current) => !current);

    if (willRevealTip && !hasSeenToday) {
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

  if (activeCurrentState) {
    return (
      <div className="clara-budget-focus-shift clara-budget-focus-tip px-3 mt-1.5">
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

  return (
    <div className="clara-budget-focus-shift clara-budget-focus-tip px-3 mt-1.5">
      <div
        role="button"
        tabIndex={0}
        onClick={handleFlip}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleFlip();
          }
        }}
        aria-label={
          hasCommittedAccess
            ? checkedInToday
              ? "Show today's Daily Money Tip"
              : "Check in for today and reveal Daily Money Tip"
            : "Open the Committed Version to unlock Daily Check-In"
        }
        aria-pressed={flipped}
        aria-disabled={isFlipping && hasCommittedAccess}
        className="group relative h-[170px] w-full cursor-pointer overflow-hidden rounded-2xl bg-transparent text-left outline-none"
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

              <div className="relative flex h-full flex-col px-4 py-3.5 text-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[9px] font-black uppercase leading-none tracking-[0.22em] text-cyan-200/72">
                      Daily Check-In
                    </div>
                    <div className="mt-1.5 text-[20px] font-black leading-none tracking-[-0.03em] text-white">
                      Day {challengeDay} of {CHECK_IN_DAYS}
                    </div>
                  </div>

                  <span className="clara-checkin-pill shrink-0 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em]">
                    {currentStreak}-day streak
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold leading-snug text-cyan-50/72">
                    Tap today to protect your money discipline.
                  </p>
                  <span className="text-right text-[10px] font-black uppercase tracking-[0.12em] text-white/58">
                    {checkedInToday ? "Checked in today" : "Tap to check in"}
                  </span>
                </div>

                <div className="mt-auto pt-3">
                  <div className="clara-checkin-grid" aria-hidden="true">
                    {Array.from({ length: CHECK_IN_DAYS }).map((_, dotIndex) => {
                      const isDone = dotIndex < totalCompleted;
                      const isToday = !checkedInToday && dotIndex === Math.min(totalCompleted, CHECK_IN_DAYS - 1);

                      return (
                        <span
                          key={dotIndex}
                          className={`clara-checkin-dot ${isDone ? "clara-checkin-dot--done" : ""} ${
                            isToday ? "clara-checkin-dot--today" : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="clara-preserve-flip-face clara-daily-tip-face clara-daily-tip-face--back rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-indigo-500/15 via-slate-950/70 to-cyan-400/10">
              <div className="pointer-events-none absolute inset-[1px] rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(103,232,249,0.12),transparent_44%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.12),transparent_48%)]" />

              <div className="relative flex h-full flex-col items-center justify-center px-5 py-4 text-center text-white">
                <div className="mb-2 text-center">
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200/66">
                    Today&apos;s Money Tip
                  </span>
                </div>

                <p className="max-w-[20rem] text-[13px] font-semibold leading-relaxed text-white/90">
                  {tip}
                </p>
              </div>
            </div>
          </div>
        </div>

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
