import assert from "node:assert/strict";
import test from "node:test";
import { CLARA_COMMITMENT_BOOKLET_PAGES } from "../src/lib/clara-commitment-framework.js";

const frameworkPages = CLARA_COMMITMENT_BOOKLET_PAGES.slice(1, 6);
const finalPage = CLARA_COMMITMENT_BOOKLET_PAGES.at(-1);

test("the commitment booklet uses the current CLARA framework in order", () => {
  assert.deepEqual(
    frameworkPages.map((page) => page.title),
    [
      "C — Control",
      "L — Lifestyle",
      "A — Achievement",
      "R — Repetition",
      "A — Accountability",
    ]
  );
});

test("the final booklet recap matches Control Lifestyle Achievement Repetition Accountability", () => {
  assert.deepEqual(finalPage.checks, [
    "Control",
    "Lifestyle",
    "Achievement",
    "Repetition",
    "Accountability",
  ]);
});

test("removed acronym meanings cannot return to the booklet", () => {
  const bookletText = JSON.stringify(CLARA_COMMITMENT_BOOKLET_PAGES);
  assert.doesNotMatch(bookletText, /C — Commitment/);
  assert.doesNotMatch(bookletText, /Lifestyle Clarity/);
  assert.doesNotMatch(bookletText, /Ask Before You Spend/);
  assert.doesNotMatch(bookletText, /Real Guidance/);
  assert.doesNotMatch(bookletText, /A — Advocacy/);
});

test("each framework page includes its finalized outcome line", () => {
  const bookletText = JSON.stringify(frameworkPages);
  assert.match(bookletText, /Control shows the money\./);
  assert.match(bookletText, /Lifestyle explains the pattern\./);
  assert.match(bookletText, /Achievement shows what can be built\./);
  assert.match(bookletText, /Repetition creates the discipline\./);
  assert.match(bookletText, /Accountability protects the progress\./);
});
