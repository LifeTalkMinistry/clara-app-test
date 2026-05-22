import {
  WORKING_STUDENT_STAGE_KEY,
  getWorkingStudentDisplayLabel,
  getWorkingStudentQuestionContext,
  getWorkingStudentSnapshot,
} from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const DIAGNOSIS_ID = "clara-life-stage-diagnosis-reveal";

const STAGE_COPY = {
  "Working Student": {
    openingTitle: "You’re carrying a lot at once.",
    openingBody: "I can see why money may feel tied to school, work, rest, and pressure right now.",
    pressureTitle: "It’s not just spending.",
    pressure: "It looks like school, money, time, and emotional energy are all sharing the same week.",
    rhythmTitle: "Your week feels stretched.",
    rhythmBody: "Money may be moving around class days, work days, tired days, and the days you still need to feel okay.",
    landing: "You do not need to fix everything at once. Start by protecting the part of your week that keeps everything else steady.",
  },
  "Young Professional": {
    openingTitle: "You’re trying to stand on your own.",
    openingBody: "I can see independence, pressure, and future-building all showing up in your answers.",
    pressureTitle: "It’s not just adulting.",
    pressure: "Independence, salary rhythm, lifestyle pressure, and future plans are all asking for attention.",
    rhythmTitle: "Your salary needs breathing room.",
    rhythmBody: "Money may feel stable on paper, but small choices can quietly carry the weight of independence.",
    landing: "You do not need to perfect adulthood overnight. Start by protecting the rhythm that keeps your independence steady.",
  },
  "Living with Partner": {
    openingTitle: "You’re not deciding alone anymore.",
    openingBody: "I can see how money may now carry emotion, fairness, timing, and trust.",
    pressureTitle: "It’s not just bills.",
    pressure: "Money decisions are now connected to fairness, routines, emotion, and how safe both people feel.",
    rhythmTitle: "Your shared rhythm needs care.",
    rhythmBody: "A small money issue can feel bigger when it touches peace, trust, or expectations at home.",
    landing: "Shared money becomes lighter when the rules are clear. Start with the part that protects peace, fairness, and trust.",
  },
  "Family Household": {
    openingTitle: "You’re holding more than your own needs.",
    openingBody: "I can see support, responsibility, and personal stability all pulling on the same budget.",
    pressureTitle: "It’s not just household costs.",
    pressure: "Home needs, support pressure, boundaries, and personal stability are overlapping.",
    rhythmTitle: "Your support needs limits too.",
    rhythmBody: "Helping can feel loving, but without boundaries it can quietly drain the part of you that needs to stay steady.",
    landing: "You can care for people without carrying everything alone. Start by protecting the boundary that keeps your support sustainable.",
  },
  "Single Parent": {
    openingTitle: "You’re protecting more than money.",
    openingBody: "I can see safety, care, time, and emotional strength behind your answers.",
    pressureTitle: "It’s not just expenses.",
    pressure: "Care, essentials, time, and emergency pressure are all competing for safety.",
    rhythmTitle: "Your safety rhythm needs care.",
    rhythmBody: "One unexpected cost can feel heavier when your week is already built around protecting someone else.",
    landing: "You do not need to solve every pressure today. Start by protecting the essentials that keep you and your child steady.",
  },
  "Full-Time Earner": {
    openingTitle: "You’re steady, but still stretched.",
    openingBody: "I can see routine, responsibility, tiredness, and reward pressure moving together.",
    pressureTitle: "It’s not just payday.",
    pressure: "Salary rhythm, fatigue, responsibilities, and reward spending can repeat quietly.",
    rhythmTitle: "Your salary needs direction.",
    rhythmBody: "Even stable income can feel smaller when exhaustion and repeated small choices keep showing up.",
    landing: "Stable income becomes powerful when it has direction. Start by protecting the rhythm that repeats every payday.",
  },
  "Freelance Season": {
    openingTitle: "You’re building stability without a fixed rhythm.",
    openingBody: "I can see freedom, uncertainty, effort, and dry-week pressure in the same season.",
    pressureTitle: "It’s not just irregular income.",
    pressure: "Income timing, client flow, rest, and dry-week protection are all connected.",
    rhythmTitle: "Your flexible rhythm needs safety.",
    rhythmBody: "Freedom feels better when your slow days, late payments, and quiet weeks do not threaten your basics.",
    landing: "Freedom feels better when the slow weeks are protected. Start by building the buffer that keeps your work rhythm safe.",
  },
  "Business Builder": {
    openingTitle: "You’re trying to grow without losing yourself.",
    openingBody: "I can see ambition, cash pressure, reinvestment, and personal safety all moving together.",
    pressureTitle: "It’s not just business growth.",
    pressure: "Growth, cash flow, decisions, and personal stability are moving at the same time.",
    rhythmTitle: "Your builder rhythm needs separation.",
    rhythmBody: "Growth can feel exciting, but it gets heavy when business money and personal safety start blending together.",
    landing: "Building something takes pressure. Start by protecting the system that keeps growth, cash flow, and your personal life from mixing too much.",
  },
};

const ALIASES = {
  "Young Earner": "Young Professional",
  "Fresh Graduate": "Young Professional",
  Breadwinner: "Family Household",
  "OFW Family": "Family Household",
  "Unemployed Adult": "Family Household",
  "First-Time Parent": "Single Parent",
  "Freelance / Gig Worker": "Freelance Season",
  Freelancer: "Freelance Season",
};

const REACTION_LABELS = {
  opening: "Yeah… show me what you noticed.",
  chips: "That actually feels true.",
  rhythm: "Okay… keep going.",
  trigger: "Hmm… I needed to hear that.",
  meter: "Let’s protect that first.",
  final: "Bring me back to Me",
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const lower = (value) => {
  const text = clean(value);
  return text ? text[0].toLowerCase() + text.slice(1) : "";
};
const safe = (value) =>
  clean(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[char]));

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function stageKey(stage) {
  const next = ALIASES[clean(stage)] || clean(stage);
  return STAGE_COPY[next] ? next : "Young Professional";
}

function isWorkingStudentProfile(profile) {
  return clean(profile?.stage) === WORKING_STUDENT_STAGE_KEY;
}

function buildInsightChips(profile, copy) {
  const chips = [];
  const setup = clean(profile.setup).toLowerCase();
  const rhythm = clean(profile.rhythm).toLowerCase();
  const workload = clean(profile.workload).toLowerCase();
  const pressure = clean(profile.pressure).toLowerCase();

  if (setup.includes("supported") || setup.includes("allowance")) chips.push("You’re trying to earn while still depending on support.");
  if (rhythm.includes("part-time") || rhythm.includes("extra") || rhythm.includes("irregular")) chips.push("Your income helps, but it may not always feel steady.");
  if (workload.includes("inconsistent") || workload.includes("manageable") || workload.includes("heavy")) chips.push("Some weeks feel under control. Some weeks feel heavier than expected.");
  if (pressure.includes("school") || pressure.includes("fare") || pressure.includes("food")) chips.push("Daily essentials are quietly carrying most of the pressure.");

  if (!chips.length) {
    chips.push(copy.pressure);
    chips.push("The real issue is the rhythm underneath the expenses.");
    chips.push("CLARA is looking for the part that needs protection first.");
  }

  return chips.slice(0, 3);
}

function titleFromResponse(coping) {
  const value = clean(coping).toLowerCase();
  if (value.includes("reward") || value.includes("comfort") || value.includes("convenience") || value.includes("small")) return "Maybe this is your breathing room.";
  if (value.includes("avoid")) return "Maybe the numbers feel hard to face.";
  if (value.includes("borrow") || value.includes("delay") || value.includes("debt")) return "Some pressure may be carrying over.";
  if (value.includes("cut")) return "You may be sacrificing too much.";
  return "Your response makes sense.";
}

function triggerBody(coping) {
  const value = clean(coping) || "the way you respond when things feel heavy";
  return `When life feels full, ${lower(value)} may be your way of trying to stay okay.`;
}

function canonicalContext(key, value, profile) {
  return getWorkingStudentQuestionContext(key, value, profile);
}

function display(value) {
  return getWorkingStudentDisplayLabel(value) || clean(value);
}

function buildWorkingStudentSlides(profile) {
  const snapshot = getWorkingStudentSnapshot(profile);
  const indicators = Array.isArray(snapshot.indicators) ? snapshot.indicators : [];
  const topSignal = indicators[0] || { label: "Working Student pressure", value: 100, note: snapshot.overview || snapshot.caption };
  const secondSignal = indicators[1];
  const thirdSignal = indicators[2];
  const setupContext = canonicalContext("setup", profile.setup, profile);
  const rhythmContext = canonicalContext("rhythm", profile.rhythm, profile);
  const pressureContext = canonicalContext("pressure", profile.pressure, profile);
  const copingContext = canonicalContext("coping", profile.coping, profile);
  const goalContext = canonicalContext("goal", profile.goal, profile);
  const workload = display(profile.workload || "your weekly load");
  const pressure = display(profile.pressure || topSignal.label);
  const goal = display(profile.goal || snapshot.recommendations?.[0] || "protect stability");
  const recommendations = Array.isArray(snapshot.recommendations) ? snapshot.recommendations.slice(0, 3).join(" • ") : "Start with one protected move this week.";

  return [
    {
      kind: "opening",
      eyebrow: "Current Working Student path",
      title: setupContext.title || display(profile.setup),
      body: setupContext.summary || snapshot.hero || snapshot.caption,
      supporting: snapshot.supportTitle || "CLARA is reading your selected Working Student path.",
    },
    {
      kind: "chips",
      eyebrow: "Money rhythm",
      title: rhythmContext.title || "Your income rhythm matters.",
      body: rhythmContext.summary || "CLARA is connecting how money arrives with the pressure your week carries.",
      supporting: snapshot.title,
      chips: [
        display(profile.setup),
        display(profile.rhythm),
        secondSignal ? `${secondSignal.label}: ${secondSignal.value}%` : snapshot.title,
      ].filter(Boolean),
    },
    {
      kind: "rhythm",
      eyebrow: "Weekly pressure",
      title: pressureContext.title || "The week has pressure points.",
      body: `With ${lower(workload)}, ${lower(pressure)} becomes part of the same weekly money pattern.`,
      supporting: pressureContext.summary || snapshot.overview,
    },
    {
      kind: "trigger",
      eyebrow: "Behavior response",
      title: copingContext.title || titleFromResponse(profile.coping),
      body: copingContext.summary || triggerBody(profile.coping),
      supporting: "CLARA is reading this as a pressure response, not a character flaw.",
    },
    {
      kind: "meter",
      eyebrow: "Life Stage Trend Snapshot",
      title: `${topSignal.label}: ${topSignal.value}%`,
      body: topSignal.note || snapshot.overview || snapshot.caption,
      supporting: thirdSignal ? `${thirdSignal.label} also appears at ${thirdSignal.value}%. This is a 100% pressure split of the detected pattern.` : "This is a 100% pressure split of the detected pattern.",
      meterLabel: `${topSignal.label} • ${topSignal.value}%`,
    },
    {
      kind: "final",
      eyebrow: "Protection direction",
      title: goalContext.title || "Start with protection.",
      body: goalContext.summary || `Protecting this moves you closer to ${lower(goal)}.`,
      supporting: recommendations || "One protected decision is enough to begin.",
    },
  ];
}

function buildSlides(profile) {
  if (isWorkingStudentProfile(profile)) return buildWorkingStudentSlides(profile);

  const stage = stageKey(profile.stage);
  const copy = STAGE_COPY[stage];
  const pressure = clean(profile.pressure).replace(/\bTution\b/gi, "Tuition") || "current financial pressure";
  const coping = clean(profile.coping) || "current response pattern";
  const goal = clean(profile.goal) || "protect stability";

  return [
    {
      kind: "opening",
      eyebrow: "CLARA Life Snapshot",
      title: copy.openingTitle,
      body: copy.openingBody,
      supporting: "I’m not judging it. I’m trying to understand it with you.",
    },
    {
      kind: "chips",
      eyebrow: "What’s underneath",
      title: copy.pressureTitle,
      body: copy.pressure,
      chips: buildInsightChips(profile, copy),
    },
    {
      kind: "rhythm",
      eyebrow: "Your rhythm",
      title: copy.rhythmTitle,
      body: copy.rhythmBody,
      supporting: "So the plan has to feel realistic, not strict.",
    },
    {
      kind: "trigger",
      eyebrow: "The softer truth",
      title: titleFromResponse(coping),
      body: triggerBody(coping),
      supporting: "That is not weakness. It is a signal worth listening to.",
    },
    {
      kind: "meter",
      eyebrow: "First protection",
      title: "Let’s protect the part that breaks first.",
      body: `Right now, ${lower(pressure)} needs the most care.`,
      supporting: `Protecting this moves you closer to ${lower(goal)}.`,
      meterLabel: pressure,
    },
    {
      kind: "final",
      eyebrow: "Next small step",
      title: "Start small. Stay steady.",
      body: copy.landing,
      supporting: "One protected decision is enough to begin.",
    },
  ];
}

function chipHtml(items = []) {
  return items.map((item, index) => `<span class="story-chip chip-${index + 1}">${safe(item)}</span>`).join("");
}

function slideVisual(slide, index, total) {
  if (slide.kind === "chips") return `<div class="chip-grid">${chipHtml(slide.chips)}</div>`;
  if (slide.kind === "rhythm") return `<div class="rhythm-visual" aria-hidden="true"><span></span><span></span><span></span><small>steady control</small></div>`;
  if (slide.kind === "trigger") return `<div class="pulse-visual" aria-hidden="true"><span></span><span></span><span></span><strong>pressure response</strong></div>`;
  if (slide.kind === "meter") return `<div class="protection-meter"><div><p>Protection focus</p><strong>${safe(slide.meterLabel)}</strong></div><span>1st</span></div>`;
  if (slide.kind === "final") return `<div class="final-orb"><span>✓</span><small>protected start</small></div>`;
  return `<div class="story-orb"><span>${index + 1}</span><small>of ${total}</small></div>`;
}

function renderSlide(slide, index, total) {
  return `
    <div class="story-card" data-kind="${safe(slide.kind)}">
      <p class="eyebrow">${safe(slide.eyebrow)}</p>
      <h1>${safe(slide.title)}</h1>
      <p class="story-body">${safe(slide.body)}</p>
      ${slide.supporting ? `<p class="supporting">${safe(slide.supporting)}</p>` : ""}
      ${slideVisual(slide, index, total)}
    </div>
  `;
}

function show(profile) {
  if (!profile?.stage) return;
  document.getElementById(DIAGNOSIS_ID)?.remove();

  const slides = buildSlides(profile);
  let activeIndex = 0;
  let startX = 0;
  const oldOverflow = document.body.style.overflow;

  const el = document.createElement("div");
  el.id = DIAGNOSIS_ID;
  if (isWorkingStudentProfile(profile)) el.dataset.canonicalWorkingStudent = "true";
  el.innerHTML = `
    <section class="story-shell" aria-label="CLARA Life Snapshot story">
      <div class="story-panel">
        <div class="progress-bars" aria-hidden="true">
          ${slides.map((_, index) => `<span class="progress-track"><i data-progress="${index}"></i></span>`).join("")}
        </div>
        <div class="story-stage" role="group" aria-live="polite"></div>
        <div class="tap-zone tap-left" aria-hidden="true"></div>
        <div class="tap-zone tap-right" aria-hidden="true"></div>
        <div class="story-footer">
          <button type="button" class="back-button">Back</button>
          <button type="button" class="next-button">Next</button>
        </div>
      </div>
    </section>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #${DIAGNOSIS_ID}, #${DIAGNOSIS_ID} * { box-sizing: border-box; }
    #${DIAGNOSIS_ID} { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgba(1,8,20,.86); backdrop-filter: blur(18px); font-family: inherit; color: white; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }
    #${DIAGNOSIS_ID} .story-shell { position: relative; width: min(430px, 100vw); height: 100svh; padding: max(10px, env(safe-area-inset-top)) 12px max(18px, calc(env(safe-area-inset-bottom) + 14px)); overflow: hidden; background: radial-gradient(circle at 18% 0%, rgba(45,212,191,.14), transparent 30%), radial-gradient(circle at 100% 18%, rgba(124,58,237,.20), transparent 34%), linear-gradient(180deg, #030816, #06051f 52%, #020817); }
    #${DIAGNOSIS_ID} .story-panel { position: relative; height: 100%; overflow: hidden; display: grid; grid-template-rows: auto minmax(0,1fr) auto; gap: 12px; border-radius: 34px; border: 1px solid rgba(165,243,252,.15); padding: 14px 18px 16px; background: radial-gradient(circle at 10% 4%, rgba(94,234,212,.18), transparent 30%), radial-gradient(circle at 90% 92%, rgba(124,58,237,.24), transparent 34%), linear-gradient(145deg, rgba(8,28,55,.86), rgba(15,18,66,.88) 53%, rgba(45,22,100,.80)); box-shadow: 0 30px 92px rgba(0,0,0,.55), 0 0 48px rgba(34,211,238,.08), inset 0 1px 0 rgba(255,255,255,.08); }
    #${DIAGNOSIS_ID} .story-panel:before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,.05), transparent 32%), radial-gradient(circle at 50% 0%, rgba(125,211,252,.08), transparent 42%); }
    #${DIAGNOSIS_ID} .progress-bars { position: relative; z-index: 4; display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 5px; padding: 2px 1px 0; }
    #${DIAGNOSIS_ID} .progress-track { height: 3px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.11); box-shadow: inset 0 0 0 1px rgba(255,255,255,.035); }
    #${DIAGNOSIS_ID} .progress-track i { display: block; height: 100%; width: 0%; border-radius: inherit; background: linear-gradient(90deg, rgba(103,232,249,.96), rgba(147,197,253,.92), rgba(196,181,253,.96)); box-shadow: 0 0 18px rgba(125,211,252,.30); transition: width .28s ease; }
    #${DIAGNOSIS_ID} .story-stage { position: relative; z-index: 2; min-height: 0; display: grid; align-items: center; overflow: hidden; }
    #${DIAGNOSIS_ID} .story-card { position: relative; min-height: min(640px, calc(100svh - 130px)); height: 100%; display: flex; flex-direction: column; justify-content: center; gap: clamp(12px, 2.05svh, 20px); overflow: hidden; border-radius: 28px; border: 1px solid rgba(255,255,255,.085); padding: clamp(24px, 5.6svh, 38px) clamp(18px, 5vw, 24px); background: radial-gradient(circle at 18% 12%, rgba(125,211,252,.12), transparent 33%), radial-gradient(circle at 88% 88%, rgba(168,85,247,.16), transparent 38%), rgba(3,10,31,.34); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 18px 54px rgba(2,8,23,.20); animation: claraStoryIn .22s ease-out; }
    #${DIAGNOSIS_ID} .story-card:before { content: ""; position: absolute; inset: auto -20% -30% auto; width: 70%; height: 48%; border-radius: 999px; background: radial-gradient(circle, rgba(125,211,252,.12), transparent 66%); filter: blur(6px); pointer-events: none; }
    #${DIAGNOSIS_ID} .story-card[data-kind="chips"] { justify-content: flex-start; padding-top: clamp(70px, 12.5svh, 100px); }
    #${DIAGNOSIS_ID} .story-card[data-kind="rhythm"] { justify-content: space-between; }
    #${DIAGNOSIS_ID} .story-card[data-kind="trigger"] { background: radial-gradient(circle at 20% 14%, rgba(196,181,253,.14), transparent 34%), radial-gradient(circle at 88% 84%, rgba(45,212,191,.10), transparent 40%), rgba(3,10,31,.34); }
    #${DIAGNOSIS_ID} .story-card[data-kind="meter"] { justify-content: space-around; }
    #${DIAGNOSIS_ID} .eyebrow, #${DIAGNOSIS_ID} h1, #${DIAGNOSIS_ID} .story-body, #${DIAGNOSIS_ID} .supporting { position: relative; z-index: 1; margin: 0; }
    #${DIAGNOSIS_ID} .eyebrow { color: rgba(186,230,253,.66); font-size: 9.4px; font-weight: 760; letter-spacing: .19em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} h1 { max-width: 315px; font-size: clamp(29px, 8.9vw, 39px); line-height: 1.045; letter-spacing: -.038em; font-weight: 780; text-shadow: 0 10px 30px rgba(0,0,0,.30); }
    #${DIAGNOSIS_ID} .story-body { max-width: 315px; color: rgba(248,253,255,.76); font-size: clamp(13.2px, 3.35vw, 14.6px); line-height: 1.55; font-weight: 560; letter-spacing: -.006em; }
    #${DIAGNOSIS_ID} .supporting { margin-top: -2px; max-width: 300px; color: rgba(186,230,253,.62); font-size: clamp(11.8px, 2.95vw, 13px); line-height: 1.45; font-weight: 620; letter-spacing: -.004em; }
    #${DIAGNOSIS_ID} .chip-grid { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 9px; margin-top: 5px; }
    #${DIAGNOSIS_ID} .story-chip { max-width: 100%; border-radius: 999px; border: 1px solid rgba(165,243,252,.14); background: rgba(255,255,255,.05); padding: 9px 12px; color: rgba(240,253,255,.82); font-size: 10.8px; line-height: 1.2; font-weight: 680; letter-spacing: -.01em; box-shadow: 0 10px 24px rgba(2,8,23,.14), inset 0 1px 0 rgba(255,255,255,.045); }
    #${DIAGNOSIS_ID} .chip-2, #${DIAGNOSIS_ID} .chip-4 { background: rgba(196,181,253,.07); border-color: rgba(196,181,253,.14); }
    #${DIAGNOSIS_ID} .story-orb { position: relative; z-index: 1; margin-top: 8px; display: grid; place-items: center; align-self: flex-end; width: clamp(104px, 29vw, 132px); height: clamp(104px, 29vw, 132px); border-radius: 999px; border: 1px solid rgba(165,243,252,.16); background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.16), transparent 28%), radial-gradient(circle at 50% 56%, rgba(103,232,249,.14), rgba(124,58,237,.13)); box-shadow: 0 0 44px rgba(34,211,238,.10), inset 0 1px 0 rgba(255,255,255,.07); }
    #${DIAGNOSIS_ID} .story-orb span { font-size: 34px; line-height: 1; font-weight: 760; }
    #${DIAGNOSIS_ID} .story-orb small { margin-top: -18px; color: rgba(224,242,254,.54); font-size: 9px; font-weight: 680; letter-spacing: .12em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .rhythm-visual { position: relative; z-index: 1; display: grid; gap: 10px; width: min(310px, 100%); margin-top: auto; padding: 18px; border-radius: 25px; border: 1px solid rgba(125,211,252,.13); background: linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.022)); box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 18px 48px rgba(2,8,23,.18); }
    #${DIAGNOSIS_ID} .rhythm-visual span { display: block; height: 9px; border-radius: 999px; background: linear-gradient(90deg, rgba(103,232,249,.88), rgba(165,180,252,.24)); box-shadow: 0 0 24px rgba(125,211,252,.14); }
    #${DIAGNOSIS_ID} .rhythm-visual span:nth-child(2) { width: 78%; opacity: .72; }
    #${DIAGNOSIS_ID} .rhythm-visual span:nth-child(3) { width: 55%; opacity: .48; }
    #${DIAGNOSIS_ID} .rhythm-visual small, #${DIAGNOSIS_ID} .pulse-visual strong { color: rgba(186,230,253,.54); font-size: 9px; font-weight: 720; letter-spacing: .14em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .pulse-visual { position: relative; z-index: 1; align-self: center; display: grid; place-items: center; width: 150px; height: 150px; margin-top: 12px; }
    #${DIAGNOSIS_ID} .pulse-visual span { position: absolute; inset: 0; border-radius: 999px; border: 1px solid rgba(196,181,253,.20); background: radial-gradient(circle, rgba(196,181,253,.14), transparent 58%); box-shadow: 0 0 34px rgba(168,85,247,.10); }
    #${DIAGNOSIS_ID} .pulse-visual span:nth-child(2) { inset: 18px; opacity: .74; }
    #${DIAGNOSIS_ID} .pulse-visual span:nth-child(3) { inset: 38px; opacity: .55; }
    #${DIAGNOSIS_ID} .pulse-visual strong { position: relative; max-width: 90px; text-align: center; line-height: 1.3; }
    #${DIAGNOSIS_ID} .protection-meter { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-radius: 24px; border: 1px solid rgba(153,246,228,.14); background: radial-gradient(circle at 8% 0%, rgba(45,212,191,.12), transparent 40%), rgba(255,255,255,.04); padding: 15px; box-shadow: 0 18px 44px rgba(2,8,23,.16), 0 0 38px rgba(45,212,191,.06); }
    #${DIAGNOSIS_ID} .protection-meter p { margin: 0; color: rgba(153,246,228,.66); font-size: 9px; font-weight: 720; letter-spacing: .16em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .protection-meter strong { display: block; margin-top: 6px; color: rgba(248,253,255,.86); font-size: 14px; line-height: 1.22; font-weight: 680; letter-spacing: -.01em; }
    #${DIAGNOSIS_ID} .protection-meter span { display: grid; place-items: center; flex: 0 0 auto; width: 68px; height: 68px; border-radius: 999px; background: linear-gradient(135deg, rgba(103,232,249,.92), rgba(165,180,252,.92)); color: #06101f; font-size: 18px; font-weight: 780; box-shadow: 0 16px 34px rgba(45,212,191,.16); }
    #${DIAGNOSIS_ID} .final-orb { position: relative; z-index: 1; display: grid; place-items: center; align-self: center; width: 132px; height: 132px; border-radius: 999px; border: 1px solid rgba(165,243,252,.16); background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.22), transparent 28%), linear-gradient(135deg, rgba(103,232,249,.20), rgba(124,58,237,.16)); box-shadow: 0 0 54px rgba(34,211,238,.12), inset 0 1px 0 rgba(255,255,255,.07); }
    #${DIAGNOSIS_ID} .final-orb span { margin-top: 4px; font-size: 40px; line-height: 1; font-weight: 720; color: rgba(224,242,254,.92); }
    #${DIAGNOSIS_ID} .final-orb small { max-width: 78px; margin-top: -12px; text-align: center; color: rgba(224,242,254,.54); font-size: 8.6px; font-weight: 700; letter-spacing: .11em; line-height: 1.25; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .tap-zone { position: absolute; z-index: 3; top: 44px; bottom: 86px; width: 34%; }
    #${DIAGNOSIS_ID} .tap-left { left: 0; }
    #${DIAGNOSIS_ID} .tap-right { right: 0; }
    #${DIAGNOSIS_ID} .story-footer { position: relative; z-index: 5; display: flex; gap: 10px; }
    #${DIAGNOSIS_ID} button { font-family: inherit; border: 0; cursor: pointer; }
    #${DIAGNOSIS_ID} .back-button, #${DIAGNOSIS_ID} .next-button { min-height: 48px; border-radius: 999px; font-size: 12px; line-height: 1.18; font-weight: 760; letter-spacing: -.012em; transition: transform .12s ease, opacity .12s ease; }
    #${DIAGNOSIS_ID} .back-button { width: 31%; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.045); color: rgba(240,253,255,.66); }
    #${DIAGNOSIS_ID} .back-button[disabled] { opacity: 0; pointer-events: none; }
    #${DIAGNOSIS_ID} .next-button { flex: 1; padding: 0 18px; border: 1px solid rgba(255,255,255,.18); background: radial-gradient(circle at 18% 18%, rgba(255,255,255,.30), transparent 25%), linear-gradient(135deg, #67e8f9, #7dd3fc 46%, #a5b4fc); color: #06101f; box-shadow: 0 16px 34px rgba(45,212,191,.16), 0 0 30px rgba(125,211,252,.10), inset 0 1px 0 rgba(255,255,255,.34); }
    #${DIAGNOSIS_ID} button:active { transform: scale(.98); }
    @keyframes claraStoryIn { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media (max-height: 720px) { #${DIAGNOSIS_ID} .story-panel { gap: 8px; padding: 12px 15px 13px; border-radius: 29px; } #${DIAGNOSIS_ID} .story-card { min-height: calc(100svh - 112px); border-radius: 24px; padding: 18px 16px; gap: 10px; } #${DIAGNOSIS_ID} .story-card[data-kind="chips"] { padding-top: 46px; } #${DIAGNOSIS_ID} h1 { font-size: clamp(26px, 8.3vw, 34px); line-height: 1.06; } #${DIAGNOSIS_ID} .story-body { font-size: 12.4px; line-height: 1.42; font-weight: 540; } #${DIAGNOSIS_ID} .supporting { font-size: 11.4px; } #${DIAGNOSIS_ID} .story-orb { width: 92px; height: 92px; } #${DIAGNOSIS_ID} .pulse-visual { width: 118px; height: 118px; } #${DIAGNOSIS_ID} .final-orb { width: 104px; height: 104px; } #${DIAGNOSIS_ID} .story-footer button { min-height: 42px; font-size: 11px; } }
  `;

  el.appendChild(style);
  document.body.appendChild(el);
  document.body.style.overflow = "hidden";

  const stage = el.querySelector(".story-stage");
  const backButton = el.querySelector(".back-button");
  const nextButton = el.querySelector(".next-button");
  const leftZone = el.querySelector(".tap-left");
  const rightZone = el.querySelector(".tap-right");

  const close = () => {
    const setupClose = document.querySelector('button[aria-label="Close life stage setup"]');
    if (setupClose) setupClose.click();
    el.remove();
    document.body.style.overflow = oldOverflow || "";
  };

  const render = () => {
    const slide = slides[activeIndex];
    stage.innerHTML = renderSlide(slide, activeIndex, slides.length);
    el.querySelectorAll("[data-progress]").forEach((bar) => {
      const index = Number(bar.getAttribute("data-progress"));
      bar.style.width = index < activeIndex ? "100%" : index === activeIndex ? "74%" : "0%";
    });
    backButton.disabled = activeIndex === 0;
    nextButton.textContent = REACTION_LABELS[slide.kind] || "Okay CLARA, continue.";
    nextButton.setAttribute("aria-label", nextButton.textContent);
  };

  const go = (direction) => {
    if (direction > 0 && activeIndex >= slides.length - 1) {
      close();
      return;
    }
    activeIndex = Math.max(0, Math.min(slides.length - 1, activeIndex + direction));
    render();
  };

  backButton.addEventListener("click", () => go(-1));
  nextButton.addEventListener("click", () => go(1));
  leftZone.addEventListener("click", () => go(-1));
  rightZone.addEventListener("click", () => go(1));
  el.addEventListener("pointerdown", (event) => { startX = event.clientX || 0; });
  el.addEventListener("pointerup", (event) => {
    const delta = (event.clientX || 0) - startX;
    if (Math.abs(delta) > 42) go(delta < 0 ? 1 : -1);
  });

  render();
}

function install() {
  if (typeof window === "undefined" || typeof document === "undefined" || window.__claraLifeStageDiagnosisRevealInstalled) return;
  window.__claraLifeStageDiagnosisRevealInstalled = true;
  let revealTimer = null;
  const reveal = (delay = 35) => {
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => show(readProfile()), delay);
  };

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (button && /apply stage/i.test(clean(button.innerText || button.textContent))) reveal(35);
  }, true);
}

try {
  install();
} catch (error) {
  console.warn("CLARA Life Stage diagnosis reveal failed:", error);
}
