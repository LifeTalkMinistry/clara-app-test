import { useEffect } from "react";

export default function useOnboardingPageLock(showOnboarding) {
  useEffect(() => {
    if (!showOnboarding) {
      document.body.classList.remove("clara-onboarding-open");
      document.documentElement.classList.remove("clara-onboarding-open");
      return;
    }

    document.body.classList.add("clara-onboarding-open");
    document.documentElement.classList.add("clara-onboarding-open");

    const styleId = "clara-onboarding-global-hide-style";
    let styleEl = document.getElementById(styleId);

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      styleEl.innerHTML = `
        body.clara-onboarding-open [data-bottom-nav],
        body.clara-onboarding-open [data-mobile-nav],
        body.clara-onboarding-open [data-tab-bar],
        body.clara-onboarding-open [data-fab],
        body.clara-onboarding-open .bottom-nav,
        body.clara-onboarding-open .mobile-bottom-nav,
        body.clara-onboarding-open .app-bottom-nav,
        body.clara-onboarding-open .floating-add-button,
        body.clara-onboarding-open .global-fab,
        body.clara-onboarding-open .bottom-tab-bar,
        body.clara-onboarding-open *[class*="fab"],
        body.clara-onboarding-open *[class*="FAB"],
        body.clara-onboarding-open [class*="floating"],
        body.clara-onboarding-open [class*="bottom-nav"],
        body.clara-onboarding-open [class*="tab-bar"] {
          opacity: 0 !important;
          pointer-events: none !important;
          visibility: hidden !important;
        }

        body.clara-onboarding-open,
        html.clara-onboarding-open {
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(styleEl);
    }

    return () => {
      document.body.classList.remove("clara-onboarding-open");
      document.documentElement.classList.remove("clara-onboarding-open");
    };
  }, [showOnboarding]);
}
