const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const WORKING_STUDENT_STAGE = "Working Student";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function readLifeStageProfile() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "null");
  } catch {
    return null;
  }
}

const SNAPSHOT_META = {
  "Emotional Fatigue": {
    category: "energy",
    note: "School, work, commute, and recovery pressure may be occupying a large part of the student's money behavior.",
    insight: "Fatigue can turn simple decisions into shortcut spending, skipped tracking, or comfort purchases.",
    action: "Protect one low-energy routine for food, commute, and quick check-ins before the week gets heavy.",
    trend: "volatile",
  },
  "Financial Instability": {
    category: "stability",
    note: "Income timing or income consistency may be making planning harder than the student’s discipline level suggests.",
    insight: "The issue may be rhythm: expenses can feel fixed while money arrives unevenly.",
    action: "Separate essentials first, then let flexible spending adjust based on the real income week.",
    trend: "wave",
  },
  "Reward Spending Risk": {
    category: "stability",
    note: "Small rewards may be acting as quick relief after pressure, effort, or emotionally heavy days.",
    insight: "The risk is not one reward; it is repeated relief spending becoming the easiest recovery habit.",
    action: "Keep rewards, but set the amount and timing before stress peaks.",
    trend: "spike",
  },
  "Recovery Weakness": {
    category: "energy",
    note: "Low rest or low recovery may be weakening planning, tracking, and spending discipline.",
    insight: "When rest disappears, spending often becomes the fastest available form of recovery.",
    action: "Add one no-spend recovery option and one prepared low-cost fallback for tired days.",
    trend: "downward",
  },
  "Survival Pressure": {
    category: "pressure",
    note: "Food, fare, school requirements, and daily basics may be competing for the same limited money.",
    insight: "This is not careless spending; this is essential-cost pressure taking up space in the week.",
    action: "Protect food, fare, school materials, and attendance costs before flexible spending.",
    trend: "volatile",
  },
  "Mental Overload": {
    category: "energy",
    note: "The student may be carrying too many decisions across school, work, money, and personal responsibilities.",
    insight: "Overload can make even simple budgeting feel heavier than it should.",
    action: "Reduce the plan to one priority and one simple money rule for the current week.",
    trend: "spike",
  },
  "Routine Instability": {
    category: "stability",
    note: "Changing routines, shifting schedules, or uneven weeks may be making consistency difficult.",
    insight: "The budget may fail when it assumes a perfect week that the student does not actually have.",
    action: "Use flexible weekly caps instead of one rigid routine.",
    trend: "wave",
  },
  "Convenience Spending Risk": {
    category: "stability",
    note: "Convenience may be becoming the natural response to low time, low energy, or rushed days.",
    insight: "Convenience spending often comes from exhaustion, not laziness.",
    action: "Prepare one cheaper convenience substitute before the hardest part of the day.",
    trend: "spike",
  },
  "Borrowing Risk": {
    category: "pressure",
    note: "Cash-flow gaps, delayed payments, or survival needs may be pushing the student toward borrowing.",
    insight: "Borrowing often appears when timing fails before income arrives.",
    action: "Protect a tiny food/fare gap buffer before optional spending.",
    trend: "volatile",
  },
  "Family Burden": {
    category: "pressure",
    note: "Family support may be sharing the same money and energy needed for school and daily stability.",
    insight: "The pressure is care plus boundary difficulty, not just financial generosity.",
    action: "Create a support limit that protects family care and the student’s own essentials.",
    trend: "wave",
  },
  "Tuition Pressure": {
    category: "pressure",
    note: "School continuity may be the main money pressure, especially around tuition, materials, and deadlines.",
    insight: "When school costs are active, many spending choices feel connected to the future.",
    action: "Reserve school-cost money before rewards, social spending, or flexible purchases.",
    trend: "upward",
  },
  "Burnout Risk": {
    category: "energy",
    note: "The student may be trying to keep going while rest, schedule, and money pressure are already colliding.",
    insight: "Burnout risk rises when effort becomes the only answer to every pressure.",
    action: "Protect rest as part of budgeting, not as a reward after everything else.",
    trend: "downward",
  },
  "Pressure Carryover": {
    category: "pressure",
    note: "Old shortfalls, delayed payments, or repayment pressure may be affecting the current week.",
    insight: "The month can feel like repair mode when old pressure controls new income.",
    action: "Give repayment a predictable rhythm and prevent one new shortfall from stacking again.",
    trend: "wave",
  },
  "Budget Discipline": {
    category: "growth",
    note: "There is still room for planning, boundaries, or small repeatable money habits.",
    insight: "Discipline grows when the rule is realistic enough to survive student life.",
    action: "Keep the next rule small, repeatable, and tied to the student’s real week.",
    trend: "stable",
  },
  "Emotional Recovery Dependence": {
    category: "energy",
    note: "Spending may be carrying emotional recovery when rest, food, or support are missing.",
    insight: "This pattern usually appears when the day feels too heavy to end without relief.",
    action: "Build a short recovery menu that includes free and low-cost options.",
    trend: "spike",
  },
};

const DISPLAY_ALIAS = {
  "Mostly supported, trying to earn extra": "Supported, learning independence",
  "Working mainly to continue school": "Working to protect school",
  "Helping family while studying": "Studying while helping family",
  "Trying to survive school mostly alone": "Mostly self-supporting",
  "Balancing school, work, and exhaustion": "Exhausted by school-work overlap",
  "Building a future while financially unstable": "Building with unstable income",
  "Trying to recover from constant financial pressure": "Recovering from money pressure",
};

function addScore(scores, label, amount) {
  if (!SNAPSHOT_META[label]) return;
  scores[label] = (scores[label] || 0) + amount;
}

function includesAny(text, terms) {
  const value = lower(text);
  return terms.some((term) => value.includes(lower(term)));
}

function scoreWorkingStudentAnswer(scores, key, rawValue) {
  const value = clean(rawValue);
  const display = DISPLAY_ALIAS[value] || value;
  const text = `${key} ${value} ${display}`;

  if (key === "setup") {
    if (includesAny(text, ["supported", "learning independence", "trying to earn extra"])) {
      addScore(scores, "Budget Discipline", 18);
      addScore(scores, "Routine Instability", 8);
      addScore(scores, "Reward Spending Risk", 7);
    }
    if (includesAny(text, ["continue school", "protect school", "school costs"])) {
      addScore(scores, "Tuition Pressure", 30);
      addScore(scores, "Survival Pressure", 16);
      addScore(scores, "Financial Instability", 10);
    }
    if (includesAny(text, ["helping family", "family while studying"])) {
      addScore(scores, "Family Burden", 34);
      addScore(scores, "Survival Pressure", 14);
      addScore(scores, "Emotional Fatigue", 8);
    }
    if (includesAny(text, ["survive school", "mostly alone", "self-supporting"])) {
      addScore(scores, "Survival Pressure", 32);
      addScore(scores, "Financial Instability", 20);
      addScore(scores, "Borrowing Risk", 13);
      addScore(scores, "Recovery Weakness", 10);
    }
    if (includesAny(text, ["exhaustion", "school-work overlap", "balancing school, work"])) {
      addScore(scores, "Emotional Fatigue", 30);
      addScore(scores, "Mental Overload", 24);
      addScore(scores, "Recovery Weakness", 18);
      addScore(scores, "Convenience Spending Risk", 16);
      addScore(scores, "Burnout Risk", 16);
    }
    if (includesAny(text, ["financially unstable", "unstable income", "future while"])) {
      addScore(scores, "Financial Instability", 28);
      addScore(scores, "Routine Instability", 18);
      addScore(scores, "Mental Overload", 10);
      addScore(scores, "Budget Discipline", 8);
    }
    if (includesAny(text, ["recover", "money pressure", "constant financial pressure"])) {
      addScore(scores, "Pressure Carryover", 30);
      addScore(scores, "Borrowing Risk", 22);
      addScore(scores, "Financial Instability", 16);
      addScore(scores, "Recovery Weakness", 12);
    }
  }

  if (key === "rhythm") {
    if (includesAny(text, ["allowance", "fixed", "base", "part-time pay"])) {
      addScore(scores, "Budget Discipline", 14);
      addScore(scores, "Routine Instability", 4);
    }
    if (includesAny(text, ["irregular", "project", "seasonal", "gaps", "fluctuate", "changes month", "some weeks", "money arrives after", "delayed payments"])) {
      addScore(scores, "Financial Instability", 24);
      addScore(scores, "Routine Instability", 14);
      addScore(scores, "Pressure Carryover", 8);
    }
    if (includesAny(text, ["tuition", "school requirements", "school costs"])) {
      addScore(scores, "Tuition Pressure", 16);
      addScore(scores, "Survival Pressure", 8);
    }
    if (includesAny(text, ["borrow", "repay", "debt"])) {
      addScore(scores, "Borrowing Risk", 22);
      addScore(scores, "Pressure Carryover", 18);
    }
    if (includesAny(text, ["family", "goes home", "shared", "support family"])) {
      addScore(scores, "Family Burden", 20);
    }
    if (includesAny(text, ["low recovery", "heavy schedule", "work shifts", "deadlines hit"])) {
      addScore(scores, "Emotional Fatigue", 16);
      addScore(scores, "Recovery Weakness", 14);
      addScore(scores, "Routine Instability", 10);
    }
  }

  if (key === "workload") {
    if (includesAny(text, ["manageable", "control", "plan early"])) {
      addScore(scores, "Budget Discipline", 18);
      addScore(scores, "Routine Instability", 5);
    }
    if (includesAny(text, ["busy", "tight", "deadlines", "overlap", "little time", "commute", "tired", "no room", "survival", "collide", "stretched"])) {
      addScore(scores, "Emotional Fatigue", 22);
      addScore(scores, "Mental Overload", 18);
      addScore(scores, "Recovery Weakness", 14);
      addScore(scores, "Burnout Risk", 12);
    }
    if (includesAny(text, ["routine changes", "unstable", "some weeks", "family requests change"])) {
      addScore(scores, "Routine Instability", 18);
      addScore(scores, "Financial Instability", 8);
    }
    if (includesAny(text, ["home", "family", "responsible"])) {
      addScore(scores, "Family Burden", 14);
    }
  }

  if (key === "pressure") {
    if (includesAny(text, ["tuition", "school", "fear of stopping"])) {
      addScore(scores, "Tuition Pressure", 26);
      addScore(scores, "Survival Pressure", 12);
    }
    if (includesAny(text, ["food", "fare", "transport", "daily", "materials", "printing", "projects", "data"])) {
      addScore(scores, "Survival Pressure", 22);
      addScore(scores, "Financial Instability", 8);
    }
    if (includesAny(text, ["family", "guilt", "home", "contribution"])) {
      addScore(scores, "Family Burden", 24);
    }
    if (includesAny(text, ["debt", "borrow", "repayment", "cash-flow", "delayed payments"])) {
      addScore(scores, "Borrowing Risk", 26);
      addScore(scores, "Pressure Carryover", 20);
    }
    if (includesAny(text, ["convenience", "rushed", "missed tracking", "schedule conflict", "work-school"])) {
      addScore(scores, "Convenience Spending Risk", 22);
      addScore(scores, "Emotional Fatigue", 14);
      addScore(scores, "Recovery Weakness", 8);
    }
    if (includesAny(text, ["unstable income", "future goals", "prioritize", "repeated small"])) {
      addScore(scores, "Financial Instability", 18);
      addScore(scores, "Mental Overload", 14);
      addScore(scores, "Routine Instability", 8);
    }
    if (includesAny(text, ["reward", "social", "small rewards"])) {
      addScore(scores, "Reward Spending Risk", 18);
      addScore(scores, "Emotional Recovery Dependence", 10);
    }
  }

  if (key === "coping") {
    if (includesAny(text, ["reward", "comfort", "spend", "small", "feel okay", "buy comfort", "convenience to save energy", "stuck"])) {
      addScore(scores, "Reward Spending Risk", 30);
      addScore(scores, "Emotional Recovery Dependence", 20);
    }
    if (includesAny(text, ["convenience"])) {
      addScore(scores, "Convenience Spending Risk", 24);
      addScore(scores, "Recovery Weakness", 8);
    }
    if (includesAny(text, ["avoid checking", "avoid the full picture", "strict tracking", "forget to track"])) {
      addScore(scores, "Pressure Carryover", 12);
      addScore(scores, "Mental Overload", 10);
    }
    if (includesAny(text, ["borrow", "delay payments", "repay", "daily costs hit"])) {
      addScore(scores, "Borrowing Risk", 28);
      addScore(scores, "Pressure Carryover", 20);
      addScore(scores, "Financial Instability", 8);
    }
    if (includesAny(text, ["cut", "sacrifice", "delay my own needs", "avoid spending on myself"])) {
      addScore(scores, "Survival Pressure", 18);
      addScore(scores, "Recovery Weakness", 14);
    }
    if (includesAny(text, ["give", "limits", "guilty", "hide money stress"])) {
      addScore(scores, "Family Burden", 18);
      addScore(scores, "Emotional Fatigue", 8);
    }
    if (includesAny(text, ["ask for help", "pause", "plan early", "prepared"])) {
      addScore(scores, "Budget Discipline", 20);
    }
    if (includesAny(text, ["overwork", "push rest aside", "tired"])) {
      addScore(scores, "Burnout Risk", 18);
      addScore(scores, "Recovery Weakness", 14);
    }
  }

  if (key === "goal") {
    if (includesAny(text, ["finish school", "school continuity", "graduation", "school safely"])) {
      addScore(scores, "Tuition Pressure", 12);
      addScore(scores, "Budget Discipline", 12);
    }
    if (includesAny(text, ["burning out", "low-energy", "rest", "recovery"])) {
      addScore(scores, "Burnout Risk", 18);
      addScore(scores, "Recovery Weakness", 12);
    }
    if (includesAny(text, ["avoid debt", "no-new-debt", "repayment", "stop survival borrowing"])) {
      addScore(scores, "Borrowing Risk", 20);
      addScore(scores, "Pressure Carryover", 12);
    }
    if (includesAny(text, ["savings", "discipline", "rhythm", "priority", "purpose", "buffer"])) {
      addScore(scores, "Budget Discipline", 20);
      addScore(scores, "Financial Instability", 5);
    }
    if (includesAny(text, ["family", "support boundary", "help family"])) {
      addScore(scores, "Family Burden", 18);
    }
    if (includesAny(text, ["stress spending", "reward", "leaks", "micro", "convenience"])) {
      addScore(scores, "Reward Spending Risk", 18);
      addScore(scores, "Convenience Spending Risk", 12);
    }
    if (includesAny(text, ["food", "fare", "essentials", "daily needs"])) {
      addScore(scores, "Survival Pressure", 14);
    }
  }
}

function buildWorkingStudentScores(profile) {
  const scores = {};
  ["setup", "rhythm", "workload", "pressure", "coping", "goal"].forEach((key) => {
    if (profile?.[key]) scoreWorkingStudentAnswer(scores, key, profile[key]);
  });

  if (!Object.keys(scores).length) {
    addScore(scores, "Budget Discipline", 34);
    addScore(scores, "Routine Instability", 26);
    addScore(scores, "Financial Instability", 22);
    addScore(scores, "Recovery Weakness", 18);
  }

  return scores;
}

function normalizeToHundred(rows) {
  const safeRows = rows.filter((row) => row.value > 0);
  const total = safeRows.reduce((sum, row) => sum + row.value, 0) || 1;
  const mapped = safeRows.map((row, index) => {
    const exact = (row.value / total) * 100;
    return { ...row, index, value: Math.floor(exact), rest: exact - Math.floor(exact) };
  });

  let left = 100 - mapped.reduce((sum, row) => sum + row.value, 0);
  mapped.slice().sort((a, b) => b.rest - a.rest || a.index - b.index).forEach((row) => {
    if (left <= 0) return;
    row.value += 1;
    left -= 1;
  });

  return mapped.map(({ rest, index, ...row }) => row);
}

function distributionLabel(value) {
  if (value >= 30) return "Dominant";
  if (value >= 22) return "Heavy Presence";
  if (value >= 14) return "Growing Pressure";
  if (value >= 8) return "Emerging Pattern";
  return "Minor Presence";
}

function buildWorkingStudentDistribution(profile) {
  const scores = buildWorkingStudentScores(profile);
  const maxCards = 4;
  const topRows = Object.entries(scores)
    .map(([label, value]) => ({ label, value, ...(SNAPSHOT_META[label] || {}) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, maxCards);

  return normalizeToHundred(topRows).map((item) => ({
    ...item,
    category: item.category || "stability",
    status: distributionLabel(item.value),
  }));
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

const TREND_PATHS = {
  stable: "M2 24 C14 22 20 20 30 19 C42 18 48 16 58 15 C70 14 78 13 90 11",
  wave: "M2 24 C10 20 16 25 24 18 C33 10 40 23 49 15 C59 7 66 22 75 14 C82 8 87 12 90 10",
  spike: "M2 27 C10 24 15 24 22 17 C28 10 34 18 39 7 C45 20 51 12 57 16 C65 21 69 9 76 13 C83 17 86 10 90 11",
  volatile: "M2 29 C8 25 13 27 18 20 C23 12 29 18 34 8 C41 28 47 7 53 17 C59 26 64 11 71 12 C79 13 83 8 90 10",
  downward: "M2 9 C12 10 17 13 26 12 C37 15 43 19 52 18 C63 21 70 25 78 24 C84 26 88 28 90 28",
  upward: "M2 28 C12 24 17 24 26 20 C36 15 42 17 51 13 C62 8 68 12 77 9 C84 6 88 7 90 5",
};

function applyTrendPath(card, trend) {
  const path = card.querySelector("svg path");
  if (!path) return;
  path.setAttribute("d", TREND_PATHS[trend] || TREND_PATHS.wave);
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
    item.card.dataset.claraSnapshotLabel = data.label;
    item.card.dataset.claraSnapshotValue = String(data.value);
    item.card.dataset.claraSnapshotStatus = data.status;
    item.card.dataset.claraSnapshotNote = data.note || "This card reflects part of the current Working Student pressure distribution.";
    item.card.dataset.claraSnapshotInsight = data.insight || "This pattern is part of the student's current behavioral reality.";
    item.card.dataset.claraSnapshotAction = data.action || "Choose one smaller next step before pressure gets heavier.";
    item.card.dataset.claraSnapshotTrend = data.trend || "wave";
    item.card.dataset.claraSnapshotCategory = data.category || "stability";
    item.card.dataset.claraTrendCard = "true";
    item.card.dataset.claraTrendPrimary = index === 0 ? "true" : "false";
    item.card.dataset.claraTrendIndex = String(index + 1);
    applyTrendPath(item.card, data.trend);
  });
}

function updateSnapshotSubtitle(section) {
  const subtitle = Array.from(section.querySelectorAll("p")).find((node) => clean(node.textContent) === "Swipe the stage cards.");
  if (subtitle) setText(subtitle, "100% split of your current Working Student pressure.");
}

function rememberClickedCard(event) {
  const section = findTrendSnapshotSection();
  if (!section) return;
  const card = event.target?.closest?.("button[data-clara-snapshot-label]");
  if (!card || !section.contains(card)) return;
  window.__CLARA_LAST_WORKING_STUDENT_SNAPSHOT__ = {
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
  const sourceHeading = Array.from(modal.querySelectorAll("p")).find((node) => clean(node.textContent).toLowerCase().includes("source"));
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

function compactSources(modal) {
  const sourceHeading = Array.from(modal.querySelectorAll("p")).find((node) => clean(node.textContent).toLowerCase().includes("source"));
  const sourceBox = sourceHeading?.closest("div");
  if (!sourceBox) return;
  setText(sourceHeading, "Snapshot basis");
  Array.from(sourceBox.querySelectorAll("p")).forEach((node) => {
    if (node === sourceHeading) return;
    node.hidden = true;
    node.style.display = "none";
  });
}

function enhanceOpenedTrendModal() {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Source direction" || text === "SOURCE DIRECTION" || text === "Source detection" || text === "Sources" || text === "Snapshot basis";
  });
  const modal = sourceHeading?.closest(".absolute");
  const snapshot = window.__CLARA_LAST_WORKING_STUDENT_SNAPSHOT__;
  if (!sourceHeading || !modal || !snapshot) return;

  const title = modal.querySelector("h4");
  const intro = title?.nextElementSibling;
  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const statusNode = valueNode?.nextElementSibling;
  const readingLabel = Array.from(modal.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Life-stage reading" || text === "LIFE-STAGE READING" || text === "Risk level reading" || text === "Risk hierarchy reading";
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
  compactSources(modal);
}

function enhanceTrendSnapshot() {
  const profile = readLifeStageProfile();
  const section = findTrendSnapshotSection();
  if (!section || profile?.stage !== WORKING_STUDENT_STAGE) return;

  const distribution = buildWorkingStudentDistribution(profile);
  section.dataset.claraTrendSnapshot = "true";
  section.dataset.claraSnapshotModel = "working-student-100-distribution";
  applyDistributionToCards(section, distribution);
  updateSnapshotSubtitle(section);
  enhanceOpenedTrendModal();
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_WORKING_STUDENT_100_SNAPSHOT__) {
  window.__CLARA_WORKING_STUDENT_100_SNAPSHOT__ = true;
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
  window.requestAnimationFrame(scheduleEnhance);
}
