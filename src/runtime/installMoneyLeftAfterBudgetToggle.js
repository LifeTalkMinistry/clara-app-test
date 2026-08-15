import "./installMoneyLeftAnalyticsShortcut";

const HOME_MONEY_LEFT_SELECTOR =
  '.clara-community-root[data-community-view="home"] .clara-community-home-money-left';
const PROJECTION_SELECTOR = '[data-clara-after-budget-total="true"]';
const MONEY_AMOUNT_SELECTOR = '[data-clara-summary-card="money-left"] h2';
const STYLE_ID = 'clara-money-left-after-budget-toggle-style';
const PROJECTED_AMOUNT_LABEL =
  /^(?:Projected money left after the monthly budget is fully spent|Projected spendable money after protected funds, remaining budget, and unpaid obligations):/i;

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
  if (PROJECTED_AMOUNT_LABEL.test(sourceLabel)) {
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
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

    if (
      !afterBudgetActive &&
      currentAmount &&
      !isMaskedAmount(currentAmount) &&
      (!lastProjectedText || currentAmount !== lastProjectedText)
    ) {
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
        : 'Show spendable Money Left after protected funds, budget, and unpaid obligations',
    );
    setAttrIfChanged(
      toggle,
      'title',
      afterBudgetActive ? 'Current Money Left' : 'Spendable after commitments',
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