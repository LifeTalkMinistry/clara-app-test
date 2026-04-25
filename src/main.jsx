import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
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

function installSettingsLogoutButtonPatch() {
  if (window.__CLARA_SETTINGS_LOGOUT_PATCHED__) return;
  window.__CLARA_SETTINGS_LOGOUT_PATCHED__ = true;

  const logoutSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>`;

  const signOutAndReturnToLogin = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      window.location.hash = "#/login";
      window.location.reload();
    }
  };

  const createLogoutButton = () => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.claraSettingsLogout = "true";
    button.setAttribute("aria-label", "Log out");
    button.innerHTML = `
      <span class="flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-500/10 text-rose-100">
        ${logoutSvg}
      </span>
      <span class="min-w-0 flex-1 text-left">
        <span class="block text-sm font-semibold text-white">Logout</span>
        <span class="mt-0.5 block text-xs leading-5 text-white/55">Sign out of your CLARA account</span>
      </span>
    `;
    button.className =
      "mt-3 flex w-full items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-left shadow-[0_10px_30px_rgba(244,63,94,0.10)] transition hover:bg-rose-500/15 active:scale-[0.99]";
    button.addEventListener("click", signOutAndReturnToLogin);
    return button;
  };

  const findSettingsCategoryContainer = () => {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, p, span, div"));
    const settingsHeading = headings.find((node) => {
      const text = node.textContent?.trim().toLowerCase();
      return text === "settings" || text === "account settings" || text === "settings category";
    });

    const headingContainer = settingsHeading?.closest("section, aside, nav, div");
    if (headingContainer) return headingContainer;

    const accountLink = Array.from(document.querySelectorAll("a, button, [role='button']")).find((node) => {
      const text = node.textContent?.trim().toLowerCase() || "";
      return text.includes("account") && !text.includes("logout");
    });

    return accountLink?.parentElement || accountLink?.closest("section, aside, nav, div") || null;
  };

  const patch = () => {
    if (!window.location.hash.includes("/settings")) return;
    if (document.querySelector("[data-clara-settings-logout='true']")) return;

    const container = findSettingsCategoryContainer();
    if (!container) return;

    container.appendChild(createLogoutButton());
  };

  patch();

  window.addEventListener("hashchange", () => window.setTimeout(patch, 80));

  const observer = new MutationObserver(() => patch());
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

installDashboardSettingsShortcutPatch();
installSettingsLogoutButtonPatch();

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
