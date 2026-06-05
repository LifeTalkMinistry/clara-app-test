import "./clara-buy-check-not-buy-completion-flow";

const hideThemeAppearanceSettingsRow = () => {
  if (typeof document === "undefined") return;

  const buttons = Array.from(document.querySelectorAll("button"));
  const themeAppearanceRow = buttons.find((button) =>
    button.textContent?.includes("Theme & appearance")
  );

  if (themeAppearanceRow) {
    themeAppearanceRow.style.display = "none";
  }
};

if (typeof window !== "undefined") {
  hideThemeAppearanceSettingsRow();

  const observer = new MutationObserver(hideThemeAppearanceSettingsRow);

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
