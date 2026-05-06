import { Play } from "lucide-react";

export default function FeedMediaRenderer({
  post,
  activeYoutubePosts = {},
  onActivateYoutubePost,
}) {
  const media = post?.media;
  if (!media) return null;

  if (media.type === "image" && media.url) {
    return (
      <div className="mx-auto mt-3 w-full max-w-full overflow-hidden rounded-[22px] border border-white/15 bg-black/20">
        <img
          src={media.url}
          alt={media.name || "Feed media"}
          className="max-h-[340px] w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (media.type === "video" && media.url) {
    return (
      <div className="mx-auto mt-3 w-full max-w-full overflow-hidden rounded-[22px] border border-white/15 bg-black/30">
        <video
          src={media.url}
          controls
          playsInline
          preload="metadata"
          className="aspect-video max-h-[340px] w-full bg-black object-contain"
        />
      </div>
    );
  }

  if (media.type === "youtube" && media.embedUrl) {
    const isActive = activeYoutubePosts[post.id];

    if (!isActive) {
      return (
        <button
          type="button"
          onClick={() => onActivateYoutubePost?.(post.id)}
          className="relative mx-auto mt-3 block w-full max-w-full overflow-hidden rounded-[22px] border border-white/15 bg-black/30 text-left touch-pan-y"
          aria-label="Play YouTube video inline"
        >
          <div className="relative aspect-video w-full bg-black">
            {media.thumbnailUrl ? (
              <img
                src={media.thumbnailUrl}
                alt="YouTube preview"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/50">
                YouTube preview
              </div>
            )}

            <div className="absolute inset-0 bg-black/20" />

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
                <Play className="ml-1 h-7 w-7 fill-current" />
              </div>
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-center text-[10px] font-bold text-white/70 backdrop-blur-md">
              Tap to load player
            </div>
          </div>
        </button>
      );
    }

    return (
      <div className="mx-auto mt-3 w-full max-w-full overflow-hidden rounded-[22px] border border-white/15 bg-black/30 shadow-[0_12px_35px_rgba(0,0,0,0.22)]">
        <div className="relative aspect-video w-full">
          <iframe
            src={`${media.embedUrl}?autoplay=0&playsinline=1&rel=0&modestbranding=1&controls=1&fs=1`}
            title="YouTube video"
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    );
  }

  return null;
}
