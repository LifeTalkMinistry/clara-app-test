export default function LearningMaterialCard({ item, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer
        ${isActive ? "scale-100 opacity-100" : "scale-75 opacity-50"}`}
      style={{ minWidth: isActive ? 190 : 140 }}
    >
      <div className="h-[118px] bg-white/5 flex items-end p-3">
        <span className="text-xs font-semibold leading-tight text-white/85">
          {item.title}
        </span>
      </div>
    </div>
  );
}
