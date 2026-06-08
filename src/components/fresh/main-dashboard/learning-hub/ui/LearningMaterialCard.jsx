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
  const opacity = visible ? (isActive ? 1 : absOffset === 1 ? 0.28 : 0.09) : 0;
  const zIndex = isActive ? 70 : absOffset === 1 ? 42 : 24;

  const width = isActive ? 184 : absOffset === 1 ? 124 : 100;
  const height = isActive ? 224 : absOffset === 1 ? 188 : 160;
  const spineWidth = isActive ? 17 : absOffset === 1 ? 14 : 12;
  const pageEdgeWidth = isActive ? 8 : 6;
  const backCoverOffset = isActive ? 6 : 4;

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
          className={`absolute inset-0 rounded-[18px] bg-slate-950 transition-opacity duration-500 ${
            isActive ? "opacity-80" : "opacity-38"
          }`}
          style={{
            transform: `translate3d(${backCoverOffset}px, ${backCoverOffset}px, -18px)`,
            boxShadow: isActive
              ? "0 22px 38px rgba(0,0,0,0.34), 0 0 24px rgba(34,211,238,0.08)"
              : "0 14px 24px rgba(0,0,0,0.24)",
          }}
        />

        <div
          className={`absolute bottom-[7px] top-[7px] rounded-r-[14px] border border-cyan-50/10 transition-opacity duration-500 ${
            isActive ? "opacity-70" : "opacity-34"
          }`}
          style={{
            right: `-${pageEdgeWidth - 2}px`,
            width: pageEdgeWidth,
            transform: "translateZ(-7px)",
            background:
              "linear-gradient(90deg, rgba(241,245,249,0.20), rgba(165,243,252,0.11) 45%, rgba(15,23,42,0.28))",
          }}
        >
          <span className="absolute left-1 top-[22%] h-px w-[55%] rounded-full bg-cyan-50/26" />
          <span className="absolute left-1 top-[39%] h-px w-[64%] rounded-full bg-cyan-50/18" />
          <span className="absolute left-1 top-[57%] h-px w-[50%] rounded-full bg-cyan-50/16" />
          <span className="absolute left-1 top-[73%] h-px w-[61%] rounded-full bg-cyan-50/14" />
        </div>

        <div
          className={`relative z-10 h-full w-full overflow-hidden rounded-[18px] border transition-[border-color,background-color,box-shadow] duration-500 ${
            isActive
              ? "border-cyan-100/36 bg-slate-950 shadow-[0_18px_36px_rgba(0,0,0,0.32)]"
              : "border-cyan-200/12 bg-slate-950/88 shadow-[0_12px_22px_rgba(0,0,0,0.20)]"
          }`}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_-20%_-22%,rgba(20,184,166,0.26),transparent_48%),radial-gradient(circle_at_88%_112%,rgba(99,102,241,0.19),transparent_58%),linear-gradient(135deg,rgba(5,38,55,0.98),rgba(7,20,48,0.97)_48%,rgba(37,13,74,0.94))]" />
          <div
            className={`absolute inset-0 bg-gradient-to-b from-white/[0.075] via-transparent to-black/30 transition-opacity duration-500 ${
              isActive ? "opacity-100" : "opacity-54"
            }`}
          />
          <div className="absolute inset-0 rounded-[18px] ring-1 ring-inset ring-white/10" />
          <div className="absolute -right-10 -top-16 h-28 w-16 rotate-[28deg] bg-white/[0.055] blur-[1px]" />
          <div
            className={`absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(135deg,rgba(255,255,255,0.08),transparent_56%)] transition-opacity duration-500 ${
              isActive ? "opacity-100" : "opacity-42"
            }`}
          />

          <div
            className="absolute left-0 top-0 h-full overflow-hidden border-r border-cyan-50/12 bg-[linear-gradient(180deg,rgba(8,47,73,0.98),rgba(8,24,52,0.98)_45%,rgba(17,24,39,0.98))] shadow-[inset_-7px_0_12px_rgba(0,0,0,0.28)]"
            style={{ width: spineWidth }}
          >
            <div className="absolute inset-y-0 right-[2px] w-px bg-cyan-50/18" />
            <div className="absolute inset-y-0 left-[3px] w-px bg-white/10" />
            <div className="absolute left-1/2 top-[18%] h-8 w-px -translate-x-1/2 rounded-full bg-cyan-50/14" />
            <div className="absolute left-1/2 bottom-[18%] h-10 w-px -translate-x-1/2 rounded-full bg-cyan-50/10" />
          </div>

          <div
            className="relative z-10 flex h-full flex-col text-white"
            style={{
              paddingTop: isActive ? 14 : 12,
              paddingRight: isActive ? 13 : 11,
              paddingBottom: isActive ? 13 : 12,
              paddingLeft: spineWidth + (isActive ? 14 : 10),
            }}
          >
            <div>
              {isActive && (
                <div className="mb-2 inline-flex rounded-full border border-cyan-100/16 bg-white/[0.075] px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em] text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  Featured
                </div>
              )}
              <div
                className={`line-clamp-1 font-bold uppercase text-white/50 ${
                  isActive ? "text-[8.5px] tracking-[0.22em]" : "text-[7.5px] tracking-[0.18em]"
                }`}
              >
                {item.coverLabel || "Guide"}
              </div>
            </div>

            <div className={`${isActive ? "mt-auto mb-auto pt-5" : "mt-auto mb-auto pt-3"}`}>
              <h3
                className={`${
                  isActive
                    ? "text-[17px] leading-[1.08] line-clamp-3"
                    : absOffset === 1
                      ? "text-[12.5px] leading-tight line-clamp-3"
                      : "text-[10.5px] leading-tight line-clamp-2"
                } font-black text-white drop-shadow-[0_1px_10px_rgba(0,0,0,0.18)]`}
              >
                {item.title}
              </h3>
              {isActive && (
                <p className="mt-2.5 line-clamp-2 text-[10px] leading-snug text-white/62">
                  {item.subtitle || "Read and learn."}
                </p>
              )}
            </div>

            {isActive && (
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.085] px-3 py-1.5 text-[9px] font-semibold text-white/86 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  Start Lesson
                </span>
                <span className="shrink-0 rounded-full border border-cyan-100/14 bg-white/[0.045] px-2.5 py-1 text-[8.5px] font-semibold text-white/62">
                  {position} / {total}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
