import { buildLivingWithPartnerReveal } from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerRevealEngine";
import { LIVING_WITH_PARTNER_STAGE_KEY } from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";

const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const DIAGNOSIS_ID = "clara-life-stage-diagnosis-reveal";
const LIVING_REVEAL_ID = "clara-living-with-partner-reveal";

const REACTION_LABELS = {
  opening: "Yeah… show me what you noticed.",
  chips: "That actually feels true.",
  distribution: "Show me the pressure split.",
  strongestSignal: "What does that mean?",
  commonPattern: "Okay… keep going.",
  final: "Bring me back to Me",
};

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
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

function isLivingWithPartner(profile = readProfile()) {
  return clean(profile.stage) === LIVING_WITH_PARTNER_STAGE_KEY;
}

function chipHtml(items = []) {
  return items.map((item, index) => `<span class="story-chip chip-${index + 1}">${safe(item)}</span>`).join("");
}

function visual(slide, index, total) {
  if (slide.kind === "chips") return `<div class="chip-grid">${chipHtml(slide.chips || [])}</div>`;
  if (slide.kind === "distribution") return `<div class="distribution-box"><p>Current split</p><strong>${safe(slide.body)}</strong></div>`;
  if (slide.kind === "strongestSignal") return `<div class="signal-orb"><span>${index + 1}</span><small>strongest</small></div>`;
  if (slide.kind === "commonPattern") return `<div class="pulse-visual"><span></span><span></span><span></span><strong>quiet pattern</strong></div>`;
  if (slide.kind === "final") return `<div class="final-orb"><span>✓</span><small>shared clarity</small></div>`;
  return `<div class="story-orb"><span>${index + 1}</span><small>of ${total}</small></div>`;
}

function renderSlide(slide, index, total) {
  return `
    <div class="story-card" data-kind="${safe(slide.kind)}">
      <p class="eyebrow">${safe(slide.eyebrow)}</p>
      <h1>${safe(slide.title)}</h1>
      <p class="story-body">${safe(slide.kind === "distribution" ? slide.supporting : slide.body)}</p>
      ${slide.kind !== "distribution" && slide.supporting ? `<p class="supporting">${safe(slide.supporting)}</p>` : ""}
      ${visual(slide, index, total)}
    </div>
  `;
}

function showLivingReveal(profile = readProfile()) {
  if (!isLivingWithPartner(profile)) return;

  document.getElementById(DIAGNOSIS_ID)?.remove();
  document.getElementById(LIVING_REVEAL_ID)?.remove();

  const slides = buildLivingWithPartnerReveal(profile);
  let activeIndex = 0;
  let startX = 0;
  const oldOverflow = document.body.style.overflow;

  const el = document.createElement("div");
  el.id = LIVING_REVEAL_ID;
  el.innerHTML = `
    <section class="story-shell" aria-label="CLARA Living with Partner Snapshot">
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
    #${LIVING_REVEAL_ID}, #${LIVING_REVEAL_ID} * { box-sizing: border-box; }
    #${LIVING_REVEAL_ID} { position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; background: rgba(1,8,20,.86); backdrop-filter: blur(18px); font-family: inherit; color: white; -webkit-font-smoothing: antialiased; text-rendering: geometricPrecision; }
    #${LIVING_REVEAL_ID} .story-shell { position: relative; width: min(430px, 100vw); height: 100svh; padding: max(10px, env(safe-area-inset-top)) 12px max(18px, calc(env(safe-area-inset-bottom) + 14px)); overflow: hidden; background: radial-gradient(circle at 18% 0%, rgba(45,212,191,.14), transparent 30%), radial-gradient(circle at 100% 18%, rgba(124,58,237,.20), transparent 34%), linear-gradient(180deg, #030816, #06051f 52%, #020817); }
    #${LIVING_REVEAL_ID} .story-panel { position: relative; height: 100%; overflow: hidden; display: grid; grid-template-rows: auto minmax(0,1fr) auto; gap: 12px; border-radius: 34px; border: 1px solid rgba(165,243,252,.15); padding: 14px 18px 16px; background: radial-gradient(circle at 10% 4%, rgba(94,234,212,.18), transparent 30%), radial-gradient(circle at 90% 92%, rgba(124,58,237,.24), transparent 34%), linear-gradient(145deg, rgba(8,28,55,.86), rgba(15,18,66,.88) 53%, rgba(45,22,100,.80)); box-shadow: 0 30px 92px rgba(0,0,0,.55), 0 0 48px rgba(34,211,238,.08), inset 0 1px 0 rgba(255,255,255,.08); }
    #${LIVING_REVEAL_ID} .progress-bars { position: relative; z-index: 4; display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 5px; padding: 2px 1px 0; }
    #${LIVING_REVEAL_ID} .progress-track { height: 3px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.11); }
    #${LIVING_REVEAL_ID} .progress-track i { display: block; height: 100%; width: 0%; border-radius: inherit; background: linear-gradient(90deg, rgba(103,232,249,.96), rgba(147,197,253,.92), rgba(196,181,253,.96)); box-shadow: 0 0 18px rgba(125,211,252,.30); transition: width .28s ease; }
    #${LIVING_REVEAL_ID} .story-stage { position: relative; z-index: 2; min-height: 0; display: grid; align-items: center; overflow: hidden; }
    #${LIVING_REVEAL_ID} .story-card { position: relative; min-height: min(640px, calc(100svh - 130px)); height: 100%; display: flex; flex-direction: column; justify-content: center; gap: clamp(12px, 2.05svh, 20px); overflow: hidden; border-radius: 28px; border: 1px solid rgba(255,255,255,.085); padding: clamp(24px, 5.6svh, 38px) clamp(18px, 5vw, 24px); background: radial-gradient(circle at 18% 12%, rgba(125,211,252,.12), transparent 33%), radial-gradient(circle at 88% 88%, rgba(168,85,247,.16), transparent 38%), rgba(3,10,31,.34); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 18px 54px rgba(2,8,23,.20); animation: claraStoryIn .22s ease-out; }
    #${LIVING_REVEAL_ID} .story-card[data-kind="chips"] { justify-content: flex-start; padding-top: clamp(70px, 12.5svh, 100px); }
    #${LIVING_REVEAL_ID} .eyebrow, #${LIVING_REVEAL_ID} h1, #${LIVING_REVEAL_ID} .story-body, #${LIVING_REVEAL_ID} .supporting { position: relative; z-index: 1; margin: 0; }
    #${LIVING_REVEAL_ID} .eyebrow { color: rgba(186,230,253,.66); font-size: 9.4px; font-weight: 760; letter-spacing: .19em; text-transform: uppercase; }
    #${LIVING_REVEAL_ID} h1 { max-width: 315px; font-size: clamp(29px, 8.9vw, 39px); line-height: 1.045; letter-spacing: -.038em; font-weight: 780; text-shadow: 0 10px 30px rgba(0,0,0,.30); }
    #${LIVING_REVEAL_ID} .story-body { max-width: 315px; color: rgba(248,253,255,.76); font-size: clamp(13.2px, 3.35vw, 14.6px); line-height: 1.55; font-weight: 560; letter-spacing: -.006em; }
    #${LIVING_REVEAL_ID} .supporting { margin-top: -2px; max-width: 300px; color: rgba(186,230,253,.62); font-size: clamp(11.8px, 2.95vw, 13px); line-height: 1.45; font-weight: 620; letter-spacing: -.004em; }
    #${LIVING_REVEAL_ID} .chip-grid { position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 9px; margin-top: 5px; }
    #${LIVING_REVEAL_ID} .story-chip { max-width: 100%; border-radius: 999px; border: 1px solid rgba(165,243,252,.14); background: rgba(255,255,255,.05); padding: 9px 12px; color: rgba(240,253,255,.82); font-size: 10.8px; line-height: 1.2; font-weight: 680; letter-spacing: -.01em; }
    #${LIVING_REVEAL_ID} .distribution-box { position: relative; z-index: 1; padding: 16px; border-radius: 24px; border: 1px solid rgba(165,243,252,.14); background: rgba(255,255,255,.055); box-shadow: inset 0 1px 0 rgba(255,255,255,.06), 0 18px 44px rgba(2,8,23,.16); }
    #${LIVING_REVEAL_ID} .distribution-box p { margin: 0 0 7px; color: rgba(165,243,252,.70); font-size: 9px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
    #${LIVING_REVEAL_ID} .distribution-box strong { display: block; color: rgba(248,253,255,.86); font-size: 12px; line-height: 1.6; font-weight: 680; }
    #${LIVING_REVEAL_ID} .story-orb, #${LIVING_REVEAL_ID} .signal-orb, #${LIVING_REVEAL_ID} .final-orb { position: relative; z-index: 1; display: grid; place-items: center; align-self: center; width: 132px; height: 132px; border-radius: 999px; border: 1px solid rgba(165,243,252,.16); background: radial-gradient(circle at 32% 26%, rgba(255,255,255,.16), transparent 28%), radial-gradient(circle at 50% 56%, rgba(103,232,249,.14), rgba(124,58,237,.13)); box-shadow: 0 0 44px rgba(34,211,238,.10), inset 0 1px 0 rgba(255,255,255,.07); }
    #${LIVING_REVEAL_ID} .story-orb span, #${LIVING_REVEAL_ID} .signal-orb span, #${LIVING_REVEAL_ID} .final-orb span { font-size: 34px; line-height: 1; font-weight: 760; }
    #${LIVING_REVEAL_ID} .story-orb small, #${LIVING_REVEAL_ID} .signal-orb small, #${LIVING_REVEAL_ID} .final-orb small { margin-top: -18px; color: rgba(224,242,254,.54); font-size: 9px; font-weight: 680; letter-spacing: .12em; text-transform: uppercase; }
    #${LIVING_REVEAL_ID} .pulse-visual { position: relative; z-index: 1; align-self: center; display: grid; place-items: center; width: 150px; height: 150px; margin-top: 12px; }
    #${LIVING_REVEAL_ID} .pulse-visual span { position: absolute; inset: 0; border-radius: 999px; border: 1px solid rgba(196,181,253,.20); background: radial-gradient(circle, rgba(196,181,253,.14), transparent 58%); }
    #${LIVING_REVEAL_ID} .pulse-visual span:nth-child(2) { inset: 18px; opacity: .74; }
    #${LIVING_REVEAL_ID} .pulse-visual span:nth-child(3) { inset: 38px; opacity: .55; }
    #${LIVING_REVEAL_ID} .pulse-visual strong { position: relative; max-width: 90px; text-align: center; color: rgba(186,230,253,.54); font-size: 9px; font-weight: 720; letter-spacing: .14em; line-height: 1.3; text-transform: uppercase; }
    #${LIVING_REVEAL_ID} .tap-zone { position: absolute; z-index: 3; top: 44px; bottom: 86px; width: 34%; }
    #${LIVING_REVEAL_ID} .tap-left { left: 0; } #${LIVING_REVEAL_ID} .tap-right { right: 0; }
    #${LIVING_REVEAL_ID} .story-footer { position: relative; z-index: 5; display: flex; gap: 10px; }
    #${LIVING_REVEAL_ID} button { font-family: inherit; border: 0; cursor: pointer; }
    #${LIVING_REVEAL_ID} .back-button, #${LIVING_REVEAL_ID} .next-button { min-height: 48px; border-radius: 999px; font-size: 12px; line-height: 1.18; font-weight: 760; letter-spacing: -.012em; transition: transform .12s ease, opacity .12s ease; }
    #${LIVING_REVEAL_ID} .back-button { width: 31%; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.045); color: rgba(240,253,255,.66); }
    #${LIVING_REVEAL_ID} .back-button[disabled] { opacity: 0; pointer-events: none; }
    #${LIVING_REVEAL_ID} .next-button { flex: 1; padding: 0 18px; border: 1px solid rgba(255,255,255,.18); background: linear-gradient(135deg, #67e8f9, #7dd3fc 46%, #a5b4fc); color: #06101f; box-shadow: 0 16px 34px rgba(45,212,191,.16), inset 0 1px 0 rgba(255,255,255,.34); }
    #${LIVING_REVEAL_ID} button:active { transform: scale(.98); }
    @keyframes claraStoryIn { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @media (max-height: 720px) { #${LIVING_REVEAL_ID} .story-panel { gap: 8px; padding: 12px 15px 13px; border-radius: 29px; } #${LIVING_REVEAL_ID} .story-card { min-height: calc(100svh - 112px); border-radius: 24px; padding: 18px 16px; gap: 10px; } #${LIVING_REVEAL_ID} .story-card[data-kind="chips"] { padding-top: 46px; } #${LIVING_REVEAL_ID} h1 { font-size: clamp(26px, 8.3vw, 34px); line-height: 1.06; } #${LIVING_REVEAL_ID} .story-body { font-size: 12.4px; line-height: 1.42; } #${LIVING_REVEAL_ID} .supporting { font-size: 11.4px; } #${LIVING_REVEAL_ID} .story-orb, #${LIVING_REVEAL_ID} .signal-orb, #${LIVING_REVEAL_ID} .final-orb { width: 104px; height: 104px; } #${LIVING_REVEAL_ID} .pulse-visual { width: 118px; height: 118px; } #${LIVING_REVEAL_ID} .story-footer button { min-height: 42px; font-size: 11px; } }
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
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__CLARA_LIVING_WITH_PARTNER_REVEAL__) return;
  window.__CLARA_LIVING_WITH_PARTNER_REVEAL__ = true;

  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("button");
    if (!button || !/apply stage/i.test(clean(button.innerText || button.textContent))) return;
    window.setTimeout(() => {
      const profile = readProfile();
      if (isLivingWithPartner(profile)) showLivingReveal(profile);
    }, 130);
  }, true);
}

try {
  install();
} catch (error) {
  console.warn("CLARA Living with Partner reveal failed:", error);
}
