import "./clara-google-play-verify-auth-retry";

const SETTINGS_VIEW_SYNC_EVENT = "clara:settings-view-synced";

const hideThemeAppearanceSettingsRow = () => {
  if (typeof document === "undefined") return;

  const activeSettingsNav = document.querySelector(
    '.theme-page-shell button[aria-label="Settings"][aria-current="page"]'
  );
  const shell = activeSettingsNav?.closest(".theme-page-shell");
  const settingsRoot = shell?.querySelector(".clara-dashboard-content .space-y-5.pb-6");
  if (!settingsRoot) return;

  const buttons = Array.from(settingsRoot.querySelectorAll("button"));
  const themeAppearanceRow = buttons.find((button) =>
    button.textContent?.includes("Theme & appearance")
  );

  if (themeAppearanceRow) {
    themeAppearanceRow.style.display = "none";
  }
};

const scheduleThemeAppearanceSync = () => {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(hideThemeAppearanceSettingsRow);
};

if (typeof window !== "undefined") {
  window.addEventListener(SETTINGS_VIEW_SYNC_EVENT, scheduleThemeAppearanceSync);
  window.addEventListener("pageshow", scheduleThemeAppearanceSync);
  scheduleThemeAppearanceSync();
}
