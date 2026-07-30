import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync("src/me-life-stage-signal-gap-fix.css", "utf8");
const idleCss = fs.readFileSync("src/life-stage-idle-support-copy.css", "utf8");
const runtimeRegistry = fs.readFileSync("src/runtime/installClaraRuntimePatches.js", "utf8");
const guidanceSource = fs.readFileSync("src/life-stage-guidance.js", "utf8");

function supportBodyBlocks(source) {
  return [...source.matchAll(/section\[data-clara-support-card="true"\][^{]*h3 \+ p\s*\{([^}]*)\}/g)].map(
    (match) => match[1],
  );
}

test("Life Stage support messages remain fully visible for every stage", () => {
  const blocks = supportBodyBlocks(css);

  assert.ok(blocks.length >= 3, "expected base, short-screen, and very-short-screen support copy rules");
  assert.match(blocks[0], /display:\s*block\s*!important/);
  assert.match(blocks[0], /-webkit-line-clamp:\s*unset\s*!important/);
  assert.match(blocks[0], /line-clamp:\s*unset\s*!important/);
  assert.match(blocks[0], /overflow:\s*visible\s*!important/);

  for (const block of blocks) {
    assert.doesNotMatch(block, /(?:-webkit-)?line-clamp:\s*\d+/);
  }
});

test("Life Stage support card can grow with longer stage copy", () => {
  assert.match(
    css,
    /section\[data-clara-support-card="true"\][^{]*\{[^}]*height:\s*auto\s*!important[^}]*max-height:\s*none\s*!important/s,
  );
});

test("idle Life Stage cards show real concise copy instead of legacy generated paragraphs", () => {
  assert.match(idleCss, /data-clara-signal-card-active="false"/);
  assert.match(idleCss, /content:\s*none\s*!important/);
  assert.doesNotMatch(idleCss, /content:\s*["'][^"']+["']/);
  assert.match(idleCss, /h3 \+ p[\s\S]*-webkit-line-clamp:\s*unset\s*!important/);
  assert.match(idleCss, /h3 \+ p[\s\S]*overflow:\s*visible\s*!important/);
});

test("selected signal guidance hint is structurally placed above the heart action", () => {
  assert.match(idleCss, /data-clara-signal-card-active="true"/);
  assert.match(idleCss, /> div\s*> div:first-child\s*\{[\s\S]*display:\s*contents\s*!important/);
  assert.match(
    idleCss,
    /\[data-clara-solution-hint="true"\][\s\S]*grid-column:\s*2\s*!important[\s\S]*grid-row:\s*1\s*!important/,
  );
  assert.match(
    idleCss,
    /\[data-clara-heart-cta="true"\][\s\S]*grid-column:\s*2\s*!important[\s\S]*grid-row:\s*2\s*!important/,
  );
  assert.match(idleCss, /\[data-clara-solution-hint="true"\]::after/);
  assert.doesNotMatch(idleCss, /data-clara-solution-hint[^}]*margin-(?:top|left|right):\s*-/s);
});

test("idle copy authority loads after every legacy Life Stage copy layer", () => {
  const idleIndex = runtimeRegistry.indexOf('import "../life-stage-idle-support-copy.css";');
  const workingStudentIndex = runtimeRegistry.indexOf('import "../life-stage-story-canonical-working-student.css";');
  const youngProfessionalIndex = runtimeRegistry.indexOf('import "../life-stage-story-canonical-young-professional.css";');
  const adaptiveIndex = runtimeRegistry.indexOf('import "../me-life-stage-signal-gap-fix.css";');

  assert.ok(idleIndex > workingStudentIndex);
  assert.ok(idleIndex > youngProfessionalIndex);
  assert.ok(idleIndex > adaptiveIndex);
});

test("every Life Stage has a concise initial message", () => {
  const idleMap = guidanceSource.match(/export const LIFE_STAGE_IDLE_GUIDANCE = \{([\s\S]*?)\n\};/)?.[1] || "";
  const bodies = [...idleMap.matchAll(/body:\s*"([^"]+)"/g)].map((match) => match[1]);

  assert.equal(bodies.length, 8, "expected an idle message for every Life Stage");

  for (const body of bodies) {
    assert.ok(body.length <= 180, `idle message exceeds the 180-character limit: ${body}`);
    assert.doesNotMatch(body, /quietly manage/i);
  }
});

test("detailed awareness only starts after a signal is selected", () => {
  assert.match(
    guidanceSource,
    /if \(!signalId && \(mode === "idle" \|\| mode === "awareness"\)\) \{\s*return LIFE_STAGE_IDLE_GUIDANCE\[normalized\]/,
  );
  assert.match(guidanceSource, /if \(signalId\) \{\s*const rotatingCopy = getRotatingSignalCopy/);
  assert.match(guidanceSource, /if \(mode === "guidance"\) return stage\.defaultGuidance/);
});