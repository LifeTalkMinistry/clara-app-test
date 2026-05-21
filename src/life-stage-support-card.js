const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

const DEFAULT_SUPPORT_COPY = {
  title: "You’re not alone.",
  body: "Many people in this life stage are experiencing similar financial pressure.",
};

const PRESSURE_SIGNALS = [
  {
    id: "tired",
    icon: "😴",
    label: "Tired",
    title: "Tired decisions get expensive.",
    watch: "Watch for food delivery, rides, small treats, or skipped tracking when your body is asking for recovery.",
    tip: "Before spending, pause for one cheaper recovery move first: water, food, 10 minutes of rest, or checking your remaining budget.",
  },
  {
    id: "stress",
    icon: "🧠",
    label: "Stressed",
    title: "Stress can make relief feel urgent.",
    watch: "Watch for buying something just to feel in control after school, work, commute, deadlines, or family pressure.",
    tip: "Name the pressure first. If the purchase is only for relief, set a small limit before you buy.",
  },
  {
    id: "sleepy",
    icon: "🌙",
    label: "Sleepy",
    title: "Low sleep weakens money control.",
    watch: "Watch for automatic spending, missed budget checks, caffeine runs, and convenience choices because planning feels too heavy.",
    tip: "Do not make big money decisions while sleepy. Save it, sleep first, then decide when your brain is clearer.",
  },
  {
    id: "hungry",
    icon: "🍜",
    label: "Hungry",
    title: "Hunger can turn into impulse spending.",
    watch: "Watch for overspending on meals, snacks, drinks, or treats because you waited too long to eat.",
    tip: "Protect a small food buffer. Eating on time is not weakness; it prevents bigger emotional spending later.",
  },
  {
    id: "pressure",
    icon: "⏰",
    label: "Time Pressure",
    title: "Time pressure becomes money pressure.",
    watch: "Watch for paying more because you are rushing: transport, convenience food, forgotten supplies, or last-minute school costs.",
    tip: "Pick one predictable pressure today and prepare it early, even if the plan is small.",
  },
];

const SOURCE_LIBRARY = {
  PSA: {
    label: "PSA",
    name: "Philippine Statistics Authority",
    url: "https://psa.gov.ph/statistics/labor-force-survey",
    note: "labor, employment, income, and household pressure signals",
  },
  CHED: {
    label: "CHED",
    name: "CHED / UniFAST",
    url: "https://unifast.gov.ph/",
    note: "tuition, subsidy, student loan, and higher-education cost context",
  },
  BSP: {
    label: "BSP",
    name: "Bangko Sentral ng Pilipinas",
    url: "https://www.bsp.gov.ph/Pages/InclusiveFinance/FinancialInclusionReports.aspx",
    note: "digital finance, payments, savings access, and money behavior context",
  },
  DOLE: {
    label: "DOLE",
    name: "Department of Labor and Employment",
    url: "https://www.dole.gov.ph/",
    note: "work, labor, youth employment, and workplace policy context",
  },
  WHO: {
    label: "WHO",
    name: "World Health Organization",
    url: "https://www.who.int/health-topics/mental-health",
    note: "mental health, stress, recovery, and wellbeing context",
  },
  WB: {
    label: "WB",
    name: "World Bank Philippines",
    url: "https://www.worldbank.org/en/country/philippines",
    note: "economic pressure, poverty, human capital, and youth opportunity context",
  },
};

const SOURCE_BY_TREND = {
  "Recovery Gap": ["WHO", "PSA", "CHED"],
  "Essential-Cost Load": ["PSA", "CHED", "BSP"],
  "Cash Buffer Risk": ["BSP", "PSA", "CHED"],
  "Stability Potential": ["PSA", "CHED", "WB"],

  "Responsibility Load": ["PSA", "CHED", "WHO"],
  "Shared-Money Pressure": ["PSA", "CHED", "DOLE"],
  "Boundary Risk": ["WHO", "PSA", "CHED"],
  "Support Balance": ["CHED", "PSA", "WB"],

  "Fatigue Load": ["WHO", "PSA", "DOLE"],
  "Schedule-Cost Pressure": ["PSA", "DOLE", "CHED"],
  "Convenience Spend Risk": ["BSP", "PSA", "WHO"],
  "Recovery Potential": ["WHO", "BSP", "CHED"],

  "Debt Stress Load": ["BSP", "CHED", "WHO"],
  "Repayment Pressure": ["BSP", "CHED", "PSA"],
  "Cash-Flow Stability": ["BSP", "PSA", "DOLE"],

  "Emotional Fatigue": ["WHO", "PSA", "CHED"],
  "Daily Pressure": ["PSA", "CHED", "BSP"],
  "Reward Frequency Risk": ["BSP", "WHO", "PSA"],
  "Reward Control": ["BSP", "WHO", "CHED"],

  "Independence Load": ["PSA", "CHED", "DOLE"],
  "Essential Pressure": ["PSA", "CHED", "BSP"],
  "Buffer Stability": ["BSP", "PSA", "CHED"],
  "Discipline Potential": ["CHED", "PSA", "WB"],

  "Fatigue Watch": ["WHO", "PSA", "DOLE"],
  "Cost Pressure": ["PSA", "CHED", "BSP"],
  "Routine Stability": ["PSA", "DOLE", "WHO"],
  "Future Potential": ["CHED", "PSA", "WB"],

  "Burnout Watch": ["WHO", "PSA", "DOLE"],
  "Financial Pressure": ["PSA", "CHED", "BSP"],
  "Micro-Spend Risk": ["BSP", "PSA", "WHO"],
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function hasAny(value, terms) {
  const text = clean(value).toLowerCase();
  return terms.some((term) => text.includes(clean(term).toLowerCase()));
}

function readProfile() {
  try {
    return JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function getWorkingStudentSupportCopy(profile) {
  const setup = clean(profile.setup);
  const rhythm = clean(profile.rhythm);
  const workload = clean(profile.workload);
  const pressure = clean(profile.pressure);
  const coping = clean(profile.coping);
  const goal = clean(profile.goal);

  const familyScore =
    (hasAny(setup, ["helping family"]) ? 2 : 0) +
    (hasAny(pressure, ["family contribution"]) ? 2 : 0) +
    (hasAny(goal, ["help family"]) ? 2 : 0);

  const debtScore =
    (hasAny(pressure, ["debt", "borrowed"]) ? 2 : 0) +
    (hasAny(coping, ["borrow", "delay payments"]) ? 2 : 0) +
    (hasAny(goal, ["avoid debt"]) ? 1 : 0);

  const survivalScore =
    (hasAny(setup, ["self-supporting", "school costs"]) ? 2 : 0) +
    (hasAny(rhythm, ["irregular", "project", "seasonal"]) ? 1 : 0) +
    (hasAny(workload, ["almost no margin", "survival", "little time to rest"]) ? 2 : 0) +
    (hasAny(pressure, ["daily food", "transport", "debt", "borrowed"]) ? 1 : 0) +
    (hasAny(coping, ["cut my needs", "borrow", "avoid checking"]) ? 1 : 0);

  const burnoutScore =
    (hasAny(workload, ["heavy", "little time", "almost no margin", "survival"]) ? 2 : 0) +
    (hasAny(pressure, ["schedule conflict", "work-school"]) ? 2 : 0) +
    (hasAny(goal, ["burning out"]) ? 1 : 0);

  const rewardScore =
    (hasAny(coping, ["small rewards", "feel okay"]) ? 2 : 0) +
    (hasAny(goal, ["stress spending"]) ? 2 : 0);

  const stableScore =
    (hasAny(workload, ["manageable", "tight but still controlled"]) ? 1 : 0) +
    (hasAny(rhythm, ["fixed", "allowance + work", "mostly allowance"]) ? 1 : 0) +
    (hasAny(coping, ["ask for help"]) ? 1 : 0) +
    (hasAny(goal, ["build savings", "finish school"]) ? 1 : 0);

  if (debtScore >= 3) {
    return {
      title: "Pressure may be stacking.",
      body: "Borrowing or delayed payments often happen when school fees, food, fare, and income timing do not line up.",
    };
  }

  if (familyScore >= 4) {
    return {
      title: "You’re carrying shared pressure.",
      body: "Helping at home can be meaningful, but it still needs limits so school, food, transport, and personal stability stay protected.",
    };
  }

  if (survivalScore >= 5) {
    return {
      title: "This looks like survival budgeting.",
      body: "Tuition, meals, commute, load/data, and income timing can squeeze the same week even when spending is not careless.",
    };
  }

  if (burnoutScore >= 4) {
    return {
      title: "Time pressure becomes money pressure.",
      body: "When class, work, commute, and deadlines overlap, convenience spending can increase because planning energy is already drained.",
    };
  }

  if (rewardScore >= 2) {
    return {
      title: "Small rewards can signal fatigue.",
      body: "This pattern often appears when rest is limited, meals are irregular, and the day feels too heavy to end without relief.",
    };
  }

  if (hasAny(setup, ["self-supporting", "school costs"])) {
    return {
      title: "Independence needs structure.",
      body: "Self-supporting students need buffers for food, fare, school deadlines, mobile data, and income gaps.",
    };
  }

  if (stableScore >= 3) {
    return {
      title: "Build rhythm before pressure grows.",
      body: "You may still have room for control, but small leaks become harder once school and work get heavier.",
    };
  }

  return {
    title: "Your effort has direction.",
    body: "Many working students quietly build their future while managing school costs, commute, food, mobile data, and social pressure.",
  };
}

function getSupportCopy() {
  const profile = readProfile();
  if (clean(profile.stage) === "Working Student") return getWorkingStudentSupportCopy(profile);
  return DEFAULT_SUPPORT_COPY;
}

function findLifeStageRoot() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard(hero) {
  if (!hero) return null;
  let current = hero.nextElementSibling;
  while (current) {
    const title = clean(current.querySelector("h3")?.textContent);
    if (title || current.querySelector("svg")) return current;
    current = current.nextElementSibling;
  }
  return null;
}

function findLifeStageContainer() {
  const snapshot = document.querySelector("section[data-clara-trend-snapshot='true']");
  return snapshot?.parentElement || null;
}

function findDirectSnapshot(container) {
  return Array.from(container?.children || []).find((node) => node.matches?.("section[data-clara-trend-snapshot='true']")) || null;
}

function findSignal(signalId) {
  return PRESSURE_SIGNALS.find((signal) => signal.id === signalId) || PRESSURE_SIGNALS[0];
}

function setText(node, value) {
  if (!node) return;
  const next = String(value || "");
  if (node.textContent !== next) node.textContent = next;
}

function ensurePressureSignalStyles() {
  if (document.getElementById("clara-pressure-signal-styles")) return;
  const style = document.createElement("style");
  style.id = "clara-pressure-signal-styles";
  style.textContent = `
    #root div:has(> section[data-clara-pressure-signals="true"]) {
      grid-template-rows: minmax(218px, 1fr) 92px 54px 236px !important;
      gap: 0 !important;
    }

    #root section[data-clara-pressure-signals="true"] {
      position: relative !important;
      z-index: 7 !important;
      height: 54px !important;
      min-height: 54px !important;
      max-height: 54px !important;
      width: calc(100% - 4px) !important;
      margin: -2px auto 0 !important;
      padding: 7px 8px !important;
      border-radius: 20px !important;
      border: 1px solid rgba(255,255,255,.085) !important;
      background:
        radial-gradient(circle at 7% 0%, rgba(45,212,191,.075), transparent 36%),
        radial-gradient(circle at 96% 35%, rgba(167,139,250,.125), transparent 42%),
        linear-gradient(135deg, rgba(7,18,38,.52), rgba(12,10,30,.62)) !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,.065),
        0 12px 34px rgba(0,0,0,.18),
        0 0 22px rgba(45,212,191,.025) !important;
      backdrop-filter: blur(24px) saturate(1.14) !important;
      -webkit-backdrop-filter: blur(24px) saturate(1.14) !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
    }

    #root section[data-clara-pressure-signals="true"]::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: linear-gradient(115deg, rgba(255,255,255,.052), transparent 36%, rgba(255,255,255,.018));
      opacity: .76;
    }

    #root .clara-pressure-track {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 7px;
      height: 100%;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 0 2px;
      scrollbar-width: none;
    }

    #root .clara-pressure-track::-webkit-scrollbar { display: none; }

    #root .clara-pressure-label {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      height: 30px;
      padding: 0 6px 0 2px;
      color: rgba(236,253,255,.42);
      font-size: 7.4px;
      font-weight: 1000;
      letter-spacing: .15em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    #root .clara-pressure-chip {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 34px;
      padding: 0 9px 0 7px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.045);
      color: rgba(255,255,255,.72);
      font-size: 9.2px;
      font-weight: 900;
      line-height: 1;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 8px 20px rgba(0,0,0,.14);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
    }

    #root .clara-pressure-chip:active {
      transform: scale(.965);
      border-color: rgba(165,243,252,.24);
      background: rgba(125,211,252,.075);
    }

    #root .clara-pressure-chip span:first-child {
      display: grid;
      place-items: center;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      background: rgba(255,255,255,.055);
      font-size: 11px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.06);
    }

    #root [data-clara-pressure-tip-panel="true"] {
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 18px;
      z-index: 95;
      overflow: hidden;
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,.10);
      background:
        radial-gradient(circle at 8% 0%, rgba(45,212,191,.13), transparent 34%),
        radial-gradient(circle at 96% 12%, rgba(167,139,250,.18), transparent 38%),
        rgba(4,9,24,.94);
      box-shadow: 0 26px 80px rgba(0,0,0,.52), inset 0 1px 0 rgba(255,255,255,.08);
      backdrop-filter: blur(30px) saturate(1.18);
      -webkit-backdrop-filter: blur(30px) saturate(1.18);
    }

    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-inner {
      position: relative;
      z-index: 2;
      padding: 16px;
    }

    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.055);
      font-size: 20px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,.07), 0 0 24px rgba(167,139,250,.12);
    }

    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-kicker {
      margin: 0;
      color: rgba(165,243,252,.52);
      font-size: 8px;
      font-weight: 1000;
      letter-spacing: .18em;
      text-transform: uppercase;
    }

    #root [data-clara-pressure-tip-panel="true"] h4 {
      margin: 6px 0 0;
      color: rgba(255,255,255,.96);
      font-size: 17px;
      font-weight: 1000;
      line-height: 1.08;
      letter-spacing: -.035em;
    }

    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-box {
      margin-top: 12px;
      padding: 12px;
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,.075);
      background: rgba(255,255,255,.035);
    }

    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-box p:first-child {
      margin: 0;
      color: rgba(255,255,255,.38);
      font-size: 8px;
      font-weight: 1000;
      letter-spacing: .16em;
      text-transform: uppercase;
    }

    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-box p:last-child {
      margin: 6px 0 0;
      color: rgba(255,255,255,.68);
      font-size: 12px;
      font-weight: 700;
      line-height: 1.55;
    }

    #root [data-clara-pressure-close="true"] {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,.10);
      background: rgba(255,255,255,.05);
      color: rgba(255,255,255,.68);
      font-size: 18px;
      font-weight: 900;
    }

    @media (max-height: 720px) {
      #root div:has(> section[data-clara-pressure-signals="true"]) {
        grid-template-rows: minmax(200px, 1fr) 84px 50px 224px !important;
      }
      #root section[data-clara-pressure-signals="true"] {
        height: 50px !important;
        min-height: 50px !important;
        max-height: 50px !important;
        padding: 6px 7px !important;
      }
      #root .clara-pressure-chip { height: 31px; font-size: 8.7px; }
    }

    @media (max-height: 660px) {
      #root div:has(> section[data-clara-pressure-signals="true"]) {
        grid-template-rows: minmax(176px, 1fr) 68px 46px 224px !important;
      }
      #root section[data-clara-pressure-signals="true"] {
        height: 46px !important;
        min-height: 46px !important;
        max-height: 46px !important;
      }
      #root .clara-pressure-label { display: none; }
      #root .clara-pressure-chip { height: 29px; padding-inline: 7px; }
    }
  `;
  document.head.appendChild(style);
}

function renderPressureSignals(section) {
  const signature = PRESSURE_SIGNALS.map((signal) => signal.id).join("|");
  if (section.dataset.pressureSignature === signature) return;
  section.dataset.pressureSignature = signature;
  section.innerHTML = `
    <div class="clara-pressure-track" aria-label="Today pressure signals">
      <div class="clara-pressure-label">Today signals</div>
      ${PRESSURE_SIGNALS.map(
        (signal) => `
          <button type="button" class="clara-pressure-chip" data-clara-pressure-signal="${signal.id}" aria-label="Open ${signal.label} tips">
            <span>${signal.icon}</span>
            <strong>${signal.label}</strong>
          </button>
        `
      ).join("")}
    </div>
  `;
}

function closePressureTip(container) {
  container?.querySelectorAll?.("[data-clara-pressure-tip-panel='true']").forEach((node) => node.remove());
}

function openPressureTip(container, signal) {
  if (!container || !signal) return;
  closePressureTip(container);
  const panel = document.createElement("div");
  panel.dataset.claraPressureTipPanel = "true";
  panel.innerHTML = `
    <div class="clara-pressure-tip-inner">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;">
          <div class="clara-pressure-tip-icon">${signal.icon}</div>
          <div style="min-width:0;">
            <p class="clara-pressure-tip-kicker">Pressure signal</p>
            <h4>${signal.title}</h4>
          </div>
        </div>
        <button type="button" data-clara-pressure-close="true" aria-label="Close pressure tip">×</button>
      </div>
      <div class="clara-pressure-tip-box">
        <p>Watch out for</p>
        <p>${signal.watch}</p>
      </div>
      <div class="clara-pressure-tip-box">
        <p>CLARA tip</p>
        <p>${signal.tip}</p>
      </div>
    </div>
  `;
  panel.querySelector("[data-clara-pressure-close='true']")?.addEventListener("click", () => closePressureTip(container));
  container.appendChild(panel);
}

function enhanceSupportCard() {
  const hero = findLifeStageRoot();
  const card = findSupportCard(hero);
  if (!hero || !card) return;

  const title = card.querySelector("h3");
  const body = title?.nextElementSibling;
  if (!title || !body) return;

  const copy = getSupportCopy();
  card.dataset.claraSupportCard = "true";
  setText(title, copy.title);
  setText(body, copy.body);

  card.querySelectorAll("[data-clara-support-signal='true']").forEach((node) => node.remove());
}

function enhancePressureSignals() {
  ensurePressureSignalStyles();
  const container = findLifeStageContainer();
  const snapshot = findDirectSnapshot(container);
  if (!container || !snapshot) return;

  let section = Array.from(container.children).find((node) => node.matches?.("section[data-clara-pressure-signals='true']"));
  if (!section) {
    section = document.createElement("section");
    section.dataset.claraPressureSignals = "true";
    snapshot.insertAdjacentElement("beforebegin", section);
  }

  renderPressureSignals(section);

  if (section.dataset.claraPressureReady === "true") return;
  section.dataset.claraPressureReady = "true";
  section.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-clara-pressure-signal]");
    if (!button) return;
    openPressureTip(container, findSignal(button.dataset.claraPressureSignal));
  });
}

function getTrendSources(trendLabel) {
  const ids = SOURCE_BY_TREND[clean(trendLabel)] || ["PSA", "CHED", "BSP"];
  return ids.map((id) => SOURCE_LIBRARY[id]).filter(Boolean);
}

function enhanceSourcePanel() {
  const sourceHeading = Array.from(document.querySelectorAll("p")).find((node) => clean(node.textContent) === "Source direction");
  if (!sourceHeading) return;

  const panel = sourceHeading.closest("div");
  const detailRoot = sourceHeading.closest(".absolute") || document;
  const trendTitle = clean(detailRoot.querySelector("h4")?.textContent);
  if (!panel || !trendTitle) return;

  const sources = getTrendSources(trendTitle);
  const body = Array.from(panel.querySelectorAll("p")).find((node) => node !== sourceHeading && !node.dataset.claraSourceDisclaimer);
  if (body) {
    setText(
      body,
      "These sources inform the pressure signals behind this reading. The percentage is CLARA’s pattern estimate, not a direct published statistic."
    );
    body.dataset.claraSourceDisclaimer = "true";
  }

  let row = panel.querySelector("[data-clara-source-row='true']");
  if (!row) {
    row = document.createElement("div");
    row.dataset.claraSourceRow = "true";
    row.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;";
    panel.appendChild(row);
  }

  const signature = sources.map((source) => source.label).join("|");
  if (row.dataset.sourceSignature === signature) return;
  row.dataset.sourceSignature = signature;
  row.innerHTML = "";

  sources.forEach((source) => {
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.title = `${source.name}: ${source.note}`;
    link.textContent = source.label;
    link.style.cssText = [
      "display:inline-flex",
      "align-items:center",
      "justify-content:center",
      "min-width:42px",
      "height:30px",
      "padding:0 10px",
      "border-radius:999px",
      "border:1px solid rgba(255,255,255,.12)",
      "background:rgba(255,255,255,.055)",
      "color:rgba(255,255,255,.76)",
      "font-size:10px",
      "font-weight:900",
      "letter-spacing:.11em",
      "text-decoration:none",
      "box-shadow:inset 0 1px 0 rgba(255,255,255,.06)",
      "backdrop-filter:blur(14px)",
    ].join(";");
    row.appendChild(link);
  });
}

function enhanceAll() {
  enhanceSupportCard();
  enhancePressureSignals();
  enhanceSourcePanel();
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_SUPPORT_CARD__) {
  window.__CLARA_LIFE_SUPPORT_CARD__ = true;

  let scheduled = false;
  const scheduleEnhance = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceAll();
    });
  };

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("storage", scheduleEnhance, { passive: true });
  document.addEventListener("click", () => window.setTimeout(scheduleEnhance, 80), { passive: true });
  scheduleEnhance();
}