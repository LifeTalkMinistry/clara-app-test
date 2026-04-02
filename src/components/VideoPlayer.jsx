import { Play, FileText, Download, ExternalLink } from "lucide-react";

export default function VideoPlayer({ url, label }) {
  if (!url) return null;

  // YouTube embed
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (ytMatch) {
    return (
      <div className="aspect-video w-full rounded-xl overflow-hidden mb-4">
        <iframe
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          className="w-full h-full"
          allowFullScreen
          title="Video"
        />
      </div>
    );
  }

  // Direct video file (mp4, webm, ogg, mov, mkv, avi, flv, m4v)
  if (url.match(/\.(mp4|webm|ogg|mov|mkv|avi|flv|m4v)(\?.*)?$/i)) {
    return (
      <div className="mb-4">
        <video controls className="w-full rounded-xl max-h-96" src={url}>
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  // PDF
  if (url.match(/\.pdf(\?.*)?$/i)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-sm font-medium mb-4 hover:bg-destructive/10 transition-colors">
        <FileText className="w-5 h-5 text-destructive flex-shrink-0" />
        <span className="flex-1 truncate">{label || 'Open PDF'}</span>
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
      </a>
    );
  }

  // Generic link
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 text-primary text-sm font-medium mb-4 hover:bg-primary/20 transition-colors">
      <Play className="w-4 h-4" /> {label || 'View Media'}
    </a>
  );
}