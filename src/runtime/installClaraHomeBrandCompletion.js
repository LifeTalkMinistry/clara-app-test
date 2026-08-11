const ADDED_HOME_BRAND_NODES =
  '[data-clara-home-brand-hero="true"], [data-clara-home-brand-section]';

function removeAddedHomeBrandContent() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(ADDED_HOME_BRAND_NODES).forEach((node) => node.remove());
}

export function installClaraHomeBrandCompletion() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // This runtime previously injected a Financial Home hero and extra section
  // headings. Home branding is now presentation-only, so remove any stale
  // injected nodes without adding replacement content.
  removeAddedHomeBrandContent();

  window.addEventListener("hashchange", removeAddedHomeBrandContent);
  window.addEventListener("popstate", removeAddedHomeBrandContent);
}
