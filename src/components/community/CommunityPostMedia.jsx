import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import {
  fetchCommunityMediaBlob,
  getCommunityMediaStreamUrl,
} from "@/lib/community-media-client";
import "@/community-feed-refinement.css";

export default function CommunityPostMedia({ mediaUrl, mediaType, mediaName, edgeToEdge = false }) {
  const frameRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);

  const isStreamable = mediaType === "image" || mediaType === "video";

  useEffect(() => {
    setShouldLoad(false);
    setStreamUrl("");
    setFailed(false);
    setDownloadFailed(false);
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

  if (!mediaUrl) return null;

  const frameClass = (backgroundClass) => edgeToEdge
    ? `mt-4 -mx-4 overflow-hidden border-y border-white/10 ${backgroundClass} sm:mx-0 sm:rounded-[18px] sm:border`
    : `mt-4 overflow-hidden rounded-[18px] border border-white/10 ${backgroundClass}`;

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
      <div ref={frameRef} className={`${frameClass("bg-[#020617]")} flex max-h-[68dvh] items-center justify-center sm:max-h-[720px]`}>
        <img
          src={streamUrl}
          alt={mediaName || "Community attachment"}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="block h-auto max-h-[68dvh] w-full object-contain sm:max-h-[720px]"
        />
      </div>
    );
  }

  return (
    <div ref={frameRef} className={`${frameClass("bg-black/70")} flex max-h-[68dvh] items-center justify-center sm:max-h-[720px]`}>
      <video
        src={streamUrl}
        controls
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        className="block max-h-[68dvh] w-full object-contain bg-black sm:max-h-[720px]"
      />
    </div>
  );
}
