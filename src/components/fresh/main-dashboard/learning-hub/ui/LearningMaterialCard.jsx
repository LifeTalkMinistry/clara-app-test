export default function LearningMaterialCard({ item, isActive, offset = 0, visible = true, onClick }) {
  const baseDistance = 72;

  const translateX = `calc(-50% + ${offset * baseDistance}px)`;

  const scale = isActive ? 1 : 0.68;
  const rotate = isActive ? 0 : offset < 0 ? -18 : 18;
  const depth = isActive ? 0 : -80;

  const blur = Math.abs(offset) === 0 ? 0 : Math.abs(offset) === 1 ? 1.5 : 3;

  const zIndex = isActive ? 80 : 60 - Math.abs(offset);

  return (
    <div
      onClick={onClick}
      className="absolute left-1/2 top-1/2 cursor-pointer transition-all duration-500 ease-out"
      style={{
        width: isActive ? 158 : 102,
        opacity: visible ? (isActive ? 1 : 0.35) : 0,
        zIndex,
        filter: `blur(${blur}px)`,
        transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg) translateZ(${depth}px)`,
        transformStyle: "preserve-3d",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {isActive && (
        <div className="absolute -inset-8 rounded-[32px] bg-cyan-400/25 blur-3xl opacity-70" />
      )}

      <div
        className={`relative h-[212px] w-full overflow-hidden rounded-[20px] border backdrop-blur-xl transition-all duration-500 ${
          isActive
            ? "border-cyan-300/70 bg-slate-900/95 shadow-[0_0_55px_rgba(34,211,238,0.65)]"
            : "border-white/10 bg-slate-900/70 shadow-[0_22px_45px_rgba(0,0,0,0.5)]"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.45),transparent_48%),linear-gradient(180deg,rgba(15,23,42,0.1),rgba(2,6,23,0.96))]" />

        <div className="absolute left-0 top-0 h-full w-[9px] bg-black/35 shadow-[inset_-1px_0_0_rgba(255,255,255,0.12)]" />

        {isActive && (
          <div className="absolute left-4 top-3 rounded-full border border-white/15 bg-white/10 px-3 py-0.5 text-[8px] font-bold uppercase text-cyan-100">
            Featured
          </div>
        )}

        <div className="absolute left-4 right-4 top-10 text-[9px] uppercase tracking-[0.18em] text-cyan-100/60">
          {item.coverLabel || "Guide"}
        </div>

        <div className="absolute inset-x-4 bottom-16">
          <h3 className="text-[16px] font-black leading-tight text-white">
            {item.title}
          </h3>
          {isActive && item.subtitle && (
            <p className="mt-2 text-[11px] text-white/70">
              {item.subtitle}
            </p>
          )}
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] text-white">
            Read Now
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/10 text-xs text-cyan-100">
            📖
          </span>
        </div>
      </div>
    </div>
  );
}
