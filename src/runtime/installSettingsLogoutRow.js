import { signOutFromClaraBackend } from "@/lib/clara-backend-client";

const LOGOUT_ROW_ATTRIBUTE = "data-clara-settings-logout-row";
const LOGOUT_SOURCE_ATTRIBUTE = "data-clara-settings-logout-source";
const STYLE_ID = "clara-settings-logout-row-style";

const logoutIcon = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>`;

const chevronIcon = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>`;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    body.clara-settings-active [${LOGOUT_SOURCE_ATTRIBUTE}] {
      display: none !important;
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}] {
      min-height: 4.55rem;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border: 0;
      border-top: 1px solid rgba(251, 113, 133, 0.14);
      border-radius: 0;
      background: linear-gradient(110deg, rgba(244, 63, 94, 0.055), rgba(124, 58, 237, 0.025));
      color: rgba(255,255,255,0.92);
      text-align: left;
      cursor: pointer;
      transition: background 160ms ease, opacity 160ms ease;
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}]:hover {
      background: linear-gradient(110deg, rgba(244, 63, 94, 0.095), rgba(124, 58, 237, 0.04));
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}]:disabled {
      cursor: wait;
      opacity: 0.58;
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}] .clara-settings-logout-icon {
      width: 2.75rem;
      height: 2.75rem;
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(251, 113, 133, 0.2);
      border-radius: 1rem;
      background: rgba(244, 63, 94, 0.085);
      color: rgba(254, 205, 211, 0.82);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.045);
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}] .clara-settings-logout-icon svg {
      width: 1.15rem;
      height: 1.15rem;
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}] .clara-settings-logout-copy {
      min-width: 0;
      flex: 1 1 auto;
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}] .clara-settings-logout-title {
      display: block;
      margin: 0;
      color: rgba(255,255,255,0.93);
      font-size: 0.875rem;
      font-weight: 800;
      line-height: 1.25rem;
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}] .clara-settings-logout-description {
      display: block;
      margin: 0.25rem 0 0;
      overflow: hidden;
      color: rgba(203,213,225,0.48);
      font-size: 0.75rem;
      line-height: 1rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}] .clara-settings-logout-chevron {
      width: 1rem;
      height: 1rem;
      flex: 0 0 auto;
      color: rgba(226,232,240,0.27);
    }

    body.clara-settings-active [${LOGOUT_ROW_ATTRIBUTE}] .clara-settings-logout-chevron svg {
      width: 100%;
      height: 100%;
    }
  `;
  document.head.appendChild(style);
}

function directSectionLabel(section) {
  const label = Array.from(section?.children || []).find(
    (child) => child?.tagName === "P"
  );
  return label?.textContent?.trim()?.toLowerCase() || "";
}

function findSettingsOverview() {
  return Array.from(document.querySelectorAll("#root .space-y-5.pb-6")).find((root) =>
    Array.from(root.children || []).some(
      (child) => child?.tagName === "SECTION" && directSectionLabel(child) === "program"
    )
  );
}

function findOriginalLogoutButton(settingsRoot) {
  return Array.from(settingsRoot?.querySelectorAll("button") || []).find((button) => {
    if (button.hasAttribute(LOGOUT_ROW_ATTRIBUTE)) return false;
    const text = button.textContent?.trim()?.toLowerCase() || "";
    return text === "log out" || text === "logging out...";
  });
}

function hideStandaloneLogoutSource(settingsRoot, programSection) {
  const originalButton = findOriginalLogoutButton(settingsRoot);
  const originalSection = originalButton?.closest("section");

  if (
    originalSection &&
    originalSection !== programSection &&
    originalSection.parentElement === settingsRoot
  ) {
    originalSection.setAttribute(LOGOUT_SOURCE_ATTRIBUTE, "true");
    originalSection.style.setProperty("display", "none", "important");
  }

  return originalButton;
}

function buildLogoutRow(settingsRoot) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(LOGOUT_ROW_ATTRIBUTE, "true");
  button.setAttribute("aria-label", "Log out of CLARA");
  button.innerHTML = `
    <span class="clara-settings-logout-icon">${logoutIcon}</span>
    <span class="clara-settings-logout-copy">
      <span class="clara-settings-logout-title">Log out</span>
      <span class="clara-settings-logout-description">Sign out of this CLARA account</span>
    </span>
    <span class="clara-settings-logout-chevron">${chevronIcon}</span>
  `;

  button.addEventListener("click", async () => {
    if (button.disabled) return;
    button.disabled = true;
    const title = button.querySelector(".clara-settings-logout-title");
    if (title) title.textContent = "Logging out...";

    const originalButton = findOriginalLogoutButton(settingsRoot);
    if (originalButton) {
      originalButton.click();
      return;
    }

    try {
      await signOutFromClaraBackend();
    } finally {
      window.setTimeout(() => window.location.reload(), 80);
    }
  });

  return button;
}

function ensureLogoutRow() {
  if (!document.body?.classList.contains("clara-settings-active")) return;

  installStyles();

  const settingsRoot = findSettingsOverview();
  if (!settingsRoot) return;

  const programSection = Array.from(settingsRoot.children || []).find(
    (child) => child?.tagName === "SECTION" && directSectionLabel(child) === "program"
  );
  const programRows = programSection?.querySelector(":scope > .space-y-2\\.5");
  if (!programRows) return;

  hideStandaloneLogoutSource(settingsRoot, programSection);

  if (programRows.querySelector(`[${LOGOUT_ROW_ATTRIBUTE}]`)) return;

  const nativeLogoutInsideProgram = Array.from(programRows.querySelectorAll("button")).some((button) => {
    const text = button.textContent?.trim()?.toLowerCase() || "";
    return text === "log out" || text === "logging out...";
  });
  if (nativeLogoutInsideProgram) return;

  programRows.appendChild(buildLogoutRow(settingsRoot));
}

let scheduled = false;
function scheduleEnsureLogoutRow() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    ensureLogoutRow();
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleEnsureLogoutRow, { once: true });
  } else {
    scheduleEnsureLogoutRow();
  }

  const observer = new MutationObserver(scheduleEnsureLogoutRow);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"],
  });
}
