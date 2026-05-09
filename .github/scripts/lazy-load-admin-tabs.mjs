import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve("src/pages/admin/AdminPanel.jsx");

const adminTabs = [
  "AdminUsers",
  "AdminEnrollments",
  "AdminModules",
  "AdminSettings",
  "AdminPlans",
  "AdminBillboard",
  "AdminReferrals",
  "AdminDailyTips",
  "AdminActivation",
  "AdminOverview",
];

function fail(message) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

function ensureReactLazyImport(source) {
  const importLine = 'import { lazy, Suspense } from "react";';
  if (source.includes(importLine)) return source;

  return `${importLine}\n${source}`;
}

function removeStaticTabImports(source) {
  adminTabs.forEach((name) => {
    source = source.replace(`import ${name} from "./${name}";\n`, "");
  });

  return source;
}

function addLazyTabDeclarations(source) {
  const block = adminTabs
    .map((name) => `const ${name} = lazy(() => import("./${name}"));`)
    .join("\n");

  if (source.includes(`const AdminUsers = lazy(() => import("./AdminUsers"));`)) {
    return source;
  }

  const marker = "\nexport default function AdminPanel() {";
  if (!source.includes(marker)) {
    fail("Could not find AdminPanel export marker.");
  }

  return source.replace(marker, `\n${block}\n\nexport default function AdminPanel() {`);
}

function wrapTabsContent(source) {
  const oldBlock = `        <TabsContent value="overview">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="users">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="enrollments">
          <AdminEnrollments />
        </TabsContent>

        <TabsContent value="plans">
          <AdminPlans />
        </TabsContent>

        <TabsContent value="activation">
          <AdminActivation />
        </TabsContent>

        <TabsContent value="billboard">
          <AdminBillboard />
        </TabsContent>

        <TabsContent value="modules">
          <AdminModules />
        </TabsContent>

        <TabsContent value="referrals">
          <AdminReferrals />
        </TabsContent>

        <TabsContent value="daily-tips">
          <AdminDailyTips />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>`;

  const newBlock = `        <Suspense fallback={<FeaturePageLoader label="Loading admin section..." />}>
          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsers />
          </TabsContent>

          <TabsContent value="enrollments">
            <AdminEnrollments />
          </TabsContent>

          <TabsContent value="plans">
            <AdminPlans />
          </TabsContent>

          <TabsContent value="activation">
            <AdminActivation />
          </TabsContent>

          <TabsContent value="billboard">
            <AdminBillboard />
          </TabsContent>

          <TabsContent value="modules">
            <AdminModules />
          </TabsContent>

          <TabsContent value="referrals">
            <AdminReferrals />
          </TabsContent>

          <TabsContent value="daily-tips">
            <AdminDailyTips />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Suspense>`;

  if (source.includes(newBlock)) return source;
  if (!source.includes(oldBlock)) {
    fail("Could not find AdminPanel tab content block to wrap.");
  }

  return source.replace(oldBlock, newBlock);
}

function assertResult(source) {
  const required = [
    'import { lazy, Suspense } from "react";',
    'const AdminUsers = lazy(() => import("./AdminUsers"));',
    'const AdminOverview = lazy(() => import("./AdminOverview"));',
    '<Suspense fallback={<FeaturePageLoader label="Loading admin section..." />}>',
    '<AdminOverview />',
    '<AdminUsers />',
    '<AdminSettings />',
  ];

  required.forEach((text) => {
    if (!source.includes(text)) fail(`Missing expected text after patch: ${text}`);
  });

  adminTabs.forEach((name) => {
    const staticImport = `import ${name} from "./${name}";`;
    if (source.includes(staticImport)) {
      fail(`Static admin tab import still exists: ${staticImport}`);
    }
  });
}

if (!fs.existsSync(targetPath)) {
  fail(`File not found: ${targetPath}`);
}

const original = fs.readFileSync(targetPath, "utf8");
let next = original;
next = ensureReactLazyImport(next);
next = removeStaticTabImports(next);
next = addLazyTabDeclarations(next);
next = wrapTabsContent(next);
assertResult(next);

if (next === original) {
  console.log("No changes needed. Admin tabs already appear lazy-loaded.");
  process.exit(0);
}

fs.writeFileSync(targetPath, next, "utf8");

console.log("✅ AdminPanel tab modules are now lazy-loaded.");
console.log("✅ Admin route no longer imports every admin management module upfront.");
console.log("✅ Admin UI, access checks, tabs, and behavior were left untouched.");
console.log("\nNext: run npm run build to verify admin tab lazy wiring.\n");
