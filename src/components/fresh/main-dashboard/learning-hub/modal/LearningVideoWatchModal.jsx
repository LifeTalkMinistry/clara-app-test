import { useRef } from "react";
import { createPortal } from "react-dom";

const getYouTubeStartSeconds = (material) => {
  const sourceUrl =
    typeof material?.sourceUrl === "string" && material.sourceUrl.trim().length > 0
      ? material.sourceUrl.trim()
      : typeof material?.externalUrl === "string" && material.externalUrl.trim().length > 0
        ? material.externalUrl.trim()
        : "";

  if (!sourceUrl) return 0;

  try {
    const url = new URL(sourceUrl);
    const timestamp = url.searchParams.get("t") || url.searchParams.get("start");
    if (!timestamp) return 0;

    const normalizedTimestamp = timestamp.toLowerCase().trim();
    const hourMatch = normalizedTimestamp.match(/(\d+)h/);
    const minuteMatch = normalizedTimestamp.match(/(\d+)m/);
    const secondMatch = normalizedTimestamp.match(/(\d+)s/);

    if (hourMatch || minuteMatch || secondMatch) {
      return (
        Number(hourMatch?.[1] || 0) * 3600 +
        Number(minuteMatch?.[1] || 0) * 60 +
        Number(secondMatch?.[1] || 0)
      );
    }

    const numericSeconds = Number.parseInt(normalizedTimestamp, 10);
    return Number.isFinite(numericSeconds) && numericSeconds > 0 ? numericSeconds : 0;
  } catch {
    return 0;
  }
};

function getYouTubePlayerSrc(material) {
  const youtubeId = typeof material?.youtubeId === "string" ? material.youtubeId.trim() : "";

  if (youtubeId) {
    const url = new URL(`https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}`);
    const startSeconds = getYouTubeStartSeconds(material);

    url.searchParams.set("enablejsapi", "1");
    url.searchParams.set("playsinline", "1");
    url.searchParams.set("controls", "1");
    url.searchParams.set("fs", "1");
    url.searchParams.set("rel", "0");
    url.searchParams.set("modestbranding", "1");

    if (typeof window !== "undefined" && window.location?.origin) {
      url.searchParams.set("origin", window.location.origin);
    }

    if (startSeconds > 0) {
      url.searchParams.set("start", String(startSeconds));
    }

    return url.toString();
  }

  const embedUrl = material?.embedUrl;
  if (!embedUrl) return "";

  try {
    const url = new URL(embedUrl);

    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtube-nocookie.com")) {
      url.hostname = "www.youtube.com";
      url.searchParams.set("enablejsapi", "1");
      url.searchParams.set("playsinline", "1");
      url.searchParams.set("controls", "1");
      url.searchParams.set("fs", "1");
      url.searchParams.set("rel", "0");
      url.searchParams.set("modestbranding", "1");

      if (typeof window !== "undefined" && window.location?.origin) {
        url.searchParams.set("origin", window.location.origin);
      }
    }

    return url.toString();
  } catch {
    return embedUrl;
  }
}

const getWatchUrl = (material) => {
  const sourceUrl =
    typeof material?.sourceUrl === "string" && material.sourceUrl.trim().length > 0
      ? material.sourceUrl.trim()
      : typeof material?.externalUrl === "string" && material.externalUrl.trim().length > 0
        ? material.externalUrl.trim()
        : "";

  if (!sourceUrl) return "";

  try {
    const url = new URL(sourceUrl);
    return url.protocol === "http:" || url.protocol === "https:" ? sourceUrl : "";
  } catch {
    return "";
  }
};

export default function LearningVideoWatchModal({ isOpen, material, onClose }) {
  const iframeRef = useRef(null);

  if (!isOpen || !material || typeof document === "undefined") return null;

  const titleId = "clara-learning-video-watch-title";
  const subtitleId = "clara-learning-video-watch-subtitle";
  const playerSrc = getYouTubePlayerSrc(material);
  const watchUrl = getWatchUrl(material);
  const eyebrowLabel = material.contentTypeLabel || material.coverLabel || "Curated Video Lesson";

  const sendYouTubeCommand = (func) => {
    const playerWindow = iframeRef.current?.contentWindow;
    if (!playerWindow) return;

    playerWindow.postMessage(
      JSON.stringify({
        event: "command",
        func,
        args: [],
      }),
      "*",
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.20),transparent_38%),linear-gradient(135deg,#020617,#061826_48%,#100926)] text-white">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        className="relative flex h-full w-full flex-col overflow-hidden"
      >
        <header className="relative z-20 flex shrink-0 items-start justify-between gap-4 px-4 pb-3 pt-[max(18px,env(safe-area-inset-top))] landscape:absolute landscape:left-0 landscape:right-0 landscape:top-0 landscape:bg-gradient-to-b landscape:from-black/72 landscape:to-transparent landscape:px-3 landscape:pb-8 landscape:pt-[max(10px,env(safe-area-inset-top))]">
          <div className="min-w-0 pr-2 landscape:hidden">
            <p className="inline-flex rounded-full border border-cyan-100/18 bg-white/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.20em] text-cyan-50/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)]">
              {eyebrowLabel}
            </p>
            <h3
              id={titleId}
              className="mt-3 text-[24px] font-black leading-tight tracking-[-0.03em] text-white"
            >
              {material.title}
            </h3>
            <p
              id={subtitleId}
              className="mt-2 max-w-2xl text-[13px] leading-snug text-white/66"
            >
              {material.subtitle}
            </p>
          </div>

          <div className="hidden min-w-0 pr-14 landscape:block">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-50/68">
              {eyebrowLabel}
            </p>
            <h3
              id={`${titleId}-landscape`}
              className="mt-1 max-w-[55vw] truncate text-[15px] font-black text-white/86"
            >
              {material.title}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="absolute right-4 top-[max(18px,env(safe-area-inset-top))] z-30 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/42 text-white/76 backdrop-blur-md transition hover:bg-white/[0.10] hover:text-white active:scale-[0.98] landscape:right-3 landscape:top-[max(10px,env(safe-area-inset-top))] landscape:h-9 landscape:w-9"
          >
            &#215;
          </button>
        </header>

        <main className="flex min-h-0 flex-1 items-center justify-center px-4 pb-4 landscape:h-full landscape:w-full landscape:flex-none landscape:p-0">
          <div className="w-full max-w-5xl overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.46)] landscape:flex landscape:h-[100dvh] landscape:max-h-[100dvh] landscape:max-w-none landscape:items-center landscape:justify-center landscape:rounded-none landscape:border-0 landscape:shadow-none">
            <div className="relative w-full landscape:h-full landscape:max-h-[100dvh] landscape:max-w-[calc(100dvh*16/9)]" style={{ aspectRatio: "16 / 9" }}>
              {playerSrc ? (
                <iframe
                  ref={iframeRef}
                  className="absolute inset-0 h-full w-full landscape:relative"
                  src={playerSrc}
                  title={material.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_45%),#020617] px-6 text-center">
                  <p className="text-[13px] font-black uppercase tracking-[0.18em] text-cyan-50/72">
                    Video link needed
                  </p>
                  <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-white/56">
                    Add the YouTube ID for this curated lesson to load the video here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        <footer className="relative z-20 shrink-0 px-4 pb-[max(16px,env(safe-area-inset-bottom))] landscape:hidden">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 rounded-[22px] border border-white/10 bg-black/22 p-4 backdrop-blur-md">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => sendYouTubeCommand("playVideo")}
                className="inline-flex items-center justify-center rounded-full border border-cyan-100/16 bg-cyan-100/[0.12] px-4 py-3 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.18] active:scale-[0.98]"
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => sendYouTubeCommand("pauseVideo")}
                className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/[0.08] px-4 py-3 text-[12px] font-black text-white/82 transition hover:bg-white/[0.12] active:scale-[0.98]"
              >
                Pause
              </button>
            </div>

            <div className="rounded-[18px] border border-white/10 bg-white/[0.045] p-3">
              <p className="text-[11.5px] leading-relaxed text-white/58">
                External YouTube lesson curated by CLARA. Video belongs to its original creator.
              </p>
              {watchUrl && (
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-cyan-100/14 bg-cyan-100/[0.10] px-4 py-2.5 text-[12px] font-black text-cyan-50 transition hover:bg-cyan-100/[0.16] active:scale-[0.98]"
                >
                  Watch on YouTube
                </a>
              )}
            </div>

            <p className="text-[12px] leading-relaxed text-white/58">
              Use CLARA controls for play and pause. Use the YouTube controls inside the frame for timeline, volume, and fullscreen.
            </p>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
