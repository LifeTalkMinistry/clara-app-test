/*
 * CLARA Orb idle-life runtime.
 *
 * CSS-only SVG animation proved unreliable in the Android/WebView path. This
 * controller owns only the main Community Orb launcher and animates the SVG's
 * existing halo and center bars directly, leaving page background, geometry,
 * navigation, and tap/launch behavior untouched.
 */

const RUNTIME_KEY = "__claraOrbIdleLifeRuntime__";
const LAUNCHER_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-launcher="true"]';

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

function createOrbController(launcher) {
  const svg = launcher.querySelector(".clara-orb-vector");
  if (!svg) return null;

  const directChildren = Array.from(svg.children);
  const circles = directChildren.filter((node) => node.tagName?.toLowerCase() === "circle");
  const rects = directChildren.filter((node) => node.tagName?.toLowerCase() === "rect");

  if (circles.length < 2 || rects.length < 4) return null;

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

  const idleShell = () => launcher.querySelector(".clara-money-left-orb-idle");

  const lockIdleShell = () => {
    const shell = idleShell();
    if (!shell) return false;
    shell.style.setProperty("animation", "none", "important");
    shell.style.setProperty("transform", "none", "important");
    return true;
  };

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

  const animateGlow = (now) => {
    if (stopped) return;

    const isIdle = lockIdleShell();
    if (isIdle && now - lastGlowPaint >= 32) {
      lastGlowPaint = now;
      const wave = (Math.sin((now - glowStartedAt) / 760) + 1) / 2;

      halo.setAttribute("opacity", (0.17 + wave * 0.20).toFixed(3));
      halo.setAttribute("stroke", rimStroke);
      halo.setAttribute("stroke-width", (1.4 + wave * 3.4).toFixed(3));
      halo.setAttribute("stroke-opacity", (0.34 + wave * 0.56).toFixed(3));
    } else if (!isIdle) {
      restoreHalo();
      restoreEyes();
    }

    glowFrame = window.requestAnimationFrame(animateGlow);
  };

  const scheduleBlink = (delay) => {
    window.clearTimeout(blinkTimer);
    blinkTimer = window.setTimeout(() => {
      if (stopped || !launcher.isConnected) return;

      if (!lockIdleShell()) {
        scheduleBlink(500);
        return;
      }

      const startedAt = performance.now();
      const duration = 320;

      const tick = (now) => {
        if (stopped) return;
        if (!idleShell()) {
          restoreEyes();
          scheduleBlink(650);
          return;
        }

        const t = Math.min(1, (now - startedAt) / duration);
        const progress = Math.sin(Math.PI * t);
        applyBlink(progress);

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

    const shell = launcher.querySelector(".clara-money-left-orb-idle");
    shell?.style.removeProperty("animation");
    shell?.style.removeProperty("transform");
  };
}

function installClaraOrbIdleLife() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  let activeLauncher = null;
  let cleanupController = null;
  let syncQueued = false;

  const sync = () => {
    syncQueued = false;
    const launcher = document.querySelector(LAUNCHER_SELECTOR);
    if (launcher === activeLauncher) return;

    cleanupController?.();
    cleanupController = null;
    activeLauncher = launcher;

    if (launcher) cleanupController = createOrbController(launcher);
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      cleanupController?.();
      cleanupController = null;
      activeLauncher = null;
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbIdleLife();
