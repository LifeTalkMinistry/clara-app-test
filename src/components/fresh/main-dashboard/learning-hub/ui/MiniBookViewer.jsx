export default function MiniBookViewer({ material }) {
  if (!material || material.type !== "book") return null;

  return (
    <div className="flex flex-col gap-4">
      {material.pages?.map((page, index) => (
        <div key={index} className="p-4 bg-white/5 rounded-xl">
          <h3 className="text-sm font-semibold mb-2">{page.title}</h3>
          <p className="text-xs opacity-80">{page.body}</p>
        </div>
      ))}
    </div>
  );
}
