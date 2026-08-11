const HOME_ROOT_SELECTOR = '.clara-community-root[data-community-view="home"] .clara-community-home-view';
const HERO_SELECTOR = '[data-clara-home-brand-hero="true"]';
const SECTION_SELECTOR = '[data-clara-home-brand-section]';

function buildHomeHero() {
  const hero = document.createElement('section');
  hero.className = 'clara-home-brand-hero';
  hero.dataset.claraHomeBrandHero = 'true';
  hero.setAttribute('aria-label', 'CLARA Financial Home');

  const iconWrap = document.createElement('div');
  iconWrap.className = 'clara-home-brand-hero__icon';

  const logo = document.createElement('img');
  logo.src = `${import.meta.env.BASE_URL || '/'}clara-icon.png`;
  logo.alt = '';
  logo.setAttribute('aria-hidden', 'true');
  iconWrap.appendChild(logo);

  const copy = document.createElement('div');
  copy.className = 'clara-home-brand-hero__copy';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'clara-home-brand-hero__eyebrow';
  eyebrow.textContent = 'CLARA FINANCIAL HOME';

  const title = document.createElement('h1');
  title.className = 'clara-home-brand-hero__title';
  title.textContent = 'Your money, clearly.';

  const subtitle = document.createElement('p');
  subtitle.className = 'clara-home-brand-hero__subtitle';
  subtitle.textContent = 'Ask before you spend. See your streak, plan, and money left in one calm view.';

  copy.append(eyebrow, title, subtitle);
  hero.append(iconWrap, copy);
  return hero;
}

function buildSectionHeading(key, eyebrowText, titleText) {
  const wrapper = document.createElement('div');
  wrapper.className = `clara-home-brand-section clara-home-brand-section--${key}`;
  wrapper.dataset.claraHomeBrandSection = key;

  const marker = document.createElement('span');
  marker.className = 'clara-home-brand-section__marker';
  marker.setAttribute('aria-hidden', 'true');

  const copy = document.createElement('div');
  copy.className = 'clara-home-brand-section__copy';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'clara-home-brand-section__eyebrow';
  eyebrow.textContent = eyebrowText;

  const title = document.createElement('h2');
  title.className = 'clara-home-brand-section__title';
  title.textContent = titleText;

  copy.append(eyebrow, title);
  wrapper.append(marker, copy);
  return wrapper;
}

function ensureHomeBrandCompletion() {
  if (typeof document === 'undefined') return;

  const homeRoot = document.querySelector(HOME_ROOT_SELECTOR);
  if (!homeRoot) return;

  const content = homeRoot.firstElementChild;
  if (!content) return;

  const dailyTip = content.querySelector(':scope > [data-clara-community-guide="daily-tip"]');
  if (dailyTip && !content.querySelector(`:scope > ${HERO_SELECTOR}`)) {
    content.insertBefore(buildHomeHero(), dailyTip);
  }

  const finance = content.querySelector(':scope > .clara-community-home-financial-carousel');
  if (!finance) return;

  if (!finance.querySelector(':scope > [data-clara-home-brand-section="plan"]')) {
    finance.insertBefore(
      buildSectionHeading('plan', 'YOUR MONEY PLAN', 'Plan. Protect. Progress.'),
      finance.firstChild,
    );
  }

  const moneyLeft = finance.querySelector(':scope > .clara-community-home-money-left');
  if (
    moneyLeft &&
    !finance.querySelector(':scope > [data-clara-home-brand-section="position"]')
  ) {
    finance.insertBefore(
      buildSectionHeading('position', 'YOUR POSITION', 'What remains now.'),
      moneyLeft,
    );
  }

  // Remove duplicates if a fast React re-render briefly preserves an old injected node.
  const seen = new Set();
  homeRoot.querySelectorAll(`${HERO_SELECTOR}, ${SECTION_SELECTOR}`).forEach((node) => {
    const key = node.matches(HERO_SELECTOR)
      ? 'hero'
      : `section-${node.dataset.claraHomeBrandSection || ''}`;
    if (seen.has(key)) node.remove();
    else seen.add(key);
  });
}

export function installClaraHomeBrandCompletion() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CLARA_HOME_BRAND_COMPLETION_INSTALLED__) return;
  window.__CLARA_HOME_BRAND_COMPLETION_INSTALLED__ = true;

  let frame = 0;
  const schedule = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      ensureHomeBrandCompletion();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-community-view'],
  });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('popstate', schedule);
  window.addEventListener('resize', schedule, { passive: true });

  schedule();
}
