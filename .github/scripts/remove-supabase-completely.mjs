import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const workflowPath = path.join(ROOT, ".github/workflows/remove-supabase-completely.yml");
const scriptPath = path.join(ROOT, ".github/scripts/remove-supabase-completely.mjs");

const CODE_EXTENSIONS = new Set([
  ".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".html", ".css", ".svg",
]);
const PROSE_EXTENSIONS = new Set([
  ".md", ".txt", ".yml", ".yaml", ".toml", ".xml", ".patch",
]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist"]);

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function remove(relativePath) {
  const target = path.join(ROOT, relativePath);
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
  console.log(`[remove] ${relativePath}`);
}

function rename(fromRelative, toRelative) {
  const from = path.join(ROOT, fromRelative);
  const to = path.join(ROOT, toRelative);
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  console.log(`[rename] ${fromRelative} -> ${toRelative}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function write(relativePath, content) {
  const target = path.join(ROOT, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function replaceRequired(content, before, after, label) {
  if (!content.includes(before)) {
    throw new Error(`Required replacement not found: ${label}`);
  }
  return content.replace(before, after);
}

function replaceSection(content, startMarker, endMarker, replacement, label) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Required section not found: ${label}`);
  }
  return `${content.slice(0, start)}${replacement}${content.slice(end)}`;
}

function isTextFile(filePath) {
  const base = path.basename(filePath);
  if (base.startsWith(".env")) return true;
  const ext = path.extname(base).toLowerCase();
  return CODE_EXTENSIONS.has(ext) || PROSE_EXTENSIONS.has(ext);
}

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath, files);
    else files.push(fullPath);
  }
  return files;
}

function patchDeviceNotifications() {
  const relativePath = "src/lib/notifications/deviceNotifications.js";
  let content = read(relativePath);

  const oldImports = `import { supabase } from "@/lib/supabaseClient";\nimport {\n  cloudSupabase,\n  isCloudSupabaseConfigured,\n} from "@/lib/cloud-supabase-client";\n`;
  content = replaceRequired(
    content,
    oldImports,
    `import { getStoredBackendUser } from "@/lib/clara-backend-client";\n`,
    "device notification cloud imports"
  );

  content = replaceSection(
    content,
    "function formatDiagnosticError(error) {",
    "export async function syncExpenseLogLocalNotifications",
    `function formatDiagnosticError(error) {\n  const message = String(error?.message || error || "");\n  return error instanceof Error\n    ? error\n    : new Error(message || "Real push test failed.");\n}\n\n`,
    "device notification diagnostic provider block"
  );

  content = replaceSection(
    content,
    "export async function getExistingDeviceNotificationConnection",
    "export async function showRuntimeDeviceNotification",
    `export async function getExistingDeviceNotificationConnection() {\n  const environment = getNotificationEnvironment();\n\n  if (environment.preferredChannel === "native_push") {\n    const status = await getNativeNotificationStatus();\n    if (status.permission !== "granted" || !status.configured) return null;\n\n    return {\n      channel: environment.platform === "ios" ? "apns" : "fcm",\n      platform: environment.platform,\n      permission: status.permission,\n      configured: true,\n    };\n  }\n\n  if (environment.preferredChannel === "web_push") {\n    return getExistingPushSubscription();\n  }\n\n  return null;\n}\n\n`,
    "device notification existing connection provider block"
  );

  const sendStart = content.indexOf("export async function sendRealPushTestNotification");
  if (sendStart < 0) throw new Error("sendRealPushTestNotification not found");
  content = `${content.slice(0, sendStart)}export async function sendRealPushTestNotification() {\n  const environment = getNotificationEnvironment();\n\n  try {\n    if (environment.preferredChannel === "web_push") {\n      const enableResult = await enableTaskReminderPush();\n      if (enableResult.permission === "denied") {\n        throw new Error("Notification permission is blocked. Enable CLARA notifications in your browser or phone settings, then try again.");\n      }\n      if (!enableResult.configured) {\n        throw new Error("CLARA could not finish the Web Push subscription for this device.");\n      }\n\n      const data = await sendServerPushTestNotification();\n      if (!Number(data?.sent || data?.webSent || 0)) {\n        throw new Error("CLARA backend did not report a successful Web Push delivery.");\n      }\n\n      return { ...data, environment };\n    }\n\n    if (!environment.supportsNativePush) {\n      throw new Error("Real push is unavailable in this environment.");\n    }\n\n    const backendUser = getStoredBackendUser();\n    const userId = backendUser?.id != null ? String(backendUser.id) : "";\n    if (!userId) {\n      throw new Error("Sign in to your CLARA account before testing phone notifications.");\n    }\n\n    const enableResult = await enableNativePushNotifications({ userId });\n    if (enableResult.permission === "denied") {\n      throw new Error("Phone notification permission is denied. Enable CLARA notifications in your phone settings, then try again.");\n    }\n    if (!enableResult.configured || !enableResult.token) {\n      throw new Error("CLARA could not register this phone for push notifications.");\n    }\n\n    const data = await sendServerPushTestNotification();\n    if (!Number(data?.nativeSent || data?.sent || 0)) {\n      throw new Error("CLARA backend did not report a successful native push delivery.");\n    }\n\n    return {\n      ...data,\n      tokenPreview: \`${String(enableResult.token).slice(0, 10)}...\`,\n      environment,\n    };\n  } catch (error) {\n    throw formatDiagnosticError(error);\n  }\n}\n`;

  write(relativePath, content);
}

function patchPackageJson() {
  const relativePath = "package.json";
  const pkg = JSON.parse(read(relativePath));
  if (pkg.dependencies) delete pkg.dependencies["@supabase/supabase-js"];
  write(relativePath, `${JSON.stringify(pkg, null, 2)}\n`);
}

function rewriteClaraDataClient() {
  write(
    "src/lib/clara-data-client.js",
    `import { withLocalAuthEvents } from "@/lib/local-auth-event-bridge";\nimport { createLocalDataFacade } from "@/lib/local-data-facade";\nimport { withSettingsSupportCompatibility } from "@/lib/settings-support-compatibility";\nimport { signOutFromClaraBackend } from "@/lib/clara-backend-client";\n\n// Provider-neutral compatibility client for legacy local callers. Financial records remain device-local;\n// account authentication and Settings support delivery are handled by the CLARA backend.\nexport const isClaraDataConfigured = false;\n\nconst localFacade = withSettingsSupportCompatibility(createLocalDataFacade());\nconst localSignOut = localFacade.auth.signOut;\nlocalFacade.auth.signOut = async () => {\n  signOutFromClaraBackend();\n  return localSignOut();\n};\n\nexport const claraData = withLocalAuthEvents(localFacade);\n`
  );
}

function rewriteReadme() {
  const relativePath = "README.md";
  if (!exists(relativePath)) return;
  let content = read(relativePath);
  content = content.replace(
    /### 2\. Configure environment variables[\s\S]*?(?=\n## |$)/,
    `### 2. Configure the CLARA backend\n\nThe app uses the self-hosted CLARA backend. The production default is \`https://api.clarapmc.com\`.\n\nFor local or alternate environments, set:\n\n\`\`\`env\nVITE_CLARA_API_URL=https://your-clara-backend.example.com\n\`\`\`\n\nNo third-party database client is required in the app.\n`
  );
  write(relativePath, content);
}

function rewriteBillingChecklist() {
  const relativePath = "GOOGLE_PLAY_BILLING_CHECKLIST.md";
  if (!exists(relativePath)) return;
  write(
    relativePath,
    `# CLARA Google Play Billing Checklist\n\n## Architecture rule\n\nGoogle Play purchase verification and entitlement decisions must be owned by the CLARA backend. The app must never treat a successful client-side order call as authoritative access.\n\n## Current implementation direction\n\n- Android purchase tokens are sent only to CLARA backend endpoints.\n- The backend verifies tokens with Google Play and stores any authoritative membership or support state in PostgreSQL.\n- The client refreshes CLARA backend account state after verification.\n- Lifecycle synchronization, if required, runs from CLARA-owned backend infrastructure.\n- No third-party database or edge-function runtime is part of the required billing path.\n\n## Testing requirements\n\nReal billing tests must use an app installed from a Google Play testing track. Sideloaded builds, wrong tester accounts, unaccepted tester invitations, stale Play Store cache, or product propagation delays can make a product unavailable even when application code is correct.\n`
  );
}

function transformTrackedText() {
  const files = walk(ROOT);
  const exactReplacements = [
    ["@/lib/supabaseClient", "@/lib/clara-data-client"],
    ["./supabaseClient", "./clara-data-client"],
    ["../lib/supabaseClient", "../lib/clara-data-client"],
    ["local-supabase-facade", "local-data-facade"],
    ["community-backend-supabase-compat", "community-backend-data-client"],
    ["createLocalSupabaseFacade", "createLocalDataFacade"],
    ["formatSupabaseError", "formatClaraDataError"],
    ["isSupabaseConfigured", "isClaraDataConfigured"],
    ["legacySupabase", "legacyClaraData"],
    ["cloudSupabase", "cloudClaraData"],
    ["isCloudSupabaseConfigured", "isCloudClaraDataConfigured"],
    ["supabaseUrl", "claraDataUrl"],
    ["supabaseAnonKey", "claraDataPublicKey"],
  ];

  for (const file of files) {
    if (!isTextFile(file)) continue;
    const relative = path.relative(ROOT, file).replaceAll(path.sep, "/");
    if (relative === "package-lock.json") continue;

    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const original = content;

    for (const [before, after] of exactReplacements) {
      content = content.split(before).join(after);
    }

    const ext = path.extname(file).toLowerCase();
    const codeLike = CODE_EXTENSIONS.has(ext);
    if (codeLike) {
      content = content.replace(/\bSupabase\b/g, "ClaraData");
      content = content.replace(/\bsupabase\b/g, "claraData");
      content = content.replace(/\bSUPABASE\b/g, "CLARA_DATA");
    } else {
      content = content.replace(/VITE_SUPABASE_URL/gi, "VITE_CLARA_API_URL");
      content = content.replace(/VITE_SUPABASE_ANON_KEY/gi, "VITE_CLARA_API_URL");
      content = content.replace(/SUPABASE_SERVICE_ROLE_KEY/gi, "CLARA_BACKEND_SERVICE_KEY");
      content = content.replace(/Supabase/gi, "CLARA backend");
    }

    if (content !== original) {
      fs.writeFileSync(file, content, "utf8");
      console.log(`[transform] ${relative}`);
    }
  }
}

function assertNoProviderPaths() {
  const offenders = [];
  for (const file of walk(ROOT)) {
    const relative = path.relative(ROOT, file).replaceAll(path.sep, "/");
    if (/supabase/i.test(relative)) offenders.push(relative);
  }
  if (offenders.length) {
    throw new Error(`Provider-named paths remain:\n${offenders.join("\n")}`);
  }
}

// Remove the real cloud provider implementation and its historical deployment artifacts.
remove("supabase");
remove("src/lib/cloud-supabase-client.js");
remove("src/lib/supabaseQuotaGuard.js");
remove(".github/scripts/audit-supabase-realtime-usage.mjs");
remove(".clara-google-play-entitlement-activation.patch");

// Rename local compatibility modules so the app no longer carries provider-specific architecture names.
rename("src/lib/local-supabase-facade.js", "src/lib/local-data-facade.js");
rename("src/lib/supabaseClient.js", "src/lib/clara-data-client.js");
rename("src/lib/community-backend-supabase-compat.js", "src/lib/community-backend-data-client.js");

patchDeviceNotifications();
patchPackageJson();
rewriteReadme();
rewriteBillingChecklist();
transformTrackedText();
rewriteClaraDataClient();

// The migration tooling is temporary and must not remain in the finished branch.
try { fs.rmSync(workflowPath, { force: true }); } catch {}
try { fs.rmSync(scriptPath, { force: true }); } catch {}

assertNoProviderPaths();
console.log("Provider-removal source migration completed.");
