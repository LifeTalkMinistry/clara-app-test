const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const DIAGNOSIS_ID = "clara-life-stage-diagnosis-reveal";

const COPY = {
  "Young Professional": ["Based on your answers, people in a similar early-career season often carry independence pressure, salary rhythm, lifestyle temptation, and future-building expectations all at once. The breakdown below shows what needs the most protection.", "Your independence setup is", "This usually means your money decisions are connected to rent, commute, food, social expectations, and the kind of adult life you are trying to build.", "Your salary rhythm is", "That kind of rhythm needs structure before small payday choices quietly become long-term lifestyle patterns.", "The goal is not to remove enjoyment. The goal is to make independence feel stable.", "The first area to protect is", "Your current work rhythm is", "your response pattern is", "The next step should move you toward this", "You do not need to perfect adulthood overnight. Start by protecting the rhythm that keeps your independence steady."],
  "Working Student": ["Based on your answers, people in a similar situation often carry school pressure, income limits, time demands, and emotional energy all at once. The breakdown below shows what needs the most protection.", "Your setup is", "This usually means money decisions are connected to class days, work days, rest, and the people depending on you.", "Your money rhythm is", "That kind of rhythm needs a plan that can handle changes, delays, and real-life pressure without making the week feel heavier.", "The goal is not a perfect budget. The goal is a steadier system.", "The first area to protect is", "Your current load is", "your response pattern is", "The next step should move you toward this", "You do not need to fix everything at once. Start by protecting the part of your week that keeps everything else steady."],
  "Living with Partner": ["Based on your answers, people in a similar shared-life setup often carry emotional expectations, shared bills, contribution pressure, and future planning decisions at the same time. The breakdown below shows what needs the most protection.", "Your shared setup is", "This usually means money decisions are no longer only personal. They are connected to fairness, communication, routines, and how both people feel supported.", "Your shared money rhythm is", "That kind of rhythm needs clear agreements so bills, comfort spending, and future plans do not quietly become emotional pressure.", "The goal is not control over each other. The goal is a calmer shared money rhythm.", "The first area to protect is", "Your current relationship-money load is", "your shared response pattern is", "The next step should move the relationship toward this", "Shared money becomes lighter when the rules are clear. Start with the part that protects peace, fairness, and trust."],
  "Family Household": ["Based on your answers, people in a similar household season often carry family needs, contribution pressure, personal boundaries, and unexpected requests all at once. The breakdown below shows what needs the most protection.", "Your household setup is", "This usually means money decisions are connected to food, bills, family requests, emergencies, and the emotional weight of helping.", "Your household money rhythm is", "That kind of rhythm needs boundaries and buffers because family needs can interrupt even a careful personal plan.", "The goal is not to stop helping. The goal is to help without losing your own stability.", "The first area to protect is", "Your current household load is", "your response pattern is", "The next step should move you toward this", "You can care for people without carrying everything alone. Start by protecting the boundary that keeps your support sustainable."],
  "Single Parent": ["Based on your answers, people in a similar parenting season often carry child-centered essentials, time pressure, emotional fatigue, and emergency responsibility all at once. The breakdown below shows what needs the most protection.", "Your parenting setup is", "This usually means money decisions are connected to daily essentials, school needs, health costs, time, and the safety of your child.", "Your support and money rhythm is", "That kind of rhythm needs protection because one unexpected cost can affect the whole week quickly.", "The goal is not perfection. The goal is a safer rhythm for you and your child.", "The first area to protect is", "Your current care load is", "your response pattern is", "The next step should move you toward this", "You do not need to solve every pressure today. Start by protecting the essentials that keep you and your child steady."],
  "Full-Time Earner": ["Based on your answers, people in a similar full-time earning season often carry salary rhythm, routine fatigue, family support, and lifestyle pressure all at once. The breakdown below shows what needs the most protection.", "Your earning setup is", "This usually means money decisions are connected to cutoff cycles, work fatigue, responsibilities, convenience spending, and the desire to feel rewarded.", "Your income rhythm is", "That kind of rhythm needs clear rules because stable income can still feel tight when small leaks repeat every cutoff.", "The goal is not strict restriction. The goal is a routine that protects your salary before it disappears.", "The first area to protect is", "Your current work load is", "your response pattern is", "The next step should move you toward this", "Stable income becomes powerful when it has direction. Start by protecting the rhythm that repeats every payday."],
  "Freelance Season": ["Based on your answers, people in a similar freelance or gig season often carry income uncertainty, client pressure, dry-month risk, and flexible-but-unstable routines all at once. The breakdown below shows what needs the most protection.", "Your freelance setup is", "This usually means money decisions are connected to client flow, payment timing, workload boundaries, rest, and how prepared you are for slower periods.", "Your income rhythm is", "That kind of rhythm needs buffers because expenses can stay fixed even when projects and payments move.", "The goal is not to remove flexibility. The goal is to make flexibility financially safer.", "The first area to protect is", "Your current work load is", "your response pattern is", "The next step should move you toward this", "Freedom feels better when the slow weeks are protected. Start by building the buffer that keeps your work rhythm safe."],
  "Business Builder": ["Based on your answers, people in a similar business-building season often carry sales uncertainty, reinvestment pressure, operating costs, and personal-business money tension all at once. The breakdown below shows what needs the most protection.", "Your business setup is", "This usually means money decisions are connected to sales cycles, operating costs, reinvestment choices, customer pressure, and personal financial safety.", "Your business cash rhythm is", "That kind of rhythm needs separation because growth pressure can make personal money and business money blur quickly.", "The goal is not just growth. The goal is sustainable growth that does not break your personal stability.", "The first area to protect is", "Your current builder load is", "your response pattern is", "The next step should move the business toward this", "Building something takes pressure. Start by protecting the system that keeps growth, cash flow, and your personal life from mixing too much."]
};

const ALIASES = { "Young Earner": "Young Professional", "Fresh Graduate": "Young Professional", Breadwinner: "Family Household", "OFW Family": "Family Household", "Unemployed Adult": "Family Household", "First-Time Parent": "Single Parent", "Freelance / Gig Worker": "Freelance Season", Freelancer: "Freelance Season" };
const clean = (v) => String(v || "").replace(/\s+/g, " ").trim();
const lower = (v) => { const t = clean(v); return t ? t[0].toLowerCase() + t.slice(1) : ""; };
const safe = (v) => clean(v).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));

function readProfile() {
  try {
    return JSON.parse(localStorage.getItem(LIFE_STAGE_KEY) || "{}") || {};
  } catch {
    return {};
  }
}

function keyFor(stage) {
  const k = ALIASES[clean(stage)] || clean(stage);
  return COPY[k] ? k : "Young Professional";
}

function build(profile) {
  const c = COPY[keyFor(profile.stage)];
  const setup = clean(profile.setup) || "current setup";
  const rhythm = clean(profile.rhythm) || "current money rhythm";
  const workload = clean(profile.workload) || "current life load";
  const pressure = clean(profile.pressure).replace(/\bTution\b/gi, "Tuition") || "current financial pressure";
  const coping = clean(profile.coping) || "current response pattern";
  const goal = clean(profile.goal) || "protect stability";

  return {
    stage: keyFor(profile.stage),
    setup,
    rhythm,
    workload,
    pressure,
    coping,
    goal,
    core: c[0].replace("The breakdown below shows what needs the most protection.", "Here is what CLARA understood first."),
    sees: [`${c[1]} ${lower(setup)}.`, c[2]],
    matters: [`${c[3]} ${lower(rhythm)}.`, c[4], c[5]],
    protection: [`${c[6]} ${lower(pressure)}.`, `${c[7]} ${lower(workload)}, and ${c[8]}: ${lower(coping)}.`, `${c[9]}: ${lower(goal)}.`],
    landing: c[10],
  };
}

function titleFromResponse(coping) {
  const value = clean(coping).toLowerCase();
  if (value.includes("reward") || value.includes("comfort") || value.includes("convenience") || value.includes("small")) return "This may be how you recover.";
  if (value.includes("avoid")) return "Avoiding the numbers may be the signal.";
  if (value.includes("borrow") || value.includes("delay") || value.includes("debt")) return "Pressure may be carrying over.";
  if (value.includes("cut")) return "Over-sacrifice may need protection.";
  return "Your response pattern matters.";
}

function compactPressureLine(d) {
  if (d.stage === "Working Student") return "School, money, time, and emotional energy are overlapping in the same week.";
  if (d.stage === "Single Parent") return "Care, essentials, time, and emergency pressure are all competing for safety.";
  if (d.stage === "Business Builder") return "Growth, cash flow, decisions, and personal stability are moving at the same time.";
  if (d.stage === "Freelance Season") return "Income timing, client flow, rest, and dry-week protection are all connected.";
  if (d.stage === "Living with Partner") return "Money decisions are now connected to fairness, routines, emotion, and trust.";
  if (d.stage === "Family Household") return "Home needs, support pressure, boundaries, and personal stability are overlapping.";
  if (d.stage === "Full-Time Earner") return "Salary rhythm, fatigue, responsibilities, and reward spending can repeat quietly.";
  return "Independence, salary rhythm, lifestyle pressure, and future plans are forming together.";
}

function buildSlides(profile) {
  const d = build(profile);
  const pressureChips = [d.setup, d.rhythm, d.workload, d.pressure].filter(Boolean).slice(0, 4);
  const primaryProtection = d.protection[0] || "Start with the area most likely to break your rhythm first.";
  const mainMeterLabel = d.pressure || "Protection priority";

  return [
    {
      eyebrow: "CLARA Life Snapshot",
      title: "CLARA read your situation.",
      body: "Not a score. Not a judgment. Just the first pattern CLARA noticed from your answers.",
      supporting: d.stage,
      kind: "opening",
    },
    {
      eyebrow: "Pressure mix",
      title: "It is not just about money.",
      body: compactPressureLine(d),
      chips: pressureChips,
      kind: "chips",
    },
    {
      eyebrow: "Money rhythm",
      title: d.stage === "Working Student" ? "Your rhythm is stretched." : "Your rhythm needs protection.",
      body: d.matters[0] || `Your rhythm is ${lower(d.rhythm)}.`,
      supporting: "The goal is not a perfect budget. The goal is steady control.",
      kind: "rhythm",
    },
    {
      eyebrow: "Hidden trigger",
      title: titleFromResponse(d.coping),
      body: `Your load is ${lower(d.workload)}. Your response pattern is ${lower(d.coping)}.`,
      supporting: "That means spending may be connected to pressure, not weakness.",
      kind: "trigger",
    },
    {
      eyebrow: "Protection priority",
      title: "Protect this first.",
      body: primaryProtection,
      supporting: `Next direction: ${lower(d.goal)}.`,
      meterLabel: mainMeterLabel,
      kind: "meter",
    },
    {
      eyebrow: "Next best move",
      title: "Start with one protected decision.",
      body: d.landing,
      supporting: "Small protection first. Bigger control later.",
      kind: "final",
    },
  ];
}

function chipHtml(items = []) {
  return items.map((item, index) => `<span class="story-chip chip-${index + 1}">${safe(item)}</span>`).join("");
}

function slideVisual(slide, index, total) {
  if (slide.kind === "chips") {
    return `<div class="chip-grid">${chipHtml(slide.chips)}</div>`;
  }

  if (slide.kind === "rhythm") {
    return `<div class="rhythm-visual" aria-hidden="true"><span></span><span></span><span></span><small>steady control</small></div>`;
  }

  if (slide.kind === "trigger") {
    return `<div class="pulse-visual" aria-hidden="true"><span></span><span></span><span></span><strong>pressure response</strong></div>`;
  }

  if (slide.kind === "meter") {
    return `<div class="protection-meter"><div><p>Protection focus</p><strong>${safe(slide.meterLabel)}</strong></div><span>1st</span></div>`;
  }

  if (slide.kind === "final") {
    return `<div class="final-orb"><span>✓</span><small>protected start</small></div>`;
  }

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
  let oldOverflow = "";

  const el = document.createElement("div");
  el.id = DIAGNOSIS_ID;
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
    #${DIAGNOSIS_ID} { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgba(1,8,20,.86); backdrop-filter: blur(18px); font-family: inherit; color: white; }
    #${DIAGNOSIS_ID} .story-shell { position: relative; width: min(430px, 100vw); height: 100svh; padding: max(10px, env(safe-area-inset-top)) 12px max(18px, calc(env(safe-area-inset-bottom) + 14px)); overflow: hidden; background: radial-gradient(circle at 18% 0%, rgba(45,212,191,.14), transparent 30%), radial-gradient(circle at 100% 18%, rgba(124,58,237,.20), transparent 34%), linear-gradient(180deg, #030816, #06051f 52%, #020817); }
    #${DIAGNOSIS_ID} .story-panel { position: relative; height: 100%; overflow: hidden; display: grid; grid-template-rows: auto minmax(0,1fr) auto; gap: 12px; border-radius: 34px; border: 1px solid rgba(165,243,252,.15); padding: 14px 18px 16px; background: radial-gradient(circle at 10% 4%, rgba(94,234,212,.18), transparent 30%), radial-gradient(circle at 90% 92%, rgba(124,58,237,.24), transparent 34%), linear-gradient(145deg, rgba(8,28,55,.86), rgba(15,18,66,.88) 53%, rgba(45,22,100,.80)); box-shadow: 0 30px 92px rgba(0,0,0,.55), 0 0 48px rgba(34,211,238,.08), inset 0 1px 0 rgba(255,255,255,.08); }
    #${DIAGNOSIS_ID} .story-panel:before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,.05), transparent 32%), radial-gradient(circle at 50% 0%, rgba(125,211,252,.08), transparent 42%); }
    #${DIAGNOSIS_ID} .progress-bars { position: relative; z-index: 4; display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 5px; padding: 2px 1px 0; }
    #${DIAGNOSIS_ID} .progress-track { height: 3px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.035); }
    #${DIAGNOSIS_ID} .progress-track i { display: block; height: 100%; width: 0%; border-radius: inherit; background: linear-gradient(90deg, rgba(103,232,249,.96), rgba(147,197,253,.92), rgba(196,181,253,.96)); box-shadow: 0 0 18px rgba(125,211,252,.34); transition: width .28s ease; }
    #${DIAGNOSIS_ID} .story-stage { position: relative; z-index: 2; min-height: 0; display: grid; align-items: center; overflow: hidden; }
    #${DIAGNOSIS_ID} .story-card { position: relative; min-height: min(640px, calc(100svh - 130px)); height: 100%; display: flex; flex-direction: column; justify-content: center; gap: clamp(13px, 2.35svh, 22px); overflow: hidden; border-radius: 28px; border: 1px solid rgba(255,255,255,.085); padding: clamp(22px, 5.5svh, 34px) clamp(18px, 5vw, 24px); background: radial-gradient(circle at 18% 12%, rgba(125,211,252,.12), transparent 33%), radial-gradient(circle at 88% 88%, rgba(168,85,247,.16), transparent 38%), rgba(3,10,31,.34); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 18px 54px rgba(2,8,23,.20); animation: claraStoryIn .22s ease-out; }
    #${DIAGNOSIS_ID} .story-card:before { content: ""; position: absolute; inset: auto -20% -30% auto; width: 70%; height: 48%; border-radius: 999px; background: radial-gradient(circle, rgba(125,211,252,.12), transparent 66%); filter: blur(6px); pointer-events: none; }
    #${DIAGNOSIS_ID} .story-card[data-kind="opening"], #${DIAGNOSIS_ID} .story-card[data-kind="final"] { text-align: left; justify-content: center; }
    #${DIAGNOSIS_ID} .story-card[data-kind="chips"] { justify-content: flex-start; padding-top: clamp(72px, 13svh, 104px); }
    #${DIAGNOSIS_ID} .story-card[data-kind="rhythm"] { justify-content: space-between; }
    #${DIAGNOSIS_ID} .story-card[data-kind="trigger"] { justify-content: center; background: radial-gradient(circle at 20% 14%, rgba(196,181,253,.14), transparent 34%), radial-gradient(circle at 88% 84%, rgba(45,212,191,.10), transparent 40%), rgba(3,10,31,.34); }
    #${DIAGNOSIS_ID} .story-card[data-kind="meter"] { justify-content: space-around; }
    #${DIAGNOSIS_ID} .eyebrow { position: relative; z-index: 1; margin: 0; color: rgba(186,230,253,.70); font-size: 10px; font-weight: 950; letter-spacing: .24em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} h1 { position: relative; z-index: 1; margin: 0; max-width: 340px; font-size: clamp(34px, 11vw, 48px); line-height: .94; letter-spacing: -.055em; font-weight: 950; text-shadow: 0 12px 34px rgba(0,0,0,.32); }
    #${DIAGNOSIS_ID} .story-body { position: relative; z-index: 1; margin: 0; max-width: 340px; color: rgba(248,253,255,.84); font-size: clamp(14px, 3.65vw, 16px); line-height: 1.46; font-weight: 760; }
    #${DIAGNOSIS_ID} .supporting { position: relative; z-index: 1; margin: -4px 0 0; max-width: 320px; color: rgba(186,230,253,.62); font-size: clamp(12px, 3.1vw, 13.5px); line-height: 1.42; font-weight: 760; }
    #${DIAGNOSIS_ID} .chip-grid { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 9px; margin-top: 4px; }
    #${DIAGNOSIS_ID} .story-chip { max-width: 100%; border-radius: 999px; border: 1px solid rgba(165,243,252,.16); background: rgba(255,255,255,.055); padding: 10px 13px; color: rgba(240,253,255,.88); font-size: 11px; line-height: 1.2; font-weight: 900; box-shadow: 0 10px 24px rgba(2,8,23,.16), inset 0 1px 0 rgba(255,255,255,.05); }
    #${DIAGNOSIS_ID} .chip-2, #${DIAGNOSIS_ID} .chip-4 { background: rgba(196,181,253,.075); border-color: rgba(196,181,253,.16); }
    #${DIAGNOSIS_ID} .story-orb { position: relative; z-index: 1; margin-top: 8px; display: grid; place-items: center; align-self: flex-end; width: clamp(104px, 29vw, 132px); height: clamp(104px, 29vw, 132px); border-radius: 999px; border: 1px solid rgba(165,243,252,.18); background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.18), transparent 28%), radial-gradient(circle at 50% 56%, rgba(103,232,249,.16), rgba(124,58,237,.14)); box-shadow: 0 0 44px rgba(34,211,238,.12), inset 0 1px 0 rgba(255,255,255,.08); }
    #${DIAGNOSIS_ID} .story-orb span { font-size: 36px; line-height: 1; font-weight: 950; }
    #${DIAGNOSIS_ID} .story-orb small { margin-top: -18px; color: rgba(224,242,254,.56); font-size: 10px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .rhythm-visual { position: relative; z-index: 1; display: grid; gap: 10px; width: min(310px, 100%); margin-top: auto; padding: 18px; border-radius: 25px; border: 1px solid rgba(125,211,252,.13); background: linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.022)); box-shadow: inset 0 1px 0 rgba(255,255,255,.055), 0 18px 48px rgba(2,8,23,.18); }
    #${DIAGNOSIS_ID} .rhythm-visual span { display: block; height: 9px; border-radius: 999px; background: linear-gradient(90deg, rgba(103,232,249,.95), rgba(165,180,252,.28)); box-shadow: 0 0 24px rgba(125,211,252,.16); }
    #${DIAGNOSIS_ID} .rhythm-visual span:nth-child(2) { width: 78%; opacity: .72; }
    #${DIAGNOSIS_ID} .rhythm-visual span:nth-child(3) { width: 55%; opacity: .48; }
    #${DIAGNOSIS_ID} .rhythm-visual small { color: rgba(186,230,253,.55); font-size: 10px; font-weight: 950; letter-spacing: .18em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .pulse-visual { position: relative; z-index: 1; align-self: center; display: grid; place-items: center; width: 150px; height: 150px; margin-top: 12px; }
    #${DIAGNOSIS_ID} .pulse-visual span { position: absolute; inset: 0; border-radius: 999px; border: 1px solid rgba(196,181,253,.22); background: radial-gradient(circle, rgba(196,181,253,.16), transparent 58%); box-shadow: 0 0 34px rgba(168,85,247,.11); }
    #${DIAGNOSIS_ID} .pulse-visual span:nth-child(2) { inset: 18px; opacity: .74; }
    #${DIAGNOSIS_ID} .pulse-visual span:nth-child(3) { inset: 38px; opacity: .55; }
    #${DIAGNOSIS_ID} .pulse-visual strong { position: relative; max-width: 90px; text-align: center; color: rgba(224,242,254,.68); font-size: 10px; line-height: 1.3; font-weight: 950; letter-spacing: .12em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .protection-meter { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-radius: 24px; border: 1px solid rgba(153,246,228,.16); background: radial-gradient(circle at 8% 0%, rgba(45,212,191,.14), transparent 40%), rgba(255,255,255,.045); padding: 15px; box-shadow: 0 18px 44px rgba(2,8,23,.18), 0 0 38px rgba(45,212,191,.08); }
    #${DIAGNOSIS_ID} .protection-meter p { margin: 0; color: rgba(153,246,228,.68); font-size: 10px; font-weight: 950; letter-spacing: .18em; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .protection-meter strong { display: block; margin-top: 6px; color: rgba(248,253,255,.92); font-size: 15px; line-height: 1.2; font-weight: 950; }
    #${DIAGNOSIS_ID} .protection-meter span { display: grid; place-items: center; flex: 0 0 auto; width: 68px; height: 68px; border-radius: 999px; background: linear-gradient(135deg, rgba(103,232,249,.95), rgba(165,180,252,.95)); color: #06101f; font-size: 20px; font-weight: 950; box-shadow: 0 16px 34px rgba(45,212,191,.18); }
    #${DIAGNOSIS_ID} .final-orb { position: relative; z-index: 1; display: grid; place-items: center; align-self: center; width: 132px; height: 132px; border-radius: 999px; border: 1px solid rgba(165,243,252,.18); background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.24), transparent 28%), linear-gradient(135deg, rgba(103,232,249,.22), rgba(124,58,237,.18)); box-shadow: 0 0 54px rgba(34,211,238,.15), inset 0 1px 0 rgba(255,255,255,.08); }
    #${DIAGNOSIS_ID} .final-orb span { margin-top: 4px; font-size: 42px; line-height: 1; font-weight: 950; color: rgba(224,242,254,.95); }
    #${DIAGNOSIS_ID} .final-orb small { max-width: 78px; margin-top: -12px; text-align: center; color: rgba(224,242,254,.56); font-size: 9px; font-weight: 950; letter-spacing: .12em; line-height: 1.25; text-transform: uppercase; }
    #${DIAGNOSIS_ID} .tap-zone { position: absolute; z-index: 3; top: 44px; bottom: 86px; width: 34%; }
    #${DIAGNOSIS_ID} .tap-left { left: 0; }
    #${DIAGNOSIS_ID} .tap-right { right: 0; }
    #${DIAGNOSIS_ID} .story-footer { position: relative; z-index: 5; display: flex; gap: 10px; }
    #${DIAGNOSIS_ID} button { font-family: inherit; border: 0; cursor: pointer; }
    #${DIAGNOSIS_ID} .back-button, #${DIAGNOSIS_ID} .next-button { min-height: 48px; border-radius: 999px; font-size: 13px; font-weight: 950; transition: transform .12s ease, opacity .12s ease; }
    #${DIAGNOSIS_ID} .back-button { width: 34%; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.045); color: rgba(240,253,255,.72); }
    #${DIAGNOSIS_ID} .back-button[disabled] { opacity: 0; pointer-events: none; }
    #${DIAGNOSIS_ID} .next-button { flex: 1; border: 1px solid rgba(255,255,255,.18); background: radial-gradient(circle at 18% 18%, rgba(255,255,255,.34), transparent 25%), linear-gradient(135deg, #67e8f9, #7dd3fc 46%, #a5b4fc); color: #06101f; box-shadow: 0 16px 34px rgba(45,212,191,.18), 0 0 30px rgba(125,211,252,.12), inset 0 1px 0 rgba(255,255,255,.38); }
    #${DIAGNOSIS_ID} button:active { transform: scale(.98); }
    @keyframes claraStoryIn { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media (max-height: 720px) { #${DIAGNOSIS_ID} .story-panel { gap: 8px; padding: 12px 15px 13px; border-radius: 29px; } #${DIAGNOSIS_ID} .story-card { min-height: calc(100svh - 112px); border-radius: 24px; padding: 18px 16px; gap: 10px; } #${DIAGNOSIS_ID} .story-card[data-kind="chips"] { padding-top: 46px; } #${DIAGNOSIS_ID} h1 { font-size: clamp(30px, 9.5vw, 40px); } #${DIAGNOSIS_ID} .story-body { font-size: 12.5px; line-height: 1.35; } #${DIAGNOSIS_ID} .supporting { font-size: 11.5px; } #${DIAGNOSIS_ID} .story-orb { width: 92px; height: 92px; } #${DIAGNOSIS_ID} .pulse-visual { width: 118px; height: 118px; } #${DIAGNOSIS_ID} .final-orb { width: 104px; height: 104px; } #${DIAGNOSIS_ID} .story-footer button { min-height: 42px; } }
  `;

  el.appendChild(style);
  document.body.appendChild(el);
  oldOverflow = document.body.style.overflow;
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
    stage.innerHTML = renderSlide(slides[activeIndex], activeIndex, slides.length);
    el.querySelectorAll("[data-progress]").forEach((bar) => {
      const index = Number(bar.getAttribute("data-progress"));
      bar.style.width = index < activeIndex ? "100%" : index === activeIndex ? "74%" : "0%";
    });
    backButton.disabled = activeIndex === 0;
    nextButton.textContent = activeIndex === slides.length - 1 ? "Continue to Me" : "Next";
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
