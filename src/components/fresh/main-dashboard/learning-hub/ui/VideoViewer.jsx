export default function VideoViewer({ material }) {
  if (!material || material.type !== "video") return null;

  return (
    <div className="w-full">
      <video
        src={material.videoUrl}
        controls
        className="w-full rounded-xl"
      />
      <p className="text-xs mt-2 opacity-70">{material.summary}</p>
    </div>
  );
}
