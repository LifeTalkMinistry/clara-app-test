import { clearClaraDeviceData } from "@/lib/clear-clara-device-data";

const SETTINGS_VIEW_SYNC_EVENT = "clara:settings-view-synced";
const LOGOUT_CONTAINER_ID = "clara-settings-access-logout";
const RESET_CONTAINER_ID = "clara-settings-device-reset";
const RESET_MODAL_ID = "clara-settings-device-reset-modal";

function createResetModal() {
  const existing = document.getElementById(RESET_MODAL_ID);
  if (existing) return existing;

  const overlay = document.createElement("div");
  overlay.id = RESET_MODAL_ID;
  overlay.className =
    "fixed inset-0 z-[260] flex items-end justify-center bg-[#020713]/85 p-0 backdrop-blur-sm sm:items-center sm:p-4";
  overlay.setAttribute("role", "presentation");

  const panel = document.createElement("div");
  panel.className =
    "max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-[30px] border border-rose-300/20 bg-[#081321] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.58)] sm:rounded-[30px]";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "clara-device-reset-title");

  const icon = document.createElement("div");
  icon.className =
    "flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-400/10 text-rose-100";
  icon.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="M19 6l-1 14H6L5 6"></path>
      <path d="M10 11v5"></path>
      <path d="M14 11v5"></path>
    </svg>
  `;

  const title = document.createElement("h2");
  title.id = "clara-device-reset-title";
  title.className = "mt-4 text-xl font-black tracking-tight text-white";
  title.textContent = "Clear this device?";

  const description = document.createElement("p");
  description.className = "mt-2 text-sm font-semibold leading-6 text-white/65";
  description.textContent =
    "This permanently removes CLARA data stored on this phone, including the local financial cache, offline changes, settings, login session, app storage, and device notifications.";

  const safeBox = document.createElement("div");
  safeBox.className =
    "mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3";
  safeBox.innerHTML = `
    <p class="text-xs font-black text-emerald-100">Synced account data stays safe.</p>
    <p class="mt-1 text-[11px] font-semibold leading-5 text-emerald-50/65">
      This reset does not send any delete request to the CLARA server or PostgreSQL database.
    </p>
  `;

  const warningBox = document.createElement("div");
  warningBox.className =
    "mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3";
  warningBox.innerHTML = `
    <p class="text-xs font-black text-amber-100">Unsynced changes will be lost.</p>
    <p class="mt-1 text-[11px] font-semibold leading-5 text-amber-50/65">
      Only data that already reached your CLARA account database can be restored after you log in again.
    </p>
  `;

  const label = document.createElement("label");
  label.className = "mt-5 block";
  label.innerHTML = `
    <span class="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Type CLEAR to continue</span>
  `;

  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.autocapitalize = "characters";
  input.spellcheck = false;
  input.placeholder = "CLEAR";
  input.className =
    "mt-2 w-full rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white outline-none placeholder:text-white/20 focus:border-rose-300/35";
  label.appendChild(input);

  const errorText = document.createElement("p");
  errorText.className = "mt-3 hidden text-xs font-bold leading-5 text-rose-200";

  const actions = document.createElement("div");
  actions.className = "mt-5 grid grid-cols-2 gap-3";

  const cancelButton = document.createElement("button");
  cancelButton.type = "button";
  cancelButton.className =
    "min-h-12 rounded-2xl border border-white/15 bg-white/[0.055] px-4 py-3 text-sm font-black text-white/70 transition hover:bg-white/[0.09] active:scale-[0.99]";
  cancelButton.textContent = "Cancel";

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.disabled = true;
  clearButton.className =
    "min-h-12 rounded-2xl border border-rose-300/25 bg-rose-500/15 px-4 py-3 text-sm font-black text-rose-100 transition hover:bg-rose-500/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35";
  clearButton.textContent = "Clear device";

  const close = () => overlay.remove();

  input.addEventListener("input", () => {
    clearButton.disabled = input.value.trim().toUpperCase() !== "CLEAR";
    errorText.classList.add("hidden");
  });

  cancelButton.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  panel.addEventListener("click", (event) => event.stopPropagation());

  clearButton.addEventListener("click", async () => {
    if (input.value.trim().toUpperCase() !== "CLEAR" || clearButton.disabled) return;

    clearButton.disabled = true;
    cancelButton.disabled = true;
    input.disabled = true;
    clearButton.textContent = "Clearing this device...";
    errorText.classList.add("hidden");

    try {
      await clearClaraDeviceData();

      const baseUrl = window.location.href.split("#")[0];
      window.location.replace(`${baseUrl}#/login`);
      window.setTimeout(() => window.location.reload(), 80);
    } catch (error) {
      console.error("[CLARA Device Reset] Device reset failed.", error);
      errorText.textContent =
        "CLARA could not fully clear this device. Nothing was deleted from your synced account. Please try again.";
      errorText.classList.remove("hidden");
      input.disabled = false;
      cancelButton.disabled = false;
      clearButton.textContent = "Clear device";
      clearButton.disabled = input.value.trim().toUpperCase() !== "CLEAR";
    }
  });

  actions.append(cancelButton, clearButton);
  panel.append(icon, title, description, safeBox, warningBox, label, errorText, actions);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  window.setTimeout(() => input.focus(), 50);
  return overlay;
}

function createResetControl() {
  const container = document.createElement("div");
  container.id = RESET_CONTAINER_ID;
  container.className = "mt-2 space-y-1 pb-4";

  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "flex min-h-14 w-full items-center justify-center gap-2 rounded-[24px] border border-rose-300/20 bg-white/[0.035] px-4 py-4 text-sm font-black text-rose-100 transition hover:bg-rose-500/10 active:scale-[0.99]";
  button.setAttribute("aria-label", "Clear CLARA data from this device");
  button.innerHTML = `
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4">
      <path d="M3 6h18"></path>
      <path d="M8 6V4h8v2"></path>
      <path d="M19 6l-1 14H6L5 6"></path>
    </svg>
    <span>Clear this device</span>
  `;

  const note = document.createElement("p");
  note.className = "px-3 text-center text-[10px] font-semibold leading-4 text-white/48";
  note.textContent =
    "Removes local CLARA data from this phone. Synced account data is not deleted.";

  button.addEventListener("click", () => createResetModal());
  container.append(button, note);
  return container;
}

function syncResetControl(event) {
  const overviewRoot = event?.detail?.overviewRoot || null;
  const logoutContainer = document.getElementById(LOGOUT_CONTAINER_ID);
  const existing = document.getElementById(RESET_CONTAINER_ID);

  if (!overviewRoot || !logoutContainer || !overviewRoot.contains(logoutContainer)) {
    existing?.remove();
    return;
  }

  if (existing?.previousElementSibling === logoutContainer) return;

  existing?.remove();
  logoutContainer.insertAdjacentElement("afterend", createResetControl());
}

export function installSettingsDeviceReset() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraSettingsDeviceResetInstalled) return;

  window.__claraSettingsDeviceResetInstalled = true;
  window.addEventListener(SETTINGS_VIEW_SYNC_EVENT, syncResetControl);
  window.addEventListener("pagehide", () => {
    document.getElementById(RESET_MODAL_ID)?.remove();
  });
}

installSettingsDeviceReset();
