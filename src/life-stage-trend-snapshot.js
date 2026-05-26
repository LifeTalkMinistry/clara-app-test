import { getLifeStageSnapshot } from "./life-stage-snapshot";
import { readSelectedLifeStageProfile, getSelectedLifeStageKey } from "./life-stage-flow";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

const TREND_PATHS = {
  stable: "M2 24 C14 22 20 20 30 19 C42 18 48 16 58 15 C70 14 78 13 90 11",
  wave: "M2 24 C10 20 16 25 24 18 C33 10 40 23 49 15 C59 7 66 22 75 14 C82 8 87 12 90 10",
  spike: "M2 27 C10 24 15 24 22 17 C28 10 34 18 39 7 C45 20 51 12 57 16 C65 21 69 9 76 13 C83 17 86 10 90 11",
  volatile: "M2 29 C8 25 13 27 18 20 C23 12 29 18 34 8 C41 28 47 7 53 17 C59 26 64 11 71 12 C79 13 83 8 90 10",
  downward: "M2 9 C12 10 17 13 26 12 C37 15 43 19 52 18 C63 21 70 25 78 24 C84 26 88 28 90 28",
  upward: "M2 28 C12 24 17 24 26 20 C36 15 42 17 51 13 C62 8 68 12 77 9 C84 6 88 7 90 5",
};

const SOURCE_REFERENCES = [
  {
    id: "bsp",
    badge: "BSP",
    name: "Bangko Sentral ng Pilipinas",
    url: "https://www.bsp.gov.ph/",
    terms: ["budget", "discipline", "salary", "payday", "cutoff", "saving", "savings", "cash", "spending", "bill", "bills", "debt", "borrow", "borrowing", "financial", "money"],
  },
  {
    id: "psa",
    badge: "PSA",
    name: "Philippine Statistics Authority",
    url: "https://psa.gov.ph/",
    terms: ["household", "family", "income", "food", "transport", "commute", "rent", "living cost", "living costs", "essential", "essentials", "child", "home"],
  },
  {
    id: "dof",
    badge: "DOF",
    name: "Department of Finance",
    url: "https://www.dof.gov.ph/",
    terms: ["tax", "finance", "repayment", "obligation", "debt", "pay-later", "installment", "installments"],
  },
  {
    id: "neda",
    badge: "NEDA",
    name: "National Economic and Development Authority",
    url: "https://neda.gov.ph/",
    terms: ["planning", "future", "growth", "development", "protection", "welfare", "stability", "career", "goals", "goal"],
  },
  {
    id: "dti",
    badge: "DTI",
    name: "Department of Trade and Industry",
    url: "https://www.dti.gov.ph/",
    terms: ["business", "sales", "operating", "owner", "inventory", "consumer", "trade", "client", "freelance", "entrepreneur", "tools", "course", "courses"],
  },
];

function sourceText(snapshot = {}) {
  return [snapshot.label, snapshot.status, snapshot.note, snapshot.insight, snapshot.action]
    .map(clean)
    .join(" ")
    .toLowerCase();
}

function getSnapshotSources(snapshot = {}) {
  const text = sourceText(snapshot);
  const matched = SOURCE_REFERENCES.filter((source) => source.terms.some((term) => text.includes(term))).slice(0, 3);
  return matched.length ? matched : [SOURCE_REFERENCES[0]];
}

function renderSnapshotSourceLinks(sourceBox, snapshot = {}) {
  const sources = getSnapshotSources(snapshot);
  const signature = sources.map((source) => source.id).join("|");
  if (sourceBox.dataset.claraSnapshotSourceSignature === signature) return;
  sourceBox.dataset.claraSnapshotSourceSignature = signature;

  sourceBox.querySelector("[data-clara-snapshot-source-links='true']")?.remove?.();

  const row = document.createElement("div");
  row.dataset.claraSnapshotSourceLinks = "true";
  row.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:10px;overflow-x:auto;padding:0 0 2px;scrollbar-width:none;";

  sources.forEach((source, index) => {
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = source.name;
    link.setAttribute("aria-label", `Open ${source.name}`);
    link.textContent = source.badge;
    link.style.cssText = `display:grid;place-items:center;min-width:44px;width:44px;height:34px;border-radius:14px;border:1px solid ${index === 0 ? "rgba(165,243,252,.34)" : "rgba(255,255,255,.10)"};background:${index === 0 ? "rgba(125,211,252,.14)" : "rgba(255,255,255,.045)"};color:rgba(255,255,255,.90);font-size:9px;font-weight:950;letter-spacing:.04em;text-decoration:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 8px 18px rgba(0,0,0,.12);pointer-events:auto;`;
    row.appendChild(link);
  });

  sourceBox.appendChild(row);
}

function findTrendSnapshotSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => clean(section.querySelector("h3")?.textContent) === "Life Stage Trend Snapshot");
}

function getTrendItems(section) {
  return Array.from(section?.querySelectorAll("button") || [])
    .map((card, visualIndex) => {
      const lines = Array.from(card.querySelectorAll("p"));
      return { card, lines, visualIndex };
    })
    .filter((item) => item.lines.length >= 3);
}

function applyTrendPath(card, trendType) {
  const path = card.querySelector("svg path");
  if (!path) return;
  path.setAttribute("d", TREND_PATHS[trendType] || TREND_PATHS.wave);
}

function applyDistributionToCards(section, distribution) {
  const items = getTrendItems(section);
  items.forEach((item, index) => {
    const data = distribution[index];
    if (!data) {
      item.card.style.display = "none";
      return;
    }

    item.card.style.display = "";
    setText(item.lines[0], data.label);
    setText(item.lines[1], `${data.value}%`);
    setText(item.lines[2], data.status);
    item.card.dataset.claraSnapshotKey = data.key || data.label;
    item.card.dataset.claraSnapshotLabel = data.label;
    item.card.dataset.claraSnapshotValue = String(data.value);
    item.card.dataset.claraSnapshotStatus = data.status;
    item.card.dataset.claraSnapshotNote = data.note || "This card reflects part of the current life stage pressure distribution.";
    item.card.dataset.claraSnapshotInsight = data.insight || "This pattern is part of the current behavioral reality.";
    item.card.dataset.claraSnapshotAction = data.action || "Choose one smaller next step before pressure gets heavier.";
    item.card.dataset.claraSnapshotTrend = data.trendType || "wave";
    item.card.dataset.claraSnapshotCategory = data.category || "stability";
    item.card.dataset.claraTrendCard = "true";
    item.card.dataset.claraTrendPrimary = index === 0 ? "true" : "false";
    item.card.dataset.claraTrendIndex = String(index + 1);
    applyTrendPath(item.card, data.trendType);
  });
}

function updateSnapshotSubtitle(section, subtitleText) {
  const subtitle = Array.from(section.querySelectorAll("p")).find((node) => clean(node.textContent) === "Swipe the stage cards." || clean(node.textContent).includes("100% split"));
  if (subtitle) setText(subtitle, subtitleText);
}

function rememberClickedCard(event) {
  const section = findTrendSnapshotSection();
  if (!section) return;
  const card = event.target?.closest?.("button[data-clara-snapshot-label]");
  if (!card || !section.contains(card)) return;
  window.__CLARA_LAST_LIFE_STAGE_SNAPSHOT__ = {
    label: card.dataset.claraSnapshotLabel,
    value: card.dataset.claraSnapshotValue,
    status: card.dataset.claraSnapshotStatus,
    note: card.dataset.claraSnapshotNote,
    insight: card.dataset.claraSnapshotInsight,
    action: card.dataset.claraSnapshotAction,
  };
}

function createInsightRow(label, text, accent) {
  return `
    <div style="position:relative;padding:11px 12px 11px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);box-shadow:inset 0 1px 0 rgba(255,255,255,.045);">
      <span style="position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:999px;background:${accent};box-shadow:0 0 18px ${accent};"></span>
      <p style="margin:0 0 5px;font-size:9px;font-weight:950;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.62);">${label}</p>
      <p style="margin:0;font-size:12px;line-height:1.62;color:rgba(255,255,255,.86);">${text}</p>
    </div>
  `;
}

function stabilizeModalSurface(modal) {
  modal.style.background = "linear-gradient(180deg, rgba(6, 14, 33, 0.97), rgba(22, 12, 56, 0.985))";
  modal.style.backdropFilter = "blur(22px) saturate(1.04)";
  modal.style.webkitBackdropFilter = "blur(22px) saturate(1.04)";
  modal.style.overflow = "hidden";
}

function upsertInsightPanel(modal, snapshot) {
  const sourceHeading = Array.from(modal.querySelectorAll("p")).find((node) => clean(node.textContent).toLowerCase().includes("source") || clean(node.textContent).toLowerCase().includes("basis"));
  if (!sourceHeading) return;
  const sourceBox = sourceHeading.closest("div");
  if (!sourceBox) return;

  let panel = modal.querySelector("[data-clara-modal-insight='true']");
  if (!panel) {
    panel = document.createElement("div");
    panel.dataset.claraModalInsight = "true";
    sourceBox.parentElement?.insertBefore(panel, sourceBox);
  }

  panel.style.cssText = "margin:16px 0 12px;padding:15px;border-radius:24px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg, rgba(255,255,255,.060), rgba(255,255,255,.028));box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 18px 42px rgba(0,0,0,.12);";
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">
      <p style="margin:0;font-size:10px;font-weight:950;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.82);">100% Pressure Split</p>
    </div>
    <div style="display:grid;gap:9px;">
      ${createInsightRow("Meaning", snapshot.note, "rgba(34,211,238,.75)")}
      ${createInsightRow("Why it matters", snapshot.insight, "rgba(251,113,133,.72)")}
      ${createInsightRow("Next move", snapshot.action, "rgba(167,139,250,.78)")}
    </div>
  `;
}

function compactSources(modal, snapshot) {
  const sourceHeading = Array.from(modal.querySelectorAll("p")).find((node) => clean(node.textContent).toLowerCase().includes("source") || clean(node.textContent).toLowerCase().includes("basis"));
  const sourceBox = sourceHeading?.closest("div");
  if (!sourceBox) return;
  setText(sourceHeading, "Snapshot basis");
  Array.from(sourceBox.querySelectorAll("p")).forEach((node) => {
    if (node === sourceHeading) return;
    node.hidden = true;
    node.style.display = "none";
  });
  renderSnapshotSourceLinks(sourceBox, snapshot);
}

function enhanceOpenedTrendModal() {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Source direction" || text === "SOURCE DIRECTION" || text === "Source detection" || text === "Sources" || text === "Snapshot basis";
  });
  const modal = sourceHeading?.closest(".absolute");
  const snapshot = window.__CLARA_LAST_LIFE_STAGE_SNAPSHOT__;
  if (!sourceHeading || !modal || !snapshot) return;

  const title = modal.querySelector("h4");
  const intro = title?.nextElementSibling;
  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  const readingLabel = Array.from(modal.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Life-stage reading" || text === "LIFE-STAGE READING" || text === "Risk level reading" || text === "Risk hierarchy reading" || text === "Behavioral distribution share";
  });

  stabilizeModalSurface(modal);
  setText(title, snapshot.label);
  if (intro && intro.tagName === "P") {
    intro.hidden = false;
    setText(intro, snapshot.note);
  }
  setText(readingLabel, "Behavioral distribution share");
  setText(valueNode, `${snapshot.value}%`);
  setText(statusNode, snapshot.status);
  upsertInsightPanel(modal, snapshot);
  compactSources(modal, snapshot);
}

function enhanceTrendSnapshot() {
  const profile = readSelectedLifeStageProfile() || {};
  const stage = profile.stage || getSelectedLifeStageKey();
  const section = findTrendSnapshotSection();
  if (!section) return;
  const snapshot = getLifeStageSnapshot(stage, profile);
  section.dataset.claraTrendSnapshot = "true";
  section.dataset.claraSnapshotModel = snapshot.model;
  applyDistributionToCards(section, snapshot.cards || []);
  updateSnapshotSubtitle(section, snapshot.subtitle);
  enhanceOpenedTrendModal();
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_STAGE_CANONICAL_SNAPSHOT__) {
  window.__CLARA_LIFE_STAGE_CANONICAL_SNAPSHOT__ = true;
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
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener("click", (event) => {
    rememberClickedCard(event);
    window.setTimeout(scheduleEnhance, 80);
  }, { passive: true, capture: true });
  window.addEventListener("storage", scheduleEnhance);
  window.addEventListener("clara:life-stage-profile-updated", scheduleEnhance, { passive: true });
  window.requestAnimationFrame(scheduleEnhance);
}
