const INSTALL_KEY = "__claraGuideMoneyLeftOrbReactOwnerInstalled";

/**
 * Compatibility installer retained for the existing main.jsx import.
 *
 * The Money Left orb lesson is now owned by DashboardHomePanel React state and
 * DashboardMoneySummaryStable is the only physical gesture recognizer. This
 * runtime intentionally installs no DOM previews and no pointer or keyboard
 * listeners.
 */
export function installClaraGuideMoneyLeftOrb() {
  if (typeof window === "undefined") return () => {};
  if (window[INSTALL_KEY]) return window[INSTALL_KEY];

  const cleanup = () => {
    if (window[INSTALL_KEY] === cleanup) delete window[INSTALL_KEY];
  };

  window[INSTALL_KEY] = cleanup;
  return cleanup;
}
