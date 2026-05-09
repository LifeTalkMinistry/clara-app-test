import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve("src/pages/Dashboard.jsx");

const feedPath = "@/components/fresh/dashboard-panels/feed/DashboardFeedPanel";
const messagesPath = "@/components/fresh/main-dashboard/dashboard-panels/messages/DashboardMessagesPanel";
const settingsPath = "@/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel";

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function replaceReactImport(source) {
  const current = 'import { useState, useRef } from "react";';
  const next = 'import { lazy, Suspense, useRef, useState } from "react";';

  if (source.includes(next)) return source;
  if (!source.includes(current)) {
    fail("Could not find Dashboard React import to update.");
  }

  return source.replace(current, next);
}

function removeStaticPanelImports(source) {
  return source
    .replace(`import DashboardFeedPanel from "${feedPath}";\n`, "")
    .replace(`import DashboardMessagesPanel from "${messagesPath}";\n`, "")
    .replace(`import DashboardSettingsPanel from "${settingsPath}";\n`, "");
}

function addLazyPanelDeclarations(source) {
  const block = `const DashboardFeedPanel = lazy(() => import("${feedPath}"));
const DashboardMessagesPanel = lazy(() => import("${messagesPath}"));
const DashboardSettingsPanel = lazy(() => import("${settingsPath}"));

`;

  if (source.includes(block)) return source;

  const marker = "\n\nexport default function Dashboard() {";
  if (!source.includes(marker)) {
    fail("Could not find Dashboard component export marker.");
  }

  return source.replace(marker, `\n\n${block}export default function Dashboard() {`);
}

function wrapLazyPanelRenders(source) {
  source = source.replace(
    'renderFeed={() => <DashboardFeedPanel onBack={closeDashboardPanel} />}',
    'renderFeed={() => (\n              <Suspense fallback={null}>\n                <DashboardFeedPanel onBack={closeDashboardPanel} />\n              </Suspense>\n            )}'
  );

  source = source.replace(
    'renderMessages={() => <DashboardMessagesPanel onBack={closeDashboardPanel} />}',
    'renderMessages={() => (\n              <Suspense fallback={null}>\n                <DashboardMessagesPanel onBack={closeDashboardPanel} />\n              </Suspense>\n            )}'
  );

  const oldSettings = `renderSettings={() => (
              <DashboardSettingsPanel
                onBack={closeDashboardPanel}
                user={user}
                plan={plan}
                isPaid={isPaid}
                isFree={isFree}
                isAdmin={isAdmin}
                notificationSettings={notificationSettings}
                openThemePicker={openThemePicker}
                resetThemeToDefault={resetDashboardThemeToDefault}
                onOpenMessages={() => openDashboardPanel("messages")}
              />
            )}`;

  const newSettings = `renderSettings={() => (
              <Suspense fallback={null}>
                <DashboardSettingsPanel
                  onBack={closeDashboardPanel}
                  user={user}
                  plan={plan}
                  isPaid={isPaid}
                  isFree={isFree}
                  isAdmin={isAdmin}
                  notificationSettings={notificationSettings}
                  openThemePicker={openThemePicker}
                  resetThemeToDefault={resetDashboardThemeToDefault}
                  onOpenMessages={() => openDashboardPanel("messages")}
                />
              </Suspense>
            )}`;

  if (source.includes(oldSettings)) {
    source = source.replace(oldSettings, newSettings);
  }

  return source;
}

function assertResult(source) {
  const required = [
    'import { lazy, Suspense, useRef, useState } from "react";',
    `const DashboardFeedPanel = lazy(() => import("${feedPath}"));`,
    `const DashboardMessagesPanel = lazy(() => import("${messagesPath}"));`,
    `const DashboardSettingsPanel = lazy(() => import("${settingsPath}"));`,
    "<Suspense fallback={null}>",
    "<DashboardFeedPanel onBack={closeDashboardPanel} />",
    "<DashboardMessagesPanel onBack={closeDashboardPanel} />",
    "<DashboardSettingsPanel",
  ];

  required.forEach((text) => {
    if (!source.includes(text)) {
      fail(`Missing expected text after patch: ${text}`);
    }
  });

  const forbidden = [
    `import DashboardFeedPanel from "${feedPath}";`,
    `import DashboardMessagesPanel from "${messagesPath}";`,
    `import DashboardSettingsPanel from "${settingsPath}";`,
  ];

  forbidden.forEach((text) => {
    if (source.includes(text)) {
      fail(`Static dashboard panel import still exists after patch: ${text}`);
    }
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = replaceReactImport(next);
next = removeStaticPanelImports(next);
next = addLazyPanelDeclarations(next);
next = wrapLazyPanelRenders(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. Dashboard panels already appear lazy-loaded.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ Dashboard Feed, Messages, and Settings panels are now lazy-loaded.");
console.log("✅ Static panel imports were removed from Dashboard.jsx.");
console.log("✅ Dashboard home, finance data, and offline-first behavior were left untouched.");
console.log("\nNext: run npm run build to verify lazy panel wiring.\n");
