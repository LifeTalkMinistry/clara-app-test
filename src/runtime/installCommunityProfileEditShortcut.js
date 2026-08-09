let installed = false;

const SHORTCUT_ATTR = "data-clara-profile-edit-shortcut";
const SHORTCUT_ROW_ATTR = "data-clara-profile-edit-shortcut-row";
const PROFILE_CLARITY_STYLE_ID = "clara-community-profile-image-clarity";

function ensureProfileImageClarityStyles() {
  if (document.getElementById(PROFILE_CLARITY_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = PROFILE_CLARITY_STYLE_ID;
  style.textContent = `
    /* The global CLARA atmosphere is useful on cards, but it sits above user
       artwork. Disable only that wash while the Community profile is open. */
    body:has(.clara-community-profile-view)::before,
    body:has(.clara-community-profile-view)::after {
      opacity: 0 !important;
    }

    .clara-community-profile-view button[aria-label="View cover photo"] {
      opacity: 1 !important;
      filter: none !important;
      background-blend-mode: normal !important;
    }

    .clara-community-profile-view button[aria-label="View profile photo"] img {
      opacity: 1 !important;
      filter: none !important;
    }
  `;
  document.head.appendChild(style);
}

function syncProfileImageClarity() {
  ensureProfileImageClarityStyles();

  document.querySelectorAll('button[aria-label="View cover photo"]').forEach((button) => {
    const inlineBackground = button.style.getPropertyValue("background-image");
    const urlStart = inlineBackground.indexOf("url(");
    if (urlStart < 0) return;

    // React historically rendered the saved cover as:
    // gradient overlay + url(...). The gradient made real artwork look faded.
    // Keep only the user's actual image and promote it over the legacy
    // !important fallback cover supplied by the Community theme.
    const coverOnly = inlineBackground.slice(urlStart).trim();
    if (
      inlineBackground !== coverOnly ||
      button.style.getPropertyPriority("background-image") !== "important"
    ) {
      button.style.setProperty("background-image", coverOnly, "important");
    }

    button.style.setProperty("background-blend-mode", "normal", "important");
    button.style.setProperty("filter", "none", "important");
    button.style.setProperty("opacity", "1", "important");
  });

  document.querySelectorAll('button[aria-label="View profile photo"] img').forEach((image) => {
    // Profile artwork should preserve the exact uploaded colors. The surrounding
    // CLARA card provides the visual treatment; the image itself stays untouched.
    image.style.setProperty("filter", "none", "important");
    image.style.setProperty("opacity", "1", "important");
  });
}

function findOwnProfileEditButton() {
  return Array.from(document.querySelectorAll("header button")).find(
    (button) => String(button.textContent || "").trim() === "Edit"
  ) || null;
}

function findProfileHero(editButton) {
  if (!editButton) return null;
  const root = editButton.closest("div.min-h-screen") || document;

  return Array.from(root.querySelectorAll("section")).find((section) => {
    const text = String(section.textContent || "");
    return text.includes("Community Member") && Boolean(section.querySelector("h2"));
  }) || null;
}

function findHeroBody(hero) {
  if (!hero) return null;
  return Array.from(hero.children).find((child) => {
    const className = String(child.className || "");
    return className.includes("relative") && className.includes("px-5") && className.includes("pb-5");
  }) || null;
}

function findAvatarRow(heroBody) {
  if (!heroBody) return null;
  return Array.from(heroBody.children).find((child) => {
    const className = String(child.className || "");
    return className.includes("-mt-12") && className.includes("flex") && className.includes("items-end");
  }) || null;
}

function pencilIcon() {
  return `
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  `;
}

function restoreShortcutRow() {
  const row = document.querySelector(`[${SHORTCUT_ROW_ATTR}]`);
  if (!row) return;
  row.style.removeProperty("justify-content");
  row.removeAttribute(SHORTCUT_ROW_ATTR);
}

function removeShortcut() {
  document.querySelector(`[${SHORTCUT_ATTR}]`)?.remove();
  restoreShortcutRow();
}

function syncShortcut() {
  syncProfileImageClarity();

  const editButton = findOwnProfileEditButton();
  const existing = document.querySelector(`[${SHORTCUT_ATTR}]`);

  // The normal Edit button only exists on the owner's profile while not editing.
  // If it disappears, the shortcut must disappear too (editing mode / other profile / route change).
  if (!editButton) {
    removeShortcut();
    return;
  }

  const hero = findProfileHero(editButton);
  const heroBody = findHeroBody(hero);
  const avatarRow = findAvatarRow(heroBody);
  if (!avatarRow) {
    removeShortcut();
    return;
  }

  if (existing && existing.parentElement === avatarRow) return;
  removeShortcut();

  const shortcut = document.createElement("button");
  shortcut.type = "button";
  shortcut.setAttribute(SHORTCUT_ATTR, "true");
  shortcut.setAttribute("aria-label", "Edit full profile");
  shortcut.title = "Edit profile";
  shortcut.innerHTML = pencilIcon();
  shortcut.className = "z-30 inline-flex shrink-0 items-center justify-center rounded-full border border-[#76fff7]/45 bg-[#0d5360] text-[#d9fffc] shadow-[0_8px_20px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-[#8ffff8]/70 hover:bg-[#126573] active:scale-95";
  shortcut.style.width = "34px";
  shortcut.style.height = "34px";
  shortcut.style.marginLeft = "10px";
  shortcut.style.marginBottom = "6px";
  shortcut.style.cursor = "pointer";
  shortcut.style.background = "linear-gradient(145deg, rgba(15,83,96,.96), rgba(17,66,84,.96))";

  shortcut.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const currentEditButton = findOwnProfileEditButton();
    if (currentEditButton) currentEditButton.click();
  });

  // Keep the pencil as a separate control beside the avatar/initials instead of
  // visually attaching it to the profile photo. This also makes the shortcut
  // available when a member has not uploaded a profile or cover image yet.
  avatarRow.setAttribute(SHORTCUT_ROW_ATTR, "true");
  avatarRow.style.justifyContent = "flex-start";
  avatarRow.appendChild(shortcut);
}

export function installCommunityProfileEditShortcut() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

  ensureProfileImageClarityStyles();

  let frame = 0;
  const scheduleSync = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      syncShortcut();
    });
  };

  const observer = new MutationObserver(scheduleSync);
  const start = () => {
    if (!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "aria-label"],
    });
    scheduleSync();
  };

  window.addEventListener("hashchange", scheduleSync, { passive: true });
  window.addEventListener("popstate", scheduleSync, { passive: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  // Expose a tiny cleanup hook for hot reloads/tests without affecting production behavior.
  window.__claraRemoveCommunityProfileEditShortcut = removeShortcut;
}
