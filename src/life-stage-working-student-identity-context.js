const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";
const IDENTITY_KEY = "clara_working_student_identity_context_v1";
const WORKING_STUDENT_STAGE = "Working Student";
const CARD_ID = "clara-working-student-identity-step";
const STYLE_ID = "clara-working-student-identity-style";
const LENS_MARKER = "\n\nIdentity lens: ";

const AGE_OPTIONS = ["15–17", "18–21", "22–25", "26–30", "31+"];
const GENDER_OPTIONS = ["Female", "Male", "Non-binary", "Prefer not to say"];
const WORKING_STUDENT_ROOT_HINTS = [
  "Mostly supported, trying to earn extra",
  "Working mainly to continue school",
  "Helping family while studying",
  "Trying to survive school mostly alone",
  "Balancing school, work, and exhaustion",
  "Building a future while financially unstable",
  "Trying to recover from constant financial pressure",
];

const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
const loud = (value) => clean(value).toUpperCase();
const isVisible = (node) => !!node && !!(node.offsetWidth || node.offsetHeight || node.getClientRects?.().length);
const isWorkingStudentProfile = (profile) => clean(profile?.stage) === WORKING_STUDENT_STAGE;

function safeJsonParse(value, fallback = {}) {
  try {
    return JSON.parse(value || "{}") || fallback;
  } catch {
    return fallback;
  }
}

function readProfile() {
  if (typeof window === "undefined") return {};
  return safeJsonParse(window.localStorage.getItem(LIFE_STAGE_KEY), {});
}

function readIdentity() {
  if (typeof window === "undefined") return {};
  const savedIdentity = safeJsonParse(window.localStorage.getItem(IDENTITY_KEY), {});
  const profile = readProfile();
  return {
    ageRange: clean(savedIdentity.ageRange || profile.ageRange),
    gender: clean(savedIdentity.gender || profile.gender),
    updatedAt: savedIdentity.updatedAt || profile.identityUpdatedAt || "",
  };
}

function saveIdentity(nextIdentity = {}) {
  if (typeof window === "undefined") return;
  const current = readIdentity();
  const identity = {
    ...current,
    ...nextIdentity,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));

  const profile = readProfile();
  if (isWorkingStudentProfile(profile)) {
    window.localStorage.setItem(
      LIFE_STAGE_KEY,
      JSON.stringify({
        ...profile,
        ageRange: identity.ageRange,
        gender: identity.gender,
        identityContextVersion: 1,
        identityUpdatedAt: identity.updatedAt,
        workingStudentIdentityContext: buildIdentityLens(identity),
        updatedAt: new Date().toISOString(),
      })
    );
  }
}

function hasIdentity(identity = readIdentity()) {
  return AGE_OPTIONS.includes(identity.ageRange) && GENDER_OPTIONS.includes(identity.gender);
}

function patchProfilePersistence() {
  if (typeof window === "undefined") return;
  if (window.__claraWorkingStudentIdentityStoragePatched) return;
  window.__claraWorkingStudentIdentityStoragePatched = true;

  const nativeSetItem = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (key, value) => {
    if (key !== LIFE_STAGE_KEY) {
      nativeSetItem(key, value);
      return;
    }

    const profile = safeJsonParse(value, null);
    const identity = readIdentity();
    if (profile && isWorkingStudentProfile(profile) && hasIdentity(identity)) {
      nativeSetItem(
        key,
        JSON.stringify({
          ...profile,
          ageRange: identity.ageRange,
          gender: identity.gender,
          identityContextVersion: 1,
          identityUpdatedAt: identity.updatedAt || new Date().toISOString(),
          workingStudentIdentityContext: buildIdentityLens(identity),
        })
      );
      return;
    }

    nativeSetItem(key, value);
  };
}

function buildAgeLens(ageRange) {
  const age = clean(ageRange);
  if (age === "15–17") return "this is an early responsibility season, so CLARA should keep the guidance gentle, basic, and protection-first";
  if (age === "18–21") return "this is an early-adulthood student season, so CLARA should read the answers as habit-building under school and work pressure";
  if (age === "22–25") return "this may sit between student life and adult independence, so CLARA should watch transition pressure, comparison, and stability-building";
  if (age === "26–30") return "this may carry more adult responsibility while still studying, so CLARA should watch delayed-stability pressure and heavier expectations";
  if (age === "31+") return "this may carry mature-student responsibility, so CLARA should read the answers with added awareness of time, family, and long-term stability pressure";
  return "CLARA should keep the interpretation centered on the user’s actual answers";
}

function buildGenderLens(gender) {
  const value = clean(gender);
  if (value === "Female") return "with added sensitivity to safety decisions, emotional load, and daily-pressure context without assuming stereotyped spending";
  if (value === "Male") return "with added sensitivity to provider pressure, image pressure, and hidden stress without assuming stereotyped behavior";
  if (value === "Non-binary") return "with added sensitivity to safety, belonging, and emotional energy without forcing gendered assumptions";
  return "without using gendered assumptions";
}

function buildIdentityLens(identity = readIdentity()) {
  if (!hasIdentity(identity)) return "Age and gender context are still missing, so CLARA should stay neutral and rely on the selected answers.";
  return `At ${identity.ageRange}, ${buildAgeLens(identity.ageRange)}, ${buildGenderLens(identity.gender)}.`;
}

function stripIdentityLens(text) {
  const value = String(text || "");
  const index = value.indexOf(LENS_MARKER);
  return index >= 0 ? value.slice(0, index).trim() : value.trim();
}

function ensureStyle() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${CARD_ID} { position: relative; overflow: hidden; border-radius: 26px; border: 1px solid rgba(165,243,252,.15); background: radial-gradient(circle at 12% 0%, rgba(45,212,191,.15), transparent 34%), radial-gradient(circle at 92% 16%, rgba(124,58,237,.20), transparent 36%), rgba(7,18,38,.72); padding: 18px; box-shadow: 0 18px 44px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.06); backdrop-filter: blur(18px); }
    #${CARD_ID}:before { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,.055), transparent 34%); }
    #${CARD_ID} .clara-ws-identity-inner { position: relative; z-index: 1; display: grid; gap: 14px; }
    #${CARD_ID} .clara-ws-identity-kicker { margin: 0; color: rgba(186,230,253,.52); font-size: 9px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
    #${CARD_ID} .clara-ws-identity-title { margin: 0; color: rgba(255,255,255,.96); font-size: 22px; line-height: 1.03; letter-spacing: -.04em; font-weight: 950; }
    #${CARD_ID} .clara-ws-identity-copy { margin: 0; color: rgba(255,255,255,.62); font-size: 12px; line-height: 1.55; font-weight: 650; }
    #${CARD_ID} .clara-ws-identity-group { display: grid; gap: 9px; }
    #${CARD_ID} .clara-ws-identity-label { color: rgba(186,230,253,.45); font-size: 9px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
    #${CARD_ID} .clara-ws-identity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    #${CARD_ID} .clara-ws-identity-option { min-height: 48px; border-radius: 17px; border: 1px solid rgba(255,255,255,.08); background: rgba(7,18,38,.58); color: rgba(255,255,255,.62); font-size: 12px; line-height: 1.12; font-weight: 900; cursor: pointer; box-shadow: inset 0 1px 0 rgba(255,255,255,.035); transition: transform 140ms ease, border-color 140ms ease, background 140ms ease, color 140ms ease; }
    #${CARD_ID} .clara-ws-identity-option:active { transform: scale(.985); }
    #${CARD_ID} .clara-ws-identity-option[data-active="true"] { border-color: rgba(165,243,252,.42); background: linear-gradient(135deg, rgba(45,212,191,.18), rgba(59,130,246,.12) 48%, rgba(91,63,209,.18)); color: rgba(240,253,255,.98); box-shadow: 0 0 26px rgba(34,211,238,.16), inset 0 1px 0 rgba(255,255,255,.08); }
    #${CARD_ID} .clara-ws-identity-note { margin: 0; border-radius: 18px; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.035); padding: 12px; color: rgba(255,255,255,.54); font-size: 11px; line-height: 1.45; font-weight: 700; }
    #${CARD_ID}.clara-ws-identity-attention { animation: claraWsIdentityPulse .28s ease; }
    .clara-ws-identity-lens { margin-top: 10px; border-radius: 18px; border: 1px solid rgba(165,243,252,.12); background: rgba(255,255,255,.04); padding: 10px 12px; color: rgba(224,242,254,.68); font-size: 10.8px; line-height: 1.44; font-weight: 720; }
    @keyframes claraWsIdentityPulse { 0%,100% { transform: translateX(0); } 35% { transform: translateX(-4px); } 70% { transform: translateX(4px); } }
  `;
  document.head.appendChild(style);
}

function getStageBoard() {
  const marker = Array.from(document.querySelectorAll("p")).find((node) => loud(node.textContent) === "CLARA CONTEXT BOARD");
  const header = marker?.closest("header");
  const title = header?.querySelector("h3");
  const summary = title?.nextElementSibling?.tagName === "P" ? title.nextElementSibling : null;
  return { header, title, summary };
}

function getActiveQuestionSection() {
  const labels = Array.from(document.querySelectorAll("section p"));
  for (const label of labels) {
    const section = label.closest("section");
    const buttons = Array.from(section?.querySelectorAll("button") || []);
    if (!section || !buttons.length || !isVisible(section)) continue;

    const buttonText = buttons.map((button) => clean(button.innerText || button.textContent));
    const isWorkingStudentSetup = buttonText.some((text) => WORKING_STUDENT_ROOT_HINTS.includes(text));
    const labelText = loud(label.textContent);
    if (isWorkingStudentSetup && ["CURRENT SETUP", "SETUP"].includes(labelText)) return { label, section, key: "setup" };
    if (["CURRENT SETUP", "MONEY RHYTHM", "WEEKLY LOAD", "PRESSURE RIGHT NOW", "WHEN PRESSURE HITS", "WHAT TO PROTECT"].includes(labelText)) {
      return { label, section, key: labelText };
    }
  }
  return null;
}

function renderIdentityCard() {
  const current = readIdentity();
  const ageButtons = AGE_OPTIONS.map((option) => `<button type="button" class="clara-ws-identity-option" data-clara-ws-field="ageRange" data-clara-ws-value="${option}" data-active="${current.ageRange === option}">${option}</button>`).join("");
  const genderButtons = GENDER_OPTIONS.map((option) => `<button type="button" class="clara-ws-identity-option" data-clara-ws-field="gender" data-clara-ws-value="${option}" data-active="${current.gender === option}">${option}</button>`).join("");

  return `
    <div class="clara-ws-identity-inner">
      <div>
        <p class="clara-ws-identity-kicker">Identity context</p>
        <h4 class="clara-ws-identity-title">Help CLARA read your Working Student season better.</h4>
        <p class="clara-ws-identity-copy">This stays lightweight. Age and gender will not stereotype you; they only adjust the summary tone, pressure reading, and coaching sensitivity.</p>
      </div>
      <div class="clara-ws-identity-group">
        <span class="clara-ws-identity-label">Age range</span>
        <div class="clara-ws-identity-grid">${ageButtons}</div>
      </div>
      <div class="clara-ws-identity-group">
        <span class="clara-ws-identity-label">Gender</span>
        <div class="clara-ws-identity-grid">${genderButtons}</div>
      </div>
      <p class="clara-ws-identity-note">CLARA will use this as a context layer only. Your actual answers still control the final reading.</p>
    </div>
  `;
}

function updateIdentityCardSelection(card) {
  if (!card) return;
  const identity = readIdentity();
  Array.from(card.querySelectorAll(".clara-ws-identity-option")).forEach((button) => {
    const field = button.dataset.claraWsField;
    const value = button.dataset.claraWsValue;
    button.dataset.active = String(identity[field] === value);
  });
}

function showIdentityStep(active) {
  ensureStyle();
  active.section.style.setProperty("display", "none", "important");
  active.section.dataset.claraIdentityHidden = "true";

  let card = document.getElementById(CARD_ID);
  if (!card) {
    card = document.createElement("section");
    card.id = CARD_ID;
    card.innerHTML = renderIdentityCard();
    active.section.insertAdjacentElement("beforebegin", card);
    card.addEventListener("click", (event) => {
      const button = event.target.closest("[data-clara-ws-field]");
      if (!button) return;
      saveIdentity({ [button.dataset.claraWsField]: button.dataset.claraWsValue });
      updateIdentityCardSelection(card);
      scheduleEnhance();
    });
  } else if (card.previousElementSibling !== active.section) {
    active.section.insertAdjacentElement("beforebegin", card);
  }

  card.style.removeProperty("display");
  updateIdentityCardSelection(card);

  const { title, summary } = getStageBoard();
  if (title) title.textContent = "Identity context first";
  if (summary) {
    summary.textContent = "Before CLARA reads your setup, add age and gender so the Working Student summary can adjust the emotional angle, responsibility level, and coaching tone without stereotyping you.";
    summary.style.setProperty("white-space", "normal", "important");
  }
}

function clearIdentityStep() {
  const card = document.getElementById(CARD_ID);
  if (card) card.style.setProperty("display", "none", "important");
  Array.from(document.querySelectorAll("[data-clara-identity-hidden='true']")).forEach((section) => {
    section.style.removeProperty("display");
    delete section.dataset.claraIdentityHidden;
  });
}

function shouldShowIdentityStep(active) {
  if (!active || active.key !== "setup") return false;
  const profile = readProfile();
  const identity = readIdentity();
  const setupSessionComplete = window.__claraWorkingStudentIdentityCompleteThisSetup === true;
  const isWorkingStudent = isWorkingStudentProfile(profile) || Array.from(active.section.querySelectorAll("button")).some((button) => WORKING_STUDENT_ROOT_HINTS.includes(clean(button.innerText || button.textContent)));
  return isWorkingStudent && !setupSessionComplete && !hasIdentity(identity);
}

function applyIdentityLensToBoard(active) {
  if (!active) return;
  const identity = readIdentity();
  if (!hasIdentity(identity)) return;

  const { summary } = getStageBoard();
  if (!summary) return;
  const base = stripIdentityLens(summary.textContent);
  const lens = buildIdentityLens(identity);
  const next = `${base}${LENS_MARKER}${lens}`;
  if (summary.textContent !== next) {
    summary.textContent = next;
    summary.style.setProperty("white-space", "pre-line", "important");
  }
}

function handleFooterContinue(event) {
  const button = event.target.closest("button");
  if (!button) return;
  const label = clean(button.innerText || button.textContent);
  if (label !== "Continue") return;

  const card = document.getElementById(CARD_ID);
  if (!card || card.style.display === "none") return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation?.();

  const identity = readIdentity();
  if (!hasIdentity(identity)) {
    card.classList.remove("clara-ws-identity-attention");
    void card.offsetWidth;
    card.classList.add("clara-ws-identity-attention");
    const { summary } = getStageBoard();
    if (summary) summary.textContent = "Choose your age range and gender first. This unlocks the more accurate Working Student interpretation before the behavioral questions begin.";
    return;
  }

  window.__claraWorkingStudentIdentityCompleteThisSetup = true;
  clearIdentityStep();
  scheduleEnhance();
}

function enhanceRevealStory() {
  const reveal = document.getElementById("clara-life-stage-diagnosis-reveal");
  if (!reveal || reveal.dataset.canonicalWorkingStudent !== "true") return;
  const identity = readIdentity();
  if (!hasIdentity(identity)) return;

  const card = reveal.querySelector(".story-card");
  if (!card) return;
  const signature = `${identity.ageRange}:${identity.gender}:${clean(card.textContent).slice(0, 90)}`;
  if (card.dataset.claraIdentityLens === signature) return;
  card.dataset.claraIdentityLens = signature;

  let lens = card.querySelector(".clara-ws-identity-lens");
  if (!lens) {
    lens = document.createElement("p");
    lens.className = "clara-ws-identity-lens";
    const supporting = card.querySelector(".supporting");
    if (supporting) supporting.insertAdjacentElement("afterend", lens);
    else card.appendChild(lens);
  }
  lens.textContent = `Age/gender context: ${buildIdentityLens(identity)}`;
}

function enhance() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  ensureStyle();
  const active = getActiveQuestionSection();

  if (shouldShowIdentityStep(active)) {
    showIdentityStep(active);
  } else {
    clearIdentityStep();
    applyIdentityLensToBoard(active);
  }

  enhanceRevealStory();
}

let scheduled = false;
function scheduleEnhance() {
  if (scheduled || typeof window === "undefined") return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    enhance();
  });
}

function installWorkingStudentIdentityContext() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (window.__claraWorkingStudentIdentityContextInstalled) return;
  window.__claraWorkingStudentIdentityContextInstalled = true;

  patchProfilePersistence();
  scheduleEnhance();

  const observer = new MutationObserver(scheduleEnhance);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-kind"],
  });

  document.addEventListener("click", handleFooterContinue, true);
  document.addEventListener("click", scheduleEnhance, true);
  window.addEventListener("storage", scheduleEnhance);
}

try {
  installWorkingStudentIdentityContext();
} catch (error) {
  console.warn("CLARA working student identity context failed:", error);
}
