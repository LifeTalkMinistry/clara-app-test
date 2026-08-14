const SUPPORT_CARD_SELECTOR = ".clara-onboarding-support-card";
const SUPPORT_LINK_SELECTOR = ".clara-onboarding-support-link";
const WORDMARK_SELECTOR = ".clara-onboarding-wordmark";
const BRAND_REVEAL_SELECTOR = ".clara-onboarding-logo-stage";
const WORDMARK_LETTERIZED_ATTR = "data-clara-wordmark-letterized";
const WORDMARK_REVEAL_CLASS = "is-clara-brand-reveal";
const INSTALLED_FLAG = "__claraMissionOnboardingSupportCardRoutingInstalled";
const ENHANCED_ATTR = "data-clara-support-tier-route";
const STYLE_ID = "clara-onboarding-support-card-routing-style";

function getSupportCard(target) {
  return target instanceof Element ? target.closest(SUPPORT_CARD_SELECTOR) : null;
}

function getSupportTierLink() {
  const link = document.querySelector(SUPPORT_LINK_SELECTOR);
  return link instanceof HTMLButtonElement ? link : null;
}

function routeCardToSupportTiers(card) {
  if (!(card instanceof HTMLElement)) return;

  const supportLink = getSupportTierLink();
  if (!supportLink || supportLink.disabled) return;

  supportLink.click();
}

function enhanceCard(card) {
  if (!(card instanceof HTMLElement) || card.hasAttribute(ENHANCED_ATTR)) return;

  card.setAttribute(ENHANCED_ATTR, "true");
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");

  const title = card.querySelector(".clara-onboarding-support-title")?.textContent?.trim();
  card.setAttribute(
    "aria-label",
    title ? `${title}. View CLARA supporter tiers.` : "View CLARA supporter tiers."
  );
}

function enhanceVisibleCards(root = document) {
  root.querySelectorAll?.(SUPPORT_CARD_SELECTOR).forEach(enhanceCard);
}

function wordmarkTone(index) {
  if (index <= 1) return "blue";
  if (index === 2) return "gold";
  return "red";
}

function letterizeWordmark(wordmark) {
  if (!(wordmark instanceof HTMLElement) || wordmark.hasAttribute(WORDMARK_LETTERIZED_ATTR)) return;
  if (wordmark.textContent?.replace(/\s+/g, "").toUpperCase() !== "CLARA") return;

  const fragment = document.createDocumentFragment();
  Array.from("CLARA").forEach((letter, index) => {
    const span = document.createElement("span");
    span.className = `clara-onboarding-wordmark-letter clara-onboarding-wordmark-letter--${wordmarkTone(index)}`;
    span.textContent = letter;
    span.setAttribute("aria-hidden", "true");
    span.style.setProperty("--clara-letter-index", String(index));
    fragment.appendChild(span);
  });

  wordmark.replaceChildren(fragment);
  wordmark.setAttribute(WORDMARK_LETTERIZED_ATTR, "true");
  wordmark.setAttribute("aria-label", "CLARA");
}

function letterizeVisibleWordmarks(root = document) {
  if (root instanceof Element && root.matches(WORDMARK_SELECTOR)) letterizeWordmark(root);
  root.querySelectorAll?.(WORDMARK_SELECTOR).forEach(letterizeWordmark);
}

function syncBrandReveal() {
  const brandRevealIsActive = Boolean(document.querySelector(BRAND_REVEAL_SELECTOR));
  const headerWordmark = document.querySelector(".clara-onboarding-header .clara-onboarding-wordmark");
  const heroWordmark = document.querySelector(".clara-onboarding-wordmark--hero");

  letterizeWordmark(headerWordmark);
  letterizeWordmark(heroWordmark);

  if (headerWordmark instanceof HTMLElement) {
    headerWordmark.classList.toggle(WORDMARK_REVEAL_CLASS, brandRevealIsActive);
  }

  if (heroWordmark instanceof HTMLElement) {
    heroWordmark.classList.toggle(WORDMARK_REVEAL_CLASS, brandRevealIsActive);
  }
}

function installInteractionStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    ${SUPPORT_CARD_SELECTOR}[${ENHANCED_ATTR}="true"] {
      cursor: pointer !important;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
      transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease !important;
    }

    ${SUPPORT_CARD_SELECTOR}[${ENHANCED_ATTR}="true"]:hover,
    ${SUPPORT_CARD_SELECTOR}[${ENHANCED_ATTR}="true"]:focus-visible {
      transform: translateY(-1px);
      border-color: rgba(111, 166, 255, .30) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.045), 0 14px 34px rgba(0,0,0,.16), 0 0 22px rgba(61,126,255,.08) !important;
      outline: none;
    }

    ${SUPPORT_CARD_SELECTOR}.clara-onboarding-support-card--gold[${ENHANCED_ATTR}="true"]:hover,
    ${SUPPORT_CARD_SELECTOR}.clara-onboarding-support-card--gold[${ENHANCED_ATTR}="true"]:focus-visible {
      border-color: rgba(255, 210, 68, .29) !important;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 14px 34px rgba(0,0,0,.16), 0 0 22px rgba(255,205,62,.06) !important;
    }

    ${SUPPORT_CARD_SELECTOR}[${ENHANCED_ATTR}="true"]:active {
      transform: scale(.992);
    }

    ${WORDMARK_SELECTOR}[${WORDMARK_LETTERIZED_ATTR}="true"] {
      display: inline-flex !important;
      align-items: baseline;
      gap: .205em;
      letter-spacing: 0 !important;
    }

    .clara-onboarding-wordmark--hero[${WORDMARK_LETTERIZED_ATTR}="true"] {
      gap: .22em;
    }

    .clara-onboarding-wordmark-letter {
      display: inline-block;
      transform-origin: 50% 100%;
      backface-visibility: hidden;
      will-change: transform, opacity, filter;
    }

    .clara-onboarding-wordmark-letter--blue { color: #4d8cff; }
    .clara-onboarding-wordmark-letter--gold { color: #ffd42f; }
    .clara-onboarding-wordmark-letter--red { color: #ff4d55; }

    .clara-onboarding-header ${WORDMARK_SELECTOR}.${WORDMARK_REVEAL_CLASS} .clara-onboarding-wordmark-letter {
      animation: clara-onboarding-wordmark-top-land 430ms cubic-bezier(.16, 1, .3, 1) both;
      animation-delay: calc(var(--clara-letter-index) * 52ms);
    }

    .clara-onboarding-wordmark--hero.${WORDMARK_REVEAL_CLASS} .clara-onboarding-wordmark-letter {
      animation: clara-onboarding-wordmark-hero-land 660ms cubic-bezier(.16, 1, .3, 1) both;
      animation-delay: calc(120ms + var(--clara-letter-index) * 76ms);
    }

    @keyframes clara-onboarding-wordmark-top-land {
      0% {
        opacity: .15;
        transform: translateY(4px) scale(.98);
        filter: blur(1.4px);
      }
      58% {
        opacity: 1;
        transform: translateY(-1.5px) scale(1.018);
        filter: blur(0) drop-shadow(0 0 4px currentColor);
      }
      82% {
        transform: translateY(.5px) scale(.996);
        filter: blur(0);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: none;
      }
    }

    @keyframes clara-onboarding-wordmark-hero-land {
      0% {
        opacity: 0;
        transform: translateY(12px) scale(.93);
        filter: blur(2.4px);
      }
      48% {
        opacity: 1;
        transform: translateY(-4px) scale(1.04);
        filter: blur(0) drop-shadow(0 0 8px currentColor);
      }
      72% {
        transform: translateY(1.4px) scale(.992);
        filter: blur(0) drop-shadow(0 0 3px currentColor);
      }
      88% {
        transform: translateY(-.45px) scale(1.004);
        filter: blur(0);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .clara-onboarding-header ${WORDMARK_SELECTOR}.${WORDMARK_REVEAL_CLASS} .clara-onboarding-wordmark-letter,
      .clara-onboarding-wordmark--hero.${WORDMARK_REVEAL_CLASS} .clara-onboarding-wordmark-letter {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
        filter: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installMissionOnboardingSupportCardRouting() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (window[INSTALLED_FLAG]) return;
  window[INSTALLED_FLAG] = true;

  installInteractionStyles();
  enhanceVisibleCards();
  letterizeVisibleWordmarks();
  syncBrandReveal();

  let revealSyncQueued = false;
  const queueBrandRevealSync = () => {
    if (revealSyncQueued) return;
    revealSyncQueued = true;
    window.requestAnimationFrame(() => {
      revealSyncQueued = false;
      syncBrandReveal();
    });
  };

  document.addEventListener("click", (event) => {
    const card = getSupportCard(event.target);
    if (!card) return;

    event.preventDefault();
    routeCardToSupportTiers(card);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    const card = getSupportCard(event.target);
    if (!card) return;

    event.preventDefault();
    routeCardToSupportTiers(card);
  });

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof Element)) continue;
        if (node.matches(SUPPORT_CARD_SELECTOR)) enhanceCard(node);
        enhanceVisibleCards(node);
        letterizeVisibleWordmarks(node);
      }
    }
    queueBrandRevealSync();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

try {
  installMissionOnboardingSupportCardRouting();
} catch (error) {
  console.warn("CLARA onboarding supporter card routing failed to init:", error);
}
