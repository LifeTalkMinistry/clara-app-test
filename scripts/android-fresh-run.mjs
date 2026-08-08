import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: options.capture ? "pipe" : "inherit",
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.error(`\n[CLARA Android] Failed to start ${command}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n[CLARA Android] Stopped because ${command} exited with code ${result.status}.`);
    console.error("[CLARA Android] No stale APK will be intentionally deployed by this runner.");
    process.exit(result.status || 1);
  }

  return options.capture ? String(result.stdout || "").trim() : "";
}

const commit = run("git", ["rev-parse", "--short", "HEAD"], { capture: true }) || "unknown";
const builtAt = new Date().toISOString();
const buildMeta = JSON.stringify({ commit, builtAt }, null, 2);

console.log(`[CLARA Android] Source commit: ${commit}`);
console.log("[CLARA Android] Removing old web build so stale assets cannot be reused...");
rmSync("dist", { recursive: true, force: true });

// Keep the native runner focused on the Android-specific regression we are
// actively protecting. The full project test suite still belongs to CI/npm test,
// but unrelated stale assertions must not prevent a fresh APK from being built.
console.log("[CLARA Android] Running Android Community scroll regression check...");
run("node", ["--test", "tests/universal-onboarding-scroll.test.mjs"]);

console.log("[CLARA Android] Building the latest pulled source for Android...");
run("npm", ["run", "build:android"]);

if (!existsSync("dist/index.html")) {
  console.error("[CLARA Android] Fresh Vite build did not produce dist/index.html.");
  process.exit(1);
}

writeFileSync("dist/clara-build-meta.json", buildMeta, "utf8");

console.log("[CLARA Android] Syncing the fresh web build into Capacitor Android...");
run("npx", ["cap", "sync", "android"]);

const nativeMetaPath = "android/app/src/main/assets/public/clara-build-meta.json";
if (!existsSync(nativeMetaPath)) {
  console.error("[CLARA Android] Capacitor sync did not copy the fresh build marker into Android assets.");
  process.exit(1);
}

const nativeMeta = readFileSync(nativeMetaPath, "utf8");
if (nativeMeta.trim() !== buildMeta.trim()) {
  console.error("[CLARA Android] Android assets do not match the freshly built source commit.");
  process.exit(1);
}

console.log(`[CLARA Android] Verified Android assets contain commit ${commit}.`);
console.log("[CLARA Android] Building and deploying the verified fresh Android app...");
run("npx", ["cap", "run", "android", ...process.argv.slice(2)]);
