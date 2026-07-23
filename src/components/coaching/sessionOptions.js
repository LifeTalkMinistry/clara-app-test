import { COACHING_FOCUS_OPTIONS as SESSION_FOCUS_OPTIONS } from "@/lib/coaching-focus-options";

export { SESSION_FOCUS_OPTIONS };

export const DESIRED_OUTCOME_OPTIONS = [
  { value: "clear_action", label: "Leave with one clear action" },
  { value: "adjust_plan", label: "Create or adjust a financial plan" },
  { value: "understand_pattern", label: "Understand a repeated money behavior" },
  { value: "make_decision", label: "Make a confident financial decision" },
  { value: "setup_feature", label: "Set up a CLARA feature correctly" },
  { value: "review_progress", label: "Review my progress and next step" },
  { value: "feel_control", label: "Feel more confident and in control" },
];

export const EMOTION_OPTIONS = [
  { value: "calm", label: "Calm and in control" },
  { value: "motivated", label: "Motivated but unsure" },
  { value: "confused", label: "Confused" },
  { value: "pressured", label: "Pressured" },
  { value: "overwhelmed", label: "Overwhelmed" },
  { value: "discouraged", label: "Discouraged" },
  { value: "hopeful", label: "Hopeful and ready to improve" },
];

export const APPROACH_OPTIONS = [
  { value: "gentle_supportive", label: "Gentle & Supportive", description: "Help me feel understood first and guide me patiently." },
  { value: "calm_honest", label: "Calm but Honest", description: "Be considerate, but clearly explain what needs to change.", recommended: true },
  { value: "direct_firm", label: "Direct & Firm", description: "Challenge my excuses and hold me accountable." },
  { value: "strong_accountability", label: "Strong Accountability", description: "Push me firmly toward a clear decision and action." },
  { value: "adaptive", label: "Adapt During the Session", description: "Adjust between gentle and direct depending on what I need." },
];

export const DATA_CONSENT_OPTIONS = [
  { value: "allow", label: "Yes, review relevant CLARA information", description: "Max may use normal authorized CLARA data services. Your vault is not copied into this request." },
  { value: "answers_only", label: "No, use only my check-in answers", description: "Max should prepare only from the answers submitted here." },
];

export const CHECK_IN_STEPS = [
  { key: "focus", eyebrow: "Session focus", title: "What would you like to focus on?", helper: "Choose the concern that matters most for this session.", type: "choice", options: SESSION_FOCUS_OPTIONS },
  { key: "situation", eyebrow: "Current situation", title: "What is happening right now?", helper: "Briefly explain what made you choose this topic today.", type: "textarea" },
  { key: "outcome", eyebrow: "Desired result", title: "What would make this session successful?", helper: "Choose the result you most want by the end of the call.", type: "choice", options: DESIRED_OUTCOME_OPTIONS },
  { key: "emotion", eyebrow: "Money state", title: "How are you feeling about money right now?", helper: "This helps Max understand how much pressure you are carrying.", type: "choice", options: EMOTION_OPTIONS },
  { key: "approach", eyebrow: "Coaching approach", title: "How should Max approach you?", helper: "Choose the tone and accountability that helps you respond best.", type: "choice", options: APPROACH_OPTIONS },
  { key: "dataConsent", eyebrow: "Preparation permission", title: "May Max review relevant CLARA information?", helper: "Choose whether Max may use authorized data or only these answers.", type: "choice", options: DATA_CONSENT_OPTIONS },
];

export const INITIAL_ANSWERS = {
  focus: "",
  situation: "",
  outcome: "",
  emotion: "",
  approach: "calm_honest",
  dataConsent: "allow",
};
