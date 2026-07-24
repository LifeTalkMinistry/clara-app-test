const ENTRY_ID = "clara-settings-memory-entry";
const PROFILE_ENTRY_ID = "clara-profile-memory-entry";
const SETTINGS_VIEW_SYNC_EVENT = "clara:settings-view-synced";

function openEditableMemoryBoard(cabinetName = "Spending Memory") {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("clara:open-assistant-memory-board", {
      detail: { cabinetName, source: "settings" },
    })
  );

  if (typeof document === "undefined") return;

  // Prefer the real assistant Memory tab when it is already mounted.
  const mountedMemoryTab = document.querySelector(
    'button[data-clara-memory-tab="true"]'
  );
  if (mountedMemoryTab) {
    mountedMemoryTab.click();
    return;
  }

  // The assistant Memory controller uses a global click capture so Settings can
  // still open the memory board even while the assistant dock itself is closed.
  // Keep this isolated fallback here instead of cloning or mutating another
  // Settings control.
  const memoryTrigger = document.createElement("button");
  memoryTrigger.type = "button";
  memoryTrigger.textContent = "Memory";
  memoryTrigger.setAttribute("aria-hidden", "true");
  memoryTrigger.tabIndex = -1;
  memoryTrigger.style.position = "fixed";
  memoryTrigger.style.left = "-9999px";
  memoryTrigger.style.top = "-9999px";
  document.body.appendChild(memoryTrigger);
  memoryTrigger.click();
  memoryTrigger.remove();
}

function memoryIconSvg() {
  return `
    <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 5.75A3.25 3.25 0 0 0 5.75 9v.15A3.25 3.25 0 0 0 4 12.03c0 1.34.8 2.5 1.95 3.02A3.75 3.75 0 0 0 9.65 19H10V5.75H9Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M15 5.75A3.25 3.25 0 0 1 18.25 9v.15A3.25 3.25 0 0 1 20 12.03c0 1.34-.8 2.5-1.95 3.02A3.75 3.75 0 0 1 14.35 19H14V5.75h1Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10 9.5H8.2M14 9.5h1.8M10 14.5H8.1M14 14.5h1.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>
  `;
}

function createMemoryButton(id = ENTRY_ID) {
  const button = document.createElement("button");
  button.id = id;
  button.type = "button";
  button.className =
    "group flex w-full items-center gap-3 rounded-[24px] border border-white/15 bg-white/[0.045] px-4 py-4 text-left shadow-[0_12px_30px_rgba(0,0,0,0.13)] transition hover:bg-white/[0.07]";
  button.setAttribute("aria-label", "Open CLARA editable memory board");
  button.innerHTML = `
    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/8 text-white/65 group-hover:text-white">
      ${memoryIconSvg()}
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-bold text-white">Memory</p>
      <p class="mt-1 truncate text-xs text-white/45">Saved context, patterns, and AI memory</p>
    </div>
    <span class="max-w-[96px] shrink-0 truncate rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-[10px] font-bold text-white/55">Review</span>
    <svg class="h-4 w-4 shrink-0 text-white/30 transition group-hover:translate-x-0.5 group-hover:text-white/55" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openEditableMemoryBoard();
  });
  return button;
}

function createStandaloneMemorySection(id = PROFILE_ENTRY_ID) {
  const section = document.createElement("section");
  section.id = id;
  section.className = "space-y-2";
  section.appendChild(createMemoryButton(`${id}-button`));
  return section;
}

function findAccountSection() {
  if (typeof document === "undefined") return null;

  const activeSettingsNav = document.querySelector(
    '.theme-page-shell button[aria-label="Settings"][aria-current="page"]'
  );
  const shell = activeSettingsNav?.closest(".theme-page-shell");
  const settingsRoot = shell?.querySelector(
    ".clara-dashboard-content .space-y-5.pb-6"
  );
  if (!settingsRoot) return null;

  const securityRow = Array.from(settingsRoot.querySelectorAll("button")).find(
    (button) => button.textContent?.includes("Security & privacy")
  );

  const section = securityRow?.closest("section");
  if (!section) return null;

  const label = section.querySelector("p")?.textContent?.trim()?.toLowerCase();
  if (label !== "account") return null;

  return { section, securityRow };
}

function installSettingsOverviewMemoryEntry() {
  if (typeof document === "undefined") return;

  const match = findAccountSection();
  if (!match) {
    document.getElementById(ENTRY_ID)?.remove();
    return;
  }

  const { securityRow } = match;
  if (document.getElementById(ENTRY_ID)) return;

  const rowContainer = securityRow.parentElement;
  if (!rowContainer) return;

  // Build Memory as its own Settings control. Do not clone Security & privacy;
  // cloned rows silently inherit structure, classes, and future behavior that do
  // not belong to Memory.
  rowContainer.appendChild(createMemoryButton(ENTRY_ID));
}

function findProfileFormCard() {
  const saveButton = Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Save profile")
  );

  let current = saveButton;
  while (current?.parentElement) {
    current = current.parentElement;
    const className = String(current.className || "");
    if (
      className.includes("rounded-[28px]") ||
      className.includes("rounded-[30px]")
    ) {
      return current;
    }
  }

  return null;
}

function isProfileInformationPage() {
  return Array.from(document.querySelectorAll("h2, p, button")).some(
    (node) => node.textContent?.trim() === "Profile information"
  );
}

function installProfileMemoryEntry() {
  if (typeof document === "undefined") return;
  if (!isProfileInformationPage()) {
    document.getElementById(PROFILE_ENTRY_ID)?.remove();
    return;
  }

  if (document.getElementById(PROFILE_ENTRY_ID)) return;

  const profileFormCard = findProfileFormCard();
  if (!profileFormCard?.parentElement) return;

  const memorySection = createStandaloneMemorySection(PROFILE_ENTRY_ID);
  profileFormCard.insertAdjacentElement("afterend", memorySection);
}

function installMemoryEntryPoints() {
  installSettingsOverviewMemoryEntry();
  installProfileMemoryEntry();
}

function scheduleMemoryEntrySync() {
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(installMemoryEntryPoints);
}

if (typeof window !== "undefined") {
  window.addEventListener(SETTINGS_VIEW_SYNC_EVENT, scheduleMemoryEntrySync);
  window.addEventListener("pageshow", scheduleMemoryEntrySync);
  scheduleMemoryEntrySync();
}
