import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const helperImport =
  'import OnboardingActionBar from "@/components/fresh/main-dashboard/onboarding/OnboardingActionBar";\n';

const importAnchor =
  'import FinanceInlineAlert from "@/components/fresh/main-dashboard/finance-notices/FinanceInlineAlert";\n';

if (!source.includes(helperImport.trim())) {
  const anchorIndex = source.indexOf(importAnchor);
  if (anchorIndex === -1) {
    throw new Error("FinanceInlineAlert import anchor not found.");
  }

  source =
    source.slice(0, anchorIndex + importAnchor.length) +
    helperImport +
    source.slice(anchorIndex + importAnchor.length);
}

const startNeedle = 'const OnboardingActionBar = ({\n';
const endNeedle = 'const dispatchClaraEvent = (name, detail = null) => {';
const start = source.indexOf(startNeedle);
if (start !== -1) {
  const end = source.indexOf(endNeedle, start);
  if (end === -1) {
    throw new Error("dispatchClaraEvent boundary not found after OnboardingActionBar.");
  }
  source = source.slice(0, start) + source.slice(end);
}

if (source.includes(startNeedle)) {
  throw new Error("Inline OnboardingActionBar still exists.");
}

const importCount = source.split('OnboardingActionBar"').length - 1;
if (importCount !== 1) {
  throw new Error(`Expected exactly one OnboardingActionBar import, found ${importCount}.`);
}

if (!source.includes('OnboardingActionBar')) {
  throw new Error("OnboardingActionBar is not referenced after extraction.");
}

if (!source.includes('const dispatchClaraEvent = (name, detail = null) => {')) {
  throw new Error("dispatchClaraEvent was removed unexpectedly.");
}

if (source === original) {
  console.log("No OnboardingActionBar extraction changes needed.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Extracted OnboardingActionBar, reduced Dashboard.jsx by ${original.length - source.length} characters.`);
