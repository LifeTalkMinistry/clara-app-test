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
      display: none !important;
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

function publishRuntimeState(source = "unknown") {
  if (typeof document !== "undefined") {
    ensureRuntimeBoundaryStyles();
    document.documentElement.dataset.claraProductLocked = productLocked ? "true" : "false";
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
