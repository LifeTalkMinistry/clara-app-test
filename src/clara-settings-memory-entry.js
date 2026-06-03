const ENTRY_ID = "clara-settings-memory-entry";
const PROFILE_ENTRY_ID = "clara-profile-memory-entry";

function openEditableMemoryBoard(cabinetName = "Spending Memory") {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent("clara:open-assistant-memory-board", {
      detail: { cabinetName, source: "settings" },
    })
  );

  if (typeof document === "undefined") return;

  const memoryTrigger = document.createElement("button");
  memoryTrigger.type = "button";
  memoryTrigger.textContent = "Memory";
  memoryTrigger.setAttribute("aria-hidden", "true");
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

function updateMemoryRowContent(button) {
  const paragraphs = Array.from(button.querySelectorAll("p"));
  if (paragraphs[0]) paragraphs[0].textContent = "Memory";
  if (paragraphs[1]) paragraphs[1].textContent = "Saved context, patterns, and AI memory";

  const badge = Array.from(button.querySelectorAll("span")).find((span) =>
    ["Safe", "Edit", "On", "Off", "Help", "Info", "Free", "Limited", "Active"].includes(
      span.textContent?.trim()
    )
  );

  if (badge) badge.textContent = "Review";

  const iconHost = button.querySelector("div svg")?.parentElement;
  if (iconHost) iconHost.innerHTML = memoryIconSvg();

  button.setAttribute("aria-label", "Open CLARA editable memory board");
}

function createStandaloneMemorySection(id = PROFILE_ENTRY_ID) {
  const section = document.createElement("section");
  section.id = id;
  section.className = "space-y-2";
  section.innerHTML = `
    <button
      type="button"
      class="group flex w-full items-center gap-3 rounded-[24px] border border-white/15 bg-white/[0.045] px-4 py-4 text-left shadow-[0_12px_30px_rgba(0,0,0,0.13)] transition hover:bg-white/[0.07]"
      aria-label="Open CLARA editable memory board"
    >
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
    </button>
  `;

  section.querySelector("button")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openEditableMemoryBoard();
  });

  return section;
}

function findAccountSection() {
  if (typeof document === "undefined") return null;

  const securityRow = Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Security & privacy")
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
  if (!match) return;

  const { section, securityRow } = match;
  if (section.querySelector(`#${ENTRY_ID}`)) return;

  document.getElementById(ENTRY_ID)?.remove();

  const rowContainer = securityRow.parentElement;
  if (!rowContainer) return;

  const memoryRow = securityRow.cloneNode(true);
  memoryRow.id = ENTRY_ID;
  memoryRow.type = "button";
  memoryRow.style.display = "";
  updateMemoryRowContent(memoryRow);

  memoryRow.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openEditableMemoryBoard();
  });

  rowContainer.appendChild(memoryRow);
}

function findProfileFormCard() {
  const saveButton = Array.from(document.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Save profile")
  );

  let current = saveButton;
  while (current?.parentElement) {
    current = current.parentElement;
    const className = String(current.className || "");
    if (className.includes("rounded-[28px]") || className.includes("rounded-[30px]")) {
      return current;
    }
  }

  return null;
}

function isProfileInformationPage() {
  return Array.from(document.querySelectorAll("h2, p, button")).some((node) =>
    node.textContent?.trim() === "Profile information"
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

if (typeof window !== "undefined") {
  installMemoryEntryPoints();

  const observer = new MutationObserver(installMemoryEntryPoints);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
