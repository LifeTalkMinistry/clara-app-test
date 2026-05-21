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
    meaning: "Fatigue may be shaping spending decisions after class, work, commute, or repeated academic pressure. When energy is low, small purchases can feel like the fastest way to recover.",
    watch: "Watch for comfort food, drinks, snacks, delivery, or tiny rewards that happen because the day felt heavy instead of because they were planned.",
    action: "Plan one low-cost comfort option before the stressful part of the day starts, so recovery does not always require spending."
  },
  "Reward Frequency Risk": {
    meaning: "The concern is not one reward. The concern is repeated relief spending becoming part of the weekly routine without being noticed.",
    watch: "Watch snacks, drinks, delivery, digital buys, or deserve-ko-to spending that appears after pressure peaks.",
    action: "Set a small reward limit before stress hits, not during stress. The limit protects the reward from turning into a leak."
  },
  "Daily Pressure": {
    meaning: "Food, fare, data, school materials, and time pressure may be creating quiet spending friction. Each cost may look small, but repeated daily pressure reduces breathing room.",
    watch: "Watch gastos that feel harmless alone but repeat almost every school or work day, especially commute, quick meals, data, and rushed purchases.",
    action: "Give daily essentials their own mini cap so routine pressure does not leak into random spending."
  },
  "Reward Control": {
    meaning: "There is still awareness and control available. This is the protection side of the pattern, where rewards can stay intentional instead of reactive.",
    watch: "Watch planned rewards turning into unplanned repeat purchases when the day feels stressful or emotionally heavy.",
    action: "Choose the amount, reason, and limit before spending. Control does not mean no reward; it means the reward has boundaries."
  },
  "Essential-Cost Load": {
    meaning: "School costs and daily essentials may be carrying the biggest weight. These costs are difficult to ignore because they directly affect attendance, routine, and stability.",
    watch: "Watch tuition timing, fare, meals, printing, load/data, and project expenses arriving together.",
    action: "Separate school money and daily essentials first before rewards, savings, or flexible spending."
  },
  "Recovery Gap": {
    meaning: "Low recovery time can turn normal spending into tired shortcut decisions. The less rest available, the more convenience starts to feel necessary.",
    watch: "Watch skipped meals, rushed transport, late-night food, delayed tracking, and spending that happens because there is no energy left.",
    action: "Add a small food, rest, and transport backup before the week becomes heavy."
  },
  "Cash Buffer Risk": {
    meaning: "The week may be vulnerable without a small buffer for sudden school or daily expenses. One surprise cost can affect the whole rhythm.",
    watch: "Watch surprise fare changes, projects, food gaps, urgent class spending, and small emergencies that force borrowing.",
    action: "Create a tiny emergency fare or food buffer before flexible spending."
  },
  "Shared-Money Pressure": {
    meaning: "Family support and student expenses may be competing for the same income. This can create guilt pressure and unstable personal essentials.",
    watch: "Watch guilt spending, last-minute family help, delayed school needs, or giving extra money before your own essentials are protected.",
    action: "Set a support limit that protects both care for others and your school stability."
  },
  "Responsibility Load": {
    meaning: "Student responsibilities and home support can drain the same energy source. Pressure can build even when the person is trying to be responsible.",
    watch: "Watch decisions made from guilt, pressure, fear of disappointing others, or trying to solve everything at once.",
    action: "Use an essentials-first rule before giving or committing extra money."
  },
  "Boundary Risk": {
    meaning: "Helping without limits can make personal essentials unstable. The risk is not generosity; the risk is support without structure.",
    watch: "Watch support that pushes food, fare, school costs, or rest into shortage.",
    action: "Create a clear weekly support boundary before requests happen."
  },
  "Fatigue Load": {
    meaning: "School and work overlap may be turning time pressure into spending pressure. Overloaded days often make convenience feel like the only option.",
    watch: "Watch convenience meals, rushed fare choices, comfort buys, and missed tracking after long class-work days.",
    action: "Prepare one low-energy plan for food, commute, and tracking."
  },
  "Schedule-Cost Pressure": {
    meaning: "The schedule itself may be creating costs through commute, deadlines, and limited planning time. Some spending comes from being rushed, not being careless.",
    watch: "Watch rushing costs: transport shortcuts, food outside, printing, data top-ups, and last-minute materials.",
    action: "Build a weekly schedule-cost allowance before the week starts."
  },
  "Convenience Spend Risk": {
    meaning: "Convenience spending may rise when time and energy are low. It becomes risky when it turns into the default response to stress.",
    watch: "Watch purchases that solve stress quickly but repeat often, especially meals, transport, and small delivery expenses.",
    action: "Replace one convenience habit with a cheaper prepared option."
  },
  "Debt Stress Load": {
    meaning: "Old money pressure may still be affecting the current week. Debt stress can make even normal expenses feel heavier.",
    watch: "Watch avoidance, delayed checking, and borrowing again to cover daily gaps.",
    action: "Use a no-new-debt rule and protect a small repayment rhythm."
  },
  "Repayment Pressure": {
    meaning: "Repayment timing may be the strongest pressure before rewards or flexible spending. When repayments are unclear, the week can feel like repair mode.",
    watch: "Watch spending before repayment, then borrowing again near the next deadline.",
    action: "Place repayment first in the weekly plan, even if the amount is small."
  },
  "Cash-Flow Stability": {
    meaning: "Income timing may not match school, commute, food, or repayment deadlines. Timing mismatch can create stress even when total money looks enough.",
    watch: "Watch weeks where money arrives after important costs are already due.",
    action: "Map income dates against school and daily expense dates."
  },
  "Independence Load": {
    meaning: "Self-funding school and daily life can create pressure even when discipline is strong. Independence needs structure before ambition can stay consistent.",
    watch: "Watch income gaps, school deadlines, and personal essentials competing at the same time.",
    action: "Protect essentials first before trying to save aggressively."
  },
  "Essential Pressure": {
    meaning: "Tuition, commute, meals, data, and materials are harder to delay safely. These expenses should not compete with impulse decisions.",
    watch: "Watch essentials being paid late because flexible spending happened first.",
    action: "Use an essentials-first wallet or category."
  },
  "Buffer Stability": {
    meaning: "A missed income or extra school cost can affect the whole week. A small buffer can protect peace more than strict rules alone.",
    watch: "Watch weeks with no backup for food, fare, or urgent school needs.",
    action: "Build the smallest possible buffer before adding new spending goals."
  },
  "Burnout Watch": {
    meaning: "Burnout may not be full crisis yet, but energy pressure is already visible. Recovery planning keeps spending from becoming the only relief.",
    watch: "Watch spending after exhaustion, deadlines, or emotional overload.",
    action: "Add one recovery habit that does not require spending."
  },
  "Financial Pressure": {
    meaning: "Limited income and repeated small expenses may be tightening the pattern. The quiet repeaters usually explain more than one big purchase.",
    watch: "Watch repeating food, fare, mobile data, digital, and social spending.",
    action: "Review the top repeating micro-spend once per week."
  },
  "Micro-Spend Risk": {
    meaning: "Small spending may be quietly becoming the hidden monthly pattern. These leaks matter because they repeat without being noticed.",
    watch: "Watch purchases that feel too small to track but happen often.",
    action: "Set a weekly micro-spend ceiling."
  },
  "Future Potential": {
    meaning: "Effort, ambition, and discipline can still be protected. The goal is not perfection; it is a rhythm the user can repeat.",
    watch: "Watch pressure that makes the user abandon the plan completely.",
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

function stabilizeModalSurface(modal) {
  modal.style.background = "linear-gradient(180deg, rgba(6, 14, 33, 0.97), rgba(22, 12, 56, 0.985))";
  modal.style.backdropFilter = "blur(22px) saturate(1.04)";
  modal.style.webkitBackdropFilter = "blur(22px) saturate(1.04)";
  modal.style.overflow = "hidden";
}

function styleRiskReading(modal, hierarchy) {
  const valueNode = Array.from(modal.querySelectorAll("p")).find((node) => /^\d+%$/.test(clean(node.textContent)));
  const card = valueNode?.closest("div");
  if (!card) return;
  const highRisk = clean(hierarchy) === "High Risk";
  card.dataset.claraRiskCardPolished = "true";
  card.style.padding = "18px 18px";
  card.style.minHeight = "0";
  card.style.background = highRisk
    ? "linear-gradient(135deg, rgba(168,85,247,.17), rgba(236,72,153,.10), rgba(15,23,42,.32))"
    : "linear-gradient(135deg, rgba(34,211,238,.13), rgba(168,85,247,.11), rgba(15,23,42,.32))";
  card.style.border = highRisk ? "1px solid rgba(236,72,153,.18)" : "1px solid rgba(255,255,255,.12)";
  card.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,.08), 0 16px 38px rgba(0,0,0,.13)";
  card.querySelectorAll("[data-clara-risk-helper='true']").forEach((node) => node.remove());
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
    action: "Use CLARA to pause, name the pressure, and choose a smaller next step."
  };

  panel.style.cssText = "margin:16px 0 12px;padding:15px;border-radius:24px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg, rgba(255,255,255,.060), rgba(255,255,255,.028));box-shadow:inset 0 1px 0 rgba(255,255,255,.06), 0 18px 42px rgba(0,0,0,.12);";
  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;">
      <p style="margin:0;font-size:10px;font-weight:950;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.82);">Pressure Pattern</p>
    </div>
    <div style="display:grid;gap:9px;">
      ${createInsightRow("Insight", insight.meaning, "rgba(34,211,238,.75)")}
      ${createInsightRow("Pressure Signal", insight.watch, "rgba(251,113,133,.72)")}
      ${createInsightRow("Next Move", insight.action, "rgba(167,139,250,.78)")}
    </div>
  `;
}

function compactSources(sourceHeading) {
  const sourceBox = sourceHeading?.closest("div");
  if (!sourceBox) return;
  setText(sourceHeading, "Sources");
  sourceBox.dataset.claraSourceBoxPolished = "true";
  sourceBox.style.padding = "12px 14px";
  sourceBox.style.marginTop = "8px";
  sourceBox.style.background = "linear-gradient(145deg, rgba(255,255,255,.04), rgba(255,255,255,.02))";
  sourceBox.style.border = "1px solid rgba(255,255,255,.10)";
  sourceBox.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,.05)";

  Array.from(sourceBox.querySelectorAll("p")).forEach((node) => {
    if (node === sourceHeading) return;
    node.hidden = true;
    node.style.display = "none";
  });

  Array.from(sourceBox.querySelectorAll("a")).forEach((link) => {
    link.style.height = "28px";
    link.style.minWidth = "42px";
    link.style.padding = "0 10px";
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

  stabilizeModalSurface(modal);
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
