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

const MODAL_INSIGHTS = {
  "Emotional Fatigue": {
    meaning: "Fatigue may be shaping spending decisions after class, work, commute, or repeated academic pressure.",
    watch: "Watch for comfort buys, food or drink rewards, and purchases made because the day felt heavy.",
    action: "Plan one low-cost comfort option before the stressful part of the day starts."
  },
  "Reward Frequency Risk": {
    meaning: "The main risk is repeated relief spending becoming part of the weekly routine.",
    watch: "Watch snacks, drinks, delivery, digital buys, or deserve-ko-to spending after pressure peaks.",
    action: "Set a small reward limit before stress hits, not during stress."
  },
  "Daily Pressure": {
    meaning: "Food, fare, data, school materials, and time pressure may be building quiet spending friction.",
    watch: "Watch gastos that feel small alone but repeat almost every school or work day.",
    action: "Give daily essentials their own mini cap."
  },
  "Reward Control": {
    meaning: "There is still awareness and control available. This is the protection side of the pattern.",
    watch: "Watch planned rewards turning into unplanned repeat purchases.",
    action: "Choose the amount, reason, and limit before spending."
  },
  "Essential-Cost Load": {
    meaning: "School costs and daily essentials may be carrying the biggest weight.",
    watch: "Watch tuition timing, fare, meals, printing, load/data, and project expenses arriving together.",
    action: "Separate school money and daily essentials first."
  },
  "Recovery Gap": {
    meaning: "Low recovery time can turn normal spending into tired shortcut decisions.",
    watch: "Watch skipped meals, rushed transport, late-night food, and delayed tracking.",
    action: "Add a small food, rest, and transport backup."
  },
  "Cash Buffer Risk": {
    meaning: "The week may be vulnerable without a small buffer for sudden school or daily expenses.",
    watch: "Watch surprise fare changes, projects, food gaps, or urgent class spending.",
    action: "Create a tiny emergency fare or food buffer."
  },
  "Shared-Money Pressure": {
    meaning: "Family support and student expenses may be competing for the same income.",
    watch: "Watch guilt spending, last-minute family help, and delayed school needs.",
    action: "Set a support limit that protects school stability."
  },
  "Responsibility Load": {
    meaning: "Student responsibilities and home support can drain the same energy source.",
    watch: "Watch decisions made from guilt, pressure, or fear of disappointing others.",
    action: "Use an essentials-first rule before giving extra money."
  },
  "Boundary Risk": {
    meaning: "Helping without limits can make personal essentials unstable.",
    watch: "Watch support that pushes food, fare, school costs, or rest into shortage.",
    action: "Create a clear weekly support boundary."
  },
  "Fatigue Load": {
    meaning: "School and work overlap may be turning time pressure into spending pressure.",
    watch: "Watch convenience meals, rushed fare choices, comfort buys, and missed tracking.",
    action: "Prepare one low-energy plan for food, commute, and tracking."
  },
  "Schedule-Cost Pressure": {
    meaning: "The schedule itself may be creating costs through commute, deadlines, and low planning time.",
    watch: "Watch rushing costs: transport shortcuts, food outside, printing, and data top-ups.",
    action: "Build a weekly schedule-cost allowance."
  },
  "Convenience Spend Risk": {
    meaning: "Convenience spending may rise when time and energy are low.",
    watch: "Watch purchases that solve stress quickly but repeat often.",
    action: "Replace one convenience habit with a cheaper prepared option."
  },
  "Debt Stress Load": {
    meaning: "Old money pressure may still be affecting the current week.",
    watch: "Watch avoidance, delayed checking, and borrowing to cover daily gaps.",
    action: "Use a no-new-debt rule and protect a small repayment rhythm."
  },
  "Repayment Pressure": {
    meaning: "Repayment timing may be the strongest pressure before rewards or flexible spending.",
    watch: "Watch spending before repayment, then borrowing again near the next deadline.",
    action: "Place repayment first in the weekly plan."
  },
  "Cash-Flow Stability": {
    meaning: "Income timing may not match school, commute, food, or repayment deadlines.",
    watch: "Watch weeks where money arrives after important costs are already due.",
    action: "Map income dates against expense dates."
  },
  "Independence Load": {
    meaning: "Self-funding school and daily life can create pressure even when discipline is strong.",
    watch: "Watch income gaps, school deadlines, and personal essentials competing.",
    action: "Protect essentials before saving aggressively."
  },
  "Essential Pressure": {
    meaning: "Tuition, commute, meals, data, and materials are harder to delay safely.",
    watch: "Watch essentials being paid late because flexible spending happened first.",
    action: "Use an essentials-first wallet or category."
  },
  "Buffer Stability": {
    meaning: "A missed income or extra school cost can affect the whole week.",
    watch: "Watch weeks with no backup for food, fare, or urgent school needs.",
    action: "Build the smallest possible buffer first."
  },
  "Burnout Watch": {
    meaning: "Burnout may not be full crisis yet, but energy pressure is already visible.",
    watch: "Watch spending after exhaustion, deadlines, or emotional overload.",
    action: "Add one recovery habit that does not require spending."
  },
  "Financial Pressure": {
    meaning: "Limited income and repeated small expenses may be tightening the pattern.",
    watch: "Watch repeating food, fare, mobile data, digital, and social spending.",
    action: "Review the top repeating micro-spend once per week."
  },
  "Micro-Spend Risk": {
    meaning: "Small spending may be quietly becoming the hidden monthly pattern.",
    watch: "Watch purchases that feel too small to track but happen often.",
    action: "Set a weekly micro-spend ceiling."
  },
  "Future Potential": {
    meaning: "Effort, ambition, and discipline can still be protected.",
    watch: "Watch pressure that makes you abandon the plan completely.",
    action: "Keep progress small and consistent."
  }
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

function hideIntroCopy(modal) {
  const title = modal.querySelector("h4");
  const intro = title?.nextElementSibling;
  if (!intro || intro.tagName !== "P") return;
  intro.hidden = true;
  intro.dataset.claraModalIntroHidden = "true";
}

function styleRiskReading(modal, hierarchy) {
  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const card = valueNode?.closest("div");
  if (!card) return;
  const highRisk = clean(hierarchy) === "High Risk";
  card.dataset.claraRiskCardPolished = "true";
  card.style.padding = "14px 16px";
  card.style.minHeight = "0";
  card.style.background = highRisk
    ? "linear-gradient(135deg, rgba(168,85,247,.14), rgba(236,72,153,.08), rgba(15,23,42,.22))"
    : "linear-gradient(135deg, rgba(34,211,238,.10), rgba(168,85,247,.09), rgba(15,23,42,.22))";
  card.style.border = highRisk ? "1px solid rgba(236,72,153,.16)" : "1px solid rgba(255,255,255,.11)";
  card.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,.07), 0 12px 30px rgba(0,0,0,.10)";
  card.querySelectorAll("[data-clara-risk-helper='true']").forEach((node) => node.remove());
}

function createInsightRow(label, text, accent) {
  return `
    <div style="position:relative;padding:7px 8px 7px 12px;border-radius:13px;border:1px solid rgba(255,255,255,.075);background:rgba(255,255,255,.032);">
      <span style="position:absolute;left:0;top:9px;bottom:9px;width:2px;border-radius:999px;background:${accent};"></span>
      <p style="margin:0 0 3px;font-size:8px;font-weight:950;letter-spacing:.13em;text-transform:uppercase;color:rgba(255,255,255,.58);">${label}</p>
      <p style="margin:0;font-size:11px;line-height:1.48;color:rgba(255,255,255,.84);">${text}</p>
    </div>
  `;
}

function createInsightPanel(modal, trendLabel) {
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

  const insight = MODAL_INSIGHTS[trendLabel] || {
    meaning: "This card shows one part of the current life-stage pressure pattern.",
    watch: "Watch when this pattern starts influencing small daily money decisions.",
    action: "Pause, name the pressure, and choose a smaller next step."
  };

  panel.style.cssText = "margin:10px 0;padding:11px;border-radius:20px;border:1px solid rgba(255,255,255,.10);background:linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.022));box-shadow:inset 0 1px 0 rgba(255,255,255,.05);";
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px;">
      <p style="margin:0;font-size:9px;font-weight:950;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.80);">What CLARA noticed</p>
      <span style="display:inline-flex;align-items:center;justify-content:center;padding:3px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.05);font-size:8px;font-weight:900;letter-spacing:.10em;text-transform:uppercase;color:rgba(255,255,255,.55);">Behavior</span>
    </div>
    <div style="display:grid;gap:6px;">
      ${createInsightRow("Meaning", insight.meaning, "rgba(34,211,238,.72)")}
      ${createInsightRow("Watch for", insight.watch, "rgba(251,113,133,.68)")}
      ${createInsightRow("CLARA move", insight.action, "rgba(167,139,250,.74)")}
    </div>
  `;
}

function compactSources(sourceHeading) {
  const sourceBox = sourceHeading?.closest("div");
  if (!sourceBox) return;
  setText(sourceHeading, "Sources");
  sourceBox.dataset.claraSourceBoxPolished = "true";
  sourceBox.style.padding = "12px 14px";
  sourceBox.style.marginTop = "10px";
  sourceBox.style.background = "linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.018))";
  sourceBox.style.border = "1px solid rgba(255,255,255,.09)";
  sourceBox.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,.045)";

  Array.from(sourceBox.querySelectorAll("p")).forEach((node) => {
    if (node === sourceHeading) return;
    node.hidden = true;
    node.style.display = "none";
  });

  Array.from(sourceBox.querySelectorAll("a")).forEach((link) => {
    link.style.height = "26px";
    link.style.minWidth = "38px";
    link.style.padding = "0 9px";
    link.style.fontSize = "9px";
  });
}

function enhanceOpenedTrendModal() {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Source direction" || text === "SOURCE DIRECTION" || text === "Source detection" || text === "Sources";
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

  hideIntroCopy(modal);
  setText(readingLabel, "Risk hierarchy reading");
  if (match) setText(valueNode, `${match.value}%`);
  if (hierarchy) setText(statusNode, hierarchy);
  styleRiskReading(modal, hierarchy);
  createInsightPanel(modal, trendLabel);
  compactSources(sourceHeading);
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
