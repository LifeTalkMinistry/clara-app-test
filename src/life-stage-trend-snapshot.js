const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function isWorkingStudent() {
  return clean(readProfile().stage) === "Working Student";
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function influenceLabel(value) {
  if (value >= 30) return "Primary";
  if (value >= 24) return "Strong";
  if (value >= 18) return "Active";
  return "Supporting";
}

function findTrendSnapshotSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h3")?.textContent);
    return heading === "Life Stage Trend Snapshot";
  });
}

function normalizeToHundred(values) {
  const total = values.reduce((sum, value) => sum + Math.max(0, value), 0) || 1;
  const rows = values.map((value, index) => {
    const exact = (Math.max(0, value) / total) * 100;
    const roundedDown = Math.floor(exact);
    return { index, value: roundedDown, remainder: exact - roundedDown };
  });

  let remainder = 100 - rows.reduce((sum, row) => sum + row.value, 0);
  rows
    .slice()
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((row) => {
      if (remainder <= 0) return;
      row.value += 1;
      remainder -= 1;
    });

  return rows;
}

function applyWorkingStudentInfluenceBreakdown(section) {
  if (!isWorkingStudent() || !section) return;

  const header = section.querySelector("h3")?.closest("div");
  const helper = header?.querySelector("p");
  setText(helper, "Influence breakdown • totals 100%");

  const cards = Array.from(section.querySelectorAll("button"));
  const rawValues = cards.map((card) => {
    const valueNode = card.querySelectorAll("p")?.[1];
    return Number(clean(valueNode?.textContent).replace("%", ""));
  });

  if (!rawValues.length || rawValues.some((value) => !Number.isFinite(value))) return;
  const total = rawValues.reduce((sum, value) => sum + value, 0);
  const shares = total === 100 ? rawValues.map((value, index) => ({ index, value })) : normalizeToHundred(rawValues);

  shares.forEach((share) => {
    const card = cards[share.index];
    const lines = card?.querySelectorAll("p");
    if (!lines?.length) return;
    setText(lines[1], `${share.value}%`);
    setText(lines[2], influenceLabel(share.value));
    card.dataset.claraInfluenceShare = `${share.value}%`;
  });
}

function enhanceOpenDetailPanel() {
  if (!isWorkingStudent()) return;

  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => clean(node.textContent) === "Source direction");
  const detailRoot = sourceHeading?.closest(".absolute");
  if (!detailRoot) return;

  const title = clean(detailRoot.querySelector("h4")?.textContent);
  const section = findTrendSnapshotSection();
  const card = Array.from(section?.querySelectorAll("button") || []).find((button) => clean(button.querySelector("p")?.textContent) === title);
  const share = clean(card?.dataset.claraInfluenceShare);
  if (!share) return;

  const readingLabel = Array.from(detailRoot.querySelectorAll("p")).find((node) => clean(node.textContent) === "Life-stage reading");
  const valueNode = Array.from(detailRoot.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  const shareValue = Number(share.replace("%", ""));

  setText(readingLabel, "Influence share");
  setText(valueNode, share);
  setText(statusNode, influenceLabel(shareValue));

  const sourceBody = sourceHeading?.parentElement?.querySelector("p:last-child");
  if (sourceBody) {
    setText(
      sourceBody,
      "This percentage shows this factor’s share of the current Working Student influence breakdown. The snapshot cards total 100%. Sources inform the pressure signals, not the exact percentage."
    );
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

  applyWorkingStudentInfluenceBreakdown(section);
  enhanceOpenDetailPanel();
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
    });
  };

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener("click", () => window.setTimeout(scheduleEnhance, 80), { passive: true });
  window.addEventListener("storage", scheduleEnhance, { passive: true });
  scheduleEnhance();
}
