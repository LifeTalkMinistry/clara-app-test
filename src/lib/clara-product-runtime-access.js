export const CLARA_PRODUCT_ACCESS_CHANGED_EVENT = "clara:product-access-changed";

const STYLE_ID = "clara-product-runtime-access-style";
let productLocked = true;

function ensureRuntimeBoundaryStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    html[data-clara-product-locked="true"]
      .clara-community-root:has([data-clara-trial-access-gate="true"])
      > .clara-community-shell-header {
      opacity: .34 !important;
      filter: saturate(.72) brightness(.78) !important;
      pointer-events: none !important;
      user-select: none !important;
    }

    html[data-clara-product-locked="true"]
      .clara-community-root:has([data-clara-trial-access-gate="true"])
      > .clara-community-shell-header .clara-community-nav-item {
      cursor: default !important;
    }

    html[data-clara-product-locked="true"] #clara-daily-awareness-streak-banner,
    html[data-clara-product-locked="true"] #clara-weekly-cross-check-reminder,
    html[data-clara-product-locked="true"] #clara-weekly-cross-check-day-setup {
      display: none !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

function syncTrialGateNavPreview() {
  if (typeof document === "undefined") return;

  const header = document.querySelector(
    '.clara-community-root:has([data-clara-trial-access-gate="true"]) > .clara-community-shell-header'
  );
  if (!header) return;

  if (productLocked) {
    header.inert = true;
    header.setAttribute("aria-disabled", "true");
    header.dataset.claraTrialNavPreview = "true";
  } else {
    header.inert = false;
    header.removeAttribute("aria-disabled");
    delete header.dataset.claraTrialNavPreview;
  }
}

function publishRuntimeState(source = "unknown") {
  if (typeof document !== "undefined") {
    ensureRuntimeBoundaryStyles();
    document.documentElement.dataset.claraProductLocked = productLocked ? "true" : "false";
    window.requestAnimationFrame?.(syncTrialGateNavPreview);
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CLARA_PRODUCT_ACCESS_CHANGED_EVENT, {
        detail: { locked: productLocked, source },
      })
    );
  }
}

export function isClaraProductRuntimeLocked() {
  return productLocked;
}

export function setClaraProductRuntimeAccess(hasAccess, source = "product-access") {
  const nextLocked = !Boolean(hasAccess);
  const changed = nextLocked !== productLocked;
  productLocked = nextLocked;

  if (changed || typeof document !== "undefined") {
    publishRuntimeState(source);
  }

  return !productLocked;
}

if (typeof document !== "undefined") {
  ensureRuntimeBoundaryStyles();
  document.documentElement.dataset.claraProductLocked = "true";
}
