import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { queryClientInstance } from "@/lib/query-client";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { installClaraGlobalClickSound } from "@/lib/claraSoundSystem";
import { installNativeNotificationListeners } from "@/lib/notifications/nativePushNotifications";
import "./runtime/installClaraRuntimePatches";
import App from "./App.jsx";
import "./index.css";

window.CLARA_BILLING = window.CLARA_BILLING || {};

(async () => {
  try {
    const isAndroid =
      /android/i.test(navigator.userAgent) ||
      !!window.Capacitor?.isNativePlatform?.();
    if (isAndroid) {
      setTimeout(async () => {
        try {
          if (window.CLARA_BILLING?.init) {
            await window.CLARA_BILLING.init();
          }
        } catch (error) {
          console.warn("Billing init safely ignored:", error);
        }
      }, 2000);
    }
  } catch (error) {
    console.warn("Billing auto-init failed:", error);
  }
})();

try {
  installClaraGlobalClickSound();
} catch (error) {
  console.warn("CLARA sound system failed to init:", error);
}

try {
  installNativeNotificationListeners();
} catch (error) {
  console.warn("CLARA native notification listeners failed:", error);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <ThemeProvider>
          <HashRouter>
            <App />
          </HashRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
