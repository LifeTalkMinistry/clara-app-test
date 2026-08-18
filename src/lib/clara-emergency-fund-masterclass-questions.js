import { data as A } from "./clara-emergency-fund-masterclass-question-data-a";
import { data as B } from "./clara-emergency-fund-masterclass-question-data-b";
import { data as C } from "./clara-emergency-fund-masterclass-question-data-c";

const DATA = { ...A, ...B, ...C };
const LANGUAGES = new Set(["en", "tl", "es"]);
const lang = (value) => LANGUAGES.has(String(value || "").toLowerCase()) ? String(value).toLowerCase() : "en";

export function getEmergencyFundMasterclassPointQuestions(language = "en", stepId = "") {
  return (DATA[String(stepId || "")]?.[lang(language)] || []).map(([question, answer]) => ({ question, answer }));
}
