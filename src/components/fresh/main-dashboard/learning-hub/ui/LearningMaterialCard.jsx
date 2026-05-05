export default function LearningMaterialCard({ item, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`transition-all duration-300 rounded-[18px] overflow-hidden cursor-pointer flex items-center justify-center
        ${isActive ? "scale-100 opacity-100" : "scale-75 opacity-50"}`}
      style={{ minWidth: isActive ? 140 : 110 }}
    >
      {/* BOOK SHAPE */}
      <div className="h-[170px] w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-[14px] flex flex-col justify-between p-3 relative">

        {/* SPINE EFFECT */}
        <div className="absolute left-0 top-0 h-full w-[6px] bg-white/10 rounded-l-[14px]" />

        {/* TOP LABEL */}
        <div className="text-[9px] uppercase tracking-wide text-white/40">
          {item.coverLabel || "Guide"}
        </div>

        {/* TITLE */}
        <div className="flex-1 flex items-end">
          <span className="text-xs font-semibold leading-tight text-white/85">
            {item.title}
          </span>
        </div>

      </div>
    </div>
  );
}
