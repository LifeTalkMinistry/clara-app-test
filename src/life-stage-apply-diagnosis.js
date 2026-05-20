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

function escapeHtml(value) {
  return clean(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character]));
}

function buildDiagnosis(profile) {
  const setup = meaning(SETUP_MEANING, profile.setup, "your student setup carries both school and money responsibility");
  const rhythm = meaning(RHYTHM_MEANING, profile.rhythm, "your income rhythm needs protection");
  const load = meaning(LOAD_MEANING, profile.workload, "your schedule affects your money decisions");
  const pressure = meaning(PRESSURE_MEANING, profile.pressure, "one financial area needs to be protected first");
  const coping = meaning(COPING_MEANING, profile.coping, "pressure changes how you respond to money");
  const goal = meaning(GOAL_MEANING, profile.goal, "protect your stability while continuing school");

  return {
    title: "Your current financial environment.",
    core: "You are carrying school, money, energy, and protection at the same time.",
    sees: `${sentence(setup)}.`,
    matters: `Because ${rhythm}, CLARA understands that one small gap can affect your school, daily needs, and emotional energy.`,
    protection: `Right now, ${pressure}. Since ${load}, and ${coping}, your financial system should help you ${goal}.`,
    focus: displayValue(profile.goal) || "Protect your stability",
    pressure: displayValue(profile.pressure) || "Student money pressure",
    rhythm: displayValue(profile.rhythm) || "Mixed student rhythm",
  };
}

export { buildDiagnosis };