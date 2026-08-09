let installed = false;

const COMMUNITY_VIDEO_SELECTOR = ".clara-community-post-card video";
const MIN_VISIBLE_RATIO = 0.58;

function createVolumeIcon(muted) {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("h-5", "w-5");

  const addPath = (d) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.appendChild(path);
  };

  addPath("M11 5 6 9H2v6h4l5 4V5Z");

  if (muted) {
    addPath("m22 9-6 6");
    addPath("m16 9 6 6");
  } else {
    addPath("M15.54 8.46a5 5 0 0 1 0 7.07");
    addPath("M19.07 4.93a10 10 0 0 1 0 14.14");
  }

  return svg;
}

export function installCommunityVideoAutoplay() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  const preparedVideos = new WeakSet();
  const muteControls = new WeakMap();
  let animationFrame = 0;
  let mutationObserver = null;

  const updateMuteControl = (video) => {
    const button = muteControls.get(video);
    if (!button) return;

    const muted = Boolean(video.muted);
    const label = muted ? "Unmute video" : "Mute video";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", muted ? "true" : "false");
    button.replaceChildren(createVolumeIcon(muted));
  };

  const ensureMuteControl = (video) => {
    if (!video?.parentElement) return;

    const existing = muteControls.get(video);
    if (existing?.isConnected) {
      updateMuteControl(video);
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "clara-community-video-mute absolute bottom-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-md transition hover:bg-black/75 active:scale-95";
    button.dataset.claraCommunityVideoMute = "true";

    const stopFrameInteraction = (event) => {
      event.stopPropagation();
    };

    button.addEventListener("pointerdown", stopFrameInteraction);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      video.muted = !video.muted;
      video.defaultMuted = video.muted;
      updateMuteControl(video);
    });

    muteControls.set(video, button);
    video.parentElement.appendChild(button);
    updateMuteControl(video);
  };

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
    if (!video) return;
    if (preparedVideos.has(video)) {
      ensureMuteControl(video);
      return;
    }
    preparedVideos.add(video);

    // Browsers only guarantee scroll-triggered autoplay when media starts muted.
    // The persistent button keeps the mute state visible and gives touch users
    // a reliable one-tap way to turn audio on or off without waiting for controls.
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.defaultMuted = true;
    video.muted = true;
    video.loop = true;

    ensureMuteControl(video);
    video.addEventListener("volumechange", () => updateMuteControl(video), { passive: true });
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
          updateMuteControl(video);
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
