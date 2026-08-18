import "./installMoneyLeftAnalyticsShortcut";

const HOME_MONEY_LEFT_SELECTOR =
  '.clara-community-root[data-community-view="home"] .clara-community-home-money-left';
const PROJECTION_SELECTOR = '[data-clara-after-budget-total="true"]';
const STYLE_ID = 'clara-money-left-after-budget-toggle-style';

function installStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} {
      position: absolute !important;
      z-index: 58 !important;
      top: clamp(12px, 3.4vw, 16px) !important;
      left: calc(var(--clara-money-tool-start, clamp(112px, 33vw, 132px)) + var(--clara-money-tool-step, 40px)) !important;
      width: var(--clara-money-tool-size, 32px) !important;
      min-width: var(--clara-money-tool-size, 32px) !important;
      height: var(--clara-money-tool-size, 32px) !important;
      min-height: var(--clara-money-tool-size, 32px) !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: visible !important;
      pointer-events: auto !important;
      cursor: pointer !important;
      border: 1px solid rgba(255,216,74,0.42) !important;
      border-radius: 999px !important;
      background: linear-gradient(145deg, rgba(78,61,18,0.72), rgba(4,21,49,0.96)) !important;
      color: #ffd84a !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 0 14px rgba(255,216,74,0.10) !important;
      line-height: 1 !important;
      transform: translateX(-50%) !important;
      transition: transform 150ms ease, border-color 150ms ease, background 150ms ease, color 150ms ease, box-shadow 150ms ease !important;
      -webkit-tap-highlight-color: transparent;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:hover {
      border-color: rgba(255,255,255,0.52) !important;
      background: linear-gradient(145deg, rgba(105,82,22,0.82), rgba(6,28,63,0.98)) !important;
      color: #ffffff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 0 18px rgba(255,216,74,0.15) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:active {
      transform: translateX(-50%) scale(0.94) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:focus-visible {
      outline: 2px solid rgba(255,216,74,0.82) !important;
      outline-offset: 2px !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}[data-clara-after-budget-active="true"] {
      border-color: rgba(255,226,106,0.78) !important;
      background: linear-gradient(145deg, rgba(126,93,16,0.88), rgba(8,37,81,0.98)) !important;
      color: #fff2a8 !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 0 20px rgba(255,216,74,0.20) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} > span[data-clara-after-budget-icon="true"] {
      display: flex !important;
      width: var(--clara-money-tool-icon, 14px) !important;
      height: var(--clara-money-tool-icon, 14px) !important;
      align-items: center !important;
      justify-content: center !important;
      color: currentColor !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} > span[data-clara-after-budget-icon="true"] svg {
      display: block !important;
      width: var(--clara-money-tool-icon, 14px) !important;
      height: var(--clara-money-tool-icon, 14px) !important;
    }
  `;
  document.head.appendChild(style);
}

// Compatibility exports remain because the runtime module is already imported
// by the app shell. Display ownership now lives entirely in React.
export function applyAfterBudgetToggle() {
  installStyles();
}

export function installMoneyLeftAfterBudgetToggle() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  installStyles();
}

installMoneyLeftAfterBudgetToggle();
