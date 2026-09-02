const RUNTIME_KEY = "__claraProgressiveMeansBreakdownRuntime__";
const METRIC_SELECTOR = '[data-clara-orb-means-metric="true"]';
const CARD_SELECTOR = '[data-clara-money-briefing="active-cycle"]';
const NEXT_CYCLE_SELECTOR = '[data-clara-next-pay-cycle]';
const FULL_ONLY_ATTR = "data-clara-progressive-means-full-only";
const TOGGLE_ATTR = "data-clara-progressive-means-toggle";

function readFullState(metric) {
  return metric?.dataset?.claraMeansFullBreakdown === "true";
}

function setFullState(metric, full) {
  if (!metric) return;
  metric.dataset.claraMeansFullBreakdown = full ? "true" : "false";
}

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

function applyDepth(metric, card) {
  const full = readFullState(metric);
  const fullOnlyNodes = markFullOnlyNodes(card);

  fullOnlyNodes.forEach((node) => {
    node.style.display = full
      ? node.dataset.claraProgressiveOriginalDisplay || ""
      : "none";
  });

  card.dataset.claraProgressiveMeansFull = full ? "true" : "false";

  const toggle = card.querySelector(`[${TOGGLE_ATTR}="true"]`);
  if (!toggle) return;

  toggle.setAttribute("aria-expanded", full ? "true" : "false");
  const label = toggle.querySelector('[data-clara-progressive-means-toggle-label="true"]');
  const arrow = toggle.querySelector('[data-clara-progressive-means-toggle-arrow="true"]');
  if (label) label.textContent = full ? "Show Current Cycle Only" : "View Full Breakdown";
  if (arrow) arrow.textContent = full ? "↑" : "→";
}

function ensureToggle(metric, card) {
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
    setFullState(metric, !readFullState(metric));
    applyDepth(metric, card);
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
    setFullState(metric, false);
    return;
  }

  const card = metric.querySelector(CARD_SELECTOR);
  if (!card) return;

  ensureToggle(metric, card);
  applyDepth(metric, card);
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
      document.querySelectorAll(METRIC_SELECTOR).forEach((metric) => {
        delete metric.dataset.claraMeansFullBreakdown;
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
