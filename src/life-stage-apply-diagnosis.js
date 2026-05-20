const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const DIAGNOSIS_ID = "clara-life-stage-diagnosis-reveal";

const STAGE_DIAGNOSIS_COPY = {
  "Young Professional": {
    core: "Based on your answers, people in a similar early-career season often carry independence pressure, salary rhythm, lifestyle temptation, and future-building expectations all at once. The breakdown below shows what needs the most protection.",
    setupLabel: "Your independence setup is",
    setupMeaning: "This usually means your money decisions are connected to rent, commute, food, social expectations, and the kind of adult life you are trying to build.",
    rhythmLabel: "Your salary rhythm is",
    rhythmMeaning: "That kind of rhythm needs structure before small payday choices quietly become long-term lifestyle patterns.",
    goalMeaning: "The goal is not to remove enjoyment. The goal is to make independence feel stable.",
    pressureLabel: "The first area to protect is",
    loadLabel: "Your current work rhythm is",
    copingLabel: "your response pattern is",
    nextStep: "The next step should move you toward this",
    landing: "You do not need to perfect adulthood overnight. Start by protecting the rhythm that keeps your independence steady.",
  },
  "Working Student": {
    core: "Based on your answers, people in a similar situation often carry school pressure, income limits, time demands, and emotional energy all at once. The breakdown below shows what needs the most protection.",
    setupLabel: "Your setup is",
    setupMeaning: "This usually means money decisions are connected to class days, work days, rest, and the people depending on you.",
    rhythmLabel: "Your money rhythm is",
    rhythmMeaning: "That kind of rhythm needs a plan that can handle changes, delays, and real-life pressure without making the week feel heavier.",
    goalMeaning: "The goal is not a perfect budget. The goal is a steadier system.",
    pressureLabel: "The first area to protect is",
    loadLabel: "Your current load is",
    copingLabel: "your response pattern is",
    nextStep: "The next step should move you toward this",
    landing: "You do not need to fix everything at once. Start by protecting the part of your week that keeps everything else steady.",
  },
  "Living with Partner": {
    core: "Based on your answers, people in a similar shared-life setup often carry emotional expectations, shared bills, contribution pressure, and future planning decisions at the same time. The breakdown below shows what needs the most protection.",
    setupLabel: "Your shared setup is",
    setupMeaning: "This usually means money decisions are no longer only personal. They are connected to fairness, communication, routines, and how both people feel supported.",
    rhythmLabel: "Your shared money rhythm is",
    rhythmMeaning: "That kind of rhythm needs clear agreements so bills, comfort spending, and future plans do not quietly become emotional pressure.",
    goalMeaning: "The goal is not control over each other. The goal is a calmer shared money rhythm.",
    pressureLabel: "The first area to protect is",
    loadLabel: "Your current relationship-money load is",
    copingLabel: "your shared response pattern is",
    nextStep: "The next step should move the relationship toward this",
    landing: "Shared money becomes lighter when the rules are clear. Start with the part that protects peace, fairness, and trust.",
  },
  "Family Household": {
    core: "Based on your answers, people in a similar household season often carry family needs, contribution pressure, personal boundaries, and unexpected requests all at once. The breakdown below shows what needs the most protection.",
    setupLabel: "Your household setup is",
    setupMeaning: "This usually means money decisions are connected to food, bills, family requests, emergencies, and the emotional weight of helping.",
    rhythmLabel: "Your household money rhythm is",
    rhythmMeaning: "That kind of rhythm needs boundaries and buffers because family needs can interrupt even a careful personal plan.",
    goalMeaning: "The goal is not to stop helping. The goal is to help without losing your own stability.",
    pressureLabel: "The first area to protect is",
    loadLabel: "Your current household load is",
    copingLabel: "your response pattern is",
    nextStep: "The next step should move you toward this",
    landing: "You can care for people without carrying everything alone. Start by protecting the boundary that keeps your support sustainable.",
  },
  "Single Parent": {
    core: "Based on your answers, people in a similar parenting season often carry child-centered essentials, time pressure, emotional fatigue, and emergency responsibility all at once. The breakdown below shows what needs the most protection.",
    setupLabel: "Your parenting setup is",
    setupMeaning: "This usually means money decisions are connected to daily essentials, school needs, health costs, time, and the safety of your child.",
    rhythmLabel: "Your support and money rhythm is",
    rhythmMeaning: "That kind of rhythm needs protection because one unexpected cost can affect the whole week quickly.",
    goalMeaning: "The goal is not perfection. The goal is a safer rhythm for you and your child.",
    pressureLabel: "The first area to protect is",
    loadLabel: "Your current care load is",
    copingLabel: "your response pattern is",
    nextStep: "The next step should move you toward this",
    landing: "You do not need to solve every pressure today. Start by protecting the essentials that keep you and your child steady.",
  },
  "Full-Time Earner": {
    core: "Based on your answers, people in a similar full-time earning season often carry salary rhythm, routine fatigue, family support, and lifestyle pressure all at once. The breakdown below shows what needs the most protection.",
    setupLabel: "Your earning setup is",
    setupMeaning: "This usually means money decisions are connected to cutoff cycles, work fatigue, responsibilities, convenience spending, and the desire to feel rewarded.",
    rhythmLabel: "Your income rhythm is",
    rhythmMeaning: "That kind of rhythm needs clear rules because stable income can still feel tight when small leaks repeat every cutoff.",
    goalMeaning: "The goal is not strict restriction. The goal is a routine that protects your salary before it disappears.",
    pressureLabel: "The first area to protect is",
    loadLabel: "Your current work load is",
    copingLabel: "your response pattern is",
    nextStep: "The next step should move you toward this",
    landing: "Stable income becomes powerful when it has direction. Start by protecting the rhythm that repeats every payday.",
  },
  "Freelance Season": {
    core: "Based on your answers, people in a similar freelance or gig season often carry income uncertainty, client pressure, dry-month risk, and flexible-but-unstable routines all at once. The breakdown below shows what needs the most protection.",
    setupLabel: "Your freelance setup is",
    setupMeaning: "This usually means money decisions are connected to client flow, payment timing, workload boundaries, rest, and how prepared you are for slower periods.",
    rhythmLabel: "Your income rhythm is",
    rhythmMeaning: "That kind of rhythm needs buffers because expenses can stay fixed even when projects and payments move.",
    goalMeaning: "The goal is not to remove flexibility. The goal is to make flexibility financially safer.",
    pressureLabel: "The first area to protect is",
    loadLabel: "Your current work load is",
    copingLabel: "your response pattern is",
    nextStep: "The next step should move you toward this",
    landing: "Freedom feels better when the slow weeks are protected. Start by building the buffer that keeps your work rhythm safe.",
  },
  "Business Builder": {
    core: "Based on your answers, people in a similar business-building season often carry sales uncertainty, reinvestment pressure, operating costs, and personal-business money tension all at once. The breakdown below shows what needs the most protection.",
    setupLabel: "Your business setup is",
    setupMeaning: "This usually means money decisions are connected to sales cycles, operating costs, reinvestment choices, customer pressure, and personal financial safety.",
    rhythmLabel: "Your business cash rhythm is",
    rhythmMeaning: "That kind of rhythm needs separation because growth pressure can make personal money and business money blur quickly.",
    goalMeaning: "The goal is not just growth. The goal is sustainable growth that does not break your personal stability.",
    pressureLabel: "The first area to protect is",
    loadLabel: "Your current builder load is",
    copingLabel: "your response pattern is",
    nextStep: "The next step should move the business toward this",
    landing: "Building something takes pressure. Start by protecting the system that keeps growth, cash flow, and your personal life from mixing too much.",
  },
};

const STAGE_ALIASES = {
  "Young Earner": "Young Professional",
  "Fresh Graduate": "Young Professional",
  Breadwinner: "Family Household",
  "OFW Family": "Family Household",
  "Unemployed Adult": "Family Household",
  "First-Time Parent": "Single Parent",
  "Freelance / Gig Worker": "Freelance Season",
  Freelancer: "Freelance Season",
};

function getStageKey(stage) {
  const normalized = STAGE_ALIASES[clean(stage)] || clean(stage);
  return STAGE_DIAGNOSIS_COPY[normalized] ? normalized : "Young Professional";
}

function buildDiagnosis(profile) {
  const stageKey = getStageKey(profile.stage);
  const copy = STAGE_DIAGNOSIS_COPY[stageKey];
  const setup = displayValue(profile.setup, `${stageKey} setup`);
  const rhythm = displayValue(profile.rhythm, "current money rhythm");
  const workload = displayValue(profile.workload, "current life load");
  const pressure = displayValue(profile.pressure, "current financial pressure");
  const coping = displayValue(profile.coping, "current response pattern");
  const goal = displayValue(profile.goal, "protect stability");

  return {
    core: copy.core,
    sees: [
      { tone: "lead", text: `${copy.setupLabel} ${firstLower(setup)}.` },
      { tone: "soft", text: copy.setupMeaning },
    ],
    matters: [
      { tone: "lead", text: `${copy.rhythmLabel} ${firstLower(rhythm)}.` },
      { tone: "soft", text: copy.rhythmMeaning },
      { tone: "closing", text: copy.goalMeaning },
    ],
    protection: [
      { tone: "lead", text: `${copy.pressureLabel} ${firstLower(pressure)}.` },
      { tone: "soft", text: `${copy.loadLabel} ${firstLower(workload)}, and ${copy.copingLabel}: ${firstLower(coping)}.` },
      { tone: "closing", text: `${copy.nextStep}: ${firstLower(goal)}.` },
    ],
    landing: copy.landing,
  };
}

function removeExistingReveal() {
  document.getElementById(DIAGNOSIS_ID)?.remove();
}

function renderLines(lines) {
  return `
    <div class="clara-diagnosis-lines">
      ${lines
        .filter((line) => clean(line?.text))
        .map(
          (line) => `<p class="clara-diagnosis-line clara-diagnosis-line-${line.tone || "soft"}">${escapeHtml(line.text)}</p>`
        )
        .join("")}
    </div>
  `;
}

function showDiagnosisReveal(profile) {
  if (!profile || !profile.stage) return;
  removeExistingReveal();

  const diagnosis = buildDiagnosis(profile);
  const overlay = document.createElement("div");
  overlay.id = DIAGNOSIS_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="clara-diagnosis-shell">
      <div class="clara-diagnosis-bg"></div>
      <section class="clara-diagnosis-card">
        <div class="clara-diagnosis-orb clara-diagnosis-orb-one"></div>
        <div class="clara-diagnosis-orb clara-diagnosis-orb-two"></div>

        <div class="clara-diagnosis-scroll">
          <div class="clara-diagnosis-core-card">
            <p>${escapeHtml(diagnosis.core)}</p>
          </div>

          <div class="clara-diagnosis-sections">
            <article class="clara-diagnosis-section clara-diagnosis-section-suggests">
              <span>What this suggests</span>
              <div class="clara-diagnosis-insight-card">${renderLines(diagnosis.sees)}</div>
            </article>
            <article class="clara-diagnosis-section clara-diagnosis-section-matters">
              <span>Why this matters</span>
              <div class="clara-diagnosis-insight-card">${renderLines(diagnosis.matters)}</div>
            </article>
            <article class="clara-diagnosis-section clara-diagnosis-section-protection">
              <span>What needs protection now</span>
              <div class="clara-diagnosis-insight-card">${renderLines(diagnosis.protection)}</div>
            </article>
          </div>

          <div class="clara-diagnosis-landing">
            <p>${escapeHtml(diagnosis.landing)}</p>
          </div>

          <button type="button" class="clara-diagnosis-continue">Continue to Me</button>
        </div>
      </section>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${DIAGNOSIS_ID}, #${DIAGNOSIS_ID} * { box-sizing: border-box; }
    #${DIAGNOSIS_ID} { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgba(1, 8, 20, .82); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); animation: claraDiagnosisFade 220ms ease both; font-family: inherit; }
    #${DIAGNOSIS_ID} .clara-diagnosis-shell { position: relative; width: min(430px, 100vw); height: 100dvh; display: flex; align-items: stretch; justify-content: center; padding: max(14px, env(safe-area-inset-top)) 14px max(18px, calc(env(safe-area-inset-bottom) + 12px)); overflow: hidden; background: #020817; }
    #${DIAGNOSIS_ID} .clara-diagnosis-bg { position: absolute; inset: 0; background: radial-gradient(circle at 12% 4%, rgba(45, 212, 191, .18), transparent 30%), radial-gradient(circle at 88% 10%, rgba(124, 58, 237, .30), transparent 34%), radial-gradient(circle at 50% 100%, rgba(56, 189, 248, .14), transparent 34%), linear-gradient(180deg, rgba(4, 16, 36, .96), rgba(3, 7, 24, .99)); }
    #${DIAGNOSIS_ID} .clara-diagnosis-card { position: relative; width: 100%; height: 100%; max-height: 100%; overflow: hidden; border-radius: 31px; border: 1px solid rgba(165, 243, 252, .14); background: linear-gradient(145deg, rgba(9, 29, 55, .78), rgba(17, 21, 67, .80) 54%, rgba(48, 25, 104, .72)); box-shadow: 0 28px 90px rgba(0, 0, 0, .50), 0 0 54px rgba(34, 211, 238, .10), inset 0 1px 0 rgba(255, 255, 255, .10); animation: claraDiagnosisRise 420ms cubic-bezier(.16,1,.3,1) both; }
    #${DIAGNOSIS_ID} .clara-diagnosis-card::before { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 14% 9%, rgba(125, 211, 252, .12), transparent 28%), linear-gradient(180deg, rgba(255,255,255,.045), transparent 38%); }
    #${DIAGNOSIS_ID} .clara-diagnosis-scroll { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; overflow: hidden; padding: 22px 22px 20px; }
    #${DIAGNOSIS_ID} .clara-diagnosis-orb { position: absolute; pointer-events: none; border-radius: 9999px; filter: blur(28px); opacity: .55; }
    #${DIAGNOSIS_ID} .clara-diagnosis-orb-one { top: -26px; left: -34px; height: 116px; width: 138px; background: rgba(45, 212, 191, .18); }
    #${DIAGNOSIS_ID} .clara-diagnosis-orb-two { right: -40px; bottom: 54px; height: 150px; width: 150px; background: rgba(124, 58, 237, .22); }
    #${DIAGNOSIS_ID} .clara-diagnosis-core-card { margin: 0; border: 1px solid rgba(165, 243, 252, .14); border-radius: 20px; background: radial-gradient(circle at 8% 10%, rgba(125, 211, 252, .13), transparent 34%), rgba(255, 255, 255, .04); padding: 15px; box-shadow: 0 14px 32px rgba(0, 0, 0, .16), inset 0 1px 0 rgba(255, 255, 255, .07), 0 0 26px rgba(34, 211, 238, .07); }
    #${DIAGNOSIS_ID} .clara-diagnosis-core-card p { margin: 0; color: rgba(248, 253, 255, .92); font-size: clamp(13px, 3.35vw, 14.6px); font-weight: 680; line-height: 1.46; letter-spacing: -.014em; }
    #${DIAGNOSIS_ID} .clara-diagnosis-sections { display: grid; gap: clamp(9px, 1.6dvh, 13px); margin: clamp(14px, 2dvh, 18px) 0 0; flex: 0 0 auto; }
    #${DIAGNOSIS_ID} .clara-diagnosis-section { position: relative; display: grid; gap: 7px; }
    #${DIAGNOSIS_ID} .clara-diagnosis-section span { display: flex; align-items: center; gap: 8px; color: rgba(186, 230, 253, .70); font-size: 9.2px; font-weight: 900; letter-spacing: .23em; text-transform: uppercase; text-shadow: 0 0 18px rgba(125, 211, 252, .08); }
    #${DIAGNOSIS_ID} .clara-diagnosis-section span::before { content: ""; width: 6px; height: 6px; border-radius: 999px; background: rgba(125, 211, 252, .72); box-shadow: 0 0 16px rgba(125, 211, 252, .28); }
    #${DIAGNOSIS_ID} .clara-diagnosis-section-matters span { color: rgba(196, 181, 253, .72); }
    #${DIAGNOSIS_ID} .clara-diagnosis-section-matters span::before { background: rgba(196, 181, 253, .72); box-shadow: 0 0 16px rgba(168, 85, 247, .24); }
    #${DIAGNOSIS_ID} .clara-diagnosis-section-protection span { color: rgba(153, 246, 228, .72); }
    #${DIAGNOSIS_ID} .clara-diagnosis-section-protection span::before { background: rgba(153, 246, 228, .72); box-shadow: 0 0 16px rgba(45, 212, 191, .24); }
    #${DIAGNOSIS_ID} .clara-diagnosis-insight-card { position: relative; overflow: hidden; border-radius: 18px; border: 1px solid rgba(148, 163, 184, .12); background: radial-gradient(circle at 8% 0%, rgba(125, 211, 252, .08), transparent 40%), linear-gradient(145deg, rgba(15, 31, 60, .32), rgba(18, 21, 62, .38)); padding: clamp(9px, 1.35dvh, 11px) 12px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, .055), 0 10px 24px rgba(2, 8, 23, .13); }
    #${DIAGNOSIS_ID} .clara-diagnosis-section-matters .clara-diagnosis-insight-card { border-color: rgba(196, 181, 253, .13); background: radial-gradient(circle at 8% 0%, rgba(196, 181, 253, .08), transparent 40%), linear-gradient(145deg, rgba(15, 23, 55, .30), rgba(30, 24, 78, .38)); }
    #${DIAGNOSIS_ID} .clara-diagnosis-section-protection .clara-diagnosis-insight-card { border-color: rgba(153, 246, 228, .13); background: radial-gradient(circle at 8% 0%, rgba(45, 212, 191, .08), transparent 40%), linear-gradient(145deg, rgba(10, 29, 50, .30), rgba(28, 24, 72, .38)); }
    #${DIAGNOSIS_ID} .clara-diagnosis-lines { position: relative; z-index: 1; display: grid; gap: 5px; }
    #${DIAGNOSIS_ID} .clara-diagnosis-line { margin: 0; text-wrap: pretty; letter-spacing: -.011em; }
    #${DIAGNOSIS_ID} .clara-diagnosis-line-lead { color: rgba(248, 253, 255, .91); font-size: clamp(12.7px, 3.25vw, 14.1px); font-weight: 760; line-height: 1.36; }
    #${DIAGNOSIS_ID} .clara-diagnosis-line-soft { color: rgba(226, 236, 246, .74); font-size: clamp(12px, 3.02vw, 13.2px); font-weight: 550; line-height: 1.42; }
    #${DIAGNOSIS_ID} .clara-diagnosis-line-closing { color: rgba(241, 250, 255, .92); font-size: clamp(12.2px, 3.08vw, 13.5px); font-weight: 780; line-height: 1.4; }
    #${DIAGNOSIS_ID} .clara-diagnosis-landing { position: relative; flex: 1 1 auto; min-height: clamp(72px, 11dvh, 104px); width: 100%; margin: clamp(10px, 1.9dvh, 17px) 0 clamp(10px, 1.6dvh, 14px); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid rgba(125, 211, 252, .12); border-radius: 24px; background: radial-gradient(circle at 18% 10%, rgba(125, 211, 252, .13), transparent 36%), radial-gradient(circle at 90% 80%, rgba(124, 58, 237, .17), transparent 42%), linear-gradient(145deg, rgba(8, 20, 45, .34), rgba(25, 19, 68, .38)); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .055), 0 18px 44px rgba(2, 8, 23, .16), 0 0 34px rgba(45, 212, 191, .06); }
    #${DIAGNOSIS_ID} .clara-diagnosis-landing::before { content: ""; position: absolute; inset: 14px 18px auto; height: 1px; background: linear-gradient(90deg, transparent, rgba(165, 243, 252, .28), transparent); opacity: .72; }
    #${DIAGNOSIS_ID} .clara-diagnosis-landing::after { content: ""; position: absolute; inset: auto 22% 16px; height: 18px; border-radius: 999px; background: rgba(45, 212, 191, .12); filter: blur(18px); }
    #${DIAGNOSIS_ID} .clara-diagnosis-landing p { position: relative; z-index: 1; max-width: 270px; margin: 0; color: rgba(218, 242, 248, .82); font-size: clamp(12px, 3.02vw, 13.2px); font-weight: 660; line-height: 1.5; letter-spacing: -.01em; text-align: center; text-shadow: 0 0 20px rgba(45, 212, 191, .10); }
    #${DIAGNOSIS_ID} .clara-diagnosis-continue { width: 100%; min-height: 50px; flex: 0 0 auto; border: 1px solid rgba(255, 255, 255, .16); border-radius: 9999px; background: radial-gradient(circle at 18% 20%, rgba(255,255,255,.34), transparent 26%), linear-gradient(135deg, #5eead4, #7dd3fc 48%, #93c5fd); color: #06101f; font-size: 13.5px; font-weight: 860; cursor: pointer; box-shadow: 0 18px 42px rgba(45, 212, 191, .18), 0 0 34px rgba(125, 211, 252, .14), inset 0 1px 0 rgba(255, 255, 255, .38); }
    @keyframes claraDiagnosisFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes claraDiagnosisRise { from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(5px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @media (max-height: 760px) { #${DIAGNOSIS_ID} .clara-diagnosis-shell { padding: 10px 12px max(16px, calc(env(safe-area-inset-bottom) + 10px)); } #${DIAGNOSIS_ID} .clara-diagnosis-card { border-radius: 27px; } #${DIAGNOSIS_ID} .clara-diagnosis-scroll { padding: 14px 17px 16px; } #${DIAGNOSIS_ID} .clara-diagnosis-core-card { padding: 11px 12px; border-radius: 17px; } #${DIAGNOSIS_ID} .clara-diagnosis-core-card p { font-size: 11.8px; line-height: 1.32; } #${DIAGNOSIS_ID} .clara-diagnosis-sections { margin-top: 10px; gap: 7px; } #${DIAGNOSIS_ID} .clara-diagnosis-section { gap: 5px; } #${DIAGNOSIS_ID} .clara-diagnosis-section span { font-size: 7.4px; letter-spacing: .19em; } #${DIAGNOSIS_ID} .clara-diagnosis-insight-card { padding: 7px 10px; border-radius: 15px; } #${DIAGNOSIS_ID} .clara-diagnosis-lines { gap: 3px; } #${DIAGNOSIS_ID} .clara-diagnosis-line-lead { font-size: 11.5px; line-height: 1.25; } #${DIAGNOSIS_ID} .clara-diagnosis-line-soft { font-size: 10.9px; line-height: 1.28; } #${DIAGNOSIS_ID} .clara-diagnosis-line-closing { font-size: 11.2px; line-height: 1.26; } #${DIAGNOSIS_ID} .clara-diagnosis-landing { min-height: clamp(46px, 7dvh, 62px); margin: 7px 0 8px; border-radius: 18px; } #${DIAGNOSIS_ID} .clara-diagnosis-landing p { max-width: 260px; font-size: 10.4px; line-height: 1.2; } #${DIAGNOSIS_ID} .clara-diagnosis-continue { min-height: 45px; } }
    @media (max-height: 660px) { #${DIAGNOSIS_ID} .clara-diagnosis-core-card p { font-size: 10.7px; line-height: 1.18; } #${DIAGNOSIS_ID} .clara-diagnosis-sections { gap: 5px; margin-top: 7px; } #${DIAGNOSIS_ID} .clara-diagnosis-section span { font-size: 6.6px; } #${DIAGNOSIS_ID} .clara-diagnosis-insight-card { padding: 5px 8px; border-radius: 13px; } #${DIAGNOSIS_ID} .clara-diagnosis-line-lead { font-size: 10.4px; line-height: 1.14; } #${DIAGNOSIS_ID} .clara-diagnosis-line-soft { font-size: 9.8px; line-height: 1.15; } #${DIAGNOSIS_ID} .clara-diagnosis-line-closing { font-size: 10px; line-height: 1.14; } #${DIAGNOSIS_ID} .clara-diagnosis-landing { min-height: 30px; margin: 5px 0 6px; border-radius: 13px; } #${DIAGNOSIS_ID} .clara-diagnosis-landing::before, #${DIAGNOSIS_ID} .clara-diagnosis-landing::after { opacity: 0; } #${DIAGNOSIS_ID} .clara-diagnosis-landing p { font-size: 9.2px; line-height: 1.08; } #${DIAGNOSIS_ID} .clara-diagnosis-continue { min-height: 40px; } }
  `;

  overlay.appendChild(style);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const close = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };

  overlay.querySelector(".clara-diagnosis-continue")?.addEventListener("click", close);
}

function installDiagnosisReveal() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraLifeStageDiagnosisRevealInstalled) return;
  window.__claraLifeStageDiagnosisRevealInstalled = true;

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("button");
      if (!button) return;
      if (!/apply stage/i.test(clean(button.innerText || button.textContent))) return;

      window.setTimeout(() => {
        showDiagnosisReveal(readProfile());
      }, 180);
    },
    true
  );
}

try {
  installDiagnosisReveal();
} catch (error) {
  console.warn("CLARA Life Stage diagnosis reveal failed:", error);
}
