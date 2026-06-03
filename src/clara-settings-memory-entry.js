import { removeMemoryFromCabinet } from "@/lib/memory-cabinets";

const ENTRY_ID = "clara-settings-memory-entry";
const PANEL_ID = "clara-memory-review-panel";
const MEMORY_PANEL_FLAG = "CLARA_MEMORY_REVIEW_PANEL";
let memoryEventBridgeInstalled = false;

function enableMemoryPanelAccess() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage?.setItem(MEMORY_PANEL_FLAG, "true");
  } catch {
    // Ignore storage errors. The settings card can still try the existing opener.
  }
}

function openExistingMemoryPanel(cabinetName = "Spending Memory") {
  if (typeof window === "undefined") return;

  enableMemoryPanelAccess();

  if (typeof window.openClaraMemoryReviewPanel === "function") {
    window.openClaraMemoryReviewPanel(cabinetName);
    return;
  }

  window.dispatchEvent(
    new CustomEvent("clara:open-memory-review", {
      detail: { cabinetName, source: "settings" },
    })
  );
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

  button.setAttribute("aria-label", "Open CLARA memory review");
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

function installSettingsMemoryEntry() {
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
    openExistingMemoryPanel();
  });

  rowContainer.appendChild(memoryRow);
}

function installMemoryPanelEventBridge() {
  if (memoryEventBridgeInstalled || typeof document === "undefined") return;
  memoryEventBridgeInstalled = true;

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      const panel = target?.closest?.(`#${PANEL_ID}`);
      if (!panel) return;

      const close = target.closest?.("[data-close-memory-review]");
      if (close) {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.getElementById(PANEL_ID)?.remove();
        return;
      }

      const tab = target.closest?.("[data-cabinet-tab]");
      if (tab) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openExistingMemoryPanel(tab.getAttribute("data-cabinet-tab") || "Spending Memory");
        return;
      }

      const memoryRemoval = target.closest?.(".clara-memory-review-delete");
      if (memoryRemoval) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const id = memoryRemoval.getAttribute("data-memory-id");
        const cabinetName = memoryRemoval.getAttribute("data-cabinet-name");

        if (id && cabinetName) removeMemoryFromCabinet(cabinetName, id);
        openExistingMemoryPanel(cabinetName || "Spending Memory");
      }
    },
    true
  );
}

if (typeof window !== "undefined") {
  installMemoryPanelEventBridge();
  installSettingsMemoryEntry();

  const observer = new MutationObserver(installSettingsMemoryEntry);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
