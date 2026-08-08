import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
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
}

console.log("[CLARA Android] Removing old web build so stale assets cannot be reused...");
rmSync("dist", { recursive: true, force: true });

console.log("[CLARA Android] Building and validating the latest pulled source...");
run("npm", ["run", "build"]);

console.log("[CLARA Android] Syncing the fresh web build into Capacitor Android...");
run("npx", ["cap", "sync", "android"]);

console.log("[CLARA Android] Building and deploying the fresh Android app...");
run("npx", ["cap", "run", "android", ...process.argv.slice(2)]);
