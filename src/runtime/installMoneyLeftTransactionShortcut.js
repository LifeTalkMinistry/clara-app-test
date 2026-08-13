const HOME_MONEY_LEFT_SELECTOR =
  '.clara-community-root[data-community-view="home"] .clara-community-home-money-left';
const SUMMARY_SELECTOR = 'section[data-clara-dashboard-section="money-summary"]';
const PRIVACY_SELECTOR = '[data-clara-summary-privacy-toggle="true"]';
const AFTER_BUDGET_SELECTOR = '[data-clara-after-budget-total="true"]';
const ANALYTICS_SELECTOR = '[data-clara-money-analytics-toggle="true"]';
const TRANSACTION_SELECTOR = '[data-clara-money-transactions-toggle="true"]';
const ORB_SELECTOR = '[data-clara-manual-expense-orb="true"]';
const STYLE_ID = 'clara-money-left-premium-utility-row-style';

let observer = null;
let scheduled = false;

function createTransactionIcon() {
  const wrap = document.createElement('span');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2h9l3 3v17l-3-2-3 2-3-2-3 2V2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>`;
  return wrap;
}

function navigateToTransactions(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  if (typeof window === 'undefined') return;

  const targetHash = '#/transactions';
  if (window.location.hash === targetHash) return;

  try {
    window.location.hash = targetHash;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch {
    const base = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`${base}${targetHash}`);
  }
}

function createTransactionButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.claraMoneyTransactionsToggle = 'true';
  button.setAttribute('aria-label', 'Open transactions');
  button.setAttribute('title', 'Transactions');
  button.appendChild(createTransactionIcon());
  button.addEventListener('click', navigateToTransactions);
  return button;
}

function installStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ${HOME_MONEY_LEFT_SELECTOR} ${SUMMARY_SELECTOR} {
      --clara-money-tool-start: clamp(112px, 33vw, 132px);
      --clara-money-tool-step: 40px;
      --clara-money-tool-size: 32px;
      --clara-money-tool-icon: 14px;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PRIVACY_SELECTOR},
    ${HOME_MONEY_LEFT_SELECTOR} ${AFTER_BUDGET_SELECTOR},
    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR},
    ${HOME_MONEY_LEFT_SELECTOR} ${TRANSACTION_SELECTOR} {
      top: clamp(12px, 3.4vw, 16px) !important;
      width: var(--clara-money-tool-size) !important;
      min-width: var(--clara-money-tool-size) !important;
      height: var(--clara-money-tool-size) !important;
      min-height: var(--clara-money-tool-size) !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 999px !important;
      transform: translateX(-50%) !important;
      transition: transform 150ms ease, border-color 150ms ease, color 150ms ease, background 150ms ease, box-shadow 150ms ease !important;
      -webkit-tap-highlight-color: transparent !important;
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PRIVACY_SELECTOR} {
      left: var(--clara-money-tool-start) !important;
      border: 1px solid rgba(83, 188, 255, 0.42) !important;
      color: #8bdcff !important;
      background: linear-gradient(145deg, rgba(13, 61, 123, 0.96), rgba(4, 21, 49, 0.96)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 0 14px rgba(43,153,255,0.12) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${AFTER_BUDGET_SELECTOR} {
      left: calc(var(--clara-money-tool-start) + var(--clara-money-tool-step)) !important;
      border: 1px solid rgba(255, 216, 74, 0.42) !important;
      color: #ffd84a !important;
      background: linear-gradient(145deg, rgba(78, 61, 18, 0.72), rgba(4, 21, 49, 0.96)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 0 14px rgba(255,216,74,0.10) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR} {
      left: calc(var(--clara-money-tool-start) + (var(--clara-money-tool-step) * 2)) !important;
      border: 1px solid rgba(114, 148, 255, 0.46) !important;
      color: #8fb3ff !important;
      background: linear-gradient(145deg, rgba(27, 57, 132, 0.94), rgba(12, 20, 61, 0.96)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 0 14px rgba(73,101,255,0.12) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${TRANSACTION_SELECTOR} {
      position: absolute !important;
      z-index: 60 !important;
      left: calc(var(--clara-money-tool-start) + (var(--clara-money-tool-step) * 3)) !important;
      border: 1px solid rgba(255, 92, 116, 0.46) !important;
      color: #ff8294 !important;
      background: linear-gradient(145deg, rgba(105, 24, 48, 0.82), rgba(18, 14, 45, 0.96)) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 0 14px rgba(243,38,69,0.12) !important;
      cursor: pointer !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PRIVACY_SELECTOR}:hover,
    ${HOME_MONEY_LEFT_SELECTOR} ${AFTER_BUDGET_SELECTOR}:hover,
    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR}:hover,
    ${HOME_MONEY_LEFT_SELECTOR} ${TRANSACTION_SELECTOR}:hover {
      border-color: rgba(255,255,255,0.52) !important;
      color: #ffffff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.14), 0 0 18px rgba(58,142,255,0.16) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PRIVACY_SELECTOR}:active,
    ${HOME_MONEY_LEFT_SELECTOR} ${AFTER_BUDGET_SELECTOR}:active,
    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR}:active,
    ${HOME_MONEY_LEFT_SELECTOR} ${TRANSACTION_SELECTOR}:active {
      transform: translateX(-50%) scale(0.94) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PRIVACY_SELECTOR}:focus-visible,
    ${HOME_MONEY_LEFT_SELECTOR} ${AFTER_BUDGET_SELECTOR}:focus-visible,
    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR}:focus-visible,
    ${HOME_MONEY_LEFT_SELECTOR} ${TRANSACTION_SELECTOR}:focus-visible {
      outline: 2px solid rgba(255,216,74,0.82) !important;
      outline-offset: 2px !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PRIVACY_SELECTOR} svg,
    ${HOME_MONEY_LEFT_SELECTOR} ${AFTER_BUDGET_SELECTOR} svg,
    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR} svg,
    ${HOME_MONEY_LEFT_SELECTOR} ${TRANSACTION_SELECTOR} svg,
    ${HOME_MONEY_LEFT_SELECTOR} ${TRANSACTION_SELECTOR} > span {
      width: var(--clara-money-tool-icon) !important;
      height: var(--clara-money-tool-icon) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${TRANSACTION_SELECTOR} > span {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    @media (max-width: 340px) {
      ${HOME_MONEY_LEFT_SELECTOR} ${SUMMARY_SELECTOR} {
        --clara-money-tool-start: 106px;
        --clara-money-tool-step: 36px;
        --clara-money-tool-size: 30px;
        --clara-money-tool-icon: 13px;
      }
    }
  `;
  document.head.appendChild(style);
}

function cleanOrbTransactionCopy() {
  const orb = document.querySelector(`${HOME_MONEY_LEFT_SELECTOR} ${ORB_SELECTOR}`);
  if (!orb) return;
  const label = orb.getAttribute('aria-label') || '';
  if (/transaction hub|double tap/i.test(label)) {
    orb.setAttribute('aria-label', 'Tap to log expense, long press to pause before buying');
    orb.setAttribute('title', 'Log expense');
  }
}

export function applyMoneyLeftTransactionShortcut() {
  if (typeof document === 'undefined') return;
  const home = document.querySelector(HOME_MONEY_LEFT_SELECTOR);
  const summary = home?.querySelector(SUMMARY_SELECTOR);
  if (!summary) return;

  if (!summary.querySelector(TRANSACTION_SELECTOR)) {
    summary.appendChild(createTransactionButton());
  }
  cleanOrbTransactionCopy();
}

function scheduleApply() {
  if (scheduled || typeof window === 'undefined') return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyMoneyLeftTransactionShortcut();
  });
}

export function installMoneyLeftTransactionShortcut() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  installStyles();
  applyMoneyLeftTransactionShortcut();

  if (observer) return;
  observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['aria-label'],
  });

  window.addEventListener('hashchange', scheduleApply);
  window.addEventListener('clara-finance-updated', scheduleApply);
}

installMoneyLeftTransactionShortcut();
