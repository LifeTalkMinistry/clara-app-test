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
    paragraphOne:
      `${sentence(setup)}. Because ${rhythm}, CLARA understands that one small gap can affect your school, daily needs, and emotional energy.`,
    paragraphTwo:
      `Right now, ${pressure}. Since ${load}, and ${coping}, your financial system should help you ${goal}.`,
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
        <p class="clara-diagnosis-kicker">WORKING STUDENT DIAGNOSIS</p>
        <h2>${diagnosis.title}</h2>
        <p class="clara-diagnosis-core">${diagnosis.core}</p>
        <div class="clara-diagnosis-statement">
          <p>${diagnosis.paragraphOne}</p>
          <p>${diagnosis.paragraphTwo}</p>
        </div>
        <div class="clara-diagnosis-grid">
          <div>
            <span>Pressure to protect</span>
            <strong>${diagnosis.pressure}</strong>
          </div>
          <div>
            <span>Money rhythm</span>
            <strong>${diagnosis.rhythm}</strong>
          </div>
          <div>
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
      background: rgba(1, 8, 20, 0.78);
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
      padding: max(18px, env(safe-area-inset-top)) 18px max(18px, env(safe-area-inset-bottom));
      overflow: hidden;
      background: #020817;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 10% 4%, rgba(45, 212, 191, .20), transparent 32%),
        radial-gradient(circle at 90% 8%, rgba(124, 58, 237, .32), transparent 34%),
        radial-gradient(circle at 50% 100%, rgba(14, 165, 233, .12), transparent 34%),
        linear-gradient(180deg, rgba(7, 18, 38, .92), rgba(2, 8, 23, .98));
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-card {
      position: relative;
      width: 100%;
      overflow: hidden;
      border-radius: 34px;
      border: 1px solid rgba(165, 243, 252, .18);
      background: linear-gradient(135deg, rgba(12, 33, 58, .78), rgba(20, 24, 75, .78) 52%, rgba(63, 28, 128, .72));
      padding: 24px;
      box-shadow:
        0 28px 90px rgba(0, 0, 0, .46),
        0 0 48px rgba(34, 211, 238, .12),
        inset 0 1px 0 rgba(255, 255, 255, .10);
      animation: claraDiagnosisRise 420ms cubic-bezier(.16,1,.3,1) both;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-card::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 12% 8%, rgba(125, 211, 252, .18), transparent 28%),
        radial-gradient(circle at 88% 18%, rgba(255, 255, 255, .10), transparent 24%);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-kicker,
    #${DIAGNOSIS_ID} h2,
    #${DIAGNOSIS_ID} .clara-diagnosis-core,
    #${DIAGNOSIS_ID} .clara-diagnosis-statement,
    #${DIAGNOSIS_ID} .clara-diagnosis-grid,
    #${DIAGNOSIS_ID} .clara-diagnosis-continue {
      position: relative;
      z-index: 1;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-kicker {
      margin: 0;
      color: rgba(207, 250, 254, .74);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .28em;
      text-transform: uppercase;
    }
    #${DIAGNOSIS_ID} h2 {
      margin: 18px 0 0;
      color: white;
      font-size: clamp(30px, 8.1vw, 42px);
      line-height: .94;
      letter-spacing: -.055em;
      font-weight: 950;
      text-shadow: 0 10px 26px rgba(0, 0, 0, .35);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-core {
      margin: 18px 0 0;
      border-left: 3px solid rgba(165, 243, 252, .82);
      border-radius: 16px;
      background: rgba(125, 211, 252, .075);
      padding: 13px 14px;
      color: rgba(248, 253, 255, .96);
      font-size: clamp(14px, 3.75vw, 16px);
      font-weight: 950;
      line-height: 1.38;
      letter-spacing: -.024em;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .06), 0 0 26px rgba(34, 211, 238, .08);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-statement {
      display: grid;
      gap: 12px;
      margin: 18px 0 0;
      color: rgba(248, 253, 255, .80);
      font-size: clamp(13.5px, 3.45vw, 15.5px);
      font-weight: 700;
      line-height: 1.56;
      letter-spacing: -.018em;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-statement p {
      margin: 0;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-grid {
      display: grid;
      gap: 10px;
      margin-top: 22px;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-grid div {
      border: 1px solid rgba(255, 255, 255, .08);
      background: rgba(2, 8, 23, .30);
      border-radius: 20px;
      padding: 13px 14px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .05);
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-grid span {
      display: block;
      color: rgba(207, 250, 254, .42);
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .18em;
      text-transform: uppercase;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-grid strong {
      display: block;
      margin-top: 5px;
      color: rgba(255, 255, 255, .92);
      font-size: 13px;
      font-weight: 900;
      line-height: 1.22;
    }
    #${DIAGNOSIS_ID} .clara-diagnosis-continue {
      width: 100%;
      min-height: 56px;
      margin-top: 22px;
      border: 0;
      border-radius: 22px;
      background: linear-gradient(135deg, #67f8ff, #8bdcff 46%, #72a9ff);
      color: #071226;
      font-size: 14px;
      font-weight: 950;
      cursor: pointer;
      box-shadow: 0 18px 42px rgba(103, 248, 255, .24), 0 0 34px rgba(125, 211, 252, .20);
    }
    @keyframes claraDiagnosisFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes claraDiagnosisRise { from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(5px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }
    @media (max-height: 720px) {
      #${DIAGNOSIS_ID} .clara-diagnosis-card { padding: 18px; border-radius: 28px; }
      #${DIAGNOSIS_ID} h2 { margin-top: 13px; font-size: clamp(27px, 7vw, 34px); }
      #${DIAGNOSIS_ID} .clara-diagnosis-core { margin-top: 13px; padding: 10px 12px; font-size: 12.5px; line-height: 1.34; }
      #${DIAGNOSIS_ID} .clara-diagnosis-statement { margin-top: 13px; gap: 8px; font-size: 12px; line-height: 1.44; }
      #${DIAGNOSIS_ID} .clara-diagnosis-grid { margin-top: 14px; gap: 7px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-grid div { padding: 10px 12px; border-radius: 16px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-continue { margin-top: 14px; min-height: 48px; border-radius: 18px; }
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
