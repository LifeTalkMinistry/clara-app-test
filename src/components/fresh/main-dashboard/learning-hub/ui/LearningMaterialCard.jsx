export default function LearningMaterialCard({ item, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer
        ${isActive ? "scale-100 opacity-100" : "scale-75 opacity-50"}`}
      style={{ minWidth: isActive ? 220 : 160 }}
    >
      <div className="h-[140px] bg-white/5 flex items-end p-3">
        <span className="text-sm">{item.title}</span>
      </div>
    </div>
  );
}
