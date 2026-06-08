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
  const opacity = visible ? (isActive ? 1 : absOffset === 1 ? 0.23 : 0.07) : 0;
  const zIndex = isActive ? 70 : absOffset === 1 ? 42 : 24;

  const width = isActive ? 184 : absOffset === 1 ? 124 : 100;
  const height = isActive ? 224 : absOffset === 1 ? 188 : 160;
  const pageEdgeWidth = isActive ? 4 : 5;
  const depthOffset = isActive ? 3 : 2;
  const contentLeftPadding = isActive ? 18 : 12;
  const thumbnailSrc = item?.thumbnail || "";
  const hasThumbnail = Boolean(thumbnailSrc);

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
          className={`absolute rounded-[18px] transition-opacity duration-500 ${
            isActive ? "inset-4 bg-transparent opacity-100" : "inset-[1px] bg-cyan-50 opacity-[0.08]"
          }`}
          style={{
            transform: isActive
              ? "translate3d(0px, 2px, -18px)"
              : `translate3d(${depthOffset}px, ${depthOffset}px, -18px)`,
            filter: isActive ? "blur(18px)" : "blur(1px)",
            boxShadow: isActive
              ? "0 24px 46px rgba(0,0,0,0.34), 0 0 28px rgba(34,211,238,0.055)"
              : "0 14px 24px rgba(0,0,0,0.20)",
          }}
        />

        <div
          className={`relative z-10 h-full w-full overflow-hidden rounded-[18px] border transition-[border-color,background-color,box-shadow] duration-500 ${
            isActive
              ? "border-cyan-100/14 bg-slate-950 shadow-[0_20px_40px_rgba(0,0,0,0.34),0_0_18px_rgba(34,211,238,0.035)]"
              : "border-cyan-200/8 bg-slate-950/84 shadow-[0_12px_22px_rgba(0,0,0,0.17)]"
          }`}
        >
          {hasThumbnail ? (
            <img
              src={thumbnailSrc}
              alt={item?.title ? `${item.title} cover` : "Learning material cover"}
              className="h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_-20%_-22%,rgba(20,184,166,0.24),transparent_48%),radial-gradient(circle_at_88%_112%,rgba(99,102,241,0.17),transparent_58%),linear-gradient(135deg,rgba(5,38,55,0.98),rgba(7,20,48,0.97)_48%,rgba(37,13,74,0.94))] transition-opacity duration-500" />
              <div
                className={`absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-black/30 transition-opacity duration-500 ${
                  isActive ? "opacity-100" : "opacity-42"
                }`}
              />
              <div className={`absolute inset-0 rounded-[18px] ring-1 ring-inset ${isActive ? "ring-white/5" : "ring-white/8"}`} />
              <div
                className={`absolute -right-10 -top-16 h-28 w-16 rotate-[28deg] bg-white/[0.045] blur-[1px] transition-opacity duration-500 ${
                  isActive ? "opacity-100" : "opacity-28"
                }`}
              />
              <div
                className={`absolute inset-x-0 top-0 h-[44%] bg-[linear-gradient(135deg,rgba(255,255,255,0.075),transparent_56%)] transition-opacity duration-500 ${
                  isActive ? "opacity-80" : "opacity-30"
                }`}
              />

              <div
                className={`absolute transition-opacity duration-500 ${
                  isActive ? "rounded-r-[10px] opacity-[0.22]" : "bottom-2 top-2 rounded-r-[12px] border-l border-cyan-50/8 opacity-18"
                }`}
                style={{
                  right: isActive ? 4 : 0,
                  top: isActive ? 12 : undefined,
                  bottom: isActive ? 12 : undefined,
                  width: pageEdgeWidth,
                  background: isActive
                    ? "linear-gradient(180deg, transparent, rgba(165,243,252,0.035) 16%, rgba(241,245,249,0.055) 50%, rgba(165,243,252,0.03) 84%, transparent)"
                    : "linear-gradient(90deg, rgba(241,245,249,0.12), rgba(165,243,252,0.075) 46%, rgba(15,23,42,0.16))",
                  boxShadow: isActive
                    ? "inset 1px 0 1px rgba(255,255,255,0.035)"
                    : "inset 1px 0 2px rgba(255,255,255,0.06), inset -1px 0 3px rgba(0,0,0,0.18)",
                }}
              >
                {!isActive && (
                  <>
                    <span className="absolute left-1 top-[22%] h-px w-[45%] rounded-full bg-cyan-50/16" />
                    <span className="absolute left-1 top-[39%] h-px w-[52%] rounded-full bg-cyan-50/12" />
                    <span className="absolute left-1 top-[57%] h-px w-[42%] rounded-full bg-cyan-50/10" />
                    <span className="absolute left-1 top-[73%] h-px w-[48%] rounded-full bg-cyan-50/9" />
                  </>
                )}
              </div>

              <div
                className="relative z-10 flex h-full flex-col text-white"
                style={{
                  paddingTop: isActive ? 14 : 12,
                  paddingRight: isActive ? 13 : 11,
                  paddingBottom: isActive ? 13 : 12,
                  paddingLeft: contentLeftPadding,
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
