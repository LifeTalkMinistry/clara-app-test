export default function LearningHubCarousel({ materials, onOpenMaterial }) {
  return (
    <div className="flex overflow-x-auto gap-4 px-4 py-2">
      {materials.map((item) => (
        <div
          key={item.id}
          onClick={() => onOpenMaterial(item)}
          className="min-w-[200px] h-[120px] bg-white/5 rounded-xl flex items-center justify-center cursor-pointer"
        >
          <span className="text-sm">{item.title}</span>
        </div>
      ))}
    </div>
  );
}
