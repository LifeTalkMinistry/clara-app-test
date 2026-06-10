import { execSync } from "node:child_process";
import fs from "node:fs";

function run(command) {
  console.log(`> ${command}`);
  execSync(command, { stdio: "inherit", shell: "/bin/bash" });
}

run("git fetch origin fix/reset-aware-budget-cycle");
run("git checkout -B fix/reset-aware-budget-cycle origin/fix/reset-aware-budget-cycle");
run("node scripts/apply-budget-cycle-reset-fix.mjs");
run("node scripts/apply-budget-cycle-reset-actions.mjs");
run("node scripts/apply-budget-cycle-reset-consumers.mjs");
run("npm ci");
run("npm run test:budget-cycle");
run("npm run build");

for (const file of [
  "scripts/apply-budget-cycle-reset-fix.mjs",
  "scripts/apply-budget-cycle-reset-actions.mjs",
  "scripts/apply-budget-cycle-reset-consumers.mjs",
  ".github/workflows/apply-budget-cycle-reset-fix.yml",
]) {
  if (fs.existsSync(file)) fs.rmSync(file);
}

run('git config user.name "github-actions[bot]"');
run('git config user.email "41898282+github-actions[bot]@users.noreply.github.com"');
run("git add -A");

const pending = execSync("git status --porcelain", { encoding: "utf8" }).trim();
if (pending) {
  run('git commit -m "fix: make budget cycle reset authoritative"');
  run("git push origin HEAD:fix/reset-aware-budget-cycle");
} else {
  console.log("No budget cycle reset changes remained to commit.");
}
