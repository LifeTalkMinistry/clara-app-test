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

  const scale = isActive ? 1 : absOffset === 1 ? 0.94 : 0.84;
  const rotate = isActive ? 0 : offset < 0 ? 5 + absOffset : -5 - absOffset;
  const origin = isActive ? "center center" : offset < 0 ? "right center" : "left center";
  const depth = isActive ? 18 : absOffset === 1 ? -18 : -48;
  const opacity = visible ? (isActive ? 1 : absOffset === 1 ? 0.3 : 0.12) : 0;
  const zIndex = isActive ? 70 : absOffset === 1 ? 42 : 24;

  const width = isActive ? 184 : absOffset === 1 ? 36 : 24;
  const height = isActive ? 224 : absOffset === 1 ? 188 : 160;
  const spineWidth = 16;
  const pageEdgeWidth = 6;
  const depthOffset = 3;

  if (!isActive) {
    return (
      <div
        onClick={onClick}
        className="clara-learning-hub-card clara-learning-motion absolute left-1/2 top-1/2 cursor-pointer transition-[transform,opacity,width,height] duration-500 ease-out"
        style={{
          width,
          height,
          opacity,
          zIndex,
          transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg) translateZ(${depth}px)`,
          transformOrigin: origin,
          transformStyle: "preserve-3d",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        <div className="relative h-full w-full overflow-visible" style={{ transformStyle: "preserve-3d" }}>
          <div className="absolute inset-0 rounded-[18px] border border-cyan-100/10 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(15,23,42,0.76)_42%,rgba(88,28,135,0.38))] shadow-[0_12px_24px_rgba(0,0,0,0.20),inset_1px_0_0_rgba(255,255,255,0.08),inset_-1px_0_0_rgba(34,211,238,0.08)]" />
          <div className="absolute inset-[1px] rounded-[17px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_42%),linear-gradient(90deg,rgba(255,255,255,0.06),transparent_34%,rgba(0,0,0,0.16))]" />
          <div className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 rounded-full bg-cyan-50/12" />
          <div className="absolute inset-y-8 left-[7px] w-px rounded-full bg-white/7" />
          <div className="absolute inset-x-[7px] top-5 h-px rounded-full bg-cyan-50/10" />
          <div className="absolute inset-x-[7px] bottom-5 h-px rounded-full bg-purple-100/10" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="clara-learning-hub-card clara-learning-motion absolute left-1/2 top-1/2 cursor-pointer transition-[transform,opacity,width,height] duration-500 ease-out"
      style={{
        width,
        height,
        opacity,
        zIndex,
        transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg) translateZ(${depth}px)`,
        transformOrigin: origin,
        transformStyle: "preserve-3d",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div className="relative h-full w-full overflow-visible" style={{ transformStyle: "preserve-3d" }}>
        <div
          className="absolute inset-[1px] rounded-[18px] bg-cyan-50 opacity-[0.18] transition-opacity duration-500"
          style={{
            transform: `translate3d(${depthOffset}px, ${depthOffset}px, -18px)`,
            filter: "blur(1px)",
            boxShadow: "0 24px 42px rgba(0,0,0,0.34), 0 0 24px rgba(34,211,238,0.08)",
          }}
        />

        <div className="relative z-10 h-full w-full overflow-hidden rounded-[18px] border border-cyan-100/30 bg-slate-950 shadow-[0_20px_40px_rgba(0,0,0,0.34),0_0_24px_rgba(34,211,238,0.06)] transition-[border-color,background-color,box-shadow] duration-500">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_-20%_-22%,rgba(20,184,166,0.24),transparent_48%),radial-gradient(circle_at_88%_112%,rgba(99,102,241,0.17),transparent_58%),linear-gradient(135deg,rgba(5,38,55,0.98),rgba(7,20,48,0.97)_48%,rgba(37,13,74,0.94))]" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-black/30 opacity-100 transition-opacity duration-500" />
          <div className="absolute inset-0 rounded-[18px] ring-1 ring-inset ring-white/8" />
          <div className="absolute -right-10 -top-16 h-28 w-16 rotate-[28deg] bg-white/[0.045] opacity-100 blur-[1px] transition-opacity duration-500" />
          <div className="absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),transparent_56%)] opacity-90 transition-opacity duration-500" />

          <div
            className="absolute bottom-2 top-2 rounded-r-[14px] border-l border-cyan-50/8 opacity-50 transition-opacity duration-500"
            style={{
              right: 0,
              width: pageEdgeWidth,
              background:
                "linear-gradient(90deg, rgba(241,245,249,0.12), rgba(165,243,252,0.075) 46%, rgba(15,23,42,0.16))",
              boxShadow: "inset 1px 0 2px rgba(255,255,255,0.06), inset -1px 0 3px rgba(0,0,0,0.18)",
            }}
          >
            <span className="absolute left-1 top-[22%] h-px w-[45%] rounded-full bg-cyan-50/16" />
            <span className="absolute left-1 top-[39%] h-px w-[52%] rounded-full bg-cyan-50/12" />
            <span className="absolute left-1 top-[57%] h-px w-[42%] rounded-full bg-cyan-50/10" />
            <span className="absolute left-1 top-[73%] h-px w-[48%] rounded-full bg-cyan-50/9" />
          </div>

          <div
            className="absolute left-0 top-0 h-full overflow-hidden border-r border-cyan-50/10 bg-[linear-gradient(180deg,rgba(8,47,73,0.86),rgba(8,24,52,0.93)_46%,rgba(17,24,39,0.94))] shadow-[inset_-6px_0_12px_rgba(0,0,0,0.22)]"
            style={{ width: spineWidth }}
          >
            <div className="absolute inset-y-0 right-[2px] w-px bg-cyan-50/13" />
            <div className="absolute inset-y-0 left-[3px] w-px bg-white/8" />
            <div className="absolute left-1/2 top-[18%] h-8 w-px -translate-x-1/2 rounded-full bg-cyan-50/10" />
            <div className="absolute left-1/2 bottom-[18%] h-10 w-px -translate-x-1/2 rounded-full bg-cyan-50/8" />
          </div>

          <div
            className="relative z-10 flex h-full flex-col text-white"
            style={{
              paddingTop: 14,
              paddingRight: 13,
              paddingBottom: 13,
              paddingLeft: spineWidth + 14,
            }}
          >
            <div>
              <div className="mb-2 inline-flex rounded-full border border-cyan-100/16 bg-white/[0.075] px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                Featured
              </div>
              <div className="line-clamp-1 text-[8.5px] font-bold uppercase tracking-[0.22em] text-white/50">
                {item.coverLabel || "Guide"}
              </div>
            </div>

            <div className="mt-auto mb-auto pt-5">
              <h3 className="line-clamp-3 text-[17px] font-black leading-[1.08] text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.18)]">
                {item.title}
              </h3>
              <p className="mt-2.5 line-clamp-2 text-[10px] leading-snug text-white/62">
                {item.subtitle || "Read and learn."}
              </p>
            </div>

            <div className="mt-auto flex items-center justify-between gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.085] px-3 py-1.5 text-[9px] font-semibold text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                Start Lesson
              </span>
              <span className="shrink-0 rounded-full border border-cyan-100/14 bg-white/[0.045] px-2.5 py-1 text-[8.5px] font-semibold text-white/62">
                {position} / {total}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
