import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Expand,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import {
  fetchCommunityMediaBlob,
  getCommunityMediaStreamUrl,
} from "@/lib/community-media-client";
import "@/community-feed-refinement.css";

export default function CommunityPostMedia({ mediaUrl, mediaType, mediaName, edgeToEdge = false }) {
  const frameRef = useRef(null);
  const inlineVideoRef = useRef(null);
  const viewerVideoRef = useRef(null);
  const viewerStartTimeRef = useRef(0);
  const viewerShouldPlayRef = useRef(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const isStreamable = mediaType === "image" || mediaType === "video";

  useEffect(() => {
    setShouldLoad(false);
    setStreamUrl("");
    setFailed(false);
    setDownloadFailed(false);
    setViewerOpen(false);
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
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscrollBehavior;
    };
  }, [viewerOpen]);

  if (!mediaUrl) return null;

  const frameClass = (backgroundClass) => edgeToEdge
    ? `mt-4 -mx-4 overflow-hidden border-y border-white/10 ${backgroundClass} sm:mx-0 sm:rounded-[18px] sm:border`
    : `mt-4 overflow-hidden rounded-[18px] border border-white/10 ${backgroundClass}`;

  const openViewer = () => {
    if (!streamUrl || !isStreamable) return;

    if (mediaType === "video" && inlineVideoRef.current) {
      viewerStartTimeRef.current = Number(inlineVideoRef.current.currentTime || 0);
      viewerShouldPlayRef.current = !inlineVideoRef.current.paused;
      inlineVideoRef.current.pause();
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

  const handleViewerVideoReady = () => {
    const viewer = viewerVideoRef.current;
    if (!viewer) return;

    try {
      viewer.currentTime = viewerStartTimeRef.current;
    } catch {
      // Ignore early seek failures and let the video start at the beginning.
    }

    if (viewerShouldPlayRef.current) {
      viewer.play().catch(() => {});
    }
  };

  const viewer = viewerOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          className="fixed inset-0 z-[300] bg-black text-white"
          role="dialog"
          aria-modal="true"
          aria-label={mediaType === "video" ? "Expanded Community video" : "Expanded Community photo"}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(36,211,203,0.08),transparent_28%),#000]" />

          <button
            type="button"
            onClick={closeViewer}
            className="fixed right-3 top-[max(12px,env(safe-area-inset-top))] z-[320] flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-xl backdrop-blur-xl transition active:scale-95 sm:right-5 sm:top-5"
            aria-label="Close expanded media"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-[620px] items-center justify-center overflow-hidden bg-black shadow-[0_0_80px_rgba(0,0,0,0.85)] sm:border-x sm:border-white/10">
            {mediaType === "image" ? (
              <img
                src={streamUrl}
                alt={mediaName || "Community attachment"}
                className="block max-h-[100dvh] w-full select-none object-contain"
                draggable="false"
              />
            ) : (
              <video
                ref={viewerVideoRef}
                src={streamUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={handleViewerVideoReady}
                onCanPlay={handleViewerVideoReady}
                className="block h-[100dvh] w-full bg-black object-contain"
              />
            )}

            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/55 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
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

    // Keep the native transport controls usable. Tapping the picture area opens
    // the immersive viewer; tapping the bottom control strip stays inline.
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
