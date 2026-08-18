const WORDMARK_CLASS = "clara-official-wordmark-inline";
const MASTERCLASS_CLOSE_SELECTOR = '[aria-label="Close Budgeting Masterclass"]';
const EMPHASIS_SELECTOR = "h1, h2, h3, p.uppercase, strong, b";
const LESSON_EYEBROW_PATTERN = /^(?:(?:Budget|Emergency Fund) Masterclass\s*·\s*Point\s+\d+|Masterclass de (?:Presupuesto|Fondo de Emergencia)\s*·\s*Punto\s+\d+)$/i;

function createClaraWordmark() {
  const wordmark = document.createElement("span");
  wordmark.className = WORDMARK_CLASS;
  wordmark.setAttribute("aria-label", "CLARA");
  wordmark.style.display = "inline-flex";
  wordmark.style.alignItems = "baseline";
  wordmark.style.font = "inherit";
  wordmark.style.fontWeight = "900";
  wordmark.style.letterSpacing = "inherit";
  wordmark.style.whiteSpace = "nowrap";
  wordmark.style.filter = "drop-shadow(0 0 8px rgba(36, 107, 253, 0.12))";

  const blue = document.createElement("span");
  blue.textContent = "CL";
  blue.setAttribute("aria-hidden", "true");
  blue.style.color = "#4f83ff";

  const gold = document.createElement("span");
  gold.textContent = "A";
  gold.setAttribute("aria-hidden", "true");
  gold.style.color = "#fcd116";
  gold.style.textShadow = "0 0 8px rgba(252, 209, 22, 0.10)";

  const red = document.createElement("span");
  red.textContent = "RA";
  red.setAttribute("aria-hidden", "true");
  red.style.color = "#ce1126";
  red.style.textShadow = "0 0 8px rgba(206, 17, 38, 0.10)";

  wordmark.append(blue, gold, red);
  return wordmark;
}

function replaceClaraTextNode(textNode) {
  const value = String(textNode.nodeValue || "");
  if (!value.includes("CLARA")) return false;

  const fragment = document.createDocumentFragment();
  let cursor = 0;
  let index = value.indexOf("CLARA", cursor);

  while (index !== -1) {
    if (index > cursor) {
      fragment.append(document.createTextNode(value.slice(cursor, index)));
    }
    fragment.append(createClaraWordmark());
    cursor = index + 5;
    index = value.indexOf("CLARA", cursor);
  }

  if (cursor < value.length) {
    fragment.append(document.createTextNode(value.slice(cursor)));
  }

  textNode.replaceWith(fragment);
  return true;
}

function brandClaraWithin(element) {
  if (!element || element.querySelector(`.${WORDMARK_CLASS}`)) return;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!String(node.nodeValue || "").includes("CLARA")) {
        return NodeFilter.FILTER_REJECT;
      }
      if (node.parentElement?.closest(`.${WORDMARK_CLASS}`)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes = [];
  let node = walker.nextNode();
  while (node) {
    nodes.push(node);
    node = walker.nextNode();
  }

  nodes.forEach(replaceClaraTextNode);
}

function getMasterclassRoot() {
  const closeButton = document.querySelector(MASTERCLASS_CLOSE_SELECTOR);
  if (!closeButton) return null;
  return closeButton.closest("div.fixed") || closeButton.parentElement?.parentElement?.parentElement || null;
}

function removeRedundantLessonEyebrows(root) {
  root.querySelectorAll("main p.uppercase").forEach((element) => {
    const value = String(element.textContent || "").trim();
    if (!LESSON_EYEBROW_PATTERN.test(value)) return;
    element.remove();
  });
}

function applyMasterclassClaraWordmarks() {
  const root = getMasterclassRoot();
  if (!root) return;

  removeRedundantLessonEyebrows(root);

  root.querySelectorAll(EMPHASIS_SELECTOR).forEach((element) => {
    if (!String(element.textContent || "").includes("CLARA")) return;
    brandClaraWithin(element);
  });
}

let frame = 0;
function scheduleWordmarkPass() {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    applyMasterclassClaraWordmarks();
  });
}

const observer = new MutationObserver(scheduleWordmarkPass);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  characterData: true,
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleWordmarkPass, { once: true });
} else {
  scheduleWordmarkPass();
}
