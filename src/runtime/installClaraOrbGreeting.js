import "./installClaraOrbChatHandoff";
import "./installClaraBuyCheckKeyboardGuard";
import "./installClaraOrbViewportOwnershipGuard";
import { fetchCanonicalClaraProfile, resolveCanonicalFirstName } from "@/lib/canonical-clara-profile";

const RUNTIME_KEY = "__claraOrbGreetingRuntime__";
const GREETING_SELECTOR = '.clara-community-root[data-community-view="orb"] [data-clara-orb-visual-offset] > div:first-child > p';

function installClaraOrbGreeting() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window[RUNTIME_KEY]?.destroy?.();
  let queued = false;
  let activeLabel = null;
  let firstName = "";
  let loaded = false;
  let request = null;
  let destroyed = false;

  const render = () => {
    const label = document.querySelector(GREETING_SELECTOR);
    if (!label) {
      activeLabel = null;
      firstName = "";
      loaded = false;
      return null;
    }
    if (label !== activeLabel) {
      activeLabel = label;
      firstName = "";
      loaded = false;
    }
    const nextText = firstName ? `Hi ${firstName}!` : "Hi!";
    if (label.textContent !== nextText) label.textContent = nextText;
    label.dataset.claraOrbUserGreeting = "true";
    label.style.fontSize = "18px";
    label.style.fontWeight = "900";
    label.style.lineHeight = "1.1";
    label.style.letterSpacing = "-0.02em";
    label.style.textTransform = "none";
    label.style.color = "rgba(255, 255, 255, 0.96)";
    return label;
  };

  const load = () => {
    if (!activeLabel || loaded || request) return;
    const requestedLabel = activeLabel;
    request = fetchCanonicalClaraProfile()
      .then((profile) => {
        if (destroyed || activeLabel !== requestedLabel) return;
        firstName = resolveCanonicalFirstName(profile);
        loaded = true;
        render();
      })
      .catch((error) => {
        if (destroyed || activeLabel !== requestedLabel) return;
        console.warn("CLARA Orb canonical profile greeting unavailable:", error);
        loaded = true;
        render();
      })
      .finally(() => { request = null; });
  };

  const sync = () => {
    queued = false;
    if (render()) load();
  };
  const queueSync = () => {
    if (queued || destroyed) return;
    queued = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      destroyed = true;
      observer.disconnect();
      activeLabel = null;
      request = null;
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbGreeting();
