const CLARA_FEATURE_DOCK_STYLE_ID = "clara-assistant-feature-dock-polish-style";

const DOCK_ITEMS = [
  {
    role: "buy-check",
    label: "Buy Check",
    icon: "✓",
    aliases: ["Buy Check", "Talk to CLARA", "Memory"],
    datasetKey: "claraBuyCheckTab",
  },
  {
    role: "forecast",
    label: "Forecast",
    icon: "↗",
    aliases: ["Forecast", "Core Features"],
    datasetKey: "claraForecastTab",
  },
  {
    role: "insight",
    label: "Insight",
    icon: "◫",
    aliases: ["Insight", "Analytic", "Smart Actions"],
    datasetKey: "claraAnalyticTab",
  },
];

function clean(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function ensureFeatureDockStyle() {
  if (typeof document === "undefined" || document.getElementById(CLARA_FEATURE_DOCK_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = CLARA_FEATURE_DOCK_STYLE_ID;
  style.textContent = `
    .clara-feature-dock {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 5px !important;
      padding: 2px !important;
      border-radius: 999px !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      background: rgba(5, 10, 28, 0.48) !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 10px 24px rgba(0, 0, 0, 0.28) !important;
      backdrop-filter: blur(16px) !important;
      -webkit-backdrop-filter: blur(16px) !important;
    }

    .clara-feature-dock > button {
      min-width: 0 !important;
      height: 28px !important;
      min-height: 0 !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 5px !important;
      overflow: hidden !important;
      white-space: nowrap !important;
      border-radius: 999px !important;
      padding: 0 8px !important;
      font-size: 0 !important;
      line-height: 1 !important;
      letter-spacing: 0.02em !important;
      transition: transform 160ms ease, border-color 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease !important;
      will-change: transform;
    }

    .clara-feature-dock > button::before {
      content: attr(data-clara-dock-icon);
      display: inline-grid;
      width: 13px;
      height: 13px;
      place-items: center;
      flex: 0 0 13px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 950;
      line-height: 1;
      color: currentColor;
      background: rgba(255, 255, 255, 0.08);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10);
    }

    .clara-feature-dock > button::after {
      content: attr(data-clara-dock-label);
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 10.5px;
      font-weight: 850;
      line-height: 1;
      letter-spacing: 0.02em;
      color: currentColor;
    }

    .clara-feature-dock > button:active {
      transform: scale(0.98) !important;
    }

    .clara-feature-dock > button[data-clara-feature-dock-role="buy-check"] {
      border-color: rgba(94, 234, 212, 0.45) !important;
      background: linear-gradient(135deg, rgba(20, 184, 166, 0.28), rgba(124, 58, 237, 0.22)) !important;
      color: rgba(255, 255, 255, 0.96) !important;
      box-shadow: 0 0 16px rgba(20, 184, 166, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.16) !important;
    }

    .clara-feature-dock > button[data-clara-feature-dock-role="buy-check"]::before {
      color: rgba(167, 243, 208, 0.98);
      background: rgba(20, 184, 166, 0.16);
    }

    .clara-feature-dock > button[data-clara-feature-dock-role="forecast"],
    .clara-feature-dock > button[data-clara-feature-dock-role="insight"] {
      border-color: rgba(255, 255, 255, 0.12) !important;
      background: rgba(255, 255, 255, 0.055) !important;
      color: rgba(255, 255, 255, 0.76) !important;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.065) !important;
    }

    .clara-feature-dock > button[data-clara-feature-dock-role="forecast"]:hover,
    .clara-feature-dock > button[data-clara-feature-dock-role="insight"]:hover {
      border-color: rgba(255, 255, 255, 0.18) !important;
      background: rgba(255, 255, 255, 0.085) !important;
      color: rgba(255, 255, 255, 0.92) !important;
    }

    @media (max-width: 374px) {
      .clara-feature-dock > button {
        height: 27px !important;
        gap: 4px !important;
        padding: 0 6px !important;
      }

      .clara-feature-dock > button::before {
        width: 12px;
        height: 12px;
        flex-basis: 12px;
        font-size: 9px;
      }

      .clara-feature-dock > button::after {
        font-size: 10px;
      }
    }
  `;

  document.head.appendChild(style);
}

function itemForButton(button) {
  const label = clean(button?.textContent);
  return DOCK_ITEMS.find((item) => (
    button?.dataset?.[item.datasetKey] === "true" || item.aliases.includes(label)
  ));
}

function findFeatureDockRow() {
  if (typeof document === "undefined") return null;

  return Array.from(document.querySelectorAll("div")).find((node) => {
    const buttons = Array.from(node.children || []).filter((child) => child?.tagName === "BUTTON");
    if (buttons.length !== 3) return false;

    const roles = buttons.map(itemForButton).filter(Boolean).map((item) => item.role);
    return DOCK_ITEMS.every((item) => roles.includes(item.role));
  }) || null;
}

function polishFeatureDock() {
  ensureFeatureDockStyle();

  const row = findFeatureDockRow();
  if (!row) return;

  row.classList.add("clara-feature-dock");
  row.dataset.claraFeatureDockReady = "true";

  Array.from(row.children || []).forEach((button) => {
    const item = itemForButton(button);
    if (!item) return;

    button.dataset.claraFeatureDockRole = item.role;
    button.dataset.claraDockLabel = item.label;
    button.dataset.claraDockIcon = item.icon;
    button.setAttribute("aria-label", item.role === "insight" ? "Open CLARA Insight" : `Open CLARA ${item.label}`);
    button.setAttribute("title", item.label);
  });
}

function installClaraFeatureDockPolish() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_FEATURE_DOCK_POLISH_INSTALLED__) return;

  window.__CLARA_FEATURE_DOCK_POLISH_INSTALLED__ = true;
  polishFeatureDock();

  const observer = new MutationObserver(() => {
    window.requestAnimationFrame?.(polishFeatureDock);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

installClaraFeatureDockPolish();
