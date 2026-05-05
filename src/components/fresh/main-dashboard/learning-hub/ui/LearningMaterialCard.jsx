export default function LearningMaterialCard({ item, isActive, offset = 0, visible = true, onClick }) {
  const baseDistance = 56; // FIX: aggressive overlap like reference

  const translateX = `calc(-50% + ${offset * baseDistance}px)`;

  const scale = isActive ? 1 : Math.abs(offset) === 1 ? 0.75 : 0.6;
  const rotate = isActive ? 0 : offset < 0 ? -24 : 24;
  const depth = isActive ? 0 : -140;

  const blur = Math.abs(offset) === 0 ? 0 : Math.abs(offset) === 1 ? 1 : 4;

  const opacity = isActive
    ? 1
    : Math.abs(offset) === 1
      ? 0.65
      : 0.2;

  const zIndex = isActive ? 120 : 100 - Math.abs(offset);

  return (
    <div
      onClick={onClick}
      className="absolute left-1/2 top-1/2 cursor-pointer transition-all duration-500 ease-out"
      style={{
        width: isActive ? 170 : 100,
        opacity: visible ? opacity : 0,
        zIndex,
        filter: `blur(${blur}px)`,
        transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg) translateZ(${depth}px)`,
        transformStyle: "preserve-3d",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {isActive && (
        <div className="absolute -inset-12 rounded-[40px] bg-cyan-400/35 blur-[80px] opacity-90" />
      )}

      <div
        className={`relative h-[230px] w-full overflow-hidden rounded-[24px] border backdrop-blur-xl transition-all duration-500 ${
          isActive
            ? "border-cyan-300/90 bg-slate-900/95 shadow-[0_0_80px_rgba(34,211,238,0.85)]"
            : "border-white/10 bg-slate-900/70 shadow-[0_28px_55px_rgba(0,0,0,0.7)]"
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.6),transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.1),rgba(2,6,23,0.97))]" />

        <div className="absolute left-0 top-0 h-full w-[10px] bg-black/45 shadow-[inset_-1px_0_0_rgba(255,255,255,0.14)]" />

        {isActive && (
          <div className="absolute left-4 top-3 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[9px] font-bold uppercase text-cyan-100">
            Featured
          </div>
        )}

        <div className="absolute left-4 right-4 top-11 text-[10px] uppercase tracking-[0.2em] text-cyan-100/65">
          {item.coverLabel || "Guide"}
        </div>

        <div className="absolute inset-x-4 bottom-18">
          <h3 className="text-[17px] font-black leading-tight text-white">
            {item.title}
          </h3>
          {isActive && item.subtitle && (
            <p className="mt-2 text-[12px] text-white/75">
              {item.subtitle}
            </p>
          )}
        </div>

        <div className="absolute bottom-5 left-4 right-4 flex items-center justify-between">
          <span className="rounded-full bg-white/10 px-4 py-1 text-[11px] text-white">
            Read Now
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-300/10 text-sm text-cyan-100">
            📖
          </span>
        </div>
      </div>
    </div>
  );
}
