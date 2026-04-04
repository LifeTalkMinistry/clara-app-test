import { Play, FileText, ExternalLink } from "lucide-react";

export default function VideoPlayer({ url, label }) {
  if (!url) return null;

  const safeLabel = label || "View Media";

  const ytMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#/]+)/
  );

  if (ytMatch) {
    return (
      <div className="mb-4 aspect-video w-full overflow-hidden rounded-xl">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          title={safeLabel}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (url.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i)) {
    return (
      <div className="mb-4">
        <video controls className="max-h-96 w-full rounded-xl" src={url}>
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (url.match(/\.pdf(\?.*)?$/i)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm font-medium text-white transition-colors hover:bg-red-500/10"
      >
        <FileText className="h-5 w-5 flex-shrink-0 text-red-300" />
        <span className="flex-1 truncate">{label || "Open PDF"}</span>
        <ExternalLink className="h-4 w-4 text-white/50" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-4 flex items-center gap-2 rounded-xl bg-white/10 p-3 text-sm font-medium text-white transition-colors hover:bg-white/15"
    >
      <Play className="h-4 w-4" />
      <span className="truncate">{safeLabel}</span>
    </a>
  );
}