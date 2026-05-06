import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const countMatches = (needle) => source.split(needle).length - 1;
const occurrences = countMatches("dispatchClaraEvent");

if (occurrences === 0) {
  console.log("dispatchClaraEvent is already absent from Dashboard.jsx.");
  process.exit(0);
}

if (occurrences !== 1) {
  throw new Error(`dispatchClaraEvent is still used in Dashboard.jsx (${occurrences} occurrences). Refusing to remove it.`);
}

const startNeedle = 'const dispatchClaraEvent = (name, detail = null) => {\n';
const start = source.indexOf(startNeedle);
if (start === -1) {
  throw new Error("dispatchClaraEvent declaration not found even though the symbol exists.");
}

const endNeedle = 'let dashboardPageCache = createEmptyDashboardCache();';
const end = source.indexOf(endNeedle, start);
if (end === -1) {
  throw new Error("dashboardPageCache boundary not found after dispatchClaraEvent.");
}

source = source.slice(0, start) + source.slice(end);

if (source.includes("dispatchClaraEvent")) {
  throw new Error("dispatchClaraEvent remained after cleanup.");
}

if (!source.includes(endNeedle)) {
  throw new Error("dashboardPageCache initializer was removed unexpectedly.");
}

if (source === original) {
  console.log("No dispatchClaraEvent cleanup changes needed.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log(`Removed unused dispatchClaraEvent, reduced Dashboard.jsx by ${original.length - source.length} characters.`);
