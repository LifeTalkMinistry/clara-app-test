import { readFileSync, writeFileSync } from "node:fs";

const path = "src/components/fresh/main-dashboard/money-summary/DashboardMoneySummaryStable.jsx";
let source = readFileSync(path, "utf8");

function replaceOnce(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing expected block: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected one block but found multiple: ${label}`);
  }
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

function replaceExactCount(before, after, expectedCount, label) {
  const parts = source.split(before);
  const actualCount = parts.length - 1;
  if (actualCount !== expectedCount) {
    throw new Error(`Expected ${expectedCount} blocks but found ${actualCount}: ${label}`);
  }
  source = parts.join(after);
}

replaceOnce(
  'import { Eye, EyeOff } from "lucide-react";',
  'import { Eye, EyeOff } from "lucide-react";\nimport { CLARA_PAUSE_OPEN_REQUEST_EVENT } from "@/lib/clara-pause-events";',
  "Pause event import"
);

replaceOnce(
  `      if (!isGuideMode) {
        startMoneyLeftOrbLongPress?.(event);
      }

`,
  "",
  "remove duplicate Money Left timer start"
);

replaceOnce(
  `        if (isAwaitHoldGuideActive()) {
          onGuideOrbLongPress?.();
          return;
        }

        if (isAwaitSingleGuideActive() || isAwaitDoubleGuideActive()) {
          onGuideOrbLongPress?.();
        }`,
  `        if (isAwaitHoldGuideActive()) {
          onGuideOrbLongPress?.();
          return;
        }

        if (isAwaitSingleGuideActive() || isAwaitDoubleGuideActive()) {
          onGuideOrbLongPress?.();
          return;
        }

        if (!guideState.isGuideMode && typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(CLARA_PAUSE_OPEN_REQUEST_EVENT, {
              detail: {
                requestId: \`money-left-orb-stable-\${Date.now()}-\${Math.random()
                  .toString(36)
                  .slice(2)}\`,
                source: "money-left-orb-stable",
              },
            })
          );
        }`,
  "live Money Left Pause dispatch"
);

replaceOnce(
  `      if (!isGuideMode) {
        if (typeof moveMoneyLeftOrbLongPress === "function") {
          moveMoneyLeftOrbLongPress(event);
        } else {
          endMoneyLeftOrbLongPress?.(event);
        }
      }
`,
  "",
  "remove duplicate Money Left move timer control"
);

replaceExactCount(
  `      if (!isGuideMode) {
        endMoneyLeftOrbLongPress?.(event);
      }

`,
  "",
  2,
  "remove duplicate Money Left timer end"
);

replaceOnce(
  '                  : "Tap to log expense, double tap for Transaction Hub, long press to ask CLARA"',
  '                  : "Tap to log expense, double tap for Transaction Hub, long press to pause before buying"',
  "Money Left orb accessible copy"
);

writeFileSync(path, source);

const result = readFileSync(path, "utf8");
const required = [
  "CLARA_PAUSE_OPEN_REQUEST_EVENT",
  'source: "money-left-orb-stable"',
  "money-left-orb-stable-",
  "long press to pause before buying",
];
const forbidden = [
  "startMoneyLeftOrbLongPress?.(event);",
  "moveMoneyLeftOrbLongPress(event);",
];

for (const needle of required) {
  if (!result.includes(needle)) throw new Error(`Missing verification marker: ${needle}`);
}
for (const needle of forbidden) {
  if (result.includes(needle)) throw new Error(`Duplicate path remains: ${needle}`);
}

console.log("CLARA Pause live-orb hold patch applied successfully.");
