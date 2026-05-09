import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve(
  "src/components/fresh/main-dashboard/shell/DashboardFinanceModalRenderer.jsx"
);

const assistantPath = "@/components/ai/ClaraAssistantPanel";
const reactImport = 'import { lazy, Suspense } from "react";';
const lazyDeclaration = `const ClaraAssistantPanel = lazy(() => import("${assistantPath}"));`;

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function addReactLazyImport(source) {
  if (source.includes(reactImport)) return source;
  return `${reactImport}\n${source}`;
}

function removeStaticAssistantImport(source) {
  return source.replace(`import ClaraAssistantPanel from "${assistantPath}";\n`, "");
}

function addLazyAssistantDeclaration(source) {
  if (source.includes(lazyDeclaration)) return source;

  const marker = "\nexport default function DashboardFinanceModalRenderer";
  if (!source.includes(marker)) {
    fail("Could not find DashboardFinanceModalRenderer export marker.");
  }

  return source.replace(marker, `\n${lazyDeclaration}\n\nexport default function DashboardFinanceModalRenderer`);
}

function wrapAssistantUsage(source) {
  if (source.includes("<Suspense fallback={null}>\n          <ClaraAssistantPanel")) {
    return source;
  }

  const assistantTagRegex = /<ClaraAssistantPanel([\s\S]*?)\/>/;
  const match = source.match(assistantTagRegex);

  if (!match) {
    fail("Could not find ClaraAssistantPanel JSX usage to wrap.");
  }

  const wrapped = `<Suspense fallback={null}>\n          <ClaraAssistantPanel${match[1]}/>\n        </Suspense>`;
  return source.replace(assistantTagRegex, wrapped);
}

function assertResult(source) {
  const required = [
    reactImport,
    lazyDeclaration,
    "<Suspense fallback={null}>",
    "<ClaraAssistantPanel",
    "showAiAssistant",
    "claraAssistantContext",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) fail(`Missing expected text after patch: ${text}`);
  });

  const forbidden = [`import ClaraAssistantPanel from "${assistantPath}";`];
  forbidden.forEach((text) => {
    if (source.includes(text)) fail(`Static assistant import still exists: ${text}`);
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = addReactLazyImport(next);
next = removeStaticAssistantImport(next);
next = addLazyAssistantDeclaration(next);
next = wrapAssistantUsage(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. Dashboard assistant panel already appears lazy-loaded.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ ClaraAssistantPanel is now lazy-loaded inside DashboardFinanceModalRenderer.");
console.log("✅ AI assistant code will not load with the finance modal renderer until opened.");
console.log("✅ Finance modal behavior and finance data logic were left untouched.");
console.log("\nNext: run npm run build to verify assistant lazy wiring.\n");
