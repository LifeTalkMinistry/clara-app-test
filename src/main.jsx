import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
<<<<<<< HEAD
import { QueryClientProvider } from "@tanstack/react-query";
=======
>>>>>>> dffb3f4 (update)
import { AuthProvider } from "@/context/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import App from "./App.jsx";
import "./index.css";

<<<<<<< HEAD
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
=======
// REMOVE direct import of cordova-plugin-purchase ❌
// import "cordova-plugin-purchase";

// Safe billing setup (only when available)
window.CLARA_BILLING = {
  productIds: {
    ENTRY: "clara_entry_299",
    CORE: "clara_core_499",
    COACHING: "clara_coaching_999",
  },

  getStore() {
    return window.CdvPurchase?.store || window.store || null;
  },

  getPlatform() {
    return window.CdvPurchase?.Platform?.GOOGLE_PLAY || "android-playstore";
  },

  getProductType() {
    return window.CdvPurchase?.ProductType?.NON_CONSUMABLE || "non consumable";
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

    // 🚨 DO NOT INIT if plugin is not ready
    if (!window.CdvPurchase && !window.store) {
      console.warn("Billing plugin not available yet");
      return false;
    }

    const store = await this.waitForStore();
    const platform = this.getPlatform();
    const productType = this.getProductType();

    try {
      store.verbosity = store.DEBUG || 1;
    } catch (_) {}

    try {
      store.register([
        { id: this.productIds.ENTRY, type: productType, platform },
        { id: this.productIds.CORE, type: productType, platform },
        { id: this.productIds.COACHING, type: productType, platform },
      ]);
    } catch (err) {
      console.error("Billing register error:", err);
      return false;
    }

    try {
      store.when()
        .approved((transaction) => {
          try { transaction.verify(); } catch {}
        })
        .verified((receipt) => {
          try { receipt.finish(); } catch {}
        });
    } catch {}

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
    } catch (err) {
      console.warn("Billing init failed:", err);
      return false;
    }

    window.__CLARA_BILLING_READY__ = true;
    return true;
  }
};

// SAFE auto-init
(async () => {
  try {
    const isAndroid =
      /android/i.test(navigator.userAgent) ||
      !!window.Capacitor?.isNativePlatform?.();

    if (isAndroid) {
      setTimeout(() => {
        window.CLARA_BILLING.init();
      }, 1500); // delay to avoid crash
    }
  } catch (err) {
    console.warn("Billing auto-init failed:", err);
  }
})();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Root element with id "root" was not found.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AuthProvider>
      <HashRouter>
        <App />
      </HashRouter>
>>>>>>> dffb3f4 (update)
    </AuthProvider>
  </React.StrictMode>
);