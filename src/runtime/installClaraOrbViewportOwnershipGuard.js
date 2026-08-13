/*
 * CLARA Orb viewport ownership guard.
 *
 * The Orb is a true full-screen surface. Desktop browsers already keep it
 * viewport-owned through the CSS cascade, but some Android WebViews can still
 * establish a containing block on one of the Layout ancestors (transform,
 * filter, contain, perspective, or will-change). When that happens, the fixed
 * Community root is sized against that ancestor instead of the real viewport,
 * exposing the universal app background beneath the Orb.
 *
 * This runtime fixes the ownership structurally rather than painting a mask:
 * - neutralize containing-block makers only while the Orb route is active;
 * - make the Community root own the viewport without relying on dvh;
 * - make the Orb page fill that root with absolute inset geometry;
 * - restore every touched inline style when leaving the Orb route.
 */

const RUNTIME_KEY = "__claraOrbViewportOwnershipGuard__";
const ROOT_SELECTOR = '.clara-community-root[data-community-view="orb"]';
const PAGE_SELECTOR = '.clara-community-orb-view[data-clara-orb-page="true"]';
const ORB_BACKGROUND = "#010217";

const CONTAINING_BLOCK_PROPERTIES = [
  "transform",
  "filter",
  "perspective",
  "contain",
  "will-change",
  "backdrop-filter",
  "-webkit-backdrop-filter",
];

function rememberInlineStyle(element, property) {
  return {
    element,
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  };
}

function restoreInlineStyle(snapshot) {
  if (!snapshot?.element) return;
  if (snapshot.value) {
    snapshot.element.style.setProperty(
      snapshot.property,
      snapshot.value,
      snapshot.priority || ""
    );
  } else {
    snapshot.element.style.removeProperty(snapshot.property);
  }
}

function setImportant(element, property, value, snapshots) {
  if (!element) return;
  snapshots.push(rememberInlineStyle(element, property));
  element.style.setProperty(property, value, "important");
}

function installClaraOrbViewportOwnershipGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  window[RUNTIME_KEY]?.destroy?.();

  let activeRoot = null;
  let activePage = null;
  let snapshots = [];
  let syncQueued = false;

  const release = () => {
    for (let index = snapshots.length - 1; index >= 0; index -= 1) {
      restoreInlineStyle(snapshots[index]);
    }
    snapshots = [];

    activeRoot?.removeAttribute("data-clara-orb-viewport-owner");
    activePage?.removeAttribute("data-clara-orb-viewport-fill");
    activeRoot = null;
    activePage = null;
  };

  const apply = (root, page) => {
    release();
    activeRoot = root;
    activePage = page;

    // Walk the complete rendered hierarchy instead of assuming which Layout
    // layer became the Android containing block.
    let ancestor = root.parentElement;
    while (ancestor) {
      CONTAINING_BLOCK_PROPERTIES.forEach((property) => {
        const neutralValue = property === "will-change" ? "auto" : "none";
        setImportant(ancestor, property, neutralValue, snapshots);
      });
      ancestor = ancestor.parentElement;
    }

    // Fixed + inset + auto height avoids depending on 100dvh support or Android
    // dynamic-viewport calculations. Once ancestor containing blocks are gone,
    // this is tied to the real visual viewport.
    setImportant(root, "position", "fixed", snapshots);
    setImportant(root, "top", "0", snapshots);
    setImportant(root, "right", "0", snapshots);
    setImportant(root, "bottom", "0", snapshots);
    setImportant(root, "left", "0", snapshots);
    setImportant(root, "width", "100%", snapshots);
    setImportant(root, "max-width", "none", snapshots);
    setImportant(root, "height", "auto", snapshots);
    setImportant(root, "min-height", "0", snapshots);
    setImportant(root, "max-height", "none", snapshots);
    setImportant(root, "margin", "0", snapshots);
    setImportant(root, "transform", "none", snapshots);
    setImportant(root, "filter", "none", snapshots);
    setImportant(root, "contain", "none", snapshots);
    setImportant(root, "overflow", "hidden", snapshots);
    setImportant(root, "background-color", ORB_BACKGROUND, snapshots);
    setImportant(root, "background-image", "none", snapshots);

    // The shared Community nav is already an overlay on the Orb route. The Orb
    // canvas therefore fills the root directly instead of calculating its own
    // height from 100dvh - getBoundingClientRect().top.
    setImportant(page, "position", "absolute", snapshots);
    setImportant(page, "top", "0", snapshots);
    setImportant(page, "right", "0", snapshots);
    setImportant(page, "bottom", "0", snapshots);
    setImportant(page, "left", "0", snapshots);
    setImportant(page, "width", "100%", snapshots);
    setImportant(page, "height", "auto", snapshots);
    setImportant(page, "min-height", "0", snapshots);
    setImportant(page, "max-height", "none", snapshots);
    setImportant(page, "flex", "none", snapshots);
    setImportant(page, "margin", "0", snapshots);
    setImportant(page, "background-color", ORB_BACKGROUND, snapshots);
    setImportant(page, "background-image", "none", snapshots);

    root.dataset.claraOrbViewportOwner = "runtime-v1";
    page.dataset.claraOrbViewportFill = "runtime-v1";
  };

  const sync = () => {
    syncQueued = false;

    const root = document.querySelector(ROOT_SELECTOR);
    const page = root?.querySelector(PAGE_SELECTOR) || null;

    if (!root || !page) {
      if (activeRoot || activePage) release();
      return;
    }

    if (root === activeRoot && page === activePage) return;
    apply(root, page);
  };

  const queueSync = () => {
    if (syncQueued) return;
    syncQueued = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-community-view"],
  });

  window.addEventListener("resize", queueSync);
  window.visualViewport?.addEventListener("resize", queueSync);
  window.visualViewport?.addEventListener("scroll", queueSync);

  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      observer.disconnect();
      window.removeEventListener("resize", queueSync);
      window.visualViewport?.removeEventListener("resize", queueSync);
      window.visualViewport?.removeEventListener("scroll", queueSync);
      release();
      window[RUNTIME_KEY] = null;
    },
  };
}

installClaraOrbViewportOwnershipGuard();
