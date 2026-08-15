import { readFile, writeFile } from "node:fs/promises";

const settingsPath = "src/components/fresh/main-dashboard/dashboard-panels/settings/DashboardSettingsPanel.jsx";
const adminPanelPath = "src/pages/AdminPanel.jsx";

const settingsSource = await readFile(settingsPath, "utf8");
const adminPanelSource = await readFile(adminPanelPath, "utf8");

const adminRowPattern = /\n\s*\.\.\.\(isAdmin \? \[\{ key: "admin", title: "Admin Panel", description: "Manage users, access, and CLARA controls", icon: ShieldCheck, badge: "Admin", tone: "gold", action: \(\) => navigate\("\/admin"\) \}\] : \[\]\),/;
if (!adminRowPattern.test(settingsSource)) {
  throw new Error("Expected Settings Admin Panel row was not found; refusing a partial authority migration.");
}

const nextSettings = settingsSource.replace(adminRowPattern, "");

const boardImport = 'import AdminCommunityBoardSection from "@/components/admin/AdminCommunityBoardSection";\n';
if (!adminPanelSource.includes(boardImport)) {
  throw new Error("Expected AdminCommunityBoardSection import was not found.");
}

const boardSectionPattern = /\n\s*<div className="mt-5">\s*<AdminCommunityBoardSection \/>\s*<\/div>\n/;
if (!boardSectionPattern.test(adminPanelSource)) {
  throw new Error("Expected in-app CLARA Board section was not found.");
}

const nextAdminPanel = adminPanelSource
  .replace(boardImport, "")
  .replace(boardSectionPattern, "\n");

await writeFile(settingsPath, nextSettings, "utf8");
await writeFile(adminPanelPath, nextAdminPanel, "utf8");

console.log("Moved CLARA Board admin authority out of the user-facing app.");
