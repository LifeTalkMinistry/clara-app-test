const CALM_MARKER = "clara-me-calm-mode";

function textOf(node) {
  return String(node?.innerText || node?.textContent || "").replace(/\s+/g, " ").trim();
}

function closestBlock(node, stopAt) {
  let current = node?.parentElement;
  while (current && current !== stopAt && current !== document.body) {
    const className = String(current.className || "");
    if (current.tagName === "SECTION" || className.includes("rounded-[28px]") || className.includes("rounded-[30px]")) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function findNodeByText(text) {
  const wanted = text.toLowerCase();
  return Array.from(document.querySelectorAll("section, div, p, h3, summary")).find((node) => textOf(node).toLowerCase().includes(wanted));
}

function findSectionByText(text) {
  const node = findNodeByText(text);
  return node?.tagName === "SECTION" ? node : node?.closest?.("section") || closestBlock(node);
}

function softenContainer(element) {
  if (!element || element.dataset.claraSoftened === "true") return;
  element.dataset.claraSoftened = "true";
  element.style.borderColor = "rgba(255,255,255,0.07)";
  element.style.boxShadow = "0 10px 30px rgba(0,0,0,0.10)";
}

function flattenSummary(summary) {
  if (!summary) return;
  softenContainer(summary);

  Array.from(summary.querySelectorAll("div")).forEach((block) => {
    const text = textOf(block);
    const className = String(block.className || "");

    if (/Storage status/i.test(text)) {
      block.style.display = "none";
      return;
    }

    if (className.includes("rounded-[20px]") || className.includes("rounded-2xl")) {
      if (text.length > 8 && !/What CLARA knows|Personal understanding/i.test(text)) {
        block.style.borderColor = "transparent";
        block.style.background = "transparent";
        block.style.boxShadow = "none";
        block.style.borderRadius = "0px";
        block.style.paddingLeft = "0px";
        block.style.paddingRight = "0px";
      }
    }
  });
}

function calmMePage() {
  const root = document.getElementById("root");
  const pageText = textOf(root);
  const isMeMemoryPage = pageText.includes("Personal Cabinet") && pageText.includes("What CLARA knows");

  if (!isMeMemoryPage) {
    document.body.classList.remove(CALM_MARKER);
    return;
  }

  document.body.classList.add(CALM_MARKER);

  const areaSection = findSectionByText("CLARA’s understanding areas") || findSectionByText("CLARA's understanding areas");
  if (areaSection) areaSection.style.display = "none";

  const summary = findSectionByText("What CLARA knows");
  flattenSummary(summary);

  const details = findSectionByText("See everything CLARA knows");
  if (details) {
    softenContainer(details);
    details.style.marginTop = "4px";
  }
}

function installCalmStyles() {
  if (document.getElementById("clara-me-calm-style")) return;
  const style = document.createElement("style");
  style.id = "clara-me-calm-style";
  style.textContent = `
    body.${CALM_MARKER} section {
      transition: opacity .18s ease, transform .18s ease, border-color .18s ease;
    }
    body.${CALM_MARKER} section p,
    body.${CALM_MARKER} section h3,
    body.${CALM_MARKER} section span {
      text-shadow: none !important;
    }
    body.${CALM_MARKER} section [class*="uppercase"] {
      letter-spacing: .12em !important;
      opacity: .72;
    }
    body.${CALM_MARKER} details summary {
      min-height: unset !important;
    }
  `;
  document.head.appendChild(style);
}

export function installClaraMePanel() {
  if (typeof window === "undefined" || window.__claraMeCalmInstalled) return;
  window.__claraMeCalmInstalled = true;
  installCalmStyles();

  const run = () => window.requestAnimationFrame(calmMePage);
  run();
  window.addEventListener("hashchange", () => setTimeout(run, 160));
  window.addEventListener("clara-behavioral-memory-updated", () => setTimeout(run, 80));

  const root = document.getElementById("root");
  if (root) {
    new MutationObserver(() => setTimeout(run, 100)).observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }
}

installClaraMePanel();
