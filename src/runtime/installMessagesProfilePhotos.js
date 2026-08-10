import { backendRequest, getStoredBackendToken } from "../lib/clara-backend-client";

const INSTALL_FLAG = "__claraMessagesProfilePhotosInstalled";
const REFRESH_MS = 30000;

let profileMap = new Map();
let lastLoadedAt = 0;
let loadingPromise = null;

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

async function loadProfiles(force = false) {
  const now = Date.now();
  if (!force && profileMap.size && now - lastLoadedAt < REFRESH_MS) return profileMap;
  if (loadingPromise) return loadingPromise;

  const token = getStoredBackendToken();
  if (!token) return profileMap;

  loadingPromise = backendRequest("/api/community/profiles", { token })
    .then((profiles) => {
      const next = new Map();
      (Array.isArray(profiles) ? profiles : []).forEach((profile) => {
        const avatarUrl = String(profile?.avatar_url || "").trim();
        if (!avatarUrl) return;
        const names = [profile?.display_name, profile?.full_name, profile?.email]
          .map(normalizeName)
          .filter(Boolean);
        names.forEach((name) => next.set(name, avatarUrl));
      });
      profileMap = next;
      lastLoadedAt = Date.now();
      return profileMap;
    })
    .catch((error) => {
      console.warn("[Messages] profile photo directory failed:", error);
      return profileMap;
    })
    .finally(() => {
      loadingPromise = null;
    });

  return loadingPromise;
}

function applyPhoto(avatarNode, name) {
  if (!(avatarNode instanceof HTMLElement)) return;
  const avatarUrl = profileMap.get(normalizeName(name));
  if (!avatarUrl) {
    if (avatarNode.dataset.claraMessageProfilePhoto === "true") {
      avatarNode.style.removeProperty("background-image");
      avatarNode.style.removeProperty("background-size");
      avatarNode.style.removeProperty("background-position");
      avatarNode.style.removeProperty("background-repeat");
      avatarNode.style.removeProperty("color");
      delete avatarNode.dataset.claraMessageProfilePhoto;
    }
    return;
  }

  const safeUrl = avatarUrl.replace(/"/g, "%22");
  avatarNode.dataset.claraMessageProfilePhoto = "true";
  avatarNode.style.backgroundImage = `url("${safeUrl}")`;
  avatarNode.style.backgroundSize = "cover";
  avatarNode.style.backgroundPosition = "center";
  avatarNode.style.backgroundRepeat = "no-repeat";
  avatarNode.style.color = "transparent";
}

function scanInbox() {
  const searchInput = document.querySelector('input[placeholder="Search members"]');
  const root = searchInput?.closest("div.fixed");
  if (!root) return;

  root.querySelectorAll("main section button").forEach((button) => {
    const nameNode = button.querySelector("p");
    const avatarNode = button.querySelector(":scope > div.relative > div:first-child");
    if (nameNode && avatarNode) applyPhoto(avatarNode, nameNode.textContent);
  });
}

function scanActiveThread() {
  const input = document.querySelector('input[placeholder="Type a message..."]');
  const root = input?.closest("div.fixed");
  if (!root) return;

  const header = root.querySelector(":scope > header");
  if (!header) return;
  const nameNode = header.querySelector("p.font-black");
  const avatarNode = header.querySelector("div.relative.shrink-0 > div:first-child");
  if (nameNode && avatarNode) applyPhoto(avatarNode, nameNode.textContent);
}

async function scanMessages() {
  await loadProfiles();
  scanInbox();
  scanActiveThread();
}

export function installMessagesProfilePhotos() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALL_FLAG]) return;
  window[INSTALL_FLAG] = true;

  let scheduled = false;
  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      scanMessages();
    });
  };

  const observer = new MutationObserver(scheduleScan);
  const start = () => {
    scheduleScan();
    observer.observe(document.body, { childList: true, subtree: true });
    window.setInterval(async () => {
      await loadProfiles(true);
      scheduleScan();
    }, REFRESH_MS);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

installMessagesProfilePhotos();
