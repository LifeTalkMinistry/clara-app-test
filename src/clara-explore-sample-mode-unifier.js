const STYLE_ID = "clara-explore-sample-mode-unifier-styles";
const PICKER_ID = "clara-explore-sample-picker";
const STATUS_ID = "clara-explore-sample-status";

function getSamplePage() {
  return document.getElementById("clara-settings-explore-clara-page");
}

function getPicker() {
  return document.getElementById(PICKER_ID);
}

function getStatus() {
  return document.getElementById(STATUS_ID);
}

function setUnifiedStatus(message = "", type = "info") {
  const status = getStatus();
  if (!status) return;
  status.textContent = message || "";
  status.dataset.type = type;
  status.style.display = message ? "block" : "none";
}

function syncSampleOpenState() {
  const page = getSamplePage();
  const picker = getPicker();
  if (!page || !picker) return;

  picker.dataset.open = "false";
  picker.style.display = "none";
  page.dataset.sampleOpen = "false";
  setUnifiedStatus("Sample mode has been retired. Use the Young Professional current-state setup instead.", "info");
}

function disableRetiredSampleCards() {
  document.querySelectorAll(".clara-explore-life-stage-card").forEach((card) => {
    if (card.dataset.retiredSampleHandler === "true") return;
    card.dataset.retiredSampleHandler = "true";
    card.disabled = true;
    card.style.opacity = "0.45";
    card.style.pointerEvents = "none";
  });
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${PICKER_ID},
    .clara-explore-sample-picker,
    .clara-explore-life-stage-card {
      display: none !important;
    }

    #${STATUS_ID}[data-type="info"],
    #${STATUS_ID}:empty {
      display: none !important;
    }
  `;

  document.head.appendChild(style);
}

function run() {
  if (typeof document === "undefined") return;
  installStyles();
  syncSampleOpenState();
  disableRetiredSampleCards();
}

if (typeof window !== "undefined") {
  run();

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
