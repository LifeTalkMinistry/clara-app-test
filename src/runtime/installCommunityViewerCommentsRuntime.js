import "./communityViewerCommentsRuntime.css";

const INSTALL_KEY = "__claraCommunityViewerCommentsRuntimeInstalled";
let activeState = null;
let pointerStart = null;

function normalizeText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseCompactCount(value = "") {
  const match = String(value || "").match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return 0;
  const amount = Number(match[1]) || 0;
  const suffix = String(match[2] || "").toUpperCase();
  if (suffix === "K") return Math.round(amount * 1_000);
  if (suffix === "M") return Math.round(amount * 1_000_000);
  if (suffix === "B") return Math.round(amount * 1_000_000_000);
  return Math.round(amount);
}

function compactCount(value) {
  const count = Math.max(0, Number(value) || 0);
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(count >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
}

function getCommentButton(card) {
  if (!card) return null;
  return Array.from(card.querySelectorAll("button")).find((button) =>
    normalizeText(button.textContent).startsWith("Comment")
  ) || null;
}

function getViewerMedia(viewer) {
  if (!viewer) return null;
  const video = viewer.querySelector("video[src]");
  if (video) return video;

  return Array.from(viewer.querySelectorAll("img[src]")).find((image) => {
    const rect = image.getBoundingClientRect();
    return rect.width >= 160 && rect.height >= 160;
  }) || null;
}

function cardContainsMatchingMedia(card, viewerMedia) {
  if (!card || !viewerMedia?.src) return false;
  return Array.from(card.querySelectorAll("video[src], img[src]")).some((media) => media.src === viewerMedia.src);
}

function findSourceCard(viewer) {
  const cards = Array.from(document.querySelectorAll(".clara-community-post-card"));
  if (!cards.length) return null;

  const viewerMedia = getViewerMedia(viewer);
  if (viewerMedia?.src) {
    const mediaMatch = cards.find((card) => cardContainsMatchingMedia(card, viewerMedia));
    if (mediaMatch) return mediaMatch;
  }

  const viewerAuthor = normalizeText(
    Array.from(viewer.querySelectorAll("button span")).find((node) =>
      String(node.className || "").includes("text-[14px]") &&
      String(node.className || "").includes("font-black")
    )?.textContent
  );
  const viewerBody = normalizeText(
    Array.from(viewer.querySelectorAll("p")).find((node) =>
      String(node.className || "").includes("line-clamp-2")
    )?.textContent
  );

  if (viewerAuthor || viewerBody) {
    const identityMatch = cards.find((card) => {
      const cardText = normalizeText(card.textContent);
      return (!viewerAuthor || cardText.includes(viewerAuthor)) && (!viewerBody || cardText.includes(viewerBody));
    });
    if (identityMatch) return identityMatch;
  }

  return cards.length === 1 ? cards[0] : null;
}

function findCommentsPanel(card) {
  if (!card) return null;
  const input = card.querySelector('input[placeholder="Write a comment..."]');
  if (!input) return null;

  let node = input.parentElement;
  while (node && node.parentElement !== card) node = node.parentElement;
  return node?.parentElement === card ? node : null;
}

function createRuntimeHeader(state, panel) {
  let header = panel.querySelector(":scope > .clara-viewer-comments-runtime-header");
  if (header) return header;

  header = document.createElement("div");
  header.className = "clara-viewer-comments-runtime-header";

  const handle = document.createElement("span");
  handle.className = "clara-viewer-comments-runtime-handle";
  handle.setAttribute("aria-hidden", "true");

  const title = document.createElement("strong");
  title.textContent = "Comments";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "clara-viewer-comments-runtime-close";
  close.setAttribute("aria-label", "Close comments");
  close.textContent = "×";
  close.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeSheet();
  });

  header.append(handle, title, close);
  panel.prepend(header);
  return header;
}

function decoratePanel(state, panel) {
  if (!state || !panel) return;
  if (state.panel && state.panel !== panel) {
    state.panel.classList.remove("clara-viewer-comments-sheet-source");
  }

  state.panel = panel;
  panel.classList.add("clara-viewer-comments-sheet-source");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Comments");
  createRuntimeHeader(state, panel);

  if (state.loader) {
    state.loader.remove();
    state.loader = null;
  }
}

function ensurePanel(state, attempt = 0) {
  if (!state || activeState !== state) return;
  const panel = findCommentsPanel(state.sourceCard);
  if (panel) {
    decoratePanel(state, panel);
    return;
  }

  if (attempt < 18) {
    window.setTimeout(() => ensurePanel(state, attempt + 1), attempt < 4 ? 24 : 70);
  }
}

function sourceCommentCount(card) {
  const button = getCommentButton(card);
  if (!button) return null;
  const text = normalizeText(button.textContent);
  const remainder = text.replace(/^Comment/i, "").trim();
  return remainder ? parseCompactCount(remainder) : 0;
}

function syncViewerCount(state) {
  if (!state?.viewer?.isConnected || !state.sourceCard?.isConnected) return;
  const count = sourceCommentCount(state.sourceCard);
  if (count === null) return;
  const viewerButton = state.viewer.querySelector('button[aria-label="Open comments"]');
  const label = viewerButton?.querySelector("span:last-child");
  if (label) label.textContent = compactCount(count);
}

function createBackdrop(state) {
  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "clara-viewer-comments-runtime-backdrop";
  backdrop.setAttribute("aria-label", "Close comments");
  backdrop.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeSheet();
  });
  state.viewer.appendChild(backdrop);
  state.backdrop = backdrop;

  const loader = document.createElement("div");
  loader.className = "clara-viewer-comments-runtime-loader";
  loader.textContent = "Opening comments…";
  state.viewer.appendChild(loader);
  state.loader = loader;
}

function observeSourceCard(state) {
  state.observer?.disconnect();
  if (!state.sourceCard) return;

  state.observer = new MutationObserver(() => {
    if (activeState !== state) return;
    ensurePanel(state);
    syncViewerCount(state);
  });
  state.observer.observe(state.sourceCard, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}

function rebindSourceCard(state) {
  if (!state || activeState !== state || !state.viewer?.isConnected) return;
  if (!state.sourceCard?.isConnected) {
    const replacement = findSourceCard(state.viewer);
    if (replacement) {
      state.sourceCard = replacement;
      state.commentButton = getCommentButton(replacement);
      observeSourceCard(state);
    }
  }
  ensurePanel(state);
  syncViewerCount(state);
}

function openSheet(viewer) {
  if (!viewer) return;
  if (activeState?.viewer === viewer) return;
  if (activeState) closeSheet();

  const sourceCard = findSourceCard(viewer);
  const commentButton = getCommentButton(sourceCard);
  if (!sourceCard || !commentButton) {
    const notice = document.createElement("div");
    notice.className = "clara-viewer-comments-runtime-notice";
    notice.textContent = "Comments are unavailable right now. Please try again.";
    viewer.appendChild(notice);
    window.setTimeout(() => notice.remove(), 1800);
    return;
  }

  const wasOpen = Boolean(findCommentsPanel(sourceCard));
  const state = {
    viewer,
    sourceCard,
    commentButton,
    openedByRuntime: !wasOpen,
    panel: null,
    backdrop: null,
    loader: null,
    observer: null,
    keepAlive: null,
  };
  activeState = state;

  createBackdrop(state);
  observeSourceCard(state);

  if (!wasOpen) commentButton.click();
  ensurePanel(state);
  syncViewerCount(state);

  state.keepAlive = window.setInterval(() => rebindSourceCard(state), 350);
}

function closeSheet({ closeSource = true } = {}) {
  const state = activeState;
  if (!state) return;
  activeState = null;

  state.observer?.disconnect();
  if (state.keepAlive) window.clearInterval(state.keepAlive);
  state.backdrop?.remove();
  state.loader?.remove();

  if (state.panel?.isConnected) {
    state.panel.classList.remove("clara-viewer-comments-sheet-source");
    state.panel.removeAttribute("aria-modal");
    state.panel.removeAttribute("aria-label");
    state.panel.querySelector(":scope > .clara-viewer-comments-runtime-header")?.remove();
  }

  if (closeSource && state.openedByRuntime) {
    const currentCard = state.sourceCard?.isConnected ? state.sourceCard : findSourceCard(state.viewer);
    const currentPanel = findCommentsPanel(currentCard);
    const currentButton = getCommentButton(currentCard);
    if (currentPanel && currentButton) currentButton.click();
  }
}

function handleClickCapture(event) {
  const commentButton = event.target?.closest?.('.clara-community-reels-viewer button[aria-label="Open comments"]');
  if (commentButton) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    openSheet(commentButton.closest(".clara-community-reels-viewer"));
    return;
  }

  if (activeState && event.target?.closest?.('.clara-community-reels-viewer button[aria-label="Close expanded media"]')) {
    closeSheet();
  }
}

function handleKeyDownCapture(event) {
  if (!activeState || event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();
  closeSheet();
}

function handlePointerDown(event) {
  if (!activeState?.panel?.contains(event.target)) return;
  pointerStart = { x: event.clientX, y: event.clientY };
}

function handlePointerUp(event) {
  if (!pointerStart || !activeState) {
    pointerStart = null;
    return;
  }
  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  pointerStart = null;
  if (dy > 90 && Math.abs(dx) < 80) closeSheet();
}

export function installCommunityViewerCommentsRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window[INSTALL_KEY]) return;
  window[INSTALL_KEY] = true;

  document.addEventListener("click", handleClickCapture, true);
  window.addEventListener("keydown", handleKeyDownCapture, true);
  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointerup", handlePointerUp, true);
}

installCommunityViewerCommentsRuntime();
