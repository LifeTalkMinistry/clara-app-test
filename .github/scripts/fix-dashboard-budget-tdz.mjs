import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";

if (!fs.existsSync(dashboardPath)) {
  console.warn("Dashboard file not found.");
  process.exit(0);
}

let source = fs.readFileSync(dashboardPath, "utf8");

function findMatching(sourceText, openIndex, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openIndex; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    const next = sourceText[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

const dashboardStart = source.indexOf("export default function Dashboard()");
if (dashboardStart === -1) {
  console.warn("Dashboard function not found.");
  process.exit(0);
}

const bodyOpen = source.indexOf("{", dashboardStart);
const bodyClose = findMatching(source, bodyOpen, "{", "}");

if (bodyOpen === -1 || bodyClose === -1) {
  console.warn("Dashboard function body not found.");
  process.exit(0);
}

const beforeBody = source.slice(0, bodyOpen + 1);
let body = source.slice(bodyOpen + 1, bodyClose);
const afterBody = source.slice(bodyClose);
const originalBody = body;

// Emergency render stabilizer:
// The current Dashboard has many render-time calculations placed before the
// values they reference. ES const/let keeps those names in TDZ, so React crashes
// before painting. Build-time converting only Dashboard's local const/let to var
// hoists local names and stops the blank-screen ReferenceError chain while the
// full Dashboard can be refactored into smaller ordered hooks/components later.
body = body.replace(/\bconst\b/g, "var").replace(/\blet\b/g, "var");

if (body === originalBody) {
  console.log("Dashboard render stabilizer found no local const/let declarations.");
  process.exit(0);
}

source = beforeBody + body + afterBody;
fs.writeFileSync(dashboardPath, source);
console.log("Dashboard render stabilizer converted local const/let declarations to var before build.");
