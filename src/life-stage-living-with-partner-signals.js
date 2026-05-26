import {
  LIVING_WITH_PARTNER_STAGE_KEY,
  getLivingWithPartnerBehaviorProfile,
} from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function isLivingWithPartner() {
  return clean(readProfile().stage) === LIVING_WITH_PARTNER_STAGE_KEY;
}

function trendSnapshotSection() {
  return Array.from(document.querySelectorAll("section")).find((section) => clean(section.querySelector("h3")?.textContent) === "Life Stage Trend Snapshot");
}

const TREND_PATHS = {
  stable: "M2 24 C14 22 20 20 30 19 C42 18 48 16 58 15 C70 14 78 13 90 11",
  wave: "M2 24 C10 20 16 25 24 18 C33 10 40 23 49 15 C59 7 66 22 75 14 C82 8 87 12 90 10",
  spike: "M2 27 C10 24 15 24 22 17 C28 10 34 18 39 7 C45 20 51 12 57 16 C65 21 69 9 76 13 C83 17 86 10 90 11",
  volatile: "M2 29 C8 25 13 27 18 20 C23 12 29 18 34 8 C41 28 47 7 53 17 C59 26 64 11 71 12 C79 13 83 8 90 10",
  upward: "M2 28 C12 24 17 24 26 20 C36 15 42 17 51 13 C62 8 68 12 77 9 C84 6 88 7 90 5",
};

function applyTrendPath(card, trendType) {
  const path = card.querySelector("svg path");
  if (path) path.setAttribute("d", TREND_PATHS[trendType] || TREND_PATHS.wave);
}

function enhanceSnapshot() {
  if (!isLivingWithPartner()) return;

  const section = trendSnapshotSection();
  if (!section) return;

  const behavior = getLivingWithPartnerBehaviorProfile(readProfile());
  const items = Array.from(section.querySelectorAll("button"))
    .map((card, index) => ({ card, index, lines: Array.from(card.querySelectorAll("p")) }))
    .filter((item) => item.lines.length >= 3);

  section.dataset.claraTrendSnapshot = "true";
  section.dataset.claraSnapshotModel = "living-with-partner-stage-engine";

  const subtitle = Array.from(section.querySelectorAll("p")).find((node) => clean(node.textContent).includes("Swipe") || clean(node.textContent).includes("100%"));
  if (subtitle) subtitle.textContent = "100% split of your current shared-life pressure.";

  items.forEach((item, index) => {
    const data = behavior.snapshotDistribution[index];
    if (!data) {
      item.card.style.display = "none";
      return;
    }

    item.card.style.display = "";
    item.lines[0].textContent = data.label;
    item.lines[1].textContent = `${data.value}%`;
    item.lines[2].textContent = data.status;
    item.card.dataset.claraSnapshotKey = data.key;
    item.card.dataset.claraSnapshotLabel = data.label;
    item.card.dataset.claraSnapshotValue = String(data.value);
    item.card.dataset.claraSnapshotStatus = data.status;
    item.card.dataset.claraSnapshotNote = data.note;
    item.card.dataset.claraSnapshotInsight = data.insight;
    item.card.dataset.claraSnapshotAction = data.action;
    item.card.dataset.claraSnapshotTrend = data.trendType;
    item.card.dataset.claraSnapshotCategory = data.category;
    item.card.dataset.claraTrendCard = "true";
    item.card.dataset.claraTrendPrimary = index === 0 ? "true" : "false";
    item.card.dataset.claraTrendIndex = String(index + 1);
    applyTrendPath(item.card, data.trendType);
  });
}

function rememberSnapshotClick(event) {
  if (!isLivingWithPartner()) return;

  const card = event.target?.closest?.("button[data-clara-snapshot-label]");
  if (!card) return;

  window.__CLARA_LAST_LIVING_PARTNER_SNAPSHOT__ = {
    label: card.dataset.claraSnapshotLabel,
    value: card.dataset.claraSnapshotValue,
    status: card.dataset.claraSnapshotStatus,
    note: card.dataset.claraSnapshotNote,
    insight: card.dataset.claraSnapshotInsight,
    action: card.dataset.claraSnapshotAction,
  };
}

function enhanceModal() {
  if (!isLivingWithPartner()) return;

  const snapshot = window.__CLARA_LAST_LIVING_PARTNER_SNAPSHOT__;
  if (!snapshot) return;

  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => clean(node.textContent).toLowerCase().includes("source") || clean(node.textContent).toLowerCase().includes("basis"));
  const modal = sourceHeading?.closest(".absolute");
  if (!modal) return;

  const title = modal.querySelector("h4");
  const intro = title?.nextElementSibling;
  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;

  if (title) title.textContent = snapshot.label;
  if (intro && intro.tagName === "P") intro.textContent = snapshot.note;
  if (valueNode) valueNode.textContent = `${snapshot.value}%`;
  if (statusNode) statusNode.textContent = snapshot.status;

  modal.querySelector("[data-clara-living-partner-insight='true']")?.remove?.();
}

function maintain() {
  if (!isLivingWithPartner()) return;
  enhanceSnapshot();
  enhanceModal();
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIVING_WITH_PARTNER_SIGNALS__) return;

  window.__CLARA_LIVING_WITH_PARTNER_SIGNALS__ = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      maintain();
    });
  };

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.addEventListener("click", (event) => {
    rememberSnapshotClick(event);
    window.setTimeout(schedule, 80);
  }, { passive: true, capture: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("storage", schedule, { passive: true });
  window.addEventListener("clara:life-stage-profile-updated", schedule, { passive: true });
  schedule();
}

try {
  install();
} catch (error) {
  console.warn("CLARA Living with Partner snapshot bridge failed:", error);
}
