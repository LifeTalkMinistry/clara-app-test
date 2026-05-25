import { DEFAULT_STAGE, STAGES, normalizeLifeStage, getStageDefinition } from "./components/fresh/main-dashboard/dashboard-panels/me/lifeStageIntelligenceData";
import { WORKING_STUDENT_STAGE_KEY, WORKING_STUDENT_QUESTION_ORDER, WORKING_STUDENT_ROOTS, WORKING_STUDENT_BRANCHES, WORKING_STUDENT_RESET_AFTER, WORKING_STUDENT_DISPLAY_LABELS, WORKING_STUDENT_LIFE_STAGE_SOURCE, getWorkingStudentOptions, resetWorkingStudentAfter, completeWorkingStudentDraft, getWorkingStudentQuestionContext } from "./components/fresh/main-dashboard/dashboard-panels/me/workingStudentLifeStageSource";
import { LIVING_WITH_PARTNER_STAGE_KEY, LIVING_WITH_PARTNER_ROOTS, LIVING_WITH_PARTNER_BRANCHES, LIVING_WITH_PARTNER_RESET_AFTER, LIVING_WITH_PARTNER_DISPLAY_LABELS, LIVING_WITH_PARTNER_LIFE_STAGE_SOURCE, getLivingWithPartnerOptions, resetLivingWithPartnerAfter, completeLivingWithPartnerDraft } from "./components/fresh/main-dashboard/dashboard-panels/me/livingWithPartnerLifeStageSource";

export const LIFE_STAGE_KEY = "clara_life_stage_profile_v1";

export const STAGE_ALIASES = {
  youngprofessional: "Young Professional",
  youngprofessionals: "Young Professional",
  youngpro: "Young Professional",
  workingstudent: WORKING_STUDENT_STAGE_KEY,
  livingwithpartner: LIVING_WITH_PARTNER_STAGE_KEY,
  familyhousehold: "Family Household",
  singleparent: "Single Parent",
  fulltimeearner: "Full-Time Earner",
  fulltime: "Full-Time Earner",
  freelanceseason: "Freelance Season",
  freelancerseason: "Freelance Season",
  freelancegigworker: "Freelance Season",
  businessbuilder: "Business Builder",
};

export const LIFE_STAGE_ICONS = {
  "Young Professional": "briefcase",
  [WORKING_STUDENT_STAGE_KEY]: "graduation-cap",
  [LIVING_WITH_PARTNER_STAGE_KEY]: "heart",
  "Family Household": "users",
  "Single Parent": "user-round",
  "Full-Time Earner": "wallet-cards",
  "Freelance Season": "laptop",
  "Business Builder": "store",
};

export const LIFE_STAGE_CONTEXT_BOARD = {
  "Young Professional": "People in this stage are building independence while balancing salary rhythm, career pressure, lifestyle upgrades, and future stability.",
  [WORKING_STUDENT_STAGE_KEY]: "People in this stage are balancing classes, work hours, assignments, commute, and limited money while trying to build their future.",
  [LIVING_WITH_PARTNER_STAGE_KEY]: "People in this stage are learning how shared life, shared costs, boundaries, and emotional responsibility affect money decisions.",
  "Family Household": "People in this stage are balancing home contribution, family requests, shared bills, and personal boundaries.",
  "Single Parent": "People in this stage are protecting children, essentials, time, energy, and emergency stability with limited room for mistakes.",
  "Full-Time Earner": "People in this stage are managing salary rhythm, routine fatigue, lifestyle pressure, and responsibility while trying to build consistency.",
  "Freelance Season": "People in this stage are balancing flexible income, client timing, dry months, and the need for stronger buffers.",
  "Business Builder": "People in this stage are balancing reinvestment, operating costs, personal income, and decision pressure while building something sustainable.",
};

function compact(value) {
  return String(value || "").replace(/[\s_-]+/g, "").toLowerCase();
}

export function normalizeLifeStageKey(stageKey) {
  const raw = String(stageKey || "").trim();
  if (!raw) return DEFAULT_STAGE.stage;
  const aliased = STAGE_ALIASES[compact(raw)] || raw;
  return normalizeLifeStage(aliased);
}

export function readSelectedLifeStageProfile() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIFE_STAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return null;
    return { ...parsed, stage: normalizeLifeStageKey(parsed.stage) };
  } catch {
    return null;
  }
}

export function saveSelectedLifeStageProfile(profile = {}) {
  if (typeof window === "undefined") return profile;
  const next = { ...profile, stage: normalizeLifeStageKey(profile.stage) };
  try {
    window.localStorage.setItem(LIFE_STAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("clara:life-stage-profile-updated"));
  } catch {
  }
  return next;
}

export function getSelectedLifeStageKey() {
  return readSelectedLifeStageProfile()?.stage || DEFAULT_STAGE.stage;
}

function fallbackQuestionSet(stageKey) {
  const definition = getStageDefinition(stageKey, readSelectedLifeStageProfile() || {});
  const resetAfter = {
    setup: ["rhythm", "workload", "pressure", "coping", "goal"],
    rhythm: ["workload", "pressure", "coping", "goal"],
    workload: ["pressure", "coping", "goal"],
    pressure: ["coping", "goal"],
    coping: ["goal"],
    goal: [],
  };
  return {
    order: ["setup", "rhythm", "workload", "pressure", "coping", "goal"],
    roots: definition.fields?.setup || [],
    branches: {},
    resetAfter,
    fields: definition.fields || {},
    getOptions: (draft = {}, key) => definition.fields?.[key] || [],
    completeDraft: (draft = {}) => ({ stage: normalizeLifeStageKey(stageKey), ...draft }),
    resetAfterKey: (draft = {}, key) => {
      const next = { ...draft };
      (resetAfter[key] || []).forEach((item) => delete next[item]);
      return next;
    },
  };
}

export const LIFE_STAGE_FLOW = {
  stages: STAGES.map((stageKey) => {
    const key = normalizeLifeStageKey(stageKey);
    return {
      key,
      label: key,
      icon: LIFE_STAGE_ICONS[key] || "circle",
      contextBoardText: LIFE_STAGE_CONTEXT_BOARD[key] || getStageDefinition(key)?.identity?.overview || "CLARA is preparing this stage context.",
    };
  }),
  questions: {
    [WORKING_STUDENT_STAGE_KEY]: {
      order: WORKING_STUDENT_QUESTION_ORDER,
      roots: WORKING_STUDENT_ROOTS,
      branches: WORKING_STUDENT_BRANCHES,
      resetAfter: WORKING_STUDENT_RESET_AFTER,
      displayLabels: WORKING_STUDENT_DISPLAY_LABELS,
      source: WORKING_STUDENT_LIFE_STAGE_SOURCE,
      getOptions: getWorkingStudentOptions,
      completeDraft: completeWorkingStudentDraft,
      resetAfterKey: resetWorkingStudentAfter,
      getQuestionContext: getWorkingStudentQuestionContext,
    },
    [LIVING_WITH_PARTNER_STAGE_KEY]: {
      order: ["setup", "rhythm", "workload", "pressure", "coping", "goal"],
      roots: LIVING_WITH_PARTNER_ROOTS,
      branches: LIVING_WITH_PARTNER_BRANCHES,
      resetAfter: LIVING_WITH_PARTNER_RESET_AFTER,
      displayLabels: LIVING_WITH_PARTNER_DISPLAY_LABELS,
      source: LIVING_WITH_PARTNER_LIFE_STAGE_SOURCE,
      getOptions: getLivingWithPartnerOptions,
      completeDraft: completeLivingWithPartnerDraft,
      resetAfterKey: resetLivingWithPartnerAfter,
    },
  },
  summaries: {
    [WORKING_STUDENT_STAGE_KEY]: {},
    [LIVING_WITH_PARTNER_STAGE_KEY]: {},
  },
};

STAGES.forEach((stageKey) => {
  const normalized = normalizeLifeStageKey(stageKey);
  if (!LIFE_STAGE_FLOW.questions[normalized]) LIFE_STAGE_FLOW.questions[normalized] = fallbackQuestionSet(normalized);
  if (!LIFE_STAGE_FLOW.summaries[normalized]) LIFE_STAGE_FLOW.summaries[normalized] = {};
});

export function getLifeStageFlow() {
  return LIFE_STAGE_FLOW;
}

export function getLifeStageQuestions(stageKey = getSelectedLifeStageKey()) {
  const normalized = normalizeLifeStageKey(stageKey);
  return LIFE_STAGE_FLOW.questions[normalized] || LIFE_STAGE_FLOW.questions[DEFAULT_STAGE.stage] || fallbackQuestionSet(normalized);
}

export function getLifeStageSelectionList() {
  return LIFE_STAGE_FLOW.stages;
}

export function getLifeStageStageContext(stageKey = getSelectedLifeStageKey()) {
  const normalized = normalizeLifeStageKey(stageKey);
  return LIFE_STAGE_CONTEXT_BOARD[normalized] || getStageDefinition(normalized)?.identity?.overview || "CLARA is preparing this life stage context.";
}

export function getLifeStageOptions(draft = {}, key) {
  const stageKey = normalizeLifeStageKey(draft.stage || getSelectedLifeStageKey());
  return getLifeStageQuestions(stageKey).getOptions?.(draft, key) || [];
}

export default LIFE_STAGE_FLOW;
