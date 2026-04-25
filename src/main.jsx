import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { ThemeProvider } from "@/theme/ThemeProvider";
import App from "./App.jsx";
import "./index.css";
import "./clara-fab-theme.css";

window.CLARA_BILLING = {
  productIds: {
    PRO: "clara_pro_99",
    CORE: "clara_core_199",
    LIFE_OS: "clara_lifeos_499",
  },

  getStore() {
    return window.CdvPurchase?.store || window.store || null;
  },

  getPlatform() {
    return window.CdvPurchase?.Platform?.GOOGLE_PLAY || "android-playstore";
  },

  getProductType() {
    return window.CdvPurchase?.ProductType?.PAID_SUBSCRIPTION || "paid subscription";
  },

  async waitForStore(timeout = 10000) {
    const started = Date.now();

    return new Promise((resolve, reject) => {
      const check = () => {
        const store = window.CdvPurchase?.store || window.store;

        if (store) {
          resolve(store);
          return;
        }

        if (Date.now() - started >= timeout) {
          reject(new Error("Google Play Billing store not found."));
          return;
        }

        setTimeout(check, 300);
      };

      check();
    });
  },

  async init() {
    if (window.__CLARA_BILLING_READY__) return true;

    const isAndroid =
      /android/i.test(navigator.userAgent) ||
      !!window.Capacitor?.isNativePlatform?.();

    if (!isAndroid) return false;

    if (!window.CdvPurchase && !window.store) {
      console.warn("Billing plugin not available yet");
      return false;
    }

    const store = await this.waitForStore();
    const platform = this.getPlatform();
    const productType = this.getProductType();

    try {
      store.verbosity = store.DEBUG || 1;
    } catch (error) {
      console.warn("Unable to set billing verbosity:", error);
    }

    try {
      store.register([
        { id: this.productIds.PRO, type: productType, platform },
        { id: this.productIds.CORE, type: productType, platform },
        { id: this.productIds.LIFE_OS, type: productType, platform },
      ]);
    } catch (error) {
      console.error("Billing register error:", error);
      return false;
    }

    try {
      store
        .when()
        .approved((transaction) => {
          try {
            transaction.verify();
          } catch (error) {
            console.warn("Transaction verify failed:", error);
          }
        })
        .verified((receipt) => {
          try {
            receipt.finish();
          } catch (error) {
            console.warn("Receipt finish failed:", error);
          }
        });
    } catch (error) {
      console.warn("Billing event binding failed:", error);
    }

    try {
      await new Promise((resolve, reject) => {
        let done = false;

        store.ready(() => {
          if (done) return;
          done = true;
          resolve();
        });

        store.initialize([platform]);

        setTimeout(() => {
          if (done) return;
          done = true;
          reject(new Error("Billing timeout"));
        }, 12000);
      });
    } catch (error) {
      console.warn("Billing init failed:", error);
      return false;
    }

    window.__CLARA_BILLING_READY__ = true;
    return true;
  },
};

(async () => {
  try {
    const isAndroid =
      /android/i.test(navigator.userAgent) ||
      !!window.Capacitor?.isNativePlatform?.();

    if (isAndroid) {
      setTimeout(() => {
        window.CLARA_BILLING.init();
      }, 1500);
    }
  } catch (error) {
    console.warn("Billing auto-init failed:", error);
  }
})();

function installDashboardSettingsShortcutPatch() {
  if (window.__CLARA_SETTINGS_SHORTCUT_PATCHED__) return;
  window.__CLARA_SETTINGS_SHORTCUT_PATCHED__ = true;

  const gearSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>`;

  const goToSettings = (event) => {
    event.preventDefault();
    event.stopPropagation();
    window.location.hash = "#/settings/account";
  };

  const patch = () => {
    const candidates = Array.from(document.querySelectorAll("button, a, [role='button'], div"));

    for (const element of candidates) {
      if (element.dataset?.claraSettingsShortcut === "true") continue;

      const labelNode = Array.from(element.querySelectorAll("span, p, small, div"))
        .reverse()
        .find((node) => node.textContent?.trim() === "News");

      const directTextMatch = element.childNodes.length <= 4 && element.textContent?.trim() === "News";
      const targetLabel = labelNode || (directTextMatch ? element : null);

      if (!targetLabel) continue;

      const clickable = targetLabel.closest("button, a, [role='button']") || element;
      if (!clickable) continue;

      targetLabel.textContent = "Settings";
      clickable.dataset.claraSettingsShortcut = "true";
      clickable.setAttribute("aria-label", "Open settings");
      clickable.style.cursor = "pointer";

      if (clickable.tagName === "A") {
        clickable.setAttribute("href", "#/settings/account");
      }

      const icon = clickable.querySelector("svg");
      if (icon) {
        icon.outerHTML = gearSvg;
      }

      clickable.addEventListener("click", goToSettings, true);
    }
  };

  patch();

  const observer = new MutationObserver(() => patch());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

installDashboardSettingsShortcutPatch();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" was not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClientInstance}>
          <HashRouter>
            <App />
          </HashRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </AuthProvider>
  </React.StrictMode>
);
