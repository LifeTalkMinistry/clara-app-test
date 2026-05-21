function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

const ORDER_LABELS = ["High Risk", "High", "Moderate", "Low Priority"];

const STRATEGIC_WEIGHTS = {
  "Recovery Gap": 28,
  "Essential-Cost Load": 35,
  "Cash Buffer Risk": 22,
  "Stability Potential": 15,
  "Responsibility Load": 28,
  "Shared-Money Pressure": 35,
  "Boundary Risk": 24,
  "Support Balance": 13,
  "Fatigue Load": 35,
  "Schedule-Cost Pressure": 27,
  "Convenience Spend Risk": 24,
  "Recovery Potential": 14,
  "Debt Stress Load": 29,
  "Repayment Pressure": 37,
  "Cash-Flow Stability": 22,
  "Emotional Fatigue": 28,
  "Daily Pressure": 23,
  "Reward Frequency Risk": 34,
  "Reward Control": 15,
  "Independence Load": 28,
  "Essential Pressure": 33,
  "Buffer Stability": 25,
  "Discipline Potential": 14,
  "Fatigue Watch": 30,
  "Cost Pressure": 27,
  "Routine Stability": 24,
  "Future Potential": 19,
  "Burnout Watch": 30,
  "Financial Pressure": 27,
  "Micro-Spend Risk": 24
};

function hierarchyLabelByVisibleOrder(index) {
  return ORDER_LABELS[Math.min(index, ORDER_LABELS.length - 1)] || "Low Priority";
}

function findTrendSnapshotSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => clean(section.querySelector("h3")?.textContent) === "Life Stage Trend Snapshot");
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

function normalizeStrategicWeights(items) {
  const mapped = items.map((item) => ({
    ...item,
    strategicValue: Number.isFinite(STRATEGIC_WEIGHTS[item.label]) ? STRATEGIC_WEIGHTS[item.label] : item.value,
  }));
  const total = mapped.reduce((sum, item) => sum + Math.max(0, item.strategicValue), 0) || 1;
  const rows = mapped.map((item) => {
    const exact = (Math.max(0, item.strategicValue) / total) * 100;
    const value = Math.floor(exact);
    return { ...item, value, rest: exact - value };
  });
  let left = 100 - rows.reduce((sum, item) => sum + item.value, 0);
  rows.slice().sort((a, b) => b.rest - a.rest).forEach((item) => {
    if (left <= 0) return;
    item.value += 1;
    left -= 1;
  });
  return rows.sort((a, b) => (b.value - a.value) || (a.visualIndex - b.visualIndex));
}

function applyStrategicWeights(section) {
  const items = getTrendItems(section);
  if (!items.some((item) => Number.isFinite(STRATEGIC_WEIGHTS[item.label]))) return;
  const weighted = normalizeStrategicWeights(items);
  weighted.forEach((item) => {
    setText(item.lines[1], `${item.value}%`);
    item.card.dataset.claraStrategicShare = `${item.value}%`;
  });
}

function sortCarouselByRisk(carousel) {
  const cards = Array.from(carousel?.querySelectorAll("button") || []);
  const sorted = cards
    .map((card, currentIndex) => {
      const value = Number(clean(card.querySelectorAll("p")?.[1]?.textContent).replace("%", ""));
      return { card, currentIndex, value: Number.isFinite(value) ? value : -Infinity };
    })
    .sort((a, b) => (b.value - a.value) || (a.currentIndex - b.currentIndex));
  if (sorted.every((item, index) => item.card === cards[index])) return;
  sorted.forEach((item) => carousel.appendChild(item.card));
}

function applyRiskScaleToCards(section) {
  getTrendItems(section).forEach((item, index) => {
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
  const match = getTrendItems(section).find((item) => item.label === trendLabel);

  const readingLabel = Array.from(modal.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Life-stage reading" || text === "LIFE-STAGE READING" || text === "Risk level reading" || text === "Risk hierarchy reading";
  });
  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  const sourceBody = sourceHeading.parentElement?.querySelector("p:last-child");

  setText(readingLabel, "Risk hierarchy reading");
  setText(sourceHeading, "Source detection");
  if (match) setText(valueNode, `${match.value}%`);
  if (hierarchy) setText(statusNode, hierarchy);
  if (sourceBody && !sourceBody.dataset.claraModalSourceCopy) {
    setText(sourceBody, "These sources inform the pressure signals behind this reading. The percentage is a strategic CLARA influence estimate, shaped by the selected Working Student pattern, not a direct published statistic.");
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
    applyStrategicWeights(section);
    sortCarouselByRisk(carousel);
    Array.from(carousel.querySelectorAll("button")).forEach((card, index) => {
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
