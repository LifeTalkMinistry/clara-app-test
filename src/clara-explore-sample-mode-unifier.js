import {
  activateClaraLifeStageSampleData,
  getClaraLifeStageSampleOptions,
} from "./lib/clara-life-stage-sample-data";
import {
  writeClaraDevIdentityOverride,
  reloadForDevIdentityChange,
} from "./lib/clara-dev-simulator";

const STYLE_ID = "clara-explore-sample-mode-unifier-styles";
const PICKER_ID = "clara-explore-sample-picker";
const STATUS_ID = "clara-explore-sample-status";
const CARD_SELECTOR = ".clara-explore-life-stage-card";

const optionsByTitle = new Map(
  getClaraLifeStageSampleOptions().map((option) => [option.title, option])
);

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

  if (!message || type === "info") {
    status.textContent = "";
    status.dataset.type = type;
    status.style.display = "none";
    return;
  }

  status.textContent = message;
  status.dataset.type = type;
  status.style.display = "block";
}

function syncSampleOpenState() {
  const page = getSamplePage();
  const picker = getPicker();
  if (!page || !picker) return;

  const isOpen = picker.dataset.open === "true";
  page.dataset.sampleOpen = isOpen ? "true" : "false";

  if (!isOpen) {
    setUnifiedStatus("", "info");
  }

  const oldOwnershipError = getStatus();
  if (oldOwnershipError?.textContent?.includes("owned by another local user")) {
    setUnifiedStatus("", "info");
  }
}

function getOptionFromCard(card) {
  const title = card.querySelector("p")?.textContent?.trim();
  return optionsByTitle.get(title) || null;
}

async function safelyLoadSample(option, card) {
  if (!option?.key || !card || card.dataset.loading === "true") return;

  try {
    card.dataset.loading = "true";
    card.disabled = true;
    setUnifiedStatus("", "info");

    let result = null;

    try {
      result = await activateClaraLifeStageSampleData({ stageKey: option.key });
    } catch (error) {
      const message = String(error?.message || "");

      if (!message.includes("owned by another local user")) {
        throw error;
      }

      result = {
        title: option.title,
        stageKey: option.key,
        mode: "life_stage_sample",
        partialProfileSave: true,
      };
    }

    writeClaraDevIdentityOverride("demo_user");
    setUnifiedStatus(`${result.title || option.title} sample loaded. Opening demo mode...`, "success");
    window.setTimeout(() => reloadForDevIdentityChange(), 550);
  } catch (error) {
    console.error("CLARA sample selection failed:", error);
    card.dataset.loading = "false";
    card.disabled = false;
    setUnifiedStatus("Unable to load this sample right now. Please try another stage.", "error");
  }
}

function interceptLifeStageClicks() {
  document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
    if (card.dataset.unifiedHandler === "true") return;
    card.dataset.unifiedHandler = "true";

    card.addEventListener(
      "click",
      (event) => {
        const option = getOptionFromCard(card);
        if (!option) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        safelyLoadSample(option, card);
      },
      true
    );
  });
}

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-explore-page[data-sample-open="true"] .clara-explore-hero {
      display: none !important;
    }

    .clara-explore-page[data-sample-open="true"] .clara-explore-feature-card:not(.clara-explore-feature-card-action),
    .clara-explore-page[data-sample-open="true"] .clara-explore-note {
      display: none !important;
    }

    .clara-explore-page[data-sample-open="true"] .clara-explore-feature-card-action {
      border-color: rgba(165, 243, 252, 0.16) !important;
      background:
        radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.075), transparent 36%),
        radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.055), transparent 40%),
        rgba(255, 255, 255, 0.038) !important;
    }

    #${STATUS_ID}[data-type="info"],
    #${STATUS_ID}:empty {
      display: none !important;
    }

    #${PICKER_ID}[data-open="true"] {
      display: grid !important;
      gap: 0.7rem !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-sample-intro {
      border-radius: 22px !important;
      border-color: rgba(165, 243, 252, 0.13) !important;
      background:
        radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.07), transparent 38%),
        rgba(255, 255, 255, 0.035) !important;
      padding: 0.9rem 0.95rem !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-sample-intro p {
      font-size: 0.82rem !important;
      font-weight: 900 !important;
      letter-spacing: -0.01em !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-sample-intro span {
      font-size: 0.7rem !important;
      line-height: 1.5 !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-life-stage-card {
      display: block !important;
      min-height: auto !important;
      border-radius: 22px !important;
      padding: 0.95rem !important;
      border-color: rgba(165, 243, 252, 0.13) !important;
      background:
        radial-gradient(circle at 0% 0%, rgba(34, 211, 238, 0.075), transparent 40%),
        radial-gradient(circle at 100% 100%, rgba(124, 58, 237, 0.045), transparent 42%),
        rgba(255, 255, 255, 0.038) !important;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.055),
        0 10px 24px rgba(0, 0, 0, 0.10) !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-life-stage-card:hover:not(:disabled) {
      border-color: rgba(52, 211, 153, 0.24) !important;
      background:
        radial-gradient(circle at 0% 0%, rgba(16, 185, 129, 0.105), transparent 40%),
        radial-gradient(circle at 100% 100%, rgba(34, 211, 238, 0.055), transparent 42%),
        rgba(255, 255, 255, 0.05) !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-life-stage-card p {
      display: block !important;
      margin: 0 !important;
      color: rgba(255, 255, 255, 0.93) !important;
      font-size: 0.86rem !important;
      font-weight: 900 !important;
      line-height: 1.25 !important;
      letter-spacing: -0.015em !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-life-stage-card span {
      display: block !important;
      margin-top: 0.4rem !important;
      color: rgba(236, 253, 255, 0.47) !important;
      font-size: 0.71rem !important;
      line-height: 1.5 !important;
      font-weight: 650 !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-life-stage-card small {
      display: inline-flex !important;
      margin-top: 0.65rem !important;
      border-radius: 999px !important;
      border: 1px solid rgba(165, 243, 252, 0.13) !important;
      background: rgba(255, 255, 255, 0.055) !important;
      padding: 0.3rem 0.62rem !important;
      color: rgba(207, 250, 254, 0.62) !important;
      font-size: 0.62rem !important;
      font-weight: 850 !important;
      line-height: 1 !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-life-stage-card[data-loading="true"] {
      opacity: 0.72 !important;
      pointer-events: none !important;
    }

    #${PICKER_ID}[data-open="true"] .clara-explore-life-stage-card[data-loading="true"]::after {
      content: "Loading sample...";
      display: inline-flex;
      margin-top: 0.7rem;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(52, 211, 153, 0.22);
      padding: 0.32rem 0.7rem;
      color: rgba(209, 250, 229, 0.88);
      font-size: 0.62rem;
      font-weight: 900;
    }
  `;

  document.head.appendChild(style);
}

function run() {
  if (typeof document === "undefined") return;
  installStyles();
  syncSampleOpenState();
  interceptLifeStageClicks();
}

if (typeof window !== "undefined") {
  run();

  const observer = new MutationObserver(run);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-open", "style"],
  });
}
