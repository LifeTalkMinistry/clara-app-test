import { triggerClaraTouchFeedback } from "@/lib/claraTouchFeedback";

let installed = false;
let originalPlay = null;

function feedbackTypeForSource(source = "") {
  const value = String(source).toLowerCase();

  if (
    value.includes("real-swipe-sound-effect") ||
    value.includes("daily-money-tip")
  ) {
    return "selection";
  }

  if (
    value.includes("learning-hub") ||
    value.includes("back-sound")
  ) {
    return "light";
  }

  return null;
}

export function installSoundTouchFeedbackBridge() {
  if (
    installed ||
    typeof window === "undefined" ||
    typeof window.HTMLMediaElement === "undefined"
  ) {
    return () => {};
  }

  const prototype = window.HTMLMediaElement.prototype;
  if (typeof prototype.play !== "function") return () => {};

  installed = true;
  originalPlay = prototype.play;

  prototype.play = function claraPlayWithFeedback(...args) {
    const feedbackType = feedbackTypeForSource(this.currentSrc || this.src);
    if (feedbackType) triggerClaraTouchFeedback(feedbackType);
    return originalPlay.apply(this, args);
  };

  return () => {
    if (originalPlay) prototype.play = originalPlay;
    originalPlay = null;
    installed = false;
  };
}

try {
  installSoundTouchFeedbackBridge();
} catch (error) {
  console.warn("Sound feedback bridge failed to initialize:", error);
}
