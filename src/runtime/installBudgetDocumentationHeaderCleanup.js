const MARKER = "data-clara-budget-documentation-clean";
const INFO_MARKER = "data-clara-budget-documentation-info";
const POPOVER_MARKER = "data-clara-budget-documentation-popover";
const TITLE_TEXT = "Unplanned & undocumented";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function createInfoIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "15");
  svg.setAttribute("height", "15");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "10");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("d", "M12 16v-4");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "path");
  dot.setAttribute("d", "M12 8h.01");
  svg.append(circle, line, dot);
  return svg;
}

function createInfoButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute(INFO_MARKER, "true");
  button.setAttribute("aria-label", "About unplanned and undocumented spending");
  button.setAttribute("aria-expanded", "false");
  button.style.cssText = [
    "display:inline-flex",
    "width:30px",
    "height:30px",
    "flex:0 0 30px",
    "align-items:center",
    "justify-content:center",
    "border:1px solid #3f78ad",
    "border-radius:9999px",
    "background:#0b315b",
    "background-image:linear-gradient(145deg,#154d86 0%,#0a2b52 100%)",
    "color:#eef7ff",
    "box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 8px 18px rgba(0,0,0,0.28)",
    "cursor:pointer",
  ].join(";");
  button.appendChild(createInfoIcon());
  return button;
}

function createPopover() {
  const panel = document.createElement("div");
  panel.hidden = true;
  panel.setAttribute(POPOVER_MARKER, "true");
  panel.style.cssText = [
    "width:100%",
    "margin-top:10px",
    "padding:12px 14px",
    "border:1px solid #2f628f",
    "border-radius:14px",
    "background:#071a31",
    "background-image:linear-gradient(180deg,#0b2746 0%,#071a31 100%)",
    "color:#f4f9ff",
    "opacity:1",
    "box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 14px 30px rgba(0,0,0,0.38)",
    "font-size:12px",
    "font-weight:600",
    "line-height:1.55",
  ].join(";");
  return panel;
}

function getCopyRoot(title) {
  let node = title.parentElement;
  let outermostManagedRow = null;
  while (node?.getAttribute?.(MARKER) === "true") {
    outermostManagedRow = node;
    node = node.parentElement;
  }
  return { copy: node || title.parentElement, managedRow: outermostManagedRow };
}

function wireInfoButton(button, popover) {
  if (!button || !popover || button.dataset.claraBudgetDocumentationWired === "true") return;
  button.dataset.claraBudgetDocumentationWired = "true";
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const opening = popover.hidden;
    popover.hidden = !opening;
    button.setAttribute("aria-expanded", opening ? "true" : "false");
    button.style.borderColor = opening ? "#75b7f0" : "#3f78ad";
    button.style.backgroundImage = opening
      ? "linear-gradient(145deg,#1d5d9f 0%,#0d3768 100%)"
      : "linear-gradient(145deg,#154d86 0%,#0a2b52 100%)";
  });
}

function cleanHeader(title) {
  const { copy, managedRow } = getCopyRoot(title);
  if (!copy?.parentElement) return;

  const paragraphs = Array.from(copy.children).filter((node) => node.tagName === "P");
  const eyebrow = paragraphs.find(
    (node) => normalizeText(node.textContent).toLowerCase() === "budget documentation",
  );
  const description = paragraphs.find((node) =>
    normalizeText(node.textContent).startsWith("Full view of spending outside"),
  );
  const explanation =
    normalizeText(description?.textContent) || "Full view of spending outside this cycle’s plan.";

  if (eyebrow && eyebrow.style.display !== "none") eyebrow.style.display = "none";
  if (description && description.style.display !== "none") description.style.display = "none";

  const existingRows = Array.from(copy.querySelectorAll(`[${MARKER}="true"]`));
  const existingButtons = Array.from(copy.querySelectorAll(`[${INFO_MARKER}="true"]`));
  const existingPopovers = Array.from(copy.querySelectorAll(`[${POPOVER_MARKER}="true"]`));
  const row = managedRow || existingRows[0] || null;

  const alreadyClean =
    row &&
    existingRows.length === 1 &&
    existingButtons.length === 1 &&
    existingPopovers.length === 1 &&
    row.contains(title) &&
    row.contains(existingButtons[0]) &&
    existingPopovers[0].parentElement === copy;

  if (alreadyClean) {
    const popover = existingPopovers[0];
    if (normalizeText(popover.textContent) !== explanation) popover.textContent = explanation;
    wireInfoButton(existingButtons[0], popover);
    return;
  }

  // Repair duplicate/nested rows from the previous version in one pass.
  let cleanRow = row;
  if (cleanRow) {
    cleanRow.replaceChildren(title);
  } else {
    cleanRow = document.createElement("div");
    cleanRow.setAttribute(MARKER, "true");
    title.before(cleanRow);
    cleanRow.appendChild(title);
  }

  cleanRow.setAttribute(MARKER, "true");
  cleanRow.style.cssText = "display:flex;align-items:center;gap:9px;min-width:0;";
  title.style.margin = "0";
  title.style.minWidth = "0";
  title.style.flex = "0 1 auto";

  existingButtons.forEach((node) => node.remove());
  existingPopovers.forEach((node) => node.remove());
  existingRows.forEach((candidate) => {
    if (candidate !== cleanRow && candidate.isConnected) candidate.remove();
  });

  const button = createInfoButton();
  const popover = createPopover();
  popover.textContent = explanation;
  cleanRow.appendChild(button);
  copy.insertBefore(popover, cleanRow.nextSibling);
  wireInfoButton(button, popover);
}

function run() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("h3").forEach((title) => {
    if (normalizeText(title.textContent) === TITLE_TEXT) cleanHeader(title);
  });
}

export function installBudgetDocumentationHeaderCleanup() {
  if (typeof window === "undefined" || window.__claraBudgetDocumentationHeaderCleanupInstalled) return;
  window.__claraBudgetDocumentationHeaderCleanupInstalled = true;

  const start = () => {
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        run();
      });
    };
    run();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}

installBudgetDocumentationHeaderCleanup();
