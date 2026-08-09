let installed = false;

const SHORTCUT_ATTR = "data-clara-profile-edit-shortcut";

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
    const hasProfileMedia = Boolean(
      section.querySelector('button[aria-label="View profile photo"], button[aria-label="View cover photo"]')
    );
    return hasProfileMedia && text.includes("Community Member");
  }) || null;
}

function findHeroBody(hero) {
  if (!hero) return null;
  return Array.from(hero.children).find((child) => {
    const className = String(child.className || "");
    return className.includes("relative") && className.includes("px-5") && className.includes("pb-5");
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

function removeShortcut() {
  document.querySelector(`[${SHORTCUT_ATTR}]`)?.remove();
}

function syncShortcut() {
  const editButton = findOwnProfileEditButton();
  const existing = document.querySelector(`[${SHORTCUT_ATTR}]`);

  // The normal Edit button only exists on the owner's profile while not editing.
  // If it disappears, the shortcut must disappear too (editing mode / other profile / route change).
  if (!editButton) {
    existing?.remove();
    return;
  }

  const hero = findProfileHero(editButton);
  const heroBody = findHeroBody(hero);
  if (!heroBody) {
    existing?.remove();
    return;
  }

  if (existing && existing.parentElement === heroBody) return;
  existing?.remove();

  const shortcut = document.createElement("button");
  shortcut.type = "button";
  shortcut.setAttribute(SHORTCUT_ATTR, "true");
  shortcut.setAttribute("aria-label", "Edit full profile");
  shortcut.title = "Edit profile";
  shortcut.innerHTML = pencilIcon();
  shortcut.className = "absolute z-30 flex items-center justify-center rounded-full border border-[#76fff7]/55 bg-[#0d5360] text-[#d9fffc] shadow-[0_6px_18px_rgba(0,0,0,0.34)] backdrop-blur-md transition active:scale-95";
  shortcut.style.width = "34px";
  shortcut.style.height = "34px";
  shortcut.style.left = "88px";
  shortcut.style.top = "-3px";
  shortcut.style.cursor = "pointer";
  shortcut.style.background = "linear-gradient(145deg, rgba(15,118,110,.98), rgba(17,94,105,.98))";

  shortcut.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const currentEditButton = findOwnProfileEditButton();
    if (currentEditButton) currentEditButton.click();
  });

  heroBody.appendChild(shortcut);
}

export function installCommunityProfileEditShortcut() {
  if (installed || typeof window === "undefined" || typeof document === "undefined") return;
  installed = true;

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
    observer.observe(document.body, { childList: true, subtree: true });
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
