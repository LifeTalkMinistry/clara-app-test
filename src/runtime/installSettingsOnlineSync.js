import {
  CLARA_ONLINE_SYNC_POLICY_EVENT,
  isOnlineSyncPaused,
  requestManualOnlineSync,
} from "@/lib/cloud-sync-policy";
import { CLARA_SERVER_FINANCE_SYNC_EVENT } from "@/lib/server-finance-sync";

const SETTINGS_VIEW_SYNC_EVENT = "clara:settings-view-synced";
const LOGOUT_CONTAINER_ID = "clara-settings-access-logout";
const SYNC_CONTAINER_ID = "clara-settings-online-sync";

let lastStatus = null;

function createSyncControl() {
  const paused = isOnlineSyncPaused();
  const container = document.createElement("div");
  container.id = SYNC_CONTAINER_ID;
  container.className = "mb-3 rounded-[24px] border border-white/10 bg-white/[0.035] p-4";

  const header = document.createElement("div");
  header.className = "flex items-start justify-between gap-3";

  const copy = document.createElement("div");
  copy.className = "min-w-0";

  const title = document.createElement("p");
  title.className = "text-sm font-black text-white";
  title.textContent = paused ? "Online sync paused" : "Online sync active";

  const description = document.createElement("p");
  description.className = "mt-1 text-[11px] font-semibold leading-5 text-white/50";
  description.textContent = paused
    ? "This phone is using local data only. Your saved online copy will stay untouched until you choose to sync it."
    : "CLARA keeps this device and your online account in sync.";

  const badge = document.createElement("span");
  badge.className = paused
    ? "shrink-0 rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100"
    : "shrink-0 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100";
  badge.textContent = paused ? "Paused" : "Active";

  copy.append(title, description);
  header.append(copy, badge);

  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15 active:scale-[0.99] disabled:cursor-wait disabled:opacity-45";
  button.innerHTML = paused
    ? "<span>Sync online data</span>"
    : "<span>Sync now</span>";

  if (lastStatus?.state === "syncing") {
    button.disabled = true;
    button.textContent = "Syncing...";
  }

  const status = document.createElement("p");
  status.className = "mt-2 px-1 text-center text-[10px] font-semibold leading-4 text-white/45";

  if (lastStatus?.state === "error") {
    status.className =
      "mt-2 px-1 text-center text-[10px] font-semibold leading-4 text-rose-200";
    status.textContent = lastStatus.error || "CLARA could not sync this device.";
  } else if (lastStatus?.state === "offline") {
    status.className =
      "mt-2 px-1 text-center text-[10px] font-semibold leading-4 text-amber-200";
    status.textContent = "You are offline. Reconnect and try again.";
  } else if (paused) {
    status.textContent = "Logging in does not restore cloud finance data while this is paused.";
  } else if (lastStatus?.state === "synced") {
    status.textContent = "This device is up to date with your online CLARA account.";
  } else {
    status.textContent = "Use Sync now anytime you want to check immediately.";
  }

  button.addEventListener("click", () => {
    const currentlyPaused = isOnlineSyncPaused();
    if (
      currentlyPaused &&
      !window.confirm(
        "Sync your saved online CLARA data to this device? Current local finance data on this phone will be replaced by the saved online copy."
      )
    ) {
      return;
    }

    lastStatus = { state: "syncing" };
    syncControl();
    requestManualOnlineSync({ forcePull: currentlyPaused });
  });

  container.append(header, button, status);
  return container;
}

function syncControl(event) {
  const overviewRoot = event?.detail?.overviewRoot || document;
  const logoutContainer = document.getElementById(LOGOUT_CONTAINER_ID);
  const existing = document.getElementById(SYNC_CONTAINER_ID);

  if (!logoutContainer || !overviewRoot.contains(logoutContainer)) {
    existing?.remove();
    return;
  }

  const replacement = createSyncControl();
  existing?.replaceWith(replacement);
  if (!existing) logoutContainer.insertAdjacentElement("beforebegin", replacement);
}

function handleSyncStatus(event) {
  lastStatus = event?.detail || null;
  syncControl();
}

export function installSettingsOnlineSync() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraSettingsOnlineSyncInstalled) return;

  window.__claraSettingsOnlineSyncInstalled = true;
  window.addEventListener(SETTINGS_VIEW_SYNC_EVENT, syncControl);
  window.addEventListener(CLARA_ONLINE_SYNC_POLICY_EVENT, () => syncControl());
  window.addEventListener(CLARA_SERVER_FINANCE_SYNC_EVENT, handleSyncStatus);
}

installSettingsOnlineSync();
