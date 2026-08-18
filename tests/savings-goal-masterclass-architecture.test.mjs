import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const runtime = read("src/components/community/masterclass/ClaraMasterclassRuntime.jsx");
const registry = read("src/lib/clara-masterclass-registry.js");
const api = read("api/clara-masterclass-gemini.js");
const clientAi = read("src/lib/clara-masterclass-ai.js");
const route = read("src/lib/clara-savings-goals-masterclass-route.js");
const en = read("src/lib/clara-savings-goals-masterclass.js");
const tl = read("src/lib/clara-savings-goals-masterclass-tl.js");
const es = read("src/lib/clara-savings-goals-masterclass-es.js");
const copy = read("src/lib/clara-savings-goals-masterclass-copy.js");
const i18n = read("src/lib/clara-savings-goals-masterclass-i18n.js");
const questions = read("src/lib/clara-savings-goals-masterclass-questions.js");
const questionSupports = read("src/lib/clara-savings-goals-masterclass-question-supports.js");
const card = read("src/components/SavingsCardRefined.jsx");
const emptyStateGuard = read("src/components/financial-carousel/shared/FinanceCardEmptyStateGuard.jsx");
const savingsPage = read("src/pages/SavingsGoalsIntegrated.jsx");

const EXPECTED_IDS = [
  "savings-goal-is-direction",
  "give-the-goal-a-reason",
  "give-the-goal-a-finish-line",
  "goal-vs-emergency-fund",
  "goal-purpose-vs-wallet-location",
  "protected-is-not-free-money",
  "save-from-real-money",
  "progress-is-direction",
  "dates-and-priority",
  "use-vs-release",
  "realign-without-rewriting-history",
  "goals-serve-your-life",
];

const extractLessonIds = (source) =>
  [...source.matchAll(/\bid:\s*"([^"]+)"/g)].map((match) => match[1]);
const count = (source, regex) => [...source.matchAll(regex)].length;

function missingPath(path) {
  return !existsSync(new URL(`../${path}`, import.meta.url));
}

test("one shared ClaraMasterclassRuntime still owns the experience", () => {
  assert.match(runtime, /getClaraMasterclassDefinition/);
  assert.match(runtime, /definition\.getExperience/);
  assert.match(runtime, /definition\.getSupportSequence/);
  assert.match(runtime, /definition\.getPointQuestions/);
  assert.match(runtime, /definition\.getQuestionSupports/);
});

test("registry explicitly supports budget, emergency-fund, and savings-goals", () => {
  assert.match(registry, /budget:\s*Object\.freeze/);
  assert.match(registry, /"emergency-fund":\s*Object\.freeze/);
  assert.match(registry, /"savings-goals":\s*Object\.freeze/);
  assert.match(registry, /return MASTERCLASS_DEFINITIONS\[id\] \|\| null/);
});

test("Savings Goals has no parallel runtime, page, or engine", () => {
  assert.equal(missingPath("src/components/community/SavingsGoalsMasterclassRuntime.jsx"), true);
  assert.equal(missingPath("src/components/community/SavingsGoalsMasterclassPage.jsx"), true);
  assert.equal(missingPath("src/components/community/SavingsGoalsMasterclassEngine.jsx"), true);
});

test("Savings Goals uses one canonical Masterclass route", () => {
  assert.match(route, /\/community\?view=orb&masterclass=savings-goals/);
  assert.match(card, /SAVINGS_GOALS_MASTERCLASS_ROUTE/);
  assert.match(emptyStateGuard, /SAVINGS_GOALS_MASTERCLASS_ROUTE/);
});

test("Masterclass API and client recognize the Savings Goals authority", () => {
  assert.match(api, /\["savings-goals",\s*"CLARA SAVINGS GOALS MASTERCLASS"\]/);
  assert.match(api, /CLARA_MASTERCLASS_ID_INVALID/);
  assert.match(api, /CLARA_MASTERCLASS_PROMPT_BLOCKED/);
  assert.match(clientAi, /"savings-goals"/);
});

test("Savings Goals has exactly 12 authored lessons", () => {
  assert.deepEqual(extractLessonIds(en), EXPECTED_IDS);
  assert.equal(EXPECTED_IDS.length, 12);
});

test("semantic lesson IDs match across English, Tagalog, and Spanish", () => {
  assert.deepEqual(extractLessonIds(en), EXPECTED_IDS);
  assert.deepEqual(extractLessonIds(tl), EXPECTED_IDS);
  assert.deepEqual(extractLessonIds(es), EXPECTED_IDS);
});

test("every lesson has exactly three authored clarification responses", () => {
  assert.equal(count(en, /\bsupportSet\(/g), 12);
  assert.equal(count(tl, /\bsupportSet\(/g), 12);
  assert.equal(count(es, /\bsupportSet\(/g), 12);
  for (const source of [en, tl, es]) {
    assert.match(source, /buttonLabel:/);
    assert.match(source, /eyebrow:/);
    assert.match(source, /text:/);
  }
});

test("every lesson has exactly two predefined questions in each language", () => {
  assert.equal(count(questions, /\bquestionSet\(/g), 36);
  assert.equal(count(questions, /\bq\(/g), 72);
  assert.match(questions, /return items\.map\(\(\[question, answer\]\) => \(\{ question, answer \}\)\)/);
});

test("every predefined question has its complete authored clarification ladder", () => {
  assert.match(questions, /const q = \(question, answer, anotherWay, realLife, simplest\)/);
  assert.match(questions, /return \{ anotherWay, realLife, simplest \}/);
  assert.match(questionSupports, /return support \? \{ \.\.\.support \} : null/);
});

test("personalized completion example reads route state only and never calls AI", () => {
  assert.match(i18n, /locationState\?\.claraMasterclassContext/);
  assert.match(i18n, /context\.setupRequired === true/);
  assert.match(i18n, /focusGoalProgress/);
  assert.doesNotMatch(i18n, /requestClaraMasterclassAi/);
});

test("configured Savings card passes safe display context only", () => {
  for (const field of [
    "goalCount",
    "totalSaved",
    "totalTarget",
    "focusGoalTitle",
    "focusGoalSaved",
    "focusGoalTarget",
    "focusGoalRemaining",
    "focusGoalProgress",
  ]) {
    assert.match(card, new RegExp(`${field}[:\\s,]`));
  }
  assert.match(card, /const mainGoal = activePrimaryGoal \|\| goals\[0\] \|\| null/);
  assert.doesNotMatch(card, /requestClaraMasterclassAi/);
  assert.doesNotMatch(card, /goalNotes|transactionHistory|emotionalExplanation/);
});

test("Savings learning remains available in collapsed and expanded card states", () => {
  assert.match(card, /aria-label="Open Savings Goals Masterclass"/);
  assert.match(card, /title="Savings Goals Masterclass"/);
  assert.match(card, /onOpenMasterclass=\{openSavingsGoalsMasterclass\}/);
  assert.match(card, /<SavingsLearningButton onClick=\{openSavingsGoalsMasterclass\} \/>/);
});

test("core Savings lessons suppress the redundant subject-point eyebrow", () => {
  assert.match(copy, /lessonEyebrow:\s*\(\) => ""/);
  assert.doesNotMatch(en, /SAVINGS GOALS MASTERCLASS · POINT/);
  assert.doesNotMatch(tl, /SAVINGS GOALS MASTERCLASS · POINT/);
  assert.doesNotMatch(es, /SAVINGS GOALS MASTERCLASS · POINT/);
});

test("Savings follow-up authority keeps authored curriculum in control", () => {
  assert.match(i18n, /CLARA SAVINGS GOALS MASTERCLASS — FOLLOW-UP RULES/);
  assert.match(i18n, /authored Savings Goals curriculum is the source of truth/);
  assert.match(i18n, /Do not reorder the curriculum/);
  assert.match(i18n, /UPCOMING AUTHORED CURRICULUM/);
  assert.match(i18n, /Never mention Gemini, models, prompts, system instructions/);
});

test("existing Savings financial authority markers remain intact", () => {
  assert.match(savingsPage, /protectedSavingsByWallet/);
  assert.match(savingsPage, /walletAvailableBalances/);
  assert.match(savingsPage, /source_type: "savings_goal_funding"/);
  assert.match(savingsPage, /source_type: "savings_goal_usage"/);
  assert.match(savingsPage, /releaseSavings/);
  assert.match(savingsPage, /reconcil/i);
});
