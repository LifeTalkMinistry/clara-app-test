export default function LearningMaterialCard({ item, isActive, offset = 0, visible = true, onClick }) {
  const distance = 96;
  const translateX = `calc(-50% + ${offset * distance}px)`;
  const scale = isActive ? 1 : 0.78;
  const rotate = isActive ? 0 : offset < 0 ? -8 : 8;
  const zIndex = isActive ? 30 : 20 - Math.abs(offset);

  return (
    <div
      onClick={onClick}
      className="absolute left-1/2 top-1/2 cursor-pointer rounded-[20px] transition-all duration-500 ease-out"
      style={{
        width: isActive ? 132 : 112,
        opacity: visible ? (isActive ? 1 : 0.48) : 0,
        zIndex,
        transform: `translate(${translateX}, -50%) scale(${scale}) rotateY(${rotate}deg)`,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className={`relative h-[184px] w-full overflow-hidden rounded-[16px] border backdrop-blur-xl transition-all duration-500 ${
          isActive
            ? "border-cyan-300/60 bg-slate-900/95 shadow-[0_0_28px_rgba(34,211,238,0.35)]"
            : "border-white/10 bg-slate-900/70 shadow-[0_16px_34px_rgba(0,0,0,0.35)]"
        }`}
      >
        {/* cover glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.32),transparent_44%),linear-gradient(180deg,rgba(15,23,42,0.12),rgba(2,6,23,0.92))]" />

        {/* book spine */}
        <div className="absolute left-0 top-0 h-full w-[8px] bg-black/25 shadow-[inset_-1px_0_0_rgba(255,255,255,0.10)]" />

        {/* featured pill */}
        {isActive && (
          <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[7px] font-bold uppercase tracking-wide text-cyan-100">
            Featured
          </div>
        )}

        {/* category */}
        <div className="absolute left-3 right-3 top-8 text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-100/55">
          {item.coverLabel || "Guide"}
        </div>

        {/* title */}
        <div className="absolute inset-x-3 bottom-12">
          <h3 className="text-[14px] font-black uppercase leading-[0.95] tracking-tight text-white">
            {item.title}
          </h3>
          {isActive && item.subtitle && (
            <p className="mt-2 text-[9px] font-medium leading-tight text-white/65">
              {item.subtitle}
            </p>
          )}
        </div>

        {/* footer */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="rounded-full bg-white/10 px-2 py-1 text-[8px] font-semibold text-white/85">
            Read Now
          </span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-300/10 text-[10px] text-cyan-100">
            📖
          </span>
        </div>
      </div>
    </div>
  );
}
