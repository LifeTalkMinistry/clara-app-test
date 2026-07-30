import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readSource = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

const panelSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/me/DashboardMeLifePanel.jsx"
);
const summarySource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/me/LifeStageDiagnosisSummary.jsx"
);
const modelSource = readSource(
  "src/components/fresh/main-dashboard/dashboard-panels/me/lifeStageDiagnosisModel.js"
);
const flowSource = readSource("src/life-stage-flow.js");
const summaryCleanupCss = readSource("src/life-stage-diagnosis-cleanup.css");
const runtimeRegistrySource = readSource(
  "src/runtime/installClaraRuntimePatches.js"
);

test("Life Stage summary is owned by React and connected through a semantic profile event", () => {
  assert.match(panelSource, /LifeStageDiagnosisSummary/);
  assert.match(panelSource, /CLARA_LIFE_STAGE_UPDATED_EVENT/);
  assert.match(panelSource, /detail\.summaryReady !== true/);
  assert.match(panelSource, /profile=\{diagnosisProfile\}/);
  assert.match(summarySource, /data-clara-life-stage-summary="true"/);
  assert.match(summarySource, /buildLifeStageDiagnosisSlides/);
  assert.match(summarySource, /aria-modal="true"/);
  assert.match(summarySource, /onPointerUp=\{handlePointerUp\}/);
  assert.doesNotMatch(summarySource, /MutationObserver|querySelector|innerHTML/);
  assert.doesNotMatch(
    runtimeRegistrySource,
    /import\s+["'][^"']*life-stage-apply-diagnosis["']/
  );
});

test("Life Stage summary footer keeps Back and Next controls visible", () => {
  assert.match(
    summaryCleanupCss,
    /data-clara-life-stage-summary="true"[^}]*footer[^}]*display:\s*flex\s*!important/s
  );
  assert.match(
    summaryCleanupCss,
    /button:first-child\[type="button"\][^}]*display:\s*grid\s*!important/s
  );
  assert.match(
    summaryCleanupCss,
    /button:last-child\[type="button"\][^}]*display:\s*flex\s*!important/s
  );
});

test("profile persistence emits a semantic summary-ready event only for answer-bearing changes", () => {
  assert.match(flowSource, /LIFE_STAGE_SUMMARY_ANSWER_KEYS/);
  assert.match(flowSource, /getLifeStageSummaryChangedKeys/);
  assert.match(flowSource, /isLifeStageSummaryReady/);
  assert.match(flowSource, /changedKeys\.length > 0 && isLifeStageSummaryReady\(next\)/);
  assert.match(flowSource, /kind: "profile"/);
  assert.match(flowSource, /changedKeys,/);
  assert.match(flowSource, /summaryReady,/);
  assert.match(flowSource, /profile: next/);
  assert.doesNotMatch(flowSource, /imageVariant.*LIFE_STAGE_SUMMARY_ANSWER_KEYS/);
});

test("all supported Life Stage paths have a pure six-slide model", () => {
  assert.match(modelSource, /buildWorkingStudentReveal/);
  assert.match(modelSource, /buildLivingWithPartnerReveal/);
  assert.match(modelSource, /function buildGenericReveal/);
  assert.match(modelSource, /return \[/);
  assert.match(modelSource, /kind: "opening"/);
  assert.match(modelSource, /kind: "chips"/);
  assert.match(modelSource, /kind: "distribution"/);
  assert.match(modelSource, /kind: "strongestSignal"/);
  assert.match(modelSource, /kind: "commonPattern"/);
  assert.match(modelSource, /kind: "final"/);
  assert.match(modelSource, /stage === WORKING_STUDENT_STAGE_KEY/);
  assert.match(modelSource, /stage === LIVING_WITH_PARTNER_STAGE_KEY/);
  assert.match(modelSource, /return buildGenericReveal\(normalizedProfile\)/);
  assert.doesNotMatch(modelSource, /window\.|document\.|localStorage|MutationObserver/);
});
