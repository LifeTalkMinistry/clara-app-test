import "./installClaraOrbChatHandoff";
import "./installClaraBuyCheckKeyboardGuard";

/*
 * Personalized greeting for the dedicated CLARA Orb page.
 *
 * Keep this intentionally narrow: it only replaces the small "CLARA ORB"
 * eyebrow above the main launcher. The Orb, its animation, CTA, navigation,
 * background, and geometry remain owned by their existing components.
 */

const RUNTIME_KEY = "__claraOrbGreetingRuntime__";
const BACKEND_USER_KEY = "clara_backend_user_v1";
const GREETING_SELECTOR =
  '.clara-community-root[data-community-view="orb"] [data-clara-orb-visual-offset] > div:first-child > p';

function readStoredBackendUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage?.getItem(BACKEND_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function resolveFirstName() {
  const user = readStoredBackendUser();
  const displayName = String(
    user?.name || user?.full_name || user?.display_name || ""
  ).trim();

  if (!displayName || displayName.toLowerCase() === "clara user") return "";
  return displayName.split(/\s+/)[0] || "";
}

function installClaraOrbGreeting() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  let queued = false;

  const sync = () => {
    queued = false;
    const label = document.querySelector(GREETING_SELECTOR);
    if (!label) return;

    const firstName = resolveFirstName();
    const nextText = firstName ? `Hi ${firstName}!` : "Hi!";

    if (label.textContent !== nextText) label.textContent = nextText;

    label.dataset.claraOrbUserGreeting = "true";
    label.style.fontSize = "18px";
    label.style.fontWeight = "900";
    label.style.lineHeight = "1.1";
    label.style.letterSpacing = "-0.02em";
    label.style.textTransform = "none";
    label.style.color = "rgba(255, 255, 255, 0.96)";
  };

  const queueSync = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  const refreshEvents = [
    "storage",
    "clara-local-profile-updated",
    "clara-local-setup-profile-updated",
  ];
  refreshEvents.forEach((eventName) => window.addEventListener(eventName, queueSync));

  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      refreshEvents.forEach((eventName) => window.removeEventListener(eventName, queueSync));
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbGreeting();
