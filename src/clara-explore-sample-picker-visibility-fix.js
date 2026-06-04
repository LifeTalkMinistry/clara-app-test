const STYLE_ID = "clara-explore-sample-picker-visibility-fix";
const PICKER_ID = "clara-explore-sample-picker";

function installSamplePickerVisibilityFix() {
  if (typeof document === "undefined") return;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${PICKER_ID}:not([data-open="true"]),
      #${PICKER_ID}[data-open="false"] {
        display: none !important;
        visibility: hidden !important;
      }

      #${PICKER_ID}[data-open="true"] {
        display: grid !important;
        visibility: visible !important;
      }
    `;
    document.head.appendChild(style);
  }

  const picker = document.getElementById(PICKER_ID);
  if (picker && picker.dataset.open !== "true") {
    picker.dataset.open = "false";
    picker.style.display = "none";
    picker.style.visibility = "hidden";
  }
}

if (typeof window !== "undefined") {
  installSamplePickerVisibilityFix();

  const observer = new MutationObserver(installSamplePickerVisibilityFix);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
