import "../community-profile-scroll.css";

const ROUTE_CLASS = "clara-community-profile-scroll";
const PAGE_CLASS = "clara-community-profile-page";
const OWNER_CLASS = "clara-community-profile-scroll-owner";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function routeLooksLikeCommunityProfile() {
  const hash = String(window.location.hash || "").toLowerCase();
  const path = String(window.location.pathname || "").toLowerCase();

  return (
    /#\/(?:community\/)?profile(?:\/|$|\?)/.test(hash) ||
    /\/(?:community\/)?profile(?:\/|$)/.test(path)
  );
}

function findProfilePage() {
  const root = document.getElementById("root");
  if (!root) return null;

  const profileHeading = Array.from(root.querySelectorAll("h1")).find(
    (node) => normalizeText(node.textContent).toLowerCase() === "profile",
  );

  if (!profileHeading) return null;

  const hasCommunityMarker = Array.from(root.querySelectorAll("p,span")).some((node) => {
    const text = normalizeText(node.textContent).toLowerCase();
    return text === "clara community" || text === "community member";
  });

  if (!hasCommunityMarker && !routeLooksLikeCommunityProfile()) return null;

  let node = profileHeading;
  while (node && node !== root) {
    if (node.classList?.contains("min-h-screen")) return node;
    node = node.parentElement;
  }

  return profileHeading.closest("div") || root.firstElementChild || null;
}

function clearOwnership() {
  document.documentElement?.classList.remove(ROUTE_CLASS);
  document.body?.classList.remove(ROUTE_CLASS);
  document
    .querySelectorAll(`.${PAGE_CLASS}, .${OWNER_CLASS}`)
    .forEach((node) => node.classList.remove(PAGE_CLASS, OWNER_CLASS));
}

function syncCommunityProfileScrollOwnership() {
  const page = findProfilePage();
  const blockingDialog = Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));

  if (!page || blockingDialog) {
    clearOwnership();
    return;
  }

  document.documentElement.classList.add(ROUTE_CLASS);
  document.body?.classList.add(ROUTE_CLASS);
  page.classList.add(PAGE_CLASS);

  let node = page.parentElement;
  while (node && node !== document.body) {
    node.classList.add(OWNER_CLASS);
    node = node.parentElement;
  }

  document.getElementById("root")?.classList.add(OWNER_CLASS);
}

function installCommunityProfileScrollOwnership() {
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    window.__claraCommunityProfileScrollOwnershipInstalled
  ) {
    return;
  }

  window.__claraCommunityProfileScrollOwnershipInstalled = true;

  let frame = 0;
  const queueSync = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      syncCommunityProfileScrollOwnership();
    });
  };

  const start = () => {
    const root = document.getElementById("root");
    if (root && typeof MutationObserver === "function") {
      const observer = new MutationObserver(queueSync);
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    queueSync();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.addEventListener("hashchange", queueSync);
  window.addEventListener("popstate", queueSync);
  window.addEventListener("resize", queueSync, { passive: true });
  window.addEventListener("orientationchange", queueSync, { passive: true });
}

try {
  installCommunityProfileScrollOwnership();
} catch (error) {
  console.warn("CLARA Community Profile scroll ownership failed:", error);
}
