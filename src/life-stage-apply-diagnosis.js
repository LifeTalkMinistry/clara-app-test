const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const DIAGNOSIS_ID = "clara-working-student-diagnosis-reveal";

const SETUP_MEANING = {
  "Family-supported with some work": "you still have support, but responsibility is already shifting toward you",
  "Self-supporting student": "you are carrying most of your daily needs while still protecting your education",
  "Working mainly for school costs": "your work is directly tied to keeping your education moving",
  "Helping family while studying": "your student life includes responsibility for others, not only yourself",
  "Side hustle / extra-income student": "you are trying to create extra room through flexible income while still studying",
};

const RHYTHM_MEANING = {
  "Allowance + work income": "your money comes from both support and personal effort",
  "Fixed part-time pay": "your income has a clearer rhythm but still needs careful limits",
  "Irregular side hustle income": "your income timing can change from week to week",
  "Project / seasonal income": "your money arrives in waves, so strong periods need to protect slower ones",
  "Mostly allowance with occasional work": "allowance is still your base while occasional work gives extra breathing room",
};

const LOAD_MEANING = {
  "Manageable class-work load": "your week still has room to build structure before pressure grows",
  "Tight but still controlled": "your week is already stretched, but still steerable",
  "Heavy school-work overlap": "school and work are competing for the same energy",
  "Little time to rest": "low recovery time may affect how you spend and decide",
  "Almost no margin / survival mode": "there is very little room for mistakes, so protection matters more than perfection",
};

const PRESSURE_MEANING = {
  "Tuition or school costs": "school costs are the main area that must stay protected",
  "Tution or school costs": "school costs are the main area that must stay protected",
  "Daily food and transport": "daily survival costs are the pressure point that can quietly drain your week",
  "Work-school schedule conflict": "time conflict is affecting your money decisions, not just expenses",
  "Family contribution": "family support pressure is part of your financial environment",
  "Debt or borrowed money": "borrowed money is already a risk that can repeat if not protected early",
};

const COPING_MEANING = {
  "I spend on small rewards to feel okay": "pressure may turn into small relief spending when you feel tired or stretched",
  "I avoid checking my money": "checking your money may feel emotionally heavy right now",
  "I borrow or delay payments": "you may be solving today’s pressure by pushing some of it forward",
  "I cut my needs too much": "you may be sacrificing basic needs too aggressively just to keep obligations covered",
  "I ask for help before it gets worse": "you know how to reach for support before pressure becomes heavier",
};

const GOAL_MEANING = {
  "Finish school without burning out": "finish school without draining your energy",
  "Avoid debt": "avoid borrowed-money pressure before it becomes normal",
  "Build savings slowly": "build small protection without forcing an unrealistic plan",
  "Help family without losing stability": "help family without losing your own stability",
  "Control stress spending": "control stress spending before it becomes a repeated pattern",
};

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function sentence(value) {
  const text = clean(value);
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function meaning(map, key, fallback) {
  return map[key] || fallback || clean(key).toLowerCase();
}

function displayValue(value) {
  return clean(value).replace(/\bTution\b/gi, "Tuition");
}

function buildDiagnosis(profile) {
  const setup = meaning(SETUP_MEANING, profile.setup, "your student setup carries both school and money responsibility");
  const rhythm = meaning(RHYTHM_MEANING, profile.rhythm, "your income rhythm needs protection");
  const load = meaning(LOAD_MEANING, profile.workload, "your schedule affects your money decisions");
  const pressure = meaning(PRESSURE_MEANING, profile.pressure, "one financial area needs to be protected first");
  const coping = meaning(COPING_MEANING, profile.coping, "pressure changes how you respond to money");
  const goal = meaning(GOAL_MEANING, profile.goal, "protect your stability while continuing school");

  return {
    title: "CLARA understands your current environment.",
    core: "You are carrying school, money, energy, and protection at the same time.",
    sees: `${sentence(setup)}.`,
    matters: `Because ${rhythm}, CLARA understands that one small gap can affect your school, daily needs, and emotional energy.`,
    protection: `Right now, ${pressure}. Since ${load}, and ${coping}, your financial system should help you ${goal}.`,
    focus: displayValue(profile.goal) || "Protect your stability",
    pressure: displayValue(profile.pressure) || "Student money pressure",
    rhythm: displayValue(profile.rhythm) || "Mixed student rhythm",
  };
}

function removeExistingReveal() {
  document.getElementById(DIAGNOSIS_ID)?.remove();
}

function showDiagnosisReveal(profile) {
  if (!profile || profile.stage !== "Working Student") return;
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
        <p class="clara-diagnosis-kicker">WORKING STUDENT DIAGNOSIS</p>
        <h2>${diagnosis.title}</h2>
        <div class="clara-diagnosis-core-card">
          <span>CLARA'S READ</span>
          <p>${diagnosis.core}</p>
        </div>
        <div class="clara-diagnosis-sections">
          <article>
            <span>What CLARA sees</span>
            <p>${diagnosis.sees}</p>
          </article>
          <article>
            <span>Why this matters</span>
            <p>${diagnosis.matters}</p>
          </article>
          <article>
            <span>What needs protection now</span>
            <p>${diagnosis.protection}</p>
          </article>
        </div>
        <div class="clara-diagnosis-grid">
          <div class="clara-diagnosis-meta-card">
            <span>Pressure to protect</span>
            <strong>${diagnosis.pressure}</strong>
          </div>
          <div class="clara-diagnosis-meta-card">
            <span>Money rhythm</span>
            <strong>${diagnosis.rhythm}</strong>
          </div>
          <div class="clara-diagnosis-meta-card clara-diagnosis-priority-card">
            <span>CLARA priority</span>
            <strong>${diagnosis.focus}</strong>
          </div>
        </div>
        <button type="button" class="clara-diagnosis-continue">Continue to Me</button>
      </section>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${DIAGNOSIS_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      background: rgba(1, 8, 20, 0.82);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      animation: claraDiagnosisFade 220ms ease both;
      font-family: inherit;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-shell {
      position: relative;
      width: min(430px, 100vw);
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom));
      overflow: hidden;
      background: #020817;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 12% 4%, rgba(45, 212, 191, .18), transparent 30%),
        radial-gradient(circle at 88% 10%, rgba(124, 58, 237, .30), transparent 34%),
        radial-gradient(circle at 50% 96%, rgba(56, 189, 248, .14), transparent 34%),
        linear-gradient(180deg, rgba(4, 16, 36, .96), rgba(3, 7, 24, .99));
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-card {
      position: relative;
      width: 100%;
      max-height: calc(100dvh - 32px);
      overflow-y: auto;
      overflow-x: hidden;
      border-radius: 32px;
      border: 1px solid rgba(165, 243, 252, .14);
      background:
        linear-gradient(145deg, rgba(9, 29, 55, .78), rgba(17, 21, 67, .80) 54%, rgba(48, 25, 104, .72));
      padding: 22px;
      box-shadow:
        0 28px 90px rgba(0, 0, 0, .50),
        0 0 54px rgba(34, 211, 238, .10),
        inset 0 1px 0 rgba(255, 255, 255, .10);
      animation: claraDiagnosisRise 420ms cubic-bezier(.16,1,.3,1) both;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-card::-webkit-scrollbar { display: none; }
    #${DIAGNOSIS_ID} .clara-diagnosis-card::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 14% 9%, rgba(125, 211, 252, .12), transparent 28%),
        radial-gradient(circle at 90% 18%, rgba(255, 255, 255, .08), transparent 22%),
        linear-gradient(180deg, rgba(255,255,255,.045), transparent 38%);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-orb {
      position: absolute;
      pointer-events: none;
      border-radius: 9999px;
      filter: blur(28px);
      opacity: .55;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-orb-one {
      top: -26px;
      left: -34px;
      height: 116px;
      width: 138px;
      background: rgba(45, 212, 191, .18);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-orb-two {
      right: -40px;
      bottom: 54px;
      height: 150px;
      width: 150px;
      background: rgba(124, 58, 237, .22);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-kicker,
    #${DIAGNOSIS_ID} h2,
    #${DIAGNOSIS_ID} .clara-diagnosis-core-card,
    #${DIAGNOSIS_ID} .clara-diagnosis-sections,
    #${DIAGNOSIS_ID} .clara-diagnosis-grid,
    #${DIAGNOSIS_ID} .clara-diagnosis-continue {
      position: relative;
      z-index: 1;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-kicker {
      margin: 0;
      color: rgba(186, 230, 253, .62);
      font-size: 9px;
      font-weight: 800;
      letter-spacing: .29em;
      text-transform: uppercase;
    }
    #${DIAGNOSIS_ID} h2 {
      max-width: 19rem;
      margin: 14px 0 0;
      color: rgba(255, 255, 255, .96);
      font-size: clamp(28px, 7.1vw, 34px);
      line-height: 1.02;
      letter-spacing: -.045em;
      font-weight: 850;
      text-shadow: 0 8px 22px rgba(0, 0, 0, .24);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-core-card {
      margin: 20px 0 0;
      border: 1px solid rgba(165, 243, 252, .15);
      border-radius: 22px;
      background:
        radial-gradient(circle at 8% 10%, rgba(125, 211, 252, .14), transparent 34%),
        rgba(255, 255, 255, .045);
      padding: 15px 16px;
      box-shadow:
        0 16px 38px rgba(0, 0, 0, .18),
        inset 0 1px 0 rgba(255, 255, 255, .07),
        0 0 30px rgba(34, 211, 238, .08);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-core-card span {
      display: block;
      color: rgba(186, 230, 253, .52);
      font-size: 8px;
      font-weight: 850;
      letter-spacing: .22em;
      text-transform: uppercase;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-core-card p {
      margin: 7px 0 0;
      color: rgba(248, 253, 255, .92);
      font-size: clamp(13.5px, 3.55vw, 15px);
      font-weight: 760;
      line-height: 1.42;
      letter-spacing: -.018em;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-sections {
      display: grid;
      gap: 16px;
      margin: 22px 0 0;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-sections article {
      display: grid;
      gap: 6px;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-sections span {
      color: rgba(186, 230, 253, .48);
      font-size: 8.5px;
      font-weight: 850;
      letter-spacing: .2em;
      text-transform: uppercase;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-sections p {
      margin: 0;
      color: rgba(241, 245, 249, .76);
      font-size: clamp(12.6px, 3.25vw, 14px);
      font-weight: 560;
      line-height: 1.55;
      letter-spacing: -.012em;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-grid {
      display: grid;
      gap: 9px;
      margin-top: 22px;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-meta-card {
      border: 1px solid rgba(255, 255, 255, .075);
      background: rgba(2, 8, 23, .25);
      border-radius: 18px;
      padding: 12px 14px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .045);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-priority-card {
      border-color: rgba(165, 243, 252, .18);
      background:
        radial-gradient(circle at 8% 50%, rgba(45, 212, 191, .12), transparent 42%),
        rgba(7, 18, 38, .40);
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, .06),
        0 0 26px rgba(34, 211, 238, .08);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-grid span {
      display: block;
      color: rgba(186, 230, 253, .40);
      font-size: 8px;
      font-weight: 850;
      letter-spacing: .19em;
      text-transform: uppercase;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-grid strong {
      display: block;
      margin-top: 5px;
      color: rgba(255, 255, 255, .86);
      font-size: 12.5px;
      font-weight: 760;
      line-height: 1.25;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-priority-card strong {
      color: rgba(240, 253, 255, .96);
      font-weight: 850;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-continue {
      width: 100%;
      min-height: 54px;
      margin-top: 22px;
      border: 1px solid rgba(255, 255, 255, .16);
      border-radius: 9999px;
      background:
        radial-gradient(circle at 18% 20%, rgba(255,255,255,.36), transparent 26%),
        linear-gradient(135deg, #5eead4, #7dd3fc 48%, #93c5fd);
      color: #06101f;
      font-size: 13.5px;
      font-weight: 860;
      cursor: pointer;
      box-shadow:
        0 18px 42px rgba(45, 212, 191, .18),
        0 0 34px rgba(125, 211, 252, .14),
        inset 0 1px 0 rgba(255, 255, 255, .38);
    }
    @keyframes claraDiagnosisFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes claraDiagnosisRise { from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(5px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @media (max-height: 720px) {
      #${DIAGNOSIS_ID} .clara-diagnosis-shell { padding: 12px 14px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-card { padding: 18px; border-radius: 28px; }
      #${DIAGNOSIS_ID} h2 { margin-top: 11px; font-size: clamp(25px, 6.7vw, 31px); }
      #${DIAGNOSIS_ID} .clara-diagnosis-core-card { margin-top: 14px; padding: 12px 13px; border-radius: 18px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-core-card p { font-size: 12.5px; line-height: 1.36; }
      #${DIAGNOSIS_ID} .clara-diagnosis-sections { margin-top: 15px; gap: 10px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-sections p { font-size: 11.4px; line-height: 1.42; }
      #${DIAGNOSIS_ID} .clara-diagnosis-grid { margin-top: 14px; gap: 7px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-meta-card { padding: 10px 12px; border-radius: 16px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-continue { margin-top: 14px; min-height: 48px; }
    }
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
  if (window.__claraWorkingStudentDiagnosisRevealInstalled) return;
  window.__claraWorkingStudentDiagnosisRevealInstalled = true;

  document.addEventListener(
    "click",
    (event) => {
      const button = event.target?.closest?.("button");
      if (!button) return;
      if (!/apply stage/i.test(clean(button.innerText || button.textContent))) return;

      window.setTimeout(() => {
        const profile = readProfile();
        showDiagnosisReveal(profile);
      }, 180);
    },
    true
  );
}

try {
  installDiagnosisReveal();
} catch (error) {
  console.warn("CLARA Working Student diagnosis reveal failed:", error);
}
