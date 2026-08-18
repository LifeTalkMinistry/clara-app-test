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
const CONNECTORS = {
en: { key: (question, answer) => `For your question — “${question}” — the key answer is: ${answer}`, applied: (question, answer) => `Applied to “${question}”: ${answer}`, direct: (answer) => `Direct answer: ${answer}` },
tl: { key: (question, answer) => `Para sa tanong mo — “${question}” — ito ang key answer: ${answer}`, applied: (question, answer) => `Kapag in-apply sa “${question}”: ${answer}`, direct: (answer) => `Pinakadiretso: ${answer}` },
es: { key: (question, answer) => `Para tu pregunta — “${question}” — la respuesta clave es: ${answer}`, applied: (question, answer) => `Aplicado a “${question}”: ${answer}`, direct: (answer) => `Respuesta directa: ${answer}` },
};
export function getEmergencyFundMasterclassQuestionSupports(language = "en", stepId = "", questionIndex = -1) {
const code = lang(language);
const index = Number(questionIndex);
const questions = DATA[String(stepId || "")]?.[code] || [];
const copy = SUPPORTS[String(stepId || "")]?.[code];
if (!Number.isInteger(index) || index < 0 || index >= questions.length || !copy) return null;
const [question, answer] = questions[index];
const [anotherWay, realLife, simplest] = copy;
const connector = CONNECTORS[code];
return {
anotherWay: `${anotherWay}\n\n${connector.key(question, answer)}`,
realLife: `${realLife}\n\n${connector.applied(question, answer)}`,
simplest: `${simplest}\n\n${connector.direct(answer)}`,
};
}
