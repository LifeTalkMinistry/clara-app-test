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
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_TREND_SNAPSHOT_POLISH__) {
  window.__CLARA_TREND_SNAPSHOT_POLISH__ = true;
  const observer = new MutationObserver(() => window.requestAnimationFrame(enhanceTrendSnapshot));
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.requestAnimationFrame(enhanceTrendSnapshot);
}
