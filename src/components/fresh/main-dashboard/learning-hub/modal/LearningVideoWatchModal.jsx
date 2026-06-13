import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play, RotateCcw, RotateCw } from "lucide-react";

const PLAYER_HOST = "www.youtube.com";
const YOUTUBE_IFRAME_API_SRC = "https://www.youtube.com/iframe_api";

let youtubeIframeApiReadyPromise = null;

const loadYouTubeIframeApi = () => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve(null);
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeIframeApiReadyPromise) {
    return youtubeIframeApiReadyPromise;
  }

  youtubeIframeApiReadyPromise = new Promise((resolve) => {
    const existingReadyHandler = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof existingReadyHandler === "function") {
        existingReadyHandler();
      }

      resolve(window.YT || null);
    };

    const existingScript = document.querySelector(`script[src="${YOUTUBE_IFRAME_API_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        () => {
          if (window.YT?.Player) {
            resolve(window.YT);
          }
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = YOUTUBE_IFRAME_API_SRC;
    script.async = true;
    document.body.appendChild(script);
  });

  return youtubeIframeApiReadyPromise;
};

const parseYouTubeTimestamp = (timestamp) => {
  if (!timestamp) return 0;

  const normalizedTimestamp = String(timestamp).toLowerCase().trim();
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
};

const getYouTubeStartSeconds = (material) => {
  const sourceUrl =
    typeof material?.sourceUrl === "string" && material.sourceUrl.trim().length > 0
      ? material.sourceUrl.trim()
      : typeof material?.externalUrl === "string" && material.externalUrl.trim().length > 0
        ? material.externalUrl.trim()
        : typeof material?.embedUrl === "string" && material.embedUrl.trim().length > 0
          ? material.embedUrl.trim()
          : "";

  if (!sourceUrl) return 0;

  try {
    const url = new URL(sourceUrl);
    return parseYouTubeTimestamp(url.searchParams.get("t") || url.searchParams.get("start"));
  } catch {
    return 0;
  }
};

const getYouTubeIdFromUrl = (urlValue) => {
  if (typeof urlValue !== "string" || urlValue.trim().length === 0) return "";

  try {
    const url = new URL(urlValue.trim());
    const hostname = url.hostname.replace(/^www\./i, "").toLowerCase();

    if (hostname === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/").filter(Boolean)[1] || "";
      }

      return url.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }

  return "";
};

function getYouTubePlayerSrc(material) {
  const youtubeId =
    (typeof material?.youtubeId === "string" ? material.youtubeId.trim() : "") ||
    getYouTubeIdFromUrl(material?.sourceUrl) ||
    getYouTubeIdFromUrl(material?.externalUrl) ||
    getYouTubeIdFromUrl(material?.embedUrl);

  if (!youtubeId) return typeof material?.embedUrl === "string" ? material.embedUrl : "";

  const url = new URL(`https://${PLAYER_HOST}/embed/${encodeURIComponent(youtubeId)}`);
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("controls", "1");
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("fs", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("start", String(getYouTubeStartSeconds(material)));

  if (typeof window !== "undefined" && window.location?.origin) {
    url.searchParams.set("origin", window.location.origin);
  }

  return url.toString();
}

export default function LearningVideoWatchModal({ isOpen, material, onClose }) {
  const playerSrc = useMemo(() => getYouTubePlayerSrc(material), [material]);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const iframe = iframeRef.current;

    if (!isOpen || !material || !playerSrc || !iframe || typeof window === "undefined") {
      return undefined;
    }

    const destroyCurrentPlayer = () => {
      if (playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
      }

      playerRef.current = null;
    };

    const initializePlayer = (yt) => {
      if (cancelled || !yt?.Player || !iframeRef.current) return;

      destroyCurrentPlayer();

      playerRef.current = new yt.Player(iframeRef.current, {
        events: {
          onReady: () => {
            if (cancelled) return;
            setPlayerReady(true);
          },
          onStateChange: (event) => {
            if (cancelled) return;
            setIsPlaying(event.data === window.YT?.PlayerState?.PLAYING);
          },
        },
      });
    };

    loadYouTubeIframeApi().then(initializePlayer);

    return () => {
      cancelled = true;
      setPlayerReady(false);
      setIsPlaying(false);
      destroyCurrentPlayer();
    };
  }, [isOpen, material, playerSrc]);

  const togglePlayPause = useCallback(() => {
    const player = playerRef.current;
    const yt = typeof window !== "undefined" ? window.YT : null;

    if (!playerReady || !player || !yt?.PlayerState) return;

    const state = player.getPlayerState?.();

    if (state === yt.PlayerState.PLAYING) {
      player.pauseVideo?.();
    } else {
      player.playVideo?.();
    }
  }, [playerReady]);

  const seekBy = useCallback(
    (seconds) => {
      const player = playerRef.current;

      if (
        !playerReady ||
        !player ||
        typeof player.getCurrentTime !== "function" ||
        typeof player.seekTo !== "function"
      ) {
        return;
      }

      const currentTime = Number(player.getCurrentTime()) || 0;
      const nextTime = Math.max(0, currentTime + seconds);

      player.seekTo(nextTime, true);
    },
    [playerReady],
  );

  if (!isOpen || !material || typeof document === "undefined") return null;

  const titleId = "clara-learning-video-watch-title";
  const subtitleId = "clara-learning-video-watch-subtitle";
  const eyebrowLabel = material.contentTypeLabel || material.coverLabel || "Curated Video Lesson";
  const credit = material.credit || {};
  const creditCreatorName = credit.creatorName || "the original creator";
  const creditSourceName = credit.sourceName || "YouTube";
  const creditUsageLabel = credit.usageLabel || "Curated external lesson";
  const creditRightsNote = credit.rightsNote || "All rights belong to the original creator.";
  const creditUrl =
    credit.creatorUrl ||
    credit.sourceUrl ||
    material.sourceUrl ||
    material.externalUrl ||
    "";
  const sourceUrl =
    credit.sourceUrl ||
    material.sourceUrl ||
    material.externalUrl ||
    "";

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen overflow-hidden bg-[radial-gradient(circle_at_0%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_100%_100%,rgba(129,140,248,0.20),transparent_38%),linear-gradient(135deg,#020617,#061826_48%,#100926)] text-white">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitleId}
        className="relative flex h-full w-full flex-col overflow-hidden"
      >
        <header className="absolute left-0 right-0 top-0 z-20 flex shrink-0 items-start justify-between gap-4 px-4 pb-8 pt-[max(18px,env(safe-area-inset-top))] landscape:bg-gradient-to-b landscape:from-black/72 landscape:to-transparent landscape:px-3 landscape:pt-[max(10px,env(safe-area-inset-top))]">
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
            <p className="mt-1 max-w-[52vw] truncate text-[10px] font-semibold text-white/48">
              Source credit: Original video by{" "}
              {creditUrl ? (
                <a
                  href={creditUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-100/76 underline-offset-4 hover:text-cyan-50 hover:underline"
                >
                  {creditCreatorName}
                </a>
              ) : (
                <span>{creditCreatorName}</span>
              )}{" "}
              · Curated by CLARA
            </p>
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

        <main className="flex h-full w-full flex-none items-center justify-center px-4 py-[max(16px,env(safe-area-inset-bottom))] landscape:p-0">
          <div className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-white/10 bg-black shadow-[0_28px_90px_rgba(0,0,0,0.46)] landscape:flex landscape:h-[100dvh] landscape:max-h-[100dvh] landscape:max-w-none landscape:items-center landscape:justify-center landscape:rounded-none landscape:border-0 landscape:shadow-none">
            <div className="relative w-full landscape:h-full landscape:max-h-[100dvh] landscape:max-w-[calc(100dvh*16/9)]" style={{ aspectRatio: "16 / 9" }}>
              {playerSrc ? (
                <iframe
                  ref={iframeRef}
                  key={playerSrc}
                  className="absolute inset-0 h-full w-full landscape:relative"
                  src={playerSrc}
                  title={material.title}
                  loading="eager"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black px-6 text-center">
                  <p className="max-w-sm text-[13px] font-semibold leading-relaxed text-white/62">
                    This lesson does not have a playable YouTube source yet.
                  </p>
                </div>
              )}
            </div>

            {playerSrc ? (
              <div className="flex shrink-0 items-center justify-center gap-3 border-t border-white/10 bg-black/42 px-4 py-3 backdrop-blur-md landscape:absolute landscape:bottom-[max(12px,env(safe-area-inset-bottom))] landscape:left-1/2 landscape:z-30 landscape:-translate-x-1/2 landscape:rounded-full landscape:border landscape:px-3 landscape:py-2">
                <button
                  type="button"
                  onClick={() => seekBy(-10)}
                  disabled={!playerReady}
                  aria-label="Skip back 10 seconds"
                  className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 text-[11px] font-black text-white/78 transition hover:bg-white/[0.13] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                  10s
                </button>

                <button
                  type="button"
                  onClick={togglePlayPause}
                  disabled={!playerReady}
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-100/18 bg-cyan-100/[0.14] text-white shadow-[0_12px_34px_rgba(34,211,238,0.14),inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-cyan-100/[0.20] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 landscape:h-10 landscape:w-10"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
                </button>

                <button
                  type="button"
                  onClick={() => seekBy(10)}
                  disabled={!playerReady}
                  aria-label="Skip forward 10 seconds"
                  className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 text-[11px] font-black text-white/78 transition hover:bg-white/[0.13] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  10s
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>
        </main>

        <aside className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-4 z-20 max-w-[min(320px,calc(100vw-32px))] rounded-[18px] border border-white/10 bg-black/28 px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-md landscape:hidden">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/70">
            <span>Source Credit</span>
            <span className="text-white/22">•</span>
            <span className="text-white/42">{creditUsageLabel}</span>
          </div>

          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-white/56">
            Original video by{" "}
            {creditUrl ? (
              <a
                href={creditUrl}
                target="_blank"
                rel="noreferrer"
                className="text-cyan-100/84 underline-offset-4 transition hover:text-cyan-50 hover:underline"
              >
                {creditCreatorName}
              </a>
            ) : (
              <span className="text-white/76">{creditCreatorName}</span>
            )}{" "}
            on {creditSourceName}. CLARA curated it for this learning path; the video, teaching, channel, and thumbnail belong to the creator.
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] font-bold leading-snug text-white/44">
            <span>{creditRightsNote}</span>
            {sourceUrl ? (
              <>
                <span className="text-white/24">•</span>
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/62 underline-offset-4 transition hover:text-white/86 hover:underline"
                >
                  Watch original on YouTube
                </a>
              </>
            ) : null}
          </div>
        </aside>
      </div>
    </div>,
    document.body,
  );
}
