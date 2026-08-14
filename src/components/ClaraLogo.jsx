import { useEffect, useRef } from "react";
import { ClaraOrbMark } from "@/components/community/ClaraOrbPage";

function numberAttr(node, name, fallback = 0) {
  const value = Number.parseFloat(node?.getAttribute?.(name) ?? "");
  return Number.isFinite(value) ? value : fallback;
}

function captureRect(node) {
  const y = numberAttr(node, "y");
  const height = numberAttr(node, "height");
  return {
    node,
    y,
    height,
    centerY: y + height / 2,
    rx: node.getAttribute("rx"),
  };
}

function restoreAttribute(node, name, value) {
  if (!node) return;
  if (value === null || typeof value === "undefined") node.removeAttribute(name);
  else node.setAttribute(name, value);
}

function useOnboardingOrbLife(rootRef) {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return undefined;

    const root = rootRef.current;
    if (!root?.closest?.(".clara-mission-onboarding")) return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return undefined;

    const svg = root.querySelector(".clara-orb-vector");
    if (!svg) return undefined;

    const directChildren = Array.from(svg.children);
    const circles = directChildren.filter((node) => node.tagName?.toLowerCase() === "circle");
    const rects = directChildren.filter((node) => node.tagName?.toLowerCase() === "rect");
    if (circles.length < 2 || rects.length < 4) return undefined;

    const halo = circles[0];
    const rim = circles[1];
    const eyeRects = rects.slice(0, 4).map(captureRect);
    const rimStroke = rim.getAttribute("stroke") || "#168bff";
    const haloOriginal = {
      opacity: halo.getAttribute("opacity"),
      stroke: halo.getAttribute("stroke"),
      strokeWidth: halo.getAttribute("stroke-width"),
      strokeOpacity: halo.getAttribute("stroke-opacity"),
    };

    let stopped = false;
    let glowFrame = 0;
    let blinkFrame = 0;
    let blinkTimer = 0;
    let lastGlowPaint = 0;
    const glowStartedAt = performance.now();

    const restoreEyes = () => {
      eyeRects.forEach(({ node, y, height, rx }) => {
        node.setAttribute("y", String(y));
        node.setAttribute("height", String(height));
        restoreAttribute(node, "rx", rx);
      });
    };

    const restoreHalo = () => {
      restoreAttribute(halo, "opacity", haloOriginal.opacity);
      restoreAttribute(halo, "stroke", haloOriginal.stroke);
      restoreAttribute(halo, "stroke-width", haloOriginal.strokeWidth);
      restoreAttribute(halo, "stroke-opacity", haloOriginal.strokeOpacity);
    };

    const isVisible = () =>
      root.isConnected &&
      document.visibilityState !== "hidden" &&
      Boolean(root.closest(".clara-mission-onboarding"));

    const applyBlink = (progress) => {
      const clamped = Math.max(0, Math.min(1, progress));
      const heightScale = 1 - clamped * 0.92;

      eyeRects.forEach(({ node, centerY, height, rx }) => {
        const nextHeight = Math.max(2.8, height * heightScale);
        const nextY = centerY - nextHeight / 2;
        node.setAttribute("y", nextY.toFixed(3));
        node.setAttribute("height", nextHeight.toFixed(3));

        if (rx !== null) {
          const originalRx = Number.parseFloat(rx);
          if (Number.isFinite(originalRx)) {
            node.setAttribute("rx", Math.max(1.1, originalRx * heightScale).toFixed(3));
          }
        }
      });
    };

    const animateGlow = (now) => {
      if (stopped) return;

      if (!isVisible()) {
        restoreHalo();
        glowFrame = window.requestAnimationFrame(animateGlow);
        return;
      }

      if (now - lastGlowPaint >= 32) {
        lastGlowPaint = now;
        const wave = (Math.sin((now - glowStartedAt) / 760) + 1) / 2;
        halo.setAttribute("opacity", (0.28 + wave * 0.38).toFixed(3));
        halo.setAttribute("stroke", rimStroke);
        halo.setAttribute("stroke-width", (2.4 + wave * 6.6).toFixed(3));
        halo.setAttribute("stroke-opacity", (0.48 + wave * 0.52).toFixed(3));
      }

      glowFrame = window.requestAnimationFrame(animateGlow);
    };

    const scheduleBlink = (delay) => {
      window.clearTimeout(blinkTimer);
      blinkTimer = window.setTimeout(() => {
        if (stopped || !root.isConnected) return;

        if (!isVisible()) {
          scheduleBlink(500);
          return;
        }

        const startedAt = performance.now();
        const duration = 320;

        const tick = (now) => {
          if (stopped) return;
          if (!isVisible()) {
            restoreEyes();
            scheduleBlink(650);
            return;
          }

          const t = Math.min(1, (now - startedAt) / duration);
          applyBlink(Math.sin(Math.PI * t));

          if (t < 1) {
            blinkFrame = window.requestAnimationFrame(tick);
            return;
          }

          restoreEyes();
          scheduleBlink(2600 + Math.random() * 1900);
        };

        blinkFrame = window.requestAnimationFrame(tick);
      }, delay);
    };

    glowFrame = window.requestAnimationFrame(animateGlow);
    scheduleBlink(700);

    return () => {
      stopped = true;
      window.cancelAnimationFrame(glowFrame);
      window.cancelAnimationFrame(blinkFrame);
      window.clearTimeout(blinkTimer);
      restoreHalo();
      restoreEyes();
    };
  }, [rootRef]);
}

export default function ClaraLogo({
  variant = "full",
  theme = "dark",
  className = "",
}) {
  const rootRef = useRef(null);
  const isDark = theme === "dark";
  const textColor = isDark ? "text-white" : "text-[#182028]";

  useOnboardingOrbLife(rootRef);

  return (
    <div
      ref={rootRef}
      className={`flex items-center gap-3 ${className}`}
      style={{
        animation: "claraLogoFadeIn 1200ms ease-out both",
      }}
    >
      <ClaraOrbMark
        className="h-20 w-20 shrink-0"
        title="CLARA official orb"
      />

      {variant === "full" && (
        <p
          className={`font-heading text-xl font-bold leading-tight tracking-[0.12em] transition duration-500 ${textColor}`}
          aria-label="CLARA"
        >
          <span className="text-[#4d8cff]">CL</span>
          <span className="text-[#ffd42f]">A</span>
          <span className="text-[#ff4d55]">RA</span>
        </p>
      )}

      <style>{`
        @keyframes claraLogoFadeIn {
          0% {
            opacity: 0;
            transform: translateY(8px) scale(0.94);
            filter: blur(6px);
          }
          60% {
            opacity: 1;
            transform: translateY(-2px) scale(1.02);
            filter: blur(0);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
