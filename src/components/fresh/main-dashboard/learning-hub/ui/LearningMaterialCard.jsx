export default function LearningMaterialCard({ item, isActive, offset = 0, visible = true, onClick }) {
  const absOffset = Math.abs(offset);

  const distance = 142;
  const translateX = `calc(-50% + ${offset * distance}px)`;

  const scale = isActive ? 1 : 0.78;
  const rotate = isActive ? 0 : offset < 0 ? 10 : -10;
  const origin = isActive ? "center center" : offset < 0 ? "right center" : "left center";

  const depth = isActive ? 20 : -30;
  const blur = isActive ? 0 : 1.2;

  const opacity = visible ? (isActive ? 1 : 0.55) : 0;
  const zIndex = isActive ? 80 : 40;

  const width = isActive ? 154 : 112;
  const height = isActive ? 205 : 180;

  return (
    <div
      onClick={onClick}
      className="absolute left-1/2 top-1/2 cursor-pointer transition-all duration-500 ease-out"
      style={{
        width,
        opacity,
        zIndex,
        filter: `blur(${blur}px)`,
        transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg) translateZ(${depth}px)`,
        transformOrigin: origin,
        transformStyle: "preserve-3d",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {isActive && (
        <div className="absolute -inset-6 rounded-[28px] bg-cyan-400/15 blur-2xl" />
      )}

      <div
        className={`relative w-full overflow-hidden rounded-[18px] border transition-all duration-500 ${
          isActive
            ? "border-cyan-200/60 bg-slate-950 shadow-[0_0_18px_rgba(56,189,248,0.45),0_12px_30px_rgba(0,0,0,0.45)]"
            : "border-cyan-300/20 bg-slate-950/90 shadow-[0_12px_28px_rgba(0,0,0,0.4)]"
        }`}
        style={{ height }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-950" />

        <div className="absolute left-0 top-0 h-full w-[6px] bg-black/25" />

        <div className="absolute left-4 right-4 top-3">
          {isActive && (
            <div className="mb-2 inline-flex rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[8px] font-bold uppercase text-white">
              Featured
            </div>
          )}
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/50">
            {item.coverLabel || "Guide"}
          </div>
        </div>

        <div className="absolute left-4 right-4 top-[64px]">
          <h3 className={`${isActive ? "text-[18px]" : "text-[14px]"} font-black leading-tight text-white`}>
            {item.title}
          </h3>
          <p className={`${isActive ? "mt-3 text-[11px]" : "mt-2 text-[10px]"} text-white/60`}>
            {item.subtitle || "Read and learn."}
          </p>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] text-white">
            Read Now
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-white/70">
            □
          </span>
        </div>
      </div>
    </div>
  );
}
