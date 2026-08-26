import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("Weekly Cross-Check claims the same foreground overlay ownership as CLARA financial chats", () => {
  const weekly = read("src/components/fresh/main-dashboard/assistant/ClaraWeeklyMoneyCheckOverlayV2.jsx");
  const ownership = read("src/runtime/installWeeklyCrossCheckForegroundOwnership.js");
  const reconciliation = read("src/runtime/installWeeklyMoneyCheckReconciliation.js");
  const overlayCss = read("src/clara-ai-overlay-soft-anchor.css");

  assert.match(weekly, /data-clara-weekly-cross-check-chat="true"/);
  assert.match(reconciliation, /installWeeklyCrossCheckForegroundOwnership/);
  assert.match(ownership, /data-clara-pause-overlay/);
  assert.match(ownership, /2147483000/);
  assert.match(overlayCss, /\[data-clara-pause-overlay="true"\][\s\S]*z-index:\s*2147483000\s*!important/);
});
