const HOME_MONEY_LEFT_SELECTOR =
  '.clara-community-root[data-community-view="home"] .clara-community-home-money-left';
const PROJECTION_SELECTOR = '[data-clara-after-budget-total="true"]';
const MONEY_AMOUNT_SELECTOR = '[data-clara-summary-card="money-left"] h2';
const STYLE_ID = 'clara-money-left-after-budget-toggle-style';

let afterBudgetActive = false;
let lastProjectedText = '';
let baseMoneyLeftText = '';
let observer = null;
let applying = false;

function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isMaskedAmount(value) {
  return /[•*]/.test(String(value || ''));
}

function setAttrIfChanged(node, name, value) {
  if (!node) return;
  if (node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value));
}

function captureProjectedAmount(toggle) {
  if (!toggle) return '';

  const sourceLabel = normalize(toggle.getAttribute('aria-label'));
  if (/^Projected money left after the monthly budget is fully spent:/i.test(sourceLabel)) {
    const projected = normalize(sourceLabel.replace(/^.*?:\s*/i, ''));
    if (projected) toggle.dataset.claraAfterBudgetProjectedAmount = projected;
  }

  const strong = toggle.querySelector(':scope > strong');
  const strongText = normalize(strong?.textContent);
  if (strongText && !isMaskedAmount(strongText)) {
    toggle.dataset.claraAfterBudgetProjectedAmount = strongText;
  }

  return normalize(toggle.dataset.claraAfterBudgetProjectedAmount);
}

function createToggleIcon() {
  const wrap = document.createElement('span');
  wrap.dataset.claraAfterBudgetIcon = 'true';
  wrap.setAttribute('aria-hidden', 'true');
  wrap.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z" />
      <path d="M16 13h4" />
      <path d="M6 7V5a2 2 0 0 1 2-2h8" />
      <path d="M8 13h4" />
    </svg>`;
  return wrap;
}

function restoreMoneyLeft(amountNode) {
  if (!amountNode || isMaskedAmount(amountNode.textContent)) return;
  if (baseMoneyLeftText && normalize(amountNode.textContent) !== baseMoneyLeftText) {
    amountNode.textContent = baseMoneyLeftText;
  }
  lastProjectedText = '';
}

function toggleAfterBudget(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  afterBudgetActive = !afterBudgetActive;
  applyAfterBudgetToggle();
}

function wireToggle(toggle) {
  if (!toggle || toggle.dataset.claraAfterBudgetWired === 'true') return;
  toggle.dataset.claraAfterBudgetWired = 'true';

  toggle.addEventListener('click', toggleAfterBudget);
  toggle.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
    toggleAfterBudget(event);
  });
}

function installStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} {
      position: absolute !important;
      z-index: 58 !important;
      top: clamp(12px, 3.4vw, 16px) !important;
      left: calc(clamp(112px, 33vw, 132px) + 54px) !important;
      width: 32px !important;
      min-width: 32px !important;
      height: 32px !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      overflow: visible !important;
      pointer-events: auto !important;
      cursor: pointer !important;
      border: 1px solid rgba(126, 181, 255, 0.26) !important;
      border-radius: 999px !important;
      background: rgba(3, 18, 43, 0.68) !important;
      color: #b9d9ff !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.08) !important;
      transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, color 140ms ease, box-shadow 140ms ease !important;
      -webkit-tap-highlight-color: transparent;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:hover {
      border-color: rgba(255,216,74,0.46) !important;
      background: rgba(7,31,71,0.92) !important;
      color: #ffffff !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:active {
      transform: scale(0.95) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}:focus-visible {
      outline: 2px solid rgba(255,216,74,0.82) !important;
      outline-offset: 2px !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR}[data-clara-after-budget-active="true"] {
      border-color: rgba(255,216,74,0.58) !important;
      background: linear-gradient(145deg, rgba(23,105,224,0.28), rgba(7,31,71,0.96)) !important;
      color: #ffd84a !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.10), 0 0 18px rgba(255,216,74,0.12) !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} > span[data-clara-after-budget-icon="true"] {
      display: flex !important;
      width: 16px !important;
      height: 16px !important;
      align-items: center !important;
      justify-content: center !important;
      color: currentColor !important;
    }

    ${HOME_MONEY_LEFT_SELECTOR} ${PROJECTION_SELECTOR} > span[data-clara-after-budget-icon="true"] svg {
      display: block !important;
      width: 16px !important;
      height: 16px !important;
    }
  `;
  document.head.appendChild(style);
}

export function applyAfterBudgetToggle() {
  if (typeof document === 'undefined' || applying) return;
  const home = document.querySelector(HOME_MONEY_LEFT_SELECTOR);
  if (!home) return;

  const toggle = home.querySelector(PROJECTION_SELECTOR);
  const amountNode = home.querySelector(MONEY_AMOUNT_SELECTOR);
  if (!toggle || !amountNode) return;

  applying = true;
  try {
    const projectedAmount = captureProjectedAmount(toggle);
    const currentAmount = normalize(amountNode.textContent);

    if (!afterBudgetActive && currentAmount && !isMaskedAmount(currentAmount)) {
      baseMoneyLeftText = currentAmount;
    }

    if (afterBudgetActive && currentAmount && !isMaskedAmount(currentAmount)) {
      if (!lastProjectedText || currentAmount !== lastProjectedText) {
        baseMoneyLeftText = currentAmount;
      }
      if (projectedAmount && currentAmount !== projectedAmount) {
        amountNode.textContent = projectedAmount;
      }
      lastProjectedText = projectedAmount;
    } else if (!afterBudgetActive) {
      restoreMoneyLeft(amountNode);
    }

    wireToggle(toggle);
    setAttrIfChanged(toggle, 'role', 'button');
    setAttrIfChanged(toggle, 'tabindex', '0');
    setAttrIfChanged(toggle, 'aria-pressed', afterBudgetActive ? 'true' : 'false');
    setAttrIfChanged(toggle, 'data-clara-after-budget-active', afterBudgetActive ? 'true' : 'false');
    setAttrIfChanged(
      toggle,
      'aria-label',
      afterBudgetActive
        ? 'Show current Money Left'
        : 'Show Money Left after the full budget is deducted',
    );
    setAttrIfChanged(
      toggle,
      'title',
      afterBudgetActive ? 'Current Money Left' : 'Money Left after budget',
    );

    if (!toggle.querySelector('[data-clara-after-budget-icon="true"]')) {
      toggle.replaceChildren(createToggleIcon());
    }
  } finally {
    applying = false;
  }
}

export function installMoneyLeftAfterBudgetToggle() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  installStyles();
  applyAfterBudgetToggle();

  if (observer) return;
  observer = new MutationObserver(() => {
    window.requestAnimationFrame(applyAfterBudgetToggle);
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['aria-label'],
  });

  window.addEventListener('clara-finance-updated', applyAfterBudgetToggle);
  window.addEventListener('clara-wallets-updated', applyAfterBudgetToggle);
  window.addEventListener('clara-budgets-updated', applyAfterBudgetToggle);
}

installMoneyLeftAfterBudgetToggle();
