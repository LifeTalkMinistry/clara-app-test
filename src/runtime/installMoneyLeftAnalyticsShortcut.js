const HOME_MONEY_LEFT_SELECTOR =
  '.clara-community-root[data-community-view="home"] .clara-community-home-money-left';
const SUMMARY_SELECTOR = 'section[data-clara-dashboard-section="money-summary"]';
const ANALYTICS_SELECTOR = '[data-clara-money-analytics-toggle="true"]';
const STYLE_ID = 'clara-money-left-analytics-shortcut-style';

let observer = null;
let scheduled = false;

function createAnalyticsIcon() {
  const wrap = document.createElement('span');
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 3 3 5-6" />
      <path d="M19 8h-4" />
      <path d="M19 8v4" />
    </svg>`;
  return wrap;
}

function navigateToAnalytics(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  if (typeof window === 'undefined') return;

  // CLARA is mounted under React Router's HashRouter. Changing pathname here
  // creates a real /analytics request on GitHub Pages while leaving the old
  // #/community route active. Route only through the hash so the SPA stays on
  // its deployed base path and React Router receives the navigation.
  const targetHash = '#/analytics';
  if (window.location.hash === targetHash) return;

  try {
    window.location.hash = targetHash;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch {
    const base = `${window.location.pathname}${window.location.search}`;
    window.location.assign(`${base}${targetHash}`);
  }
}

function createAnalyticsButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.claraMoneyAnalyticsToggle = 'true';
  button.setAttribute('aria-label', 'Open Money Analytics');
  button.setAttribute('title', 'Money Analytics');
  button.appendChild(createAnalyticsIcon());
  button.addEventListener('click', navigateToAnalytics);
  return button;
}

function installStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR} {
      position: absolute !important;
      z-index: 59 !important;
      top: clamp(12px, 3.4vw, 16px) !important;
      left: calc(clamp(112px, 33vw, 132px) + 80px) !important;
      width: 32px !important;
      min-width: 32px !important;
      height: 32px !important;
      min-height: 32px !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border: 1px solid rgba(126, 181, 255, 0.26) !important;
      border-radius: 999px !important;
      background: rgba(3, 18, 43, 0.68) !important;
      color: #b9d9ff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08) !important;
      transform: translateX(-50%) !important;
      transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, color 140ms ease, box-shadow 140ms ease !important;
      cursor: pointer !important;
      -webkit-tap-highlight-color: transparent;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR}:hover {
      border-color: rgba(255,216,74,0.46) !important;
      background: rgba(7,31,71,0.92) !important;
      color: #ffffff !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR}:active {
      transform: translateX(-50%) scale(0.95) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR}:focus-visible {
      outline: 2px solid rgba(255,216,74,0.82) !important;
      outline-offset: 2px !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR} > span {
      display: flex !important;
      width: 14px !important;
      height: 14px !important;
      align-items: center !important;
      justify-content: center !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR} svg {
      display: block !important;
      width: 14px !important;
      height: 14px !important;
    }

    @media (max-width: 340px) {
      ${HOME_MONEY_LEFT_SELECTOR} ${ANALYTICS_SELECTOR} {
        left: calc(clamp(112px, 33vw, 132px) + 76px) !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function applyMoneyLeftAnalyticsShortcut() {
  if (typeof document === 'undefined') return;

  const home = document.querySelector(HOME_MONEY_LEFT_SELECTOR);
  const summary = home?.querySelector(SUMMARY_SELECTOR);
  if (!summary || summary.querySelector(ANALYTICS_SELECTOR)) return;

  summary.appendChild(createAnalyticsButton());
}

function scheduleApply() {
  if (scheduled || typeof window === 'undefined') return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyMoneyLeftAnalyticsShortcut();
  });
}

export function installMoneyLeftAnalyticsShortcut() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  installStyles();
  applyMoneyLeftAnalyticsShortcut();

  if (observer) return;
  observer = new MutationObserver(scheduleApply);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('hashchange', scheduleApply);
  window.addEventListener('clara-finance-updated', scheduleApply);
}

installMoneyLeftAnalyticsShortcut();
