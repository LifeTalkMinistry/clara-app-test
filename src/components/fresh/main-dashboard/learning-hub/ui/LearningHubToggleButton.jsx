import { BookOpen, ChevronDown, ChevronLeft, Lock } from "lucide-react";

const learningHubToggleSurface = {
  background:
    "radial-gradient(circle at -18% -42%, rgba(20,184,166,0.22), transparent 48%), radial-gradient(circle at 112% 132%, rgba(99,102,241,0.16), transparent 54%), linear-gradient(135deg, rgba(6,48,66,0.72), rgba(7,20,48,0.74) 48%, rgba(37,13,74,0.70))",
  borderColor: "rgba(103,232,249,0.18)",
  boxShadow:
    "0 10px 26px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
};

export default function LearningHubToggleButton({
  isExpanded = false,
  isLocked = false,
  isInsideCategory = false,
  headerLabel = "Learning Hub",
  onClick,
  onTouchStart,
  onTouchEnd,
  className = "",
}) {
  return (
    <button
      type="button"
      aria-expanded={isLocked ? false : isExpanded}
      aria-label={
        isLocked
          ? "Open the Committed Version to unlock Learning Hub."
          : isInsideCategory
            ? "Back to Learning Hub categories."
            : isExpanded
              ? "Collapse Learning Hub."
              : "Open Learning Hub."
      }
      onClick={onClick}
      onTouchStart={isLocked ? undefined : onTouchStart}
      onTouchEnd={isLocked ? undefined : onTouchEnd}
      className={`clara-learning-motion relative isolate mx-auto mt-3 mb-0 flex w-fit items-center justify-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/64 transition-[transform,background-color,border-color] duration-300 active:scale-[0.98] ${className}`}
      style={learningHubToggleSurface}
    >
      <span className="pointer-events-none absolute -left-12 -top-14 z-0 h-24 w-24 rounded-full bg-cyan-300/[0.08]" />
      <span className="pointer-events-none absolute -bottom-14 right-0 z-0 h-24 w-24 rounded-full bg-blue-400/[0.08]" />
      <span className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] bg-gradient-to-b from-white/[0.05] via-transparent to-black/8 backdrop-blur-[1px]" />

      {isInsideCategory ? (
        <ChevronLeft size={16} className="relative z-10 text-cyan-100/62" />
      ) : (
        <BookOpen size={16} className="relative z-10 text-cyan-100/62" />
      )}

      <span className="relative z-10 max-w-[185px] truncate whitespace-nowrap text-white/76">
        {headerLabel}
      </span>

      {isLocked ? (
        <span className="relative z-10 inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.08] px-1.5 py-0.5 text-[7px] font-black tracking-[0.12em] text-cyan-50/72">
          <Lock className="h-2.5 w-2.5" />
          PRO
        </span>
      ) : isInsideCategory ? null : (
        <ChevronDown
          size={15}
          className={`relative z-10 text-cyan-100/42 transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      )}
    </button>
  );
}
