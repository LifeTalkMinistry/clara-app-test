const SUPPORT_BUBBLE_EPOCH_KEY = "clara_support_bubble_cycle_epoch_v2";

function clickExistingSupportBubble() {
  const bubble = document.querySelector("#clara-support-world [data-clara-support-bubble]");
  if (!bubble) return false;
  bubble.click();
  return true;
}

/**
 * Opens the single app-level Support CLARA experience.
 *
 * The floating prompt intentionally disappears for part of its cycle, so a
 * permanent header entry cannot depend on the prompt being visible at the
 * exact moment it is tapped. If the prompt is currently hidden, restart only
 * its presentation epoch and ask its existing phase synchronizer to render
 * the button; then click that same button so the existing modal/state/payment
 * world remains the sole owner of Support CLARA.
 */
export function openClaraSupport() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (clickExistingSupportBubble()) return;

  try {
    window.localStorage.setItem(SUPPORT_BUBBLE_EPOCH_KEY, String(Date.now()));
  } catch {
    // The Support component already tolerates unavailable storage.
  }

  window.dispatchEvent(new Event("focus"));
  document.dispatchEvent(new Event("visibilitychange"));

  const retryDelays = [16, 80, 180, 320, 520];
  retryDelays.forEach((delay) => {
    window.setTimeout(() => {
      clickExistingSupportBubble();
    }, delay);
  });
}
