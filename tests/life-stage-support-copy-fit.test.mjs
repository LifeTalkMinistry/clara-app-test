import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css = fs.readFileSync("src/me-life-stage-signal-gap-fix.css", "utf8");

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
