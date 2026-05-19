function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findTrendSnapshotSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h3")?.textContent);
    return heading === "Life Stage Trend Snapshot";
  });
}

function enhanceTrendSnapshot() {
  const section = findTrendSnapshotSection();
  if (!section) return false;

  if (section.dataset.claraTrendSnapshot !== "true") {
    section.dataset.claraTrendSnapshot = "true";
  }

  const header = section.querySelector("h3")?.closest("div");
  if (header && header.dataset.claraTrendHeader !== "true") {
    header.dataset.claraTrendHeader = "true";
  }

  const carousel = Array.from(section.querySelectorAll("div")).find((node) => {
    const className = String(node.className || "");
    return className.includes("snap-x") && className.includes("overflow-x-auto");
  });

  if (carousel) {
    if (carousel.dataset.claraTrendCarousel !== "true") {
      carousel.dataset.claraTrendCarousel = "true";
    }

    const cards = Array.from(carousel.querySelectorAll("button"));
    cards.forEach((card, index) => {
      const primary = index === 0 ? "true" : "false";
      const cardIndex = String(index + 1);
      if (card.dataset.claraTrendCard !== "true") card.dataset.claraTrendCard = "true";
      if (card.dataset.claraTrendPrimary !== primary) card.dataset.claraTrendPrimary = primary;
      if (card.dataset.claraTrendIndex !== cardIndex) card.dataset.claraTrendIndex = cardIndex;
    });
  }

  return true;
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_TREND_SNAPSHOT_POLISH__) {
  window.__CLARA_TREND_SNAPSHOT_POLISH__ = true;

  let timer = null;
  const run = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => window.requestAnimationFrame(enhanceTrendSnapshot), 220);
  };

  window.addEventListener("hashchange", run);
  window.addEventListener("clara:intelligence-updated", run);
  window.addEventListener("clara:life-stage-intelligence-updated", run);
  document.addEventListener("click", run, true);
  window.requestAnimationFrame(enhanceTrendSnapshot);
}
