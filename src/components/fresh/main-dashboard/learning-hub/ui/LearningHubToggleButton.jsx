import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronLeft, Lock } from "lucide-react";

export const LEARNING_HUB_STAGE_HEIGHT = 244;
export const LEARNING_HUB_EXPAND_DURATION_MS = 380;
export const LEARNING_HUB_STAGE_CLASS = "clara-learning-hub-stage relative flex w-full items-center justify-center overflow-hidden rounded-[30px] border border-cyan-100/10 bg-[radial-gradient(circle_at_-18%_-28%,rgba(20,184,166,0.22),transparent_48%),radial-gradient(circle_at_78%_118%,rgba(99,102,241,0.18),transparent_58%),linear-gradient(135deg,rgba(6,48,66,0.76),rgba(7,20,48,0.82)_48%,rgba(37,13,74,0.76))]";

const learningHubToggleSurface = {
  background: "radial-gradient(circle at -18% -42%, rgba(20,184,166,0.22), transparent 48%), radial-gradient(circle at 112% 132%, rgba(99,102,241,0.16), transparent 54%), linear-gradient(135deg, rgba(6,48,66,0.72), rgba(7,20,48,0.74) 48%, rgba(37,13,74,0.70))",
  borderColor: "rgba(103,232,249,0.18)",
  boxShadow: "0 10px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
};

export function LearningHubOpenBoundary({ children }) {
  const [revealed, setRevealed] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setRevealed(true);
      setSettled(true);
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => setRevealed(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      data-clara-learning-hub-open-boundary="true"
      className="clara-learning-hub-open-boundary w-full"
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "max-height" && revealed) setSettled(true);
      }}
      style={{
        maxHeight: revealed ? `calc(${LEARNING_HUB_STAGE_HEIGHT}px + 5rem)` : "2.5rem",
        overflow: settled ? "visible" : "hidden",
        overflowAnchor: "none",
        transition: `max-height ${LEARNING_HUB_EXPAND_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
    >
      {children}
    </div>
  );
}

export function LearningHubExpansionShell({
  isExpanded,
  stageHeight = LEARNING_HUB_STAGE_HEIGHT,
  expandDurationMs = LEARNING_HUB_EXPAND_DURATION_MS,
  children,
}) {
  const visibilityDelay = isExpanded ? 0 : expandDurationMs;
  return (
    <div
      data-learning-hub-expanded={isExpanded ? "true" : "false"}
      aria-hidden={!isExpanded}
      className="clara-learning-hub-expanded clara-learning-motion overflow-hidden"
      style={{
        height: isExpanded ? `${stageHeight}px` : "0px",
        minHeight: 0,
        maxHeight: isExpanded ? `${stageHeight}px` : "0px",
        marginTop: isExpanded ? "0.75rem" : "0rem",
        opacity: isExpanded ? 1 : 0,
        transform: `translateY(0) scaleY(${isExpanded ? 1 : 0.98})`,
        transformOrigin: "top center",
        pointerEvents: isExpanded ? "auto" : "none",
        visibility: isExpanded ? "visible" : "hidden",
        overflowAnchor: "none",
        transition: `height ${expandDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1), max-height ${expandDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1), margin-top ${expandDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease, transform ${expandDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear ${visibilityDelay}ms`,
      }}
    >
      <div
        className="clara-learning-hub-clip min-h-0 overflow-hidden"
        style={{ height: `${stageHeight}px`, minHeight: `${stageHeight}px`, maxHeight: `${stageHeight}px` }}
      >
        {children}
      </div>
    </div>
  );
}

export function LearningHubOpeningShell() {
  return (
    <section aria-hidden="true" className="relative w-full overflow-visible px-1 py-0 pb-[clamp(14px,2dvh,20px)]">
      <LearningHubToggleButton isExpanded headerLabel="Learning Hub" flushSpacing disabledForLoading />
      <LearningHubExpansionShell isExpanded>
        <div
          className={LEARNING_HUB_STAGE_CLASS}
          style={{ height: `${LEARNING_HUB_STAGE_HEIGHT}px`, minHeight: `${LEARNING_HUB_STAGE_HEIGHT}px` }}
        >
          <div className="pointer-events-none absolute -left-[112px] -top-[122px] h-[220px] w-[220px] rounded-full bg-cyan-300/[0.08]" />
          <div className="pointer-events-none absolute bottom-[-150px] left-[39%] h-[250px] w-[250px] rounded-full bg-blue-400/[0.10]" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.055] via-transparent to-black/24" />
          <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/10" />
        </div>
      </LearningHubExpansionShell>
    </section>
  );
}

export default function LearningHubToggleButton({
  isExpanded = false,
  isLocked = false,
  isInsideCategory = false,
  headerLabel = "Learning Hub",
  onClick,
  onTouchStart,
  onTouchEnd,
  className = "",
  flushSpacing = false,
  guideTarget = false,
  disabledForLoading = false,
}) {
  const spacingClass = flushSpacing || isExpanded ? "mt-0 mb-0" : "mt-3 mb-0";
  return (
    <button
      type="button"
      data-clara-guide-learning-hub-toggle={guideTarget ? "true" : undefined}
      aria-expanded={isLocked ? false : isExpanded}
      aria-busy={disabledForLoading || undefined}
      aria-label={disabledForLoading ? "Opening Learning Hub." : isLocked ? "Open the Committed Version to unlock Learning Hub." : isInsideCategory ? "Back to Learning Hub categories." : isExpanded ? "Collapse Learning Hub." : "Open Learning Hub."}
      disabled={disabledForLoading}
      onClick={disabledForLoading ? undefined : onClick}
      onTouchStart={isLocked || disabledForLoading ? undefined : onTouchStart}
      onTouchEnd={isLocked || disabledForLoading ? undefined : onTouchEnd}
      className={`clara-learning-motion relative isolate mx-auto ${spacingClass} flex w-fit items-center justify-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/64 transition-[transform,background-color,border-color] duration-300 active:scale-[0.98] disabled:cursor-default disabled:opacity-100 ${className}`}
      style={learningHubToggleSurface}
    >
      <span className="pointer-events-none absolute -left-12 -top-14 z-0 h-24 w-24 rounded-full bg-cyan-300/[0.08]" />
      <span className="pointer-events-none absolute -bottom-14 right-0 z-0 h-24 w-24 rounded-full bg-blue-400/[0.08]" />
      <span className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-gradient-to-b from-white/[0.05] via-transparent to-black/8 backdrop-blur-[1px]" />
      {isInsideCategory ? <ChevronLeft size={16} className="relative z-10 text-cyan-100/62" /> : <BookOpen size={16} className="relative z-10 text-cyan-100/62" />}
      <span className="relative z-10 max-w-[185px] truncate whitespace-nowrap text-white/76">{headerLabel}</span>
      {isLocked ? (
        <span className="relative z-10 inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.08] px-1.5 py-0.5 text-[7px] font-black tracking-[0.12em] text-cyan-50/72"><Lock className="h-2.5 w-2.5" />PRO</span>
      ) : isInsideCategory ? null : (
        <ChevronDown size={15} className={`relative z-10 text-cyan-100/42 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
      )}
    </button>
  );
}
