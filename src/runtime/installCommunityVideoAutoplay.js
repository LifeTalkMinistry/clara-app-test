let installed = false;

const COMMUNITY_VIDEO_SELECTOR = ".clara-community-post-card video";
const MIN_VISIBLE_RATIO = 0.58;

export function installCommunityVideoAutoplay() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  const preparedVideos = new WeakSet();
  let animationFrame = 0;
  let mutationObserver = null;

  const scheduleEvaluation = () => {
    if (animationFrame) return;
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0;
      evaluateVideos();
    });
  };

  const pauseVideo = (video) => {
    if (!video || video.paused) return;
    try {
      video.pause();
    } catch {
      // Ignore detached or browser-managed media errors.
    }
  };

  const prepareVideo = (video) => {
    if (!video || preparedVideos.has(video)) return;
    preparedVideos.add(video);

    // Browsers only guarantee scroll-triggered autoplay when media starts muted.
    // Users can still unmute with the native controls; we do not force-mute it again.
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.defaultMuted = true;
    video.muted = true;
    video.loop = true;

    video.addEventListener("loadedmetadata", scheduleEvaluation, { passive: true });
    video.addEventListener("canplay", scheduleEvaluation, { passive: true });
    video.addEventListener("emptied", scheduleEvaluation, { passive: true });
  };

  const playVideo = (video) => {
    if (!video || !video.paused || video.ended) return;

    try {
      const attempt = video.play();
      if (attempt?.catch) {
        attempt.catch(() => {
          // If a browser blocks sound-on autoplay after the user unmuted this video,
          // fall back to muted autoplay instead of leaving the feed frozen.
          if (!video.isConnected || !video.paused) return;
          video.muted = true;
          video.defaultMuted = true;
          video.play().catch(() => {});
        });
      }
    } catch {
      // Media may still be waiting for metadata/source bytes. canplay will retry.
    }
  };

  const getVisibility = (video, viewportHeight) => {
    const rect = video.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return null;

    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(viewportHeight, rect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibleRatio = Math.min(1, visibleHeight / Math.min(rect.height, viewportHeight));

    if (visibleRatio < MIN_VISIBLE_RATIO) return null;

    const viewportCenter = viewportHeight * 0.5;
    const videoCenter = rect.top + rect.height * 0.5;
    const centerDistance = Math.abs(videoCenter - viewportCenter);

    // Prefer the video closest to the user's visual center, while giving a useful
    // bonus to media that is more fully visible. This guarantees one winner only.
    const score = centerDistance + (1 - visibleRatio) * viewportHeight * 0.45;

    return { score };
  };

  function evaluateVideos() {
    const videos = Array.from(document.querySelectorAll(COMMUNITY_VIDEO_SELECTOR));
    if (!videos.length) return;

    videos.forEach(prepareVideo);

    // The inline feed must never keep playing behind the immersive Reels viewer
    // or while the page/tab is hidden.
    if (document.hidden || document.querySelector(".clara-community-reels-viewer")) {
      videos.forEach(pauseVideo);
      return;
    }

    const viewportHeight = Math.max(1, window.innerHeight || document.documentElement.clientHeight || 1);
    let winner = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const video of videos) {
      if (!video.isConnected || video.closest('[aria-hidden="true"]')) continue;
      const visibility = getVisibility(video, viewportHeight);
      if (!visibility) continue;

      if (visibility.score < bestScore) {
        bestScore = visibility.score;
        winner = video;
      }
    }

    for (const video of videos) {
      if (video === winner) playVideo(video);
      else pauseVideo(video);
    }
  }

  window.addEventListener("scroll", scheduleEvaluation, { passive: true, capture: true });
  window.addEventListener("resize", scheduleEvaluation, { passive: true });
  window.addEventListener("orientationchange", scheduleEvaluation, { passive: true });
  window.addEventListener("pageshow", scheduleEvaluation, { passive: true });
  document.addEventListener("visibilitychange", scheduleEvaluation, { passive: true });

  const startObserver = () => {
    if (!document.body || mutationObserver) return;
    mutationObserver = new MutationObserver(scheduleEvaluation);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    scheduleEvaluation();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }
}
