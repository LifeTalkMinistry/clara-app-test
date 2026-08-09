import {
  backendRequest,
  getStoredBackendToken,
  getStoredBackendUser,
} from "@/lib/clara-backend-client";

const STYLE_ID = "clara-community-real-profile-avatar-style";
const REFRESH_MS = 15000;
let currentProfile = null;
let refreshTimer = null;
let observer = null;
let requestInFlight = null;

function initialsFor(profile) {
  const stored = getStoredBackendUser();
  const source = String(
    profile?.display_name ||
      profile?.full_name ||
      stored?.name ||
      stored?.email ||
      "CL"
  ).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase() || "CL";
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .clara-community-real-profile-avatar {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      object-fit: cover;
      object-position: center;
      user-select: none;
      -webkit-user-drag: none;
    }

    .clara-community-real-profile-initials {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      border-radius: inherit;
      background: linear-gradient(135deg, rgba(26, 188, 190, .78), rgba(92, 72, 220, .84));
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: -.02em;
    }

    .clara-community-profile-nav-avatar {
      overflow: hidden !important;
      padding: 3px !important;
      background: linear-gradient(135deg, rgba(35, 215, 206, .94), rgba(103, 84, 239, .92)) !important;
      box-shadow: 0 0 0 1px rgba(128, 255, 246, .18), 0 8px 24px rgba(73, 85, 212, .22) !important;
    }

    .clara-community-profile-nav-avatar > .clara-community-real-profile-avatar,
    .clara-community-profile-nav-avatar > .clara-community-real-profile-initials {
      border: 2px solid rgba(5, 20, 42, .92);
      background-clip: padding-box;
    }

    .clara-community-composer-profile-avatar {
      overflow: hidden !important;
      padding: 3px !important;
      border-color: rgba(93, 244, 235, .48) !important;
      background: linear-gradient(135deg, rgba(22, 179, 177, .58), rgba(83, 67, 199, .56)) !important;
      box-shadow: 0 0 0 1px rgba(89, 240, 231, .08), 0 0 18px rgba(45, 212, 207, .13) !important;
    }

    .clara-community-composer-profile-avatar > .clara-community-real-profile-avatar,
    .clara-community-composer-profile-avatar > .clara-community-real-profile-initials {
      border: 2px solid rgba(5, 23, 42, .94);
    }
  `;
  document.head.appendChild(style);
}

function avatarNode(profile) {
  if (profile?.avatar_url) {
    const image = document.createElement("img");
    image.className = "clara-community-real-profile-avatar";
    image.src = profile.avatar_url;
    image.alt = profile?.display_name || profile?.full_name || "Profile photo";
    image.decoding = "async";
    return image;
  }

  const fallback = document.createElement("span");
  fallback.className = "clara-community-real-profile-initials";
  fallback.textContent = initialsFor(profile);
  return fallback;
}

function profileKey(profile) {
  return `${profile?.avatar_url || ""}|${profile?.display_name || profile?.full_name || ""}`;
}

function applyToProfileNav(profile) {
  const nav = document.querySelector('.clara-community-nav-item[title="ME"]');
  if (!nav) return;
  const key = profileKey(profile);
  if (nav.dataset.claraProfileAvatarKey === key) return;

  nav.dataset.claraProfileAvatarKey = key;
  nav.classList.add("clara-community-profile-nav-avatar");

  for (const node of Array.from(nav.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && String(node.textContent || "").trim() === "ME") {
      node.remove();
    }
  }
  nav.querySelectorAll(":scope > .clara-community-real-profile-avatar, :scope > .clara-community-real-profile-initials").forEach((node) => node.remove());

  const marker = nav.querySelector(":scope > span.pointer-events-none");
  nav.insertBefore(avatarNode(profile), marker || nav.firstChild);
}

function applyToComposer(profile) {
  const host = document.querySelector(
    '.clara-community-composer > div:first-child > div:first-child'
  );
  if (!host) return;
  const key = profileKey(profile);
  if (host.dataset.claraProfileAvatarKey === key) return;

  host.dataset.claraProfileAvatarKey = key;
  host.classList.add("clara-community-composer-profile-avatar");
  host.replaceChildren(avatarNode(profile));
}

function applyProfile(profile = currentProfile) {
  if (!profile) return;
  ensureStyles();
  applyToProfileNav(profile);
  applyToComposer(profile);
}

async function loadProfile() {
  const token = getStoredBackendToken();
  if (!token) return null;
  if (requestInFlight) return requestInFlight;

  requestInFlight = backendRequest("/api/community/profile/me", { token })
    .then((profile) => {
      if (profile && typeof profile === "object") {
        currentProfile = profile;
        applyProfile(profile);
      }
      return profile;
    })
    .catch((error) => {
      console.warn("[Community profile avatars] profile load failed:", error);
      return null;
    })
    .finally(() => {
      requestInFlight = null;
    });

  return requestInFlight;
}

function start() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  ensureStyles();
  loadProfile();

  observer = new MutationObserver(() => {
    if (currentProfile) applyProfile(currentProfile);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  refreshTimer = window.setInterval(() => {
    if (document.visibilityState !== "hidden") loadProfile();
  }, REFRESH_MS);

  window.addEventListener("focus", loadProfile);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") loadProfile();
  });
}

start();

export default function installCommunityRealProfileAvatars() {
  return {
    refresh: loadProfile,
    stop() {
      if (observer) observer.disconnect();
      if (refreshTimer) window.clearInterval(refreshTimer);
      observer = null;
      refreshTimer = null;
    },
  };
}
