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
    watch: "Watch for small comfort buys, food or drink rewards, and purchases made because the day felt too heavy.",
    action: "Protect recovery first: plan one low-cost comfort option before the stressful part of the day starts."
  },
  "Reward Frequency Risk": {
    meaning: "The main risk is not one reward. It is repeated relief spending becoming part of the weekly routine.",
    watch: "Watch for repeated snacks, drinks, delivery, digital purchases, or deserve-ko-to spending after pressure peaks.",
    action: "Set a small reward limit and decide the reward before stress hits, not during stress."
  },
  "Daily Pressure": {
    meaning: "Daily demands like food, fare, data, school materials, and time pressure may be building quiet spending friction.",
    watch: "Watch for gastos that feel small alone but repeat almost every school/work day.",
    action: "Give daily essentials their own mini cap so pressure does not leak into random spending."
  },
  "Reward Control": {
    meaning: "There is still awareness and control available. This card shows the protection side of the pattern.",
    watch: "Watch for moments when planned rewards turn into unplanned repeat purchases.",
    action: "Keep rewards intentional: choose the amount, reason, and limit before spending."
  },
  "Essential-Cost Load": {
    meaning: "School costs and daily essentials may be carrying the biggest weight in the current money pattern.",
    watch: "Watch tuition timing, fare, meals, printing, load/data, and project expenses arriving close together.",
    action: "Separate school money and daily essentials before planning savings or rewards."
  },
  "Recovery Gap": {
    meaning: "Low recovery time can turn normal spending decisions into tired, shortcut-based decisions.",
    watch: "Watch skipped meals, rushed transport, late-night food, and delayed tracking.",
    action: "Add a small recovery buffer: food, rest, and transport backup before the week becomes heavy."
  },
  "Cash Buffer Risk": {
    meaning: "The week may be vulnerable when there is no small buffer for sudden school or daily expenses.",
    watch: "Watch surprise fare changes, projects, food gaps, or urgent class-related spending.",
    action: "Create a tiny emergency fare/food buffer before flexible spending."
  },
  "Shared-Money Pressure": {
    meaning: "Family support and student expenses may be competing for the same income.",
    watch: "Watch guilt spending, last-minute family help, and school needs being delayed.",
    action: "Set a support limit that protects both family care and your own school stability."
  },
  "Responsibility Load": {
    meaning: "Carrying student responsibilities and home support can drain the same energy source.",
    watch: "Watch decisions made from guilt, pressure, or fear of disappointing others.",
    action: "Use an essentials-first rule before giving or committing extra money."
  },
  "Boundary Risk": {
    meaning: "The risk is helping without limits until personal essentials become unstable.",
    watch: "Watch support that pushes food, fare, school costs, or rest into shortage.",
    action: "Create a clear weekly support boundary before requests happen."
  },
  "Fatigue Load": {
    meaning: "School and work overlap may be turning time pressure into spending pressure.",
    watch: "Watch convenience meals, rushed fare choices, comfort buys, and missed expense tracking.",
    action: "Prepare one low-energy plan for food, commute, and tracking."
  },
  "Schedule-Cost Pressure": {
    meaning: "The schedule itself may be creating costs through commute, deadlines, and limited planning time.",
    watch: "Watch costs caused by rushing: transport shortcuts, food outside, printing, and data top-ups.",
    action: "Build a weekly schedule-cost allowance before the week starts."
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
    action: "Place repayment first in the weekly plan, even if the amount is small."
  },
  "Cash-Flow Stability": {
    meaning: "Income timing may not be matching school, commute, food, or repayment deadlines.",
    watch: "Watch weeks where money arrives after important costs are already due.",
    action: "Map income dates against school and daily expense dates."
  },
  "Independence Load": {
    meaning: "Self-funding school and daily life can create pressure even when discipline is strong.",
    watch: "Watch income gaps, school deadlines, and personal essentials competing at the same time.",
    action: "Protect essentials first before trying to save aggressively."
  },
  "Essential Pressure": {
    meaning: "Tuition, commute, meals, data, and materials are harder to delay safely.",
    watch: "Watch essentials being paid late because flexible spending happened first.",
    action: "Use an essentials-first wallet or category."
  },
  "Buffer Stability": {
    meaning: "A small missed income or extra school cost can affect the whole week.",
    watch: "Watch weeks with no backup for food, fare, or urgent school needs.",
    action: "Build the smallest possible buffer before adding new spending goals."
  },
  "Burnout Watch": {
    meaning: "Burnout may not be full crisis yet, but energy pressure is already visible.",
    watch: "Watch spending that appears after exhaustion, deadlines, or emotional overload.",
    action: "Add one recovery habit that does not require spending."
  },
  "Financial Pressure": {
    meaning: "Limited income and repeated small expenses may be tightening the pattern.",
    watch: "Watch small costs that repeat: food, fare, mobile data, digital, and social spending.",
    action: "Review the top repeating micro-spend once per week."
  },
  "Micro-Spend Risk": {
    meaning: "Small spending may be quietly becoming the hidden monthly pattern.",
    watch: "Watch purchases that feel too small to track but happen often.",
    action: "Set a weekly micro-spend ceiling."
  },
  "Future Potential": {
    meaning: "This is the growth side of the pattern: effort, ambition, and discipline can still be protected.",
    watch: "Watch pressure that makes you abandon the plan completely.",
    action: "Keep progress small and consistent instead of strict and unrealistic."
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

function createInsightPanel(modal, trendLabel) {
  const sourceHeading = Array.from(modal.querySelectorAll("p")).find((node) => clean(node.textContent).toLowerCase().includes("source"));
  if (!sourceHeading) return;

  const sourceBox = sourceHeading.closest("div");
  if (!sourceBox) return;

  let panel = modal.querySelector("[data-clara-modal-insight='true']");
  if (!panel) {
    panel = document.createElement("div");
    panel.dataset.claraModalInsight = "true";
    panel.style.cssText = "margin:14px 0;padding:14px 16px;border-radius:22px;border:1px solid rgba(255,255,255,.11);background:rgba(255,255,255,.045);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);";
    sourceBox.parentElement?.insertBefore(panel, sourceBox);
  }

  const insight = MODAL_INSIGHTS[trendLabel] || {
    meaning: "This card shows one part of the current life-stage pressure pattern.",
    watch: "Watch when this pattern starts influencing small daily money decisions.",
    action: "Use CLARA to pause, name the pressure, and choose a smaller next step."
  };

  panel.innerHTML = `
    <p style="margin:0 0 10px;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.78);">What CLARA noticed</p>
    <p style="margin:0 0 10px;font-size:12px;line-height:1.65;color:rgba(255,255,255,.88);"><strong>Meaning:</strong> ${insight.meaning}</p>
    <p style="margin:0 0 10px;font-size:12px;line-height:1.65;color:rgba(255,255,255,.82);"><strong>Watch for:</strong> ${insight.watch}</p>
    <p style="margin:0;font-size:12px;line-height:1.65;color:rgba(255,255,255,.82);"><strong>CLARA move:</strong> ${insight.action}</p>
  `;
}

function enhanceOpenedTrendModal() {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => {
    const text = clean(node.textContent);
    return text === "Source direction" || text === "SOURCE DIRECTION" || text === "Source detection";
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

  hideIntroCopy(modal);
  setText(readingLabel, "Risk hierarchy reading");
  setText(sourceHeading, "Source detection");
  if (match) setText(valueNode, `${match.value}%`);
  if (hierarchy) setText(statusNode, hierarchy);
  createInsightPanel(modal, trendLabel);

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
