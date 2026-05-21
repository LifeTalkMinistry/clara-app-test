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

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function findLifeStageHero() {
  return Array.from(document.querySelectorAll("section")).find((section) => {
    const heading = clean(section.querySelector("h2")?.textContent);
    return heading && section.querySelector("p")?.textContent?.toLowerCase?.().includes("your life stage");
  });
}

function findSupportCard(hero) {
  if (!hero) return null;
  let current = hero.nextElementSibling;
  while (current) {
    if (current.matches?.("section[data-clara-pressure-signals='true']")) {
      current = current.nextElementSibling;
      continue;
    }
    const title = clean(current.querySelector?.("h3")?.textContent);
    if (title || current.querySelector?.("svg")) return current;
    current = current.nextElementSibling;
  }
  return null;
}

function findSnapshot(container) {
  return Array.from(container?.children || []).find((node) => node.matches?.("section[data-clara-trend-snapshot='true']")) || null;
}

function findSignal(id) {
  return PRESSURE_SIGNALS.find((signal) => signal.id === id) || PRESSURE_SIGNALS[0];
}

function ensureStyles() {
  if (document.getElementById("clara-pressure-signals-bridge-styles")) return;
  const style = document.createElement("style");
  style.id = "clara-pressure-signals-bridge-styles";
  style.textContent = `
    #root div:has(> section[data-clara-pressure-signals="true"]):has(> section[data-clara-trend-snapshot="true"]) {
      grid-template-rows: minmax(214px, 1fr) 92px 56px 236px !important;
      gap: 0 !important;
      align-content: stretch !important;
    }

    #root section[data-clara-pressure-signals="true"] {
      position: relative !important;
      z-index: 7 !important;
      height: 56px !important;
      min-height: 56px !important;
      max-height: 56px !important;
      width: calc(100% - 4px) !important;
      margin: 6px auto 0 !important;
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

    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-inner { padding: 16px; }
    #root [data-clara-pressure-tip-panel="true"] .clara-pressure-tip-icon {
      display: grid;
      place-items: center;
      width: 42px;
      height: 42px;
      border-radius: 16px;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.055);
      font-size: 20px;
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
      #root div:has(> section[data-clara-pressure-signals="true"]):has(> section[data-clara-trend-snapshot="true"]) {
        grid-template-rows: minmax(196px, 1fr) 84px 50px 224px !important;
      }
      #root section[data-clara-pressure-signals="true"] {
        height: 50px !important;
        min-height: 50px !important;
        max-height: 50px !important;
        margin-top: 5px !important;
        padding: 6px 7px !important;
      }
      #root .clara-pressure-chip { height: 31px; font-size: 8.7px; }
    }

    @media (max-height: 660px) {
      #root div:has(> section[data-clara-pressure-signals="true"]):has(> section[data-clara-trend-snapshot="true"]) {
        grid-template-rows: minmax(172px, 1fr) 68px 46px 224px !important;
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

function renderSignals(section) {
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

function closeTip(container) {
  container?.querySelectorAll?.("[data-clara-pressure-tip-panel='true']").forEach((node) => node.remove());
}

function openTip(container, signal) {
  closeTip(container);
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
      <div class="clara-pressure-tip-box"><p>Watch out for</p><p>${signal.watch}</p></div>
      <div class="clara-pressure-tip-box"><p>CLARA tip</p><p>${signal.tip}</p></div>
    </div>
  `;
  panel.querySelector("[data-clara-pressure-close='true']")?.addEventListener("click", () => closeTip(container));
  container.appendChild(panel);
}

function enhanceSignals() {
  ensureStyles();

  const hero = findLifeStageHero();
  const support = findSupportCard(hero);
  const container = support?.parentElement || hero?.parentElement || null;
  const snapshot = findSnapshot(container);
  if (!support || !container || !snapshot) return;

  let section = Array.from(container.children).find((node) => node.matches?.("section[data-clara-pressure-signals='true']"));
  if (!section) {
    section = document.createElement("section");
    section.dataset.claraPressureSignals = "true";
    support.insertAdjacentElement("afterend", section);
  } else if (section.previousElementSibling !== support) {
    support.insertAdjacentElement("afterend", section);
  }

  renderSignals(section);

  if (section.dataset.pressureReady === "true") return;
  section.dataset.pressureReady = "true";
  section.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-clara-pressure-signal]");
    if (!button) return;
    openTip(container, findSignal(button.dataset.claraPressureSignal));
  });
}

if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__CLARA_LIFE_PRESSURE_SIGNALS__) {
  window.__CLARA_LIFE_PRESSURE_SIGNALS__ = true;

  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhanceSignals();
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener("storage", schedule, { passive: true });
  document.addEventListener("click", () => window.setTimeout(schedule, 80), { passive: true });
  schedule();
}
