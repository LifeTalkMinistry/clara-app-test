import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve("src/components/Layout.jsx");

const quickAddPath = "./QuickAddModal";
const adsPath = "./AdsModal";

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function ensureLazySuspenseImport(source) {
  const current =
    'import { Suspense, lazy, useState, useCallback, useEffect, useRef, useMemo } from "react";';
  if (source.includes(current)) return source;

  const alt =
    'import { lazy, Suspense, useState, useCallback, useEffect, useRef, useMemo } from "react";';
  if (source.includes(alt)) {
    return source.replace(alt, current);
  }

  const noLazy =
    'import { Suspense, useState, useCallback, useEffect, useRef, useMemo } from "react";';
  if (source.includes(noLazy)) {
    return source.replace(noLazy, current);
  }

  const noSuspense =
    'import { lazy, useState, useCallback, useEffect, useRef, useMemo } from "react";';
  if (source.includes(noSuspense)) {
    return source.replace(noSuspense, current);
  }

  fail("Could not find Layout React import to update.");
}

function removeStaticModalImports(source) {
  return source
    .replace(`import QuickAddModal from "${quickAddPath}";\n`, "")
    .replace(`import AdsModal from "${adsPath}";\n`, "");
}

function addLazyDeclarations(source) {
  const block = `const QuickAddModal = lazy(() => import("${quickAddPath}"));\nconst AdsModal = lazy(() => import("${adsPath}"));\n\n`;
  if (source.includes(block)) return source;

  const marker = "const ClaraAssistantPanel = lazy(() => import(\"@/components/ai/ClaraAssistantPanel\"));\n";
  if (!source.includes(marker)) {
    fail("Could not find ClaraAssistantPanel lazy declaration anchor.");
  }

  return source.replace(marker, `${block}${marker}`);
}

function makeQuickAddConditional(source) {
  const oldBlock = `      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        userEmail={user?.email}
      />`;

  const newBlock = `      {quickAddOpen && (
        <Suspense fallback={null}>
          <QuickAddModal
            open={quickAddOpen}
            onClose={() => setQuickAddOpen(false)}
            userEmail={user?.email}
          />
        </Suspense>
      )}`;

  if (source.includes(newBlock)) return source;
  if (!source.includes(oldBlock)) {
    fail("Could not find QuickAddModal JSX block to lazy wrap.");
  }

  return source.replace(oldBlock, newBlock);
}

function makeAdsConditional(source) {
  const oldBlock = `      <AdsModal
        open={adsModalOpen}
        onClose={() => setAdsModalOpen(false)}
        userEmail={user?.email}
      />`;

  const newBlock = `      {adsModalOpen && (
        <Suspense fallback={null}>
          <AdsModal
            open={adsModalOpen}
            onClose={() => setAdsModalOpen(false)}
            userEmail={user?.email}
          />
        </Suspense>
      )}`;

  if (source.includes(newBlock)) return source;
  if (!source.includes(oldBlock)) {
    fail("Could not find AdsModal JSX block to lazy wrap.");
  }

  return source.replace(oldBlock, newBlock);
}

function assertResult(source) {
  const required = [
    'import { Suspense, lazy, useState, useCallback, useEffect, useRef, useMemo } from "react";',
    `const QuickAddModal = lazy(() => import("${quickAddPath}"));`,
    `const AdsModal = lazy(() => import("${adsPath}"));`,
    "{quickAddOpen && (",
    "{adsModalOpen && (",
    "<QuickAddModal",
    "<AdsModal",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) fail(`Missing expected text after patch: ${text}`);
  });

  const forbidden = [
    `import QuickAddModal from "${quickAddPath}";`,
    `import AdsModal from "${adsPath}";`,
  ];

  forbidden.forEach((text) => {
    if (source.includes(text)) fail(`Static Layout modal import still exists: ${text}`);
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = ensureLazySuspenseImport(next);
next = removeStaticModalImports(next);
next = addLazyDeclarations(next);
next = makeQuickAddConditional(next);
next = makeAdsConditional(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. Layout modals already appear lazy-loaded.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ QuickAddModal and AdsModal are now lazy-loaded in Layout.jsx.");
console.log("✅ Modal chunks only load when the modal opens.");
console.log("✅ Layout motion behavior, auth behavior, and assistant lazy loading were left untouched.");
console.log("\nNext: run npm run build to verify Layout modal lazy wiring.\n");
