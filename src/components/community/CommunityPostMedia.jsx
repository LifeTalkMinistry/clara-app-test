import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Download,
  Expand,
  FileText,
  Heart,
  HeartHandshake,
  Loader2,
  MessageCircle,
  Play,
  RefreshCw,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  fetchCommunityMediaBlob,
  getCommunityMediaStreamUrl,
} from "@/lib/community-media-client";
import "@/community-feed-refinement.css";

function compactCount(value) {
  const count = Math.max(0, Number(value) || 0);
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
}

function initialsFor(value) {
  return String(value || "CLARA")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "CL";
}

export default function CommunityPostMedia({
  mediaUrl,
  mediaType,
  mediaName,
  edgeToEdge = false,
  viewerSocial = null,
}) {
  const frameRef = useRef(null);
  const inlineVideoRef = useRef(null);
  const viewerVideoRef = useRef(null);
  const viewerStartTimeRef = useRef(0);
  const viewerShouldPlayRef = useRef(false);
  const viewerSyncedRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPaused, setViewerPaused] = useState(true);
  const [viewerMuted, setViewerMuted] = useState(false);
  const [viewerDuration, setViewerDuration] = useState(0);
  const [viewerCurrentTime, setViewerCurrentTime] = useState(0);
  const [viewerLandscape, setViewerLandscape] = useState(false);
  const [shareNotice, setShareNotice] = useState("");

  const isStreamable = mediaType === "image" || mediaType === "video";

  useEffect(() => {
    setShouldLoad(false);
    setStreamUrl("");
    setFailed(false);
    setDownloadFailed(false);
    setViewerOpen(false);
    setViewerPaused(true);
    setViewerMuted(false);
    setViewerDuration(0);
    setViewerCurrentTime(0);
    setViewerLandscape(false);
    setShareNotice("");
  }, [mediaUrl, mediaType]);

  useEffect(() => {
    if (!mediaUrl || !isStreamable || shouldLoad) return undefined;

    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isStreamable, mediaUrl, shouldLoad]);

  useEffect(() => {
    let active = true;

    async function prepareStream() {
      if (!mediaUrl || !isStreamable || !shouldLoad) return;

      setPreparing(true);
      setFailed(false);
      setStreamUrl("");
      try {
        const url = await getCommunityMediaStreamUrl(mediaUrl);
        if (active) setStreamUrl(url);
      } catch (error) {
        console.error("[Community] media stream preparation failed:", error);
        if (active) setFailed(true);
      } finally {
        if (active) setPreparing(false);
      }
    }

    prepareStream();
    return () => {
      active = false;
    };
  }, [isStreamable, mediaUrl, retryKey, shouldLoad]);

  useEffect(() => {
    if (!viewerOpen || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeViewer();
      if (event.key === " " && mediaType === "video") {
        event.preventDefault();
        toggleViewerPlayback();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [viewerOpen, mediaType]);

  if (!mediaUrl) return null;

  const frameClass = (backgroundClass) => edgeToEdge
    ? `mt-4 -mx-4 overflow-hidden border-y border-white/10 ${backgroundClass} sm:mx-0 sm:rounded-[18px] sm:border`
    : `mt-4 overflow-hidden rounded-[18px] border border-white/10 ${backgroundClass}`;

  const openViewer = () => {
    if (!streamUrl || !isStreamable) return;

    viewerSyncedRef.current = false;
    setShareNotice("");

    if (mediaType === "video" && inlineVideoRef.current) {
      viewerStartTimeRef.current = Number(inlineVideoRef.current.currentTime || 0);
      viewerShouldPlayRef.current = true;
      inlineVideoRef.current.pause();
      setViewerPaused(false);
    }

    setViewerOpen(true);
  };

  function closeViewer() {
    if (mediaType === "video" && viewerVideoRef.current) {
      const viewer = viewerVideoRef.current;
      viewerStartTimeRef.current = Number(viewer.currentTime || 0);
      viewerShouldPlayRef.current = !viewer.paused && !viewer.ended;
      viewer.pause();

      const inlineVideo = inlineVideoRef.current;
      if (inlineVideo) {
        try {
          inlineVideo.currentTime = viewerStartTimeRef.current;
        } catch {
          // Some browsers block seeking until metadata is fully ready.
        }
        if (viewerShouldPlayRef.current) {
          inlineVideo.play().catch(() => {});
        }
      }
    }

    setViewerOpen(false);
  }

  const syncViewerVideo = () => {
    const viewer = viewerVideoRef.current;
    if (!viewer) return;

    setViewerDuration(Number(viewer.duration || 0));
    if (viewer.videoWidth && viewer.videoHeight) {
      setViewerLandscape(viewer.videoWidth / viewer.videoHeight > 1.08);
    }

    if (!viewerSyncedRef.current) {
      viewerSyncedRef.current = true;
      try {
        viewer.currentTime = viewerStartTimeRef.current;
      } catch {
        // Ignore early seek failures and let the video start at the beginning.
      }
      if (viewerShouldPlayRef.current) {
        viewer.play().catch(() => setViewerPaused(true));
      }
    }
  };

  function toggleViewerPlayback() {
    const viewer = viewerVideoRef.current;
    if (!viewer) return;
    if (viewer.paused || viewer.ended) {
      viewer.play().catch(() => {});
    } else {
      viewer.pause();
    }
  }

  const toggleViewerMute = (event) => {
    event?.stopPropagation?.();
    const nextMuted = !viewerMuted;
    setViewerMuted(nextMuted);
    if (viewerVideoRef.current) viewerVideoRef.current.muted = nextMuted;
  };

  const seekViewer = (event) => {
    event.stopPropagation();
    const viewer = viewerVideoRef.current;
    if (!viewer || !viewerDuration) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    viewer.currentTime = fraction * viewerDuration;
    setViewerCurrentTime(viewer.currentTime);
  };

  const shareViewer = async (event) => {
    event?.stopPropagation?.();
    const shareData = {
      title: `${viewerSocial?.authorName || "CLARA Community"} on CLARA`,
      text: String(viewerSocial?.body || "Check out this CLARA Community post.").slice(0, 220),
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard && shareData.url) {
        await navigator.clipboard.writeText(shareData.url);
        setShareNotice("Link copied");
        window.setTimeout(() => setShareNotice(""), 1800);
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.warn("[Community] share failed:", error);
    }
  };

  const runSocialAction = (event, action, closeAfter = false) => {
    event?.stopPropagation?.();
    if (typeof action !== "function") return;
    if (closeAfter) {
      closeViewer();
      window.setTimeout(() => action(), 80);
      return;
    }
    action();
  };

  const socialAuthorName = viewerSocial?.authorName || "CLARA Member";
  const socialAvatar = viewerSocial?.authorAvatar || "";
  const socialBody = String(viewerSocial?.body || "").trim();
  const progress = viewerDuration > 0
    ? Math.max(0, Math.min(100, (viewerCurrentTime / viewerDuration) * 100))
    : 0;

  const viewer = viewerOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          className="clara-community-reels-viewer fixed inset-0 z-[300] text-white"
          role="dialog"
          aria-modal="true"
          aria-label={mediaType === "video" ? "Expanded Community video" : "Expanded Community photo"}
        >
          <div className="absolute inset-0 bg-black" />

          <div className="relative z-10 mx-auto h-[100dvh] w-full max-w-[560px] overflow-hidden bg-black shadow-[0_0_90px_rgba(0,0,0,0.9)] sm:border-x sm:border-white/10">
            <button
              type="button"
              onClick={closeViewer}
              className="absolute left-3 top-[max(12px,env(safe-area-inset-top))] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-xl backdrop-blur-xl transition active:scale-95"
              aria-label="Close expanded media"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>

            {mediaType === "video" ? (
              <button
                type="button"
                onClick={toggleViewerMute}
                className="absolute right-3 top-[max(12px,env(safe-area-inset-top))] z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-xl backdrop-blur-xl transition active:scale-95"
                aria-label={viewerMuted ? "Unmute video" : "Mute video"}
              >
                {viewerMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            ) : null}

            <div
              className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black"
              onClick={mediaType === "video" ? toggleViewerPlayback : undefined}
              role={mediaType === "video" ? "button" : undefined}
              tabIndex={mediaType === "video" ? 0 : undefined}
            >
              {mediaType === "image" ? (
                <img
                  src={streamUrl}
                  alt={mediaName || "Community attachment"}
                  draggable="false"
                  onLoad={(event) => {
                    const image = event.currentTarget;
                    if (image.naturalWidth && image.naturalHeight) {
                      setViewerLandscape(image.naturalWidth / image.naturalHeight > 1.08);
                    }
                  }}
                  className="block h-full w-full select-none"
                  style={{ objectFit: viewerLandscape ? "contain" : "cover" }}
                />
              ) : (
                <video
                  ref={viewerVideoRef}
                  src={streamUrl}
                  playsInline
                  preload="metadata"
                  muted={viewerMuted}
                  onLoadedMetadata={syncViewerVideo}
                  onCanPlay={syncViewerVideo}
                  onTimeUpdate={(event) => {
                    setViewerCurrentTime(Number(event.currentTarget.currentTime || 0));
                    setViewerDuration(Number(event.currentTarget.duration || 0));
                  }}
                  onPlay={() => setViewerPaused(false)}
                  onPause={() => setViewerPaused(true)}
                  onEnded={() => setViewerPaused(true)}
                  onError={() => setFailed(true)}
                  className="block h-full w-full bg-black"
                  style={{ objectFit: viewerLandscape ? "contain" : "cover" }}
                />
              )}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 bg-gradient-to-b from-black/65 via-black/18 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[42%] bg-gradient-to-t from-black/88 via-black/28 to-transparent" />

            {mediaType === "video" && viewerPaused ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleViewerPlayback();
                }}
                className="absolute left-1/2 top-1/2 z-30 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white shadow-2xl backdrop-blur-md transition active:scale-95"
                aria-label="Play video"
              >
                <Play className="ml-1 h-7 w-7 fill-current" />
              </button>
            ) : null}

            {viewerSocial ? (
              <>
                <div className="absolute bottom-[138px] right-3 z-40 flex w-14 flex-col items-center gap-4 sm:right-4">
                  <button
                    type="button"
                    onClick={(event) => runSocialAction(event, viewerSocial.onLove)}
                    className={`flex flex-col items-center gap-1 text-white ${viewerSocial.myReaction === "love" ? "text-[#ff7dab]" : ""}`}
                    aria-label="Love this post"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/28 drop-shadow-lg backdrop-blur-sm">
                      <Heart className={`h-7 w-7 ${viewerSocial.myReaction === "love" ? "fill-current" : ""}`} />
                    </span>
                    <span className="text-[11px] font-black drop-shadow-lg">{compactCount(viewerSocial.loveCount)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(event) => runSocialAction(event, viewerSocial.onComment, true)}
                    className="flex flex-col items-center gap-1 text-white"
                    aria-label="Open comments"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/28 drop-shadow-lg backdrop-blur-sm">
                      <MessageCircle className="h-7 w-7" />
                    </span>
                    <span className="text-[11px] font-black drop-shadow-lg">{compactCount(viewerSocial.commentCount)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(event) => runSocialAction(event, viewerSocial.onSupport)}
                    className={`flex flex-col items-center gap-1 text-white ${viewerSocial.myReaction === "care" ? "text-[#69fff5]" : ""}`}
                    aria-label="Support this post"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/28 drop-shadow-lg backdrop-blur-sm">
                      <HeartHandshake className="h-7 w-7" />
                    </span>
                    <span className="text-[11px] font-black drop-shadow-lg">{compactCount(viewerSocial.supportCount)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={shareViewer}
                    className="flex flex-col items-center gap-1 text-white"
                    aria-label="Share post"
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/28 drop-shadow-lg backdrop-blur-sm">
                      <Share2 className="h-7 w-7" />
                    </span>
                    <span className="text-[10px] font-black drop-shadow-lg">Share</span>
                  </button>
                </div>

                <div className="absolute bottom-[52px] left-4 right-[78px] z-40 text-left sm:left-5">
                  <button
                    type="button"
                    onClick={(event) => runSocialAction(event, viewerSocial.onProfile, true)}
                    className="flex min-w-0 items-center gap-2.5 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/85 bg-[#0b2633] text-[10px] font-black shadow-xl">
                      {socialAvatar ? (
                        <img src={socialAvatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initialsFor(socialAuthorName)
                      )}
                    </span>
                    <span className="min-w-0 truncate text-[14px] font-black text-white drop-shadow-lg">{socialAuthorName}</span>
                  </button>

                  {socialBody ? (
                    <p className="mt-2 line-clamp-2 text-[13px] font-semibold leading-5 text-white/92 drop-shadow-lg">
                      {socialBody}
                    </p>
                  ) : null}

                  {viewerSocial.postTypeLabel ? (
                    <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#78fff7] drop-shadow-lg">
                      {viewerSocial.postTypeLabel}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            {shareNotice ? (
              <div className="absolute left-1/2 top-[76px] z-50 -translate-x-1/2 rounded-full border border-white/15 bg-black/70 px-3 py-1.5 text-[10px] font-black text-white shadow-xl backdrop-blur-lg">
                {shareNotice}
              </div>
            ) : null}

            {mediaType === "video" ? (
              <button
                type="button"
                onClick={seekViewer}
                className="absolute inset-x-3 bottom-[max(10px,env(safe-area-inset-bottom))] z-50 h-6"
                aria-label="Seek video"
              >
                <span className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-white/30" />
                <span
                  className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[#67fff5]"
                  style={{ width: `${progress}%` }}
                />
                <span
                  className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-lg"
                  style={{ left: `${progress}%` }}
                />
              </button>
            ) : null}
          </div>
        </div>,
        document.body
      )
    : null;

  if (!isStreamable) {
    const downloadFile = async () => {
      if (downloading) return;
      setDownloading(true);
      setDownloadFailed(false);
      try {
        const blob = await fetchCommunityMediaBlob(mediaUrl);
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = mediaName || "CLARA-attachment";
        anchor.rel = "noopener";
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      } catch (error) {
        console.error("[Community] file download failed:", error);
        setDownloadFailed(true);
      } finally {
        setDownloading(false);
      }
    };

    return (
      <button
        type="button"
        onClick={downloadFile}
        disabled={downloading}
        className="mt-4 flex w-full items-center gap-3 rounded-[18px] border border-white/10 bg-[#071725] px-4 py-4 text-left transition hover:border-[#22c7b8]/30 hover:bg-[#22c7b8]/[0.06] disabled:cursor-wait disabled:opacity-70"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#22c7b8]/10 text-[#99f6e4]">
          {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{mediaName || "Attachment"}</p>
          <p className={`mt-0.5 text-[10px] font-semibold ${downloadFailed ? "text-amber-200/75" : "text-white/35"}`}>
            {downloadFailed ? "Download interrupted. Tap to try again." : downloading ? "Preparing download..." : "Tap to download"}
          </p>
        </div>
        <Download className="h-4 w-4 shrink-0 text-white/45" />
      </button>
    );
  }

  if (!shouldLoad) {
    return (
      <div
        ref={frameRef}
        className={`${frameClass(mediaType === "video" ? "bg-black/70" : "bg-[#020617]")} flex h-36 items-center justify-center text-white/22 sm:h-44`}
        aria-label="Community media will load when it nears the screen"
      >
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.06]">
          <div className="h-full w-1/2 rounded-full bg-white/[0.10]" />
        </div>
      </div>
    );
  }

  if (preparing && !streamUrl) {
    return (
      <div ref={frameRef} className={`${frameClass("bg-[#071725]")} flex h-32 items-center justify-center text-white/45`}>
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (failed || !streamUrl) {
    return (
      <div ref={frameRef} className={`${frameClass("bg-[#071725]")} flex items-center justify-between gap-3 px-4 py-4 text-xs font-semibold text-white/45`}>
        <span>This attachment could not be loaded.</span>
        <button
          type="button"
          onClick={() => {
            setFailed(false);
            setRetryKey((value) => value + 1);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black text-white/65 transition hover:border-[#22c7b8]/30 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  if (mediaType === "image") {
    return (
      <>
        <button
          ref={frameRef}
          type="button"
          onClick={openViewer}
          className={`${frameClass("bg-[#020617]")} group relative flex max-h-[68dvh] w-full cursor-zoom-in items-center justify-center text-left sm:max-h-[720px]`}
          aria-label="Expand photo"
        >
          <img
            src={streamUrl}
            alt={mediaName || "Community attachment"}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="block h-auto max-h-[68dvh] w-full object-contain sm:max-h-[720px]"
          />
          <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white/85 opacity-90 shadow-lg backdrop-blur-md transition group-hover:bg-black/65 group-hover:text-white">
            <Expand className="h-4 w-4" />
          </span>
        </button>
        {viewer}
      </>
    );
  }

  const handleVideoFrameClick = (event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const distanceFromBottom = bounds.bottom - event.clientY;

    // Keep native transport controls usable in the feed. Tapping the picture
    // itself opens CLARA's immersive viewer.
    if (distanceFromBottom <= 62) return;
    openViewer();
  };

  return (
    <>
      <div
        ref={frameRef}
        onClick={handleVideoFrameClick}
        className={`${frameClass("bg-black/70")} group relative flex max-h-[68dvh] cursor-zoom-in items-center justify-center sm:max-h-[720px]`}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openViewer();
          }
        }}
        aria-label="Expand video"
      >
        <video
          ref={inlineVideoRef}
          src={streamUrl}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
          className="block max-h-[68dvh] w-full object-contain bg-black sm:max-h-[720px]"
        />
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openViewer();
          }}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 text-white/90 shadow-lg backdrop-blur-md transition hover:bg-black/75 hover:text-white active:scale-95"
          aria-label="Open video fullscreen viewer"
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>
      {viewer}
    </>
  );
}
