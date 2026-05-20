const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const DIAGNOSIS_ID = "clara-working-student-diagnosis-reveal";

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

function escapeHtml(value) {
  return clean(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));
}

function displayValue(value, fallback) {
  return clean(value).replace(/\bTution\b/gi, "Tuition") || fallback;
}

function firstLower(value) {
  const text = clean(value);
  if (!text) return "";
  return text.charAt(0).toLowerCase() + text.slice(1);
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

function buildDiagnosis(profile) {
  const setup = displayValue(profile.setup, "Working student rhythm");
  const rhythm = displayValue(profile.rhythm, "Mixed student income");
  const workload = displayValue(profile.workload, "Class and work load");
  const pressure = displayValue(profile.pressure, "Student money pressure");
  const coping = displayValue(profile.coping, "Current response pattern");
  const goal = displayValue(profile.goal, "Protect your stability");

  return {
    core: "You are balancing school, money, time, and emotional energy in one season.",
    sees: [
      { tone: "lead", text: `You are in a ${firstLower(setup)}.` },
      { tone: "soft", text: "That means your money decisions are not isolated. They connect to class days, work days, rest, and the people depending on you." },
    ],
    matters: [
      { tone: "lead", text: `Your money rhythm is ${firstLower(rhythm)}.` },
      { tone: "soft", text: "So your plan should not expect every week to feel the same. It needs room for changes, delays, and real-life pressure." },
      { tone: "closing", text: "The goal is a system that feels steady, not another thing to carry." },
    ],
    protection: [
      { tone: "lead", text: `The first area to protect is ${firstLower(pressure)}.` },
      { tone: "soft", text: `Your current load is ${firstLower(workload)}, and your response pattern is: ${firstLower(coping)}.` },
      { tone: "closing", text: `CLARA should help you move toward this: ${firstLower(goal)}.` },
    ],
    focus: goal,
    pressure,
    rhythm,
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

        <div class="clara-diagnosis-scroll">
          <p class="clara-diagnosis-kicker">WORKING STUDENT DIAGNOSIS</p>

          <div class="clara-diagnosis-core-card">
            <span>CLARA'S READ</span>
            <p>${escapeHtml(diagnosis.core)}</p>
          </div>

          <div class="clara-diagnosis-sections">
            <article>
              <span>What CLARA sees</span>
              ${renderLines(diagnosis.sees)}
            </article>
            <article>
              <span>Why this matters</span>
              ${renderLines(diagnosis.matters)}
            </article>
            <article>
              <span>What needs protection now</span>
              ${renderLines(diagnosis.protection)}
            </article>
          </div>

          <div class="clara-diagnosis-metrics">
            <div class="clara-diagnosis-metric">
              <span>Pressure to protect</span>
              <strong>${escapeHtml(diagnosis.pressure)}</strong>
            </div>
            <div class="clara-diagnosis-metric">
              <span>Money rhythm</span>
              <strong>${escapeHtml(diagnosis.rhythm)}</strong>
            </div>
            <div class="clara-diagnosis-metric clara-diagnosis-priority-metric">
              <span>CLARA priority</span>
              <strong>${escapeHtml(diagnosis.focus)}</strong>
            </div>
          </div>

          <button type="button" class="clara-diagnosis-continue">Continue to Me</button>
        </div>
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
      background: rgba(1, 8, 20, .82);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      animation: claraDiagnosisFade 220ms ease both;
      font-family: inherit;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-shell {
      position: relative;
      width: min(430px, 100vw);
      height: 100dvh;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: max(14px, env(safe-area-inset-top)) 14px max(14px, env(safe-area-inset-bottom));
      overflow: hidden;
      background: #020817;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-bg {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 12% 4%, rgba(45, 212, 191, .18), transparent 30%),
        radial-gradient(circle at 88% 10%, rgba(124, 58, 237, .30), transparent 34%),
        radial-gradient(circle at 50% 100%, rgba(56, 189, 248, .14), transparent 34%),
        linear-gradient(180deg, rgba(4, 16, 36, .96), rgba(3, 7, 24, .99));
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-card {
      position: relative;
      width: 100%;
      max-height: 100%;
      overflow: hidden;
      border-radius: 31px;
      border: 1px solid rgba(165, 243, 252, .14);
      background: linear-gradient(145deg, rgba(9, 29, 55, .78), rgba(17, 21, 67, .80) 54%, rgba(48, 25, 104, .72));
      box-shadow: 0 28px 90px rgba(0, 0, 0, .50), 0 0 54px rgba(34, 211, 238, .10), inset 0 1px 0 rgba(255, 255, 255, .10);
      animation: claraDiagnosisRise 420ms cubic-bezier(.16,1,.3,1) both;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-card::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 14% 9%, rgba(125, 211, 252, .12), transparent 28%), linear-gradient(180deg, rgba(255,255,255,.045), transparent 38%);
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-scroll {
      position: relative;
      z-index: 1;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 22px 22px 18px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-scroll::-webkit-scrollbar { display: none; }

    #${DIAGNOSIS_ID} .clara-diagnosis-orb {
      position: absolute;
      pointer-events: none;
      border-radius: 9999px;
      filter: blur(28px);
      opacity: .55;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-orb-one { top: -26px; left: -34px; height: 116px; width: 138px; background: rgba(45, 212, 191, .18); }
    #${DIAGNOSIS_ID} .clara-diagnosis-orb-two { right: -40px; bottom: 54px; height: 150px; width: 150px; background: rgba(124, 58, 237, .22); }

    #${DIAGNOSIS_ID} .clara-diagnosis-kicker,
    #${DIAGNOSIS_ID} .clara-diagnosis-core-card span,
    #${DIAGNOSIS_ID} .clara-diagnosis-sections span,
    #${DIAGNOSIS_ID} .clara-diagnosis-metric span {
      display: block;
      color: rgba(186, 230, 253, .52);
      font-size: 8.5px;
      font-weight: 850;
      letter-spacing: .22em;
      text-transform: uppercase;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-kicker { margin: 0; }

    #${DIAGNOSIS_ID} .clara-diagnosis-core-card {
      margin: 18px 0 0;
      border: 1px solid rgba(165, 243, 252, .14);
      border-radius: 20px;
      background: radial-gradient(circle at 8% 10%, rgba(125, 211, 252, .13), transparent 34%), rgba(255, 255, 255, .04);
      padding: 13px 14px;
      box-shadow: 0 14px 32px rgba(0, 0, 0, .16), inset 0 1px 0 rgba(255, 255, 255, .07), 0 0 26px rgba(34, 211, 238, .07);
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-core-card p {
      margin: 7px 0 0;
      color: rgba(248, 253, 255, .94);
      font-size: clamp(13.4px, 3.45vw, 15px);
      font-weight: 750;
      line-height: 1.4;
      letter-spacing: -.016em;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-sections {
      display: grid;
      gap: 16px;
      margin: 21px 0 0;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-sections article,
    #${DIAGNOSIS_ID} .clara-diagnosis-lines {
      display: grid;
      gap: 6px;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-line {
      margin: 0;
      text-wrap: pretty;
      letter-spacing: -.011em;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-line-lead {
      color: rgba(248, 253, 255, .88);
      font-size: clamp(13px, 3.32vw, 14.4px);
      font-weight: 735;
      line-height: 1.44;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-line-soft {
      color: rgba(226, 236, 246, .72);
      font-size: clamp(12.6px, 3.18vw, 13.7px);
      font-weight: 545;
      line-height: 1.52;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-line-closing {
      color: rgba(241, 250, 255, .90);
      font-size: clamp(12.8px, 3.24vw, 14px);
      font-weight: 760;
      line-height: 1.48;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-metrics {
      display: grid;
      gap: 9px;
      margin-top: 23px;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-metric {
      border: 1px solid rgba(255, 255, 255, .07);
      border-radius: 17px;
      background: rgba(2, 8, 23, .24);
      padding: 12px 13px;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .04);
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-priority-metric {
      border-color: rgba(165, 243, 252, .12);
      background: radial-gradient(circle at 10% 50%, rgba(45, 212, 191, .10), transparent 42%), rgba(7, 18, 38, .34);
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-metric strong {
      display: block;
      margin-top: 6px;
      color: rgba(255, 255, 255, .88);
      font-size: clamp(12.2px, 3.1vw, 13.4px);
      font-weight: 760;
      line-height: 1.24;
      letter-spacing: -.012em;
    }

    #${DIAGNOSIS_ID} .clara-diagnosis-continue {
      width: 100%;
      min-height: 52px;
      margin-top: 18px;
      border: 1px solid rgba(255, 255, 255, .16);
      border-radius: 9999px;
      background: radial-gradient(circle at 18% 20%, rgba(255,255,255,.34), transparent 26%), linear-gradient(135deg, #5eead4, #7dd3fc 48%, #93c5fd);
      color: #06101f;
      font-size: 13.5px;
      font-weight: 860;
      cursor: pointer;
      box-shadow: 0 18px 42px rgba(45, 212, 191, .18), 0 0 34px rgba(125, 211, 252, .14), inset 0 1px 0 rgba(255, 255, 255, .38);
    }

    @keyframes claraDiagnosisFade { from { opacity: 0; } to { opacity: 1; } }
    @keyframes claraDiagnosisRise { from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(5px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }

    @media (max-height: 720px) {
      #${DIAGNOSIS_ID} .clara-diagnosis-shell { padding: 10px 12px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-card { border-radius: 27px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-scroll { padding: 17px 17px 14px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-core-card { margin-top: 15px; padding: 11px 12px; border-radius: 17px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-core-card p { font-size: 12.8px; line-height: 1.36; }
      #${DIAGNOSIS_ID} .clara-diagnosis-sections { margin-top: 15px; gap: 12px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-line-lead { font-size: 12.5px; line-height: 1.38; }
      #${DIAGNOSIS_ID} .clara-diagnosis-line-soft { font-size: 12px; line-height: 1.42; }
      #${DIAGNOSIS_ID} .clara-diagnosis-line-closing { font-size: 12.3px; line-height: 1.4; }
      #${DIAGNOSIS_ID} .clara-diagnosis-metrics { margin-top: 17px; gap: 8px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-metric { padding: 10px 11px; border-radius: 15px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-metric strong { font-size: 11.8px; }
      #${DIAGNOSIS_ID} .clara-diagnosis-continue { min-height: 47px; }
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
        showDiagnosisReveal(readProfile());
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
