export default function LearningMaterialCard({
  item,
  isActive,
  offset = 0,
  visible = true,
  position,
  total,
  onClick,
}) {
  const absOffset = Math.abs(offset);
  const direction = offset < 0 ? -1 : 1;

  const distanceMap = {
    0: 0,
    1: 142,
    2: 226,
  };

  const cardOffset = distanceMap[Math.min(absOffset, 2)] || 0;
  const translateX = `calc(-50% + ${direction * cardOffset}px)`;

  const scale = isActive ? 1 : absOffset === 1 ? 0.85 : 0.71;
  const rotate = isActive ? 0 : offset < 0 ? 5 + absOffset : -5 - absOffset;
  const origin = isActive ? "center center" : offset < 0 ? "right center" : "left center";
  const depth = isActive ? 18 : absOffset === 1 ? -18 : -48;
  const opacity = visible ? (isActive ? 1 : absOffset === 1 ? 0.24 : 0.08) : 0;
  const zIndex = isActive ? 70 : absOffset === 1 ? 42 : 24;

  const width = isActive ? 210 : absOffset === 1 ? 118 : 96;
  const height = isActive ? 214 : absOffset === 1 ? 176 : 150;

  return (
    <div
      onClick={onClick}
      className="clara-learning-hub-card clara-learning-motion absolute left-1/2 top-1/2 cursor-pointer transition-[transform,opacity,width] duration-500 ease-out"
      style={{
        width,
        opacity,
        zIndex,
        transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg) translateZ(${depth}px)`,
        transformOrigin: origin,
        transformStyle: "preserve-3d",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className={`relative w-full overflow-hidden rounded-[20px] border transition-[border-color,background-color] duration-500 ${
          isActive
            ? "border-cyan-100/40 bg-slate-950"
            : "border-cyan-200/12 bg-slate-950/88"
        }`}
        style={{ height }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_-18%_-24%,rgba(20,184,166,0.24),transparent_48%),radial-gradient(circle_at_82%_120%,rgba(99,102,241,0.18),transparent_56%),linear-gradient(135deg,rgba(6,48,66,0.96),rgba(7,20,48,0.96)_48%,rgba(37,13,74,0.94))]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-black/24" />
        <div className="absolute inset-0 rounded-[20px] ring-1 ring-inset ring-white/10" />
        <div className="absolute left-0 top-0 h-full w-[5px] bg-cyan-100/10" />

        <div className="relative z-10 flex h-full flex-col p-3.5 text-white">
          <div>
            {isActive && (
              <div className="mb-1.5 inline-flex rounded-full border border-cyan-100/15 bg-white/[0.08] px-2 py-0.5 text-[8px] font-bold uppercase text-cyan-50">
                Featured
              </div>
            )}
            <div className="line-clamp-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/48">
              {item.coverLabel || "Guide"}
            </div>
          </div>

          <div className={`${isActive ? "mt-auto mb-auto pt-4" : "mt-auto mb-auto pt-2"}`}>
            <h3 className={`${isActive ? "text-[18px] line-clamp-3" : absOffset === 1 ? "text-[13px] line-clamp-2" : "text-[11px] line-clamp-2"} font-black leading-tight text-white`}>
              {item.title}
            </h3>
            {isActive && (
              <p className="mt-2 line-clamp-2 text-[10.5px] leading-snug text-white/62">
                {item.subtitle || "Read and learn."}
              </p>
            )}
          </div>

          {isActive && (
            <div className="mt-auto flex items-center justify-between">
              <span className="rounded-full border border-white/10 bg-white/[0.075] px-3 py-1 text-[9px] font-semibold text-white/82">
                Start Lesson
              </span>
              <span className="rounded-full border border-cyan-100/15 bg-white/[0.04] px-2.5 py-1 text-[9px] font-semibold text-white/65">
                {position} / {total}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
