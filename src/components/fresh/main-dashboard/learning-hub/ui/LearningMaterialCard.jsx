const getBookVisual = (id = "") => {
  if (id.includes("investing")) return "chart";
  if (id.includes("breadwinner") || id.includes("freedom")) return "coins";
  if (id.includes("gambling")) return "door";
  if (id.includes("debt")) return "mountain";
  return "fog";
};

export default function LearningMaterialCard({ item, isActive, offset = 0, visible = true, onClick }) {
  const absOffset = Math.abs(offset);
  const visual = getBookVisual(item?.id || item?.title || "");
  const distance = 108;
  const translateX = `calc(-50% + ${offset * distance}px)`;
  const scale = isActive ? 1 : absOffset === 1 ? 0.86 : 0.74;

  // Face side books toward the center book:
  // left books expose their right side; right books expose their left side.
  const rotate = isActive ? 0 : offset < 0 ? 14 : -14;
  const origin = isActive ? "center center" : offset < 0 ? "right center" : "left center";

  const depth = isActive ? 32 : absOffset === 1 ? -22 : -70;
  const blur = isActive ? 0 : absOffset === 1 ? 0.15 : 0.8;
  const opacity = visible ? (isActive ? 1 : absOffset === 1 ? 0.82 : 0.38) : 0;
  const zIndex = isActive ? 80 : 60 - absOffset;
  const width = isActive ? 154 : absOffset === 1 ? 124 : 106;
  const height = isActive ? 205 : absOffset === 1 ? 188 : 174;

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
      {isActive && <div className="absolute -inset-7 rounded-[34px] bg-cyan-400/30 blur-3xl" />}

      <div
        className={`relative w-full overflow-hidden rounded-[18px] border transition-all duration-500 ${
          isActive
            ? "border-cyan-200/80 bg-slate-950 shadow-[0_0_34px_rgba(56,189,248,0.75),0_18px_45px_rgba(0,0,0,0.55)]"
            : "border-cyan-300/25 bg-slate-950/90 shadow-[0_18px_38px_rgba(0,0,0,0.48)]"
        }`}
        style={{ height }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.26),transparent_42%),linear-gradient(180deg,rgba(8,47,73,0.38),rgba(2,6,23,0.98))]" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(circle_at_50%_100%,rgba(14,165,233,0.18),transparent_58%)]" />
        <div className="absolute left-0 top-0 h-full w-[7px] bg-black/35 shadow-[inset_-1px_0_0_rgba(255,255,255,0.12)]" />

        {visual === "chart" && (
          <div className="absolute bottom-14 right-3 h-20 w-20 opacity-70">
            <div className="absolute bottom-0 left-2 h-5 w-3 rounded-t bg-cyan-300/30" />
            <div className="absolute bottom-0 left-7 h-9 w-3 rounded-t bg-cyan-300/35" />
            <div className="absolute bottom-0 left-12 h-14 w-3 rounded-t bg-cyan-300/45" />
            <div className="absolute left-0 top-5 h-[2px] w-20 rotate-[-24deg] rounded-full bg-cyan-300/70" />
          </div>
        )}

        {visual === "coins" && (
          <div className="absolute bottom-14 right-2 h-20 w-20 opacity-70">
            <div className="absolute bottom-0 right-2 h-8 w-8 rounded-full border border-emerald-200/30 bg-amber-300/20" />
            <div className="absolute bottom-4 right-7 h-8 w-8 rounded-full border border-emerald-200/30 bg-amber-300/20" />
            <div className="absolute bottom-9 right-12 h-10 w-3 rounded-full bg-emerald-300/35" />
          </div>
        )}

        {visual === "door" && (
          <div className="absolute bottom-14 right-5 h-24 w-16 opacity-75">
            <div className="absolute bottom-0 right-1 h-20 w-9 rounded-t bg-cyan-200/20 shadow-[0_0_28px_rgba(125,211,252,0.55)]" />
            <div className="absolute bottom-0 left-5 h-14 w-[2px] bg-white/45" />
          </div>
        )}

        {visual === "mountain" && (
          <div className="absolute bottom-12 right-0 h-24 w-28 opacity-45">
            <div className="absolute bottom-0 right-0 h-20 w-28 bg-[linear-gradient(135deg,transparent_42%,rgba(14,165,233,0.25)_43%,rgba(15,23,42,0.2)_70%)]" />
          </div>
        )}

        <div className="absolute left-4 right-4 top-3">
          {isActive && (
            <div className="mb-2 inline-flex rounded-full border border-white/15 bg-blue-500/35 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-white">
              Featured
            </div>
          )}
          <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-100/60">
            {item.coverLabel || "Guide"}
          </div>
        </div>

        <div className="absolute left-4 right-4 top-[64px]">
          <h3 className={`${isActive ? "text-[18px]" : "text-[15px]"} font-black uppercase leading-[0.95] tracking-tight text-white`}>
            {item.title}
          </h3>
          <p className={`${isActive ? "mt-3 text-[11px]" : "mt-2 text-[10px]"} max-w-[92px] font-medium leading-tight text-cyan-50/75`}>
            {item.subtitle || "Read and learn."}
          </p>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-[9px] font-bold text-white">
            Read Now
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-200/50 bg-cyan-300/10 text-[13px] text-cyan-100">
            □
          </span>
        </div>
      </div>
    </div>
  );
}
