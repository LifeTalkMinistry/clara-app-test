import {
  WORKING_STUDENT_CARD_NOTES,
  WORKING_STUDENT_LIFE_STAGE_SOURCE,
  WORKING_STUDENT_MODAL_INSIGHTS,
  WORKING_STUDENT_STAGE_KEY,
  cleanWorkingStudentValue,
  getWorkingStudentDisplayLabel,
  getWorkingStudentQuestionContext,
  getWorkingStudentSnapshot,
  normalizeWorkingStudentInfluenceSplit,
} from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";

const LIFE_STAGE_PROFILE_KEY = "clara_life_stage_profile_v1";
const BOARD_LABEL = "CLARA CONTEXT BOARD";

const SOURCE_DISCLAIMER =
  "These sources inform CLARA’s working-student pressure model. The percentage is a 100% split of the detected pattern, not a direct published statistic.";

const HIERARCHY_LABELS = ["High Risk", "High", "Moderate", "Low Priority"];

const clean = cleanWorkingStudentValue;
const loud = (value) => clean(value).toUpperCase();
const WORKING_STUDENT_OPTIONS = new Set([
  ...WORKING_STUDENT_LIFE_STAGE_SOURCE.roots,
  ...Object.values(WORKING_STUDENT_LIFE_STAGE_SOURCE.branches).flatMap((branch) => {
    const rows = [];
    if (Array.isArray(branch.rhythm)) rows.push(...branch.rhythm);
    ["workload", "pressure", "coping", "goal"].forEach((key) => {
      const source = branch[key];
      if (!source) return;
      Object.values(source).forEach((options) => {
        if (Array.isArray(options)) rows.push(...options);
      });
    });
    return rows;
  }),
]);

function readProfile() {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_PROFILE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function isWorkingStudentActive() {
  const profile = readProfile();
  if (clean(profile.stage) === WORKING_STUDENT_STAGE_KEY) return true;
  return Array.from(document.querySelectorAll("h2, h3, p, button")).some((node) => clean(node.textContent).startsWith(WORKING_STUDENT_STAGE_KEY));
}

function findSectionByHeading(text) {
  return Array.from(document.querySelectorAll("section")).find((section) => clean(section.querySelector("h3")?.textContent) === text) || null;
}

function findHero() {
  const heading = Array.from(document.querySelectorAll("h2")).find((node) => clean(node.textContent).startsWith(WORKING_STUDENT_STAGE_KEY));
  if (!heading) return null;
  const copy = Array.from(heading.parentElement?.querySelectorAll("p") || []).find((node) => !/your life stage/i.test(clean(node.textContent)));
  return { heading, copy };
}

function patchHeroAndSupport(snapshot) {
  const hero = findHero();
  if (hero?.copy) {
    setText(hero.copy, snapshot.hero || snapshot.caption);
    hero.copy.dataset.claraWorkingStudentDataV2 = snapshot.key;
  }

  const support = findSectionByHeading("You’re not alone.") ||
    Array.from(document.querySelectorAll("section")).find((section) => section.querySelector("[data-clara-working-student-support='true']"));
  if (!support) return;
  const title = support.querySelector("h3");
  const body = title?.nextElementSibling || support.querySelector("p");
  setText(title, snapshot.supportTitle || snapshot.title);
  setText(body, snapshot.supportBody || snapshot.overview);
}

function patchQuestionBoard(profile) {
  const boardMarker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === BOARD_LABEL);
  const header = boardMarker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  if (!title || !summary) return;

  const labels = Array.from(document.querySelectorAll("section p"));
  for (const label of labels) {
    const section = label.closest("section");
    if (!section?.querySelector("button")) continue;
    const buttons = Array.from(section.querySelectorAll("button"));
    const hasWorkingStudentOption = buttons.some((button) => {
      const raw = clean(button.dataset?.claraBranchOption || button.innerText || button.textContent);
      return WORKING_STUDENT_OPTIONS.has(raw) || WORKING_STUDENT_OPTIONS.has(clean(button.dataset?.claraBranchOption));
    });
    if (!hasWorkingStudentOption) continue;
    const selected = buttons.find((button) => {
      const className = String(button.className || "");
      return className.includes("border-cyan") || className.includes("text-cyan-50") || className.includes("bg-cyan");
    }) || buttons[0];
    const option = clean(selected?.dataset?.claraBranchOption || selected?.innerText || selected?.textContent);
    const stepKey = clean(section.querySelector("p")?.textContent).toLowerCase().includes("rhythm")
      ? "rhythm"
      : clean(section.querySelector("p")?.textContent).toLowerCase().includes("load")
        ? "workload"
        : clean(section.querySelector("p")?.textContent).toLowerCase().includes("pressure right")
          ? "pressure"
          : clean(section.querySelector("p")?.textContent).toLowerCase().includes("response")
            ? "coping"
            : clean(section.querySelector("p")?.textContent).toLowerCase().includes("goal") || clean(section.querySelector("p")?.textContent).toLowerCase().includes("protect")
              ? "goal"
              : "setup";
    const context = getWorkingStudentQuestionContext(stepKey, option, profile);
    if (!context?.title || !context?.summary) return;
    setText(title, context.title);
    setText(summary, context.summary);
    summary.style.setProperty("white-space", "pre-line", "important");
    title.dataset.claraWorkingStudentDataV2 = option;
    summary.dataset.claraWorkingStudentDataV2 = option;
    return;
  }
}

function getTrendCards(section) {
  return Array.from(section?.querySelectorAll("button") || [])
    .map((card, index) => {
      const lines = Array.from(card.querySelectorAll("p"));
      const label = clean(lines[0]?.textContent);
      const value = Number(clean(lines[1]?.textContent).replace("%", ""));
      return { card, lines, label, value, index };
    })
    .filter((item) => item.lines.length >= 2);
}

function patchTrendSnapshot(snapshot) {
  const section = findSectionByHeading("Life Stage Trend Snapshot");
  if (!section) return;
  const helper = section.querySelector("h3")?.parentElement?.querySelector("p");
  setText(helper, `${snapshot.title || snapshot.key} • 100% pressure split`);

  const cards = getTrendCards(section);
  const split = snapshot.indicators?.length ? snapshot.indicators : normalizeWorkingStudentInfluenceSplit(snapshot.weights);
  split.forEach((row, index) => {
    const item = cards[index];
    if (!item) return;
    setText(item.lines[0], row.label);
    setText(item.lines[1], `${row.value}%`);
    setText(item.lines[2], HIERARCHY_LABELS[index] || "Low Priority");
    item.card.title = row.note || WORKING_STUDENT_CARD_NOTES[row.label] || "CLARA pressure split signal.";
    item.card.dataset.claraWorkingStudentDataV2 = snapshot.key;
    item.card.dataset.claraStrategicShare = `${row.value}%`;
    item.card.dataset.claraRiskHierarchy = HIERARCHY_LABELS[index] || "Low Priority";
  });
}

function patchModal(snapshot) {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Source direction" || text === "SOURCE DIRECTION" || text === "Source detection" || text === "Sources";
  });
  const modal = sourceHeading?.closest(".absolute");
  if (!sourceHeading || !modal) return;

  const title = clean(modal.querySelector("h4")?.textContent);
  const split = snapshot.indicators?.length ? snapshot.indicators : normalizeWorkingStudentInfluenceSplit(snapshot.weights);
  const match = split.find((item) => item.label === title);
  const insight = WORKING_STUDENT_MODAL_INSIGHTS[title];
  if (!match && !insight) return;

  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  const hierarchy = match ? HIERARCHY_LABELS[split.findIndex((item) => item.label === title)] || "Low Priority" : null;
  if (match) setText(valueNode, `${match.value}%`);
  if (hierarchy) setText(statusNode, hierarchy);

  if (insight) {
    const panel = modal.querySelector("[data-clara-modal-insight='true']");
    const rows = Array.from(panel?.children?.[1]?.children || []);
    const payload = [
      ["Insight", insight.insight],
      ["Pressure Signal", insight.signal],
      ["Next Move", insight.move],
    ];
    rows.forEach((row, index) => {
      const [label, text] = payload[index] || [];
      const ps = row.querySelectorAll("p");
      if (label) setText(ps[0], label);
      if (text) setText(ps[1], text);
    });
  }

  const body = Array.from(sourceHeading.closest("div")?.querySelectorAll("p") || []).find((node) => node !== sourceHeading);
  if (body) {
    setText(body, SOURCE_DISCLAIMER);
    body.hidden = false;
    body.style.display = "";
  }
}

function patchAll() {
  if (typeof document === "undefined" || !isWorkingStudentActive()) return;
  const profile = readProfile();
  const snapshot = getWorkingStudentSnapshot(profile);
  patchQuestionBoard(profile);
  patchHeroAndSupport(snapshot);
  patchTrendSnapshot(snapshot);
  patchModal(snapshot);
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_WORKING_STUDENT_DATA_UPGRADE_V3__) {
  window.__CLARA_WORKING_STUDENT_DATA_UPGRADE_V3__ = true;
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      patchAll();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener("storage", schedule, { passive: true });
  document.addEventListener("click", () => window.setTimeout(schedule, 100), { passive: true });
  window.requestAnimationFrame(schedule);
}
