/*
 * CLARA Orb support-portal compatibility.
 *
 * Pointer ownership belongs to installClaraOrbImmersiveNav at the Orb-page
 * root. This compatibility runtime deliberately contains no click interception,
 * coordinate math, propagation blocking, or secondary Orb hit-test authority.
 *
 * Keep only the Support portal visibility behavior that was historically
 * bundled into the old precise-hit-target runtime.
 */

const RUNTIME_KEY = "__claraOrbPreciseHitTargetRuntime__";
const SUPPORT_WORLD_ID = "clara-support-world";
const SUPPORT_FORCED_ATTRIBUTE = "data-clara-orb-support-visible";

function restoreSupportWorld(world) {
  if (!world?.hasAttribute(SUPPORT_FORCED_ATTRIBUTE)) return;
  world.style.removeProperty("display");
  world.removeAttribute(SUPPORT_FORCED_ATTRIBUTE);
}

function syncOrbSupportVisibility() {
  const world = document.getElementById(SUPPORT_WORLD_ID);
  if (!world) return;

  const orbActive = document.body?.classList.contains("clara-orb-page-active");
  if (orbActive) {
    world.style.setProperty("display", "block", "important");
    world.setAttribute(SUPPORT_FORCED_ATTRIBUTE, "true");
    return;
  }

  restoreSupportWorld(world);
}

function installClaraOrbPreciseHitTarget() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  const observer = new MutationObserver(syncOrbSupportVisibility);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });

  syncOrbSupportVisibility();

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      restoreSupportWorld(document.getElementById(SUPPORT_WORLD_ID));
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbPreciseHitTarget();
