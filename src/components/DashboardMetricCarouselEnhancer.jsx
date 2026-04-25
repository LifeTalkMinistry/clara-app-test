import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getX = (event) => {
  if (event?.touches?.[0]) return event.touches[0].clientX;
  if (event?.changedTouches?.[0]) return event.changedTouches[0].clientX;
  return event.clientX;
};

const getThemeGlow = () => {
  const root = getComputedStyle(document.documentElement);
  const candidates = [
    root.getPropertyValue("--theme-accent"),
    root.getPropertyValue("--accent"),
    root.getPropertyValue("--primary"),
    root.getPropertyValue("--ring"),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const raw = candidates.join(" ").toLowerCase();

  if (raw.includes("rose") || raw.includes("pink") || raw.includes("red")) {
    return "rgba(244,63,94,0.36)";
  }
  if (raw.includes("blue") || raw.includes("sky") || raw.includes("cyan")) {
    return "rgba(56,189,248,0.36)";
  }
  if (raw.includes("violet") || raw.includes("purple") || raw.includes("indigo")) {
    return "rgba(167,139,250,0.36)";
  }
  if (raw.includes("amber") || raw.includes("yellow") || raw.includes("gold")) {
    return "rgba(251,191,36,0.36)";
  }

  return "rgba(16,185,129,0.36)";
};

const findMetricsCard = () => {
  const nodes = Array.from(document.querySelectorAll("div, section, button"));
  const matches = nodes
    .filter((node) => {
      if (node.dataset.claraMetricCarousel === "ready") return false;
      const text = String(node.textContent || "").toUpperCase();
      if (!text.includes("MONEY LEFT") || !text.includes("TOTAL EXPENSE")) return false;
      const rect = node.getBoundingClientRect();
      return rect.width >= 260 && rect.height >= 110 && rect.height <= 260;
    })
    .sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      return aRect.height * aRect.width - bRect.height * bRect.width;
    });

  return matches[0] || null;
};

const buildPreviewSlide = ({ type }) => {
  const slide = document.createElement("div");
  slide.className = "clara-metric-carousel-slide clara-metric-preview-slide";

  const icon = type === "analytics" ? "▥" : "☷";
  const label = type === "analytics" ? "Analytics" : "Transactions";
  const title = type === "analytics" ? "See the pattern" : "Review movement";
  const body =
    type === "analytics"
      ? "Open insights, spending rhythm, and monthly performance."
      : "Open the transactions behind your money left and total expense.";
  const cta = type === "analytics" ? "Open analytics" : "View transactions";

  slide.innerHTML = `
    <div class="clara-metric-preview-head">
      <span>${label}</span>
      <span class="clara-metric-preview-icon">${icon}</span>
    </div>
    <div class="clara-metric-preview-body">
      <strong>${title}</strong>
      <p>${body}</p>
    </div>
    <div class="clara-metric-preview-cta">
      <span>${cta}</span>
      <span>›</span>
    </div>
  `;

  return slide;
};

const enhanceMetricsCard = (card, navigate) => {
  if (!card || card.dataset.claraMetricCarousel === "ready") return null;

  const originalChildren = Array.from(card.childNodes).map((node) => node.cloneNode(true));
  const originalClassName = card.className || "";
  const glow = getThemeGlow();

  card.dataset.claraMetricCarousel = "ready";
  card.className = `${originalClassName} clara-metric-carousel-host`;
  card.style.setProperty("--clara-metric-glow", glow);

  const shell = document.createElement("div");
  shell.className = "clara-metric-carousel-shell";

  const track = document.createElement("div");
  track.className = "clara-metric-carousel-track";

  const summarySlide = document.createElement("div");
  summarySlide.className = "clara-metric-carousel-slide clara-metric-summary-slide";
  originalChildren.forEach((node) => summarySlide.appendChild(node));

  const transactionSlide = buildPreviewSlide({ type: "transactions" });
  const analyticsSlide = buildPreviewSlide({ type: "analytics" });

  track.appendChild(summarySlide);
  track.appendChild(transactionSlide);
  track.appendChild(analyticsSlide);

  const dots = document.createElement("div");
  dots.className = "clara-metric-carousel-dots";
  dots.innerHTML = `<span></span><span></span><span></span>`;

  shell.appendChild(track);
  shell.appendChild(dots);

  card.replaceChildren(shell);

  let active = 0;
  let startX = 0;
  let lastX = 0;
  let dragX = 0;
  let startTime = 0;
  let velocity = 0;
  let dragging = false;
  let moved = false;
  let longPressTimer = null;

  const render = (animated = true) => {
    const translate = `translate3d(calc(${-active * 100}% + ${dragX}px),0,0)`;
    track.style.transition = animated
      ? "transform 560ms cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    track.style.transform = translate;

    Array.from(track.children).forEach((slide, index) => {
      const distance = Math.abs(index - active);
      slide.style.opacity = distance === 0 ? "1" : "0.74";
      slide.style.transform = `scale(${distance === 0 ? 1 : 0.94})`;
    });

    Array.from(dots.children).forEach((dot, index) => {
      dot.className = index === active ? "active" : "";
    });

    card.style.setProperty("--clara-metric-glow-strength", String(0.58 + active * 0.1));
  };

  const clearLongPress = () => {
    if (longPressTimer) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const openActive = () => {
    if (active === 2) navigate("/analytics");
    else navigate("/expenses");
  };

  const onStart = (event) => {
    startX = getX(event);
    lastX = startX;
    dragX = 0;
    velocity = 0;
    startTime = performance.now();
    dragging = true;
    moved = false;
    longPressTimer = window.setTimeout(() => navigate("/analytics"), 560);
    render(false);
  };

  const onMove = (event) => {
    if (!dragging) return;
    const x = getX(event);
    const now = performance.now();
    const delta = x - startX;
    const frameDelta = x - lastX;
    const elapsed = Math.max(now - startTime, 16);
    const atStart = active === 0 && delta > 0;
    const atEnd = active === 2 && delta < 0;
    const resistance = atStart || atEnd ? 0.32 : 1;

    dragX = delta * resistance;
    velocity = frameDelta / elapsed;
    lastX = x;

    if (Math.abs(delta) > 6) {
      moved = true;
      clearLongPress();
    }

    render(false);
  };

  const onEnd = () => {
    if (!dragging) return;
    dragging = false;
    clearLongPress();

    const width = Math.max(card.getBoundingClientRect().width, 260);
    const shouldNext = dragX < -width * 0.18 || velocity < -0.18;
    const shouldPrev = dragX > width * 0.18 || velocity > 0.18;

    if (shouldNext) active += 1;
    if (shouldPrev) active -= 1;
    active = clamp(active, 0, 2);
    dragX = 0;
    render(true);

    window.setTimeout(() => {
      moved = false;
    }, 90);
  };

  const onClick = (event) => {
    if (moved) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    openActive();
  };

  card.addEventListener("mousedown", onStart);
  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseup", onEnd);
  card.addEventListener("mouseleave", onEnd);
  card.addEventListener("touchstart", onStart, { passive: true });
  card.addEventListener("touchmove", onMove, { passive: true });
  card.addEventListener("touchend", onEnd);
  card.addEventListener("touchcancel", onEnd);
  card.addEventListener("click", onClick, true);

  render(true);

  return () => {
    clearLongPress();
    card.removeEventListener("mousedown", onStart);
    card.removeEventListener("mousemove", onMove);
    card.removeEventListener("mouseup", onEnd);
    card.removeEventListener("mouseleave", onEnd);
    card.removeEventListener("touchstart", onStart);
    card.removeEventListener("touchmove", onMove);
    card.removeEventListener("touchend", onEnd);
    card.removeEventListener("touchcancel", onEnd);
    card.removeEventListener("click", onClick, true);
  };
};

const injectStyles = () => {
  if (document.getElementById("clara-metric-carousel-styles")) return;

  const style = document.createElement("style");
  style.id = "clara-metric-carousel-styles";
  style.textContent = `
    .clara-metric-carousel-host {
      position: relative !important;
      overflow: hidden !important;
      touch-action: pan-y !important;
      cursor: pointer !important;
      isolation: isolate !important;
      user-select: none !important;
    }

    .clara-metric-carousel-host::before {
      content: "";
      pointer-events: none;
      position: absolute;
      inset: -30%;
      z-index: 0;
      background: radial-gradient(circle at 50% 0%, var(--clara-metric-glow, rgba(16,185,129,0.36)) 0%, transparent 58%);
      opacity: var(--clara-metric-glow-strength, 0.58);
      transition: opacity 320ms ease;
    }

    .clara-metric-carousel-shell {
      position: relative;
      z-index: 1;
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    .clara-metric-carousel-track {
      display: flex;
      height: 100%;
      width: 100%;
      will-change: transform;
      transform: translate3d(0,0,0);
    }

    .clara-metric-carousel-slide {
      min-width: 100%;
      width: 100%;
      height: 100%;
      will-change: transform, opacity;
      transition: transform 420ms ease, opacity 420ms ease;
    }

    .clara-metric-summary-slide > * {
      height: 100%;
    }

    .clara-metric-preview-slide {
      display: flex;
      min-height: 150px;
      flex-direction: column;
      justify-content: space-between;
      padding: 16px;
      color: white;
    }

    .clara-metric-preview-head,
    .clara-metric-preview-cta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .clara-metric-preview-head span:first-child {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.72);
    }

    .clara-metric-preview-icon {
      display: grid;
      height: 40px;
      width: 40px;
      place-items: center;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.08);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
    }

    .clara-metric-preview-body strong {
      display: block;
      font-size: 22px;
      line-height: 1.1;
    }

    .clara-metric-preview-body p {
      margin-top: 8px;
      font-size: 13px;
      line-height: 1.55;
      color: rgba(255,255,255,0.64);
    }

    .clara-metric-preview-cta {
      margin-top: 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.045);
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 800;
      color: rgba(255,255,255,0.78);
    }

    .clara-metric-carousel-dots {
      pointer-events: none;
      position: absolute;
      left: 50%;
      bottom: 9px;
      z-index: 4;
      display: flex;
      transform: translateX(-50%);
      align-items: center;
      gap: 6px;
    }

    .clara-metric-carousel-dots span {
      height: 6px;
      width: 6px;
      border-radius: 999px;
      background: rgba(255,255,255,0.24);
      transition: width 260ms ease, background 260ms ease;
    }

    .clara-metric-carousel-dots span.active {
      width: 20px;
      background: rgba(255,255,255,0.82);
    }
  `;

  document.head.appendChild(style);
};

export default function DashboardMetricCarouselEnhancer() {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    injectStyles();

    let cleanup = null;
    let tries = 0;

    const attemptEnhance = () => {
      if (!window.location.hash.includes("/dashboard") && !window.location.pathname.includes("dashboard")) {
        return;
      }

      const card = findMetricsCard();
      if (card) {
        cleanup = enhanceMetricsCard(card, navigate);
      }
    };

    const interval = window.setInterval(() => {
      if (cleanup) return;
      tries += 1;
      attemptEnhance();
      if (tries > 40 && cleanup) window.clearInterval(interval);
    }, 250);

    attemptEnhance();

    return () => {
      window.clearInterval(interval);
      if (typeof cleanup === "function") cleanup();
    };
  }, [navigate]);

  return null;
}
