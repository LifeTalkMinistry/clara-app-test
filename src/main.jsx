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

// --- SAFE BILLING INIT (non-blocking, crash-proof) ---
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
        } catch (e) {
          console.warn("Billing init safely ignored:", e);
        }
      }, 2000);
    }
  } catch (error) {
    console.warn("Billing auto-init failed:", error);
  }
})();

// --- SAFE DOM PATCHES (run AFTER render) ---
function safeRun(fn) {
  try {
    fn();
  } catch (e) {
    console.warn("Non-critical patch failed:", e);
  }
}

const ADMIN_RECOVERY_EMAILS = new Set([
  "jeromemirabuenos62@gmail.com",
  "lifetalkministry@gmail.com",
]);

async function isCurrentUserAdmin() {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) return false;

    const email = String(user.email || "").trim().toLowerCase();
    if (ADMIN_RECOVERY_EMAILS.has(email)) return true;

    const { data } = await supabase
      .from("profiles")
      .select("role, plan, email")
      .eq("id", user.id)
      .maybeSingle();

    const role = String(data?.role || "").trim().toLowerCase();
    const plan = String(data?.plan || "").trim().toLowerCase();
    const profileEmail = String(data?.email || "").trim().toLowerCase();

    return role === "admin" || plan === "admin" || ADMIN_RECOVERY_EMAILS.has(profileEmail);
  } catch (error) {
    console.warn("Admin check skipped:", error);
    return false;
  }
}

function findCardByText(label) {
  const needle = String(label || "").trim().toLowerCase();
  if (!needle) return null;

  const candidates = Array.from(document.querySelectorAll("button, a, div"));
  const match = candidates.find((element) =>
    String(element.textContent || "").trim().toLowerCase().includes(needle)
  );

  if (!match) return null;

  return (
    match.closest("button") ||
    match.closest("a") ||
    match.closest(".theme-panel-card") ||
    match.closest(".launcher-card") ||
    match.closest("[class*='rounded']") ||
    match
  );
}

function buildAdminSettingsButton(referenceCard) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = "clara-settings-admin-shortcut";
  button.setAttribute("aria-label", "Open admin panel from settings");

  button.className = referenceCard?.className || "theme-panel-card";
  button.style.width = "100%";
  button.style.display = "flex";
  button.style.alignItems = "center";
  button.style.gap = "14px";
  button.style.marginTop = "12px";
  button.style.padding = "16px";
  button.style.borderRadius = "22px";
  button.style.border = "1px solid color-mix(in srgb, var(--theme-accent) 28%, transparent)";
  button.style.background = "linear-gradient(180deg, color-mix(in srgb, var(--theme-card) 94%, transparent), color-mix(in srgb, var(--theme-card-alt) 94%, transparent))";
  button.style.color = "white";
  button.style.boxShadow = "0 18px 48px rgba(0, 0, 0, 0.22)";

  button.innerHTML = `
    <div style="width:44px;height:44px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(16,185,129,.14);border:1px solid rgba(45,246,222,.18);color:var(--theme-accent);flex-shrink:0;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
    </div>
    <div style="min-width:0;flex:1;text-align:left;">
      <p style="margin:0;font-size:14px;font-weight:800;color:white;">Admin Panel</p>
      <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,.52);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Manage users, access, and CLARA controls...</p>
    </div>
    <span style="border-radius:999px;border:1px solid rgba(45,246,222,.18);background:rgba(16,185,129,.12);padding:4px 10px;font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--theme-accent);">ADMIN</span>
  `;

  button.addEventListener("click", () => {
    window.location.hash = "#/admin";
  });

  return button;
}

function installSettingsAdminShortcutPatch() {
  let disposed = false;
  let observer = null;
  let debounceTimer = null;
  let adminCache = null;

  const apply = async () => {
    if (disposed) return;

    const hash = String(window.location.hash || "").toLowerCase();
    const isSettingsPage = hash.includes("/settings");

    const existing = document.getElementById("clara-settings-admin-shortcut");
    if (!isSettingsPage) {
      existing?.remove();
      return;
    }

    if (adminCache === null) {
      adminCache = await isCurrentUserAdmin();
    }

    if (!adminCache) {
      existing?.remove();
      return;
    }

    if (existing) return;

    const aboutCard = findCardByText("About CLARA");
    const logoutCard = findCardByText("Log out");
    const referenceCard = aboutCard || logoutCard;
    if (!referenceCard?.parentElement) return;

    const adminButton = buildAdminSettingsButton(referenceCard);

    if (aboutCard?.parentElement) {
      aboutCard.insertAdjacentElement("afterend", adminButton);
      return;
    }

    if (logoutCard?.parentElement) {
      logoutCard.insertAdjacentElement("beforebegin", adminButton);
    }
  };

  const scheduleApply = () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      apply().catch((error) => console.warn("Admin settings shortcut skipped:", error));
    }, 160);
  };

  window.addEventListener("hashchange", scheduleApply);
  observer = new MutationObserver(scheduleApply);
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleApply();

  return () => {
    disposed = true;
    window.clearTimeout(debounceTimer);
    window.removeEventListener("hashchange", scheduleApply);
    observer?.disconnect();
  };
}

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

// Delay non-critical scripts to avoid blocking render
setTimeout(() => {
  safeRun(() => {
    if (typeof installDashboardSettingsShortcutPatch === "function") {
      installDashboardSettingsShortcutPatch();
    }
  });

  safeRun(() => {
    if (typeof installSettingsLogoutButtonPatch === "function") {
      installSettingsLogoutButtonPatch();
    }
  });

  safeRun(() => {
    installSettingsAdminShortcutPatch();
  });
}, 500);
