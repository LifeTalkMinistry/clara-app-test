function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function riskLevel(value, label = "") {
  const text = clean(label).toLowerCase();
  const positiveSignal =
    text.includes("potential") ||
    text.includes("control") ||
    text.includes("balance") ||
    text.includes("stability potential") ||
    text.includes("discipline") ||
    text.includes("recovery potential") ||
    text.includes("support balance");

  if (value >= 80) return positiveSignal ? "High" : "High Risk";
  if (value >= 60) return "High";
  if (value >= 40) return "Moderate";
  if (value >= 20) return "Low";
  return "Low Priority";
}

function findTrendSnapshotSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h3")?.textContent);
    return heading === "Life Stage Trend Snapshot";
  });
}

function applyRiskScaleToCards(section) {
  const cards = Array.from(section?.querySelectorAll("button") || []);
  cards.forEach((card) => {
    const lines = Array.from(card.querySelectorAll("p"));
    const label = clean(lines[0]?.textContent);
    const value = Number(clean(lines[1]?.textContent).replace("%", ""));
    if (!label || !Number.isFinite(value)) return;
    setText(lines[2], riskLevel(value, label));
  });
}

function enhanceOpenedTrendModal() {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Source direction" || text === "SOURCE DIRECTION";
  });

  const modal = sourceHeading?.closest(".absolute");
  if (!sourceHeading || !modal) return;

  const trendLabel = clean(modal.querySelector("h4")?.textContent);
  const readingLabel = Array.from(modal.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Life-stage reading" || text === "LIFE-STAGE READING" || text === "Risk level reading";
  });

  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  const modalValue = Number(clean(valueNode?.textContent).replace("%", ""));
  const sourceBody = sourceHeading.parentElement?.querySelector("p:last-child");

  setText(readingLabel, "Risk level reading");
  setText(sourceHeading, "Source detection");
  if (Number.isFinite(modalValue)) setText(statusNode, riskLevel(modalValue, trendLabel));

  if (sourceBody && !sourceBody.dataset.claraModalSourceCopy) {
    setText(
      sourceBody,
      "These sources inform the pressure signals behind this reading. The percentage is CLARA’s pattern estimate, not a direct published statistic."
    );
    sourceBody.dataset.claraModalSourceCopy = "true";
  }
}

function enhanceTrendSnapshot() {
  const section = findTrendSnapshotSection();
  if (!section) return;

  section.dataset.claraTrendSnapshot = "true";

  const header = section.querySelector("h3")?.closest("div");
  if (header) header.dataset.claraTrendHeader = "true";

  const carousel = Array.from(section.querySelectorAll("div")).find((node) => {
    const className = String(node.className || "");
    return className.includes("snap-x") && className.includes("overflow-x-auto");
  });

  if (carousel) {
    carousel.dataset.claraTrendCarousel = "true";
    const cards = Array.from(carousel.querySelectorAll("button"));
    cards.forEach((card, index) => {
      card.dataset.claraTrendCard = "true";
      card.dataset.claraTrendPrimary = index === 0 ? "true" : "false";
      card.dataset.claraTrendIndex = String(index + 1);
    });
  }

  applyRiskScaleToCards(section);
  enhanceOpenedTrendModal();
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_TREND_SNAPSHOT_POLISH__) {
  window.__CLARA_TREND_SNAPSHOT_POLISH__ = true;

  let scheduled = false;
  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceTrendSnapshot();
      enhanceOpenedTrendModal();
    });
  };

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => window.setTimeout(scheduleEnhance, 80), { passive: true });
  window.requestAnimationFrame(scheduleEnhance);
}
