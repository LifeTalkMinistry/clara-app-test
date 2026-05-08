import fs from "node:fs";

const dashboardPath = "src/pages/Dashboard.jsx";
let source = fs.readFileSync(dashboardPath, "utf8");
const original = source;

const importLine = 'import { dispatchClaraEvent } from "@/components/fresh/main-dashboard/dashboard-events/dashboardEvents";\n';
const importAnchor = 'import DashboardModalLayer from "@/components/fresh/main-dashboard/shell/DashboardModalLayer";\n';

if (!source.includes(importLine.trim())) {
  if (!source.includes(importAnchor)) {
    throw new Error("DashboardModalLayer import anchor not found.");
  }
  source = source.replace(importAnchor, `${importAnchor}${importLine}`);
}

const helperBlock = `const dispatchClaraEvent = (name, detail = null) => {
  if (typeof window === "undefined") return;
  if (detail && typeof detail === "object") {
    window.dispatchEvent(new CustomEvent(name, { detail }));
    return;
  }
  window.dispatchEvent(new Event(name));
};

`;

if (source.includes(helperBlock)) {
  source = source.replace(helperBlock, "");
}

if (!source.includes(importLine.trim())) {
  throw new Error("dispatchClaraEvent import missing after extraction.");
}

if (source.includes("const dispatchClaraEvent =")) {
  throw new Error("Inline dispatchClaraEvent still remains in Dashboard.jsx.");
}

if (source === original) {
  console.log("Dashboard event helper already extracted.");
  process.exit(0);
}

fs.writeFileSync(dashboardPath, source);
console.log("Extracted Dashboard event helper safely.");
