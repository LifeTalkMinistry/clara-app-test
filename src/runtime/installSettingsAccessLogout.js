import {
  clearHiddenAdminSession,
  clearIosAccessSession,
} from "@/lib/ios-access-client";
import { supabase } from "@/lib/supabaseClient";

const LOGOUT_CONTAINER_ID = "clara-settings-access-logout";
const COMPACT_OVERVIEW_CLASS = "clara-settings-compact-overview";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findAboutClaraRow() {
  return [...document.querySelectorAll("button")].find((button) =>
    normalizeText(button.textContent).includes("About CLARA")
  );
}

function compactSettingsOverview(overviewRoot) {
  if (!overviewRoot) return;

  overviewRoot.classList.add(COMPACT_OVERVIEW_CLASS);
  overviewRoot.style.marginTop = "-20px";
  overviewRoot.style.paddingBottom = "8px";

  [...overviewRoot.querySelectorAll(":scope > section")].forEach((section) => {
    section.style.marginTop = "14px";
  });

  [...overviewRoot.querySelectorAll(":scope > section button")].forEach((button) => {
    button.style.paddingTop = "13px";
    button.style.paddingBottom = "13px";
  });
}

function createLogoutControl() {
  const container = document.createElement("div");
  container.id = LOGOUT_CONTAINER_ID;
  container.className = "mt-2 space-y-1 pb-4";

  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "flex min-h-14 w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/25 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_34%),rgba(244,63,94,0.10)] px-4 py-4 text-sm font-black text-rose-100 shadow-[0_14px_40px_rgba(244,63,94,0.10)] transition hover:bg-rose-500/18 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-55";
  button.setAttribute("aria-label", "Log out of CLARA");
  button.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
      <polyline points="16 17 21 12 16 7"></polyline>
      <line x1="21" x2="9" y1="12" y2="12"></line>
    </svg>
    <span>Log out</span>
  `;

  const note = document.createElement("p");
  note.className = "px-2 text-center text-[10px] font-semibold leading-4 text-white/55";
  note.textContent =
    "Your financial records stay on this device. Enter your CLARA access again anytime.";

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    button.disabled = true;
    const label = button.querySelector("span");
    if (label) label.textContent = "Logging out...";

    clearIosAccessSession();
    clearHiddenAdminSession();

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("CLARA Settings logout could not clear the compatibility session:", error);
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 80);
  });

  container.append(button, note);
  return container;
}

function syncSettingsLogoutControl() {
  const existing = document.getElementById(LOGOUT_CONTAINER_ID);
  const aboutRow = findAboutClaraRow();

  if (!aboutRow) {
    existing?.remove();
    return;
  }

  const programSection = aboutRow.closest("section");
  if (!programSection) {
    existing?.remove();
    return;
  }

  const overviewRoot = programSection.parentElement;
  compactSettingsOverview(overviewRoot);

  if (existing?.previousElementSibling === programSection) return;

  existing?.remove();
  programSection.insertAdjacentElement("afterend", createLogoutControl());
}

export function installSettingsAccessLogout() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraSettingsAccessLogoutInstalled) return;

  window.__claraSettingsAccessLogoutInstalled = true;

  const start = () => {
    const root = document.getElementById("root");
    if (!root) return;

    let syncQueued = false;
    const queueSync = () => {
      if (syncQueued) return;
      syncQueued = true;
      window.requestAnimationFrame(() => {
        syncQueued = false;
        syncSettingsLogoutControl();
      });
    };

    const observer = new MutationObserver(queueSync);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    window.addEventListener("hashchange", queueSync);
    window.addEventListener("popstate", queueSync);
    queueSync();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
