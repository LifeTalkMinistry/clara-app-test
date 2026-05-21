function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

const ORDER_LABELS = ["High Risk", "High", "Moderate", "Low Priority"];

function hierarchyLabelByVisibleOrder(index) {
  return ORDER_LABELS[Math.min(index, ORDER_LABELS.length - 1)] || "Low Priority";
}

function findTrendSnapshotSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h3")?.textContent);
    return heading === "Life Stage Trend Snapshot";
  });
}

function getTrendItems(section) {
  return Array.from(section?.querySelectorAll("button") || [])
    .map((card, visualIndex) => {
      const lines = Array.from(card.querySelectorAll("p"));
      const label = clean(lines[0]?.textContent);
      const value = Number(clean(lines[1]?.textContent).replace("%", ""));
      return { card, lines, label, value, visualIndex };
    })
    .filter((item) => item.label && Number.isFinite(item.value));
}

function sortCarouselByRisk(carousel) {
  const cards = Array.from(carousel?.querySelectorAll("button") || []);
  if (!cards.length) return;

  const sorted = cards
    .map((card, currentIndex) => {
      const value = Number(clean(card.querySelectorAll("p")?.[1]?.textContent).replace("%", ""));
      return { card, currentIndex, value: Number.isFinite(value) ? value : -Infinity };
    })
    .sort((a, b) => (b.value - a.value) || (a.currentIndex - b.currentIndex));

  const alreadySorted = sorted.every((item, index) => item.card === cards[index]);
  if (alreadySorted) return;

  sorted.forEach((item) => carousel.appendChild(item.card));
}

function applyRiskScaleToCards(section) {
  const cards = getTrendItems(section);
  cards.forEach((item, index) => {
    const hierarchy = hierarchyLabelByVisibleOrder(index);
    setText(item.lines[2], hierarchy);
    item.card.dataset.claraRiskHierarchy = hierarchy;
  });
}

function getVisibleHierarchy(section, trendLabel) {
  const match = getTrendItems(section).find((item) => item.label === trendLabel);
  return match?.card?.dataset?.claraRiskHierarchy || null;
}

function enhanceOpenedTrendModal() {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Source direction" || text === "SOURCE DIRECTION";
  });

  const modal = sourceHeading?.closest(".absolute");
  if (!sourceHeading || !modal) return;

  const trendLabel = clean(modal.querySelector("h4")?.textContent);
  const section = findTrendSnapshotSection();
  const hierarchy = getVisibleHierarchy(section, trendLabel);

  const readingLabel = Array.from(modal.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Life-stage reading" || text === "LIFE-STAGE READING" || text === "Risk level reading" || text === "Risk hierarchy reading";
  });

  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  const sourceBody = sourceHeading.parentElement?.querySelector("p:last-child");

  setText(readingLabel, "Risk hierarchy reading");
  setText(sourceHeading, "Source detection");
  if (hierarchy) setText(statusNode, hierarchy);

  if (sourceBody && !sourceBody.dataset.claraModalSourceCopy) {
    setText(
      sourceBody,
      "These sources inform the pressure signals behind this reading. The hierarchy is based on how this card ranks against the other current life-stage cards, not a direct published statistic."
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
    sortCarouselByRisk(carousel);

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
