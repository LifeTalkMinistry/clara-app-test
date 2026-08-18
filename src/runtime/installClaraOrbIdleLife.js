/*
 * CLARA Orb idle-life runtime.
 *
 * CSS-only SVG animation proved unreliable in the Android/WebView path. This
 * controller owns the main Community Orb launcher plus the canonical Orb when
 * it is mounted inside Juan's controlled tutorial. It animates the SVG's
 * existing halo and center bars directly, leaving page background, geometry,
 * navigation, and tap/launch behavior untouched.
 *
 * Performance rule: the idle animation must not keep consuming CPU/GPU behind
 * the full-screen Buy Check conversation. It is paused while CLARA AI is open
 * and while the app is backgrounded, then resumes when the Orb is visible.
 */

const RUNTIME_KEY = "__claraOrbIdleLifeRuntime__";
const PRODUCTION_LAUNCHER_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-launcher="true"]';
const TUTORIAL_LAUNCHER_SELECTOR =
  '[data-clara-tutorial-orb-intro="true"] [data-clara-orb-launcher="true"]';
const CHAT_ACTIVE_CLASS = "clara-ai-environment-active";

function resolveLauncher() {
  // Tutorial takes precedence if both surfaces happen to coexist in the DOM.
  // This keeps the visible Juan experience alive without animating a hidden
  // production launcher underneath it.
  return (
    document.querySelector(TUTORIAL_LAUNCHER_SELECTOR) ||
    document.querySelector(PRODUCTION_LAUNCHER_SELECTOR)
  );
}

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
  const shell = launcher.querySelector(".clara-orb-asset-shell");
  if (!svg || !shell) return null;

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
  let launchPaused = false;
  const glowStartedAt = performance.now();

  // The previous implementation queried the DOM and rewrote these styles on
  // every animation frame. They are invariant for the lifetime of this idle
  // controller, so lock them once and release them during cleanup.
  shell.style.setProperty("animation", "none", "important");
  shell.style.setProperty("transform", "none", "important");

  const isIdle = () =>
    launcher.isConnected &&
    shell.isConnected &&
    shell.classList.contains("clara-money-left-orb-idle");

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

    if (!isIdle()) {
      if (!launchPaused) {
        launchPaused = true;
        restoreHalo();
        restoreEyes();
      }
      glowFrame = window.requestAnimationFrame(animateGlow);
      return;
    }

    launchPaused = false;

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
      if (stopped || !launcher.isConnected) return;

      if (!isIdle()) {
        scheduleBlink(500);
        return;
      }

      const startedAt = performance.now();
      const duration = 320;

      const tick = (now) => {
        if (stopped) return;
        if (!isIdle()) {
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

    shell.style.removeProperty("animation");
    shell.style.removeProperty("transform");
  };
}

function installClaraOrbIdleLife() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  let activeLauncher = null;
  let cleanupController = null;
  let controllerRunning = false;
  let syncQueued = false;

  const shouldRunController = (launcher) =>
    Boolean(
      launcher &&
        document.visibilityState !== "hidden" &&
        !document.body.classList.contains(CHAT_ACTIVE_CLASS)
    );

  const sync = () => {
    syncQueued = false;
    const launcher = resolveLauncher();
    const shouldRun = shouldRunController(launcher);

    if (launcher === activeLauncher && shouldRun === controllerRunning) return;

    cleanupController?.();
    cleanupController = null;
    controllerRunning = false;
    activeLauncher = launcher;

    if (launcher && shouldRun) {
      cleanupController = createOrbController(launcher);
      controllerRunning = Boolean(cleanupController);
    }
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
  };

  // Route/mount observer. While the full-screen chat is active, its React
  // mutations are irrelevant to the hidden Orb, so ignore them entirely.
  const rootObserver = new MutationObserver(() => {
    if (document.body.classList.contains(CHAT_ACTIVE_CLASS)) return;
    queueSync();
  });
  const root = document.getElementById("root") || document.body;
  rootObserver.observe(root, {
    childList: true,
    subtree: true,
  });

  // This tiny observer is the only thing that needs to remain awake while the
  // chat is open. It pauses/resumes the Orb controller when the AI overlay class
  // changes, without watching the conversation DOM itself.
  const bodyClassObserver = new MutationObserver(queueSync);
  bodyClassObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  document.addEventListener("visibilitychange", queueSync);
  window.addEventListener("hashchange", queueSync);
  window.addEventListener("popstate", queueSync);

  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      rootObserver.disconnect();
      bodyClassObserver.disconnect();
      document.removeEventListener("visibilitychange", queueSync);
      window.removeEventListener("hashchange", queueSync);
      window.removeEventListener("popstate", queueSync);
      cleanupController?.();
      cleanupController = null;
      controllerRunning = false;
      activeLauncher = null;
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbIdleLife();
