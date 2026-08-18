import { data as A } from "./clara-emergency-fund-masterclass-question-data-a";
import { data as B } from "./clara-emergency-fund-masterclass-question-data-b";
import { data as C } from "./clara-emergency-fund-masterclass-question-data-c";
import { supports as SA } from "./clara-emergency-fund-masterclass-question-support-copy-a";
import { supports as SB } from "./clara-emergency-fund-masterclass-question-support-copy-b";
import { supports as SC } from "./clara-emergency-fund-masterclass-question-support-copy-c";

const DATA = { ...A, ...B, ...C };
const SUPPORTS = { ...SA, ...SB, ...SC };
const LANGUAGES = new Set(["en", "tl", "es"]);
const lang = (value) => LANGUAGES.has(String(value || "").toLowerCase()) ? String(value).toLowerCase() : "en";

export function getEmergencyFundMasterclassQuestionSupports(language = "en", stepId = "", questionIndex = -1) {
  const code = lang(language);
  const index = Number(questionIndex);
  const questions = DATA[String(stepId || "")]?.[code] || [];
  const copy = SUPPORTS[String(stepId || "")]?.[code];
  if (!Number.isInteger(index) || index < 0 || index >= questions.length || !copy) return null;
  const [question, answer] = questions[index];
  const [anotherWay, realLife, simplest] = copy;
  return {
    anotherWay: `${anotherWay}\n\nFor your question — “${question}” — the key answer is: ${answer}`,
    realLife,
    simplest,
  };
}
