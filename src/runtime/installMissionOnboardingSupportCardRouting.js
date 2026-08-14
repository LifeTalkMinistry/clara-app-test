const SUPPORT_CARD_SELECTOR = ".clara-onboarding-support-card";
const SUPPORT_LINK_SELECTOR = ".clara-onboarding-support-link";
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
  `;
  document.head.appendChild(style);
}

export function installMissionOnboardingSupportCardRouting() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (window[INSTALLED_FLAG]) return;
  window[INSTALLED_FLAG] = true;

  installInteractionStyles();
  enhanceVisibleCards();

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
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

try {
  installMissionOnboardingSupportCardRouting();
} catch (error) {
  console.warn("CLARA onboarding supporter card routing failed to init:", error);
}
