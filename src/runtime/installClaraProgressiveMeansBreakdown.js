const RUNTIME_KEY = "__claraProgressiveMeansBreakdownRuntime__";
const METRIC_SELECTOR = '[data-clara-orb-means-metric="true"]';
const CARD_SELECTOR = '[data-clara-money-briefing="active-cycle"]';
const NEXT_CYCLE_SELECTOR = '[data-clara-next-pay-cycle]';
const FULL_ONLY_ATTR = "data-clara-progressive-means-full-only";
const TOGGLE_ATTR = "data-clara-progressive-means-toggle";
const FULL_PAGE_ATTR = "data-clara-progressive-means-full-page";

function markFullOnlyNodes(card) {
  const children = Array.from(card?.children || []);
  const nextCycleIndex = children.findIndex((child) => child.matches?.(NEXT_CYCLE_SELECTOR));
  if (nextCycleIndex < 0) return [];

  return children.slice(nextCycleIndex).filter((node) => {
    if (node.hasAttribute?.(TOGGLE_ATTR)) return false;
    node.setAttribute(FULL_ONLY_ATTR, "true");
    if (!Object.prototype.hasOwnProperty.call(node.dataset, "claraProgressiveOriginalDisplay")) {
      node.dataset.claraProgressiveOriginalDisplay = node.style.display || "";
    }
    return true;
  });
}

function applyCompactDepth(card) {
  const fullOnlyNodes = markFullOnlyNodes(card);
  fullOnlyNodes.forEach((node) => {
    node.style.display = "none";
  });
  card.dataset.claraProgressiveMeansFull = "false";

  const toggle = card.querySelector(`[${TOGGLE_ATTR}="true"]`);
  if (!toggle) return;
  toggle.setAttribute("aria-expanded", "false");
  const label = toggle.querySelector('[data-clara-progressive-means-toggle-label="true"]');
  const arrow = toggle.querySelector('[data-clara-progressive-means-toggle-arrow="true"]');
  if (label) label.textContent = "View Full Breakdown";
  if (arrow) arrow.textContent = "→";
}

function closeFullPageBreakdown() {
  document.querySelector(`[${FULL_PAGE_ATTR}="true"]`)?.remove?.();
  const previousOverflow = document.body.dataset.claraMeansPreviousOverflow;
  document.body.style.overflow = previousOverflow || "";
  delete document.body.dataset.claraMeansPreviousOverflow;
}

function prepareFullBreakdownClone(card) {
  const clone = card.cloneNode(true);
  clone.querySelector(`[${TOGGLE_ATTR}="true"]`)?.remove?.();
  clone.querySelectorAll(`[${FULL_ONLY_ATTR}="true"]`).forEach((node) => {
    node.style.display = node.dataset.claraProgressiveOriginalDisplay || "";
    node.removeAttribute(FULL_ONLY_ATTR);
    delete node.dataset.claraProgressiveOriginalDisplay;
  });

  clone.style.display = "block";
  clone.style.width = "100%";
  clone.style.maxWidth = "none";
  clone.style.margin = "0";
  clone.style.padding = "0";
  clone.style.border = "0";
  clone.style.borderRadius = "0";
  clone.style.background = "transparent";
  clone.style.boxShadow = "none";
  clone.style.backdropFilter = "none";
  clone.style.webkitBackdropFilter = "none";
  clone.style.overflow = "visible";
  clone.dataset.claraProgressiveMeansFullPageContent = "true";
  return clone;
}

function openFullPageBreakdown(card) {
  if (!card) return;
  closeFullPageBreakdown();

  const overlay = document.createElement("div");
  overlay.setAttribute(FULL_PAGE_ATTR, "true");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Full Means Score breakdown");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "100000";
  overlay.style.overflowY = "auto";
  overlay.style.overscrollBehavior = "contain";
  overlay.style.background = "linear-gradient(180deg,rgba(1,6,23,.72),rgba(2,8,28,.88) 42%,rgba(4,8,27,.95))";
  overlay.style.backdropFilter = "blur(10px) saturate(1.04)";
  overlay.style.webkitBackdropFilter = "blur(10px) saturate(1.04)";
  overlay.style.padding = "max(14px, env(safe-area-inset-top)) 14px max(18px, env(safe-area-inset-bottom))";
  overlay.style.boxSizing = "border-box";

  const shell = document.createElement("section");
  shell.style.width = "min(430px,100%)";
  shell.style.minHeight = "calc(100dvh - max(28px, env(safe-area-inset-top)) - max(32px, env(safe-area-inset-bottom)))";
  shell.style.margin = "0 auto";
  shell.style.display = "flex";
  shell.style.flexDirection = "column";
  shell.style.boxSizing = "border-box";

  const header = document.createElement("header");
  header.style.position = "sticky";
  header.style.top = "0";
  header.style.zIndex = "2";
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";
  header.style.gap = "12px";
  header.style.margin = "0 -2px 12px";
  header.style.padding = "6px 2px 12px";
  header.style.background = "linear-gradient(180deg,rgba(1,6,23,.98),rgba(1,6,23,.84) 72%,rgba(1,6,23,0))";

  const heading = document.createElement("div");
  heading.innerHTML = `
    <span style="display:block;font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(145,190,255,.48)">Means Score</span>
    <strong style="display:block;margin-top:3px;font-size:17px;font-weight:950;letter-spacing:-.025em;color:rgba(255,255,255,.92)">Full Money Breakdown</strong>
  `;

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Return to current cycle breakdown");
  close.style.display = "inline-flex";
  close.style.alignItems = "center";
  close.style.justifyContent = "center";
  close.style.minHeight = "36px";
  close.style.padding = "0 12px";
  close.style.border = "1px solid rgba(145,190,255,.16)";
  close.style.borderRadius = "999px";
  close.style.background = "rgba(10,24,54,.66)";
  close.style.color = "rgba(218,231,255,.76)";
  close.style.fontSize = "9px";
  close.style.fontWeight = "850";
  close.style.cursor = "pointer";
  close.style.webkitTapHighlightColor = "transparent";
  close.textContent = "← Current cycle";
  close.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeFullPageBreakdown();
  });

  header.append(heading, close);

  const content = document.createElement("div");
  content.style.flex = "1";
  content.style.width = "100%";
  content.style.boxSizing = "border-box";
  content.style.padding = "15px 14px 18px";
  content.style.border = "1px solid rgba(112,157,229,.12)";
  content.style.borderRadius = "24px";
  content.style.background = "linear-gradient(180deg,rgba(8,20,49,.84),rgba(4,11,31,.90))";
  content.style.boxShadow = "0 26px 70px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.035)";
  content.appendChild(prepareFullBreakdownClone(card));

  const footer = document.createElement("button");
  footer.type = "button";
  footer.style.width = "100%";
  footer.style.minHeight = "44px";
  footer.style.marginTop = "12px";
  footer.style.border = "1px solid rgba(112,157,229,.14)";
  footer.style.borderRadius = "14px";
  footer.style.background = "rgba(10,24,54,.58)";
  footer.style.color = "rgba(218,231,255,.76)";
  footer.style.fontSize = "10px";
  footer.style.fontWeight = "850";
  footer.style.cursor = "pointer";
  footer.textContent = "Back to Current Cycle";
  footer.addEventListener("click", closeFullPageBreakdown);

  shell.append(header, content, footer);
  overlay.appendChild(shell);

  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeFullPageBreakdown();
  });

  document.body.dataset.claraMeansPreviousOverflow = document.body.style.overflow || "";
  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
  close.focus({ preventScroll: true });
}

function ensureToggle(card) {
  let toggle = card.querySelector(`[${TOGGLE_ATTR}="true"]`);
  if (toggle) return toggle;

  toggle = document.createElement("span");
  toggle.setAttribute(TOGGLE_ATTR, "true");
  toggle.setAttribute("role", "button");
  toggle.setAttribute("tabindex", "0");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "View full Means Score breakdown");
  toggle.style.display = "flex";
  toggle.style.alignItems = "center";
  toggle.style.justifyContent = "space-between";
  toggle.style.gap = "10px";
  toggle.style.width = "100%";
  toggle.style.boxSizing = "border-box";
  toggle.style.marginTop = "10px";
  toggle.style.paddingTop = "9px";
  toggle.style.borderTop = "1px solid rgba(112,157,229,.12)";
  toggle.style.color = "rgba(180,205,255,.62)";
  toggle.style.fontSize = "8.5px";
  toggle.style.fontWeight = "850";
  toggle.style.letterSpacing = ".025em";
  toggle.style.cursor = "pointer";
  toggle.style.userSelect = "none";
  toggle.style.webkitTapHighlightColor = "transparent";
  toggle.innerHTML = `
    <span data-clara-progressive-means-toggle-label="true">View Full Breakdown</span>
    <span data-clara-progressive-means-toggle-arrow="true" aria-hidden="true" style="font-size:11px;color:rgba(145,190,255,.54)">→</span>
  `;

  const activate = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openFullPageBreakdown(card);
  };

  toggle.addEventListener("click", activate);
  toggle.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") activate(event);
  });

  card.appendChild(toggle);
  return toggle;
}

function patchMetric(metric) {
  if (!metric) return;

  const expanded = metric.getAttribute("aria-expanded") === "true";
  if (!expanded) {
    closeFullPageBreakdown();
    return;
  }

  const card = metric.querySelector(CARD_SELECTOR);
  if (!card) return;

  ensureToggle(card);
  applyCompactDepth(card);
}

function patchAllMetrics() {
  document.querySelectorAll(METRIC_SELECTOR).forEach(patchMetric);
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  window[RUNTIME_KEY]?.destroy?.();

  let queued = false;
  let destroyed = false;

  const sync = () => {
    queued = false;
    if (destroyed) return;
    patchAllMetrics();
  };

  const queueSync = () => {
    if (queued || destroyed) return;
    queued = true;
    window.requestAnimationFrame(sync);
  };

  const observer = new MutationObserver(queueSync);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-expanded"],
  });

  queueSync();

  window[RUNTIME_KEY] = {
    destroy() {
      destroyed = true;
      observer.disconnect();
      closeFullPageBreakdown();
      document.querySelectorAll(METRIC_SELECTOR).forEach((metric) => {
        const card = metric.querySelector(CARD_SELECTOR);
        card?.querySelector?.(`[${TOGGLE_ATTR}="true"]`)?.remove?.();
        card?.querySelectorAll?.(`[${FULL_ONLY_ATTR}="true"]`)?.forEach?.((node) => {
          node.style.display = node.dataset.claraProgressiveOriginalDisplay || "";
          node.removeAttribute(FULL_ONLY_ATTR);
          delete node.dataset.claraProgressiveOriginalDisplay;
        });
        if (card) delete card.dataset.claraProgressiveMeansFull;
      });
    },
  };
}

install();
