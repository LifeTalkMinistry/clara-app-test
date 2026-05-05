export default function LearningMaterialCard({ item, isActive, offset = 0, visible = true, onClick }) {
  const baseDistance = 82; // tighter = better peeking

  const translateX = `calc(-50% + ${offset * baseDistance}px)`;

  const scale = isActive ? 1 : 0.7;
  const rotate = isActive ? 0 : offset < 0 ? -16 : 16;

  const zIndex = isActive ? 50 : 40 - Math.abs(offset);

  return (
    <div
      onClick={onClick}
      className="absolute left-1/2 top-1/2 cursor-pointer transition-all duration-500 ease-out"
      style={{
        width: isActive ? 150 : 105,
        opacity: visible ? (isActive ? 1 : 0.38) : 0,
        zIndex,
        transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg)`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className={`relative h-[200px] w-full overflow-hidden rounded-[18px] border backdrop-blur-xl transition-all duration-500 ${
          isActive
            ? "border-cyan-300/60 bg-slate-900/95 shadow-[0_0_45px_rgba(34,211,238,0.55)]"
            : "border-white/10 bg-slate-900/70 shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
        }`}
      >
        {/* glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.4),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.1),rgba(2,6,23,0.95))]" />

        {/* spine */}
        <div className="absolute left-0 top-0 h-full w-[8px] bg-black/30 shadow-[inset_-1px_0_0_rgba(255,255,255,0.1)]" />

        {/* featured */}
        {isActive && (
          <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[8px] font-bold uppercase text-cyan-100">
            Featured
          </div>
        )}

        {/* label */}
        <div className="absolute left-3 right-3 top-9 text-[9px] uppercase tracking-wide text-cyan-100/60">
          {item.coverLabel || "Guide"}
        </div>

        {/* title */}
        <div className="absolute inset-x-3 bottom-14">
          <h3 className="text-[15px] font-black leading-tight text-white">
            {item.title}
          </h3>
          {isActive && item.subtitle && (
            <p className="mt-2 text-[10px] text-white/70">
              {item.subtitle}
            </p>
          )}
        </div>

        {/* footer */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] text-white">
            Read Now
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/10 text-xs text-cyan-100">
            📖
          </span>
        </div>
      </div>
    </div>
  );
}
