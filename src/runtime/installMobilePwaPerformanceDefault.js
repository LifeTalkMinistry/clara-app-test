import { ensureActiveLocalVaultId } from "@/lib/localVaultIdentity";
import {
  applyVisualPerformanceMode,
  getVisualPerformanceStorageKey,
  readStoredPerformanceMode,
  saveVisualPerformanceMode,
} from "@/components/fresh/main-dashboard/performance-mode/visualPerformanceMode";

let installed = false;

function isInstalledMobileApp() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;

  const isMobile =
    /android|iphone|ipad|ipod/i.test(navigator.userAgent || "") ||
    window.matchMedia?.("(max-width: 768px)")?.matches === true;
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator?.standalone === true ||
    window.Capacitor?.isNativePlatform?.() === true;

  return isMobile && isStandalone;
}

function hasStoredPreference(userId) {
  try {
    return window.localStorage?.getItem(getVisualPerformanceStorageKey(userId)) !== null;
  } catch {
    return false;
  }
}

function applyPreferredMode() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const userId = ensureActiveLocalVaultId() || "guest";
  if (hasStoredPreference(userId)) {
    applyVisualPerformanceMode(readStoredPerformanceMode(userId));
    return;
  }

  // Installed phone builds should prioritize responsive scrolling and tapping.
  // The user can still switch Premium Mode back on from Settings.
  if (isInstalledMobileApp()) {
    saveVisualPerformanceMode(userId, true);
    return;
  }

  applyVisualPerformanceMode(false);
}

export function installMobilePwaPerformanceDefault() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  queueMicrotask(applyPreferredMode);
  window.addEventListener("pageshow", applyPreferredMode, { passive: true });
  window.addEventListener("clara:active-local-vault-updated", applyPreferredMode, { passive: true });
  window.addEventListener("clara:account-vault-switched", applyPreferredMode, { passive: true });
}

installMobilePwaPerformanceDefault();
