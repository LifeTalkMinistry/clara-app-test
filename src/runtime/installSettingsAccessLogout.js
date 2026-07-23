import {
  clearHiddenAdminSession,
  clearIosAccessSession,
} from "@/lib/ios-access-client";
import { supabase } from "@/lib/supabaseClient";

const LOGOUT_CONTAINER_ID = "clara-settings-access-logout";
const COMPACT_OVERVIEW_CLASS = "clara-settings-compact-overview";
const SETTINGS_ACTIVE_NAV_SELECTOR =
  '.theme-page-shell button[aria-label="Settings"][aria-current="page"]';
const SETTINGS_VIEW_SYNC_EVENT = "clara:settings-view-synced";
const TOP_NAV_LABELS = new Set(["Home", "Me", "Schedule", "Settings"]);

let scheduledFrame = null;

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getActiveSettingsContext() {
  if (typeof document === "undefined") return null;

  const activeSettingsNav = document.querySelector(SETTINGS_ACTIVE_NAV_SELECTOR);
  const shell = activeSettingsNav?.closest(".theme-page-shell");
  if (!shell) return null;

  const contentRoot = shell.querySelector(".clara-dashboard-content");
  const detailRoot = contentRoot?.querySelector(".min-h-full.space-y-4.pb-6") || null;
  const overviewRoot = detailRoot
    ? null
    : contentRoot?.querySelector(".space-y-5.pb-6") || null;
  const viewRoot = detailRoot || overviewRoot;
  const scrollOwner = viewRoot?.closest(".overflow-y-auto") || null;
  const detailTitle = detailRoot?.querySelector("h2")?.textContent?.trim() || "detail";
  const viewKey = detailRoot ? `detail:${detailTitle}` : overviewRoot ? "overview" : "settings";

  return {
    activeSettingsNav,
    shell,
    contentRoot,
    detailRoot,
    overviewRoot,
    viewRoot,
    scrollOwner,
    viewKey,
  };
}

function findAboutClaraRow(overviewRoot) {
  if (!overviewRoot) return null;

  return [...overviewRoot.querySelectorAll("button")].find((button) =>
    normalizeText(button.textContent).includes("About CLARA")
  );
}

function compactSettingsOverview(overviewRoot) {
  if (!overviewRoot || overviewRoot.classList.contains(COMPACT_OVERVIEW_CLASS)) return;

  overviewRoot.classList.add(COMPACT_OVERVIEW_CLASS);
  overviewRoot.style.marginTop = "-8px";
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

function syncLogoutControl(overviewRoot) {
  const existing = document.getElementById(LOGOUT_CONTAINER_ID);
  const aboutRow = findAboutClaraRow(overviewRoot);

  if (!aboutRow) {
    existing?.remove();
    return;
  }

  const programSection = aboutRow.closest("section");
  if (!programSection) {
    existing?.remove();
    return;
  }

  if (existing?.previousElementSibling === programSection) return;

  existing?.remove();
  programSection.insertAdjacentElement("afterend", createLogoutControl());
}

function publishSettingsView(context) {
  window.dispatchEvent(
    new CustomEvent(SETTINGS_VIEW_SYNC_EVENT, {
      detail: context || {
        viewKey: "",
        viewRoot: null,
        scrollOwner: null,
        overviewRoot: null,
        detailRoot: null,
      },
    })
  );
}

function syncSettingsExperience() {
  scheduledFrame = null;

  const context = getActiveSettingsContext();
  document.body?.classList.toggle("clara-settings-active", Boolean(context));

  if (!context) {
    document.getElementById(LOGOUT_CONTAINER_ID)?.remove();
    publishSettingsView(null);
    return;
  }

  if (context.overviewRoot) {
    compactSettingsOverview(context.overviewRoot);
    syncLogoutControl(context.overviewRoot);
  }

  publishSettingsView(context);
}

function scheduleSettingsSync() {
  if (scheduledFrame !== null || typeof window === "undefined") return;

  scheduledFrame = window.requestAnimationFrame(syncSettingsExperience);
}

function handleDocumentClick(event) {
  const button = event.target?.closest?.("button");
  if (!button) return;

  const navLabel = button.getAttribute("aria-label");
  const context = getActiveSettingsContext();
  const isTopNavigationButton = TOP_NAV_LABELS.has(navLabel);
  const isInsideSettings = Boolean(
    context?.contentRoot?.contains(button) || context?.viewRoot?.contains(button)
  );

  if (isTopNavigationButton || isInsideSettings) scheduleSettingsSync();
}

function handleVisibilityChange() {
  if (!document.hidden) scheduleSettingsSync();
}

export function installSettingsAccessLogout() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraSettingsAccessLogoutInstalled) return;

  window.__claraSettingsAccessLogoutInstalled = true;

  document.addEventListener("click", handleDocumentClick, true);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("hashchange", scheduleSettingsSync);
  window.addEventListener("popstate", scheduleSettingsSync);
  window.addEventListener("pageshow", scheduleSettingsSync);
  window.addEventListener("resize", scheduleSettingsSync, { passive: true });

  scheduleSettingsSync();
}
