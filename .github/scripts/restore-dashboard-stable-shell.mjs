import { execFileSync } from "node:child_process";
import fs from "node:fs";

const stableCommit = "1ceda4fc12f22e0d430d7af880ee140713fc7f2f";
const dashboardPath = "src/pages/Dashboard.jsx";

const stableDashboard = execFileSync("git", ["show", `${stableCommit}:${dashboardPath}`], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

const requiredStableTokens = [
  "DashboardShell",
  "DashboardContentArea",
  "DashboardPanelRenderer",
  "DashboardModalLayer",
  "<ManualExpenseFullScreenSheet",
  "<FinanceActionModal",
  "<ClaraAssistantPanel",
];

for (const token of requiredStableTokens) {
  if (!stableDashboard.includes(token)) {
    throw new Error(`Stable Dashboard is missing required token: ${token}`);
  }
}

const forbiddenRiskyTokens = [
  "DashboardFinanceModalRenderer",
  "DashboardOverlayRenderer",
];

for (const token of forbiddenRiskyTokens) {
  if (stableDashboard.includes(token)) {
    throw new Error(`Stable Dashboard unexpectedly contains risky extracted renderer: ${token}`);
  }
}

fs.writeFileSync(dashboardPath, stableDashboard);
console.log(`Restored ${dashboardPath} from stable shell-wired commit ${stableCommit}.`);
